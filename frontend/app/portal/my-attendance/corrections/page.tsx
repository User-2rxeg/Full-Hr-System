'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { timeManagementService } from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';

export default function AttendanceCorrectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingRecords, setFetchingRecords] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [correctionSummary, setCorrectionSummary] = useState<{ [key: string]: number }>({});
  const [allCorrections, setAllCorrections] = useState<any[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    attendanceRecordId: '',
    correctionType: 'INCORRECT_PUNCH_OUT',
    correctedPunchDate: '',
    correctedPunchLocalTime: '',
    reason: '',
  });

  // Correction type options
  const correctionTypes = [
    { value: 'MISSING_PUNCH_IN', label: 'Missing Clock In', description: 'Forgot to clock in', isIn: true },
    { value: 'MISSING_PUNCH_OUT', label: 'Missing Clock Out', description: 'Forgot to clock out', isIn: false },
    { value: 'INCORRECT_PUNCH_IN', label: 'Wrong Clock In Time', description: 'Clocked in at wrong time', isIn: true },
    { value: 'INCORRECT_PUNCH_OUT', label: 'Wrong Clock Out Time', description: 'Clocked out at wrong time', isIn: false },
  ];

  // Fetch attendance records for the employee
  useEffect(() => {
    const fetchRecords = async () => {
      if (!user?.id) return;

      try {
        setFetchingRecords(true);
        // Get current month attendance
        const now = new Date();
        const response = await timeManagementService.getMonthlyAttendance(
          user.id,
          now.getMonth() + 1,
          now.getFullYear()
        );

        if (response.data && Array.isArray(response.data)) {
          // Filter records that have punches
          const recordsWithPunches = response.data.filter((r: any) => r.punches && r.punches.length > 0);
          setAttendanceRecords(recordsWithPunches);
        }

        // Also fetch corrections to show summary
        try {
          const correctionsResponse = await timeManagementService.getEmployeeCorrections(user.id);
          console.log('Corrections Response:', correctionsResponse);

          if (correctionsResponse.data && Array.isArray(correctionsResponse.data)) {
            console.log('Corrections Data:', correctionsResponse.data);

            // Store all corrections
            setAllCorrections(correctionsResponse.data);

            // Count corrections by status
            const statusCounts: { [key: string]: number } = {};
            correctionsResponse.data.forEach((correction: any) => {
              const status = correction.status || 'UNKNOWN';
              statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            console.log('Status Counts:', statusCounts);
            setCorrectionSummary(statusCounts);
          } else {
            console.warn('No corrections data received or data is not an array');
          }
        } catch (corrErr) {
          console.error('Failed to fetch corrections summary:', corrErr);
        }
      } catch (err) {
        console.error('Failed to fetch attendance records:', err);
      } finally {
        setFetchingRecords(false);
      }
    };

    fetchRecords();
  }, [user?.id]);

  // Format date from attendance record for display
  const getRecordDate = (record: any) => {
    if (record.punches && record.punches.length > 0) {
      const firstPunch = record.punches[0];
      return new Date(firstPunch.time).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return 'Unknown date';
  };

  // Get date from attendance record in yyyy-MM-dd format for input field
  const getRecordDateForInput = (recordId: string) => {
    const record = attendanceRecords.find(r => r._id === recordId);
    if (record && record.punches && record.punches.length > 0) {
      const firstPunch = record.punches[0];
      const date = new Date(firstPunch.time);
      return date.toISOString().split('T')[0]; // Returns yyyy-MM-dd format
    }
    return '';
  };

  // Handle attendance record selection
  const handleRecordSelect = (recordId: string) => {
    const dateForInput = getRecordDateForInput(recordId);
    setFormData({
      ...formData,
      attendanceRecordId: recordId,
      correctedPunchDate: dateForInput,
    });
  };

  // Convert date to dd/MM/yyyy format
  const formatDateForBackend = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Parse dd/MM/yyyy format string to Date object
  const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Try parsing dd/MM/yyyy format
    const ddMmYyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateStr.match(ddMmYyyyRegex);

    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(match[3], 10);
      return new Date(year, month, day);
    }

    // Fallback to standard parsing
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return 'Invalid Date';

    let date: Date | null = null;

    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'string') {
      date = parseDateString(dateStr);
    }

    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError('User not authenticated');
      return;
    }

    if (!formData.attendanceRecordId) {
      setError('Please select an attendance record to correct');
      return;
    }

    if (!formData.correctedPunchDate || !formData.correctedPunchLocalTime || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        employeeId: user.id,
        attendanceRecordId: formData.attendanceRecordId,
        correctionType: formData.correctionType,
        reason: formData.reason,
        correctedPunchDate: formatDateForBackend(formData.correctedPunchDate),
        correctedPunchLocalTime: formData.correctedPunchLocalTime,
      };

      const response = await timeManagementService.requestCorrection(requestData);

      if (response.error) {
        throw new Error(response.error);
      }

      // Check if response indicates an issue
      if (response.data && (response.data as any).ok === false) {
        setError((response.data as any).message || 'Unable to process correction request');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/my-attendance');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200">Correction Request Submitted</h2>
            <p className="text-green-600 dark:text-green-400 mt-2">Your correction request has been submitted for approval.</p>
            <p className="text-sm text-green-500 dark:text-green-500 mt-4">Redirecting to My Attendance...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/portal/my-attendance"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Attendance
            </Link>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Request Correction</h1>
            <p className="text-muted-foreground mt-1">Submit a correction for your attendance record</p>
          </div>
        </div>

        {/* Correction Status Summary */}
        {Object.keys(correctionSummary).length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Your Correction Requests</h3>
              {selectedStatusFilter && (
                <button
                  onClick={() => setSelectedStatusFilter(null)}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {/* Status Configuration */}
              {[
                {
                  key: 'SUBMITTED',
                  label: 'Submitted',
                  color: 'text-yellow-600 dark:text-yellow-400',
                  description: 'Waiting for review'
                },
                {
                  key: 'IN_REVIEW',
                  label: 'In Review',
                  color: 'text-blue-600 dark:text-blue-400',
                  description: 'Being reviewed'
                },
                {
                  key: 'APPROVED',
                  label: 'Approved',
                  color: 'text-green-600 dark:text-green-400',
                  description: 'Ready to apply'
                },
                {
                  key: 'REJECTED',
                  label: 'Rejected',
                  color: 'text-red-600 dark:text-red-400',
                  description: 'Needs revision'
                },
                {
                  key: 'ESCALATED',
                  label: 'Escalated',
                  color: 'text-orange-600 dark:text-orange-400',
                  description: 'Higher review'
                }
              ].map((status) =>
                correctionSummary[status.key] !== undefined && (
                  <button
                    key={status.key}
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === status.key ? null : status.key)}
                    className={`bg-white dark:bg-blue-950 rounded-lg p-3 text-center hover:shadow-md transition-all cursor-pointer border-2 ${
                      selectedStatusFilter === status.key
                        ? 'border-primary shadow-md'
                        : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${status.color}`}>
                      {correctionSummary[status.key]}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-medium">{status.label}</div>
                    <div className="text-xs text-muted-foreground/70">{status.description}</div>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Filtered Corrections List */}
        {selectedStatusFilter && allCorrections.filter(c => c.status === selectedStatusFilter).length > 0 && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {selectedStatusFilter} Corrections ({allCorrections.filter(c => c.status === selectedStatusFilter).length})
            </h3>
            <div className="space-y-3">
              {allCorrections
                .filter(c => c.status === selectedStatusFilter)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((correction) => (
                  <div key={correction._id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Request Status</p>
                        <p className="text-sm font-medium text-foreground mt-1">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            correction.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                            correction.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                            correction.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                            correction.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                            'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
                          }`}>
                            {correction.status}
                          </span>
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Reason for Correction</p>
                        <p className="text-sm text-foreground mt-1">{correction.reason || 'No reason provided'}</p>
                      </div>
                      {correction.attendanceRecord && (
                        <>
                          {correction.attendanceRecord.punches && correction.attendanceRecord.punches.length > 0 && (
                            <>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Attendance Date</p>
                                <p className="text-sm font-medium text-foreground mt-1">
                                  {correction.attendanceRecord.punches[0]
                                    ? new Date(correction.attendanceRecord.punches[0].time).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'N/A'
                                  }
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Recorded Punches</p>
                                <p className="text-sm text-foreground mt-1">
                                  {correction.attendanceRecord.punches.map((punch: any, idx: number) => (
                                    <span key={idx} className="inline-block mr-2">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-1 ${
                                        punch.type === 'IN' 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                                      }`}>
                                        {punch.type}
                                      </span>
                                      {new Date(punch.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </span>
                                  ))}
                                </p>
                              </div>
                            </>
                          )}
                          {(!correction.attendanceRecord.punches || correction.attendanceRecord.punches.length === 0) && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Attendance Record</p>
                              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">No punches recorded - likely a missing punch correction</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
          {/* Select Attendance Record */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Attendance Record</label>
            {fetchingRecords ? (
              <div className="text-sm text-muted-foreground">Loading attendance records...</div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground">No attendance records found for this month.</div>
            ) : (
              <select
                value={formData.attendanceRecordId}
                onChange={(e) => handleRecordSelect(e.target.value)}
                className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select a record to correct...</option>
                {attendanceRecords.map((record) => (
                  <option key={record._id} value={record._id}>
                    {getRecordDate(record)} - {record.punches?.length || 0} punch(es)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Correction Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Correction Type</label>
            <div className="grid grid-cols-2 gap-3">
              {correctionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, correctionType: type.value })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.correctionType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      formData.correctionType === type.value ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {type.isIn ? (
                        <svg className={`w-5 h-5 ${formData.correctionType === type.value ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      ) : (
                        <svg className={`w-5 h-5 ${formData.correctionType === type.value ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <span className={`text-sm font-medium block ${
                        formData.correctionType === type.value ? 'text-primary' : 'text-foreground'
                      }`}>
                        {type.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Corrected Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {formData.correctionType.includes('MISSING') ? 'Missing Punch Date' : 'Corrected Date'}
            </label>
            <input
              type="date"
              value={formData.correctedPunchDate}
              readOnly
              className="w-full px-4 py-2.5 border border-input bg-muted text-foreground rounded-lg focus:outline-none cursor-not-allowed"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date is automatically set from the selected attendance record
            </p>
          </div>

          {/* Corrected Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {formData.correctionType.includes('MISSING')
                ? `Missing ${formData.correctionType.endsWith('IN') ? 'Clock In' : 'Clock Out'} Time`
                : `Correct ${formData.correctionType.endsWith('IN') ? 'Clock In' : 'Clock Out'} Time`
              }
            </label>
            <input
              type="time"
              value={formData.correctedPunchLocalTime}
              onChange={(e) => setFormData({ ...formData, correctedPunchLocalTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reason for Correction</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please explain why you need this correction..."
              rows={4}
              className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link
              href="/portal/my-attendance"
              className="px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || fetchingRecords}
              className="px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Info Notice */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">About Correction Requests</p>
              <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1">
                <li>Correction requests require manager approval</li>
                <li>Please provide accurate details to expedite approval</li>
                <li>You will be notified once your request is processed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

