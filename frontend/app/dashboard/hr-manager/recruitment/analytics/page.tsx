'use client';

/**
 * Recruitment Analytics Page (BR-33)
 * 
 * KPIs:
 * - Open Jobs (from dashboard.totalOpenPositions)
 * - Active Candidates (from dashboard.applicationsByStatus - excluding rejected/hired)
 * - Time-to-Hire chart (calculated from hired applications)
 * - Pipeline by Stage (from dashboard.applicationsByStage)
 * 
 * Filters:
 * - Date (filters applications by createdAt)
 * - Department (from JobTemplates)
 * 
 * All data is real - no mock data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getRecruitmentDashboard,
  getJobs,
  getJobTemplates,
  getApplications,
  getInterviews,
} from '@/app/services/recruitment';
import { analyticsService, OrgPulseResponse } from '@/app/services/analytics';
import { JobTemplate, JobRequisition, Application, Interview } from '@/types/recruitment';
import { Briefcase, Users, Clock, CheckCircle2 } from 'lucide-react';

// ==================== INTERFACES ====================
interface DashboardData {
  totalOpenPositions: number;
  totalApplications: number;
  applicationsByStage: { _id: string; count: number }[];
  applicationsByStatus: { _id: string; count: number }[];
  recentApplications: Application[];
}

interface AnalyticsData {
  openJobs: number;
  activeCandidates: number;
  avgTimeToHire: number;
  hiredThisMonth: number;
  totalApplications: number;
  interviewsScheduled: number;
}

interface PipelineStage {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface JobMetric {
  id: string;
  title: string;
  department: string;
  applicants: number;
  interviews: number;
  offers: number;
  hired: number;
  avgDays: number;
  status: 'open' | 'closed';
}

interface TimeToHireData {
  month: string;
  days: number;
  count: number;
}

// ==================== STAGE MAPPING ====================
const STAGE_CONFIG: Record<string, { name: string; color: string; order: number }> = {
  'screening': { name: 'Screening', color: 'bg-primary/100', order: 1 },
  'department_interview': { name: 'Dept Interview', color: 'bg-accent/100', order: 2 },
  'hr_interview': { name: 'HR Interview', color: 'bg-cyan-500', order: 3 },
  'offer': { name: 'Offer', color: 'bg-muted0', order: 4 },
};

// ==================== DATE HELPERS ====================
function getDateRange(filter: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (filter) {
    case 'all':
      // Return a very old date to include all records
      start = new Date('2000-01-01');
      break;
    case 'last7':
      start.setDate(now.getDate() - 7);
      break;
    case 'last30':
      start.setDate(now.getDate() - 30);
      break;
    case 'last90':
      start.setDate(now.getDate() - 90);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }

  return { start, end };
}

function getMonthName(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

// ==================== MAIN COMPONENT ====================
export default function RecruitmentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [jobMetrics, setJobMetrics] = useState<JobMetric[]>([]);
  const [timeToHire, setTimeToHire] = useState<TimeToHireData[]>([]);
  const [departments, setDepartments] = useState<string[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [orgPulse, setOrgPulse] = useState<OrgPulseResponse | null>(null);
  const [loadingPulse, setLoadingPulse] = useState(false);

  // Cache for raw data
  const [rawData, setRawData] = useState<{
    templates: JobTemplate[];
    jobs: JobRequisition[];
    applications: Application[];
    interviews: Interview[];
    dashboard: DashboardData | null;
  }>({
    templates: [],
    jobs: [],
    applications: [],
    interviews: [],
    dashboard: null,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [dashboardData, jobs, templates, applications, interviews] = await Promise.all([
        getRecruitmentDashboard() as Promise<DashboardData>,
        getJobs(),
        getJobTemplates(),
        getApplications(),
        getInterviews(),
      ]);

      console.log('Analytics Data Loaded:', {
        dashboardData,
        jobsCount: jobs.length,
        templatesCount: templates.length,
        applicationsCount: applications.length,
        interviewsCount: interviews.length,
        sampleApplication: applications[0],
      });

      // Store raw data
      setRawData({
        templates,
        jobs,
        applications,
        interviews,
        dashboard: dashboardData,
      });

      // Extract unique departments from templates
      const uniqueDepts = new Set<string>();
      templates.forEach((t: JobTemplate) => {
        if (t.department) uniqueDepts.add(t.department);
      });
      setDepartments(['all', ...Array.from(uniqueDepts).sort()]);

      // Also fetch Org Pulse
      try {
        setLoadingPulse(true);
        const pulse = await analyticsService.getOrgPulse();
        setOrgPulse(pulse);
      } catch (pulseErr) {
        console.error('Failed to load org pulse:', pulseErr);
      } finally {
        setLoadingPulse(false);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process data when filters or raw data change
  useEffect(() => {
    if (!rawData.dashboard) return;

    const { templates, jobs, applications, interviews, dashboard } = rawData;
    const { start, end } = getDateRange(dateFilter);

    // Create template lookup map
    const templateMap = new Map<string, JobTemplate>();
    templates.forEach(t => templateMap.set(t.id || t._id || '', t));

    // Create job lookup map with template info
    const jobMap = new Map<string, { job: JobRequisition; template?: JobTemplate }>();
    jobs.forEach(j => {
      const template = j.templateId ? templateMap.get(j.templateId) : undefined;
      jobMap.set(j.id, { job: j, template });
    });

    // Filter applications by date and department
    const filteredApps = applications.filter(app => {
      const appDate = new Date(app.createdAt);
      const inDateRange = appDate >= start && appDate <= end;

      // Get department from job's template
      if (departmentFilter !== 'all') {
        const jobInfo = app.requisitionId ? jobMap.get(app.requisitionId) : null;
        const dept = jobInfo?.template?.department;
        return inDateRange && dept === departmentFilter;
      }

      return inDateRange;
    });

    console.log('Filtered Applications:', {
      totalApps: applications.length,
      filteredCount: filteredApps.length,
      dateRange: { start, end },
      dateFilter,
      departmentFilter,
      sampleDates: applications.slice(0, 3).map(a => ({
        id: a.id,
        createdAt: a.createdAt,
        status: a.status,
        stage: a.currentStage,
      })),
    });

    // Calculate analytics from filtered applications
    const activeCandidates = filteredApps.filter(
      a => a.status !== 'rejected' && a.status !== 'hired'
    ).length;

    const hiredApps = filteredApps.filter(a => a.status === 'hired');
    const hiredThisMonth = hiredApps.length;

    // Count interviews scheduled (status = scheduled)
    const scheduledInterviews = interviews.filter(i => {
      const interviewDate = i.scheduledDate ? new Date(i.scheduledDate) : null;
      return interviewDate && interviewDate >= start && interviewDate <= end && i.status === 'scheduled';
    }).length;

    // Calculate avg time to hire from hired applications
    let avgTimeToHire = 0;
    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((sum, app) => {
        const created = new Date(app.createdAt);
        const updated = new Date(app.updatedAt);
        const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgTimeToHire = Math.round(totalDays / hiredApps.length);
    }

    // Filter jobs by department
    const filteredJobs = jobs.filter(j => {
      if (departmentFilter === 'all') return true;
      const template = j.templateId ? templateMap.get(j.templateId) : undefined;
      return template?.department === departmentFilter;
    });

    // Open jobs count (from filtered jobs)
    const openJobs = filteredJobs.filter(j => j.publishStatus === 'published').length;

    setAnalytics({
      openJobs,
      activeCandidates,
      avgTimeToHire,
      hiredThisMonth,
      totalApplications: filteredApps.length,
      interviewsScheduled: scheduledInterviews,
    });

    // Pipeline by stage
    const stageCount: Record<string, number> = {};
    filteredApps.forEach(app => {
      const stage = app.currentStage || 'screening';
      stageCount[stage] = (stageCount[stage] || 0) + 1;
    });

    console.log('Pipeline Stage Counts:', {
      stageCount,
      STAGE_CONFIG_keys: Object.keys(STAGE_CONFIG),
      sampleStages: filteredApps.slice(0, 5).map(a => a.currentStage),
    });

    const total = filteredApps.length || 1;
    const pipelineData: PipelineStage[] = Object.entries(STAGE_CONFIG)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, config]) => ({
        name: config.name,
        count: stageCount[key] || 0,
        percentage: Math.round(((stageCount[key] || 0) / total) * 100),
        color: config.color,
      }));

    console.log('Pipeline Data:', pipelineData);

    setPipeline(pipelineData);

    // Job metrics
    const metrics: JobMetric[] = filteredJobs.map(job => {
      const template = job.templateId ? templateMap.get(job.templateId) : undefined;
      const jobApps = applications.filter(a => a.requisitionId === job.id);
      const jobInterviews = interviews.filter(i =>
        jobApps.some(a => a.id === i.applicationId)
      );
      const jobHired = jobApps.filter(a => a.status === 'hired');
      const jobOffers = jobApps.filter(a => a.status === 'offer' || a.currentStage === 'offer');

      // Calculate avg days for this job
      let avgDays = 0;
      if (jobHired.length > 0) {
        const totalDays = jobHired.reduce((sum, app) => {
          const created = new Date(app.createdAt);
          const updated = new Date(app.updatedAt);
          return sum + Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgDays = Math.round(totalDays / jobHired.length);
      }

      return {
        id: job.id,
        title: template?.title || job.templateTitle || 'Untitled Position',
        department: template?.department || 'Unknown',
        applicants: jobApps.length,
        interviews: jobInterviews.length,
        offers: jobOffers.length,
        hired: jobHired.length,
        avgDays,
        status: job.publishStatus === 'published' ? 'open' : 'closed',
      };
    });

    setJobMetrics(metrics);

    // Time to hire trend (monthly)
    const monthlyHire: Record<string, { total: number; count: number }> = {};
    hiredApps.forEach(app => {
      const hiredDate = new Date(app.updatedAt);
      const monthKey = `${hiredDate.getFullYear()}-${String(hiredDate.getMonth() + 1).padStart(2, '0')}`;

      const created = new Date(app.createdAt);
      const days = Math.ceil((hiredDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      if (!monthlyHire[monthKey]) {
        monthlyHire[monthKey] = { total: 0, count: 0 };
      }
      monthlyHire[monthKey].total += days;
      monthlyHire[monthKey].count += 1;
    });

    // Generate last 6 months data
    const tthData: TimeToHireData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyHire[monthKey];

      tthData.push({
        month: getMonthName(d),
        days: monthData ? Math.round(monthData.total / monthData.count) : 0,
        count: monthData?.count || 0,
      });
    }

    setTimeToHire(tthData);

  }, [rawData, dateFilter, departmentFilter]);

  const filteredJobMetrics = useMemo(() =>
    jobMetrics.filter(
      (job) => departmentFilter === 'all' || job.department === departmentFilter
    ),
    [jobMetrics, departmentFilter]
  );

  const maxTimeToHire = useMemo(() => {
    const validDays = timeToHire.filter(t => t.days > 0).map(t => t.days);
    return validDays.length > 0 ? Math.max(...validDays) : 30;
  }, [timeToHire]);

  // Export to CSV function
  const exportToCSV = () => {
    if (!analytics) return;

    // Prepare CSV content
    const csvRows: string[] = [];

    // Header
    csvRows.push('Recruitment Analytics Report');
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push(`Date Range: ${dateFilter === 'all' ? 'All Time' : dateFilter}`);
    csvRows.push(`Department: ${departmentFilter === 'all' ? 'All Departments' : departmentFilter}`);
    csvRows.push('');

    // KPIs
    csvRows.push('Key Performance Indicators');
    csvRows.push('Metric,Value');
    csvRows.push(`Open Jobs,${analytics.openJobs}`);
    csvRows.push(`Active Candidates,${analytics.activeCandidates}`);
    csvRows.push(`Avg Time to Hire (days),${analytics.avgTimeToHire}`);
    csvRows.push(`Hired (Period),${analytics.hiredThisMonth}`);
    csvRows.push(`Total Applications,${analytics.totalApplications}`);
    csvRows.push(`Interviews Scheduled,${analytics.interviewsScheduled}`);
    csvRows.push('');

    // Pipeline by Stage
    csvRows.push('Pipeline by Stage');
    csvRows.push('Stage,Count,Percentage');
    pipeline.forEach(stage => {
      csvRows.push(`${stage.name},${stage.count},${stage.percentage}%`);
    });
    csvRows.push('');

    // Time to Hire Trend
    csvRows.push('Time-to-Hire Trend');
    csvRows.push('Month,Days,Hired Count');
    timeToHire.forEach(t => {
      csvRows.push(`${t.month},${t.days},${t.count}`);
    });
    csvRows.push('');

    // Job Performance
    csvRows.push('Job Performance Metrics');
    csvRows.push('Position,Department,Applicants,Interviews,Offers,Hired,Avg Days,Status');
    filteredJobMetrics.forEach(job => {
      csvRows.push(`"${job.title}","${job.department}",${job.applicants},${job.interviews},${job.offers},${job.hired},${job.avgDays > 0 ? job.avgDays : '-'},${job.status}`);
    });

    // Create CSV blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `recruitment_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (using browser print)
  const exportToPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Recruitment Analytics Report</h1>
        <div className="flex justify-between text-sm text-muted-foreground border-b border-slate-300 pb-2">
          <div>
            <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
            <p><strong>Date Range:</strong> {dateFilter === 'all' ? 'All Time' : dateFilter}</p>
            <p><strong>Department:</strong> {departmentFilter === 'all' ? 'All Departments' : departmentFilter}</p>
          </div>
          <div className="text-right">
            <p><strong>Organization:</strong> HRMS</p>
            <p><strong>Module:</strong> Recruitment</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 print:hidden">
            <Link href="/dashboard/hr-manager/recruitment" className="hover:text-foreground">
              Recruitment
            </Link>
            <span>/</span>
            <span>Analytics</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 print:hidden">Recruitment Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1 print:hidden">Monitor recruitment progress and metrics (BR-33)</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={exportToCSV}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print/PDF
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters (BR-33) */}
      <div className="flex flex-wrap gap-4 no-print">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Date Range</label>
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
            <option value="thisYear">This year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards (BR-33) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics?.openJobs || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Open Jobs</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-accent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics?.activeCandidates || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Candidates</p>
            </div>
            <div className="p-2 bg-accent/10 rounded-lg">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-muted-foreground/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics?.avgTimeToHire || 0}d</p>
              <p className="text-xs text-muted-foreground mt-1">Avg. Time to Hire</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-accent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-foreground">{analytics?.hiredThisMonth || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Hired (Period)</p>
            </div>
            <div className="p-2 bg-accent/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Pipeline by Stage (BR-33) */}
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Pipeline by Stage</h3>
            <p className="text-sm text-muted-foreground">Current distribution across hiring stages</p>
          </div>
          <div className="space-y-4">
            {/* Horizontal Bar */}
            {pipeline.some(s => s.count > 0) ? (
              <div className="flex h-8 rounded-lg overflow-hidden">
                {pipeline.map((stage) => (
                  stage.count > 0 && (
                    <div
                      key={stage.name}
                      className={`${stage.color} flex items-center justify-center text-white text-xs font-medium transition-all`}
                      style={{ width: `${stage.percentage}%` }}
                      title={`${stage.name}: ${stage.count}`}
                    >
                      {stage.percentage >= 15 && stage.count}
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="flex h-8 rounded-lg overflow-hidden bg-muted items-center justify-center">
                <span className="text-sm text-slate-400">No applications in pipeline</span>
              </div>
            )}

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3">
              {pipeline.map((stage) => (
                <div key={stage.name} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                    <span className="text-sm text-foreground">{stage.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{stage.count}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-medium text-muted-foreground">Total Applications</span>
              <span className="text-lg font-bold text-slate-900">
                {pipeline.reduce((sum, s) => sum + s.count, 0)}
              </span>
            </div>
          </div>
        </Card>

        {/* Time to Hire Trend (BR-33) */}
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Time-to-Hire Trend</h3>
            <p className="text-sm text-muted-foreground">Average days to hire by month</p>
          </div>
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="flex items-end justify-between h-40 gap-2">
              {timeToHire.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.days > 0 ? `${item.days}d` : '-'}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${item.days > 0 ? 'bg-primary/100 hover:bg-blue-600' : 'bg-slate-200'
                      }`}
                    style={{
                      height: item.days > 0 ? `${(item.days / maxTimeToHire) * 100}%` : '4px',
                      minHeight: '4px'
                    }}
                    title={`${item.month}: ${item.days}d (${item.count} hired)`}
                  ></div>
                  <span className="text-xs text-muted-foreground">{item.month}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="text-center">
                <p className="text-lg font-bold text-accent-foreground">
                  {timeToHire.filter(t => t.days > 0).length > 0
                    ? Math.min(...timeToHire.filter(t => t.days > 0).map(t => t.days))
                    : 0}d
                </p>
                <p className="text-xs text-muted-foreground">Best</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{analytics?.avgTimeToHire || 0}d</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-muted-foreground">
                  {timeToHire.filter(t => t.days > 0).length > 0
                    ? Math.max(...timeToHire.filter(t => t.days > 0).map(t => t.days))
                    : 0}d
                </p>
                <p className="text-xs text-muted-foreground">Longest</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Jobs Performance Table */}
      <Card>
        <div className="mb-4">
          <h3 className="font-semibold text-slate-900">Job Performance Metrics</h3>
          <p className="text-sm text-muted-foreground">Recruitment funnel by position</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Department
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Applicants
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Interviews
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Offers
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Hired
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Avg Days
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobMetrics.map((job, index) => (
                <tr key={job.id || `job-${index}`} className="border-b border-slate-100 hover:bg-muted">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-900">{job.title}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{job.department}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {job.applicants}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-accent/10 text-accent-foreground rounded-full text-sm font-medium">
                      {job.interviews}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-muted text-muted-foreground rounded-full text-sm font-medium">
                      {job.offers}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {job.hired}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                    {job.avgDays > 0 ? `${job.avgDays}d` : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${job.status === 'open'
                        ? 'bg-accent/10 text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredJobMetrics.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No jobs found for the selected filters
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Applications</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analytics?.totalApplications || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Interviews Scheduled</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{analytics?.interviewsScheduled || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {analytics && analytics.totalApplications > 0
              ? `${Math.round((analytics.hiredThisMonth / analytics.totalApplications) * 100)}%`
              : '0%'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Jobs in Pipeline</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{filteredJobMetrics.length}</p>
        </Card>
      </div>

      {/* Workforce Health Pulse (Data Science Addition) */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Workforce Health Analytics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Current Workforce Pulse</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Headcount</span>
                <span className="font-bold text-lg">{orgPulse?.headcount || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Performance</span>
                <span className="font-bold text-lg text-accent-foreground">{orgPulse?.avgPerformanceScore?.toFixed(1) || '-'} / 5.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Appraisals</span>
                <span className="font-bold text-lg text-primary">{orgPulse?.activeAppraisals || 0}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Gender Diversity</h3>
            <div className="space-y-3">
              {orgPulse?.genderDiversity?.map((item) => (
                <div key={item._id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize">{item._id} ({item.count})</span>
                    <span>{orgPulse.headcount > 0 ? Math.round((item.count / orgPulse.headcount) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item._id === 'male' ? 'bg-primary/100' : item._id === 'female' ? 'bg-pink-500' : 'bg-slate-400'}`}
                      style={{ width: `${orgPulse.headcount > 0 ? (item.count / orgPulse.headcount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!orgPulse?.genderDiversity?.length && <p className="text-xs text-slate-400 italic">No diversity data available</p>}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
            <h3 className="text-sm font-semibold mb-4 opacity-90">AI Insight</h3>
            <div className="space-y-3">
              <p className="text-xs opacity-90 leading-relaxed">
                Workforce performance is holding steady at <span className="font-bold">{orgPulse?.avgPerformanceScore?.toFixed(1) || '0.0'}</span>.
                {orgPulse?.activeAppraisals && orgPulse.activeAppraisals > 0
                  ? ` There are currently ${orgPulse.activeAppraisals} performance reviews in progress.`
                  : " All periodic appraisals are currently up to date."
                }
              </p>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded text-[10px] font-medium">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Real-time workforce monitoring active
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
