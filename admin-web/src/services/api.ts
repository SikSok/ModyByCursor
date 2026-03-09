import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type AdminLoginResponse = {
  token: string;
  admin: {
    id: number;
    username: string;
    name?: string;
    email?: string;
    role: 'super_admin' | 'admin' | 'operator';
    status: 'active' | 'inactive';
  };
};

export async function adminLogin(params: { username: string; password: string }) {
  const res = await api.post('/admins/login', params);
  return res.data as { success: boolean; data: AdminLoginResponse; message?: string };
}

export type PendingDriver = {
  id: number;
  phone: string;
  name: string | null;
  avatar: string | null;
  id_card: string | null;
  license_plate: string | null;
  vehicle_type: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export async function getPendingDrivers() {
  const res = await api.get('/admins/drivers/pending');
  return res.data as { success: boolean; data: PendingDriver[]; message?: string };
}

export async function approveDriver(driverId: number) {
  const res = await api.patch(`/admins/drivers/${driverId}/approve`);
  return res.data as { success: boolean; data?: any; message?: string };
}

export async function rejectDriver(driverId: number) {
  const res = await api.patch(`/admins/drivers/${driverId}/reject`);
  return res.data as { success: boolean; data?: any; message?: string };
}

export type AdminStats = {
  totalUsers: number;
  totalDrivers: number;
  driversPending: number;
  driversApproved: number;
  driversRejected: number;
  totalAdmins: number;
};

export async function getStats() {
  const res = await api.get('/admins/stats');
  return res.data as { success: boolean; data: AdminStats; message?: string };
}

export type UserListItem = {
  id: number;
  phone: string;
  name: string | null;
  avatar: string | null;
  status: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type UserListResult = {
  list: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getUserList(params: {
  page?: number;
  pageSize?: number;
  phone?: string;
  status?: 0 | 1;
}) {
  const res = await api.get('/admins/users', { params });
  return res.data as { success: boolean; data: UserListResult; message?: string };
}

export type FeedbackSource = 'app' | 'website';
export type FeedbackType = 'suggestion' | 'experience' | 'report';
export type FeedbackStatus = 'pending' | 'replied' | 'closed';

export type FeedbackItem = {
  id: number;
  source: FeedbackSource;
  user_id: number | null;
  type: FeedbackType;
  content_summary?: string;
  content?: string;
  contact: string | null;
  reported_user_info: string | null;
  status: FeedbackStatus;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackListResult = {
  list: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
};

export async function getFeedbackList(params: {
  page?: number;
  limit?: number;
  source?: FeedbackSource;
  type?: FeedbackType;
  status?: FeedbackStatus;
}) {
  const res = await api.get('/feedback', { params });
  return res.data as { success: boolean; data: FeedbackListResult; message?: string };
}

export async function getFeedbackById(id: number) {
  const res = await api.get(`/feedback/${id}`);
  return res.data as { success: boolean; data: FeedbackItem; message?: string };
}

export async function updateFeedback(id: number, body: { status?: FeedbackStatus; admin_reply?: string }) {
  const res = await api.patch(`/feedback/${id}`, body);
  return res.data as { success: boolean; data: FeedbackItem; message?: string };
}

