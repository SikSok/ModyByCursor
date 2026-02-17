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

export async function driverRegister(params: {
  phone: string;
  password: string;
  name: string;
  code: string;
  id_card?: string;
  license_plate?: string;
  vehicle_type?: string;
}) {
  return request<{ token: string; driver: any }>('/drivers/register', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function driverLogin(params: { phone: string; password: string }) {
  return request<{ token: string; driver: any }>('/drivers/login', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function reportLocation(token: string, payload: { latitude: number; longitude: number; accuracy?: number }) {
  return request<any>('/drivers/location', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function setAvailability(token: string, is_available: boolean) {
  return request<any>('/drivers/availability', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ is_available })
  });
}

