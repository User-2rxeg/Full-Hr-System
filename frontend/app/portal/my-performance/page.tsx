'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';

interface Appraisal {
  _id: string;
  cycleId: string;
  cycleName: string;
  templateName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
  overallRating?: number;
  feedback?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  developmentPlan?: string;
  completedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

interface Goal {
  _id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  category: string;
}

export default function MyPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [latestAppraisal, setLatestAppraisal] = useState<Appraisal | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch appraisal history
      const appraisalRes = await performanceService.getAppraisalHistory?.() || { data: [] };
      if (appraisalRes.data) {
        const data = Array.isArray(appraisalRes.data) ? appraisalRes.data : [];
        setAppraisals(data);
        if (data.length > 0) {
          setLatestAppraisal(data[0]);
        }
      }

      // Fetch goals
      const goalsRes = await performanceService.getMyGoals?.() || { data: [] };
      if (goalsRes.data) {
        setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'bg-muted text-muted-foreground';
    if (rating >= 4.5) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (rating >= 3.5) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    if (rating >= 2.5) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  const getRatingLabel = (rating?: number) => {
    if (!rating) return 'Not Rated';
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 3.5) return 'Exceeds Expectations';
    if (rating >= 2.5) return 'Meets Expectations';
    if (rating >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Pending' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', label: 'In Progress' };
      case 'COMPLETED':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', label: 'Completed' };
      case 'DISPUTED':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', label: 'Disputed' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    }
  };

  const getGoalStatusConfig = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Not Started' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'In Progress' };
      case 'COMPLETED':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Completed' };
      case 'CANCELLED':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Cancelled' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-48 bg-card rounded-xl border border-border"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">My Performance</h1>
            <p className="text-muted-foreground mt-1">View your appraisals, ratings, and development goals (REQ-OD-01)</p>
          </div>
          <Link
            href="/portal/my-performance/history"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            View History
          </Link>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Latest Appraisal Card */}
        {latestAppraisal ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Rating Circle */}
                <div className="flex-shrink-0">
                  <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center ${getRatingColor(latestAppraisal.overallRating)}`}>
                    <span className="text-4xl font-bold">
                      {latestAppraisal.overallRating?.toFixed(1) || '--'}
                    </span>
                    <span className="text-sm font-medium mt-1">out of 5.0</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{latestAppraisal.cycleName}</h2>
                      <p className="text-muted-foreground mt-1">{latestAppraisal.templateName}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusConfig(latestAppraisal.status).bg} ${getStatusConfig(latestAppraisal.status).text}`}>
                      {getStatusConfig(latestAppraisal.status).label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getRatingColor(latestAppraisal.overallRating)}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span className="font-medium">{getRatingLabel(latestAppraisal.overallRating)}</span>
                    </span>
                  </div>

                  {latestAppraisal.feedback && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium text-foreground mb-2">Manager Feedback</p>
                      <p className="text-muted-foreground">{latestAppraisal.feedback}</p>
                    </div>
                  )}

                  {latestAppraisal.completedAt && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Completed on {new Date(latestAppraisal.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Strengths and Improvements */}
            {(latestAppraisal.strengths?.length || latestAppraisal.areasForImprovement?.length) && (
              <div className="border-t border-border p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {latestAppraisal.strengths && latestAppraisal.strengths.length > 0 && (
                    <div>
                      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {latestAppraisal.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestAppraisal.areasForImprovement && latestAppraisal.areasForImprovement.length > 0 && (
                    <div>
                      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Areas for Improvement
                      </h3>
                      <ul className="space-y-2">
                        {latestAppraisal.areasForImprovement.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {latestAppraisal.status === 'COMPLETED' && (
              <div className="border-t border-border px-6 py-4 bg-muted/50 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Have concerns about your rating?
                </p>
                <Link
                  href={`/portal/my-performance/dispute?appraisalId=${latestAppraisal._id}`}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  Raise a Dispute
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-medium text-foreground">No Appraisals Yet</h3>
            <p className="text-muted-foreground mt-1">Your performance appraisals will appear here once completed.</p>
          </div>
        )}

        {/* Goals Section */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Development Goals</h2>
          </div>

          {goals.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-muted-foreground">No development goals assigned</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {goals.slice(0, 5).map((goal) => {
                const statusConfig = getGoalStatusConfig(goal.status);
                return (
                  <div key={goal._id} className="p-5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-foreground">{goal.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{goal.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${goal.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Due: {new Date(goal.targetDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Appraisal History Summary */}
        {appraisals.length > 1 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Appraisal History</h2>
              <Link
                href="/portal/my-performance/history"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                View All
              </Link>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {appraisals.slice(0, 5).map((appraisal, idx) => (
                  <div
                    key={appraisal._id}
                    className={`flex-shrink-0 w-32 p-4 rounded-lg border ${
                      idx === 0 ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/50'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${
                      idx === 0 ? 'text-primary' : 'text-foreground'
                    }`}>
                      {appraisal.overallRating?.toFixed(1) || '--'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{appraisal.cycleName}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(appraisal.createdAt).getFullYear()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Help Card */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-800 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Performance Review Process</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Your manager will conduct periodic performance reviews. If you have concerns about your rating,
                you can raise a dispute within 7 days of receiving your appraisal. HR will review and resolve disputes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

