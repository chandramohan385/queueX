import React, { useState, useEffect, useCallback } from 'react';
import { getOrdersQueue, updateOrderStatus, getQueueStats, getOrderByTokenOrId, getAuthToken } from '../services/api';
import type { Order, OrderStatus, QueueStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  RefreshCw,
  Clock,
  Cpu,
  CheckCircle2,
  IndianRupee,
  X,
  FileText,
  Layers,
  Zap,
} from 'lucide-react';

export const OperatorQueuePage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Drawer State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [queueData, statsData] = await Promise.all([
        getOrdersQueue(activeTab, searchTerm),
        getQueueStats(),
      ]);

      setOrders(queueData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load operator queue');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-Time Server-Sent Events (SSE) Stream — Zero Polling!
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const sseUrl = `/api/events/orders?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('CONNECTED', () => {
      setSseConnected(true);
    });

    eventSource.addEventListener('ORDER_CREATED', () => {
      // New order created by walk-in or remote customer: instant refresh with no polling!
      loadData(true);
    });

    eventSource.addEventListener('STATUS_CHANGED', (event) => {
      try {
        const updatedOrder = JSON.parse(event.data);
        loadData(true);
        setSelectedOrder((prev) => (prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev));
      } catch {
        loadData(true);
      }
    });

    eventSource.onopen = () => setSseConnected(true);
    eventSource.onerror = () => setSseConnected(false);

    return () => {
      eventSource.close();
      setSseConnected(false);
    };
  }, [loadData]);

  const handleStatusAdvance = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      setActionLoadingId(orderId);
      await updateOrderStatus(orderId, nextStatus);

      await loadData(true);
      if (selectedOrder && selectedOrder.id === orderId) {
        const refreshed = await getOrderByTokenOrId(String(orderId));
        setSelectedOrder(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDrawer = async (order: Order) => {
    try {
      const fullOrder = await getOrderByTokenOrId(String(order.id));
      setSelectedOrder(fullOrder);
    } catch (err: any) {
      alert(err.message || 'Failed to open order details');
    }
  };

  const tabs = ['ALL', 'QUEUED', 'PROCESSING', 'READY', 'COMPLETED'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-left">
      
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs mb-2 font-semibold">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Counter Operations POS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Dispatcher Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time management of walk-in tokens, job statuses, and customer pickup dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          {sseConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real-Time SSE Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>Connecting Telemetry...</span>
            </span>
          )}

          <button
            onClick={() => loadData(false)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 transition-colors shadow-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">In Queue</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats ? stats.queued_count : '0'}
          </div>
          <span className="text-[11px] text-slate-500">Awaiting production</span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Processing</span>
            <Cpu className="w-4 h-4 animate-spin text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
            {stats ? stats.processing_count : '0'}
          </div>
          <span className="text-[11px] text-slate-500">Printing & binding</span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Ready for Pickup</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {stats ? stats.ready_count : '0'}
          </div>
          <span className="text-[11px] text-slate-500">In collection tray</span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-sky-700 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider">Today's Revenue</span>
            <IndianRupee className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ₹{stats ? parseFloat(String(stats.today_revenue)).toFixed(2) : '0.00'}
          </div>
          <span className="text-[11px] text-slate-500">
            {stats ? stats.completed_today_count : 0} orders settled
          </span>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === tab
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search token, name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xs"
          />
        </div>

      </div>

      {/* High-Density Orders Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Token ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Summary</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Quick Dispatch</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading queue orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No orders matching the filter '{activeTab}'.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isBusy = actionLoadingId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDrawer(order)}
                    >
                      {/* Token */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        <span className="group-hover:text-sky-600 transition-colors">
                          {order.token_number}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{order.customer_name}</div>
                        <div className="text-[11px] text-slate-500">{order.customer_phone}</div>
                      </td>

                      {/* Summary */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span>{order.item_count || 1} items</span>
                        {order.file_count ? (
                          <span className="ml-2 text-sky-600 font-semibold">({order.file_count} files)</span>
                        ) : null}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        ₹{parseFloat(String(order.total_amount)).toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} size="sm" />
                      </td>

                      {/* Created Time */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(order.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Quick Action Button */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.status === 'QUEUED' && (
                          <button
                            onClick={() => handleStatusAdvance(order.id, 'PROCESSING')}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-xs"
                          >
                            Start Printing
                          </button>
                        )}

                        {order.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleStatusAdvance(order.id, 'READY')}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            Mark Ready
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            onClick={() => handleStatusAdvance(order.id, 'COMPLETED')}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            Complete & Paid
                          </button>
                        )}

                        {order.status === 'COMPLETED' && (
                          <span className="text-[11px] text-slate-400 font-bold uppercase">Settled</span>
                        )}

                        {order.status === 'CANCELLED' && (
                          <span className="text-[11px] text-rose-500 font-bold uppercase">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* Slide-Over Inspection Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full p-6 sm:p-8 overflow-y-auto shadow-2xl flex flex-col justify-between text-left">
            
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Inspection Drawer</span>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    {selectedOrder.token_number}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer Info */}
              <div className="space-y-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-bold text-slate-900">{selectedOrder.customer_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Contact</span>
                  <span className="font-bold text-sky-600">{selectedOrder.customer_phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Status</span>
                  <StatusBadge status={selectedOrder.status} size="sm" />
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
                  Job Specifications
                </h3>
                <div className="divide-y divide-slate-200 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 block">{item.service_name}</span>
                        <span className="text-slate-500 text-[11px]">
                          {item.quantity} units @ ₹{parseFloat(String(item.unit_price)).toFixed(2)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{parseFloat(String(item.subtotal)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 flex justify-between items-baseline font-bold">
                    <span className="text-slate-500 uppercase text-xs">Total</span>
                    <span className="text-emerald-600 text-base">
                      ₹{parseFloat(String(selectedOrder.total_amount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Files */}
              {selectedOrder.files && selectedOrder.files.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
                    Attached Files ({selectedOrder.files.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.files.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                          <span className="truncate text-slate-800 font-medium">{f.file_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0 ml-2 font-semibold">
                          {f.page_count} pages
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs mb-6 text-amber-900">
                  <span className="text-amber-800 uppercase font-bold block mb-1 text-[11px]">
                    Special Customer Notes:
                  </span>
                  <p className="italic">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
              {selectedOrder.status === 'QUEUED' && (
                <button
                  onClick={() => handleStatusAdvance(selectedOrder.id, 'PROCESSING')}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-xs"
                >
                  Start Processing Job
                </button>
              )}

              {selectedOrder.status === 'PROCESSING' && (
                <button
                  onClick={() => handleStatusAdvance(selectedOrder.id, 'READY')}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Mark Ready for Pickup
                </button>
              )}

              {selectedOrder.status === 'READY' && (
                <button
                  onClick={() => handleStatusAdvance(selectedOrder.id, 'COMPLETED')}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Mark Collected & Settled
                </button>
              )}

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
