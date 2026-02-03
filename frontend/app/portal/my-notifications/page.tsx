'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { notificationsService } from '@/app/services/notifications';
import {
  PortalPageHeader,
  PortalCard,
  PortalLoading,
  PortalBadge,
  PortalButton,
  PortalTabs,
  PortalEmptyState,
  PortalErrorState,
  PortalSelect,
} from '@/components/portal';
import { Bell, CheckCircle, BellOff, Clock, ShieldCheck, CreditCard, User, Briefcase, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
interface Notification {
    _id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'action';
    category: 'leave' | 'attendance' | 'payroll' | 'performance' | 'onboarding' | 'offboarding' | 'profile' | 'system' | 'shift';
    title: string;
    message: string;
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    createdAt: string;
    apiNotificationType?: string;
}
const convertApiNotificationToUI = (apiNotif: any): Notification => {
    const apiType = apiNotif.type || '';
    let category: Notification['category'] = 'system';
    let type: Notification['type'] = 'info';
    let title = 'Notification';
    let actionUrl: string | undefined;
    let actionLabel: string | undefined;
    if (apiType.includes('LATENESS_THRESHOLD') || apiType.includes('REPEATED_LATENESS') || apiType === 'EMPLOYEE_LATENESS_THRESHOLD') {
        category = 'attendance';
        type = 'warning';
        title = 'Lateness Alert';
        actionUrl = '/portal/my-attendance';
        actionLabel = 'View Attendance';
    } else if (apiType === 'LATE') {
        category = 'attendance';
        type = 'warning';
        title = 'Late Arrival';
        actionUrl = '/portal/my-attendance';
        actionLabel = 'View Attendance';
    } else if (apiType === 'MISSED_PUNCH') {
        category = 'attendance';
        type = 'warning';
        title = 'Missed Punch Alert';
        actionUrl = '/portal/my-attendance';
        actionLabel = 'View Attendance';
    } else if (apiType.includes('SHIFT_')) {
        category = 'shift';
        if (apiType.includes('EXPIRED')) {
            type = 'error';
            title = 'Shift Assignment Expired';
        } else if (apiType.includes('EXPIRING') || apiType.includes('NEARING')) {
            type = 'warning';
            title = 'Shift Assignment Expiring Soon';
        } else if (apiType.includes('ASSIGNED')) {
            type = 'info';
            title = 'Shift Assignment Created';
        } else if (apiType.includes('STATUS_UPDATED')) {
            type = 'info';
            title = 'Shift Assignment Status Updated';
        } else {
            type = 'warning';
            title = 'Shift Assignment Update';
        }
        actionUrl = '/portal/my-schedule';
        actionLabel = 'View Schedule';
    } else if (apiType.includes('LEAVE_')) {
        category = 'leave';
        if (apiType.includes('APPROVED')) type = 'success';
        else if (apiType.includes('REJECTED')) type = 'error';
        else type = 'action';
        title = apiType.replace('LEAVE_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
        actionUrl = '/portal/my-leaves';
        actionLabel = 'View Leaves';
    } else if (apiType.includes('PAYROLL_')) {
        category = 'payroll';
        type = 'info';
        title = 'Payroll Update';
        actionUrl = '/portal/payroll-tracking/payslips';
        actionLabel = 'View Payslips';
    } else if (apiType.includes('ATTENDANCE_')) {
        category = 'attendance';
        type = 'warning';
        title = 'Attendance Alert';
        actionUrl = '/portal/my-attendance';
        actionLabel = 'View Attendance';
    } else if (apiType.includes('PERFORMANCE_')) {
        category = 'performance';
        type = 'info';
        title = 'Performance Update';
        actionUrl = '/portal/my-performance';
        actionLabel = 'View Performance';
    } else if (apiType) {
        title = apiType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
    return {
        _id: apiNotif._id || Math.random().toString(),
        type,
        category,
        title,
        message: apiNotif.message || '',
        read: apiNotif.read || false,
        actionUrl,
        actionLabel,
        createdAt: apiNotif.createdAt || new Date().toISOString(),
        apiNotificationType: apiType,
    };
};
export default function MyNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            let userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null;
            const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
            if (!userId || !isValidObjectId(userId)) {
                try {
                    const authRes = await fetch('/api/auth/me');
                    if (authRes.ok) {
                        const json = await authRes.json();
                        userId = json.data?.employeeProfileId || json.data?._id;
                        if (userId) sessionStorage.setItem('userId', userId);
                    }
                } catch (e) {
                    console.error('Auth check fail:', e);
                }
            }
            if (!userId) {
                setLoading(false);
                return;
            }
            const response = await notificationsService.getUserNotifications(userId);
            if (response.data && Array.isArray(response.data)) {
                setNotifications(response.data.map(convertApiNotificationToUI));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sync notifications');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchNotifications();
    }, []);
    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const statusMatch = activeTab === 'all' || (activeTab === 'unread' && !n.read);
            const categoryMatch = categoryFilter === 'all' || n.category === categoryFilter;
            return statusMatch && categoryMatch;
        });
    }, [notifications, activeTab, categoryFilter]);
    const markAsRead = async (id: string) => {
        try {
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            await notificationsService.markAsRead(id);
        } catch (e) {
            console.error('Failed to mark read', e);
        }
    };

    const markAllRead = async () => {
        try {
            let userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null;
            if (!userId) return;
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            await notificationsService.markAllAsRead(userId);
        } catch (e) {
            console.error('Failed mark all read', e);
        }
    };

    const getCategoryIcon = (cat: Notification['category']) => {
        switch (cat) {
            case 'leave': return <Calendar className="w-4 h-4" />;
            case 'attendance': return <Clock className="w-4 h-4" />;
            case 'payroll': return <CreditCard className="w-4 h-4" />;
            case 'performance': return <TrendingUp className="w-4 h-4" />;
            case 'shift': return <Briefcase className="w-4 h-4" />;
            case 'profile': return <User className="w-4 h-4" />;
            default: return <Bell className="w-4 h-4" />;
        }
    };
    const getStatusVariant = (type: Notification['type']): 'success' | 'warning' | 'destructive' | 'default' => {
        switch (type) {
            case 'success': return 'success';
            case 'warning': return 'warning';
            case 'error': return 'destructive';
            default: return 'default';
        }
    };
    if (loading) return <PortalLoading message="Syncing alerts..." fullScreen />;
    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <PortalPageHeader
                    title="Alerts المركز التنبيهات"
                    description="Stay updated with system events and workflow requests"
                    breadcrumbs={[{ label: 'Alerts' }]}
                    actions={
                        <PortalButton variant="outline" size="sm" onClick={markAllRead} icon={<CheckCircle className="w-4 h-4" />}>
                            Mark all read
                        </PortalButton>
                    }
                />
                {error && <PortalErrorState message={error} onRetry={fetchNotifications} />}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/20 p-2 rounded-2xl border border-border/50">
                    <PortalTabs
                        tabs={[
                            { id: 'all', label: 'All Activity' },
                            { id: 'unread', label: 'Unread', badge: notifications.filter(n => !n.read).length }
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                    <div className="min-w-[180px]">
                        <PortalSelect
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            options={[
                                { label: 'All Categories', value: 'all' },
                                { label: 'Payroll', value: 'payroll' },
                                { label: 'Time & attendance', value: 'attendance' },
                                { label: 'Leaves', value: 'leave' },
                                { label: 'Shifts', value: 'shift' },
                                { label: 'Performance', value: 'performance' },
                            ]}
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    {filteredNotifications.length > 0 ? filteredNotifications.map((notif) => (
                        <PortalCard
                            key={notif._id}
                            hover
                            padding="none"
                            className={`group border-l-4 transition-all ${
                                notif.read ? 'border-l-transparent bg-background/50 opacity-80' : 'border-l-primary bg-background shadow-md'
                            }`}
                            onClick={() => !notif.read && markAsRead(notif._id)}
                        >
                            <div className="p-5 flex gap-5 items-start">
                                <div className={`p-3 rounded-2xl shrink-0 ${
                                    notif.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary shadow-inner'
                                }`}>
                                    {getCategoryIcon(notif.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className={`font-bold transition-colors ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {notif.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] font-black uppercase opacity-40 mb-2">
                                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary ml-auto pulse"></div>}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <PortalBadge variant={getStatusVariant(notif.type)} size="sm">{notif.category.toUpperCase()}</PortalBadge>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                                {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        {notif.actionUrl && (
                                            <Link href={notif.actionUrl} onClick={(e) => e.stopPropagation()}>
                                                <PortalButton variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                                                    {notif.actionLabel || 'Interact'}
                                                    <ChevronRight className="w-3 h-3 ml-1" />
                                                </PortalButton>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </PortalCard>
                    )) : (
                        <PortalEmptyState
                            icon={activeTab === 'unread' ? <ShieldCheck className="w-16 h-16 opacity-10" /> : <BellOff className="w-16 h-16 opacity-10" />}
                            title={activeTab === 'unread' ? 'Clean Slate Inbox' : 'No Activity Found'}
                            description="You're all caught up with your latest system alerts."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
