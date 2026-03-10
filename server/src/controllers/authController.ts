import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import verificationCodeService from '../services/verificationCodeService';
import { sendSuccess, sendError } from '../utils/response';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

/**
 * 统一登录：仅查 users 表，一个账号一个 token（payload 为 user.id）。
 * 返回 hasDriver、driverStatus、isAvailable 供前端切换身份与展示审核状态。
 */
export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
      if (!phoneTrimmed || !password) {
        return sendError(res, '手机号和密码不能为空', 400);
      }

      const user = await User.findOne({ where: { phone: phoneTrimmed } });
      if (!user) {
        return sendError(res, '该手机号未注册', 401, { code: 'PHONE_NOT_REGISTERED' });
      }

      if (!user.password_hash) {
        return sendError(res, '该账号使用微信登录，请使用微信登录', 401, { code: 'USE_WECHAT_LOGIN' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return sendError(res, '密码错误', 401, { code: 'WRONG_PASSWORD' });
      }

      if (user.status !== 1) {
        return sendError(res, '账户已被禁用', 403);
      }

      const token = generateToken({ id: user.id, role: 'user' });
      const response = {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          token,
        },
        hasDriver: user.driver_status != null,
        driverStatus: user.driver_status ?? undefined,
        isAvailable: user.is_available ?? false,
      };
      return sendSuccess(res, response, '登录成功');
    } catch (error: any) {
      next(error);
    }
  }

  /** 通过手机号+短信验证码重置密码（仅更新 users 表）。仅备用，当前无前端入口。 */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, new_password } = req.body;
      const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
      if (!phoneTrimmed || !code || !new_password) {
        return sendError(res, '手机号、验证码和新密码不能为空', 400);
      }
      if (String(new_password).length < 6) {
        return sendError(res, '新密码至少 6 位', 400);
      }
      await verificationCodeService.verifyCode(phoneTrimmed, 'reset_password', code);
      const hashed = await bcrypt.hash(new_password, 10);
      const user = await User.findOne({ where: { phone: phoneTrimmed } });
      if (!user) {
        return sendError(res, '该手机号未注册', 400);
      }
      await user.update({ password_hash: hashed });
      return sendSuccess(res, null, '密码已重置，请使用新密码登录');
    } catch (e: any) {
      const msg = e?.message || '重置失败';
      if (/验证码|过期/.test(msg)) {
        return sendError(res, msg, 400);
      }
      next(e);
    }
  }

  /** 微信登录：Body 传 openid（必填）、unionid（可选）、nickname、avatar。前端用微信 SDK 拿 code 后，可先调微信接口换 openid 再传本接口，或后端配置 WECHAT_APPID/WECHAT_SECRET 后传 code 由后端换取。 */
  async wechatLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, openid, unionid, nickname, avatar } = req.body;
      let resolvedOpenId = openid;
      let resolvedUnionId = unionid;
      if (code && process.env.WECHAT_APPID && process.env.WECHAT_SECRET) {
        const resp = await fetch(
          `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&code=${code}&grant_type=authorization_code`
        ).then((r) => r.json());
        if (resp.openid) {
          resolvedOpenId = resp.openid;
          resolvedUnionId = resolvedUnionId || resp.unionid;
        }
      }
      const lookupKey = resolvedUnionId ? 'wechat_unionid' : 'wechat_openid';
      const lookupValue = (resolvedUnionId || resolvedOpenId) as string;
      if (!lookupValue) {
        return sendError(res, '请提供 openid/unionid 或 code（后端已配置微信时）', 400);
      }

      let user = await User.findOne({ where: { [lookupKey]: lookupValue } } as any);
      const name = typeof nickname === 'string' && nickname.trim() ? nickname.trim().slice(0, 50) : undefined;
      const avatarUrl = typeof avatar === 'string' && avatar.trim() ? avatar.trim().slice(0, 500) : undefined;

      if (user) {
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (avatarUrl !== undefined) updates.avatar = avatarUrl;
        if (Object.keys(updates).length > 0) await user.update(updates);
      } else {
        const placeholders = await bcrypt.hash(`wechat_${Date.now()}_${Math.random()}`, 10);
        user = await User.create({
          phone: null,
          password_hash: placeholders,
          name: name || '微信用户',
          avatar: avatarUrl,
          status: 1,
          wechat_unionid: resolvedUnionId || null,
          wechat_openid: resolvedOpenId || null,
        });
      }

      const token = generateToken({ id: user.id, role: 'user' });
      const response = {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          token,
        },
        hasDriver: user.driver_status != null,
        driverStatus: user.driver_status ?? undefined,
        isAvailable: user.is_available ?? false,
      };
      return sendSuccess(res, response, '登录成功');
    } catch (error: any) {
      next(error);
    }
  }
}

export default new AuthController();
