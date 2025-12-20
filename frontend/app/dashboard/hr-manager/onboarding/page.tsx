'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  Plus,
  FileText,
  DollarSign,
  Bell,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Activity,
  UserPlus
} from 'lucide-react';

export default function OnboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setOnboardings([]);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOnboardings = onboardings.filter((onboarding) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return onboarding.completed;
    if (filterStatus === 'in_progress') return !onboarding.completed;
    return true;
  });

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter((o) => !o.completed).length,
    completed: onboardings.filter((o) => o.completed).length,
    pendingTasks: onboardings.reduce(
      (acc, o) => acc + (o.tasks?.filter((t) => t.status === OnboardingTaskStatus.PENDING).length || 0),
      0
    ),
  };

  const calculateProgress = (tasks: Onboarding['tasks']) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (progress >= 50) return 'bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]';
    if (progress >= 25) return 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
    return 'bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-muted/50 rounded-lg w-1/3 animate-pulse"></div>
          <div className="h-10 bg-muted/50 rounded-lg w-1/4 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/30 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-muted/20 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-[100px] rounded-full -z-10 animate-pulse"></div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 border-b border-border/50 pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Onboarding Excellence
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              orchestrate a world-class journey for your newest team members.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="h-11 backdrop-blur-md bg-background/50 border-input hover:bg-accent gap-2" asChild>
              <Link href="/dashboard/hr-manager/onboarding/checklists">
                <CheckSquare className="w-4 h-4 text-primary" />
                <span>Templates</span>
              </Link>
            </Button>
            <Button className="h-11 shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl transition-all hover:scale-[1.02] gap-2" asChild>
              <Link href="/dashboard/hr-manager/onboarding/employee">
                <UserPlus className="w-4 h-4" />
                <span>New Onboarding</span>
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <GlassCard className=" border-destructive/20 bg-destructive/5 text-destructive p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center font-bold">!</div>
              <span className="font-medium">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="hover:bg-destructive/10 border-destructive/20 text-destructive">Retry</Button>
          </GlassCard>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Active Journey', value: stats.total, icon: Users, color: 'text-primary', trend: '+12%', sub: 'Total New Hires' },
            { label: 'In Progress', value: stats.inProgress, icon: Activity, color: 'text-blue-500', trend: 'Active', sub: 'Action Required' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', trend: '100%', sub: 'Fully Integrated' },
            { label: 'Pending Tasks', value: stats.pendingTasks, icon: Bell, color: 'text-amber-500', trend: 'Urgent', sub: 'Across All Hires' },
          ].map((stat, i) => (
            <GlassCard key={i} variant="hover" className="p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className={`w-20 h-20 ${stat.color}`} />
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stat.color} bg-current/10`}>{stat.trend}</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.sub}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { href: '/dashboard/hr-manager/onboarding/checklists', icon: CheckSquare, color: 'text-primary', title: 'Checklists', desc: 'Standardized workflows' },
            { href: '/dashboard/hr-manager/onboarding/employee', icon: UserPlus, color: 'text-emerald-500', title: 'Auto-Create', desc: 'From signed offers' },
            { href: '/dashboard/hr-manager/onboarding/payroll', icon: DollarSign, color: 'text-indigo-500', title: 'Payroll Sync', desc: 'Financial readiness' },
            { href: '#', icon: Bell, color: 'text-amber-500', title: 'Auto-Reminders', desc: 'Keep everyone on track' },
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <GlassCard className="p-5 flex items-center gap-4 hover:bg-muted/50 transition-all group hover:border-primary/20 hover:scale-[1.02]">
                <div className={`p-3 rounded-2xl bg-muted/80 group-hover:bg-background border border-border group-hover:border-primary/10 transition-all`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">{item.title}</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* Main Workspace */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-2 rounded-2xl backdrop-blur-md border border-border/50">
            <div className="flex p-1 bg-background/50 rounded-xl border border-border/50">
              {[
                { label: 'All Hires', value: 'all' },
                { label: 'Active', value: 'in_progress' },
                { label: 'Success', value: 'completed' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value as any)}
                  className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === filter.value
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="relative group min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by name, role, or department..."
                className="w-full pl-10 pr-4 py-2 bg-background/40 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <GlassCard className="overflow-hidden border-border/40">
            <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="font-bold text-foreground tracking-tight">Active Onboarding Funnel</h2>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 py-0.5">{filteredOnboardings.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-9 gap-2 text-xs font-bold hover:bg-background">
                <Filter className="w-3.5 h-3.5" />
                Refine List
              </Button>
            </div>

            <div className="divide-y divide-border/30">
              {filteredOnboardings.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-muted/40 rounded-[2rem] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Awaiting New Talent</h3>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm font-medium leading-relaxed">
                    No active onboarding processes match your current view. Time to trigger some potential!
                  </p>
                  <Button variant="outline" className="mt-8 rounded-xl border-border px-8" onClick={() => setFilterStatus('all')}>
                    Show All Profiles
                  </Button>
                </div>
              ) : (
                filteredOnboardings.map((onboarding) => {
                  const progress = calculateProgress(onboarding.tasks);
                  const employee = typeof onboarding.employeeId === 'object' ? onboarding.employeeId as any : null;
                  const employeeName = employee
                    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Elite Talent'
                    : 'Elite Talent';

                  return (
                    <div key={onboarding._id} className="group hover:bg-muted/30 transition-all p-6 relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all group-hover:rotate-3 ${onboarding.completed
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-primary/5 border border-primary/10'
                            }`}>
                            {onboarding.completed ? (
                              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                            ) : (
                              <UserPlus className="w-7 h-7 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <Link href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`} className="font-bold text-xl hover:text-primary transition-colors tracking-tight">
                                {employeeName}
                              </Link>
                              {onboarding.completed ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none py-0.5">Ready</Badge>
                              ) : (
                                <Badge variant="outline" className="border-primary/30 text-primary py-0.5 bg-primary/5">Active</Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-3 font-semibold uppercase tracking-wider">
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Launched {new Date(onboarding.createdAt).toLocaleDateString()}</span>
                              <span className="w-1 h-1 bg-border rounded-full" />
                              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> High Velocity</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-10 w-full md:w-auto">
                          <div className="flex-1 md:w-72 space-y-3">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Journey Progress</span>
                              <span className={`text-sm font-black ${onboarding.completed ? 'text-emerald-500' : 'text-primary'}`}>{progress}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border/30">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-in-out ${getProgressColor(progress)}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-bold flex justify-between">
                              <span>{onboarding.tasks?.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length || 0} Milestones Reached</span>
                              <span>{onboarding.tasks?.length || 0} Total</span>
                            </div>
                          </div>

                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 border-border group-hover:border-primary shadow-sm" asChild>
                            <Link href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`}>
                              <ArrowRight className="w-6 h-6" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
