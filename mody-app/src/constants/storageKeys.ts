/** 司机收款码图片本地 URI 存储 key（AsyncStorage） */
export const STORAGE_KEY_PAYMENT_QR_URI = '@mody_driver_payment_qr_uri';

/** 乘客端默认司机（AsyncStorage），JSON: { id, name, phone, vehicle_type? } */
export const STORAGE_KEY_DEFAULT_DRIVER = '@mody_passenger_default_driver';

/** 天气 API 每日请求计数（用于限流：每天最多 2 次） */
export const STORAGE_KEY_WEATHER_QUOTA = '@mody_weather_quota';
/** 天气结果缓存（达限额时返回当日缓存，避免一直显示「未知」） */
export const STORAGE_KEY_WEATHER_CACHE = '@mody_weather_cache';

/** 全局字号系数（小/标准/大 → 0.9 / 1 / 1.2） */
export const STORAGE_KEY_FONT_SCALE = '@mody_font_scale';

/** 上次 API 报错详情（调试用，供登录页等展示） */
export const STORAGE_KEY_LAST_API_ERROR = '@mody_last_api_error';

/** 乘客端最近联系的司机（AsyncStorage），JSON 数组，最多 5 条，展示 3 条 */
export const STORAGE_KEY_RECENT_CONTACTED_DRIVERS = '@mody_recent_contacted_drivers';

/** 乘客/司机身份上次停留的 tab：'home' | 'messages' | 'profile' */
export const STORAGE_KEY_LAST_TAB_PASSENGER = '@mody_last_tab_passenger';
export const STORAGE_KEY_LAST_TAB_DRIVER = '@mody_last_tab_driver';

/** 首次使用引导（仅一次/按身份） */
export const STORAGE_KEY_ONBOARDING_PASSENGER_DONE = '@mody_onboarding_passenger_done';
export const STORAGE_KEY_ONBOARDING_DRIVER_DONE = '@mody_onboarding_driver_done';

/** 埋点事件队列（AsyncStorage），JSON 数组：[{ event, timestamp, payload? }] */
export const STORAGE_KEY_EVENTS = '@mody_events';

/** 本地开发：是否在乘客端使用假司机数据（仅 __DEV__ 时生效），'1' = 开 */
export const STORAGE_KEY_USE_MOCK_DRIVERS = '@mody_dev_use_mock_drivers';
