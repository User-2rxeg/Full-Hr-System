'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';

/**
 * Performance Reports - HR Manager
 * REQ-OD-06: Generate and export outcome reports
 * Final Log: Finalized appraisal record is archived and made available for historical trend analysis
 */

interface Cycle {
  _id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  cycleType: string;
  startDate: string;
  endDate: string;
}

interface DashboardData {
  overallStats?: {
    totalAssignments: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  };
  departmentProgress?: {
    departmentId: string;
    departmentName: string;
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    completionRate: number;
    averageRating?: number;
  }[];
  ratingDistribution?: {
    exceptional: number;
    exceedsExpectations: number;
    meetsExpectations: number;
    needsImprovement: number;
    unsatisfactory: number;
  };
  averageRating?: number;
  topPerformers?: {
    employeeName: string;
    department: string;
    rating: number;
  }[];
}

export default function PerformanceReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchReportData(selectedCycleId);
    }
  }, [selectedCycleId]);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getCycles();

      if (response.error) {
        setError(response.error);
        return;
      }

      const cyclesData = Array.isArray(response.data) ? response.data as Cycle[] : [];
      setCycles(cyclesData);

      // Auto-select most recent closed/archived cycle for reports
      const completedCycle = cyclesData.find((c: Cycle) => c.status === 'CLOSED' || c.status === 'ARCHIVED');
      if (completedCycle) {
        setSelectedCycleId(completedCycle._id);
      } else if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cycles');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (cycleId: string) => {
    try {
      const response = await performanceService.getCompletionDashboard(cycleId);

      if (response.error) {
        console.error('Failed to load report data:', response.error);
        return;
      }

      setDashboardData(response.data as DashboardData);
    } catch (err: any) {
      console.error('Failed to load report data:', err);
    }
  };

  const handleExportCSV = () => {
    if (!dashboardData) return;

    setExporting(true);
    const selectedCycle = cycles.find(c => c._id === selectedCycleId);

    try {
      const rows: string[] = [];

      // Header
      rows.push('Performance Report - ' + (selectedCycle?.name || 'Unknown Cycle'));
      rows.push('Generated on: ' + new Date().toLocaleDateString());
      rows.push('');

      // Summary
      rows.push('SUMMARY');
      rows.push('Total Employees,' + (dashboardData.overallStats?.totalAssignments || 0));
      rows.push('Completed Appraisals,' + (dashboardData.overallStats?.completed || 0));
      rows.push('Pending Appraisals,' + (dashboardData.overallStats?.pending || 0));
      const total = dashboardData.overallStats?.totalAssignments || 0;
      const completed = dashboardData.overallStats?.completed || 0;
      rows.push('Completion Rate,' + (total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%'));
      rows.push('Average Rating,' + (dashboardData.averageRating?.toFixed(2) || 'N/A'));
      rows.push('');

      // Rating Distribution
      if (dashboardData.ratingDistribution) {
        rows.push('RATING DISTRIBUTION');
        rows.push('Category,Count');
        rows.push('Exceptional (4.5-5.0),' + (dashboardData.ratingDistribution.exceptional || 0));
        rows.push('Exceeds Expectations (3.5-4.4),' + (dashboardData.ratingDistribution.exceedsExpectations || 0));
        rows.push('Meets Expectations (2.5-3.4),' + (dashboardData.ratingDistribution.meetsExpectations || 0));
        rows.push('Needs Improvement (1.5-2.4),' + (dashboardData.ratingDistribution.needsImprovement || 0));
        rows.push('Unsatisfactory (1.0-1.4),' + (dashboardData.ratingDistribution.unsatisfactory || 0));
        rows.push('');
      }

      // Department Breakdown
      if (dashboardData.departmentProgress && dashboardData.departmentProgress.length > 0) {
        rows.push('DEPARTMENT BREAKDOWN');
        rows.push('Department,Total,Completed,Completion Rate,Average Rating');
        dashboardData.departmentProgress.forEach(dept => {
          const rate = dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : '0';
          rows.push(`${dept.departmentName},${dept.total},${dept.completed},${rate}%,${dept.averageRating?.toFixed(2) || 'N/A'}`);
        });
        rows.push('');
      }

      // Top Performers
      if (dashboardData.topPerformers && dashboardData.topPerformers.length > 0) {
        rows.push('TOP PERFORMERS');
        rows.push('Employee,Department,Rating');
        dashboardData.topPerformers.forEach(performer => {
          rows.push(`${performer.employeeName},${performer.department},${performer.rating.toFixed(2)}`);
        });
      }

      // Create and download file
      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `performance-report-${(selectedCycle?.name || 'report').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const selectedCycle = cycles.find(c => c._id === selectedCycleId);
  const total = dashboardData?.overallStats?.totalAssignments || 0;
  const completed = dashboardData?.overallStats?.completed || 0;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
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
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Performance Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and export outcome reports (REQ-OD-06)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              {cycles.map(cycle => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cycle Info */}
        {selectedCycle && (
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{selectedCycle.name}</h2>
                <p className="text-primary-foreground/80 mt-1">
                  {selectedCycle.cycleType} | {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || !dashboardData}
                  className="px-4 py-2 bg-white/20 text-primary-foreground rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-foreground">{total}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold text-foreground">{dashboardData?.averageRating?.toFixed(1) || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Rating Distribution</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Exceptional (4.5-5.0)', key: 'exceptional', color: 'bg-green-500' },
                { label: 'Exceeds Expectations (3.5-4.4)', key: 'exceedsExpectations', color: 'bg-blue-500' },
                { label: 'Meets Expectations (2.5-3.4)', key: 'meetsExpectations', color: 'bg-amber-500' },
                { label: 'Needs Improvement (1.5-2.4)', key: 'needsImprovement', color: 'bg-orange-500' },
                { label: 'Unsatisfactory (1.0-1.4)', key: 'unsatisfactory', color: 'bg-red-500' },
              ].map((item) => {
                const value = dashboardData?.ratingDistribution?.[item.key as keyof typeof dashboardData.ratingDistribution] || 0;
                const totalCompleted = completed || 1;
                const percentage = (value / totalCompleted) * 100;

                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{value} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        {dashboardData?.departmentProgress && dashboardData.departmentProgress.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Department Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dashboardData.departmentProgress.map((dept, index) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium text-foreground">{dept.departmentName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{dept.total}</td>
                      <td className="px-6 py-4 text-muted-foreground">{dept.completed}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-sm font-medium rounded ${
                          (dept.averageRating || 0) >= 4 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          (dept.averageRating || 0) >= 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {dept.averageRating?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/hr-manager/performance-dashboard"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Dashboard</h4>
                <p className="text-sm text-muted-foreground">Real-time progress</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/hr-manager/performance-cycles"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Manage Cycles</h4>
                <p className="text-sm text-muted-foreground">View all cycles</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/hr-manager/disputes"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Disputes</h4>
                <p className="text-sm text-muted-foreground">Review objections</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

