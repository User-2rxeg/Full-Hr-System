'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';
import {
  getApplicationById,
  getApplicationHistory,
  submitInterviewFeedback,
  getAverageScore,
} from '@/app/services/recruitment';
import { SubmitFeedbackRequest } from '@/app/types/recruitment';

// =====================================================
// Types
// =====================================================

interface CandidateProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture?: string;
  linkedIn?: string;
  portfolio?: string;
}

interface ApplicationDetail {
  id: string;
  applicationId: string;
  candidate: CandidateProfile;
  jobTitle: string;
  departmentName: string;
  currentStage: ApplicationStage;
  status: ApplicationStatus;
  isReferral: boolean;
  referredBy?: string;
  appliedDate: string;
  cvUrl: string;
  cvFileName: string;
  coverLetter?: string;
  expectedSalary?: number;
  noticePeriod?: string;
  scores: FeedbackScore[];
  averageScore?: number;
}

interface FeedbackScore {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  stage: ApplicationStage;
  score: number;
  comments: string;
  createdAt: string;
}

interface CommunicationLog {
  id: string;
  type: 'email' | 'call' | 'note' | 'system';
  subject: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface NewFeedback {
  score: number;
  comments: string;
}

// =====================================================
// Components
// =====================================================

const stageConfig = {
  [ApplicationStage.SCREENING]: {
    label: 'Screening',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  [ApplicationStage.DEPARTMENT_INTERVIEW]: {
    label: 'Dept Interview',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  [ApplicationStage.HR_INTERVIEW]: {
    label: 'HR Interview',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  [ApplicationStage.OFFER]: {
    label: 'Offer',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
};

const statusConfig = {
  [ApplicationStatus.SUBMITTED]: {
    label: 'Submitted',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  [ApplicationStatus.IN_PROCESS]: {
    label: 'In Process',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [ApplicationStatus.OFFER]: {
    label: 'Offer',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [ApplicationStatus.HIRED]: {
    label: 'Hired',
    color: 'bg-green-50 text-green-700 border-green-200',
  },
  [ApplicationStatus.REJECTED]: {
    label: 'Rejected',
    color: 'bg-red-50 text-red-700 border-red-200',
  },
};

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function StageBadge({ stage }: { stage: ApplicationStage }) {
  const config = stageConfig[stage];

  if (!config) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {stage || 'Unknown'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function CommunicationLogIcon({ type }: { type: CommunicationLog['type'] }) {
  const iconStyles = {
    email: { bg: 'bg-blue-100', text: 'text-blue-600' },
    call: { bg: 'bg-green-100', text: 'text-green-600' },
    note: { bg: 'bg-amber-100', text: 'text-amber-600' },
    system: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };

  const icons = {
    email: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    call: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    note: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    system: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  };

  const style = iconStyles[type];

  return (
    <div className={`w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center`}>
      {icons[type]}
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function ApplicationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'feedback' | 'logs'>('profile');
  const [newFeedback, setNewFeedback] = useState<NewFeedback>({ score: 0, comments: '' });
  const [feedbackErrors, setFeedbackErrors] = useState<{ score?: string; comments?: string }>({});
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Load application data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [appData, historyData] = await Promise.all([
        getApplicationById(resolvedParams.id),
        getApplicationHistory(resolvedParams.id).catch(() => []),
      ]);

      // Get average score
      let avgScore = 0;
      try {
        const scoreResult = await getAverageScore(resolvedParams.id);
        avgScore = scoreResult.averageScore || 0;
      } catch {
        // Score might not be available
      }

      // Transform API response to local interface
      const appDetail: ApplicationDetail = {
        id: appData.id,
        applicationId: appData.id || `APP-${appData.id}`,
        candidate: {
          id: appData.candidateId || '',
          firstName: appData.candidateName?.split(' ')[0] || '',
          lastName: appData.candidateName?.split(' ').slice(1).join(' ') || '',
          email: appData.candidateEmail || '',
          phone: '',
          location: '',
        },
        jobTitle: appData.jobTitle || '',
        departmentName: appData.departmentName || '',
        currentStage: appData.currentStage || ApplicationStage.SCREENING,
        status: appData.status || ApplicationStatus.SUBMITTED,
        isReferral: false,
        appliedDate: appData.createdAt || '',
        cvUrl: '',
        cvFileName: 'CV.pdf',
        scores: [],
        averageScore: avgScore,
      };

      setApplication(appDetail);

      // Transform history to communication logs
      const logs: CommunicationLog[] = (historyData as { id: string; type?: string; subject?: string; content?: string; createdBy?: string; createdAt?: string }[] || []).map((h) => ({
        id: h.id,
        type: (h.type || 'system') as CommunicationLog['type'],
        subject: h.subject || '',
        content: h.content || '',
        createdBy: h.createdBy || 'System',
        createdAt: h.createdAt || '',
      }));
      setCommunicationLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate feedback (BR-10, BR-22)
  const validateFeedback = (): boolean => {
    const errors: { score?: string; comments?: string } = {};

    if (newFeedback.score < 1 || newFeedback.score > 100) {
      errors.score = 'Score must be between 1 and 100';
    }

    if (!newFeedback.comments.trim()) {
      errors.comments = 'Comments are required';
    } else if (newFeedback.comments.trim().length < 20) {
      errors.comments = 'Comments must be at least 20 characters';
    }

    setFeedbackErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit feedback - Note: Feedback should be submitted from Interview page
  // This handler is kept for compatibility but shows a message directing to interviews
  const handleSubmitFeedback = async () => {
    if (!validateFeedback() || !application) return;

    try {
      setSubmittingFeedback(true);
      setError(null);

      // Feedback must be submitted via interviews - this is a placeholder
      // In the real flow, users should go to the interview detail page to submit feedback
      setError('Please submit feedback from the Interview detail page. Navigate to Interviews and select the relevant interview.');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle CV download
  const handleDownloadCV = () => {
    if (application?.cvUrl) {
      window.open(application.cvUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Application not found.</p>
        <Link href="/dashboard/hr-employee/recruitment/applications">
          <Button variant="default" className="mt-4">
            Back to Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/hr-employee/recruitment/applications"
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Pipeline
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {application.candidate.firstName} {application.candidate.lastName}
            </h1>
            <p className="text-slate-600 mt-1">
              Application for {application.jobTitle} • {application.applicationId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StageBadge stage={application.currentStage} />
            <StatusBadge status={application.status} />
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {feedbackSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">Feedback submitted successfully!</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {application.isReferral && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                Referred by {application.referredBy}
              </span>
            )}
            {application.averageScore !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Average Score:</span>
                <span className={`text-lg font-bold ${application.averageScore >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {application.averageScore}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {application.status !== ApplicationStatus.REJECTED && application.status !== ApplicationStatus.HIRED && (
              <>
                <Link href={`/dashboard/hr-employee/recruitment/interviews?applicationId=${application.id}`}>
                  <Button variant="outline">Schedule Interview</Button>
                </Link>
                <Link href={`/dashboard/hr-employee/recruitment/applications/${application.id}/reject`}>
                  <Button variant="destructive">Reject</Button>
                </Link>
                {application.currentStage === ApplicationStage.HR_INTERVIEW && (
                  <Link href={`/dashboard/hr-employee/recruitment/offers?applicationId=${application.id}`}>
                    <Button variant="default">Create Offer</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'profile', label: 'Candidate Profile' },
            { id: 'feedback', label: 'Feedback & Scoring' },
            { id: 'logs', label: 'Communication Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Personal Info */}
              <Card>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Full Name</label>
                    <p className="font-medium text-slate-900">
                      {application.candidate.firstName} {application.candidate.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Email</label>
                    <p className="font-medium text-slate-900">{application.candidate.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Phone</label>
                    <p className="font-medium text-slate-900">{application.candidate.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Location</label>
                    <p className="font-medium text-slate-900">{application.candidate.location}</p>
                  </div>
                  {application.candidate.linkedIn && (
                    <div>
                      <label className="text-sm text-slate-500">LinkedIn</label>
                      <a
                        href={application.candidate.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View Profile →
                      </a>
                    </div>
                  )}
                  {application.candidate.portfolio && (
                    <div>
                      <label className="text-sm text-slate-500">Portfolio</label>
                      <a
                        href={application.candidate.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View Portfolio →
                      </a>
                    </div>
                  )}
                </div>
              </Card>

              {/* Application Details */}
              <Card>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Position</label>
                    <p className="font-medium text-slate-900">{application.jobTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Department</label>
                    <p className="font-medium text-slate-900">{application.departmentName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Applied Date</label>
                    <p className="font-medium text-slate-900">
                      {new Date(application.appliedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Expected Salary</label>
                    <p className="font-medium text-slate-900">
                      {application.expectedSalary
                        ? `EGP ${application.expectedSalary.toLocaleString()}`
                        : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Notice Period</label>
                    <p className="font-medium text-slate-900">
                      {application.noticePeriod || 'Not specified'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Cover Letter */}
              {application.coverLetter && (
                <Card>
                  <p className="text-slate-700 whitespace-pre-line">{application.coverLetter}</p>
                </Card>
              )}

              {/* CV Preview & Download */}
              <Card>
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{application.cvFileName}</p>
                        <p className="text-sm text-slate-500">PDF Document</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={() => window.open(application.cvUrl, '_blank')}>
                        Preview
                      </Button>
                      <Button variant="default" onClick={handleDownloadCV}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Feedback Tab (BR-10, BR-22) */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Add New Feedback */}
              <Card>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Score (1-100) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newFeedback.score || ''}
                      onChange={(e) => setNewFeedback({ ...newFeedback, score: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${feedbackErrors.score
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      placeholder="Enter score (1-100)"
                    />
                    {feedbackErrors.score && (
                      <p className="text-red-600 text-sm mt-1">{feedbackErrors.score}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Comments <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newFeedback.comments}
                      onChange={(e) => setNewFeedback({ ...newFeedback, comments: e.target.value })}
                      rows={4}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${feedbackErrors.comments
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      placeholder="Provide detailed feedback about the candidate..."
                    />
                    {feedbackErrors.comments && (
                      <p className="text-red-600 text-sm mt-1">{feedbackErrors.comments}</p>
                    )}
                    <p className="text-slate-500 text-sm mt-1">
                      {newFeedback.comments.length}/20 characters minimum
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      onClick={handleSubmitFeedback}
                      disabled={submittingFeedback}
                    >
                      Submit Feedback
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Previous Feedback */}
              <Card>
                {application.scores.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No feedback recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {application.scores.map((score) => (
                      <div
                        key={score.id}
                        className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {score.evaluatorName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{score.evaluatorName}</p>
                              <p className="text-sm text-slate-500">
                                {stageConfig[score.stage].label} • {new Date(score.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className={`text-2xl font-bold ${score.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {score.score}%
                          </div>
                        </div>
                        <p className="text-slate-700">{score.comments}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Communication Logs Tab (BR-37) */}
          {activeTab === 'logs' && (
            <Card>
              <div className="space-y-4">
                {communicationLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className={`flex gap-4 ${index !== communicationLogs.length - 1 ? 'pb-4 border-b border-slate-100' : ''}`}
                  >
                    <CommunicationLogIcon type={log.type} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-slate-900">{log.subject}</h4>
                        <span className="text-sm text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{log.content}</p>
                      <p className="text-xs text-slate-500">by {log.createdBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Timeline */}
          <Card>
            <div className="space-y-4">
              {Object.entries(stageConfig).map(([stage, config], index) => {
                const stageOrder = Object.keys(stageConfig);
                const currentIndex = stageOrder.indexOf(application.currentStage);
                const thisIndex = stageOrder.indexOf(stage);
                const isCompleted = thisIndex < currentIndex;
                const isCurrent = stage === application.currentStage;

                return (
                  <div key={stage} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-sm ${isCompleted || isCurrent ? 'text-slate-900 font-medium' : 'text-slate-500'
                        }`}
                    >
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Days in Pipeline</span>
                <span className="font-medium text-slate-900">
                  {Math.ceil(
                    (new Date().getTime() - new Date(application.appliedDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Feedback Count</span>
                <span className="font-medium text-slate-900">{application.scores.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Communications</span>
                <span className="font-medium text-slate-900">{communicationLogs.length}</span>
              </div>
              {application.averageScore !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Average Score</span>
                  <span className={`font-medium ${application.averageScore >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {application.averageScore}%
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <div className="space-y-2">
              <Link href={`/dashboard/hr-employee/recruitment/interviews?applicationId=${application.id}`} className="block">
                <Button variant="outline" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule Interview
                </Button>
              </Link>
              <Button variant="outline" className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </Button>
              <Button variant="outline" className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Add Note
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
