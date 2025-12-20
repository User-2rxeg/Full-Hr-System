'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { getApplications, getInterviews, getOffers } from '@/app/services/recruitment';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import {
  Briefcase,
  Users,
  Calendar,
  FileCheck,
  PlusCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export default function HREmployeePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    candidatesInPipeline: 0,
    activeJobPosts: 0,
    scheduledInterviews: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [applications, interviews, offers] = await Promise.all([
        getApplications().catch(() => []),
        getInterviews().catch(() => []),
        getOffers().catch(() => []),
      ]);

      // Count active applications (not rejected or hired)
      const activeApplications = applications.filter((app: any) => 
        app.status !== 'rejected' && app.status !== 'hired'
      ).length;

      // Count scheduled interviews
      const scheduledInterviews = interviews.filter((i: any) => 
        i.status === 'scheduled' || i.status === 'SCHEDULED'
      ).length;

      // Count pending offers
      const pendingOffers = offers.filter((offer: any) => 
        offer.finalStatus === 'pending' || offer.finalStatus === 'PENDING'
      ).length;

      setStats({
        pendingTasks: pendingOffers + activeApplications,
        candidatesInPipeline: activeApplications,
        activeJobPosts: 0, // Would need to fetch from jobs endpoint
        scheduledInterviews,
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
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: <FileCheck className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Candidates in Pipeline',
      value: stats.candidatesInPipeline,
      icon: <Users className="w-5 h-5" />,
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Active Job Posts',
      value: stats.activeJobPosts,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/20',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Scheduled Interviews',
      value: stats.scheduledInterviews,
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/20',
      iconColor: 'text-amber-500',
    },
  ];

  const quickActions = [
    {
      title: 'Job Posting',
      description: 'Create new requisition',
      href: '/dashboard/hr-employee/recruitment/jobs',
      icon: <PlusCircle className="w-5 h-5" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'Candidates',
      description: 'Track and move applications',
      href: '/dashboard/hr-employee/recruitment/applications',
      icon: <Users className="w-5 h-5" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'Interviews',
      description: 'Schedule and feedback',
      href: '/dashboard/hr-employee/recruitment/interviews',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-amber-500/10 to-amber-600/10',
    },
    {
      title: 'Offers',
      description: 'Manage approvals',
      href: '/dashboard/hr-employee/recruitment/offers',
      icon: <FileCheck className="w-5 h-5" />,
      color: 'from-emerald-500/10 to-emerald-600/10',
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
            HR Employee Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            HR operations and execution
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

      {/* Quick Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Overview Metrics</h2>
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
    </div>
  );
}
