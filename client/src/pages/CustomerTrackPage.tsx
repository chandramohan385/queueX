import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderByTokenOrId } from '../services/api';
import type { Order } from '../types';
import { DigitalTicketStub } from '../components/DigitalTicketStub';
import { Search, RefreshCw, AlertCircle, Radio, ArrowLeft } from 'lucide-react';

export const CustomerTrackPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [searchToken, setSearchToken] = useState(routeToken || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(routeToken));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  // Initial load if token is in URL
  useEffect(() => {
    if (routeToken) {
      setSearchToken(routeToken);
      fetchTokenDetails(routeToken);
    }
  }, [routeToken, fetchTokenDetails]);

  // Live Auto-Poll Every 3.5 seconds to track operator updates in real time
  useEffect(() => {
    if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') return;

    const intervalId = setInterval(() => {
      fetchTokenDetails(order.token_number, true);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [order, fetchTokenDetails]);

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
          className="self-start inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Counter Desk</span>
        </button>

        {order && (
          <div className="flex items-center gap-3 self-end text-xs font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-[11px]">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Status Sync</span>
            </span>

            <button
              onClick={() => fetchTokenDetails(order.token_number, true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Manual Search Form if no token or wants to look up another */}
      {(!order || !routeToken) && (
        <div className="max-w-md mx-auto my-8 p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl text-left">
          <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-2">
            Track Token Status
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            Enter your token number (e.g. <span className="font-mono text-sky-400">PX-001</span>) or order ID.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. PX-001"
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono text-white uppercase focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 font-mono font-bold text-xs text-white transition-colors"
            >
              Lookup
            </button>
          </form>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="max-w-md mx-auto my-4 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-3 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs text-zinc-400">Querying QueueX Realtime Engine...</p>
        </div>
      )}

      {/* Flagship Digital Ticket Stub Component */}
      {!loading && order && <DigitalTicketStub order={order} />}

    </div>
  );
};
