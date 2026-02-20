/**
 * 高德地图 Key 配置（必填，否则地图无法显示）
 *
 * 申请步骤：
 * 1. 打开 https://lbs.amap.com/ 登录/注册
 * 2. 控制台 → 应用管理 → 创建新应用 → 添加 Key
 * 3. 服务平台选择「Android 平台」/「iOS 平台」，按提示填写包名、SHA1 等
 * 4. 将下面空字符串改为你的 Key
 *
 * - Android Key: https://lbs.amap.com/api/android-sdk/guide/create-project/get-key
 * - iOS Key: https://lbs.amap.com/api/ios-sdk/guide/create-project/get-key
 */
module.exports = {
  android: process.env.AMAP_ANDROID_KEY || 'd232678c9085d60d2d72ba4e46627b60', // 将 '' 改为你的 Android Key
  ios: process.env.AMAP_IOS_KEY || '',         // 将 '' 改为你的 iOS Key
};
