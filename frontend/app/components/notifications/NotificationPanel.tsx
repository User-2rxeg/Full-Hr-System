'use client';

import { useEffect, useRef } from 'react';
import { RecruitmentNotification } from '@/app/types/recruitment';
import NotificationItem from './NotificationItem';

// =====================================================
// Types
// =====================================================

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: RecruitmentNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: RecruitmentNotification) => void;
  isLoading?: boolean;
}

// =====================================================
// Empty State Component
// =====================================================

function EmptyNotifications() {
  return (
    <div className="px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-slate-900 mb-1">No notifications</h3>
      <p className="text-sm text-slate-500">
        You&apos;re all caught up! Check back later for updates.
      </p>
    </div>
  );
}

// =====================================================
// Loading State Component
// =====================================================

function LoadingNotifications() {
  return (
    <div className="px-4 py-6 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// NotificationPanel Component
// =====================================================

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
  isLoading = false,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Check if click was on the bell button (handled by parent)
        const target = event.target as HTMLElement;
        if (target.closest('[data-notification-bell]')) {
          return;
        }
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed md:absolute right-0 top-0 md:top-full mt-0 md:mt-2
          w-full md:w-96 h-full md:h-auto md:max-h-[calc(100vh-100px)]
          bg-white md:rounded-xl shadow-lg border-0 md:border border-slate-200
          z-50 flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors md:hidden"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingNotifications />
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onClick={onNotificationClick}
                />
              ))}
            </div>
          ) : (
            <EmptyNotifications />
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <button className="w-full text-sm text-center text-blue-600 hover:text-blue-700 font-medium py-1 transition-colors">
              View all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
}
