import DysmsapiClient, { SendSmsRequest } from '@alicloud/dysmsapi20170525';
import { isSmsConfigured, smsConfig } from '../config/sms';

/**
 * 通过阿里云短信服务发送验证码。
 * 若未配置阿里云（ALIYUN_ACCESS_KEY_ID 等），则不调用阿里云，仅用于开发联调（验证码仍会落库，由接口在开发环境返回）。
 */
export async function sendVerificationCodeSms(phone: string, code: string): Promise<{ success: boolean; message?: string }> {
  if (!isSmsConfigured()) {
    return { success: true, message: '未配置阿里云短信，未真实发送' };
  }

  const client = new DysmsapiClient({
    accessKeyId: smsConfig.accessKeyId,
    accessKeySecret: smsConfig.accessKeySecret,
    endpoint: smsConfig.endpoint,
    regionId: smsConfig.regionId
  } as any);

  const phoneNumber = phone.replace(/^\+86/, '').trim() || phone;
  const request = new SendSmsRequest({
    phoneNumbers: phoneNumber,
    signName: smsConfig.signName,
    templateCode: smsConfig.templateCode,
    templateParam: JSON.stringify({ code })
  });

  try {
    const res = await client.sendSms(request);
    const body = res.body;
    if (body?.code === 'OK') {
      return { success: true };
    }
    return {
      success: false,
      message: body?.message || body?.code || '发送失败'
    };
  } catch (err: any) {
    const message = err?.message || err?.data?.Message || String(err);
    return { success: false, message };
  }
}
