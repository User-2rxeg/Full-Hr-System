'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { employeeProfileService } from '@/app/services/employee-profile';
import { performanceService } from '@/app/services/performance';
import { 
  getRecruitmentDashboard, 
  getApplications,
  getInterviews,
  getOffers 
} from '@/app/services/recruitment';
import { onboardingService } from '@/app/services/onboarding';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Users,
  Briefcase,
  UserPlus,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Settings,
  BarChart3,
  ArrowRight,
  Award,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  activeCycles: number;
  openJobs: number;
  activeApplications: number;
  pendingOffers: number;
  upcomingInterviews: number;
  activeOnboardings: number;
  completedOnboardings: number;
}

interface DashboardResponse {
  totalOpenPositions: number;
  totalApplications: number;
  applicationsByStage: { _id: string; count: number }[];
  applicationsByStatus: { _id: string; count: number }[];
  recentApplications: unknown[];
}

export default function HRManagerPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeCycles: 0,
    openJobs: 0,
    activeApplications: 0,
    pendingOffers: 0,
    upcomingInterviews: 0,
    activeOnboardings: 0,
    completedOnboardings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [
        employeesRes,
        cyclesRes,
        recruitmentDashboardRes,
        applicationsRes,
        interviewsRes,
        offersRes,
        onboardingsRes,
      ] = await Promise.all([
        employeeProfileService.getAllEmployees(1, 100).catch(() => ({ data: [], error: null })),
        performanceService.getCycles().catch(() => ({ data: [] })),
        getRecruitmentDashboard().catch(() => null),
        getApplications().catch(() => []),
        getInterviews().catch(() => []),
        getOffers().catch(() => []),
        onboardingService.getAllOnboardings().catch(() => []),
      ]);

      // Process employee count
      let totalEmployees = 0;
      if (employeesRes.data) {
        if (typeof employeesRes.data === 'object' && employeesRes.data !== null && 'total' in employeesRes.data) {
          totalEmployees = (employeesRes.data as any).total;
        } else if (Array.isArray(employeesRes.data)) {
          totalEmployees = employeesRes.data.length;
        }
      }

      // Process performance cycles
      const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
      const activeCycles = cycles.filter((c: any) => c.status === 'ACTIVE').length;

      // Process recruitment stats
      const recruitmentData = recruitmentDashboardRes as DashboardResponse | null;
      const openJobs = recruitmentData?.totalOpenPositions || 0;
      
      // Count active applications (not rejected or hired)
      const activeApplications = applicationsRes.filter((app: any) => 
        app.status !== 'rejected' && app.status !== 'hired'
      ).length;

      // Count pending offers
      const pendingOffers = offersRes.filter((offer: any) => 
        offer.finalStatus === 'pending' || offer.finalStatus === 'PENDING'
      ).length;

      // Count upcoming interviews (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingInterviews = interviewsRes.filter((interview: any) => {
        if (!interview.scheduledDate) return false;
        const interviewDate = new Date(interview.scheduledDate);
        return interviewDate >= now && interviewDate <= nextWeek && 
               interview.status !== 'completed' && interview.status !== 'cancelled';
      }).length;

      // Process onboarding stats
      const onboardings = Array.isArray(onboardingsRes) ? onboardingsRes : [];
      const activeOnboardings = onboardings.filter((onb: any) => {
        // Check if onboarding is in progress (has tasks not completed)
        return onb.tasks && Array.isArray(onb.tasks) && 
               onb.tasks.some((task: any) => 
                 task.status !== 'completed' && task.status !== 'COMPLETED'
               );
      }).length;
      const completedOnboardings = onboardings.filter((onb: any) => {
        return onb.tasks && Array.isArray(onb.tasks) && 
               onb.tasks.every((task: any) => 
                 task.status === 'completed' || task.status === 'COMPLETED'
               );
      }).length;

      setStats({
        totalEmployees,
        activeCycles,
        openJobs,
        activeApplications,
        pendingOffers,
        upcomingInterviews,
        activeOnboardings,
        completedOnboardings,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: <Users className="w-5 h-5" />,
      color: 'from-primary/20 to-primary/30',
      iconColor: 'text-primary',
      href: '/dashboard/hr-manager/employee-management',
    },
    {
      label: 'Open Positions',
      value: stats.openJobs,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-primary/15 to-primary/25',
      iconColor: 'text-primary',
      href: '/dashboard/hr-manager/recruitment/jobs',
    },
    {
      label: 'Active Applications',
      value: stats.activeApplications,
      icon: <FileText className="w-5 h-5" />,
      color: 'from-primary/10 to-primary/20',
      iconColor: 'text-primary',
      href: '/dashboard/hr-manager/recruitment/applications',
    },
    {
      label: 'Upcoming Interviews',
      value: stats.upcomingInterviews,
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-warning/20 to-warning/30',
      iconColor: 'text-warning',
      href: '/dashboard/hr-manager/recruitment/interviews',
    },
    {
      label: 'Pending Offers',
      value: stats.pendingOffers,
      icon: <Clock className="w-5 h-5" />,
      color: 'from-warning/15 to-warning/25',
      iconColor: 'text-warning',
      href: '/dashboard/hr-manager/recruitment/offers',
    },
    {
      label: 'Active Onboardings',
      value: stats.activeOnboardings,
      icon: <UserPlus className="w-5 h-5" />,
      color: 'from-primary/12 to-primary/22',
      iconColor: 'text-primary',
      href: '/dashboard/hr-manager/onboarding',
    },
    {
      label: 'Performance Cycles',
      value: stats.activeCycles,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'from-primary/18 to-primary/28',
      iconColor: 'text-primary',
      href: '/dashboard/hr-manager/performance-cycles',
    },
    {
      label: 'Completed Onboardings',
      value: stats.completedOnboardings,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'from-success/20 to-success/30',
      iconColor: 'text-success',
      href: '/dashboard/hr-manager/onboarding',
    },
  ];

  const quickActions = [
    {
      title: 'Create Job Posting',
      description: 'Post a new position',
      href: '/dashboard/hr-manager/recruitment/jobs',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-primary/10 to-primary/15',
    },
    {
      title: 'Schedule Interview',
      description: 'Set up candidate interviews',
      href: '/dashboard/hr-manager/recruitment/interviews',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-primary/8 to-primary/12',
    },
    {
      title: 'Review Applications',
      description: 'Evaluate candidates',
      href: '/dashboard/hr-manager/recruitment/applications',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-primary/12 to-primary/18',
    },
    {
      title: 'Manage Onboarding',
      description: 'Track new employee setup',
      href: '/dashboard/hr-manager/onboarding',
      icon: <UserPlus className="w-5 h-5" />,
      color: 'from-primary/10 to-primary/15',
    },
  ];

  const modules = [
    {
      title: 'Recruitment',
      description: 'Manage job postings, applications, interviews, and offers',
      href: '/dashboard/hr-manager/recruitment',
      icon: <Target className="w-6 h-6" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'Onboarding',
      description: 'Track and manage new employee onboarding processes',
      href: '/dashboard/hr-manager/onboarding',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'from-cyan-500/10 to-cyan-600/10',
    },
    {
      title: 'Employee Management',
      description: 'View and manage employee profiles, search directory',
      href: '/dashboard/hr-manager/employee-management',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'Performance Management',
      description: 'Configure templates, cycles, and review disputes',
      href: '/dashboard/hr-manager/performance-cycles',
      icon: <Award className="w-6 h-6" />,
      color: 'from-amber-500/10 to-amber-600/10',
    },
    {
      title: 'Dispute Resolution',
      description: 'Review and resolve performance rating disputes',
      href: '/dashboard/hr-manager/disputes',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'from-red-500/10 to-red-600/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Loading Dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">
            HR Management Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome back, <span className="font-semibold text-foreground">{user?.firstName || 'Manager'}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/portal/my-profile">
              My Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <GlassCard variant="strong" className="p-4 border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Unable to load data</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="mt-3 rounded-xl"
              >
                Retry
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Key Metrics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Overview Metrics</h2>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Link key={index} href={stat.href}>
              <GlassCard variant="hover" className="p-6 overflow-hidden relative group cursor-pointer">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl group-hover:blur-2xl transition-all duration-500`} />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-black text-foreground">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm ${stat.iconColor}`}>
                    {stat.icon}
                  </div>
                </div>
                <div className="relative z-10 mt-4 flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  <span>View details</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <GlassCard variant="hover" className="p-5 cursor-pointer group">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 w-fit`}>
                  <div className="text-foreground">
                    {action.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* HR Modules */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">HR Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link key={index} href={module.href}>
              <GlassCard variant="hover" className="p-6 cursor-pointer group h-full">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} shrink-0`}>
                    <div className="text-foreground">
                      {module.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {module.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
