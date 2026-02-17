import dotenv from 'dotenv';

dotenv.config();

/** 阿里云短信配置（用于发送验证码）。未配置时仅落库不真实发短信，开发环境响应中会返回 code 便于联调 */
export const smsConfig = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
  /** 国内短信 endpoint，不填则 SDK 按 regionId 解析 */
  endpoint: process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
  regionId: process.env.ALIYUN_SMS_REGION_ID || 'cn-hangzhou'
};

export function isSmsConfigured(): boolean {
  return !!(
    smsConfig.accessKeyId &&
    smsConfig.accessKeySecret &&
    smsConfig.signName &&
    smsConfig.templateCode
  );
}
