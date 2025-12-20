'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  timeManagementService,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  CorrectionRequestStatus,
  PunchType,
  CorrectAttendanceDto,
} from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';

export default function AttendanceRecordsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');

  // Data state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [pastCorrections, setPastCorrections] = useState<AttendanceCorrectionRequest[]>([]);

  // Modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState<{
    action: 'addPunchIn' | 'addPunchOut' | 'replacePunches';
    punchInDate: string;
    punchInTime: string;
    punchOutDate: string;
    punchOutTime: string;
    reason: string;
  }>({
    action: 'addPunchOut',
    punchInDate: '',
    punchInTime: '',
    punchOutDate: '',
    punchOutTime: '',
    reason: '',
  });

  // Review correction modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'records' | 'corrections' | 'history' | 'create'>('records');

  // Create attendance record state
  const [createForm, setCreateForm] = useState<{
    employeeId: string;
    punchInTime: string;
    punchOutTime: string;
    reason: string;
  }>({
    employeeId: '',
    punchInTime: '',
    punchOutTime: '',
    reason: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAttendanceRecords = useCallback(async () => {
    if (!employeeIdFilter) {
      setAttendanceRecords([]);
      return;
    }

    try {
      const response = await timeManagementService.getMonthlyAttendance(
        employeeIdFilter,
        selectedMonth,
        selectedYear
      );

      if (response.data) {
        setAttendanceRecords(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch attendance records:', err);
    }
  }, [employeeIdFilter, selectedMonth, selectedYear]);

  const fetchPendingCorrections = useCallback(async () => {
    try {
      const response = await timeManagementService.getAllCorrections();

      if (response.data) {
        const allCorrections = Array.isArray(response.data) ? response.data : [];
        // Filter pending (SUBMITTED, IN_REVIEW)
        const pending = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.SUBMITTED || c.status === CorrectionRequestStatus.IN_REVIEW
        );
        // Filter past (APPROVED, REJECTED)
        const past = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.APPROVED || c.status === CorrectionRequestStatus.REJECTED
        );
        setPendingCorrections(pending);
        setPastCorrections(past);
      }
    } catch (err: any) {
      console.error('Failed to fetch corrections:', err);
    }
  }, []);

  // Helper function to generate date options (last 30 days)
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateStr = `${day}/${month}/${year}`;
      options.push(dateStr);
    }
    return options;
  };

  // Helper function to generate time options (15-minute intervals)
  const getTimeOptions = () => {
    const options = [];
    for (let hours = 0; hours < 24; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 15) {
        const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        options.push(time);
      }
    }
    return options;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAttendanceRecords(),
        fetchPendingCorrections(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchAttendanceRecords, fetchPendingCorrections]);

  const handleCorrectAttendance = async () => {
    if (!selectedRecord) return;

    if (!correctionForm.reason.trim()) {
      setError('Correction reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dto: CorrectAttendanceDto = {
        attendanceRecordId: selectedRecord._id,
        correctionReason: correctionForm.reason,
        correctedBy: user?.id,
      };

      // Helper function to convert date and time to ISO string
      const convertToISO = (dateStr: string, timeStr: string): string => {
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        const dateTime = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
        return dateTime.toISOString();
      };

      if (correctionForm.action === 'addPunchIn' && correctionForm.punchInDate && correctionForm.punchInTime) {
        dto.addPunchIn = convertToISO(correctionForm.punchInDate, correctionForm.punchInTime);
      } else if (correctionForm.action === 'addPunchOut' && correctionForm.punchOutDate && correctionForm.punchOutTime) {
        dto.addPunchOut = convertToISO(correctionForm.punchOutDate, correctionForm.punchOutTime);
      } else if (correctionForm.action === 'replacePunches') {
        const punches: { type: PunchType; time: string }[] = [];
        if (correctionForm.punchInDate && correctionForm.punchInTime) {
          punches.push({ type: PunchType.IN, time: convertToISO(correctionForm.punchInDate, correctionForm.punchInTime) });
        }
        if (correctionForm.punchOutDate && correctionForm.punchOutTime) {
          punches.push({ type: PunchType.OUT, time: convertToISO(correctionForm.punchOutDate, correctionForm.punchOutTime) });
        }
        if (punches.length > 0) {
          dto.correctedPunches = punches;
        }
      }

      const response = await timeManagementService.correctAttendanceRecord(dto);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Attendance record corrected successfully');
      setShowCorrectionModal(false);
      setSelectedRecord(null);
      setCorrectionForm({
        action: 'addPunchOut',
        punchInDate: '',
        punchInTime: '',
        punchOutDate: '',
        punchOutTime: '',
        reason: '',
      });
      await fetchAttendanceRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to correct attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewCorrection = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedCorrection || !user?.id) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.reviewCorrectionRequest({
        correctionRequestId: selectedCorrection._id,
        reviewerId: user.id,
        action,
        note: reviewNote,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Correction request ${action.toLowerCase()}d successfully`);
      setShowReviewModal(false);
      setSelectedCorrection(null);
      setReviewNote('');
      await fetchPendingCorrections();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} correction request`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAttendanceRecord = async () => {
    if (!createForm.employeeId) {
      setError('Employee ID is required');
      return;
    }

    if (!createForm.punchInTime || !createForm.punchOutTime) {
      setError('Both punch in and punch out times are required');
      return;
    }

    if (!createForm.reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dto = {
        employeeId: createForm.employeeId,
        punches: [
          { type: PunchType.IN, time: createForm.punchInTime },
          { type: PunchType.OUT, time: createForm.punchOutTime }
        ],
        createdBy: user?.id,
        reason: createForm.reason,
      };

      const response = await timeManagementService.createAttendanceRecord(dto);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Attendance record created successfully');
      setShowCreateModal(false);
      setCreateForm({
        employeeId: '',
        punchInTime: '',
        punchOutTime: '',
        reason: '',
      });
      await fetchAttendanceRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create attendance record');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getStatusBadgeColor = (status: CorrectionRequestStatus) => {
    switch (status) {
      case CorrectionRequestStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case CorrectionRequestStatus.IN_REVIEW:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case CorrectionRequestStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case CorrectionRequestStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRecordDate = (record: AttendanceRecord) => {
    if (record.punches && record.punches.length > 0) {
      return formatDate(record.punches[0].time);
    }
    // If no punches, try to use createdAt timestamp
    if ((record as any).createdAt) {
      return formatDate((record as any).createdAt);
    }
    return 'N/A';
  };

  const formatWorkTime = (minutes: number | undefined): string => {
    if (minutes === undefined || isNaN(minutes) || !Number.isFinite(minutes)) {
      return '0h 0m';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
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
            <h1 className="text-2xl font-semibold text-foreground">Attendance Management</h1>
            <p className="text-muted-foreground mt-1">
              View, record, and correct attendance records manually
            </p>
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'records'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Attendance Records
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'create'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Record
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'corrections'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Correction Requests
            {pendingCorrections.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingCorrections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Correction History
          </button>
        </div>

        {/* Attendance Records Tab */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Search Attendance Records</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={employeeIdFilter}
                    onChange={(e) => setEmployeeIdFilter(e.target.value)}
                    placeholder="Enter employee ID"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2025, i, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchAttendanceRecords}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Records List */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">
                Attendance Records
                {attendanceRecords.length > 0 && (
                  <span className="text-muted-foreground font-normal ml-2">
                    ({attendanceRecords.length} records)
                  </span>
                )}
              </h2>

              {!employeeIdFilter ? (
                <div className="text-center py-12 text-muted-foreground">
                  Enter an employee ID to view attendance records.
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No attendance records found for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Punches</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Work Time</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr key={record._id} className="border-b border-border last:border-0">
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">{getRecordDate(record)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              {record.punches && record.punches.length > 0 ? (
                                record.punches.map((punch, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 w-fit ${
                                      punch.type === PunchType.IN
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}
                                  >
                                    {punch.type}: {formatTime(punch.time)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">No punches</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-foreground">
                              {formatWorkTime(record.totalWorkMinutes)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              {record.hasMissedPunch && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 w-fit">
                                  Missing Punch
                                </span>
                              )}
                              {record.finalisedForPayroll ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 w-fit">
                                  Finalized
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground w-fit">
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowCorrectionModal(true);
                              }}
                              className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                              Correct
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Correction Requests Tab */}
        {activeTab === 'create' && (
          <div className="bg-card rounded-xl border border-border p-6 max-w-2xl">
            <h2 className="font-semibold text-foreground mb-6">Create New Attendance Record</h2>

            <div className="space-y-4">
              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  placeholder="Enter employee ID"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Punch In Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Punch In Time (dd/mm/yyyy hh:mm) *
                </label>
                <input
                  type="text"
                  value={createForm.punchInTime}
                  onChange={(e) => setCreateForm({ ...createForm, punchInTime: e.target.value })}
                  placeholder="e.g., 16/12/2025 09:00"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Punch Out Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Punch Out Time (dd/mm/yyyy hh:mm) *
                </label>
                <input
                  type="text"
                  value={createForm.punchOutTime}
                  onChange={(e) => setCreateForm({ ...createForm, punchOutTime: e.target.value })}
                  placeholder="e.g., 16/12/2025 17:00"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reason for Creation *
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="Enter the reason for manually creating this attendance record"
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateAttendanceRecord}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create Attendance Record'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      employeeId: '',
                      punchInTime: '',
                      punchOutTime: '',
                      reason: '',
                    });
                  }}
                  className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> You can manually create attendance records for employees when system records are missing or incorrect.
                  Make sure the punch times are in the correct format (dd/mm/yyyy hh:mm).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Correction Requests Tab */}
        {activeTab === 'corrections' && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Pending Correction Requests</h2>

            {pendingCorrections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending correction requests.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCorrections.map((correction) => (
                  <div
                    key={correction._id}
                    className="p-4 rounded-lg border border-border bg-background"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            Correction Request
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeColor(correction.status)}`}>
                            {correction.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Employee ID: {correction.employeeId}
                        </p>
                        {correction.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {correction.reason}
                          </p>
                        )}
                        {correction.createdAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {formatDateTime(correction.createdAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCorrection(correction);
                            setShowReviewModal(true);
                          }}
                          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Correction History Tab */}
        {activeTab === 'history' && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Correction History</h2>

            {pastCorrections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No correction history found.
              </div>
            ) : (
              <div className="space-y-3">
                {pastCorrections.map((correction) => (
                  <div
                    key={correction._id}
                    className="p-4 rounded-lg border border-border bg-background"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            Correction Request
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeColor(correction.status)}`}>
                            {correction.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Employee ID: {correction.employeeId}
                        </p>
                        {correction.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {correction.reason}
                          </p>
                        )}
                        {correction.createdAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {formatDateTime(correction.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Correction Modal */}
        {showCorrectionModal && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Correct Attendance Record</h2>
                <button
                  onClick={() => {
                    setShowCorrectionModal(false);
                    setSelectedRecord(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Current punches */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Current Punches:</p>
                {selectedRecord.punches && selectedRecord.punches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.punches.map((punch, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          punch.type === PunchType.IN
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {punch.type}: {formatDateTime(punch.time)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No punches recorded</p>
                )}
              </div>

              <div className="space-y-4">
                {/* Correction action */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Correction Type</label>
                  <select
                    value={correctionForm.action}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, action: e.target.value as any })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="addPunchIn">Add Missing Punch In</option>
                    <option value="addPunchOut">Add Missing Punch Out</option>
                    <option value="replacePunches">Replace All Punches</option>
                  </select>
                </div>

                {/* Punch In Time - Date and Time Dropdowns */}
                {(correctionForm.action === 'addPunchIn' || correctionForm.action === 'replacePunches') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch In Date
                      </label>
                      <select
                        value={correctionForm.punchInDate}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchInDate: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select date</option>
                        {getDateOptions().map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch In Time
                      </label>
                      <select
                        value={correctionForm.punchInTime}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchInTime: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select time</option>
                        {getTimeOptions().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Punch Out Time - Date and Time Dropdowns */}
                {(correctionForm.action === 'addPunchOut' || correctionForm.action === 'replacePunches') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch Out Date
                      </label>
                      <select
                        value={correctionForm.punchOutDate}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchOutDate: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select date</option>
                        {getDateOptions().map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Punch Out Time
                      </label>
                      <select
                        value={correctionForm.punchOutTime}
                        onChange={(e) => setCorrectionForm({ ...correctionForm, punchOutTime: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select time</option>
                        {getTimeOptions().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Correction Reason *
                  </label>
                  <textarea
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                    placeholder="Enter the reason for this correction"
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleCorrectAttendance}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Applying...' : 'Apply Correction'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCorrectionModal(false);
                      setSelectedRecord(null);
                    }}
                    className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Correction Modal */}
        {showReviewModal && selectedCorrection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Review Correction Request</h2>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedCorrection(null);
                    setReviewNote('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Employee ID:</p>
                  <p className="font-medium text-foreground">{selectedCorrection.employeeId}</p>
                </div>

                {selectedCorrection.reason && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Reason:</p>
                    <p className="font-medium text-foreground">{selectedCorrection.reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Review Note (Optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add a note for this review"
                    rows={3}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleReviewCorrection('APPROVE')}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReviewCorrection('REJECT')}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedCorrection(null);
                      setReviewNote('');
                    }}
                    className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

