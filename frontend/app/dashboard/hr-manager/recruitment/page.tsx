'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/app/components/ui/glass-card';
import { getRecruitmentDashboard } from '@/app/services/recruitment';
import {
  Plus,
  FileText,
  Users,
  BarChart3,
  CheckCircle2,
  Calendar,
  MessageSquare,
  UserPlus,
  Settings,
  Layers,
  Search,
  ChevronRight,
  Target,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';

// Interface matching backend getRecruitmentDashboard response
interface DashboardResponse {
  totalOpenPositions: number;
  totalApplications: number;
  applicationsByStage: { _id: string; count: number }[];
  applicationsByStatus: { _id: string; count: number }[];
  recentApplications: unknown[];
}

interface RecruitmentStats {
  openJobs: number;
  activeCandidates: number;
  pendingOffers: number;
  hiredThisMonth: number;
}

export default function RecruitmentOverviewPage() {
  const [stats, setStats] = useState<RecruitmentStats>({
    openJobs: 0,
    activeCandidates: 0,
    pendingOffers: 0,
    hiredThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dashboardData = await getRecruitmentDashboard() as DashboardResponse;

      // Extract stats from backend response
      const activeCandidates = dashboardData?.applicationsByStatus
        ?.filter(s => s._id !== 'rejected' && s._id !== 'hired')
        .reduce((sum, s) => sum + s.count, 0) || 0;

      const hiredCount = dashboardData?.applicationsByStatus
        ?.find(s => s._id === 'hired')?.count || 0;

      const pendingOffers = dashboardData?.applicationsByStage
        ?.find(s => s._id === 'offer')?.count || 0;

      setStats({
        openJobs: dashboardData?.totalOpenPositions || 0,
        activeCandidates: activeCandidates,
        pendingOffers: pendingOffers,
        hiredThisMonth: hiredCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recruitment stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const modules = [
    {
      title: 'Job Requisitions',
      description: 'Create, manage, publish and close job postings to attract top talent.',
      href: '/dashboard/hr-manager/recruitment/jobs',
      icon: <Briefcase className="w-6 h-6" />,
      tag: 'Core'
    },
    {
      title: 'Job Templates',
      description: 'Standardize job descriptions and requirements across the organization.',
      href: '/dashboard/hr-manager/recruitment/templates/jobs',
      icon: <FileText className="w-6 h-6" />,
      tag: 'Config'
    },
    {
      title: 'Process Templates',
      description: 'Define customized hiring stages and evaluation criteria.',
      href: '/dashboard/hr-manager/recruitment/templates/process',
      icon: <Layers className="w-6 h-6" />,
      tag: 'Config'
    },
    {
      title: 'Analytics',
      description: 'Gain insights into time-to-hire, source effectiveness, and pipeline health.',
      href: '/dashboard/hr-manager/recruitment/analytics',
      icon: <BarChart3 className="w-6 h-6" />,
      tag: 'Reporting'
    },
    {
      title: 'Applications',
      description: 'Manage and track candidates as they move through the hiring funnel.',
      href: '/dashboard/hr-manager/recruitment/applications',
      icon: <Users className="w-6 h-6" />,
      tag: 'Tracking'
    },
    {
      title: 'Interviews',
      description: 'Schedule, coordinate and manage the interview panel experience.',
      href: '/dashboard/hr-manager/recruitment/interviews',
      icon: <Calendar className="w-6 h-6" />,
      tag: 'Coordination'
    },
    {
      title: 'Interview Feedback',
      description: 'Review structured feedback and candidate assessment scores.',
      href: '/dashboard/hr-manager/recruitment/feedback',
      icon: <CheckCircle2 className="w-6 h-6" />,
      tag: 'Review'
    },
    {
      title: 'Employee Referrals',
      description: 'Track internal employee referrals and manage referral rewards.',
      href: '/dashboard/hr-manager/recruitment/referrals',
      icon: <UserPlus className="w-6 h-6" />,
      tag: 'Sourcing'
    },
    {
      title: 'Offer Approvals',
      description: 'Review, approve, and send digital offers with e-signature tracking.',
      href: '/dashboard/hr-manager/recruitment/offers',
      icon: <MessageSquare className="w-6 h-6" />,
      tag: 'Closing'
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] -z-10 rounded-full" />

      <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b border-border/50">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Recruitment Command Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your acquisition pipeline from job creation to final offer.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-11 backdrop-blur-md bg-background/50 border-input hover:bg-accent" asChild>
              <Link href="/dashboard/hr-manager/recruitment/templates/jobs">
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Config Templates
              </Link>
            </Button>
            <Button className="h-11 shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:scale-[1.02] transition-all" asChild>
              <Link href="/dashboard/hr-manager/recruitment/jobs">
                <Plus className="w-4 h-4 mr-2" />
                Post New Job
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Active Openings', value: stats.openJobs, icon: <Target className="w-5 h-5" />, color: 'from-blue-500/20 to-blue-600/20', iconColor: 'text-blue-500' },
            { label: 'Total Applicants', value: stats.activeCandidates, icon: <Users className="w-5 h-5" />, color: 'from-emerald-500/20 to-emerald-600/20', iconColor: 'text-emerald-500' },
            { label: 'Offers Pending', value: stats.pendingOffers, icon: <Clock className="w-5 h-5" />, color: 'from-amber-500/20 to-amber-600/20', iconColor: 'text-amber-500' },
            { label: 'Hired This Month', value: stats.hiredThisMonth, icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-purple-500/20 to-purple-600/20', iconColor: 'text-purple-500' },
          ].map((stat, i) => (
            <GlassCard key={i} variant="hover" className="p-6 overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl group-hover:blur-2xl transition-all duration-500`} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-4xl font-bold text-foreground">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl bg-background/50 border border-border shadow-sm ${stat.iconColor}`}>
                  {stat.icon}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Search / Filter Section (Quick Nav) */}
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-border/40 backdrop-blur-sm max-w-2xl">
          <div className="pl-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Quick search recruitment modules, templates, or jobs..."
            className="flex-1 bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground text-foreground"
          />
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-default">
            v2.4 Live
          </Badge>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {modules.map((module) => (
            <Link key={module.title} href={module.href}>
              <GlassCard variant="hover" className="p-6 h-full flex flex-col group border-border/40 hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm border border-primary/10">
                    {module.icon}
                  </div>
                  <Badge variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity bg-muted/60 text-muted-foreground border-border/50">
                    {module.tag}
                  </Badge>
                </div>
                <div className="space-y-2 flex-1">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    {module.title}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                    {module.description}
                  </p>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
