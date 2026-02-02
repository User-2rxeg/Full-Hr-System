import apiService from '../api';

export interface Notification {
  _id: string;
  to: string;
  type: string;
  message: string;
  read?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Notification types for leave-related notifications
export const LEAVE_NOTIFICATION_TYPES = {
  LEAVE_SUBMITTED: 'N-050',      // Leave request submitted
  LEAVE_STATUS_CHANGE: 'N-051', // Leave approved/rejected/cancelled
  MANAGER_LEAVE_REQUEST: 'N-052', // Manager needs to review
  LEAVE_FINALIZED: 'N-053',     // Leave finalized by HR
  OVERDUE_APPROVAL: 'N-054',    // Overdue approval escalation
  BALANCE_ADJUSTED: 'N-055',    // Balance adjustment
};

export const notificationsService = {
  // Get all notifications (admin only)
  getAllNotifications: async (type?: string) => {
    const query = type ? `?type=${type}` : '';
    return apiService.get<Notification[]>(`/notifications${query}`);
  },

  // Get notifications for a specific user
  getUserNotifications: async (userId: string) => {
    return apiService.get<Notification[]>(`/notifications/user/${userId}`);
  },

  // Get shift expiry notifications (for HR admin dashboard)
  getShiftExpiryNotifications: async () => {
    return apiService.get<Notification[]>(`/notifications?type=SHIFT_EXPIRY`);
  },

  // Get leave-related notifications for a user
  getLeaveNotifications: async (userId: string) => {
    const response = await apiService.get<Notification[]>(`/notifications/user/${userId}`);
    if (response.error || !response.data) {
      return { ...response, data: [] };
    }

    // Filter for leave-related notification types
    const leaveTypes = Object.values(LEAVE_NOTIFICATION_TYPES);
    const leaveNotifications = response.data.filter((n) => leaveTypes.includes(n.type));

    return { ...response, data: leaveNotifications };
  },

  // Delete a notification
  deleteNotification: async (notificationId: string) => {
    return apiService.delete(`/notifications/${notificationId}`);
  },

  // Clear all notifications for a user
  clearUserNotifications: async (userId: string) => {
    return apiService.delete(`/notifications/user/${userId}/clear`);
  },

  // Mark notification as read
  markAsRead: async (notificationId: string) => {
    return apiService.patch(`/notifications/${notificationId}/read`, {});
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId: string) => {
    return apiService.patch(`/notifications/user/${userId}/read-all`, {});
  },

  // Parse notification message to extract leave details
  parseLeaveNotification: (notification: Notification): {
    action: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'modified' | 'balance_adjusted' | 'other';
    leaveType?: string;
    dateFrom?: string;
    dateTo?: string;
    reason?: string;
  } => {
    const message = notification.message || '';

    // Determine action based on message content
    let action: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'modified' | 'balance_adjusted' | 'other' = 'other';

    if (message.includes('submitted')) {
      action = 'submitted';
    } else if (message.includes('approved')) {
      action = 'approved';
    } else if (message.includes('rejected')) {
      action = 'rejected';
    } else if (message.includes('cancelled')) {
      action = 'cancelled';
    } else if (message.includes('modified') || message.includes('returned')) {
      action = 'modified';
    } else if (message.includes('added to') || message.includes('deducted from')) {
      action = 'balance_adjusted';
    }

    // Extract dates (format: YYYY-MM-DD)
    const dateMatch = message.match(/from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/);
    const dateFrom = dateMatch?.[1];
    const dateTo = dateMatch?.[2];

    // Extract leave type (e.g., "Annual leave", "Sick leave")
    const leaveTypeMatch = message.match(/Your (\w+(?:\s+\w+)?)\s+leave/i);
    const leaveType = leaveTypeMatch?.[1];

    // Extract reason if present
    const reasonMatch = message.match(/Reason:\s*(.+)/);
    const reason = reasonMatch?.[1];

    return { action, leaveType, dateFrom, dateTo, reason };
  },

  // Get notification icon and color based on type
  getNotificationStyle: (notification: Notification): {
    icon: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  } => {
    const parsed = notificationsService.parseLeaveNotification(notification);

    switch (parsed.action) {
      case 'approved':
        return {
          icon: '✓',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
        };
      case 'rejected':
        return {
          icon: '✗',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
        };
      case 'cancelled':
        return {
          icon: '○',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
        };
      case 'submitted':
        return {
          icon: '📝',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
        };
      case 'modified':
        return {
          icon: '↩',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
        };
      case 'balance_adjusted':
        return {
          icon: '⚖',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
        };
      default:
        return {
          icon: 'ℹ',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
        };
    }
  },
};

export default notificationsService;

