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

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: 'OWNER' | 'OPERATOR';
}

export interface HourlyVolume {
  hour: number;
  label: string;
  order_count: number;
}

export interface TopServiceMetric {
  service_id: number;
  service_name: string;
  category: string;
  base_price: string | number;
  unit: string;
  order_count: number;
  total_quantity: number;
  total_revenue: string | number;
}

export interface RevenueTrend {
  date: string;
  formatted_date: string;
  revenue: string | number;
  order_count: number;
}

export interface AnalyticsMetrics {
  total_revenue: string | number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  active_orders: number;
  avg_order_value: string | number;
}

export interface OwnerAnalyticsData {
  metrics: AnalyticsMetrics;
  hourly_distribution: HourlyVolume[];
  top_services: TopServiceMetric[];
  revenue_trends: RevenueTrend[];
}

export interface SettlementServiceSummary {
  service_name: string;
  category: string;
  unit: string;
  quantity: number;
  revenue: string | number;
}

export interface DailySettlementData {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  settled_revenue: string | number;
  pending_revenue: string | number;
  token_start: string | null;
  token_end: string | null;
  services_summary: SettlementServiceSummary[];
}

