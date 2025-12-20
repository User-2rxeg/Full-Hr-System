'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { timeManagementService, PunchInRequest, PunchOutRequest } from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';
import { PunchType } from '@/app/types/enums';

interface TimeException {
  _id: string;
  employeeId: string;
  attendanceRecordId: string;
  type: string; // MISSED_PUNCH, LATE, EARLY_LEAVE, SHORT_TIME, OVERTIME_REQUEST, MANUAL_ADJUSTMENT
  status: 'OPEN' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'RESOLVED';
  reason?: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
}

interface BreakPermission {
  _id: string;
  employeeId: string;
  attendanceRecordId: string;
  startTime: string;
  endTime: string;
  duration: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  updatedAt?: string;
}

// Time Exception Types
const TIME_EXCEPTION_TYPES = [
  { value: 'MISSED_PUNCH', label: 'Missed Punch' },
  { value: 'LATE', label: 'Late Arrival' },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'SHORT_TIME', label: 'Short Work Time' },
  { value: 'OVERTIME_REQUEST', label: 'Overtime Request' },
  { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment' },
];

// Force log on module load
console.log('[MyAttendance] Module loaded at:', new Date().toISOString());

export default function MyAttendancePage() {
  // Force log on every render
  console.log('[MyAttendance] Component rendering at:', new Date().toISOString());

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState<any>(null);

  // Time exceptions state
  const [timeExceptions, setTimeExceptions] = useState<TimeException[]>([]);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [submittingException, setSubmittingException] = useState(false);
  const [exceptionFormData, setExceptionFormData] = useState({
    type: 'MISSED_PUNCH',
    reason: '',
  });

  // Break permission state
  const [breakPermissions, setBreakPermissions] = useState<any[]>([]);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [submittingBreak, setSubmittingBreak] = useState(false);
  const [breakFormData, setBreakFormData] = useState({
    startTime: '',
    endTime: '',
    reason: '',
  });
  const [maxLimitMinutes, setMaxLimitMinutes] = useState(180);

  // Tab state
  const [activeTab, setActiveTab] = useState<'attendance' | 'corrections' | 'time-exceptions' | 'time-exceptions'>('attendance');

  // Use ref to prevent duplicate API calls
  const fetchingRef = useRef(false);
  const punchingRef = useRef(false);

  // Current time display
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Memoized fetch function - exact logic from punch/page.tsx
  const fetchTodayRecord = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;

    fetchingRef.current = true;
    console.log('[MyAttendance] Fetching today record for user:', user.id);

    try {
      const response = await timeManagementService.getTodayRecord(user.id);
      console.log('[MyAttendance] API Response:', response);

      // Check if we got valid data with punches
      const record = response.data as any;
      const hasPunches = record && record.punches && Array.isArray(record.punches) && record.punches.length > 0;

      console.log('[MyAttendance] Has valid punches:', hasPunches, 'Punches:', record?.punches);

      if (hasPunches) {
        setTodayRecord(record);
        const punches = record.punches;
        const lastPunch = punches[punches.length - 1];

        console.log('[MyAttendance] Last punch:', lastPunch);

        // For FIRST_LAST policy: if last punch is IN, user is clocked in.
        // If last punch is OUT, user CAN clock out again (to update the last punch time)
        const isIn = lastPunch.type === PunchType.IN || lastPunch.type === 'IN';
        setIsClockedIn(isIn);
        if (isIn) {
          setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
        } else {
          // Last punch is OUT - still set clockInTime to first IN punch time for display
          const firstIn = punches.find((p: any) => p.type === PunchType.IN || p.type === 'IN');
          if (firstIn) {
            setClockInTime(new Date(firstIn.time).toLocaleTimeString());
          } else {
            setClockInTime(null);
          }
        }
      } else {
        // No record or no punches - reset state
        console.log('[MyAttendance] No valid record, resetting state');
        setIsClockedIn(false);
        setClockInTime(null);
        setTodayRecord(null);
      }
    } catch (err) {
      console.log('[MyAttendance] Error fetching record:', err);
      setIsClockedIn(false);
      setClockInTime(null);
      setTodayRecord(null);
    } finally {
      fetchingRef.current = false;
      setIsInitialized(true);
      setInitialLoading(false);
    }
  }, [user?.id]);

  // Fetch break permissions for this employee
  const fetchBreakPermissions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await timeManagementService.getEmployeeBreakPermissions(user.id);
      if (response.data && Array.isArray(response.data)) {
        setBreakPermissions(response.data);
      }
    } catch (err) {
      console.warn('Failed to fetch break permissions:', err);
    }
  }, [user?.id]);

  // Fetch max break limit
  const fetchMaxBreakLimit = useCallback(async () => {
    try {
      const response = await timeManagementService.getBreakPermissionLimit();
      if (response.data && typeof response.data === 'object' && 'maxMinutes' in response.data) {
        setMaxLimitMinutes((response.data as any).maxMinutes);
      }
    } catch (err) {
      console.warn('Failed to fetch break limit:', err);
    }
  }, []);

  // Fetch on mount - only once
  useEffect(() => {
    if (!user?.id || isInitialized) return;
    fetchTodayRecord();
    fetchTimeExceptions();
  }, [user?.id, isInitialized, fetchTodayRecord]);

  // Fetch break permissions and max limit on mount
  useEffect(() => {
    if (!user?.id || isInitialized) return;
    fetchBreakPermissions();
    fetchMaxBreakLimit();
  }, [user?.id, isInitialized, fetchBreakPermissions, fetchMaxBreakLimit]);

  // Handle break permission submission
  const handleBreakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !todayRecord?._id) {
      setError('Unable to create break permission - attendance record not found');
      return;
    }

    if (!breakFormData.startTime || !breakFormData.endTime || !breakFormData.reason) {
      setError('Please fill in all break fields');
      return;
    }

    try {
      setSubmittingBreak(true);
      setError(null);

      // Get today's date and combine with times
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      const start = new Date(`${year}-${month}-${day}T${breakFormData.startTime}:00`);
      const end = new Date(`${year}-${month}-${day}T${breakFormData.endTime}:00`);
      const duration = Math.ceil((end.getTime() - start.getTime()) / 60000);

      if (end <= start) {
        setError('Break end time must be after start time');
        return;
      }

      if (duration > maxLimitMinutes) {
        setError(`Break duration cannot exceed ${maxLimitMinutes} minutes`);
        return;
      }

      console.log('[BreakPermission] Submitting break:', {
        employeeId: user.id,
        attendanceRecordId: todayRecord._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration,
        reason: breakFormData.reason,
      });

      const response = await timeManagementService.createBreakPermission({
        employeeId: user.id,
        attendanceRecordId: todayRecord._id,
        startTime: start,
        endTime: end,
        reason: breakFormData.reason,
      });

      console.log('[BreakPermission] API Response:', response);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Break permission request submitted successfully!');
      setBreakFormData({ startTime: '', endTime: '', reason: '' });
      setShowBreakForm(false);

      // Refresh break permissions
      await fetchBreakPermissions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create break permission';
      console.error('[BreakPermission] Error:', err);
      setError(errorMsg);
    } finally {
      setSubmittingBreak(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Safe date formatter to prevent "Invalid Date"
  const formatBreakTime = (dateString: string | Date | undefined): string => {
    try {
      if (!dateString) return '--:--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('[BreakPermission] Invalid time format:', dateString);
        return '--:--';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.warn('[BreakPermission] Failed to format time:', dateString, err);
      return '--:--';
    }
  };

  const formatBreakDate = (dateString: string | Date | undefined): string => {
    try {
      if (!dateString) return '--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('[BreakPermission] Invalid date format:', dateString);
        return '--';
      }
      return date.toLocaleDateString();
    } catch (err) {
      console.warn('[BreakPermission] Failed to format date:', dateString, err);
      return '--';
    }
  };

  // Helper to normalize break permission data from backend
  const getNormalizedBreakData = (permission: BreakPermission) => {
    console.log('[BreakPermission] Raw permission data:', permission);

    const startTime = permission.startTime;
    const endTime = permission.endTime;
    const duration = permission.duration || 0;
    const createdAt = permission.createdAt;

    console.log('[BreakPermission] Normalized:', { startTime, endTime, duration, createdAt });

    return { startTime, endTime, duration, createdAt };
  };

  // Exact handleClockIn from punch/page.tsx
  const handleClockIn = async () => {
    // Prevent duplicate calls
    if (!user?.id || loading || isClockedIn || punchingRef.current) return;

    punchingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const request: PunchInRequest = {
        employeeId: user.id,
        source: 'web-app',
      };

      const response = await timeManagementService.punchIn(request);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        const record = response.data as any;
        setTodayRecord(record);
        const lastPunch = record.punches?.[record.punches.length - 1];

        if (lastPunch && lastPunch.type === PunchType.IN) {
          setIsClockedIn(true);
          setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
          setSuccess('Successfully clocked in!');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock in');
      console.error('Clock-in error:', err);
    } finally {
      setLoading(false);
      punchingRef.current = false;
    }
  };

  // Exact handleClockOut from punch/page.tsx
  const handleClockOut = async () => {
    // Prevent duplicate calls - allow clock out if there are any punches (for FIRST_LAST policy to update last punch)
    if (!user?.id || loading || !todayRecord || !todayRecord.punches || todayRecord.punches.length === 0 || punchingRef.current) return;

    punchingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const request: PunchOutRequest = {
        employeeId: user.id,
        source: 'web-app',
      };

      const response = await timeManagementService.punchOut(request);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        const record = response.data as any;
        setTodayRecord(record);

        // Update isClockedIn based on last punch type
        const punches = record.punches;
        if (punches && punches.length > 0) {
          const lastPunch = punches[punches.length - 1];
          const isIn = lastPunch.type === PunchType.IN || lastPunch.type === 'IN';
          setIsClockedIn(isIn);

          if (isIn) {
            setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
          } else {
            // Last punch is OUT - keep clockInTime from first IN punch for display
            const firstIn = punches.find((p: any) => p.type === PunchType.IN || p.type === 'IN');
            if (firstIn) {
              setClockInTime(new Date(firstIn.time).toLocaleTimeString());
            } else {
              setClockInTime(null);
            }
          }
        }

        setSuccess('Successfully clocked out!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clock out');
      console.error('Clock-out error:', err);
    } finally {
      setLoading(false);
      punchingRef.current = false;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatWorkTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get first IN punch and last OUT punch for today's display
  const getFirstClockIn = () => {
    if (!todayRecord?.punches?.length) return null;
    const firstIn = todayRecord.punches.find((p: any) => p.type === PunchType.IN);
    return firstIn ? formatTime(firstIn.time) : null;
  };

  const getLastClockOut = () => {
    if (!todayRecord?.punches?.length) return null;
    const outPunches = todayRecord.punches.filter((p: any) => p.type === PunchType.OUT);
    if (outPunches.length === 0) return null;
    return formatTime(outPunches[outPunches.length - 1].time);
  };

  // Force refresh function - must be defined before any returns
  const handleRefresh = useCallback(async () => {
    console.log('[MyAttendance] === REFRESH TRIGGERED ===');

    // Reset all refs and state
    fetchingRef.current = false;
    punchingRef.current = false;
    setIsInitialized(false);
    setIsClockedIn(false);
    setClockInTime(null);
    setTodayRecord(null);
    setError(null);
    setSuccess(null);
    setInitialLoading(true);

    // Small delay to ensure state is reset
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch fresh data
    if (user?.id) {
      console.log('[MyAttendance] Fetching fresh data for user:', user.id);
      fetchingRef.current = true;
      try {
        const response = await timeManagementService.getTodayRecord(user.id);
        console.log('[MyAttendance] Refresh API Response:', response);

        const record = response.data as any;
        const hasPunches = record && record.punches && Array.isArray(record.punches) && record.punches.length > 0;

        console.log('[MyAttendance] Refresh - Has valid punches:', hasPunches);

        if (hasPunches) {
          setTodayRecord(record);
          const punches = record.punches;
          const lastPunch = punches[punches.length - 1];
          const isIn = lastPunch.type === PunchType.IN || lastPunch.type === 'IN';
          console.log('[MyAttendance] Refresh - Setting isClockedIn to:', isIn);
          setIsClockedIn(isIn);
          if (isIn) {
            setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
          } else {
            // Last punch is OUT - still set clockInTime to first IN punch time for display
            const firstIn = punches.find((p: any) => p.type === PunchType.IN || p.type === 'IN');
            if (firstIn) {
              setClockInTime(new Date(firstIn.time).toLocaleTimeString());
            } else {
              setClockInTime(null);
            }
          }
        } else {
          // No valid record
          console.log('[MyAttendance] Refresh - No valid record, setting isClockedIn to false');
          setIsClockedIn(false);
          setClockInTime(null);
          setTodayRecord(null);
        }
      } catch (err) {
        console.log('[MyAttendance] Refresh error:', err);
        setIsClockedIn(false);
        setClockInTime(null);
        setTodayRecord(null);
      } finally {
        fetchingRef.current = false;
        setIsInitialized(true);
        setInitialLoading(false);
      }
    } else {
      console.log('[MyAttendance] No user id, skipping fetch');
      setInitialLoading(false);
      setIsInitialized(true);
    }
  }, [user?.id]);

  // Handle time exception submission
  const handleExceptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !todayRecord?._id) {
      setError('Unable to create time exception - attendance record not found');
      return;
    }

    if (!exceptionFormData.type || !exceptionFormData.reason) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmittingException(true);
      setError(null);

      console.log('[MyAttendance] Submitting time exception:', {
        employeeId: user.id,
        attendanceRecordId: todayRecord._id,
        type: exceptionFormData.type,
        reason: exceptionFormData.reason,
      });

      const response = await timeManagementService.createTimeException({
        employeeId: user.id,
        attendanceRecordId: todayRecord._id,
        type: exceptionFormData.type,
        reason: exceptionFormData.reason,
      });

      console.log('[MyAttendance] API Response:', response);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Time exception request submitted successfully!');
      setExceptionFormData({ type: 'MISSED_PUNCH', reason: '' });
      setShowExceptionForm(false);

      // Refresh time exceptions
      await fetchTimeExceptions();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create time exception';
      console.error('[MyAttendance] Error:', err);
      setError(errorMsg);
    } finally {
      setSubmittingException(false);
    }
  };

  // Fetch time exceptions for this employee
  const fetchTimeExceptions = async () => {
    if (!user?.id) return;

    try {
      const response = await timeManagementService.getAllTimeExceptions();
      console.log('[MyAttendance] Time Exceptions Response:', response);

      if (response.data && Array.isArray(response.data)) {
        // Filter only exceptions for this employee
        const employeeExceptions = response.data.filter((ex: any) => ex.employeeId === user.id || ex.employeeId?._id === user.id);
        setTimeExceptions(employeeExceptions);
      }
    } catch (err) {
      console.warn('[MyAttendance] Failed to fetch time exceptions:', err);
    }
  };

  const getExceptionTypeLabel = (type: string) => {
    return TIME_EXCEPTION_TYPES.find(t => t.value === type)?.label || type;
  };

  const getExceptionStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'PENDING':
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'ESCALATED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'RESOLVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Safe date formatter for time exceptions
  const formatExceptionDate = (dateString: string | Date | undefined): string => {
    try {
      if (!dateString) return '--';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('[TimeException] Invalid date format:', dateString);
        return '--';
      }
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      console.warn('[TimeException] Failed to format date:', dateString, err);
      return '--';
    }
  };

  if (initialLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-48 bg-card rounded-xl shadow-sm border border-border"></div>
            <div className="h-64 bg-card rounded-xl shadow-sm border border-border"></div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">My Attendance</h1>
            <p className="text-muted-foreground mt-1">Track your daily attendance and work hours</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh attendance data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              href="/portal/my-attendance/corrections"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Request Correction
            </Link>
          </div>
        </div>

        {/* Alerts */}
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

        {/* Clock In/Out Card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-lg p-6 text-primary-foreground">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-primary-foreground/70 text-sm">Current Time</p>
              <p className="text-4xl font-bold mt-1">{currentTime}</p>
              <p className="text-primary-foreground/70 mt-2">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Today's Status */}
              <div className="bg-white/10 rounded-lg px-4 py-3">
                <p className="text-primary-foreground/70 text-sm">Today's Status</p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-primary-foreground/60">Clock In</p>
                    <p className="text-lg font-semibold">{getFirstClockIn() || '--:--'}</p>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div>
                    <p className="text-xs text-primary-foreground/60">Clock Out</p>
                    <p className="text-lg font-semibold">{getLastClockOut() || '--:--'}</p>
                  </div>
                  {todayRecord && (
                    <>
                      <div className="w-px h-8 bg-white/20"></div>
                      <div>
                        <p className="text-xs text-primary-foreground/60">Work Time</p>
                        <p className="text-lg font-semibold">{formatWorkTime(todayRecord.totalWorkMinutes || 0)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Clock Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClockIn}
                  disabled={loading || isClockedIn}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isClockedIn
                      ? 'bg-white/20 text-primary-foreground/60 cursor-not-allowed'
                      : 'bg-white text-primary hover:bg-white/90'
                  }`}
                >
                  {loading && !isClockedIn ? 'Processing...' : isClockedIn ? 'Clocked In' : 'Clock In'}
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={loading || !todayRecord || todayRecord.punches?.length === 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    !todayRecord || todayRecord.punches?.length === 0
                      ? 'bg-white/20 text-primary-foreground/60 cursor-not-allowed'
                      : 'bg-white text-primary hover:bg-white/90'
                  }`}
                >
                  {loading ? 'Processing...' : 'Clock Out'}
                </button>
              </div>
            </div>
          </div>

          {/* Current Status Indicator */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
              <span className="text-sm">
                {isClockedIn
                  ? `Currently clocked in${clockInTime ? ` since ${clockInTime}` : ''}`
                  : 'Not clocked in'}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Punches */}
        {todayRecord && todayRecord.punches && todayRecord.punches.length > 0 && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Today's Punches</h2>
            <div className="flex flex-wrap gap-3">
              {todayRecord.punches.map((punch: any, idx: number) => (
                <div
                  key={idx}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    punch.type === PunchType.IN
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {punch.type === PunchType.IN ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    )}
                  </svg>
                  <span className="font-medium">{punch.type}</span>
                  <span>{formatTime(punch.time)}</span>
                </div>
              ))}
            </div>
            {todayRecord.hasMissedPunch && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">Missing punch detected. Please submit a correction request.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'corrections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Corrections
            </button>
            <button
              onClick={() => setActiveTab('time-exceptions')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'time-exceptions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Time Exceptions
            </button>
            <button
              onClick={() => setActiveTab('time-exceptions')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'time-exceptions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Break Permissions
            </button>
          </div>
        </div>

        {/* Corrections Tab */}
        {activeTab === 'corrections' && (
          <div className="bg-muted/50 rounded-xl border border-border p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Need to Correct an Entry?</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  If you missed a clock in/out or need to make corrections to your attendance record,
                  submit a correction request for manager approval.
                </p>
                <Link
                  href="/portal/my-attendance/corrections"
                  className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-primary hover:text-primary/80"
                >
                  Submit Correction Request
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Time Exceptions Tab */}
        {activeTab === 'time-exceptions' && (
          <div className="space-y-4">
            {/* Time Exception Form */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Request Time Exception</h2>
                <button
                  onClick={() => setShowExceptionForm(!showExceptionForm)}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {showExceptionForm ? '✕ Hide Form' : '+ New Exception'}
                </button>
              </div>

              {showExceptionForm && (
                <form onSubmit={handleExceptionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Exception Type</label>
                    <select
                      value={exceptionFormData.type}
                      onChange={(e) => setExceptionFormData({ ...exceptionFormData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {TIME_EXCEPTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
                    <textarea
                      placeholder="Describe the reason for this time exception..."
                      value={exceptionFormData.reason}
                      onChange={(e) => setExceptionFormData({ ...exceptionFormData, reason: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingException}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submittingException ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExceptionForm(false)}
                      className="flex-1 px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Time Exceptions List */}
            {timeExceptions.length > 0 ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-3">
                <h3 className="font-semibold text-foreground mb-4">Your Time Exceptions</h3>
                {timeExceptions.map((exception) => (
                  <div key={exception._id} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{getExceptionTypeLabel(exception.type)}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getExceptionStatusColor(exception.status)}`}>
                            {exception.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{exception.reason || 'No reason provided'}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Type</p>
                          <p className="font-medium text-foreground">{getExceptionTypeLabel(exception.type)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
                <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground">No Time Exceptions</h3>
                <p className="text-muted-foreground mt-2">You haven't submitted any time exceptions yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Break Permissions Tab */}
        {activeTab === 'time-exceptions' && (
          <div className="space-y-4">
            {/* Break Permission Form */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Request Break</h2>
                <button
                  onClick={() => setShowBreakForm(!showBreakForm)}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {showBreakForm ? '✕ Hide Form' : '+ New Break'}
                </button>
              </div>

              {showBreakForm && (
                <form onSubmit={handleBreakSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start Time</label>
                    <input
                      type="time"
                      value={breakFormData.startTime}
                      onChange={(e) => setBreakFormData({ ...breakFormData, startTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">End Time</label>
                    <input
                      type="time"
                      value={breakFormData.endTime}
                      onChange={(e) => setBreakFormData({ ...breakFormData, endTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
                    <textarea
                      placeholder="Describe the reason for your break..."
                      value={breakFormData.reason}
                      onChange={(e) => setBreakFormData({ ...breakFormData, reason: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingBreak}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submittingBreak ? 'Submitting...' : 'Request Break'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBreakForm(false)}
                      className="flex-1 px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Break Permissions List */}
            {breakPermissions.length > 0 ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-3">
                <h3 className="font-semibold text-foreground mb-4">Your Break Requests</h3>
                {breakPermissions.map((permission) => {
                  const normalized = getNormalizedBreakData(permission);
                  return (
                    <div key={permission._id} className="bg-background rounded-lg p-4 border border-border">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground">Break Request</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(permission.status)}`}>
                              {permission.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{permission.reason}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Start</p>
                            <p className="font-medium text-foreground">{formatBreakTime(normalized.startTime)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">End</p>
                            <p className="font-medium text-foreground">{formatBreakTime(normalized.endTime)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Duration</p>
                            <p className="font-medium text-foreground">{normalized.duration} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Date</p>
                            <p className="font-medium text-foreground">{formatBreakDate(normalized.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
                <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground">No Break Requests</h3>
                <p className="text-muted-foreground mt-2">You haven't submitted any break requests yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





