/**
 * 微信登录：获取授权 code 后由调用方传予后端。
 * 需安装 react-native-wechat-lib 并在原生端配置微信 AppId。
 * 若未安装或未配置，getWechatAuthCode 会 reject。
 */
export type WechatAuthResult = { code: string; nickname?: string; avatar?: string };

export async function getWechatAuthCode(): Promise<WechatAuthResult> {
  const Wechat = require('react-native-wechat-lib');
  const isWXAppInstalled = await Wechat.isWXAppInstalled();
  if (!isWXAppInstalled) {
    throw new Error('请先安装微信');
  }
  const result = await Wechat.sendAuthRequest('snsapi_userinfo');
  return {
    code: result?.code || result,
    nickname: result?.nickname,
    avatar: result?.headimgurl || result?.avatar,
  };
}
