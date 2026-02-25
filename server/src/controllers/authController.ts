import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Driver from '../models/Driver';
import userService from '../services/userService';
import driverService from '../services/driverService';
import verificationCodeService from '../services/verificationCodeService';
import { sendSuccess, sendError } from '../utils/response';
import bcrypt from 'bcryptjs';

/**
 * 统一登录：同一手机号可同时存在用户端与司机端，一次登录返回两个身份的 token（若有）
 * 登录失败时区分：该手机号未注册 / 密码错误，便于前端展示「去注册」或「忘记密码」
 */
export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      const phoneTrimmed = typeof phone === 'string' ? phone.trim() : '';
      if (!phoneTrimmed || !password) {
        return sendError(res, '手机号和密码不能为空', 400);
      }

      const result: {
        user: { token: string; id: number; phone: string; name?: string; avatar?: string } | null;
        driver: {
          token: string;
          id: number;
          phone: string;
          name: string;
          avatar?: string;
          status: string;
          is_available: boolean;
        } | null;
      } = { user: null, driver: null };

      const [userExists, driverExists] = await Promise.all([
        User.findOne({ where: { phone: phoneTrimmed }, attributes: ['id'] }).then((u) => !!u),
        Driver.findOne({ where: { phone: phoneTrimmed }, attributes: ['id'] }).then((d) => !!d),
      ]);
      const phoneRegistered = userExists || driverExists;

      try {
        const userLoginResult = await userService.login(phoneTrimmed, password);
        result.user = {
          token: userLoginResult.token,
          id: userLoginResult.user.id,
          phone: userLoginResult.user.phone,
          name: userLoginResult.user.name,
          avatar: userLoginResult.user.avatar,
        };
      } catch {
        // 未注册用户端或密码错误
      }

      try {
        const driverLoginResult = await driverService.login(phoneTrimmed, password);
        result.driver = {
          token: driverLoginResult.token,
          id: driverLoginResult.driver.id,
          phone: driverLoginResult.driver.phone,
          name: driverLoginResult.driver.name,
          avatar: driverLoginResult.driver.avatar,
          status: driverLoginResult.driver.status,
          is_available: driverLoginResult.driver.is_available,
        };
      } catch {
        // 未注册司机端或密码错误
      }

      if (result.user || result.driver) {
        return sendSuccess(res, result, '登录成功');
      }

      if (!phoneRegistered) {
        return sendError(res, '该手机号未注册', 401, { code: 'PHONE_NOT_REGISTERED' });
      }
      return sendError(res, '密码错误', 401, { code: 'WRONG_PASSWORD' });
    } catch (error: any) {
      next(error);
    }
  }

  /** 通过手机号+短信验证码重置密码（同时更新该手机号下的用户端与司机端账号） */
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
      const [user, driver] = await Promise.all([
        User.findOne({ where: { phone: phoneTrimmed } }),
        Driver.findOne({ where: { phone: phoneTrimmed } }),
      ]);
      await Promise.all([
        user ? user.update({ password_hash: hashed }) : Promise.resolve(),
        driver ? driver.update({ password_hash: hashed }) : Promise.resolve(),
      ]);
      if (!user && !driver) {
        return sendError(res, '该手机号未注册', 400);
      }
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
