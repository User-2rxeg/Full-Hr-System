'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';

/**
 * File Performance Dispute - Employee Portal
 * REQ-AE-07: Flag or raise a concern about a rating during the cycle
 * BR 31: Employees have the right to file a formal appeal within a pre-set time window
 * BR 32: Appeals must be reviewed by HR and outcomes must be logged in the system
 */

interface AppraisalRecord {
  _id: string;
  assignmentId: string;
  cycleId: {
    _id: string;
    name: string;
  };
  overallRating: number;
  ratings: {
    criterionKey: string;
    score: number;
    comment?: string;
  }[];
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
  managerId?: {
    firstName: string;
    lastName: string;
  };
  publishedAt?: string;
  status: string;
}

interface ExistingDispute {
  _id: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  reason: string;
  filedAt: string;
  resolution?: string;
  resolutionType?: string;
  resolvedAt?: string;
}

export default function DisputePage() {
  const searchParams = useSearchParams();
  const appraisalId = searchParams.get('appraisalId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [record, setRecord] = useState<AppraisalRecord | null>(null);
  const [existingDispute] = useState<ExistingDispute | null>(null);

  const [formData, setFormData] = useState({
    reason: '',
    specificConcerns: '',
    expectedOutcome: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (appraisalId) {
      fetchAppraisalDetails();
    } else {
      setLoading(false);
    }
  }, [appraisalId]);

  const fetchAppraisalDetails = async () => {
    try {
      setLoading(true);

      // Fetch the appraisal record
      const response = await performanceService.getRecordById(appraisalId!);

      if (response.error) {
        setError(response.error);
        return;
      }

      const recordData = response.data as AppraisalRecord;
      setRecord(recordData);

      // Check if dispute already exists for this record
      // This would need a backend endpoint to check
      // For now, we'll handle it in the submission

    } catch (err: any) {
      setError(err.message || 'Failed to load appraisal details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      setError('Please provide a reason for your dispute');
      return;
    }

    if (!appraisalId) {
      setError('No appraisal selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await performanceService.fileDispute({
        recordId: appraisalId,
        reason: `${formData.reason}\n\nSpecific Concerns:\n${formData.specificConcerns}\n\nExpected Outcome:\n${formData.expectedOutcome}`.trim(),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return { label: 'Exceptional', color: 'text-green-600 dark:text-green-400' };
    if (rating >= 3.5) return { label: 'Exceeds Expectations', color: 'text-blue-600 dark:text-blue-400' };
    if (rating >= 2.5) return { label: 'Meets Expectations', color: 'text-amber-600 dark:text-amber-400' };
    if (rating >= 1.5) return { label: 'Needs Improvement', color: 'text-orange-600 dark:text-orange-400' };
    return { label: 'Unsatisfactory', color: 'text-red-600 dark:text-red-400' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'RESOLVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Check if within dispute window (7 days)
  const isWithinDisputeWindow = () => {
    if (!record?.publishedAt) return false;
    const publishDate = new Date(record.publishedAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  };

  const daysRemaining = () => {
    if (!record?.publishedAt) return 0;
    const publishDate = new Date(record.publishedAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysDiff);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Dispute Submitted Successfully</h2>
            <p className="text-muted-foreground mb-6">
              Your dispute has been filed and will be reviewed by HR. You will be notified once a decision has been made.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/portal/my-performance"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to My Performance
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appraisalId) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Appraisal Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please select an appraisal from your performance history to file a dispute.
            </p>
            <Link
              href="/portal/my-performance"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to My Performance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/portal/my-performance"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Raise a Dispute</h1>
            <p className="text-muted-foreground">
              File an objection regarding your performance rating (BR 31, BR 32)
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Dispute Window Notice */}
        {record && (
          <div className={`rounded-lg p-4 ${
            isWithinDisputeWindow()
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              <svg className={`w-5 h-5 mt-0.5 ${isWithinDisputeWindow() ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className={`font-medium ${isWithinDisputeWindow() ? 'text-blue-800 dark:text-blue-300' : 'text-red-800 dark:text-red-300'}`}>
                  {isWithinDisputeWindow()
                    ? `Dispute Window: ${daysRemaining()} days remaining`
                    : 'Dispute Window Expired'}
                </p>
                <p className={`text-sm mt-1 ${isWithinDisputeWindow() ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                  {isWithinDisputeWindow()
                    ? 'You can file a dispute within 7 days of receiving your appraisal.'
                    : 'The 7-day dispute window has passed. Contact HR if you have concerns.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Appraisal Summary */}
        {record && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Appraisal Summary</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{record.overallRating?.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">/5.0</span>
                </div>
                <div>
                  <p className={`font-semibold ${getRatingLabel(record.overallRating).color}`}>
                    {getRatingLabel(record.overallRating).label}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {record.cycleId?.name}
                  </p>
                  {record.managerId && (
                    <p className="text-sm text-muted-foreground">
                      Reviewed by: {record.managerId.firstName} {record.managerId.lastName}
                    </p>
                  )}
                </div>
              </div>

              {record.managerComments && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground mb-2">Manager Feedback</p>
                  <p className="text-sm text-muted-foreground">{record.managerComments}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing Dispute */}
        {existingDispute && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(existingDispute.status)}`}>
                {existingDispute.status.replace('_', ' ')}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">You have already filed a dispute</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Filed on {new Date(existingDispute.filedAt).toLocaleDateString()}
                </p>
                {existingDispute.resolution && (
                  <div className="mt-4 bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Resolution</p>
                    <p className="text-sm text-muted-foreground">{existingDispute.resolution}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dispute Form */}
        {!existingDispute && isWithinDisputeWindow() && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Dispute Details</h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for Dispute <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why you believe the rating is inaccurate or unfair..."
                  rows={4}
                  required
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Specific Concerns
                </label>
                <textarea
                  value={formData.specificConcerns}
                  onChange={(e) => setFormData(prev => ({ ...prev, specificConcerns: e.target.value }))}
                  placeholder="Detail specific areas or criteria you disagree with..."
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Expected Outcome
                </label>
                <textarea
                  value={formData.expectedOutcome}
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedOutcome: e.target.value }))}
                  placeholder="What resolution would you consider fair?"
                  rows={2}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Important Notice</p>
                    <p className="text-amber-700 dark:text-amber-400 mt-1">
                      Your dispute will be reviewed by HR. The process typically takes 5-7 business days.
                      You will be notified of the outcome via email and in-app notification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <Link
                href="/portal/my-performance"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !formData.reason.trim()}
                className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

