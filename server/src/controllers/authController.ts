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

  /** 通过手机号+短信验证码重置密码（仅更新 users 表） */
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
}

export default new AuthController();
