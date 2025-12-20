'use client';

import { useState, useEffect } from 'react';
import { AuditLog } from '@/app/types/recruitment';
import { getAuditLogs } from '@/app/services/recruitment';
import AuditEvent from './AuditEvent';

// =====================================================
// Types
// =====================================================

interface AuditTimelineProps {
  /**
   * The ID of the entity to fetch audit logs for
   */
  entityId: string;
  /**
   * The type of entity
   */
  entityType?: 'application' | 'interview' | 'offer' | 'job' | 'candidate';
  /**
   * Optional title for the timeline section
   */
  title?: string;
  /**
   * Maximum number of events to display initially
   * @default 10
   */
  initialLimit?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show a compact version
   * @default false
   */
  compact?: boolean;
}

// =====================================================
// Loading State
// =====================================================

function AuditTimelineLoading() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// Empty State
// =====================================================

function AuditTimelineEmpty() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h4 className="text-sm font-medium text-slate-900 mb-1">No activity yet</h4>
      <p className="text-sm text-slate-500">
        Activity and changes will appear here.
      </p>
    </div>
  );
}

// =====================================================
// Error State
// =====================================================

function AuditTimelineError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h4 className="text-sm font-medium text-slate-900 mb-1">Failed to load activity</h4>
      <p className="text-sm text-slate-500 mb-3">
        There was a problem loading the audit history.
      </p>
      <button
        onClick={onRetry}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Try again
      </button>
    </div>
  );
}

// =====================================================
// AuditTimeline Component
// =====================================================

export default function AuditTimeline({
  entityId,
  entityType,
  title = 'Activity Timeline',
  initialLimit = 10,
  className = '',
  compact = false,
}: AuditTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs(entityId, entityType);
      // Service now returns data directly or throws error
      setLogs(response);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load activity history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchLogs();
    }
  }, [entityId, entityType]);

  const displayedLogs = showAll ? logs : logs.slice(0, initialLimit);
  const hasMore = logs.length > initialLimit;

  return (
    <div className={`${className}`}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
            {title}
          </h3>
          {logs.length > 0 && (
            <span className="text-sm text-slate-500">
              {logs.length} event{logs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <AuditTimelineLoading />
      ) : error ? (
        <AuditTimelineError onRetry={fetchLogs} />
      ) : logs.length === 0 ? (
        <AuditTimelineEmpty />
      ) : (
        <>
          <div className="relative">
            {displayedLogs.map((log, index) => (
              <AuditEvent
                key={log.id}
                log={log}
                isLast={index === displayedLogs.length - 1 && !hasMore}
              />
            ))}
          </div>

          {/* Show More Button */}
          {hasMore && (
            <div className="mt-2 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showAll ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Show less
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Show {logs.length - initialLimit} more event{logs.length - initialLimit !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
