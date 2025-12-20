'use client';

import { ReactNode } from 'react';
import { AuditLog, AuditEventType, AuditActorType } from '@/app/types/recruitment';

// =====================================================
// Types
// =====================================================

interface AuditEventProps {
  log: AuditLog;
  isLast?: boolean;
}

// =====================================================
// Icon Components by Event Type
// =====================================================

function getEventIcon(eventType: AuditEventType) {
  const iconMap: Record<AuditEventType, { bg: string; icon: ReactNode }> = {
    application_created: {
      bg: 'bg-cyan-100',
      icon: (
        <svg className="w-4 h-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    status_change: {
      bg: 'bg-blue-100',
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    stage_change: {
      bg: 'bg-indigo-100',
      icon: (
        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      ),
    },
    interview_scheduled: {
      bg: 'bg-purple-100',
      icon: (
        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    interview_completed: {
      bg: 'bg-violet-100',
      icon: (
        <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    feedback_submitted: {
      bg: 'bg-amber-100',
      icon: (
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    offer_created: {
      bg: 'bg-teal-100',
      icon: (
        <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    offer_approved: {
      bg: 'bg-emerald-100',
      icon: (
        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    offer_rejected: {
      bg: 'bg-red-100',
      icon: (
        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    offer_sent: {
      bg: 'bg-blue-100',
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    offer_signed: {
      bg: 'bg-green-100',
      icon: (
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
    },
    email_sent: {
      bg: 'bg-slate-100',
      icon: (
        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    document_uploaded: {
      bg: 'bg-orange-100',
      icon: (
        <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    rejection_sent: {
      bg: 'bg-gray-100',
      icon: (
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    consent_given: {
      bg: 'bg-lime-100',
      icon: (
        <svg className="w-4 h-4 text-lime-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  };

  return iconMap[eventType] || {
    bg: 'bg-gray-100',
    icon: (
      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
}

// =====================================================
// Actor Badge
// =====================================================

function getActorBadge(actorType: AuditActorType) {
  const badgeMap: Record<AuditActorType, { bg: string; text: string; label: string }> = {
    hr_employee: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'HR' },
    hr_manager: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Manager' },
    recruiter: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Recruiter' },
    candidate: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Candidate' },
    system: { bg: 'bg-slate-50', text: 'text-slate-700', label: 'System' },
  };

  return badgeMap[actorType] || { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Unknown' };
}

// =====================================================
// Date Formatting
// =====================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// AuditEvent Component
// =====================================================

export default function AuditEvent({ log, isLast = false }: AuditEventProps) {
  const { bg, icon } = getEventIcon(log.eventType);
  const actorBadge = getActorBadge(log.actorType);

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-slate-200" />
      )}

      {/* Icon */}
      <div className={`relative z-10 w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-slate-900">
            {log.title}
          </h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actorBadge.bg} ${actorBadge.text}`}>
            {actorBadge.label}
          </span>
        </div>

        <p className="text-sm text-slate-600 mb-2">
          {log.description}
        </p>

        {/* Value Change */}
        {log.previousValue && log.newValue && (
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="px-2 py-1 bg-red-50 text-red-700 rounded line-through">
              {log.previousValue}
            </span>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
              {log.newValue}
            </span>
          </div>
        )}

        {/* Metadata */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mb-2 inline-block">
            {Object.entries(log.metadata).map(([key, value]) => (
              <span key={key} className="mr-3">
                <span className="font-medium">{key}:</span> {String(value)}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{formatDate(log.createdAt)}</span>
          <span className="text-slate-300">•</span>
          <span>{formatTime(log.createdAt)}</span>
          {log.actorName && log.actorType !== 'system' && (
            <>
              <span className="text-slate-300">•</span>
              <span>by {log.actorName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { getEventIcon, getActorBadge, formatDate, formatTime };
