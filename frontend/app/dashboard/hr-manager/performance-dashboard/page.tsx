'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';

/**
 * Performance Dashboard - HR Manager
 * REQ-AE-10: Consolidated dashboard tracking appraisal completion across departments
 * BR 11, BR 46: Department-level progress tracking
 */

interface CycleStats {
  _id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  inProgressAssignments: number;
}

interface DepartmentProgress {
  departmentId: string;
  departmentName: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

interface DashboardData {
  activeCycle?: CycleStats;
  departmentProgress: DepartmentProgress[];
  overallStats: {
    totalAssignments: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  };
}

export default function PerformanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<CycleStats[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchDashboardData(selectedCycleId);
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
      const cyclesData = Array.isArray(response.data) ? response.data : [];
      setCycles(cyclesData);
      
      // Auto-select active cycle
      const activeCycle = cyclesData.find((c: CycleStats) => c.status === 'ACTIVE');
      if (activeCycle) {
        setSelectedCycleId(activeCycle._id);
      } else if (cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load cycles');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (cycleId: string) => {
    try {
      const response = await performanceService.getCompletionDashboard(cycleId);
      if (response.error) {
        setError(response.error);
        return;
      }
      setDashboardData(response.data as DashboardData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'CLOSED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const selectedCycle = cycles.find(c => c._id === selectedCycleId);

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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Performance Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track appraisal completion across departments and teams (REQ-AE-10)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              {cycles.map(cycle => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
            <Link
              href="/dashboard/hr-manager/performance-cycles"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Manage Cycles
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cycle Overview */}
        {selectedCycle && (
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{selectedCycle.name}</h2>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCycle.status)}`}>
                    {selectedCycle.status}
                  </span>
                </div>
                <p className="text-primary-foreground/80 mt-1">
                  {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{dashboardData?.overallStats?.totalAssignments || 0}</p>
                  <p className="text-sm text-primary-foreground/80">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{dashboardData?.overallStats?.completed || 0}</p>
                  <p className="text-sm text-primary-foreground/80">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {dashboardData?.overallStats?.totalAssignments 
                      ? Math.round((dashboardData.overallStats.completed / dashboardData.overallStats.totalAssignments) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-primary-foreground/80">Progress</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{dashboardData?.overallStats?.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">{dashboardData?.overallStats?.inProgress || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{dashboardData?.overallStats?.pending || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">{dashboardData?.overallStats?.overdue || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Department Progress */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Department Progress</h3>
            <Link
              href="/dashboard/hr-manager/disputes"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              View Disputes
            </Link>
          </div>

          {dashboardData?.departmentProgress && dashboardData.departmentProgress.length > 0 ? (
            <div className="divide-y divide-border">
              {dashboardData.departmentProgress.map((dept) => (
                <div key={dept.departmentId} className="p-5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-foreground">{dept.departmentName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {dept.completed} of {dept.total} completed
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      dept.completionRate >= 80 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : dept.completionRate >= 50
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {dept.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(dept.completionRate)}`}
                      style={{ width: `${dept.completionRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Completed: {dept.completed}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      In Progress: {dept.inProgress}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Pending: {dept.pending}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-foreground mb-1">No Department Data</h4>
              <p className="text-sm text-muted-foreground">
                Department progress will appear here once assignments are created.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/hr-manager/performance-templates"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Manage Templates</h4>
                <p className="text-sm text-muted-foreground">Configure appraisal forms</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/hr-manager/performance-cycles"
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Manage Cycles</h4>
                <p className="text-sm text-muted-foreground">Schedule appraisal periods</p>
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
                <h4 className="font-semibold text-foreground">Resolve Disputes</h4>
                <p className="text-sm text-muted-foreground">Handle rating objections</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

