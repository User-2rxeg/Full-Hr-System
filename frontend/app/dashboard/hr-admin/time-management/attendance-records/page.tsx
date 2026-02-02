'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  timeManagementService,
  AttendanceRecord,
  AttendanceCorrectionRequest,
  CorrectionRequestStatus,
  PunchType,
  CorrectAttendanceDto,
} from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';
import { useAuth } from '@/context/AuthContext';
import { Search, Clock, CheckCircle, AlertTriangle, X, Users, Loader2 } from 'lucide-react';

// Dynamically import the Lateness page component for the repeated lateness tab
const RepeatedLatenessPage = lazy(() => import('../../../hr-manager/time-management/Lateness/page').then(mod => ({ default: mod.default })));

// Employee interface for dropdown
interface EmployeeOption {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  fullName?: string;
}

// Issue interface for review results
interface AttendanceIssue {
  type: 'MISSING_PUNCH' | 'INVALID_SEQUENCE' | 'SHORT_TIME' | 'NO_PUNCH_OUT' | 'NO_PUNCH_IN' | 'HOLIDAY_PUNCH';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  suggestion: string;
}


interface ReviewResult {
  record: AttendanceRecord;
  issues: AttendanceIssue[];
  canFinalize: boolean;
}

type ReviewData = {
  record: AttendanceRecord;
  issues: AttendanceIssue[];
  canFinalize: boolean;
};

export default function AttendanceRecordsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Employee selection state
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'MISSING_PUNCH' | 'INVALID_SEQUENCE' | 'SHORT_TIME'>('ALL');

  // Data state
  const [attendanceRecords, setAttendanceRecords] = useState<ReviewResult[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [pastCorrections, setPastCorrections] = useState<AttendanceCorrectionRequest[]>([]);

  // Modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReviewResult | null>(null);
  const [correctionForm, setCorrectionForm] = useState<{
    action: 'addPunchIn' | 'addPunchOut' | 'removePunch' | 'replacePunches';
    punchInTime: string;
    punchOutTime: string;
    removePunchIndex: string;
    reason: string;
  }>({
    action: 'addPunchOut',
    punchInTime: '',
    punchOutTime: '',
    removePunchIndex: '',
    reason: '',
  });

  // Review correction modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<AttendanceCorrectionRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'records' | 'corrections' | 'history' | 'repeated-lateness'>('records');


  // Handle starting review (mark as IN_REVIEW)
  const handleStartReview = async (correction: AttendanceCorrectionRequest) => {
    console.log('[handleStartReview] Starting review for correction:', correction._id, 'Status:', correction.status);
    try {
      setError(null);
      setSubmitting(true);
      console.log('[handleStartReview] submitting state set to true');

      // Only call startReview if status is SUBMITTED
      if (correction.status === CorrectionRequestStatus.SUBMITTED) {
        console.log('[handleStartReview] Calling startReview API...');
        const response = await timeManagementService.startReview(correction._id);
        console.log('[handleStartReview] API Response:', response);

        if (response?.error) {
          throw new Error(response.error);
        }

        // Refresh corrections to show updated status
        console.log('[handleStartReview] Refreshing corrections...');
        await fetchCorrections();
        console.log('[handleStartReview] Corrections refreshed');

        setSuccess('Correction marked as under review');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        console.log('[handleStartReview] Correction already in review, skipping startReview call');
      }

      // Set selected correction and show modal
      setSelectedCorrection(correction);
      setShowReviewModal(true);

      console.log('[handleStartReview] Review modal opened');
    } catch (err: any) {
      console.error('[handleStartReview] Error:', err);
      const errMsg = err?.message || 'Failed to start review';
      setError(`Failed to start review: ${errMsg}`);
    } finally {
      setSubmitting(false);
      console.log('[handleStartReview] submitting state set to false');
    }
  };

  // Fetch employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileService.getAllEmployees(1, 100) as any;
      const data = response?.data?.data || response?.data || response || [];

      if (Array.isArray(data)) {
        setEmployees(data.map((emp: any) => ({
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeNumber: emp.employeeNumber || '',
          fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
        })));
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    const searchLower = employeeSearch.toLowerCase();
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes(searchLower) ||
           emp.employeeNumber?.toLowerCase().includes(searchLower) ||
           emp._id.toLowerCase().includes(searchLower);
  });

  // Fetch attendance records with review
  const fetchAttendanceRecords = useCallback(async () => {
    if (!selectedEmployee) {
      setAttendanceRecords([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get monthly records
      const recordsResponse = await timeManagementService.getMonthlyAttendance(
        selectedEmployee._id,
        selectedMonth,
        selectedYear
      );

      if (recordsResponse.error) {
        setError(recordsResponse.error);
        setAttendanceRecords([]);
        return;
      }

      const records = Array.isArray(recordsResponse.data) ? recordsResponse.data : [];

      // Now review each record to get issues
      const reviewedRecords: ReviewResult[] = [];
      for (const record of records) {
        try {
          const reviewResponse = await timeManagementService.reviewAttendanceRecord(record._id);

          if (reviewResponse.data) {
            const reviewData = reviewResponse.data as ReviewData;
            reviewedRecords.push({
              record: reviewData.record || record,
              issues: reviewData.issues || [],
              canFinalize: reviewData.canFinalize || false,
            });
          } else {
            reviewedRecords.push({
              record,
              issues: [],
              canFinalize: false,
            });
          }
        } catch (err: unknown) {
          console.error('Failed to review record:', err);
          reviewedRecords.push({
            record,
            issues: [],
            canFinalize: false,
          });
        }
      }

      // Apply issue filter
      let filtered = reviewedRecords;
      if (issueFilter !== 'ALL') {
        filtered = reviewedRecords.filter((r) =>
          r.issues.some((issue) => issue.type === issueFilter)
        );
      }

      setAttendanceRecords(filtered);
    } catch (err: unknown) {
      console.error('Failed to fetch attendance records:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance records';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee, selectedMonth, selectedYear, issueFilter]);

  // Fetch corrections
  const fetchCorrections = useCallback(async () => {
    try {
      const response = await timeManagementService.getAllCorrections();

      if (response.data) {
        const allCorrections = Array.isArray(response.data) ? response.data : [];
        const pending = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.SUBMITTED || c.status === CorrectionRequestStatus.IN_REVIEW
        );
        const past = allCorrections.filter(
          (c) => c.status === CorrectionRequestStatus.APPROVED || c.status === CorrectionRequestStatus.REJECTED
        );
        setPendingCorrections(pending);
        setPastCorrections(past);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch corrections:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCorrections(), fetchEmployees()]);
      setLoading(false);
    };

    loadData();
  }, [fetchCorrections, fetchEmployees]);

  // Apply correction
  const handleCorrectAttendance = async () => {
    if (!selectedRecord || !user?.id) return;

    if (!correctionForm.reason.trim()) {
      setError('Correction reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dto: CorrectAttendanceDto = {
        attendanceRecordId: selectedRecord.record._id,
        correctionReason: correctionForm.reason,
        correctedBy: user?.id,
      };

      if (correctionForm.action === 'addPunchIn' && correctionForm.punchInTime) {
        dto.addPunchIn = correctionForm.punchInTime;
      } else if (correctionForm.action === 'addPunchOut' && correctionForm.punchOutTime) {
        dto.addPunchOut = correctionForm.punchOutTime;
      } else if (correctionForm.action === 'removePunch' && correctionForm.removePunchIndex) {
        dto.removePunchIndex = parseInt(correctionForm.removePunchIndex, 10);
      } else if (correctionForm.action === 'replacePunches') {
        const punches: { type: PunchType; time: string }[] = [];
        if (correctionForm.punchInTime) {
          punches.push({ type: PunchType.IN, time: correctionForm.punchInTime });
        }
        if (correctionForm.punchOutTime) {
          punches.push({ type: PunchType.OUT, time: correctionForm.punchOutTime });
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
        punchInTime: '',
        punchOutTime: '',
        removePunchIndex: '',
        reason: '',
      });
      await fetchAttendanceRecords();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to correct attendance record';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Review correction
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
      await fetchCorrections();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} correction request`;
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Utilities
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
        return 'bg-info/10 text-info border border-info/30';
      case CorrectionRequestStatus.IN_REVIEW:
        return 'bg-warning/10 text-warning border border-warning/30';
      case CorrectionRequestStatus.APPROVED:
        return 'bg-success/10 text-success border border-success/30';
      case CorrectionRequestStatus.REJECTED:
        return 'bg-destructive/10 text-destructive border border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getSeverityColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH':
        return 'bg-destructive/10 text-destructive border border-destructive/30';
      case 'MEDIUM':
        return 'bg-warning/10 text-warning border border-warning/30';
      case 'LOW':
        return 'bg-info/10 text-info border border-info/30';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getRecordDate = (record: AttendanceRecord) => {
    if (record.punches && record.punches.length > 0) {
      return formatDate(record.punches[0].time);
    }
    return 'N/A';
  };

  if (loading && activeTab === 'records' && selectedEmployee) {
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
            <h1 className="text-2xl font-semibold text-foreground">Attendance Management</h1>
            <p className="text-muted-foreground mt-1">
              Review, record, and correct attendance records
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
          <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
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
          <button
            onClick={() => setActiveTab('repeated-lateness')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'repeated-lateness'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Repeated Lateness
          </button>
        </div>

        {/* ATTENDANCE RECORDS TAB */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Search & Review Attendance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Employee Selection Dropdown */}
                <div className="relative md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Employee</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setSelectedEmployee(null);
                        setShowEmployeeDropdown(true);
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search employee by name..."
                      className="w-full px-3 py-2 pl-10 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    {selectedEmployee && (
                      <button
                        onClick={() => {
                          setSelectedEmployee(null);
                          setEmployeeSearch('');
                          setAttendanceRecords([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showEmployeeDropdown && !selectedEmployee && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {loadingEmployees ? (
                        <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading employees...
                        </div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 20).map((emp) => (
                          <button
                            key={emp._id}
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEmployeeSearch('');
                              setShowEmployeeDropdown(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3 border-b border-border last:border-b-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                              {emp.firstName?.[0]}{emp.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                              {emp.employeeNumber && (
                                <p className="text-xs text-muted-foreground">#{emp.employeeNumber}</p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Issue Filter</label>
                  <select
                    value={issueFilter}
                    onChange={(e) => setIssueFilter(e.target.value as 'ALL' | 'MISSING_PUNCH' | 'INVALID_SEQUENCE' | 'SHORT_TIME')}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">All Issues</option>
                    <option value="MISSING_PUNCH">Missing Punches</option>
                    <option value="INVALID_SEQUENCE">Invalid Sequences</option>
                    <option value="SHORT_TIME">Short Time</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchAttendanceRecords}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Searching...' : 'Search'}
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

              {!selectedEmployee ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Select an employee to view attendance records.</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No attendance records found for the selected period.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {attendanceRecords.map((reviewResult) => (
                    <div
                      key={reviewResult.record._id}
                      className="border border-border rounded-lg p-4 bg-background hover:border-primary/50 transition-colors"
                    >
                      {/* Record Header */}
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-foreground text-lg">
                              {getRecordDate(reviewResult.record)}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {reviewResult.issues.length === 0 ? (
                                <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success border border-success/30">
                                  ✓ No Issues
                                </span>
                              ) : (
                                reviewResult.issues.map((issue, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(issue.severity)}`}
                                  >
                                    {issue.type}
                                  </span>
                                ))
                              )}
                              {reviewResult.canFinalize && (
                                <span className="px-2 py-1 rounded-full text-xs bg-info/10 text-info border border-info/30">
                                  Ready to Finalize
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Punches */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {reviewResult.record.punches && reviewResult.record.punches.length > 0 ? (
                              reviewResult.record.punches.map((punch, idx) => (
                                <span
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded-lg border ${
                                    punch.type === PunchType.IN
                                      ? 'bg-success/10 text-success border-success/30'
                                      : 'bg-destructive/10 text-destructive border-destructive/30'
                                  }`}
                                >
                                  {punch.type}: {formatTime(punch.time)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No punches recorded</span>
                            )}
                          </div>

                          {/* Work Time & Status */}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Work Time: <span className="font-medium text-foreground">
                                {Math.floor(reviewResult.record.totalWorkMinutes / 60)}h{' '}
                                {reviewResult.record.totalWorkMinutes % 60}m
                              </span>
                            </span>
                            {reviewResult.record.finalisedForPayroll && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success border border-success/30">
                                Finalized for Payroll
                              </span>
                            )}
                          </div>

                          {/* Issues Detail */}
                          {reviewResult.issues.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {reviewResult.issues.map((issue, idx) => (
                                <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                                  <p className="font-medium text-foreground">{issue.description}</p>
                                  {issue.suggestion && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      Suggestion: {issue.suggestion}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRecord(reviewResult);
                              setShowCorrectionModal(true);
                            }}
                            className="px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                          >
                            Correct Record
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CORRECTION REQUESTS TAB */}
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
                    className="p-4 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div className="flex-1">
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
                          onClick={() => handleStartReview(correction)}
                          disabled={submitting}
                          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {submitting ? 'Starting Review...' : 'Review'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CORRECTION HISTORY TAB */}
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
                      <div className="flex-1">
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
                        {correction.updatedAt && (
                          <p className="text-xs text-muted-foreground">
                            Updated: {formatDateTime(correction.updatedAt)}
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

        {/* REPEATED LATENESS TAB */}
        {activeTab === 'repeated-lateness' && (
          <Suspense fallback={
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          }>
            <RepeatedLatenessPage />
          </Suspense>
        )}

        {/* CORRECTION MODAL */}
        {showCorrectionModal && selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

              {/* Current State */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Current Punches */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Current Punches:</p>
                  {selectedRecord.record.punches && selectedRecord.record.punches.length > 0 ? (
                    <div className="space-y-1">
                      {selectedRecord.record.punches.map((punch, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded ${
                            punch.type === PunchType.IN
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {punch.type}: {formatDateTime(punch.time)}
                          </span>
                          <span className="text-muted-foreground">({idx})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No punches recorded</p>
                  )}
                </div>

                {/* Issues Summary */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Issues Detected:</p>
                  {selectedRecord.issues.length > 0 ? (
                    <div className="space-y-1">
                      {selectedRecord.issues.map((issue, idx) => (
                        <div key={idx} className="text-xs">
                          <p className={`px-2 py-1 rounded ${getSeverityColor(issue.severity)}`}>
                            {issue.type}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">✓ No issues detected</p>
                  )}
                </div>
              </div>

              {/* Correction Form */}
              <div className="space-y-4">
                {/* Correction Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Correction Type</label>
                  <select
                    value={correctionForm.action}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, action: e.target.value as 'addPunchIn' | 'addPunchOut' | 'removePunch' | 'replacePunches' })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="addPunchIn">Add Missing Punch In</option>
                    <option value="addPunchOut">Add Missing Punch Out</option>
                    {selectedRecord.record.punches && selectedRecord.record.punches.length > 0 && (
                      <option value="removePunch">Remove Duplicate Punch</option>
                    )}
                    <option value="replacePunches">Replace All Punches</option>
                  </select>
                </div>

                {/* Punch In Time */}
                {(correctionForm.action === 'addPunchIn' || correctionForm.action === 'replacePunches') && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Punch In Time (dd/mm/yyyy hh:mm)
                    </label>
                    <input
                      type="text"
                      value={correctionForm.punchInTime}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, punchInTime: e.target.value })}
                      placeholder="e.g., 16/12/2025 09:00"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Punch Out Time */}
                {(correctionForm.action === 'addPunchOut' || correctionForm.action === 'replacePunches') && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Punch Out Time (dd/mm/yyyy hh:mm)
                    </label>
                    <input
                      type="text"
                      value={correctionForm.punchOutTime}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, punchOutTime: e.target.value })}
                      placeholder="e.g., 16/12/2025 17:00"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Remove Punch Index */}
                {correctionForm.action === 'removePunch' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Punch Index to Remove
                    </label>
                    <select
                      value={correctionForm.removePunchIndex}
                      onChange={(e) => setCorrectionForm({ ...correctionForm, removePunchIndex: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a punch to remove</option>
                      {selectedRecord.record.punches?.map((punch, idx) => (
                        <option key={idx} value={idx}>
                          {idx}: {punch.type} - {formatDateTime(punch.time)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Correction Reason *
                  </label>
                  <textarea
                    value={correctionForm.reason}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                    placeholder="Explain why this correction is needed"
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

        {/* REVIEW CORRECTION MODAL */}
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
                    setSubmitting(false);
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
                    <p className="text-sm text-muted-foreground">Requested Change:</p>
                    <p className="font-medium text-foreground">{selectedCorrection.reason}</p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status:</p>
                  <p className={`font-medium text-sm ${getStatusBadgeColor(selectedCorrection.status)}`}>
                    {selectedCorrection.status}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Review Note (Optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add comments about your decision"
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
                      setSubmitting(false);
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

