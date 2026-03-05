/**
 * 使用和风天气 API 获取当前天气（国内可用，需配置 key）
 * 文档: https://dev.qweather.com/docs/api/weather/weather-now/
 * 未配置 key 或请求失败时返回 null，由上层显示「未知」。
 * 限流：每设备每天最多请求 2 次（上午/下午各一次），超限时返回当日缓存或 null。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeatherApiKey } from '../config/weatherKey';
import { STORAGE_KEY_WEATHER_CACHE, STORAGE_KEY_WEATHER_QUOTA } from '../constants/storageKeys';

const PATH_NOW = '/v7/weather/now';
const MAX_REQUESTS_PER_DAY = 2;

/** 和风 API base：和风控制台-设置里的 API Host，注意是 q24 不是 qq24 */
const FALLBACK_WEATHER_BASE = 'https://' + 'kt63yx3q24' + '.' + 're.qweatherapi.com';

/**
 * 在设备上运行时修正 base URL，应对打包/传输导致的字符被重复（如 ..、qq24）
 */
function normalizeWeatherBase(raw: string): string {
  let s = raw.replace(/\.+/g, '.');
  s = s.replace(/qq24/g, 'q24');
  return s;
}

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type WeatherResult = {
  temp: number;
  code: number;
  desc: string;
};

/** 和风返回的 now 结构 */
type QWeatherNow = {
  temp?: string;
  text?: string;
  icon?: string;
};

/**
 * 根据经纬度获取当前天气。
 * 限流：每设备每天最多请求 2 次，成功后才计次；超限时返回当日缓存（若有）或 null。
 */
export async function fetchWeather(lat: number, lng: number): Promise<WeatherResult | null> {
  const key = getWeatherApiKey();
  if (!key) return null;

  const today = getTodayDateString();

  try {
    const quotaRaw = await AsyncStorage.getItem(STORAGE_KEY_WEATHER_QUOTA);
    const quota: { date: string; count: number } = quotaRaw
      ? JSON.parse(quotaRaw)
      : { date: '', count: 0 };

    if (quota.date === today && quota.count >= MAX_REQUESTS_PER_DAY) {
      if (__DEV__) console.warn('[weather] quota exceeded today, count=', quota.count);
      const cacheRaw = await AsyncStorage.getItem(STORAGE_KEY_WEATHER_CACHE);
      const cache = cacheRaw ? (JSON.parse(cacheRaw) as { date: string; result: WeatherResult }) : null;
      if (cache && cache.date === today && cache.result) return cache.result;
      return null;
    }
  } catch {
    // 读取存储失败时仍允许请求
  }

  // 请求前在设备上做一次修正，避免 bundle 里被多打点或多打 q
  const base = normalizeWeatherBase(FALLBACK_WEATHER_BASE);
  const location = `${lng.toFixed(2)},${lat.toFixed(2)}`;
  const url = `${base}${PATH_NOW}?location=${encodeURIComponent(location)}&lang=zh&key=${encodeURIComponent(key)}`;
  const timeoutMs = 8000;

  if (__DEV__) {
    console.warn('[weather] v2 request', base + PATH_NOW, 'location=', location, 'keyLen=', key.length);
  }

  return new Promise((resolve) => {
    const saveQuotaAndCache = (result: WeatherResult) => {
      AsyncStorage.getItem(STORAGE_KEY_WEATHER_QUOTA).then((quotaRaw) => {
        const quota: { date: string; count: number } = quotaRaw
          ? JSON.parse(quotaRaw)
          : { date: '', count: 0 };
        const next =
          quota.date === today
            ? { date: today, count: Math.min(quota.count + 1, MAX_REQUESTS_PER_DAY) }
            : { date: today, count: 1 };
        AsyncStorage.setItem(STORAGE_KEY_WEATHER_QUOTA, JSON.stringify(next)).catch(() => {});
        AsyncStorage.setItem(
          STORAGE_KEY_WEATHER_CACHE,
          JSON.stringify({ date: today, result })
        ).catch(() => {});
      }).catch(() => {});
    };

    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      try {
        xhr.abort();
      } catch (_) {}
      resolve(null);
    }, timeoutMs);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      clearTimeout(timer);
      if (xhr.status !== 200) {
        if (__DEV__) console.warn('[weather] fail status=', xhr.status, 'body=', (xhr.responseText || '').slice(0, 200));
        resolve(null);
        return;
      }
      try {
        const text = xhr.responseText || '';
        const data = text
          ? (JSON.parse(text) as { code?: string; now?: QWeatherNow })
          : null;
        if (data?.code !== '200' || !data?.now) {
          if (__DEV__) console.warn('[weather] fail code=', data?.code, 'hasNow=', !!data?.now);
          resolve(null);
          return;
        }
        const now = data.now;
        const tempStr = now.temp != null ? String(now.temp).trim() : '';
        const temp = tempStr ? Math.round(parseFloat(tempStr)) : 0;
        const desc = (now.text && now.text.trim()) || '阴';
        const code = now.icon ? parseInt(now.icon, 10) : 0;
        const result: WeatherResult = {
          temp: Number.isFinite(temp) ? temp : 0,
          code: Number.isFinite(code) ? code : 0,
          desc,
        };
        saveQuotaAndCache(result);
        resolve(result);
      } catch {
        resolve(null);
      }
    };

    xhr.ontimeout = () => {
      clearTimeout(timer);
      if (__DEV__) console.warn('[weather] timeout');
      resolve(null);
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      if (__DEV__) console.warn('[weather] network error');
      resolve(null);
    };

    try {
      xhr.open('GET', url, true);
      xhr.timeout = timeoutMs;
      xhr.send();
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
