import type { Service, Order, OrderStatus, QueueStats } from '../types';

const API_BASE = '/api';

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

export async function getOrdersQueue(status?: string, search?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);

  const res = await fetch(`${API_BASE}/orders?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch queue');
  return data.data;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to update order status');
  return data.data;
}

export async function getQueueStats(): Promise<QueueStats> {
  const res = await fetch(`${API_BASE}/orders/stats/summary`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to fetch stats');
  return data.data;
}
