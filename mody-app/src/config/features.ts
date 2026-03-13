// 功能开关配置（客户端）
// 说明：微信登录尚未在生产环境正式开通，这里通过开关控制入口展示。
// 生产环境在完成微信开放平台接入、服务端 /auth/wechat-login 配置与联调后，
// 可将 ENABLE_WECHAT_LOGIN 置为 true 并重新发布 App，即可恢复微信登录入口。
export const ENABLE_WECHAT_LOGIN = false;

/** 是否显示「假数据」开关按钮（仅开发构建为 true，release 包不显示） */
export const ENABLE_MOCK_DRIVERS_BUTTON = typeof __DEV__ !== 'undefined' && __DEV__;

