'use client';

import { useState, useEffect } from 'react';
import { timeManagementService, ShiftAssignment, ShiftAssignmentStatus, Shift } from '@/app/services/time-management';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface LeaveEntitlement {
  _id: string;
  employeeId: string;
  leaveTypeId: {
    _id: string;
    name: string;
  };
  yearlyEntitlement: number;
  accruedActual: number;
  accruedRounded: number;
  carryForward: number;
  taken: number;
  pending: number;
  remaining: number;
  lastAccrualDate?: string;
  nextResetDate?: string;
}

export default function MySchedulePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftsMap, setShiftsMap] = useState<{ [key: string]: any }>({});
  const [leaveEntitlements, setLeaveEntitlements] = useState<LeaveEntitlement[]>([]);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'vacation'>('schedule');

  useEffect(() => {
    const fetchShiftAssignments = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch shift assignments for current employee
        const response = await timeManagementService.getAssignmentsForEmployee(user.id);
        console.log('[MySchedule] Shift Assignments Response:', response);

        if (response.data && Array.isArray(response.data)) {
          setShiftAssignments(response.data);

          // Try to fetch shift details for each assignment
          try {
            const allShifts = await timeManagementService.getShifts();
            if (allShifts.data && Array.isArray(allShifts.data)) {
              const shiftsDict: { [key: string]: any } = {};
              allShifts.data.forEach((shift: any) => {
                shiftsDict[shift._id] = shift;
              });
              setShiftsMap(shiftsDict);
            }
          } catch (shiftErr) {
            console.warn('[MySchedule] Failed to fetch shift details:', shiftErr);
          }
        }

        // Fetch leave entitlements
        try {
          setLoadingEntitlements(true);
          const entitlementsResponse = await leavesService.getEntitlements(user.id);
          console.log('[MySchedule] Leave Entitlements Response:', entitlementsResponse);

          if (entitlementsResponse.data && Array.isArray(entitlementsResponse.data)) {
            setLeaveEntitlements(entitlementsResponse.data);
          }
        } catch (entitlementErr) {
          console.warn('[MySchedule] Failed to fetch leave entitlements:', entitlementErr);
        } finally {
          setLoadingEntitlements(false);
        }
      } catch (err) {
        console.error('[MySchedule] Error fetching assignments:', err);
        setError('Failed to load your schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchShiftAssignments();
  }, [user?.id]);

  const getStatusColor = (status: ShiftAssignmentStatus) => {
    switch (status) {
      case ShiftAssignmentStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case ShiftAssignmentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case ShiftAssignmentStatus.CANCELLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case ShiftAssignmentStatus.EXPIRED:
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    }
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const isExpiring = (endDate: string | undefined) => {
    if (!endDate) return false;
    const today = new Date();
    const expireDate = new Date(endDate);
    const daysUntilExpire = Math.ceil((expireDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpire <= 7 && daysUntilExpire > 0;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="bg-card rounded-xl shadow-sm p-6 h-40"></div>
            <div className="bg-card rounded-xl shadow-sm p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground mt-1">View your work schedule and shift assignments</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('vacation')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'vacation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Vacation Packages
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <>
            {shiftAssignments.length === 0 ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
                <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground">No Shift Assignments</h3>
                <p className="text-muted-foreground mt-2">You don't have any shift assignments yet.</p>
                <p className="text-sm text-muted-foreground mt-4">Contact your HR department if you believe this is incorrect.</p>
              </div>
        ) : (
          <div className="space-y-4">
            {/* Expiring Soon Warning */}
            {shiftAssignments.some(a => isExpiring(a.endDate)) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ Some of your shift assignments are expiring soon. Please contact HR to renew them.
                </p>
              </div>
            )}

            {/* Shift Assignments List */}
            {shiftAssignments.map((assignment) => {
              const shift = shiftsMap[assignment.shiftId];
              const isExpiringSoon = isExpiring(assignment.endDate);

              return (
                <div
                  key={assignment._id}
                  className={`bg-card rounded-xl shadow-sm border ${isExpiringSoon ? 'border-yellow-300 dark:border-yellow-700' : 'border-border'} p-6 hover:shadow-md transition-shadow`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Shift Information */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {typeof assignment.shiftId === 'string' ? shift?.name || 'Shift' : assignment.shiftId}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                          {assignment.status}
                        </span>
                        {isExpiringSoon && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                            Expiring Soon
                          </span>
                        )}
                      </div>

                      {/* Shift Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</p>
                          <p className="text-sm font-medium text-foreground mt-1">{formatDate(assignment.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">End Date</p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {assignment.endDate ? formatDate(assignment.endDate) : 'Ongoing'}
                          </p>
                        </div>
                        {shift && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Time</p>
                              <p className="text-sm font-medium text-foreground mt-1">{formatTime(shift.startTime)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">End Time</p>
                              <p className="text-sm font-medium text-foreground mt-1">{formatTime(shift.endTime)}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Additional Details */}
                      {shift && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Punch Policy</p>
                            <p className="text-sm font-medium text-foreground mt-1">{shift.punchPolicy}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Grace In</p>
                            <p className="text-sm font-medium text-foreground mt-1">{shift.graceInMinutes} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Grace Out</p>
                            <p className="text-sm font-medium text-foreground mt-1">{shift.graceOutMinutes} min</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            )}
          </>
        )}

        {/* Vacation Packages Tab */}
        {activeTab === 'vacation' && (
          <div className="space-y-4">
            {loadingEntitlements ? (
              <div className="bg-card rounded-xl shadow-sm p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-32 bg-muted rounded"></div>
                  <div className="h-32 bg-muted rounded"></div>
                </div>
              </div>
            ) : leaveEntitlements.length === 0 ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
                <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground">No Leave Entitlements</h3>
                <p className="text-muted-foreground mt-2">You don't have any leave entitlements assigned yet.</p>
                <p className="text-sm text-muted-foreground mt-4">Contact your HR department for leave entitlements.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveEntitlements.map((entitlement) => {
                  const leaveName = typeof entitlement.leaveTypeId === 'object'
                    ? entitlement.leaveTypeId.name
                    : 'Leave';

                  const usagePercentage = entitlement.yearlyEntitlement > 0
                    ? Math.round((entitlement.taken / entitlement.yearlyEntitlement) * 100)
                    : 0;

                  return (
                    <div key={entitlement._id} className="bg-card rounded-xl shadow-sm border border-border p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-foreground">{leaveName}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            {usagePercentage}% Used
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Used Days</span>
                            <span className="font-medium text-foreground">{entitlement.taken} / {entitlement.yearlyEntitlement} days</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Entitlement Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Yearly Entitlement</p>
                            <p className="text-lg font-semibold text-foreground mt-1">{entitlement.yearlyEntitlement}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Taken</p>
                            <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1">{entitlement.taken}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                            <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mt-1">{entitlement.pending}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-1">{entitlement.remaining}</p>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Accrued (Actual)</p>
                            <p className="text-sm font-medium text-foreground mt-1">{entitlement.accruedActual.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Accrued (Rounded)</p>
                            <p className="text-sm font-medium text-foreground mt-1">{entitlement.accruedRounded.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Carry Forward</p>
                            <p className="text-sm font-medium text-foreground mt-1">{entitlement.carryForward}</p>
                          </div>
                        </div>

                        {/* Reset Date */}
                        {entitlement.nextResetDate && (
                          <div className="pt-4 border-t border-border">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Reset Date</p>
                            <p className="text-sm font-medium text-foreground mt-1">{formatDate(entitlement.nextResetDate)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action Links */}
        <div className="flex gap-3 pt-4">
          <Link
            href="/portal/my-attendance"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            View My Attendance
          </Link>
        </div>
      </div>
    </div>
  );
}

