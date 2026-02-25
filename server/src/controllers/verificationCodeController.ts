import { Request, Response, NextFunction } from 'express';
import verificationCodeService from '../services/verificationCodeService';
import { sendSuccess, sendError } from '../utils/response';

export class VerificationCodeController {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, type } = req.body;
      if (!phone || !type) return sendError(res, 'phone 和 type 不能为空', 400);
      if (!['register', 'login', 'reset_password'].includes(type)) return sendError(res, 'type 必须为 register、login 或 reset_password', 400);

      const result = await verificationCodeService.sendCode(phone, type);
      sendSuccess(res, result, '验证码已发送');
    } catch (e) {
      next(e);
    }
  }
}

export default new VerificationCodeController();

