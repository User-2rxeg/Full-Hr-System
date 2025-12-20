'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { getApplicationsByCandidate, getInterviews } from '@/app/services/recruitment';
import { Application } from '@/app/types/recruitment';
import { ApplicationStatus, InterviewStatus, ApplicationStage } from '@/app/types/enums';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import {
  Briefcase,
  FileText,
  Calendar,
  CheckCircle2,
  ArrowRight,
  User,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  totalApplications: number;
  underReview: number;
  interviewsScheduled: number;
  offersReceived: number;
  status: 'Active' | 'No Active Applications';
}

interface UpcomingInterview {
  id: string;
  jobTitle: string;
  date: string;
  time: string;
  type: string;
}

export default function JobCandidatePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    underReview: 0,
    interviewsScheduled: 0,
    offersReceived: 0,
    status: 'No Active Applications',
  });
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const applications = await getApplicationsByCandidate(user.id);

      const underReview = applications.filter(
        (a) => a.status === ApplicationStatus.IN_PROCESS || a.status === ApplicationStatus.SUBMITTED
      ).length;

      const offersReceived = applications.filter(
        (a) => a.status === ApplicationStatus.OFFER || a.currentStage === ApplicationStage.OFFER
      ).length;

      const hasActiveApplications = applications.some(
        (a) => a.status !== ApplicationStatus.REJECTED && a.status !== ApplicationStatus.HIRED
      );

      let scheduledInterviews = 0;
      const upcomingList: UpcomingInterview[] = [];

      for (const app of applications) {
        try {
          const interviews = await getInterviews({ applicationId: app.id });
          const scheduled = interviews.filter((i) => i.status === InterviewStatus.SCHEDULED);
          scheduledInterviews += scheduled.length;

          scheduled.forEach((interview) => {
            const date = new Date(interview.scheduledDate);
            upcomingList.push({
              id: interview.id,
              jobTitle: app.jobTitle || 'Position',
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              type: interview.method || 'Interview',
            });
          });
        } catch {
          // Interview fetch failed for this application
        }
      }

      upcomingList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setStats({
        totalApplications: applications.length,
        underReview,
        interviewsScheduled: scheduledInterviews,
        offersReceived,
        status: hasActiveApplications ? 'Active' : 'No Active Applications',
      });

      setUpcomingInterviews(upcomingList.slice(0, 3));
      setRecentApplications(applications.slice(0, 3));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statCards = [
    {
      label: 'Applications',
      value: stats.totalApplications,
      icon: <FileText className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Under Review',
      value: stats.underReview,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Interviews Scheduled',
      value: stats.interviewsScheduled,
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-cyan-500/20 to-cyan-600/20',
      iconColor: 'text-cyan-500',
    },
    {
      label: 'Offers Received',
      value: stats.offersReceived,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/20',
      iconColor: 'text-emerald-500',
    },
  ];

  const quickActions = [
    {
      title: 'Browse Jobs',
      description: 'Explore opportunities',
      href: '/careers',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'My Applications',
      description: 'Track your applications',
      href: '/dashboard/job-candidate/recruitment/applications',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'My Profile',
      description: 'Update your information',
      href: '/portal/my-profile',
      icon: <User className="w-5 h-5" />,
      color: 'from-emerald-500/10 to-emerald-600/10',
    },
    {
      title: 'Messages',
      description: 'View communications',
      href: '#',
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'from-amber-500/10 to-amber-600/10',
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
            Job Candidate Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track your applications and status
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/portal/my-profile">
            My Profile
          </Link>
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <GlassCard variant="strong" className="p-4 border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Unable to load data</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Quick Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Application Overview</h2>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <GlassCard key={index} variant="hover" className="p-6 overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl group-hover:blur-2xl transition-all duration-500`} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm ${stat.iconColor}`}>
                  {stat.icon}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Upcoming Interviews */}
      {upcomingInterviews.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Upcoming Interviews</h2>
          <div className="space-y-3">
            {upcomingInterviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20"
              >
                <div>
                  <p className="font-semibold text-foreground">{interview.jobTitle}</p>
                  <p className="text-sm text-muted-foreground">{interview.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{interview.date}</p>
                  <p className="text-sm text-muted-foreground">{interview.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <GlassCard variant="hover" className="p-5 cursor-pointer group text-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 w-fit mx-auto`}>
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

      {/* Application Status Legend */}
      <GlassCard className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Application Status Guide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-muted-foreground">Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-muted-foreground">In Review</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-muted-foreground">Offer Received</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-muted-foreground">Hired</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
