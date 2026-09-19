export type OrderStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface Service {
  id: number;
  name: string;
  category: 'PRINTING' | 'FINISHING' | 'CARD_PRINT' | 'PHOTO' | string;
  description?: string;
  base_price: string | number;
  unit: string;
}

export interface OrderItemInput {
  service_id: number;
  quantity: number;
  specifications?: Record<string, any>;
}

export interface OrderItem {
  id?: number;
  service_id: number;
  service_name?: string;
  name?: string;
  category?: string;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  specifications?: Record<string, any>;
}

export interface OrderFile {
  id?: number;
  file_name: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  page_count?: number;
  uploaded_at?: string;
}

export interface Order {
  id: number;
  token_number: string;
  customer_name: string;
  customer_phone: string;
  status: OrderStatus;
  total_amount: string | number;
  payment_status: 'PENDING' | 'PAID';
  notes?: string;
  created_at: string;
  updated_at?: string;
  item_count?: number;
  file_count?: number;
  items?: OrderItem[];
  files?: OrderFile[];
}

export interface QueueStats {
  queued_count: string | number;
  processing_count: string | number;
  ready_count: string | number;
  completed_today_count: string | number;
  today_revenue: string | number;
}
