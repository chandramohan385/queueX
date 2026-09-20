import type { Service, Order, OrderStatus, QueueStats, StaffUser } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('queuex_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('queuex_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('queuex_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==================== AUTHENTICATION ====================

export async function loginStaff(email: string, password: string): Promise<{ token: string; user: StaffUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Login failed. Please check your credentials.');
  }

  setAuthToken(data.token);
  return { token: data.token, user: data.user };
}

export async function getMe(): Promise<StaffUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    clearAuthToken();
    throw new Error(data.message || 'Session expired. Please log in again.');
  }

  return data.user;
}

// ==================== PUBLIC SERVICES ====================

export async function getServices(): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/services`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch services');
  return data.data;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_phone: string;
  notes?: string;
  items: Array<{
    service_id: number;
    quantity: number;
    specifications?: Record<string, any>;
  }>;
  files?: Array<{
    file_name: string;
    file_url: string;
    file_size_bytes?: number;
    mime_type?: string;
    page_count?: number;
  }>;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create order');
  return data.data;
}

export async function getOrderByTokenOrId(tokenOrId: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(tokenOrId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Order not found');
  return data.data;
}

// ==================== PROTECTED OPERATOR POS ====================

export async function getOrdersQueue(status?: string, search?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/orders?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Unauthorized: Staff session expired. Please log in.');
  }
  if (!data.success) throw new Error(data.message || 'Failed to fetch queue');
  return data.data;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Unauthorized: Staff session expired. Please log in.');
  }
  if (!data.success) throw new Error(data.message || 'Failed to update order status');
  return data.data;
}

export async function getQueueStats(): Promise<QueueStats> {
  const res = await fetch(`${API_BASE}/orders/stats/summary`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (res.status === 401) {
    clearAuthToken();
    throw new Error('Unauthorized: Staff session expired. Please log in.');
  }
  if (!data.success) throw new Error(data.message || 'Failed to fetch stats');
  return data.data;
}
