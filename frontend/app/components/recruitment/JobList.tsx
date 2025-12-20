'use client';

import { useState } from 'react';
import { JobRequisition, JobTemplate } from '@/app/types/recruitment';
import { Button } from '@/app/components/ui/button';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

// =====================================================
// Types
// =====================================================

export type JobDisplayItem = JobRequisition & {
  template?: JobTemplate;
};

export type UserRole = 
  | 'HR_MANAGER' 
  | 'HR_EMPLOYEE' 
  | 'RECRUITER' 
  | 'CANDIDATE' 
  | 'SYSTEM_ADMIN';

export type ViewMode = 'table' | 'card';

interface JobListProps {
  jobs: JobDisplayItem[];
  onPreview: (jobId: string) => void;
  onPublish?: (jobId: string) => void;
  onUnpublish?: (jobId: string) => void;
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  userRole: UserRole;
  isLoading?: boolean;
  viewMode?: ViewMode;
  emptyMessage?: string;
}

// =====================================================
// Status Badge Component
// =====================================================

function StatusBadge({ status }: { status: 'draft' | 'published' | 'closed' }) {
  const styles = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    published: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const labels = {
    draft: 'Draft',
    published: 'Published',
    closed: 'Closed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// =====================================================
// Empty State Component
// =====================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p className="text-slate-500 text-sm text-center">{message}</p>
    </div>
  );
}

// =====================================================
// Loading State Component
// =====================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  );
}

// =====================================================
// Job Card Component (Card View)
// =====================================================

function JobCard({
  job,
  userRole,
  onPreview,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onApply,
}: {
  job: JobDisplayItem;
  userRole: UserRole;
  onPreview: (jobId: string) => void;
  onPublish?: (jobId: string) => void;
  onUnpublish?: (jobId: string) => void;
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
}) {
  const canEdit = ['HR_MANAGER', 'HR_EMPLOYEE', 'RECRUITER'].includes(userRole);
  const canPublish = ['HR_MANAGER', 'HR_EMPLOYEE'].includes(userRole);
  const canDelete = ['HR_MANAGER'].includes(userRole);
  const canApply = userRole === 'CANDIDATE' && job.publishStatus === 'published';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {job.templateTitle || job.template?.title || 'Untitled Position'}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {job.requisitionId}
          </p>
        </div>
        <StatusBadge status={job.publishStatus} />
      </div>

      <div className="space-y-2 mb-4">
        {job.location && (
          <div className="flex items-center text-sm text-slate-600">
            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.location}
          </div>
        )}
        <div className="flex items-center text-sm text-slate-600">
          <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {job.openings} Opening{job.openings !== 1 ? 's' : ''}
        </div>
        {job.applicationCount !== undefined && (
          <div className="flex items-center text-sm text-slate-600">
            <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {job.applicationCount} Application{job.applicationCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
        <Button variant="outline" size="sm" onClick={() => onPreview(job.id)}>
          Preview
        </Button>
        
        {canApply && onApply && (
          <Button variant="default" size="sm" onClick={() => onApply(job.id)}>
            Apply Now
          </Button>
        )}

        {canEdit && onEdit && job.publishStatus === 'draft' && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(job.id)}>
            Edit
          </Button>
        )}

        {canPublish && onPublish && job.publishStatus === 'draft' && (
          <Button variant="default" size="sm" onClick={() => onPublish(job.id)}>
            Publish
          </Button>
        )}

        {canPublish && onUnpublish && job.publishStatus === 'published' && (
          <Button variant="secondary" size="sm" onClick={() => onUnpublish(job.id)}>
            Unpublish
          </Button>
        )}

        {canDelete && onDelete && job.publishStatus === 'draft' && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(job.id)}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Job Table Component (Table View)
// =====================================================

function JobTable({
  jobs,
  userRole,
  onPreview,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onApply,
}: {
  jobs: JobDisplayItem[];
  userRole: UserRole;
  onPreview: (jobId: string) => void;
  onPublish?: (jobId: string) => void;
  onUnpublish?: (jobId: string) => void;
  onEdit?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
}) {
  const canEdit = ['HR_MANAGER', 'HR_EMPLOYEE', 'RECRUITER'].includes(userRole);
  const canPublish = ['HR_MANAGER', 'HR_EMPLOYEE'].includes(userRole);
  const canDelete = ['HR_MANAGER'].includes(userRole);
  const isCandidate = userRole === 'CANDIDATE';

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Job Title
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Location
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Openings
            </th>
            {!isCandidate && (
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Applications
              </th>
            )}
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {job.templateTitle || job.template?.title || 'Untitled Position'}
                  </p>
                  <p className="text-sm text-slate-500">{job.requisitionId}</p>
                </div>
              </td>
              <td className="py-4 px-4 text-sm text-slate-600">
                {job.location || '—'}
              </td>
              <td className="py-4 px-4 text-sm text-slate-600">
                {job.openings}
              </td>
              {!isCandidate && (
                <td className="py-4 px-4 text-sm text-slate-600">
                  {job.applicationCount ?? '—'}
                </td>
              )}
              <td className="py-4 px-4">
                <StatusBadge status={job.publishStatus} />
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onPreview(job.id)}>
                    Preview
                  </Button>

                  {isCandidate && job.publishStatus === 'published' && onApply && (
                    <Button variant="default" size="sm" onClick={() => onApply(job.id)}>
                      Apply
                    </Button>
                  )}

                  {canEdit && onEdit && job.publishStatus === 'draft' && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(job.id)}>
                      Edit
                    </Button>
                  )}

                  {canPublish && onPublish && job.publishStatus === 'draft' && (
                    <Button variant="default" size="sm" onClick={() => onPublish(job.id)}>
                      Publish
                    </Button>
                  )}

                  {canPublish && onUnpublish && job.publishStatus === 'published' && (
                    <Button variant="secondary" size="sm" onClick={() => onUnpublish(job.id)}>
                      Unpublish
                    </Button>
                  )}

                  {canDelete && onDelete && job.publishStatus === 'draft' && (
                    <Button variant="destructive" size="sm" onClick={() => onDelete(job.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// Main JobList Component
// =====================================================

export default function JobList({
  jobs,
  onPreview,
  onPublish,
  onUnpublish,
  onEdit,
  onDelete,
  onApply,
  userRole,
  isLoading = false,
  viewMode = 'table',
  emptyMessage = 'No jobs found',
}: JobListProps) {
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (!jobs || jobs.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
          <button
            onClick={() => setCurrentViewMode('table')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentViewMode === 'table'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentViewMode('card')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentViewMode === 'card'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Jobs Display */}
      {currentViewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              userRole={userRole}
              onPreview={onPreview}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              onEdit={onEdit}
              onDelete={onDelete}
              onApply={onApply}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <JobTable
            jobs={jobs}
            userRole={userRole}
            onPreview={onPreview}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
            onEdit={onEdit}
            onDelete={onDelete}
            onApply={onApply}
          />
        </div>
      )}
    </div>
  );
}
