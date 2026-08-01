/**
 * Notifications — Toast notification system
 * 
 * Brand colors:
 * - Success: Emerald #10B981
 * - Error:   Danger #EF4444
 * - Info:    Iris   #6366F1
 */

import React, { useCallback, useState } from 'react';
import { XIcon } from './Icons';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<string, string> = {
  success: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/20 border border-red-500/30 text-red-300',
  info: 'bg-iris-500/20 border border-iris-500/30 text-iris-300',
};

export const Notifications: React.FC<NotificationsProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`notification-enter px-4 py-3 rounded-lg shadow-lg text-sm backdrop-blur-sm flex items-start gap-2 ${typeStyles[n.type] || typeStyles.info}`}
        >
          <span className="flex-1">{n.message}</span>
          <button
            onClick={() => onDismiss(n.id)}
            className="p-0.5 rounded hover:bg-black/10 transition-colors flex-shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook để quản lý notifications state
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
  };
}

export default Notifications;
