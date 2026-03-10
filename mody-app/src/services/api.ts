const API_BASE_URL = require('../config/apiBaseUrl').url;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY_LAST_API_ERROR } from '../constants/storageKeys';

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 5000;

/** 网络异常时的统一提示（无 status 或无法连接时使用） */
const NETWORK_ERROR_MSG = '网络异常，请检查网络连接后重试';

/** 判断是否为「连接失败」类错误（原生层或系统返回的英文/技术文案） */
function isConnectionFailureMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return false;
  const s = msg.toLowerCase();
  return (
    /failed to connect|connection refused|network request failed|network error|unable to connect|could not connect|connection reset|econnrefused|enotfound|etimedout|econnreset|socket hang up|cleartext.*not permitted/i.test(s) ||
    /^failed to connect to\s/i.test(s)
  );
}

/** 服务端错误文案：status 无效（无网/未返回）时返回网络异常，否则返回带状态码的文案 */
function serverErrorMessage(status: number | undefined | null, kind: '服务返回错误' | '服务端异常' = '服务返回错误'): string {
  if (status == null || typeof status !== 'number' || Number.isNaN(status)) return NETWORK_ERROR_MSG;
  return `${kind}(${status})，请稍后重试`;
}

/** 使用 react-native-blob-util 发请求（原生层实现，可规避 Android 上 fetch/XHR 收不到 4xx 响应的问题） */
let blobUtilFetch: ((method: string, url: string, headers: Record<string, string>, body: string) => Promise<any>) | null = null;
try {
  const RNFB = require('react-native-blob-util');
  const api = RNFB?.default ?? RNFB;
  if (api && typeof api.fetch === 'function') {
    blobUtilFetch = api.fetch.bind(api);
  }
} catch {
  // 非 RN 或未安装时忽略
}

/**
 * 使用 XMLHttpRequest 发请求并读取响应。
 * React Native Android 上 fetch 对 4xx 响应的 res.text() 有已知的卡住问题，XHR 的 responseText 可正常读取。
 */
function requestWithXHR<T>(
  method: string,
  url: string,
  body: string | undefined,
  timeoutMs: number,
  params?: unknown
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
    }, timeoutMs);

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      clearTimeout(timer);

      const status = xhr.status;
      const responseText = xhr.responseText || '';
      if (__DEV__) {
        console.log('[API XHR] readyState=4', 'status=', status, 'bodyLen=', responseText.length);
      }

      let json: (ApiResponse<T> & { message?: string }) | null = null;
      try {
        json = responseText ? (JSON.parse(responseText) as ApiResponse<T> & { message?: string }) : ({} as any);
      } catch {
        logApiError({
          method,
          url,
          params,
          status,
          message: '响应不是合法 JSON',
          body: responseText.slice(0, 500),
        });
        reject(new Error(serverErrorMessage(status, '服务端异常')));
        return;
      }

      if (status >= 400 || (json?.success === false)) {
        const message = (json != null && 'message' in json ? json.message : undefined) || serverErrorMessage(status);
        logApiError({
          method,
          url,
          params,
          status,
          message,
          body: responseText.slice(0, 500),
        });
        const err = new Error(message) as Error & { code?: string };
        if (json && typeof (json as any).code === 'string') err.code = (json as any).code;
        reject(err);
        return;
      }

      resolve(json as ApiResponse<T>);
    };

    xhr.ontimeout = () => {
      clearTimeout(timer);
      logApiError({ method, url, params, message: '请求超时' });
      reject(new Error('请求超时，请检查网络连接或稍后重试'));
    };

    xhr.onerror = () => {
      clearTimeout(timer);
      logApiError({ method, url, params, message: '网络请求失败', err: 'onerror' });
      reject(new Error(NETWORK_ERROR_MSG));
    };

    xhr.onabort = () => {
      clearTimeout(timer);
      logApiError({ method, url, params, message: '请求已取消/超时' });
      reject(new Error('请求超时，请检查网络连接或稍后重试'));
    };

    try {
      xhr.open(method, url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      // 仅用 setTimeout(abort) 做超时，不设 xhr.timeout（部分 RN Android 上 xhr.timeout 不可靠）
      if (__DEV__) {
        console.log('[API XHR] 发送请求', method, url);
      }
      xhr.send(body ?? undefined);
    } catch (err) {
      clearTimeout(timer);
      logApiError({ method, url, params, err });
      reject(new Error(NETWORK_ERROR_MSG));
    }
  });
}

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

/**
 * 将接口报错详情输出到 Metro 终端（npm start 所在终端），便于排查
 */
function logApiError(details: {
  method: string;
  url: string;
  params?: unknown;
  status?: number;
  statusText?: string;
  message?: string;
  body?: string;
  err?: unknown;
}) {
  const lines = [
    '────────── [API 报错] ──────────',
    `接口: ${details.method} ${details.url}`,
    details.params != null ? `参数: ${JSON.stringify(details.params, null, 2)}` : null,
    details.status != null ? `HTTP 状态: ${details.status} ${details.statusText || ''}` : null,
    details.message ? `报错原因: ${details.message}` : null,
    details.body ? `响应内容: ${details.body}` : null,
    details.err != null ? `异常: ${String(details.err)}` : null,
    '────────────────────────────────',
  ].filter(Boolean);
  console.error('\n' + lines.join('\n') + '\n');

  // 持久化到本地，便于在登录页等地方查看「上次报错」（不连 Metro 也能定位）
  const payload = {
    ...details,
    savedAt: new Date().toISOString(),
  };
  AsyncStorage.setItem(STORAGE_KEY_LAST_API_ERROR, JSON.stringify(payload, null, 2)).catch(() => {});
}

/** 用户可读的报错说明：优先使用接口返回的 message，其次区分「没网/超时」与「服务端业务错误」 */
export function getUserFacingMessage(error: unknown, fallback: string): string {
  if (error == null) return fallback;
  const msg =
    typeof (error as any)?.message === 'string'
      ? (error as any).message
      : String(error);
  const trimmed = msg?.trim();
  if (!trimmed || trimmed === '请求失败') return fallback;
  // 避免把 "服务返回错误(undefined)" 等暴露给用户，统一为网络异常
  if (/服务返回错误\(undefined\)|服务端异常\(undefined\)/.test(trimmed)) return NETWORK_ERROR_MSG;
  // 原生层/系统返回的英文连接错误（如 Failed to connect to /47.110.243.97:3000）统一为友好提示
  if (isConnectionFailureMessage(trimmed)) return NETWORK_ERROR_MSG;
  if (/网络|超时|连接|无法/.test(trimmed)) return trimmed;
  return trimmed;
}

/** 读取上次 API 报错详情（JSON 字符串），便于在登录页等展示，不连 Metro 也能定位 */
export async function getLastApiError(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_LAST_API_ERROR);
  } catch {
    return null;
  }
}

/** 清除本地保存的上次 API 报错 */
export async function clearLastApiError(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_API_ERROR);
  } catch (_) {}
}

/**
 * 通过 Blob + FileReader 读取响应体，避免 Android 上 res.text()/res.json() 或 XHR readyState 不回调的问题。
 */
function readResponseAsText(res: Response, timeoutMs: number): Promise<string> {
  return Promise.race([
    res.blob().then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result ?? ''));
          reader.onerror = () => reject(new Error('BODY_READ_FAILED'));
          reader.readAsText(blob);
        })
    ),
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('BODY_READ_TIMEOUT')), timeoutMs)
    ),
  ]);
}

async function request<T>(
  path: string,
  options?: RequestInit & { _params?: unknown }
): Promise<ApiResponse<T>> {
  const method = (options?.method || 'GET').toUpperCase();
  const url = `${API_BASE_URL}${path}`;
  const params = options?._params;
  const body = options?.body as string | undefined;

  console.log(`[API 请求] ${method} ${path} -> ${url}`);

  if (blobUtilFetch) {
    return requestWithBlobUtil<T>(method, url, body, options, params);
  }
  return requestWithFetch<T>(method, url, body, options, params);
}

/** react-native-blob-util：原生网络栈，可正常收到 4xx 响应体 */
function requestWithBlobUtil<T>(
  method: string,
  url: string,
  body: string | undefined,
  options?: RequestInit & { _params?: unknown },
  params?: unknown
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  return Promise.race([
    new Promise<ApiResponse<T>>((resolve, reject) => {
      blobUtilFetch!(method, url, headers, body ?? '')
        .then((res) => {
          const status = res.info().status;
          let bodyText = '';
          try {
            bodyText = res.text();
          } catch {
            bodyText = '';
          }
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[API BlobUtil] 已读响应 status=', status, 'bodyLen=', bodyText.length);
          }
          let json: (ApiResponse<T> & { message?: string }) | null = null;
          try {
            json = bodyText ? (JSON.parse(bodyText) as ApiResponse<T> & { message?: string }) : ({} as any);
          } catch {
            logApiError({
              method,
              url,
              params,
              status,
              message: '响应不是合法 JSON',
              body: bodyText.slice(0, 500),
            });
            reject(new Error(serverErrorMessage(status, '服务端异常')));
            return;
          }
          if (status >= 400 || (json && json.success === false)) {
            const message = (json && 'message' in json ? json.message : undefined) || serverErrorMessage(status);
            logApiError({ method, url, params, status, message });
            const err = new Error(message) as Error & { code?: string };
            if (json && typeof (json as any).code === 'string') err.code = (json as any).code;
            reject(err);
            return;
          }
          resolve(json as ApiResponse<T>);
        })
        .catch((err: any, statusCode?: number) => {
          logApiError({
            method,
            url,
            params,
            status: statusCode,
            message: err?.message || '网络请求失败',
            err,
          });
          const rawMsg = err?.message;
          const friendlyMessage =
            isConnectionFailureMessage(rawMsg) || (rawMsg && isConnectionFailureMessage(String(rawMsg)))
              ? NETWORK_ERROR_MSG
              : rawMsg && rawMsg !== `服务返回错误(${statusCode})，请稍后重试`
                ? rawMsg
                : serverErrorMessage(statusCode ?? undefined);
          reject(new Error(friendlyMessage));
        });
    }),
    new Promise<ApiResponse<T>>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时，请检查网络连接或稍后重试')), REQUEST_TIMEOUT_MS)
    ),
  ]);
}

/** 使用 fetch + Blob/FileReader 读响应（兜底） */
async function requestWithFetch<T>(
  method: string,
  url: string,
  body: string | undefined,
  options?: RequestInit & { _params?: unknown },
  params?: unknown
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) },
      body,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isAbort = err?.name === 'AbortError';
    logApiError({
      method,
      url,
      params,
      message: isAbort ? '请求超时' : '网络请求失败',
      err,
    });
    if (isAbort) throw new Error('请求超时，请检查网络连接或稍后重试');
    throw new Error(NETWORK_ERROR_MSG);
  }
  clearTimeout(timeoutId);

  const BODY_READ_MS = 4000;
  let bodyText: string;
  try {
    bodyText = await readResponseAsText(res, BODY_READ_MS);
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[API] 已读响应 status=', res.status, 'bodyLen=', bodyText.length);
    }
  } catch (e: any) {
    if (e?.message === 'BODY_READ_TIMEOUT') {
      logApiError({ method, url, params, status: res.status, message: '读取响应超时' });
      throw new Error('服务响应超时，请稍后重试');
    }
    logApiError({ method, url, params, status: res.status, message: '读取响应失败', err: e });
    throw new Error('服务端响应异常，请稍后重试');
  }

  let json: (ApiResponse<T> & { message?: string }) | null = null;
  try {
    json = bodyText ? (JSON.parse(bodyText) as ApiResponse<T> & { message?: string }) : ({} as any);
  } catch {
    logApiError({
      method,
      url,
      params,
      status: res.status,
      message: '响应不是合法 JSON',
      body: bodyText.slice(0, 500),
    });
    throw new Error(serverErrorMessage(res.status, '服务端异常'));
  }

  if (!res.ok || (json && json.success === false)) {
    const message = (json && 'message' in json ? json.message : undefined) || serverErrorMessage(res.status);
    logApiError({ method, url, params, status: res.status, message });
    const err = new Error(message) as Error & { code?: string };
    if (json && typeof (json as any).code === 'string') err.code = (json as any).code;
    throw err;
  }

  return json as ApiResponse<T>;
}

function jsonBody(params: object, method: string, path: string) {
  return {
    body: JSON.stringify(params),
    _params: params,
  } as RequestInit & { _params: unknown };
}

/** 发送验证码（当前登录/注册流程已不用，仅备用） */
async function sendCode(phone: string, type: 'register' | 'login' | 'reset_password') {
  return request<{ code?: string; expires_at: string }>(
    '/verification-codes/send',
    { method: 'POST', ...jsonBody({ phone, type }, 'POST', '/verification-codes/send') }
  );
}

export async function unifiedLogin(params: { phone: string; password: string }) {
  return request<{
    user: { token: string; id: number; phone?: string | null; name?: string; avatar?: string };
    hasDriver: boolean;
    driverStatus?: 'pending' | 'approved' | 'rejected';
    isAvailable?: boolean;
  }>('/auth/login', { method: 'POST', ...jsonBody(params, 'POST', '/auth/login') });
}

export async function resetPassword(params: { phone: string; code: string; new_password: string }) {
  return request<null>(
    '/auth/reset-password',
    { method: 'POST', ...jsonBody(params, 'POST', '/auth/reset-password') }
  );
}

/** 微信登录：传 code（由前端微信 SDK 获取）或 openid/unionid，可选 nickname、avatar */
export async function wechatLogin(params: {
  code?: string;
  openid?: string;
  unionid?: string;
  nickname?: string;
  avatar?: string;
}) {
  return request<{
    user: { token: string; id: number; phone?: string | null; name?: string; avatar?: string };
    hasDriver: boolean;
    driverStatus?: 'pending' | 'approved' | 'rejected';
    isAvailable?: boolean;
  }>('/auth/wechat-login', { method: 'POST', ...jsonBody(params, 'POST', '/auth/wechat-login') });
}

export async function userRegister(params: {
  phone: string;
  password: string;
  name?: string;
}) {
  return request<{
    user: { id: number; phone: string; name?: string; avatar?: string; token: string };
    token: string;
    hasDriver?: boolean;
    driverStatus?: 'pending' | 'approved' | 'rejected';
    isAvailable?: boolean;
  }>('/users/register', {
    method: 'POST',
    ...jsonBody(params, 'POST', '/users/register'),
  });
}

export async function userLogin(params: { phone: string; password: string }) {
  return request<{ token: string; user: any }>('/users/login', {
    method: 'POST',
    ...jsonBody(params, 'POST', '/users/login'),
  });
}

/** 乘客端：拨打前通知司机（先调此接口再调起拨号） */
export async function contactDriver(token: string, driverId: number | string) {
  return request<{ id: number }>('/passenger/contact-driver', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody({ driverId: typeof driverId === 'string' ? parseInt(driverId, 10) : driverId }, 'POST', '/passenger/contact-driver'),
  });
}

export async function getNearbyDrivers(params: {
  lat: number;
  lng: number;
  radius_km?: number;
}) {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_km: String(params.radius_km ?? 10),
  });
  return request<Array<{
    driver: { id: number; phone?: string; name: string; avatar?: string; vehicle_type?: string };
    location: { latitude: number; longitude: number };
    distance_km: number;
  }>>(`/users/nearby-drivers?${q.toString()}`, { method: 'GET' });
}

/** 乘客端：获取当前用户信息（含上次定位 last_latitude, last_longitude, last_location_name） */
export async function getUserProfile(token: string) {
  return request<{
    id: number;
    phone?: string | null;
    name?: string;
    avatar?: string;
    status: number;
    last_latitude?: number | null;
    last_longitude?: number | null;
    last_location_name?: string | null;
    last_location_updated_at?: string | null;
  }>('/users/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateUserProfile(
  token: string,
  payload: { name?: string; avatar?: string; phone?: string }
) {
  return request<{ id: number; phone?: string | null; name?: string; avatar?: string }>('/users/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'PUT', '/users/profile'),
  });
}

/** 乘客端：更新当前用户的上次定位（可选 name） */
export async function updateUserLastLocation(
  token: string,
  payload: { latitude: number; longitude: number; name?: string }
) {
  return request<{
    last_latitude: number;
    last_longitude: number;
    last_location_name?: string;
    last_location_updated_at: string;
  }>('/users/me/last-location', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'PUT', '/users/me/last-location'),
  });
}

/** 乘客端：常用/历史定位列表（最多 4～5 条） */
export async function getLocationHistory(token: string) {
  return request<Array<{
    id: number;
    latitude: number;
    longitude: number;
    name: string;
    created_at: string;
  }>>('/users/me/location-history?limit=5', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 乘客端：新增一条常用/历史定位（重新定位成功后调用） */
export async function addLocationHistory(
  token: string,
  payload: { latitude: number; longitude: number; name: string }
) {
  return request<{ id: number; latitude: number; longitude: number; name: string; created_at: string }>(
    '/users/me/location-history',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      ...jsonBody(payload, 'POST', '/users/me/location-history'),
    }
  );
}

export async function driverRegister(params: {
  phone: string;
  password: string;
  name: string;
  id_card?: string;
  license_plate?: string;
  vehicle_type?: string;
}) {
  return request<{
    user: { id: number; phone: string; name: string; avatar?: string; token: string };
    hasDriver: boolean;
    driverStatus?: 'pending' | 'approved' | 'rejected';
    isAvailable?: boolean;
  }>('/drivers/register', {
    method: 'POST',
    ...jsonBody(params, 'POST', '/drivers/register'),
  });
}

export async function driverLogin(params: { phone: string; password: string }) {
  return request<{ token: string; driver: any }>('/drivers/login', {
    method: 'POST',
    ...jsonBody(params, 'POST', '/drivers/login'),
  });
}

export async function reportLocation(
  token: string,
  payload: { latitude: number; longitude: number; accuracy?: number }
) {
  return request<any>('/drivers/location', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'POST', '/drivers/location'),
  });
}

export async function setAvailability(token: string, is_available: boolean) {
  return request<any>('/drivers/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody({ is_available }, 'PATCH', '/drivers/availability'),
  });
}

export async function getDriverProfile(token: string) {
  return request<{
    id: number;
    phone?: string | null;
    name: string;
    avatar?: string;
    id_card?: string;
    id_card_front?: string;
    id_card_back?: string;
    license_plate?: string;
    license_plate_photo?: string;
    vehicle_type?: string;
    status: 'pending' | 'approved' | 'rejected';
    is_available: boolean;
  }>('/drivers/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 司机端：更新司机资料（昵称、头像、手机号） */
export async function updateDriverProfile(
  token: string,
  payload: { name?: string; avatar?: string; phone?: string }
) {
  return request<{ id: number; phone?: string | null; name: string; avatar?: string }>('/drivers/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'PUT', '/drivers/profile'),
  });
}

/** 司机端：通知列表分页，返回 list 与 unreadCount */
export async function getDriverNotifications(token: string, page: number = 1, limit: number = 20) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request<{
    list: Array<{ id: number; content: string; created_at: string; read: boolean }>;
    unreadCount: number;
  }>(`/drivers/me/notifications?${q.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 司机端：全部标记已读 */
export async function markDriverNotificationsRead(token: string) {
  return request<null>('/drivers/me/notifications/read', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function submitVerification(
  token: string,
  payload: {
    id_card_front: string;
    id_card_back: string;
    license_plate: string;
    license_plate_photo?: string;
  }
) {
  return request<any>('/drivers/verification', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'POST', '/drivers/verification'),
  });
}

/** 建议与反馈：App 用户提交 */
export async function submitFeedback(
  token: string,
  payload: {
    type: 'suggestion' | 'experience' | 'report';
    content: string;
    reported_user_info?: string;
  }
) {
  return request<{ id: number }>('/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    ...jsonBody(payload, 'POST', '/feedback'),
  });
}

/** 我的反馈列表（含回复） */
export async function getMyFeedback(token: string) {
  return request<
    Array<{
      id: number;
      type: string;
      content: string;
      reported_user_info: string | null;
      status: string;
      admin_reply: string | null;
      replied_at: string | null;
      created_at: string;
    }>
  >('/feedback/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}
