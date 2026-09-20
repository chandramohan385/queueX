import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderByTokenOrId } from '../services/api';
import type { Order } from '../types';
import { DigitalTicketStub } from '../components/DigitalTicketStub';
import { useOrderStream } from '../hooks/useOrderStream';
import { Search, RefreshCw, AlertCircle, Radio, ArrowLeft, Zap } from 'lucide-react';

export const CustomerTrackPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [searchToken, setSearchToken] = useState(routeToken || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(routeToken));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Initial Data Fetch
  const fetchTokenDetails = useCallback(
    async (tokenToFetch: string, silent = false) => {
      if (!tokenToFetch.trim()) return;
      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError(null);

        const data = await getOrderByTokenOrId(tokenToFetch.trim());
        setOrder(data);
      } catch (err: any) {
        setError(err.message || 'Token not found. Please verify your token number.');
        if (!silent) setOrder(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (routeToken) {
      setSearchToken(routeToken);
      fetchTokenDetails(routeToken);
    }
  }, [routeToken, fetchTokenDetails]);

  // 2. Real-Time Server-Sent Events (SSE) Stream — Zero Client Polling!
  const { isConnected, liveOrderUpdate } = useOrderStream(order?.token_number);

  useEffect(() => {
    if (liveOrderUpdate && order && (liveOrderUpdate.id === order.id || liveOrderUpdate.token_number === order.token_number)) {
      setOrder((prev) => (prev ? { ...prev, ...liveOrderUpdate } : null));
    }
  }, [liveOrderUpdate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchToken.trim()) return;
    navigate(`/track/${searchToken.trim().toUpperCase()}`);
    fetchTokenDetails(searchToken.trim().toUpperCase());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Top Search Bar & Telemetry Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Counter Desk</span>
        </button>

        {order && (
          <div className="flex items-center gap-3 self-end text-xs text-slate-600">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Real-Time SSE Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
                <span>Connecting Telemetry...</span>
              </span>
            )}

            <button
              onClick={() => fetchTokenDetails(order.token_number, true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
              title="Manual status sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Manual Search Form if no token or wants to look up another */}
      {(!order || !routeToken) && (
        <div className="max-w-md mx-auto my-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-xl text-left">
          <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2">
            Track Token Status
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Enter your token number (e.g. <span className="font-mono text-sky-600 font-bold">PX-001</span>) or order ID.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. PX-001"
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white transition-colors shadow-xs"
            >
              Lookup
            </button>
          </form>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="max-w-md mx-auto my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Querying QueueX Realtime Engine...</p>
        </div>
      )}

      {/* Flagship Digital Ticket Stub Component */}
      {!loading && order && <DigitalTicketStub order={order} />}

    </div>
  );
};
