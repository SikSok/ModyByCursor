const API_BASE_URL = require('../config/apiBaseUrl').url;

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
        ...(options?.headers || {})
      },
      ...options
    });
  } catch (e) {
    throw new Error('网络异常，请检查网络连接');
  }
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error('网络异常，请稍后重试');
  }
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

export interface DriverProfile {
  id: number;
  phone: string;
  name: string;
  avatar?: string;
  id_card?: string;
  license_plate?: string;
  vehicle_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_available?: boolean;
}

export async function getDriverProfile(token: string) {
  return request<DriverProfile>('/drivers/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
}

