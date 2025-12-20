'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { getApplicationsByCandidate, getJobById } from '@/app/services/recruitment';
import { Application, JobRequisition } from '@/app/types/recruitment';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';

/**
 * REC-017: Candidate Applications List Page
 * Allows candidates to view all their applications and track status
 * BR-27: Real-time status updates
 */

// =====================================================
// Stage Configuration
// =====================================================

const STAGES: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'screening', label: 'Screening', icon: '🔍', color: 'bg-blue-500' },
  { key: 'department_interview', label: 'Department Interview', icon: '💬', color: 'bg-purple-500' },
  { key: 'hr_interview', label: 'HR Interview', icon: '👥', color: 'bg-cyan-500' },
  { key: 'offer', label: 'Offer', icon: '📋', color: 'bg-amber-500' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  [ApplicationStatus.SUBMITTED]: { label: 'Submitted', color: 'text-slate-700', bg: 'bg-slate-100' },
  [ApplicationStatus.IN_PROCESS]: { label: 'In Process', color: 'text-blue-700', bg: 'bg-blue-100' },
  [ApplicationStatus.OFFER]: { label: 'Offer Received', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  [ApplicationStatus.HIRED]: { label: 'Hired', color: 'text-green-700', bg: 'bg-green-100' },
  [ApplicationStatus.REJECTED]: { label: 'Not Selected', color: 'text-red-700', bg: 'bg-red-100' },
};

// =====================================================
// Helper Functions
// =====================================================

function getStageIndex(stage: ApplicationStage): number {
  const stageOrder: Record<string, number> = {
    [ApplicationStage.SCREENING]: 0,
    [ApplicationStage.DEPARTMENT_INTERVIEW]: 1,
    [ApplicationStage.HR_INTERVIEW]: 2,
    [ApplicationStage.OFFER]: 3,
  };
  return stageOrder[stage] ?? 0;
}

function getStageLabel(stage: ApplicationStage): string {
  const labels: Record<string, string> = {
    [ApplicationStage.SCREENING]: 'Screening',
    [ApplicationStage.DEPARTMENT_INTERVIEW]: 'Department Interview',
    [ApplicationStage.HR_INTERVIEW]: 'HR Interview',
    [ApplicationStage.OFFER]: 'Offer',
  };
  return labels[stage] || stage;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =====================================================
// Components
// =====================================================

interface ApplicationWithJob extends Application {
  job?: JobRequisition;
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status] || statusConfig[ApplicationStatus.SUBMITTED];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function StageProgress({ currentStage, status }: { currentStage: ApplicationStage; status: ApplicationStatus }) {
  const currentIndex = getStageIndex(currentStage);
  const isRejected = status === ApplicationStatus.REJECTED;
  const isHired = status === ApplicationStatus.HIRED;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          let bgColor = 'bg-slate-200';
          let textColor = 'text-slate-400';
          
          if (isRejected) {
            bgColor = index <= currentIndex ? 'bg-red-500' : 'bg-slate-200';
            textColor = index <= currentIndex ? 'text-white' : 'text-slate-400';
          } else if (isHired) {
            bgColor = 'bg-green-500';
            textColor = 'text-white';
          } else if (isCompleted) {
            bgColor = 'bg-emerald-500';
            textColor = 'text-white';
          } else if (isCurrent) {
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
          }

          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor} ${textColor} text-sm font-medium`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-xs mt-1 text-center ${isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Progress line */}
      <div className="relative h-1 bg-slate-200 rounded-full mx-4 -mt-6 mb-8">
        <div
          className={`absolute h-1 rounded-full ${isRejected ? 'bg-red-500' : isHired ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${((currentIndex + 1) / STAGES.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ApplicationCard({ application }: { application: ApplicationWithJob }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {application.jobTitle || application.job?.title || 'Position'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {application.departmentName || application.job?.department || 'Department'} • Applied {formatDate(application.createdAt)}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        {/* Stage Progress */}
        <StageProgress currentStage={application.currentStage} status={application.status} />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-medium">Current Stage:</span> {getStageLabel(application.currentStage)}
        </div>
        <Link
          href={`/dashboard/job-candidate/recruitment/applications/${application.id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Details
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">No Applications Yet</h3>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        You haven't applied to any positions yet. Browse our open positions and find your perfect role!
      </p>
      <Link
        href="/careers"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Browse Open Positions
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </Link>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function CandidateApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in to view your applications');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch applications for the current candidate
      const apps = await getApplicationsByCandidate(user.id);
      
      // Optionally fetch job details for each application
      const appsWithJobs: ApplicationWithJob[] = await Promise.all(
        apps.map(async (app) => {
          try {
            if (app.requisitionId) {
              const job = await getJobById(app.requisitionId);
              return { ...app, job };
            }
          } catch {
            // Job fetch failed, continue without job details
          }
          return app;
        })
      );
      
      setApplications(appsWithJobs);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter applications based on status
  const filteredApplications = applications.filter((app) => {
    if (filter === 'all') return true;
    if (filter === 'active') {
      return app.status !== ApplicationStatus.REJECTED && app.status !== ApplicationStatus.HIRED;
    }
    if (filter === 'completed') {
      return app.status === ApplicationStatus.REJECTED || app.status === ApplicationStatus.HIRED;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    active: applications.filter(a => a.status !== ApplicationStatus.REJECTED && a.status !== ApplicationStatus.HIRED).length,
    inReview: applications.filter(a => a.status === ApplicationStatus.IN_PROCESS).length,
    offers: applications.filter(a => a.status === ApplicationStatus.OFFER).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 mb-4">{error}</p>
        <button
          onClick={fetchApplications}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-600 mt-1">Track the status of your job applications</p>
        </div>
        <Link
          href="/careers"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Browse Jobs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Applications</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Active</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Under Review</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inReview}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Offers Received</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.offers}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'all', label: 'All Applications' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.key
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-blue-800 text-sm">
          If you have questions about your application status or the hiring process, 
          please contact our HR team at <a href="mailto:hr@company.com" className="underline">hr@company.com</a>
        </p>
      </div>
    </div>
  );
}
