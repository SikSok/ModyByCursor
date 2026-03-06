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
