/**
 * 和风天气 API 配置（用于司机端首页天气）
 * 未配置 key 时天气显示「未知」。
 *
 * 申请与配置：
 * 1. 打开 https://dev.qweather.com/ 注册并登录
 * 2. 控制台 → 项目管理 → 创建凭据（选 API KEY）→ 复制 API KEY 填到下方
 * 3. 控制台 → 设置 → 查看「API Host」（形如 abc1234xyz.def.qweatherapi.com）
 *    若使用自己的 API Host，填到 QWEATHER_API_HOST；不填则用公共地址（可能被限流或停用）
 */
const QWEATHER_API_KEY = (typeof process !== 'undefined' && process.env?.QWEATHER_API_KEY) || '79ea4a131bf442ec814db2fd9cf446bf';
const QWEATHER_API_HOST = (typeof process !== 'undefined' && process.env?.QWEATHER_API_HOST) || 'kt63yx3q24.re.qweatherapi.com';

export const getWeatherApiKey = () => (QWEATHER_API_KEY && QWEATHER_API_KEY.trim()) || '';

/** 返回和风 API 基地址（含 https），例如 https://abc1234.def.qweatherapi.com */
export const getWeatherApiBase = () => {
  let host = (QWEATHER_API_HOST && QWEATHER_API_HOST.trim()) || '';
  host = host.replace(/\.+/g, '.').replace(/^\.|\.$/g, ''); // 避免 .. 或首尾点导致错误域名
  if (host) return host.startsWith('http') ? host : `https://${host}`;
  return 'https://devapi.qweather.com';
};
