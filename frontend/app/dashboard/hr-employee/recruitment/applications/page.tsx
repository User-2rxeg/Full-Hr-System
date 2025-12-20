'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';
import { getApplications, getReferrals, updateApplicationStage } from '@/app/services/recruitment';

// =====================================================
// Types
// =====================================================

interface ApplicationCandidate {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  currentStage: ApplicationStage;
  status: ApplicationStatus;
  isReferral: boolean;
  referredBy?: string;
  appliedDate: string;
  lastUpdated: string;
  score?: number;
}

// =====================================================
// Stage Configuration
// =====================================================

const stageConfig = {
  [ApplicationStage.SCREENING]: {
    label: 'Screening',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    headerColor: 'bg-blue-500',
  },
  [ApplicationStage.DEPARTMENT_INTERVIEW]: {
    label: 'Dept Interview',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    headerColor: 'bg-purple-500',
  },
  [ApplicationStage.HR_INTERVIEW]: {
    label: 'HR Interview',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    headerColor: 'bg-amber-500',
  },
  [ApplicationStage.OFFER]: {
    label: 'Offer',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    headerColor: 'bg-emerald-500',
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

// =====================================================
// Components
// =====================================================

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function StageBadge({ stage }: { stage: ApplicationStage }) {
  const config = stageConfig[stage];

  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {stage || 'Unknown'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
}

function ReferralBadge({ referredBy }: { referredBy?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
      Referral{referredBy && ` • ${referredBy}`}
    </span>
  );
}

// Kanban Card Component
function ApplicationCard({
  application,
  onStageChange,
}: {
  application: ApplicationCandidate;
  onStageChange: (appId: string, newStage: ApplicationStage) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/dashboard/hr-employee/recruitment/applications/${application.id}`}
            className="font-medium text-slate-900 hover:text-indigo-600 transition-colors"
          >
            {application.candidateName}
          </Link>
          <p className="text-xs text-slate-500">{application.applicationId}</p>
        </div>
        {application.isReferral && <ReferralBadge referredBy={application.referredBy} />}
      </div>

      <p className="text-sm text-slate-600 mb-2">{application.jobTitle}</p>
      <p className="text-xs text-slate-500 mb-3">{application.departmentName}</p>

      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={application.status} />
        {application.score !== undefined && (
          <span className="text-sm font-medium text-slate-700">
            Score: <span className={application.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}>{application.score}</span>
          </span>
        )}
      </div>

      {/* Stage Change Dropdown (BR-9) */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <span>Move to Stage</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
            {Object.entries(stageConfig).map(([stage, config]) => (
              <button
                key={stage}
                onClick={() => {
                  onStageChange(application.id, stage as ApplicationStage);
                  setShowDropdown(false);
                }}
                disabled={application.currentStage === stage}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg ${application.currentStage === stage ? 'bg-slate-100 text-slate-400' : 'text-slate-700'
                  }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Applied: {new Date(application.appliedDate).toLocaleDateString()}</span>
        <Link
          href={`/dashboard/hr-employee/recruitment/applications/${application.id}`}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({
  stage,
  applications,
  onStageChange,
}: {
  stage: ApplicationStage;
  applications: ApplicationCandidate[];
  onStageChange: (appId: string, newStage: ApplicationStage) => void;
}) {
  const config = stageConfig[stage];

  return (
    <div className="flex-1 min-w-[300px] bg-slate-50 rounded-xl">
      <div className={`${config.headerColor} text-white px-4 py-3 rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{config.label}</h3>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
            {applications.length}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {applications.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No applications in this stage
          </div>
        ) : (
          applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

// List View Component
function ApplicationsList({
  applications,
  onStageChange,
}: {
  applications: ApplicationCandidate[];
  onStageChange: (appId: string, newStage: ApplicationStage) => void;
}) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Candidate
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Position
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Stage
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Score
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Applied
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {app.candidateName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/hr-employee/recruitment/applications/${app.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {app.candidateName}
                      </Link>
                      <p className="text-sm text-slate-500">{app.candidateEmail}</p>
                      {app.isReferral && (
                        <ReferralBadge referredBy={app.referredBy} />
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-900">{app.jobTitle}</p>
                  <p className="text-sm text-slate-500">{app.departmentName}</p>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={app.currentStage}
                    onChange={(e) => onStageChange(app.id, e.target.value as ApplicationStage)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(stageConfig).map(([stage, config]) => (
                      <option key={stage} value={stage}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-6 py-4">
                  {app.score !== undefined ? (
                    <span className={`font-medium ${app.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {app.score}%
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(app.appliedDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/hr-employee/recruitment/applications/${app.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    {app.status !== ApplicationStatus.REJECTED && app.status !== ApplicationStatus.HIRED && (
                      <Link href={`/dashboard/hr-employee/recruitment/applications/${app.id}/reject`}>
                        <Button variant="destructive" size="sm">
                          Reject
                        </Button>
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function HREmployeeApplicationsPipelinePage() {
  const [applications, setApplications] = useState<ApplicationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [referralFilter, setReferralFilter] = useState<boolean | null>(null);
  const [stageChangeSuccess, setStageChangeSuccess] = useState<string | null>(null);

  // Load applications from API
  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apps, referrals] = await Promise.all([
        getApplications(),
        getReferrals()
      ]);

      // Create a map of referrals for quick lookup
      const referralMap = new Map(referrals.map(r => [r.candidateId, r]));

      // Map API response to expected format
      const mappedApplications: ApplicationCandidate[] = apps.map((app) => ({
        id: app.id,
        applicationId: app.id,
        candidateId: app.candidateId,
        candidateName: app.candidateName || 'Unknown',
        candidateEmail: app.candidateEmail || '',
        jobTitle: app.jobTitle || 'Untitled Position',
        departmentName: app.departmentName || 'Not specified',
        currentStage: (app.currentStage as string).toLowerCase() as ApplicationStage,
        status: (app.status as string).toLowerCase() as ApplicationStatus,
        isReferral: referralMap.has(app.candidateId),
        referredBy: referralMap.get(app.candidateId)?.referringEmployeeId,
        appliedDate: app.createdAt,
        lastUpdated: app.updatedAt,
        score: undefined, // Would need to fetch from assessment
      }));
      setApplications(mappedApplications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Handle stage change (BR-9, BR-14)
  const handleStageChange = async (appId: string, newStage: ApplicationStage) => {
    try {
      await updateApplicationStage(appId, newStage);

      // Update state optimistically
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
              ...app,
              currentStage: newStage,
              lastUpdated: new Date().toISOString().split('T')[0],
              status: newStage === ApplicationStage.OFFER ? ApplicationStatus.OFFER : ApplicationStatus.IN_PROCESS,
            }
            : app
        )
      );

      setStageChangeSuccess(appId);
      setTimeout(() => setStageChangeSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  // Filter applications (BR-14, BR-25)
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesReferral = referralFilter === null || app.isReferral === referralFilter;
    return matchesSearch && matchesStatus && matchesReferral;
  });

  // Group applications by stage for Kanban view
  const applicationsByStage = Object.values(ApplicationStage).reduce(
    (acc, stage) => {
      acc[stage] = filteredApplications.filter((app) => app.currentStage === stage);
      return acc;
    },
    {} as Record<ApplicationStage, ApplicationCandidate[]>
  );

  // Stats
  const stats = {
    total: applications.length,
    inProcess: applications.filter((a) => a.status === ApplicationStatus.IN_PROCESS).length,
    referrals: applications.filter((a) => a.isReferral).length,
    atOffer: applications.filter((a) => a.currentStage === ApplicationStage.OFFER).length,
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Applications Pipeline</h1>
          <p className="text-slate-600 mt-1">
            Track and manage candidate applications through hiring stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            title="Kanban View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            title="List View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
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
      {stageChangeSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-emerald-800 font-medium">Application stage updated successfully!</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total Applications</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">In Process</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProcess}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">At Offer Stage</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.atOffer}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <Input
              placeholder="Search by name, application ID, or job title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(statusConfig).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setReferralFilter(referralFilter === true ? null : true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${referralFilter === true
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Referrals Only
            </button>
          </div>
        </div>
      </Card>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Object.values(ApplicationStage).map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              applications={applicationsByStage[stage]}
              onStageChange={handleStageChange}
            />
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <ApplicationsList
          applications={filteredApplications}
          onStageChange={handleStageChange}
        />
      )}

      {/* Empty State */}
      {filteredApplications.length === 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No applications found</h3>
          <p className="text-slate-600">Try adjusting your search or filter criteria.</p>
        </Card>
      )}
    </div>
  );
}
