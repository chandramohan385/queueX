import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Calendar,
  RefreshCw,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { getOwnerAnalytics, getDailySettlement } from '../services/api';
import type { OwnerAnalyticsData, DailySettlementData } from '../types';
import { printDailySettlementSlip } from '../utils/thermalPrinter';

export const OwnerAnalyticsPage: React.FC = () => {
  // Timeframe filter for overall analytics
  const [range, setRange] = useState<'today' | '7days' | '30days' | '90days' | 'all'>('30days');
  const [analytics, setAnalytics] = useState<OwnerAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Settlement report date & state
  const todayStr = new Date().toISOString().split('T')[0];
  const [settlementDate, setSettlementDate] = useState<string>(todayStr);
  const [settlement, setSettlement] = useState<DailySettlementData | null>(null);
  const [settlementLoading, setSettlementLoading] = useState<boolean>(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Active view section ('analytics' | 'settlement')
  const [activeSection, setActiveSection] = useState<'analytics' | 'settlement'>('analytics');

  // 1. Fetch Analytics Overview
  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await getOwnerAnalytics(range);
      setAnalytics(data);
    } catch (err: any) {
      setAnalyticsError(err.message || 'Failed to load analytics overview');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [range]);

  // 2. Fetch Settlement Data
  const loadSettlement = useCallback(async (date: string) => {
    try {
      setSettlementLoading(true);
      setSettlementError(null);
      const data = await getDailySettlement(date);
      setSettlement(data);
    } catch (err: any) {
      setSettlementError(err.message || 'Failed to load daily settlement');
    } finally {
      setSettlementLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadSettlement(settlementDate);
  }, [settlementDate, loadSettlement]);

  // Download Settlement CSV
  const handleExportCSV = () => {
    if (!settlement) return;

    const rows: string[][] = [
      ['QueueX POS - Daily Counter Settlement Report'],
      ['Settlement Date', settlementDate],
      ['Generated At', new Date().toISOString()],
      [],
      ['SUMMARY METRICS', 'VALUE'],
      ['Token Start', settlement.token_start || 'N/A'],
      ['Token End', settlement.token_end || 'N/A'],
      ['Total Orders', String(settlement.total_orders)],
      ['Completed Orders', String(settlement.completed_orders)],
      ['Cancelled Orders', String(settlement.cancelled_orders)],
      ['Settled Revenue (INR)', Number(settlement.settled_revenue).toFixed(2)],
      ['Pending Due (INR)', Number(settlement.pending_revenue).toFixed(2)],
      ['Gross Total (INR)', (Number(settlement.settled_revenue) + Number(settlement.pending_revenue)).toFixed(2)],
      [],
      ['SERVICE SALES BREAKDOWN', 'CATEGORY', 'UNIT', 'QUANTITY', 'REVENUE (INR)'],
    ];

    if (settlement.services_summary && settlement.services_summary.length > 0) {
      settlement.services_summary.forEach((s) => {
        rows.push([
          `"${s.service_name}"`,
          s.category,
          s.unit,
          String(s.quantity),
          Number(s.revenue).toFixed(2),
        ]);
      });
    } else {
      rows.push(['No service records found for this date', '', '', '0', '0.00']);
    }

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QueueX_Settlement_${settlementDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived peak hour calculation
  const maxHourlyVolume = analytics?.hourly_distribution.reduce((max, h) => Math.max(max, h.order_count), 0) || 1;
  const peakHour = analytics?.hourly_distribution.reduce(
    (prev, curr) => (curr.order_count > (prev?.order_count || 0) ? curr : prev),
    analytics.hourly_distribution[0]
  );

  // Maximum daily revenue calculation for trend bar scaling
  const maxTrendRevenue = analytics?.revenue_trends.reduce((max, t) => Math.max(max, Number(t.revenue)), 0) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8 text-left">
      
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Admin Access Verified</span>
            </span>
            <span className="text-[11px] font-medium text-slate-400">Authenticated Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shop Performance & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time shop financial intelligence, counter rush peaks, top services, and end-of-day audit register.
          </p>
        </div>

        {/* Section View Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveSection('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSection === 'analytics'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overview Intelligence
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('settlement')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSection === 'settlement'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Daily Settlement Center
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              loadAnalytics();
              loadSettlement(settlementDate);
            }}
            disabled={analyticsLoading || settlementLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${analyticsLoading || settlementLoading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. SECTION A: OVERVIEW & INTELLIGENCE */}
      {activeSection === 'analytics' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Timeframe selector toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="text-xs font-bold text-slate-700">Analytics Timeframe:</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days (Default)' },
                  { id: '90days', label: 'Last 90 Days' },
                  { id: 'all', label: 'All-Time' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    range === opt.id
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {analyticsError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{analyticsError}</span>
              </div>
              <button
                type="button"
                onClick={loadAnalytics}
                className="font-bold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {analyticsLoading && !analytics && (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">Aggregating shop revenue intelligence...</p>
            </div>
          )}

          {analytics && (
            <>
              {/* 4 Hero KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {/* 1. Gross Revenue */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Settled Gross Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    ₹{Number(analytics.metrics.total_revenue).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Completed & collected</span>
                  </div>
                </div>

                {/* 2. Total Orders */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Total Orders</span>
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {analytics.metrics.total_orders}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {analytics.metrics.completed_orders} completed • {analytics.metrics.active_orders} in queue
                  </span>
                </div>

                {/* 3. Average Ticket Value */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Avg Ticket Size</span>
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    ₹{Number(analytics.metrics.avg_order_value).toFixed(2)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Per completed customer order
                  </span>
                </div>

                {/* 4. Completion Rate */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider">Order Completion</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                    {analytics.metrics.total_orders > 0
                      ? `${Math.round((analytics.metrics.completed_orders / analytics.metrics.total_orders) * 100)}%`
                      : '100%'}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {analytics.metrics.cancelled_orders} cancellations logged
                  </span>
                </div>
              </div>

              {/* Grid 2 Columns: Peak Hours Distribution & Top Services */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Peak Hours Bar Chart (7 Cols) */}
                <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-600" />
                          <span>Peak Counter Hours (8 AM – 8 PM)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Customer traffic density across the business day
                        </p>
                      </div>

                      {peakHour && peakHour.order_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold self-start sm:self-auto">
                          <span>Peak Rush:</span>
                          <span className="text-amber-800">{peakHour.label} ({peakHour.order_count} jobs)</span>
                        </span>
                      )}
                    </div>

                    {/* Visual Bar Chart */}
                    <div className="pt-4 pb-2">
                      <div className="h-44 sm:h-52 flex items-end justify-between gap-1.5 sm:gap-2 px-1">
                        {analytics.hourly_distribution.map((item) => {
                          const percentage = maxHourlyVolume > 0 ? (item.order_count / maxHourlyVolume) * 100 : 0;
                          const isPeak = peakHour && item.hour === peakHour.hour && item.order_count > 0;

                          return (
                            <div
                              key={item.hour}
                              className="flex-1 flex flex-col items-center h-full justify-end group relative"
                            >
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                                {item.label}: {item.order_count} orders
                              </div>

                              {/* Number on top if > 0 */}
                              {item.order_count > 0 && (
                                <span className="text-[10px] font-bold font-mono text-slate-600 mb-1">
                                  {item.order_count}
                                </span>
                              )}

                              {/* Bar */}
                              <div
                                style={{ height: `${Math.max(percentage, 4)}%` }}
                                className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                                  isPeak
                                    ? 'bg-amber-500 group-hover:bg-amber-400'
                                    : item.order_count > 0
                                    ? 'bg-sky-500 group-hover:bg-sky-400'
                                    : 'bg-slate-100'
                                }`}
                              />

                              {/* Hour Label */}
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-2 -rotate-45 sm:rotate-0 truncate">
                                {item.label.replace(' ', '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>💡 Tip: Allocate extra staff for Xerox machines during your peak rush hour.</span>
                  </div>
                </div>

                {/* Top 8 Performing Services (5 Cols) */}
                <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>Top Services Ranking</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Ranked by gross sales volume</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        {analytics.top_services.length} services
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {analytics.top_services.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-8 text-center">
                          No service item records logged in this timeframe.
                        </p>
                      ) : (
                        analytics.top_services.slice(0, 7).map((srv, idx) => {
                          const totalRev = Number(analytics.metrics.total_revenue) || 1;
                          const revShare = Math.round((Number(srv.total_revenue) / totalRev) * 100);

                          return (
                            <div key={srv.service_id} className="text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate max-w-[200px] sm:max-w-[240px]">
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      idx === 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : idx === 1
                                        ? 'bg-slate-200 text-slate-700'
                                        : idx === 2
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-800 truncate">
                                    {srv.service_name}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-extrabold text-slate-900 font-mono">
                                    ₹{Number(srv.total_revenue).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar representing share */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-sky-500 h-full rounded-full"
                                    style={{ width: `${Math.min(Math.max(revShare, 5), 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {srv.total_quantity} {srv.unit}s ({revShare}%)
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    Calculated from completed customer tickets.
                  </div>
                </div>

              </div>

              {/* Section: Daily Revenue Timeline Trend */}
              {analytics.revenue_trends.length > 0 && (
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span>Daily Revenue & Volume Trend</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Timeline of counter earnings across {analytics.revenue_trends.length} active business days
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Peak Day: ₹{maxTrendRevenue.toFixed(2)}
                    </span>
                  </div>

                  <div className="h-44 sm:h-48 flex items-end gap-2 overflow-x-auto no-scrollbar pb-2">
                    {analytics.revenue_trends.map((item, idx) => {
                      const heightPercent = maxTrendRevenue > 0 ? (Number(item.revenue) / maxTrendRevenue) * 100 : 0;

                      return (
                        <div
                          key={idx}
                          className="min-w-[48px] sm:min-w-[56px] flex-1 flex flex-col items-center h-full justify-end group relative"
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                            {item.formatted_date}: ₹{Number(item.revenue).toFixed(2)} ({item.order_count} orders)
                          </div>

                          <span className="text-[10px] font-bold font-mono text-slate-600 mb-1">
                            ₹{Math.round(Number(item.revenue))}
                          </span>

                          <div
                            style={{ height: `${Math.max(heightPercent, 6)}%` }}
                            className="w-full rounded-t-lg bg-emerald-500 hover:bg-emerald-400 transition-all duration-300"
                          />

                          <span className="text-[10px] text-slate-500 font-medium mt-2 truncate">
                            {item.formatted_date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </>
          )}
        </div>
      )}

      {/* 3. SECTION B: DAILY SETTLEMENT & COUNTER RECONCILIATION */}
      {activeSection === 'settlement' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Settlement Date Selector & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Select Settlement Date:</span>
              </label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              {settlementDate === todayStr && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Today's Register
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={!settlement || settlement.total_orders === 0}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => settlement && printDailySettlementSlip(settlement, settlementDate)}
                disabled={!settlement || settlement.total_orders === 0}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Print 80mm Settlement Sheet</span>
              </button>
            </div>
          </div>

          {/* Settlement Error */}
          {settlementError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{settlementError}</span>
              <button
                type="button"
                onClick={() => loadSettlement(settlementDate)}
                className="font-bold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Settlement Content */}
          {settlementLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Reconciling register for {settlementDate}...</p>
            </div>
          ) : settlement ? (
            <div className="space-y-6">
              
              {/* Daily Totals Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 block mb-1">
                    Settled Cash/UPI
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
                    ₹{Number(settlement.settled_revenue).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    From {settlement.completed_orders} completed jobs
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 block mb-1">
                    Pending Counter Due
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono">
                    ₹{Number(settlement.pending_revenue).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Awaiting customer pickup
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 block mb-1">
                    Token Range (Seq)
                  </span>
                  <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                    {settlement.token_start ? `${settlement.token_start} → ${settlement.token_end}` : 'None'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {settlement.total_orders} total tickets issued
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 block mb-1">
                    Gross Day Value
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
                    ₹{(Number(settlement.settled_revenue) + Number(settlement.pending_revenue)).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Settled + pending revenue
                  </span>
                </div>
              </div>

              {/* Service Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Itemized Service Audit for {settlementDate}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Units sold and net revenue generated per service catalog item
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {settlement.services_summary ? settlement.services_summary.length : 0} services
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Service Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Units Sold</th>
                        <th className="py-3 px-4 text-right">Subtotal Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!settlement.services_summary || settlement.services_summary.length === 0) ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                            No orders recorded for date {settlementDate}.
                          </td>
                        </tr>
                      ) : (
                        settlement.services_summary.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {item.service_name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              {item.quantity} {item.unit}s
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-slate-900 font-mono">
                              ₹{Number(item.revenue).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      )}

    </div>
  );
};
