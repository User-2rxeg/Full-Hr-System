'use client';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { getRecruitmentDashboard } from '@/app/services/recruitment';
import { Plus, FileText, Users, BarChart3, CheckCircle2, Calendar, Settings, Briefcase, Target, Workflow, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [stats, setStats] = useState<RecruitmentStats>({ openJobs: 0, activeCandidates: 0, pendingOffers: 0, hiredThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const dashboardData = await getRecruitmentDashboard() as DashboardResponse;
      const activeCandidates = dashboardData?.applicationsByStatus?.filter(s => s._id !== 'rejected' && s._id !== 'hired').reduce((sum, s) => sum + s.count, 0) || 0;
      const hiredCount = dashboardData?.applicationsByStatus?.find(s => s._id === 'hired')?.count || 0;
      const pendingOffers = dashboardData?.applicationsByStage?.find(s => s._id === 'offer')?.count || 0;
      setStats({ openJobs: dashboardData?.totalOpenPositions || 0, activeCandidates, pendingOffers, hiredThisMonth: hiredCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  const modules = [
    { title: 'Job Requisitions', description: 'Create and manage job postings', href: '/dashboard/hr-manager/recruitment/jobs', icon: Briefcase },
    { title: 'Job Templates', description: 'Standardize job descriptions', href: '/dashboard/hr-manager/recruitment/templates/jobs', icon: FileText },
    { title: 'Process Templates', description: 'Define hiring workflows', href: '/dashboard/hr-manager/recruitment/templates/process', icon: Workflow },
    { title: 'Applications', description: 'Review candidate applications', href: '/dashboard/hr-manager/recruitment/applications', icon: Users },
    { title: 'Interviews', description: 'Schedule and manage interviews', href: '/dashboard/hr-manager/recruitment/interviews', icon: Calendar },
    { title: 'Offers', description: 'Manage job offers', href: '/dashboard/hr-manager/recruitment/offers', icon: CheckCircle2 },
    { title: 'Referrals', description: 'Track employee referrals', href: '/dashboard/hr-manager/recruitment/referrals', icon: MessageSquare },
    { title: 'Analytics', description: 'Recruitment insights', href: '/dashboard/hr-manager/recruitment/analytics', icon: BarChart3 }
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg"><Target className="h-6 w-6 text-primary" /></div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Recruitment Management</h1>
            </div>
            <p className="text-muted-foreground">Attract, assess, and hire top talent for your organization</p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard/hr-manager/recruitment/jobs"><Plus className="h-4 w-4" />New Job Requisition</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open Positions</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg"><Briefcase className="h-4 w-4 text-primary" /></div>
              </div>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-foreground">{stats.openJobs}</span><span className="text-sm text-muted-foreground">jobs</span></div>}</CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Candidates</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg"><Users className="h-4 w-4 text-accent-foreground" /></div>
              </div>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-foreground">{stats.activeCandidates}</span><span className="text-sm text-muted-foreground">candidates</span></div>}</CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted-foreground/50 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Offers</CardTitle>
                <div className="p-2 bg-muted rounded-lg"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></div>
              </div>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-foreground">{stats.pendingOffers}</span><span className="text-sm text-muted-foreground">offers</span></div>}</CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hired This Month</CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg"><TrendingUp className="h-4 w-4 text-accent-foreground" /></div>
              </div>
            </CardHeader>
            <CardContent>{loading ? <Skeleton className="h-8 w-24" /> : <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-foreground">{stats.hiredThisMonth}</span><span className="text-sm text-muted-foreground">hires</span></div>}</CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Recruitment Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((module) => (
                <Link key={module.href} href={module.href} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3"><module.icon className="h-5 w-5 text-primary" /></div>
                    <h3 className="font-semibold text-foreground mb-1">{module.title}</h3>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
