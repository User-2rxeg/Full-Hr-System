'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const statusColors: Record<string, string> = {
    PLANNED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    ACTIVE: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    CLOSED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    ARCHIVED: 'bg-muted text-muted-foreground border-border',
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const selectedCycle = cycles.find(c => c._id === selectedCycleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/hr-manager" className="hover:text-foreground">HR Manager</Link>
            <span>/</span>
            <span className="text-foreground">Performance Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track appraisal completion across departments and teams</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(cycle => (
                <SelectItem key={cycle._id} value={cycle._id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href="/dashboard/hr-manager/performance-cycles"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Manage Cycles
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Cycle Overview */}
      {selectedCycle && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">{selectedCycle.name}</h2>
                <Badge variant="outline" className={statusColors[selectedCycle.status]}>
                  {selectedCycle.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Period: {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-8 border-l border-border pl-8">
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">{dashboardData?.overallStats?.totalAssignments || 0}</p>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">{dashboardData?.overallStats?.completed || 0}</p>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-primary">
                  {dashboardData?.overallStats?.totalAssignments
                    ? Math.round((dashboardData.overallStats.completed / dashboardData.overallStats.totalAssignments) * 100)
                    : 0}%
                </p>
                <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Completed', value: dashboardData?.overallStats?.completed || 0, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'In Progress', value: dashboardData?.overallStats?.inProgress || 0, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Pending', value: dashboardData?.overallStats?.pending || 0, icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Overdue', value: dashboardData?.overallStats?.overdue || 0, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'text-red-600', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Progress */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="font-bold text-foreground">Departmental Progress Tracking</h3>
          <Link
            href="/dashboard/hr-manager/disputes"
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            Review Disputes
          </Link>
        </div>

        {dashboardData?.departmentProgress && dashboardData.departmentProgress.length > 0 ? (
          <div className="divide-y divide-border">
            {dashboardData.departmentProgress.map((dept) => (
              <div key={dept.departmentId} className="p-6 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-foreground">{dept.departmentName}</h4>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-tight">
                      {dept.completed} of {dept.total} units finalized
                    </p>
                  </div>
                  <Badge variant="outline" className={`px-4 py-1 text-sm font-black ${dept.completionRate >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                      dept.completionRate >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                        'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                    {dept.completionRate}%
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(dept.completionRate)}`}
                    style={{ width: `${dept.completionRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-bold text-foreground mb-1">Structural Data Pending</h4>
            <p className="text-sm text-muted-foreground">
              Department progress maps will populate once appraisal cycles commence.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/hr-manager/performance-templates', label: 'Appraisal Blueprints', subtext: 'Configure evaluation forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', bg: 'bg-purple-500/10', color: 'text-purple-600' },
          { href: '/dashboard/hr-manager/performance-cycles', label: 'Lifecycle Management', subtext: 'Schedule appraisal periods', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bg: 'bg-blue-500/10', color: 'text-blue-600' },
          { href: '/dashboard/hr-manager/disputes', label: 'Resolution Center', subtext: 'Handle rating objections', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: 'bg-red-500/10', color: 'text-red-600' },
        ].map((action, i) => (
          <Link key={i} href={action.href} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${action.bg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <svg className={`w-6 h-6 ${action.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-foreground">{action.label}</h4>
                <p className="text-xs text-muted-foreground font-medium">{action.subtext}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
