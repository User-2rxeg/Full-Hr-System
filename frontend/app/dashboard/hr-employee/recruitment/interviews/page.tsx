'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { ApplicationStage, InterviewMethod, InterviewStatus } from '@/app/types/enums';
import {
  getInterviews,
  getApplications,
  scheduleInterview,
  cancelInterview,
  rescheduleInterview,
  getEmployees
} from '@/app/services/recruitment';

// =====================================================
// Types
// =====================================================

interface PanelMember {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  available: boolean;
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

interface ApplicationForInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  currentStage: ApplicationStage;
}

interface ScheduledInterview {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  method: InterviewMethod;
  panelMembers: string[];
  status: InterviewStatus;
  videoLink?: string;
  location?: string;
}

interface NewInterview {
  applicationId: string;
  stage: ApplicationStage;
  selectedPanel: string[];
  selectedSlot: string;
  method: InterviewMethod;
  videoLink: string;
  location: string;
  notes: string;
}

// Generate time slots for the next 7 days
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const today = new Date();

  for (let day = 1; day <= 7; day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split('T')[0];

    // Morning slots
    slots.push({ id: `${dateStr}-0900`, date: dateStr, startTime: '09:00', endTime: '10:00', available: true });
    slots.push({ id: `${dateStr}-1030`, date: dateStr, startTime: '10:30', endTime: '11:30', available: true });

    // Afternoon slots
    slots.push({ id: `${dateStr}-1400`, date: dateStr, startTime: '14:00', endTime: '15:00', available: true });
    slots.push({ id: `${dateStr}-1530`, date: dateStr, startTime: '15:30', endTime: '16:30', available: true });
  }

  return slots;
}

// =====================================================
// Components
// =====================================================

function InterviewMethodBadge({ method }: { method: InterviewMethod }) {
  const config = {
    [InterviewMethod.ONSITE]: { label: 'Onsite', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    [InterviewMethod.VIDEO]: { label: 'Video Call', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    [InterviewMethod.PHONE]: { label: 'Phone', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  // Handle case sensitivity or missing config
  const methodKey = Object.keys(config).find(k => k.toLowerCase() === method?.toLowerCase()) as InterviewMethod | undefined;
  const safeConfig = methodKey ? config[methodKey] : undefined;

  if (!safeConfig) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {method || 'Unknown'}
      </span>
    );
  }

  const { label, color } = safeConfig;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const config = {
    [InterviewStatus.SCHEDULED]: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    [InterviewStatus.COMPLETED]: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    [InterviewStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  // Handle case sensitivity or missing config
  const statusKey = Object.keys(config).find(k => k.toLowerCase() === status?.toLowerCase()) as InterviewStatus | undefined;
  const safeConfig = statusKey ? config[statusKey] : undefined;

  if (!safeConfig) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  }

  const { label, color } = safeConfig;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

// Confirmation Modal
function ConfirmationModal({
  interview,
  application,
  panelMembers,
  timeSlot,
  onConfirm,
  onCancel,
  isSubmitting,
}: {
  interview: NewInterview;
  application: ApplicationForInterview | undefined;
  panelMembers: PanelMember[];
  timeSlot: TimeSlot | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const selectedPanelNames = panelMembers
    .filter((m) => interview.selectedPanel.includes(m.id))
    .map((m) => m.name);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Confirm Interview</h2>
          <p className="text-slate-600 mt-1">Please review the interview details before scheduling.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500">Candidate</label>
              <p className="font-medium text-slate-900">{application?.candidateName || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Position</label>
              <p className="font-medium text-slate-900">{application?.jobTitle || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Date & Time</label>
              <p className="font-medium text-slate-900">
                {timeSlot
                  ? `${new Date(timeSlot.date).toLocaleDateString()} ${timeSlot.startTime} - ${timeSlot.endTime}`
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Method</label>
              <p className="font-medium text-slate-900">
                <InterviewMethodBadge method={interview.method} />
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500">Panel Members</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedPanelNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {interview.method === InterviewMethod.VIDEO && interview.videoLink && (
            <div>
              <label className="text-sm text-slate-500">Video Link</label>
              <p className="font-medium text-indigo-600 break-all">{interview.videoLink}</p>
            </div>
          )}

          {interview.method === InterviewMethod.ONSITE && interview.location && (
            <div>
              <label className="text-sm text-slate-500">Location</label>
              <p className="font-medium text-slate-900">{interview.location}</p>
            </div>
          )}

          {interview.notes && (
            <div>
              <label className="text-sm text-slate-500">Notes</label>
              <p className="text-slate-700">{interview.notes}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Note:</strong> Calendar invites will be sent automatically to the candidate and panel members.
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="default" onClick={onConfirm} disabled={isSubmitting}>
            Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function InterviewSchedulingPage() {
  const searchParams = useSearchParams();
  const preselectedAppId = searchParams.get('applicationId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationForInterview[]>([]);
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newInterview, setNewInterview] = useState<NewInterview>({
    applicationId: preselectedAppId || '',
    stage: ApplicationStage.DEPARTMENT_INTERVIEW,
    selectedPanel: [],
    selectedSlot: '',
    method: InterviewMethod.VIDEO,
    videoLink: '',
    location: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [cancellingInterviewId, setCancellingInterviewId] = useState<string | null>(null);

  // Load data from API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL applications (not filtered by stage)
      const [apps, interviews, employees] = await Promise.all([
        getApplications(), // Get all applications
        getInterviews(),
        getEmployees(),
      ]);

      // Filter applications that can have interviews scheduled (not rejected/withdrawn)
      const eligibleApps = apps.filter(app => {
        const stage = app.currentStage?.toLowerCase();
        return (
          stage === ApplicationStage.SCREENING ||
          stage === ApplicationStage.DEPARTMENT_INTERVIEW ||
          stage === ApplicationStage.HR_INTERVIEW
        );
      });

      // Map applications for interview selection
      const appList: ApplicationForInterview[] = eligibleApps.map((app) => ({
        id: app.id,
        applicationId: app.id,
        candidateName: app.candidateName || 'Unknown',
        candidateEmail: app.candidateEmail || '',
        jobTitle: app.jobTitle || 'Untitled Position',
        departmentName: app.departmentName || 'Not specified',
        currentStage: (app.currentStage?.toLowerCase() as ApplicationStage) || ApplicationStage.SCREENING,
      }));

      console.log('📊 Interview Scheduling - Data Loaded:');
      console.log('  Total Applications:', apps.length);
      console.log('  Eligible Applications:', eligibleApps.length);
      console.log('  Interviews:', interviews.length);
      console.log('  Panel Members:', employees.length);
      console.log('  Applications List:', appList);

      setApplications(appList);

      // Map interviews - get candidate names from applications
      // Also lookup from all apps not just eligible ones
      const interviewList: ScheduledInterview[] = interviews.map((int: any) => {
        // Find the application to get candidate details
        const app = apps.find(a => a.id === int.applicationId);

        // Handle panel members - could be array of objects with employeeName or array of IDs
        let panelNames: string[] = [];
        if (int.panelMembers && Array.isArray(int.panelMembers)) {
          panelNames = int.panelMembers.map((p: any) => {
            if (typeof p === 'string') return p;
            if (p.employeeName) return p.employeeName;
            if (p.name) return p.name;
            return 'Unknown';
          });
        } else if (int.panel && Array.isArray(int.panel)) {
          panelNames = int.panel.map((id: string) => {
            const emp = employees.find((e: any) => e.id === id) as any;
            return emp?.fullName || emp?.name || id;
          });
        }

        return {
          id: int.id,
          applicationId: int.applicationId,
          candidateName: app?.candidateName || 'Unknown Candidate',
          jobTitle: app?.jobTitle || 'Unknown Position',
          scheduledDate: int.scheduledDate?.split('T')[0] || '',
          startTime: int.scheduledDate ? new Date(int.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          endTime: '',
          method: int.method,
          panelMembers: panelNames,
          status: int.status,
          videoLink: int.videoLink,
        };
      });
      console.log('Interviews mapped:', interviewList);
      setScheduledInterviews(interviewList);

      // Map employees as panel members
      const panelList: PanelMember[] = (employees as any[]).map((emp) => ({
        id: emp.id,
        name: emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
        role: emp.position?.title || emp.position || emp.jobTitle || 'Employee',
        department: emp.department?.name || emp.departmentName || emp.department || 'Not specified',
        email: emp.workEmail || emp.email || '',
        available: true,
      }));
      console.log('Panel members mapped:', panelList);
      setPanelMembers(panelList);

      // Generate time slots
      setTimeSlots(generateTimeSlots());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-open form if applicationId is provided
  useEffect(() => {
    if (preselectedAppId && !loading) {
      setShowScheduleForm(true);
      setNewInterview((prev) => ({ ...prev, applicationId: preselectedAppId }));
    }
  }, [preselectedAppId, loading]);

  // Toggle panel member selection (BR-19, BR-20)
  const togglePanelMember = (memberId: string) => {
    setNewInterview((prev) => ({
      ...prev,
      selectedPanel: prev.selectedPanel.includes(memberId)
        ? prev.selectedPanel.filter((id) => id !== memberId)
        : [...prev.selectedPanel, memberId],
    }));
  };

  // Validate form (BR-19)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newInterview.applicationId) {
      newErrors.applicationId = 'Please select a candidate';
    }

    if (newInterview.selectedPanel.length === 0) {
      newErrors.panel = 'Please select at least one panel member';
    }

    if (!newInterview.selectedSlot) {
      newErrors.slot = 'Please select a time slot';
    }

    if (newInterview.method === InterviewMethod.VIDEO && !newInterview.videoLink) {
      newErrors.videoLink = 'Please provide a video meeting link';
    }

    if (newInterview.method === InterviewMethod.ONSITE && !newInterview.location) {
      newErrors.location = 'Please provide the interview location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle schedule click
  const handleScheduleClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // Handle reschedule interview (Test Case 10.10)
  const handleReschedule = (interviewId: string) => {
    const interview = scheduledInterviews.find(i => i.id === interviewId);
    if (interview) {
      setNewInterview({
        applicationId: interview.applicationId,
        stage: ApplicationStage.DEPARTMENT_INTERVIEW,
        selectedPanel: [],
        selectedSlot: '',
        method: interview.method,
        videoLink: interview.videoLink || '',
        location: interview.location || '',
        notes: '',
      });
      setEditingInterviewId(interviewId);
      setShowScheduleForm(true);
    }
  };

  // Handle cancel interview (Test Case 10.11)
  const handleCancelInterview = async (interviewId: string) => {
    const reason = prompt('Please provide a reason for cancellation (optional):');

    if (!confirm('Are you sure you want to cancel this interview? Notifications will be sent to all participants.')) {
      return;
    }

    setCancellingInterviewId(interviewId);
    try {
      // Call cancel API endpoint (BR-19d: notifications sent automatically)
      await cancelInterview(interviewId, reason || undefined);

      // Update local state
      setScheduledInterviews(prev =>
        prev.map(i =>
          i.id === interviewId
            ? { ...i, status: InterviewStatus.CANCELLED }
            : i
        )
      );
      setSuccessMessage('Interview cancelled successfully. Notifications sent to all participants.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel interview');
    } finally {
      setCancellingInterviewId(null);
    }
  };

  // Confirm and submit (BR-19)
  const handleConfirmSchedule = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedSlot = timeSlots.find((s) => s.id === newInterview.selectedSlot);

      if (!selectedSlot) {
        setError('Please select a valid time slot');
        return;
      }

      const scheduledDate = new Date(`${selectedSlot.date}T${selectedSlot.startTime}:00`);

      let createdInterview;
      try {
        createdInterview = await scheduleInterview({
          applicationId: newInterview.applicationId,
          stage: newInterview.stage,
          scheduledDate: scheduledDate.toISOString(),
          method: newInterview.method,
          panel: newInterview.selectedPanel,
          videoLink: newInterview.method === InterviewMethod.VIDEO ? newInterview.videoLink : undefined,
        });
      } catch (scheduleErr: any) {
        const errMsg = scheduleErr.message || '';
        if (errMsg.includes('409') || errMsg.includes('Conflict') || errMsg.includes('already exists')) {
          setError('An interview for this stage already exists for this application. Please choose a different stage or reschedule the existing interview.');
        } else {
          setError(errMsg || 'Failed to schedule interview');
        }
        setIsSubmitting(false);
        setShowConfirmation(false);
        return;
      }

      const selectedApp = applications.find((a) => a.id === newInterview.applicationId);
      const selectedPanelNames = panelMembers
        .filter((m) => newInterview.selectedPanel.includes(m.id))
        .map((m) => m.name);

      if (selectedApp && createdInterview) {
        const newScheduledInterview: ScheduledInterview = {
          id: createdInterview.id,
          applicationId: newInterview.applicationId,
          candidateName: selectedApp.candidateName,
          jobTitle: selectedApp.jobTitle,
          scheduledDate: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          method: newInterview.method,
          panelMembers: selectedPanelNames,
          status: InterviewStatus.SCHEDULED,
          videoLink: newInterview.method === InterviewMethod.VIDEO ? newInterview.videoLink : undefined,
          location: newInterview.method === InterviewMethod.ONSITE ? newInterview.location : undefined,
        };

        setScheduledInterviews((prev) => [newScheduledInterview, ...prev]);

        // Mark slot as unavailable
        setTimeSlots((prev) =>
          prev.map((slot) =>
            slot.id === newInterview.selectedSlot ? { ...slot, available: false } : slot
          )
        );
      }

      setShowConfirmation(false);
      setShowScheduleForm(false);
      setNewInterview({
        applicationId: '',
        stage: ApplicationStage.DEPARTMENT_INTERVIEW,
        selectedPanel: [],
        selectedSlot: '',
        method: InterviewMethod.VIDEO,
        videoLink: '',
        location: '',
        notes: '',
      });

      setSuccessMessage('Interview scheduled successfully! Calendar invites have been sent.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedApplication = applications.find((a) => a.id === newInterview.applicationId);
  const selectedTimeSlot = timeSlots.find((s) => s.id === newInterview.selectedSlot);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Scheduling</h1>
          <p className="text-slate-600 mt-1">
            Schedule and manage candidate interviews
          </p>
        </div>
        <Button variant="default" onClick={() => setShowScheduleForm(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Interview
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Pending Scheduling</p>
          <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">
            {scheduledInterviews.filter((i) => i.status === InterviewStatus.SCHEDULED).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">
            {scheduledInterviews.filter((i) => i.status === InterviewStatus.COMPLETED).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Available Slots</p>
          <p className="text-2xl font-bold text-indigo-600">
            {timeSlots.filter((s) => s.available).length}
          </p>
        </div>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card className="mb-6">
          <div className="space-y-6">
            {/* Select Candidate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Candidate <span className="text-red-500">*</span>
              </label>
              <select
                value={newInterview.applicationId}
                onChange={(e) => setNewInterview({ ...newInterview, applicationId: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 ${errors.applicationId ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'
                  }`}
              >
                <option value="">Choose a candidate...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.candidateName} - {app.jobTitle} ({app.departmentName})
                  </option>
                ))}
              </select>
              {selectedApplication && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Candidate:</strong> {selectedApplication.candidateName}
                  </p>
                  <p className="text-sm">
                    <strong>Position:</strong> {selectedApplication.jobTitle}
                  </p>
                  <p className="text-sm">
                    <strong>Department:</strong> {selectedApplication.departmentName}
                  </p>
                  <p className="text-sm">
                    <strong>Current Stage:</strong> {selectedApplication.currentStage}
                  </p>
                </div>
              )}
              {errors.applicationId && (
                <p className="text-red-600 text-sm mt-1">{errors.applicationId}</p>
              )}
            </div>

            {/* Interview Stage */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interview Stage
              </label>
              <select
                value={newInterview.stage}
                onChange={(e) => setNewInterview({ ...newInterview, stage: e.target.value as ApplicationStage })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={ApplicationStage.DEPARTMENT_INTERVIEW}>Department Interview</option>
                <option value={ApplicationStage.HR_INTERVIEW}>HR Interview</option>
              </select>
            </div>

            {/* Panel Members Selection (BR-19, BR-20) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Panel Members <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-slate-500 mb-3">
                Select interviewers. Panel members should have relevant expertise (BR-20).
              </p>
              <div className="grid grid-cols-2 gap-3">
                {panelMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => member.available && togglePanelMember(member.id)}
                    disabled={!member.available}
                    title={`${member.name} - ${member.role} (${member.department}) - ${member.email}${!member.available ? ' - Unavailable' : ''}`}
                    className={`p-3 rounded-lg border text-left transition-colors ${newInterview.selectedPanel.includes(member.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : member.available
                        ? 'border-slate-200 hover:border-indigo-300'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{member.name}</p>
                        <p className="text-sm text-slate-500 truncate">{member.role}</p>
                        <p className="text-xs text-slate-400 truncate">{member.department}</p>
                        {member.available && (
                          <p className="text-xs text-emerald-600 mt-0.5">✓ Available</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {newInterview.selectedPanel.includes(member.id) && (
                          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {!member.available && (
                          <span className="text-xs text-red-600 font-medium">✗ Busy</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {errors.panel && <p className="text-red-600 text-sm mt-1">{errors.panel}</p>}

              {/* Selected Panel Summary */}
              {newInterview.selectedPanel.length > 0 && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-indigo-900 mb-2">
                    Selected Panel Members ({newInterview.selectedPanel.length}):
                  </p>
                  <div className="space-y-1">
                    {panelMembers
                      .filter(m => newInterview.selectedPanel.includes(m.id))
                      .map(member => (
                        <div key={member.id} className="flex items-center justify-between text-sm">
                          <span className="text-indigo-700">
                            {member.name} - {member.role}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              togglePanelMember(member.id);
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time Slot Selection (BR-19) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Available Time Slots <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => slot.available && setNewInterview({ ...newInterview, selectedSlot: slot.id })}
                    disabled={!slot.available}
                    className={`p-3 rounded-lg border text-center transition-colors ${newInterview.selectedSlot === slot.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : slot.available
                        ? 'border-slate-200 hover:border-indigo-300'
                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <p className="font-medium text-slate-900">
                      {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {slot.startTime} - {slot.endTime}
                    </p>
                    {!slot.available && (
                      <span className="text-xs text-red-500">Booked</span>
                    )}
                  </button>
                ))}
              </div>
              {errors.slot && <p className="text-red-600 text-sm mt-1">{errors.slot}</p>}
            </div>

            {/* Interview Mode (BR-19) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interview Mode <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {[
                  { value: InterviewMethod.VIDEO, label: 'Video Call', icon: '📹' },
                  { value: InterviewMethod.ONSITE, label: 'Onsite', icon: '🏢' },
                  { value: InterviewMethod.PHONE, label: 'Phone', icon: '📞' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setNewInterview({ ...newInterview, method: option.value })}
                    className={`flex-1 p-4 rounded-lg border text-center transition-colors ${newInterview.method === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300'
                      }`}
                  >
                    <span className="text-2xl mb-1 block">{option.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Link (if video) */}
            {newInterview.method === InterviewMethod.VIDEO && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Video Meeting Link <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newInterview.videoLink}
                  onChange={(e) => setNewInterview({ ...newInterview, videoLink: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
                {errors.videoLink && <p className="text-red-600 text-sm mt-1">{errors.videoLink}</p>}
              </div>
            )}

            {/* Location (if onsite) */}
            {newInterview.method === InterviewMethod.ONSITE && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interview Location <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newInterview.location}
                  onChange={(e) => setNewInterview({ ...newInterview, location: e.target.value })}
                  placeholder="Meeting Room A, 3rd Floor"
                />
                {errors.location && <p className="text-red-600 text-sm mt-1">{errors.location}</p>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={newInterview.notes}
                onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any special instructions or notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleScheduleClick}>
                Review & Schedule
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Scheduled Interviews */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Panel
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {scheduledInterviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No interviews scheduled yet.
                  </td>
                </tr>
              ) : (
                scheduledInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{interview.candidateName}</p>
                      <p className="text-sm text-slate-500">{interview.jobTitle}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">
                        {new Date(interview.scheduledDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-500">
                        {interview.startTime} - {interview.endTime}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <InterviewMethodBadge method={interview.method} />
                      {interview.videoLink && (
                        <a
                          href={interview.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                        >
                          Join Meeting →
                        </a>
                      )}
                      {interview.location && (
                        <p className="text-xs text-slate-500 mt-1">{interview.location}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {interview.panelMembers.map((name, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <InterviewStatusBadge status={interview.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {interview.status === InterviewStatus.COMPLETED && (
                          <Link href={`/dashboard/hr-employee/recruitment/interviews/${interview.id}`}>
                            <Button variant="default" size="sm">
                              Add Feedback
                            </Button>
                          </Link>
                        )}
                        {interview.status === InterviewStatus.SCHEDULED && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReschedule(interview.id)}
                            >
                              Reschedule
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelInterview(interview.id)}
                              disabled={cancellingInterviewId === interview.id}
                            >
                              {cancellingInterviewId === interview.id ? 'Cancelling...' : 'Cancel'}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          interview={newInterview}
          application={selectedApplication}
          panelMembers={panelMembers}
          timeSlot={selectedTimeSlot}
          onConfirm={handleConfirmSchedule}
          onCancel={() => setShowConfirmation(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
