const API_BASE_URL = require('../config/apiBaseUrl').url;

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `请求失败(${res.status})`);
  }
  return json;
}

export async function sendCode(phone: string, type: 'register' | 'login') {
  return request<{ code?: string; expires_at: string }>('/verification-codes/send', {
    method: 'POST',
    body: JSON.stringify({ phone, type })
  });
}

export async function userRegister(params: { phone: string; password: string; name?: string; code: string }) {
  return request<{ token: string; user: any }>('/users/register', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function userLogin(params: { phone: string; password: string }) {
  return request<{ token: string; user: any }>('/users/login', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getNearbyDrivers(params: { lat: number; lng: number; radius_km?: number }) {
  const q = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius_km: String(params.radius_km ?? 10)
  });
  const res = await fetch(`${API_BASE_URL}/users/nearby-drivers?${q.toString()}`);
  const json = (await res.json()) as ApiResponse<any[]>;
  if (!res.ok || json.success === false) throw new Error(json.message || '获取失败');
  return json;
}

