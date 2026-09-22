import { useState, useEffect, useCallback } from 'react';
import { playOrderReadyChime } from '../utils/notificationSound';

export interface UseWebNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  notifyOrderReady: (tokenNumber: string, customerName?: string) => void;
}

export function useWebNotifications(): UseWebNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  const notifyOrderReady = useCallback(
    (tokenNumber: string, customerName?: string) => {
      // 1. Play audio chime
      playOrderReadyChime();

      // 2. Trigger haptic vibration on supported devices (Android / Mobile)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          // ignore if vibration fails or blocked
        }
      }

      // 3. Trigger Web Notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const title = `Token #${tokenNumber} is Ready for Pickup!`;
          const body = customerName
            ? `Hi ${customerName}, your printing job is ready. Please visit the counter.`
            : `Your printing job is ready. Please visit the counter to collect your order.`;

          new Notification(title, {
            body,
            icon: '/vite.svg',
            badge: '/vite.svg',
            tag: `token-ready-${tokenNumber}`,
            requireInteraction: true,
          });
        } catch (err) {
          console.warn('Could not display notification:', err);
        }
      }
    },
    []
  );

  return {
    isSupported,
    permission,
    requestPermission,
    notifyOrderReady,
  };
}
