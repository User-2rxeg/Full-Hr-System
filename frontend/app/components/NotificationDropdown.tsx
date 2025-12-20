'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { notificationsService } from '@/app/services/notifications';
import api from '@/app/services/api';
import Link from 'next/link';

// Simple notification type
interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    time: string;
    apiType?: string;
    actionUrl?: string;
}

export default function NotificationDropdown() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch notifications from backend
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                let userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null;

                // If no ID, try to get from backend
                if (!userId) {
                    try {
                        const authResponse = await api.get<{ _id: string, employeeProfileId: string }>('/employee-profile/me');
                        if (authResponse.data) {
                            const id = authResponse.data.employeeProfileId || authResponse.data._id;
                            if (id) {
                                sessionStorage.setItem('userId', id);
                                userId = id;
                            }
                        }
                    } catch (e) {
                        console.warn('Backend auth failed');
                    }
                }

                // Helper to check if string is valid MongoDB ObjectId
                const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

                // Check if userId is invalid (not a 24-char hex string)
                if (userId && !isValidObjectId(userId)) {
                    console.warn('Invalid User ID detected, clearing and refreshing:', userId);
                    sessionStorage.removeItem('userId');

                    // Force re-fetch from backend
                    try {
                        const authResponse = await api.get<{ _id: string, employeeProfileId: string }>('/employee-profile/me');
                        if (authResponse.data) {
                            const id = authResponse.data.employeeProfileId || authResponse.data._id;
                            if (id) {
                                sessionStorage.setItem('userId', id);
                                userId = id;
                            }
                        }
                    } catch (e) { console.warn('Backend refresh failed'); }
                }

                if (userId && isValidObjectId(userId)) {
                    fetchUserNotifications(userId);
                } else {
                    console.warn('No valid userId found or retrieved, cannot fetch notifications.');
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
                setLoading(false);
            }
        };

        const fetchUserNotifications = async (userId: string) => {
            try {
                let allNotifications: any[] = [];

                // Fetch user notifications
                const userResponse = await notificationsService.getUserNotifications(userId);
                if (userResponse.data && Array.isArray(userResponse.data)) {
                    allNotifications = [...allNotifications, ...userResponse.data];
                }

                // For HR Admin, also fetch system-wide shift expiry notifications
                if (user?.role === 'HR Admin' || user?.role === 'System Admin') {
                    try {
                        const shiftResponse = await notificationsService.getShiftExpiryNotifications();
                        if (shiftResponse.data && Array.isArray(shiftResponse.data)) {
                            allNotifications = [...allNotifications, ...shiftResponse.data];
                        }
                    } catch (err) {
                        console.warn('Failed to fetch shift expiry notifications:', err);
                    }
                }

                if (allNotifications.length > 0) {
                    const convertedNotifications = allNotifications.map((notif: any) => {
                        const apiType = notif.type || '';
                        let type: 'info' | 'success' | 'warning' | 'error' = 'info';
                        let title = 'Notification';
                        let actionUrl: string | undefined;

                        if (apiType.includes('SHIFT_EXPIRY')) {
                            type = 'warning';
                            title = 'Shift Expiry Alert';
                            actionUrl = '/dashboard/system-admin/time-management/ShiftAssignments';
                        } else if (apiType.includes('SHIFT_')) {
                            type = 'warning';
                            title = 'Shift Assignment Update';
                            actionUrl = '/portal/my-notifications';
                        } else if (apiType.includes('LEAVE_')) {
                            type = apiType.includes('APPROVED') ? 'success' : apiType.includes('REJECTED') ? 'error' : 'info';
                            title = 'Leave Request Update';
                            actionUrl = '/portal/my-notifications';
                        } else if (apiType.includes('PAYROLL_')) {
                            type = 'info';
                            title = 'Payroll Update';
                            actionUrl = '/portal/my-payslips';
                        }

                        const createdAt = new Date(notif.createdAt || new Date());
                        const now = new Date();
                        const diffMs = now.getTime() - createdAt.getTime();
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        let timeStr = 'just now';
                        if (diffMins > 0) timeStr = `${diffMins} min ago`;
                        if (diffHours > 0) timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                        if (diffDays > 0) timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

                        return {
                            _id: notif._id,
                            title,
                            message: notif.message || '',
                            type,
                            read: notif.read || false,
                            time: timeStr,
                            apiType,
                            actionUrl,
                        };
                    });

                    // Sort by most recent first and limit to 10
                    setNotifications(convertedNotifications.sort((a, b) => {
                        const aDate = new Date(a.time).getTime();
                        const bDate = new Date(b.time).getTime();
                        return bDate - aDate;
                    }).slice(0, 10));
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user notifications:', error);
                setLoading(false);
            }
        };

        fetchNotifications();

        // Refresh notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    };

    const markAllNotificationsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'error':
                return (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllNotificationsRead}
                                className="text-sm text-blue-600 hover:text-blue-700"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => markNotificationRead(notification._id)}
                                    className={`px-4 py-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        {getNotificationIcon(notification.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-slate-800`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-slate-500 truncate">{notification.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : loading ? (
                            <div className="px-4 py-8 text-center">
                                <p className="text-sm text-slate-500">Loading notifications...</p>
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <p className="mt-2 text-sm text-slate-500">No notifications</p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
                        <Link
                            href="/portal/my-notifications"
                            className="w-full text-sm text-center text-blue-600 hover:text-blue-700 py-1 block"
                            onClick={() => setIsOpen(false)}
                        >
                            View all notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}