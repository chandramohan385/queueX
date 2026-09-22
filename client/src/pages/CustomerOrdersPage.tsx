import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Clock,
  Printer,
  ChevronRight,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  X,
  FileText,
  UserCheck,
  Edit2,
  CheckCircle2,
  LogOut,
  Bell,
  BellRing,
} from 'lucide-react';
import { getCustomerOrders, getOrderByTokenOrId } from '../services/api';
import type { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DigitalTicketStub } from '../components/DigitalTicketStub';
import { generateThermalReceipt } from '../utils/receiptGenerator';
import { printThermalReceiptDirect } from '../utils/thermalPrinter';
import { useWebNotifications } from '../hooks/useWebNotifications';

export const CustomerOrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenParam = searchParams.get('token') || searchParams.get('highlight');

  // Customer phone persistence
  const [savedPhone, setSavedPhone] = useState<string>(() => {
    return localStorage.getItem('queuex_customer_phone') || '';
  });
  const [phoneInput, setPhoneInput] = useState<string>(savedPhone);
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(!savedPhone);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Order for Modal Ticket Inspection
  const [activeTicketOrder, setActiveTicketOrder] = useState<Order | null>(null);

  // Time Window Filter (defaults to 30 days / 1 month as requested)
  const [filterDays, setFilterDays] = useState<number>(30);

  // Live SSE connection state
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  // Web Push & Web Audio Chime notification hook
  const {
    isSupported: notifSupported,
    permission: notifPermission,
    requestPermission,
    notifyOrderReady,
  } = useWebNotifications();

  // Load orders for the saved phone
  const loadOrders = useCallback(async (phone: string, days: number) => {
    if (!phone || phone.trim().length < 5) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerOrders(phone.trim(), days);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve order history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load when phone or filterDays change
  useEffect(() => {
    if (savedPhone) {
      loadOrders(savedPhone, filterDays);
    }
  }, [savedPhone, filterDays, loadOrders]);

  // Handle auto-opening specific ticket from ?token= parameter
  useEffect(() => {
    if (!tokenParam) return;

    // Check if it's already in the orders list
    const found = orders.find((o) => o.token_number.toUpperCase() === tokenParam.toUpperCase());
    if (found) {
      setActiveTicketOrder(found);
    } else if (!loading && savedPhone) {
      // Fetch directly if not yet in current page
      getOrderByTokenOrId(tokenParam)
        .then((ord) => {
          setActiveTicketOrder(ord);
        })
        .catch(() => {
          // Token not found, ignore gracefully
        });
    }
  }, [tokenParam, orders, loading, savedPhone]);

  // Real-time SSE telemetry for the active customer phone
  useEffect(() => {
    if (!savedPhone) {
      setIsLiveConnected(false);
      return;
    }

    const sseUrl = `/api/events/customer/${encodeURIComponent(savedPhone.trim())}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('CONNECTED', () => {
      setIsLiveConnected(true);
    });

    eventSource.addEventListener('STATUS_CHANGED', (event) => {
      try {
        const updatedOrder: Order = JSON.parse(event.data);
        setOrders((prev) => {
          const index = prev.findIndex((o) => o.id === updatedOrder.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = { ...next[index], ...updatedOrder };
            return next;
          }
          return [updatedOrder, ...prev];
        });

        // Also update ticket stub modal if open
        setActiveTicketOrder((current) => {
          if (current && current.id === updatedOrder.id) {
            return { ...current, ...updatedOrder };
          }
          return current;
        });

        // Trigger push notification & harmonic audio chime if ready
        if (updatedOrder.status === 'READY') {
          notifyOrderReady(updatedOrder.token_number, updatedOrder.customer_name);
        }
      } catch (err) {
        console.error('Failed to parse SSE order update:', err);
      }
    });

    eventSource.addEventListener('ORDER_CREATED', (event) => {
      try {
        const createdOrder: Order = JSON.parse(event.data);
        setOrders((prev) => {
          if (prev.some((o) => o.id === createdOrder.id)) return prev;
          return [createdOrder, ...prev];
        });
      } catch (err) {
        console.error('Failed to parse SSE order created:', err);
      }
    });

    eventSource.onopen = () => {
      setIsLiveConnected(true);
    };

    eventSource.onerror = () => {
      setIsLiveConnected(false);
    };

    return () => {
      eventSource.close();
      setIsLiveConnected(false);
    };
  }, [savedPhone, notifyOrderReady]);

  // Phone submission handler
  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneInput.trim();
    if (clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError(null);
    localStorage.setItem('queuex_customer_phone', clean);
    setSavedPhone(clean);
    setIsEditingPhone(false);
  };

  // Switch / Clear Phone
  const handleSwitchPhone = () => {
    setIsEditingPhone(true);
    setPhoneInput(savedPhone);
  };

  const handleClearSavedPhone = () => {
    localStorage.removeItem('queuex_customer_phone');
    setSavedPhone('');
    setPhoneInput('');
    setOrders([]);
    setIsEditingPhone(true);
  };

  // Separate active vs completed/cancelled
  const activeOrders = orders.filter((o) => ['QUEUED', 'PROCESSING', 'READY'].includes(o.status));
  const pastOrders = orders.filter((o) => ['COMPLETED', 'CANCELLED'].includes(o.status));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>Customer Portal</span>
            </span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Sync Active</span>
              </span>
            )}
            {notifSupported && (
              <button
                type="button"
                onClick={async () => {
                  if (notifPermission !== 'granted') {
                    await requestPermission();
                  } else {
                    notifyOrderReady('DEMO', 'Customer');
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                  notifPermission === 'granted'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title={notifPermission === 'granted' ? 'Alerts active (Click to test chime)' : 'Click to enable order ready sound & notifications'}
              >
                {notifPermission === 'granted' ? (
                  <>
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>Alerts On</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                    <span>Enable Alerts</span>
                  </>
                )}
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Instant tracking for your active print jobs and tickets within the last month. No token memorization required.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => savedPhone && loadOrders(savedPhone, filterDays)}
            disabled={loading || !savedPhone}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2.5 sm:py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Refresh order statuses"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/"
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 text-center"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">New Order</span>
          </Link>
        </div>
      </div>

      {/* 2. Customer Phone Bar / Lookup Prompt */}
      {(!savedPhone || isEditingPhone) ? (
        <div className="mb-8 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-2xl border border-sky-100 p-6 sm:p-8 shadow-xs">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-white border border-sky-200 shadow-xs flex items-center justify-center text-sky-600 mx-auto mb-3">
              <Phone className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Find Your Orders with Your Mobile Number
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Enter your 10-digit phone number. QueueX remembers it on this device so your active tokens and 30-day history appear automatically on every visit.
            </p>

            <form onSubmit={handleSavePhone} className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <div className="relative flex-1 max-w-sm mx-auto sm:mx-0">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit number"
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  type="submit"
                  disabled={phoneInput.trim().length < 10}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  View My Orders
                </button>
                {savedPhone && (
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {error && (
              <p className="text-xs text-rose-600 font-medium mt-3 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Logged in / Remembered Phone Banner */
        <div className="mb-6 sm:mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 mt-0.5 sm:mt-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  +91 {savedPhone}
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Device Remembered
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Default: Orders within last 30 days (1 month).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {/* Filter scope toggle (30 days default) */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFilterDays(30)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterDays === 30
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1 Month (Default)
              </button>
              <button
                type="button"
                onClick={() => setFilterDays(90)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  filterDays === 90
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                3 Months
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSwitchPhone}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600 flex items-center gap-1 cursor-pointer active:scale-95"
                title="Look up another phone number"
              >
                <Edit2 className="w-3 h-3 text-slate-400" />
                <span>Change</span>
              </button>

              <button
                type="button"
                onClick={handleClearSavedPhone}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer active:scale-95"
                title="Forget this phone number on this device"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Loading Indicator */}
      {loading && (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Fetching your counter tickets from the last {filterDays} days...
          </p>
        </div>
      )}

      {/* 4. Error Message */}
      {!loading && error && savedPhone && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadOrders(savedPhone, filterDays)}
            className="font-bold underline ml-3 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5. Orders Listing */}
      {!loading && savedPhone && orders.length === 0 && !error && (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            No Orders Found in the Last {filterDays} Days
          </h3>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
            We couldn't find any print or xerox orders associated with <span className="font-semibold text-slate-700">+91 {savedPhone}</span> in this period.
          </p>
          <div className="flex justify-center gap-3">
            {filterDays === 30 && (
              <button
                type="button"
                onClick={() => setFilterDays(90)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Check Last 90 Days
              </button>
            )}
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Order</span>
            </Link>
          </div>
        </div>
      )}

      {/* When Orders Exist */}
      {!loading && orders.length > 0 && (
        <div className="space-y-8">
          {/* Section A: Active Orders (QUEUED, PROCESSING, READY) */}
          {activeOrders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Active Counter Jobs ({activeOrders.length})
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Auto-updating via live counter telemetry
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeOrders.map((order) => {
                  const isReady = order.status === 'READY';
                  const isProcessing = order.status === 'PROCESSING';

                  return (
                    <div
                      key={order.id}
                      className={`relative rounded-2xl bg-white border transition-all p-5 shadow-xs hover:shadow-md flex flex-col justify-between ${
                        isReady
                          ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-b from-emerald-50/20 to-white'
                          : isProcessing
                          ? 'border-amber-300 ring-1 ring-amber-400/20'
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        {/* Token & Status */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Token Number
                            </span>
                            <span className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                              #{order.token_number}
                            </span>
                          </div>
                          <StatusBadge status={order.status} size="sm" />
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="my-3 py-2 px-3 rounded-xl bg-slate-50 border border-slate-150">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                            <span>Stage:</span>
                            <span className={isReady ? 'text-emerald-700 font-bold' : isProcessing ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                              {order.status === 'QUEUED' && '1. Ticket Issued'}
                              {order.status === 'PROCESSING' && '2. In Production'}
                              {order.status === 'READY' && '3. Ready for Pickup!'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isReady
                                  ? 'w-full bg-emerald-500'
                                  : isProcessing
                                  ? 'w-2/3 bg-amber-500 animate-pulse'
                                  : 'w-1/3 bg-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Items list preview */}
                        {order.items && order.items.length > 0 && (
                          <div className="my-3 space-y-1">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                              Order Items ({order.items.length})
                            </span>
                            <div className="text-xs text-slate-700 space-y-1 max-h-24 overflow-y-auto pr-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                  <span className="truncate max-w-[180px] font-medium text-slate-800">
                                    {item.service_name || `Service #${item.service_id}`}
                                  </span>
                                  <span className="text-slate-500 font-mono">
                                    x{item.quantity} · ₹{Number(item.subtotal).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Date & Amount */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            ₹{Number(order.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTicketOrder(order)}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span>View Digital Ticket</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printThermalReceiptDirect(order)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer"
                          title="Direct 80mm Thermal Receipt Slip"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section B: Completed & Past Orders (Last 30 Days) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Order History (Last {filterDays} Days)
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {pastOrders.length} {pastOrders.length === 1 ? 'completed order' : 'completed orders'}
              </span>
            </div>

            {pastOrders.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                No past orders completed in this time window.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
                {pastOrders.map((order) => {
                  const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/80 transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-700 text-xs shrink-0 mt-0.5 sm:mt-0">
                          #{order.token_number}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm font-mono">
                              Token #{order.token_number}
                            </span>
                            <StatusBadge status={order.status} size="sm" showPulse={false} />
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              PAID
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{formattedDate}</span>
                            <span>•</span>
                            <span>{order.item_count || (order.items ? order.items.length : 1)} service(s)</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-sm font-extrabold text-slate-900 block font-mono">
                            ₹{Number(order.total_amount).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {order.payment_status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => generateThermalReceipt(order)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                            title="Download Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTicketOrder(order)}
                            className="px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          >
                            <span>Ticket</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Modal / Bottom-Sheet for Digital Ticket Stub & Thermal Receipt */}
      {activeTicketOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] my-0 sm:my-8 bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-slideUp flex flex-col">
            {/* Modal Top Bar */}
            <div className="sticky top-0 z-10 p-3.5 sm:p-4 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Ticket #{activeTicketOrder.token_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTicketOrder(null);
                  if (tokenParam) {
                    setSearchParams({});
                  }
                }}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-all cursor-pointer active:scale-95"
                title="Close Ticket Modal"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Digital Ticket Stub */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1">
              <DigitalTicketStub
                order={activeTicketOrder}
                onOrderUpdated={(updated) => {
                  setActiveTicketOrder(updated);
                  setOrders((prev) =>
                    prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                  );
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
