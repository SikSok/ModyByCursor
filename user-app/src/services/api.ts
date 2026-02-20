const API_BASE_URL = require('../config/apiBaseUrl').url;
if (__DEV__) console.log('[API] 当前请求地址:', API_BASE_URL);

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = err instanceof Error ? (err.cause ? String(err.cause) : err.stack) : '';
    if (__DEV__) {
      console.error('[API] 请求失败:', `${API_BASE_URL}${path}`);
      console.error('[API] 原因:', msg);
      if (detail) console.error('[API] 详情:', detail);
    }
    throw new Error(__DEV__ ? `网络异常: ${msg}` : '网络异常，请检查网络连接');
  }
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch (err) {
    if (__DEV__) console.error('[API] 响应解析失败:', path, err);
    throw new Error('网络异常，请稍后重试');
  }
  if (!res.ok || json.success === false) {
    const msg = json.message || `请求失败(${res.status})`;
    if (__DEV__) console.error('[API] 接口报错:', path, res.status, msg);
    throw new Error(msg);
  }
  return json;
}

export async function sendCode(phone: string, type: 'register' | 'login') {
  return request<{ code?: string; expires_at: string }>('/verification-codes/send', {
    method: 'POST',
    body: JSON.stringify({ phone, type }),
  });
}

export async function userRegister(params: {
  phone: string;
  password: string;
  name?: string;
  code: string;
}) {
  return request<{ token: string; user: UserProfile }>('/users/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function userLogin(params: { phone: string; password: string }) {
  return request<{ token: string; user: UserProfile }>('/users/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface UserProfile {
  id: number;
  phone: string;
  name?: string;
  avatar?: string;
  status?: number;
}

export async function getUserProfile(token: string) {
  return request<UserProfile>('/users/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface NearbyDriverItem {
  driver: { id: number; phone: string; name?: string; avatar?: string; vehicle_type?: string };
  location: { latitude: number; longitude: number; accuracy?: number | null };
  distance_km: number;
}

export async function getNearbyDrivers(params: {
  lat: number;
  lng: number;
  radius_km?: number;
}): Promise<ApiResponse<NearbyDriverItem[]>> {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_km: String(params.radius_km ?? 10),
  });
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/users/nearby-drivers?${q.toString()}`);
  } catch (err) {
    if (__DEV__) console.error('[API] 附近司机请求失败:', err);
    throw new Error('网络异常，请检查网络连接');
  }
  let json: ApiResponse<NearbyDriverItem[]>;
  try {
    json = (await res.json()) as ApiResponse<NearbyDriverItem[]>;
  } catch (err) {
    if (__DEV__) console.error('[API] 附近司机响应解析失败:', err);
    throw new Error('网络异常，请稍后重试');
  }
  if (!res.ok || json.success === false) {
    if (__DEV__) console.error('[API] 附近司机接口报错:', res.status, json.message);
    throw new Error(json.message || '获取附近司机失败');
  }
  return json;
}
