/**
 * 高德地图 API Key（不提交真实密钥，本地/CI 配置 AMAP_KEY 或替换此处占位）
 * 真机调试前请在 高德开放平台 申请 Key 并配置：
 * - Android: https://lbs.amap.com/api/android-sdk/guide/create-project/get-key
 * - iOS: https://lbs.amap.com/api/ios-sdk/guide/create-project/get-key
 */
export const AMAP_KEY = typeof process !== 'undefined' && process.env?.AMAP_KEY
  ? process.env.AMAP_KEY
  : 'd232678c9085d60d2d72ba4e46627b60';
