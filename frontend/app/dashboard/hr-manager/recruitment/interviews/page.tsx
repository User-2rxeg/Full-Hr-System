'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getInterviews,
  scheduleInterview,
  cancelInterview,
  completeInterview,
  updateInterview,
  getApplications,
  getEmployees,
} from '@/app/services/recruitment';
import { Interview, Application } from '@/app/types/recruitment';
import { ApplicationStage, InterviewMethod, InterviewStatus } from '@/app/types/enums';

// REC-010: Schedule and manage interview invitations
// REC-021: Coordinate interview panels (members, availability, scoring)

export default function InterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  // Create a map of applicationId to application for quick lookup
  const applicationMap = useMemo(() => {
    const map: Record<string, Application> = {};
    applications.forEach(app => {
      map[app.id] = app;
    });
    return map;
  }, [applications]);

  // Schedule form state
  const [formData, setFormData] = useState({
    applicationId: '',
    stage: ApplicationStage.SCREENING,
    scheduledDate: '',
    method: InterviewMethod.ONSITE,
    panel: [] as string[],
    videoLink: '',
    location: '',
    notes: '',
  });

  // Reschedule form state
  const [rescheduleData, setRescheduleData] = useState({
    scheduledDate: '',
    method: InterviewMethod.ONSITE,
    videoLink: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [interviewsData, appsData, employeesData] = await Promise.all([
        getInterviews(), // Get all interviews
        getApplications({}), // Get all applications
        getEmployees(),
      ]);

      setInterviews(interviewsData);
      setApplications(appsData);
      setEmployees(employeesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get candidate info from application
  const getCandidateInfo = (applicationId: string) => {
    const app = applicationMap[applicationId];
    if (app) {
      return {
        name: app.candidateName || 'Unknown Candidate',
        jobTitle: app.jobTitle || 'Unknown Position',
      };
    }
    return { name: 'Unknown Candidate', jobTitle: 'Unknown Position' };
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.applicationId) {
      alert('Please select an application');
      return;
    }
    if (formData.panel.length === 0) {
      alert('Please select at least one panel member');
      return;
    }
    if (!formData.scheduledDate) {
      alert('Please select a date and time');
      return;
    }
    
    try {
      await scheduleInterview({
        applicationId: formData.applicationId,
        stage: formData.stage,
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        method: formData.method,
        panel: formData.panel,
        videoLink: formData.videoLink || undefined,
      });
      setShowScheduleModal(false);
      setFormData({
        applicationId: '',
        stage: ApplicationStage.SCREENING,
        scheduledDate: '',
        method: InterviewMethod.ONSITE,
        panel: [],
        videoLink: '',
        location: '',
        notes: '',
      });
      await fetchData();
      alert('Interview scheduled successfully!');
    } catch (err: any) {
      // Handle specific error cases
      const errorMsg = err.message || 'Failed to schedule interview';
      if (errorMsg.includes('409') || errorMsg.includes('Conflict') || errorMsg.includes('already exists')) {
        alert('An interview for this stage already exists for this application. Please choose a different stage or cancel the existing interview first.');
      } else if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        alert('Invalid data. Please check all fields and try again.');
      } else {
        alert(`Failed to schedule interview: ${errorMsg}`);
      }
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;
    
    try {
      await updateInterview(selectedInterview.id, {
        scheduledDate: rescheduleData.scheduledDate,
        method: rescheduleData.method,
        videoLink: rescheduleData.videoLink || undefined,
      });
      setShowRescheduleModal(false);
      setSelectedInterview(null);
      setRescheduleData({
        scheduledDate: '',
        method: InterviewMethod.ONSITE,
        videoLink: '',
        location: '',
        notes: '',
      });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to reschedule interview: ${err.message}`);
    }
  };

  const openRescheduleModal = (interview: Interview) => {
    setSelectedInterview(interview);
    setRescheduleData({
      scheduledDate: interview.scheduledDate.slice(0, 16), // Format for datetime-local input
      method: interview.method,
      videoLink: interview.videoLink || '',
      location: '',
      notes: '',
    });
    setShowRescheduleModal(true);
  };

  const handleCancel = async (interviewId: string) => {
    const reason = prompt('Cancellation reason:');
    if (!reason) return;

    try {
      await cancelInterview(interviewId, reason);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to cancel interview: ${err.message}`);
    }
  };

  const handleComplete = async (interviewId: string) => {
    if (!confirm('Mark this interview as completed?')) return;

    try {
      await completeInterview(interviewId);
      await fetchData();
    } catch (err: any) {
      alert(`Failed to complete interview: ${err.message}`);
    }
  };

  const togglePanelMember = (employeeId: string) => {
    setFormData((prev) => ({
      ...prev,
      panel: prev.panel.includes(employeeId)
        ? prev.panel.filter((id) => id !== employeeId)
        : [...prev.panel, employeeId],
    }));
  };

  const getStatusBadge = (status: InterviewStatus): string => {
    const badges: Record<InterviewStatus, string> = {
      [InterviewStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
      [InterviewStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [InterviewStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getMethodLabel = (method: InterviewMethod): string => {
    const labels: Record<InterviewMethod, string> = {
      [InterviewMethod.ONSITE]: 'Onsite',
      [InterviewMethod.VIDEO]: 'Video',
      [InterviewMethod.PHONE]: 'Phone',
    };
    return labels[method] || method;
  };

  const getStageLabel = (stage: ApplicationStage): string => {
    const labels: Record<ApplicationStage, string> = {
      [ApplicationStage.SCREENING]: 'Screening',
      [ApplicationStage.DEPARTMENT_INTERVIEW]: 'Department Interview',
      [ApplicationStage.HR_INTERVIEW]: 'HR Interview',
      [ApplicationStage.OFFER]: 'Offer',
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading interviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={fetchData} className="mt-2 text-red-600 underline hover:text-red-800">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Interview Management</h1>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Schedule Interview
        </button>
      </div>

      {/* Interviews Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Panel Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No upcoming interviews
                  </td>
                </tr>
              ) : (
                interviews.map((interview) => {
                  const candidateInfo = getCandidateInfo(interview.applicationId);
                  return (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{candidateInfo.name}</div>
                        <div className="text-xs text-gray-500">{candidateInfo.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStageLabel(interview.stage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(interview.scheduledDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getMethodLabel(interview.method)}
                        {interview.videoLink && (
                          <a href={interview.videoLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-800">
                            🔗
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {interview.panel?.length || 0} members
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                            interview.status
                          )}`}
                        >
                          {interview.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {interview.status === InterviewStatus.SCHEDULED && (
                          <>
                            <button
                              onClick={() => openRescheduleModal(interview)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/hr-manager/recruitment/interviews/${interview.id}/feedback`)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              Feedback
                            </button>
                            <button
                              onClick={() => handleComplete(interview.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleCancel(interview.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {interview.status === InterviewStatus.COMPLETED && (
                          <button
                            onClick={() => router.push(`/dashboard/hr-manager/recruitment/interviews/${interview.id}/feedback`)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            View Feedback
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Schedule Interview</h2>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application *
                </label>
                <select
                  required
                  value={formData.applicationId}
                  onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Application</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.candidateName} - {app.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
                <select
                  required
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as ApplicationStage })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={ApplicationStage.SCREENING}>Screening</option>
                  <option value={ApplicationStage.DEPARTMENT_INTERVIEW}>Department Interview</option>
                  <option value={ApplicationStage.HR_INTERVIEW}>HR Interview</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
                <select
                  required
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as InterviewMethod })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={InterviewMethod.ONSITE}>Onsite</option>
                  <option value={InterviewMethod.VIDEO}>Video</option>
                  <option value={InterviewMethod.PHONE}>Phone</option>
                </select>
              </div>

              {formData.method === InterviewMethod.VIDEO && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Link
                  </label>
                  <input
                    type="url"
                    value={formData.videoLink}
                    onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                    placeholder="https://zoom.us/..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Meeting Room A, Floor 3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for the interview..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Panel * (Select at least one)
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="text-sm text-gray-500">No employees available</div>
                  ) : (
                    employees.map((emp: any) => (
                      <label key={emp.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.panel.includes(emp.id)}
                          onChange={() => togglePanelMember(emp.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{emp.fullName || emp.name || emp.id}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.panel.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Reschedule Interview</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Candidate:</strong> {getCandidateInfo(selectedInterview.applicationId).name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Position:</strong> {getCandidateInfo(selectedInterview.applicationId).jobTitle}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Current Date:</strong> {new Date(selectedInterview.scheduledDate).toLocaleString()}
              </p>
            </div>
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Date & Time *
                </label>
                <input
                  required
                  type="datetime-local"
                  value={rescheduleData.scheduledDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, scheduledDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={rescheduleData.method}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, method: e.target.value as InterviewMethod })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={InterviewMethod.ONSITE}>Onsite</option>
                  <option value={InterviewMethod.VIDEO}>Video</option>
                  <option value={InterviewMethod.PHONE}>Phone</option>
                </select>
              </div>

              {rescheduleData.method === InterviewMethod.VIDEO && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Link
                  </label>
                  <input
                    type="url"
                    value={rescheduleData.videoLink}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, videoLink: e.target.value })}
                    placeholder="https://zoom.us/..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={rescheduleData.location}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, location: e.target.value })}
                  placeholder="e.g., Meeting Room A, Floor 3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, notes: e.target.value })}
                  placeholder="Reason for rescheduling or additional notes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setSelectedInterview(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
