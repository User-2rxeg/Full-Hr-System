'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';

/**
 * Appraisal History - Employee Portal
 * REQ-OD-08: Access past appraisal history and multi-cycle trend views
 * BR 6: Employee Appraisals are saved on the profile
 */

interface AppraisalRecord {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
    cycleType: string;
    startDate: string;
    endDate: string;
  };
  templateId?: {
    name: string;
    templateType: string;
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
  status: string;
  publishedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export default function AppraisalHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AppraisalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AppraisalRecord | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getAppraisalHistory();

      if (response.error) {
        setError(response.error);
        return;
      }

      const data = response.data;
      if (Array.isArray(data)) {
        setRecords(data as AppraisalRecord[]);
      } else if (data && typeof data === 'object' && 'data' in data) {
        setRecords((data as { data: AppraisalRecord[] }).data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load appraisal history');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (rating >= 2.5) return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
    if (rating >= 1.5) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 3.5) return 'Exceeds Expectations';
    if (rating >= 2.5) return 'Meets Expectations';
    if (rating >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'ACKNOWLEDGED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DISPUTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Calculate trend data
  const trendData = records
    .filter(r => r.overallRating)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-6); // Last 6 appraisals for trend

  const averageRating = records.length > 0
    ? records.reduce((sum, r) => sum + (r.overallRating || 0), 0) / records.length
    : 0;

  const highestRating = records.length > 0
    ? Math.max(...records.map(r => r.overallRating || 0))
    : 0;

  const lowestRating = records.length > 0
    ? Math.min(...records.filter(r => r.overallRating).map(r => r.overallRating))
    : 0;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-foreground">Appraisal History</h1>
              <p className="text-muted-foreground">
                View past appraisals and performance trends (REQ-OD-08)
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Appraisals</p>
            <p className="text-3xl font-bold text-foreground mt-1">{records.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <p className="text-3xl font-bold text-foreground mt-1">{averageRating.toFixed(1)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Highest Rating</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{highestRating.toFixed(1)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Lowest Rating</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{lowestRating.toFixed(1)}</p>
          </div>
        </div>

        {/* Trend Visualization */}
        {trendData.length > 1 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Performance Trend (Multi-Cycle View)</h3>
            <div className="flex items-end justify-between gap-4 h-40">
              {trendData.map((record, index) => {
                const heightPercent = (record.overallRating / 5) * 100;
                return (
                  <div key={record._id} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-sm font-semibold text-foreground mb-1">
                        {record.overallRating.toFixed(1)}
                      </span>
                      <div
                        className={`w-full rounded-t-lg transition-all ${getRatingColor(record.overallRating).split(' ')[0]} ${getRatingColor(record.overallRating).split(' ')[1]}`}
                        style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {record.cycleId?.name || `Cycle ${index + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.createdAt).getFullYear()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Trend line indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              {trendData.length >= 2 && (
                <>
                  {trendData[trendData.length - 1].overallRating > trendData[0].overallRating ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Upward Trend
                    </span>
                  ) : trendData[trendData.length - 1].overallRating < trendData[0].overallRating ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      Downward Trend
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                      </svg>
                      Stable
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Appraisal List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">All Appraisals</h3>
          </div>

          {records.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-foreground mb-1">No Appraisal History</h4>
              <p className="text-sm text-muted-foreground">
                Your appraisal records will appear here once completed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {records.map((record) => (
                <div
                  key={record._id}
                  className="p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center ${getRatingColor(record.overallRating)}`}>
                        <span className="text-lg font-bold">{record.overallRating?.toFixed(1)}</span>
                        <span className="text-[10px]">/5.0</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {record.cycleId?.name || 'Appraisal'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {record.templateId?.name || record.cycleId?.cycleType || 'Performance Review'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(record.publishedAt || record.createdAt).toLocaleDateString()}
                          </span>
                          {record.managerId && (
                            <span>
                              Reviewed by: {record.managerId.firstName} {record.managerId.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRatingColor(record.overallRating)}`}>
                        {getRatingLabel(record.overallRating)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedRecord.cycleId?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedRecord.publishedAt || selectedRecord.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Rating Summary */}
                <div className="flex items-center gap-6">
                  <div className={`w-24 h-24 rounded-xl flex flex-col items-center justify-center ${getRatingColor(selectedRecord.overallRating)}`}>
                    <span className="text-3xl font-bold">{selectedRecord.overallRating?.toFixed(1)}</span>
                    <span className="text-xs">/5.0</span>
                  </div>
                  <div>
                    <p className={`text-lg font-semibold ${getRatingColor(selectedRecord.overallRating).split(' ')[0]}`}>
                      {getRatingLabel(selectedRecord.overallRating)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRecord.templateId?.name || selectedRecord.cycleId?.cycleType}
                    </p>
                    {selectedRecord.managerId && (
                      <p className="text-sm text-muted-foreground">
                        Reviewed by {selectedRecord.managerId.firstName} {selectedRecord.managerId.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Feedback Sections */}
                {selectedRecord.strengths && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Strengths
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-400">{selectedRecord.strengths}</p>
                  </div>
                )}

                {selectedRecord.areasForImprovement && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Areas for Improvement
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{selectedRecord.areasForImprovement}</p>
                  </div>
                )}

                {selectedRecord.developmentPlan && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Development Plan
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">{selectedRecord.developmentPlan}</p>
                  </div>
                )}

                {selectedRecord.managerComments && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-2">Manager Comments</h4>
                    <p className="text-sm text-muted-foreground">{selectedRecord.managerComments}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

