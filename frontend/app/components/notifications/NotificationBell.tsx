'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecruitmentNotification } from '@/app/types/recruitment';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/services/recruitment';
import NotificationPanel from './NotificationPanel';

// =====================================================
// Types
// =====================================================

interface NotificationBellProps {
  /**
   * Polling interval in milliseconds for checking new notifications
   * Set to 0 to disable polling
   * @default 30000 (30 seconds)
   */
  pollingInterval?: number;
  /**
   * Callback when a notification is clicked
   */
  onNotificationClick?: (notification: RecruitmentNotification) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// =====================================================
// NotificationBell Component
// =====================================================

export default function NotificationBell({
  pollingInterval = 30000,
  onNotificationClick,
  className = '',
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<RecruitmentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getNotifications();
      // Service now returns data directly or throws error
      setNotifications(response);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Keep existing notifications on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling for new notifications
  // TODO: Replace with WebSocket/SSE when backend supports real-time updates
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchNotifications();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, fetchNotifications]);

  // Mark single notification as read
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: RecruitmentNotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    // Optionally close panel after click
    // setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        data-notification-bell
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${isOpen 
            ? 'bg-slate-100 text-slate-700' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700'
          }
        `}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {/* Bell Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Pulse animation for new notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onNotificationClick={handleNotificationClick}
        isLoading={isLoading}
      />
    </div>
  );
}
