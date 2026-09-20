import { useState, useEffect } from 'react';
import type { Order } from '../types';

interface UseOrderStreamResult {
  isConnected: boolean;
  liveOrderUpdate: Order | null;
  lastPing: Date | null;
}

/**
 * Custom React Hook that establishes a live Server-Sent Events (SSE) stream
 * for a specific customer order token or ID.
 * Automatically handles reconnection and cleans up the EventSource on unmount.
 */
export function useOrderStream(tokenOrId: string | null | undefined): UseOrderStreamResult {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [liveOrderUpdate, setLiveOrderUpdate] = useState<Order | null>(null);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  useEffect(() => {
    if (!tokenOrId) {
      setIsConnected(false);
      return;
    }

    const sseUrl = `/api/events/orders/${encodeURIComponent(tokenOrId)}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('CONNECTED', () => {
      setIsConnected(true);
      setLastPing(new Date());
    });

    eventSource.addEventListener('STATUS_CHANGED', (event) => {
      try {
        const updated = JSON.parse(event.data);
        setLiveOrderUpdate(updated);
        setLastPing(new Date());
      } catch (err) {
        console.error('Failed to parse SSE STATUS_CHANGED payload:', err);
      }
    });

    eventSource.onopen = () => {
      setIsConnected(true);
      setLastPing(new Date());
    };

    eventSource.onerror = () => {
      // EventSource automatically enters reconnection state
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [tokenOrId]);

  return { isConnected, liveOrderUpdate, lastPing };
}
