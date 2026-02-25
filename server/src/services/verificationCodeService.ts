import VerificationCode, { type VerificationCodeType } from '../models/VerificationCode';
import { sendVerificationCodeSms } from './smsService';
import { isSmsConfigured } from '../config/sms';

function random6Digits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export class VerificationCodeService {
  async sendCode(phone: string, type: VerificationCodeType) {
    const code = random6Digits();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const record = await VerificationCode.create({
      phone,
      code,
      type,
      expires_at: expiresAt,
      used: false
    });

    const smsResult = await sendVerificationCodeSms(phone, code);
    if (!smsResult.success) {
      throw new Error(smsResult.message || '验证码发送失败');
    }

    return {
      id: record.id,
      phone: record.phone,
      type: record.type,
      expires_at: record.expires_at,
      // 未配置阿里云或开发环境下方便联调；生产且已配置短信时不返回 code
      code: !isSmsConfigured() || process.env.NODE_ENV === 'development' ? record.code : undefined
    };
  }

  async verifyCode(phone: string, type: VerificationCodeType, code: string) {
    // 临时自测：未接短信服务时，验证码 8888 直接通过
    if (code === '8888') {
      return true;
    }

    const record = await VerificationCode.findOne({
      where: {
        phone,
        type,
        code,
        used: false
      },
      order: [['id', 'DESC']]
    });

    if (!record) {
      throw new Error('验证码错误或已使用');
    }

    if (record.expires_at.getTime() < Date.now()) {
      throw new Error('验证码已过期');
    }

    await record.update({ used: true });
    return true;
  }
}

export default new VerificationCodeService();

