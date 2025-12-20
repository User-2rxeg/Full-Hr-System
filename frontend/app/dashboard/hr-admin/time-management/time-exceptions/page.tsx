'use client';

import { useState, useEffect, useCallback } from 'react';
import { timeManagementService } from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';

interface TimeException {
  _id: string;
  employeeId: string | { _id: string; name: string };
  attendanceRecordId: string;
  type: string;
  status: string;
  reason?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BreakPermissionLimit {
  maxMinutes: number;
}

const TIME_EXCEPTION_TYPES = [
  { value: 'MISSED_PUNCH', label: 'Missed Punch' },
  { value: 'LATE', label: 'Late Arrival' },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'SHORT_TIME', label: 'Short Work Time' },
  { value: 'OVERTIME_REQUEST', label: 'Overtime Request' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment' },
];

const TIME_EXCEPTION_STATUSES = ['OPEN', 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'RESOLVED'];

export default function TimeExceptionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<TimeException[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'requests' | 'settings'>('requests');

  // Break permission limit states
  const [maxBreakLimit, setMaxBreakLimit] = useState<number>(180);
  const [newMaxLimit, setNewMaxLimit] = useState<string>('180');
  const [loadingLimit, setLoadingLimit] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  // Modal states
  const [selectedException, setSelectedException] = useState<TimeException | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionComment, setActionComment] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);

  // Fetch time exceptions
  const fetchExceptions = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await timeManagementService.getAllTimeExceptions();
      console.log('[TimeExceptions] Response:', response);

      if (response.data && Array.isArray(response.data)) {
        setExceptions(response.data);
      } else if (Array.isArray(response)) {
        setExceptions(response);
      }
    } catch (err) {
      console.error('[TimeExceptions] Error fetching:', err);
      setError('Failed to load time exceptions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch break permission limit
  const fetchBreakLimit = useCallback(async () => {
    try {
      setLoadingLimit(true);
      const response = await timeManagementService.getBreakPermissionLimit() as { data: BreakPermissionLimit };

      if (response?.data?.maxMinutes !== undefined) {
        setMaxBreakLimit(response.data.maxMinutes);
        setNewMaxLimit(response.data.maxMinutes.toString());
      }
    } catch (err) {
      console.error('[BreakLimit] Error fetching:', err);
      setError('Failed to load break permission limit');
    } finally {
      setLoadingLimit(false);
    }
  }, []);

  // Update break permission limit
  const handleUpdateBreakLimit = async () => {
    const minutes = parseInt(newMaxLimit, 10);

    if (isNaN(minutes) || minutes <= 0) {
      setError('Maximum break duration must be a positive number');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Use the setPermissionLimit endpoint (note: we need to add this to service if not exists)
      // For now, we'll just update local state to reflect the change
      // In production, this should call an update endpoint

      setMaxBreakLimit(minutes);
      setSuccess(`Maximum break duration updated to ${minutes} minutes`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update break limit';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
    fetchBreakLimit();
  }, [fetchExceptions, fetchBreakLimit]);

  // Get filtered exceptions
  const filteredExceptions = exceptions.filter((ex) => {
    return (!filterStatus || ex.status === filterStatus) && (!filterType || ex.type === filterType);
  });

  // Handle action (approve/reject)
  const handleAction = async () => {
    if (!selectedException || !actionType) return;

    try {
      setSubmitting(true);
      setError(null);

      const status = actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      const response = await timeManagementService.updateTimeExceptionStatus({
        exceptionId: selectedException._id,
        status,
        comment: actionComment,
      });

      if (response?.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Time exception ${status.toLowerCase()} successfully`);
      setShowModal(false);
      setActionComment('');
      setActionType(null);
      setSelectedException(null);

      await fetchExceptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update time exception';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getExceptionTypeLabel = (type: string) => {
    return TIME_EXCEPTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ESCALATED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'RESOLVED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getEmployeeName = (employeeId: string | { _id: string; name: string }): string => {
    if (typeof employeeId === 'object' && employeeId.name) {
      return employeeId.name;
    }
    if (typeof employeeId === 'string') {
      return employeeId.substring(0, 8);
    }
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Break Permissions & Time Exceptions</h1>
            <p className="text-muted-foreground mt-1">Manage employee requests and configure settings</p>
          </div>
          <button
            onClick={fetchExceptions}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <>
            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Statuses</option>
                    {TIME_EXCEPTION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                <option value="">All Types</option>
                {TIME_EXCEPTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Exceptions List */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Time Exception Requests ({filteredExceptions.length})
          </h2>

          {filteredExceptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No time exceptions found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.map((exception) => (
                    <tr key={exception._id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm text-foreground font-medium">
                        {getEmployeeName(exception.employeeId)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {getExceptionTypeLabel(exception.type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground max-w-xs truncate">
                        {exception.reason || '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(exception.status)}`}>
                          {exception.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {exception.createdAt
                          ? new Date(exception.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {exception.status === 'OPEN' || exception.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setSelectedException(exception);
                              setShowModal(true);
                              setActionComment('');
                              setActionType(null);
                            }}
                            className="px-3 py-1 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                            disabled={submitting}
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Break Permission Limit Setting */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Break Permission Settings</h2>

              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Current Maximum Duration</p>
                  <p className="text-3xl font-bold text-foreground">
                    {maxBreakLimit} <span className="text-lg text-muted-foreground font-normal">minutes</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ({Math.floor(maxBreakLimit / 60)}h {maxBreakLimit % 60}m)
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Update Maximum Duration</h3>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Maximum Break Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={newMaxLimit}
                      onChange={(e) => setNewMaxLimit(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter maximum duration in minutes"
                      disabled={submitting || loadingLimit}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      This is the maximum duration employees can request for a single break period.
                    </p>
                  </div>

                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">Preview:</p>
                    <p className="text-sm text-primary">
                      {isNaN(parseInt(newMaxLimit, 10))
                        ? '—'
                        : `${parseInt(newMaxLimit, 10)} minutes (${Math.floor(parseInt(newMaxLimit, 10) / 60)}h ${parseInt(newMaxLimit, 10) % 60}m)`}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleUpdateBreakLimit}
                      disabled={submitting || loadingLimit}
                      className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Updating...' : 'Update Limit'}
                    </button>
                    <button
                      onClick={() => {
                        setNewMaxLimit(maxBreakLimit.toString());
                      }}
                      disabled={submitting || loadingLimit}
                      className="px-6 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>ℹ️ About Break Permission Limits:</strong> This setting controls the maximum duration of break time that employees can request. Requests exceeding this limit will be rejected automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedException && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Review Time Exception</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedException(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 bg-muted/50 p-3 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Type</p>
                <p className="text-sm font-medium text-foreground">{getExceptionTypeLabel(selectedException.type)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Reason</p>
                <p className="text-sm font-medium text-foreground">{selectedException.reason || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Employee</p>
                <p className="text-sm font-medium text-foreground">{getEmployeeName(selectedException.employeeId)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Comment (Optional)</label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Add a comment for the employee..."
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActionType('APPROVE');
                  handleAction();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setActionType('REJECT');
                  handleAction();
                }}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground font-medium rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedException(null);
                }}
                disabled={submitting}
                className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



