/** 司机收款码图片本地 URI 存储 key（AsyncStorage） */
export const STORAGE_KEY_PAYMENT_QR_URI = '@mody_driver_payment_qr_uri';

/** 天气 API 每日请求计数（用于限流：每天最多 2 次） */
export const STORAGE_KEY_WEATHER_QUOTA = '@mody_weather_quota';
/** 天气结果缓存（达限额时返回当日缓存，避免一直显示「未知」） */
export const STORAGE_KEY_WEATHER_CACHE = '@mody_weather_cache';
