'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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
      rows.push('Performance Report - ' + (selectedCycle?.name || 'Unknown Cycle'));
      rows.push('Generated on: ' + new Date().toLocaleDateString());
      rows.push('');
      rows.push('SUMMARY');
      rows.push('Total Employees,' + (dashboardData.overallStats?.totalAssignments || 0));
      rows.push('Completed Appraisals,' + (dashboardData.overallStats?.completed || 0));
      rows.push('Pending Appraisals,' + (dashboardData.overallStats?.pending || 0));
      const total = dashboardData.overallStats?.totalAssignments || 0;
      const completed = dashboardData.overallStats?.completed || 0;
      rows.push('Completion Rate,' + (total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%'));
      rows.push('Average Rating,' + (dashboardData.averageRating?.toFixed(2) || 'N/A'));
      rows.push('');
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
      if (dashboardData.departmentProgress && dashboardData.departmentProgress.length > 0) {
        rows.push('DEPARTMENT BREAKDOWN');
        rows.push('Department,Total,Completed,Completion Rate,Average Rating');
        dashboardData.departmentProgress.forEach(dept => {
          const rate = dept.total > 0 ? ((dept.completed / dept.total) * 100).toFixed(1) : '0';
          rows.push(`${dept.departmentName},${dept.total},${dept.completed},${rate}%,${dept.averageRating?.toFixed(2) || 'N/A'}`);
        });
        rows.push('');
      }
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
      toast.success('Report exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export report');
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading report data...</p>
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
            <span className="text-foreground font-medium">Outcome Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Operational Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Synthesize and export historical performance outcomes and departmental metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-[200px] h-10 bg-card border-border font-semibold text-xs text-foreground">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(cycle => (
                <SelectItem key={cycle._id} value={cycle._id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleExportCSV}
            disabled={exporting || !dashboardData}
            variant="default"
            className="font-bold uppercase tracking-widest text-[10px] h-10 px-6"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Manifesting...' : 'Export Collective'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Cycle Info Banner */}
      {selectedCycle && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedCycle.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
                  {selectedCycle.cycleType}
                </Badge>
                <p className="text-muted-foreground text-sm">
                  {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Badge variant={selectedCycle.status === 'ARCHIVED' ? 'secondary' : 'default'} className="px-3 py-1">
                {selectedCycle.status}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: total, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-muted', color: 'text-foreground' },
          { label: 'Completed', value: completed, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-foreground', color: 'text-background' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', bg: 'bg-muted-foreground', color: 'text-background' },
          { label: 'Average Rating', value: dashboardData?.averageRating?.toFixed(1) || 'N/A', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', bg: 'bg-muted-foreground', color: 'text-background' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Distribution */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rating Distribution</h3>
          </div>
          <div className="p-6 space-y-6">
            {[
              { label: 'Exceptional', key: 'exceptional', color: 'bg-foreground', range: '(4.5-5.0)' },
              { label: 'Exceeds Expectations', key: 'exceedsExpectations', color: 'bg-muted-foreground', range: '(3.5-4.4)' },
              { label: 'Meets Expectations', key: 'meetsExpectations', color: 'bg-muted-foreground opacity-60', range: '(2.5-3.4)' },
              { label: 'Needs Improvement', key: 'needsImprovement', color: 'bg-muted', range: '(1.5-2.4)' },
              { label: 'Unsatisfactory', key: 'unsatisfactory', color: 'bg-muted opacity-50', range: '(1.0-1.4)' },
            ].map((item) => {
              const value = dashboardData?.ratingDistribution?.[item.key as keyof typeof dashboardData.ratingDistribution] || 0;
              const totalCompleted = completed || 1;
              const percentage = (value / totalCompleted) * 100;
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-foreground block">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{item.range}</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{value} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${item.color} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Departmental Performance Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Department</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completion</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboardData?.departmentProgress?.map((dept, index) => (
                  <tr key={index} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{dept.departmentName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">{dept.completed} / {dept.total} records</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 bg-primary transition-all"
                            style={{ width: `${dept.total > 0 ? (dept.completed / dept.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-foreground">{dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={`font-bold ${(dept.averageRating || 0) >= 4 ? 'bg-foreground text-background border-foreground' :
                        (dept.averageRating || 0) >= 3 ? 'bg-muted-foreground text-background border-muted-foreground' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                        {dept.averageRating?.toFixed(1) || 'N/A'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/hr-manager/performance-dashboard', label: 'Progress Monitor', subtext: 'Real-time monitoring', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', bg: 'bg-muted', color: 'text-foreground' },
          { href: '/dashboard/hr-manager/performance-cycles', label: 'Cycle Registry', subtext: 'View all appraisal periods', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bg: 'bg-muted', color: 'text-foreground' },
          { href: '/dashboard/hr-manager/disputes', label: 'Objection Log', subtext: 'Review finalized disputes', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: 'bg-muted', color: 'text-foreground' },
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
