'use client';
import { useState, useEffect } from 'react';
import { onboardingService, OnboardingTracker } from '@/app/services/onboarding';
import { useAuth } from '@/context/AuthContext';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalBadge,
  PortalButton,
  PortalTabs,
  PortalEmptyState,
  PortalErrorState,
} from '@/components/portal';
import { Rocket, CheckCircle, Clock, FileText, Bookmark, UserCheck, Flag, Zap } from 'lucide-react';

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<OnboardingTracker | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) return;
      const res = await onboardingService.getOnboardingTracker(user.id);
      setTracker(res);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize onboarding data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);
  if (loading) return <PortalLoading message="Initializing mission protocols..." fullScreen />;
  if (error) return <PortalErrorState message={error} onRetry={fetchData} />;
  if (!tracker) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <PortalPageHeader
            title="Onboarding المركز"
            description="Welcome to the organization. Your onboarding journey will appear here."
            breadcrumbs={[{ label: 'Onboarding' }]}
          />
          <PortalCard className="mt-8 text-center py-20 bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
            <Rocket className="w-20 h-20 text-primary opacity-10 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-foreground">Awaiting Deployment</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto italic">
              Your onboarding tracker will materialize once HR initializes your professional setup.
            </p>
            <PortalButton className="mt-8" variant="outline" icon={<Bookmark className="w-4 h-4" />}>
              Check Help Center
            </PortalButton>
          </PortalCard>
        </div>
      </div>
    );
  }
  const completionPercent = tracker.progress?.progressPercentage || 0;
  const allTasks = [
    ...(tracker.tasksByStatus?.completed || []),
    ...(tracker.tasksByStatus?.inProgress || []),
    ...(tracker.tasksByStatus?.pending || []),
  ];
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <PortalPageHeader
          title="Talent Deployment المركز"
          description="Track your integration progress, complete tasks, and meet your unit"
          breadcrumbs={[{ label: 'Onboarding' }]}
          actions={
            <PortalButton variant="outline" icon={<FileText className="w-4 h-4" />}>
              Download Guide
            </PortalButton>
          }
        />
        <PortalCard
          padding="none"
          className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground overflow-hidden"
        >
          <div className="p-8 md:p-12 flex flex-col lg:flex-row gap-12 items-center relative">
            <div className="shrink-0 relative group">
              <div className="w-48 h-48 rounded-[48px] bg-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-transform duration-500 group-hover:scale-105">
                <div className="absolute inset-0 bg-primary opacity-5"></div>
                <h2 className="text-6xl font-black tracking-tighter text-primary">{completionPercent}%</h2>
                <p className="text-[10px] font-black uppercase text-primary/40 tracking-widest mt-1">Operational</p>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Professional Integration Track</p>
                <h3 className="text-4xl font-black tracking-tight">Onboarding Schedule</h3>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                {[1, 2, 3, 4].map((s) => {
                  const active = completionPercent >= (s - 1) * 25;
                  return (
                    <div
                      key={s}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${
                        active ? 'bg-white text-primary border-white' : 'bg-white/10 text-white border-white/20'
                      }`}
                    >
                      {active ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4 border-2 border-white/20 rounded-full" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">Phase 0{s}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-6 border-t border-white/10 flex flex-wrap justify-center lg:justify-start gap-8">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 mb-1">Identity</p>
                  <p className="font-bold text-lg">{tracker.employeeName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 mb-1">Reference</p>
                  <p className="font-bold text-lg">{tracker.onboardingId.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </PortalCard>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PortalTabs
              tabs={[
                { id: 'overview', label: 'Protocol Tasks', badge: allTasks.length },
                { id: 'upcoming', label: 'Next Priorities' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {allTasks.length
                  ? allTasks.map((task: any, idx: number) => (
                      <PortalCard key={idx} hover padding="none" className="overflow-hidden group">
                        <div className="p-6 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div
                              className={`p-4 rounded-2xl border transition-all ${
                                task.status === 'completed'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {task.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                            </div>
                            <div>
                              <h4 className={`font-black text-lg ${task.status === 'completed' ? 'text-success' : 'text-foreground'}`}>
                                {task.name}
                              </h4>
                              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mt-1">
                                {task.department} Department
                              </p>
                            </div>
                          </div>
                          <PortalBadge variant={task.status === 'completed' ? 'success' : 'warning'}>
                            {task.status.toUpperCase()}
                          </PortalBadge>
                        </div>
                      </PortalCard>
                    ))
                  : (
                    <PortalEmptyState
                      icon={<Bookmark className="w-16 h-16 opacity-10" />}
                      title="Tasks Pending"
                      description="Your tasks will be populated as you move through the phases."
                    />
                  )}
              </div>
            )}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                {tracker.upcomingDeadlines?.map((task: any, i: number) => (
                  <PortalCard key={i} hover className="group border-l-4 border-warning">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-warning/10 text-warning">
                        <Clock className="w-6 h-6" />
                      </div>
                      <PortalBadge variant="warning">URGENT</PortalBadge>
                    </div>
                    <h4 className="font-black text-lg truncate mb-1">{task.name}</h4>
                    <p className="text-xs text-muted-foreground mb-6">
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'ASAP'}
                    </p>
                    <PortalButton variant="outline" className="w-full" size="sm">
                      Initiate Task
                    </PortalButton>
                  </PortalCard>
                )) || (
                  <PortalEmptyState
                    title="No Urgent Deadlines"
                    description="You are current with all high-priority tasks."
                  />
                )}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <PortalCard className="bg-gradient-to-br from-accent/5 to-primary/5 border-dashed border-2">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" /> Key Milestones
              </h3>
              <div className="space-y-6 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border"></div>
                {[
                  { l: 'Identity Verification', d: 'Completed' },
                  { l: 'System Provisioning', d: 'Day 01' },
                  { l: 'Team Induction', d: 'Day 02' },
                ].map((m, i) => (
                  <div key={i} className="flex gap-6 items-start relative pl-8">
                    <div
                      className={`absolute left-0 w-5 h-5 rounded-full border-4 flex items-center justify-center shadow-sm ${
                        i === 0 ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      {i === 0 && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">{m.d}</p>
                      <p className="font-bold text-sm">{m.l}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PortalCard>
            <PortalStatCard
              title="Total Checklist"
              value={tracker.progress?.totalTasks || 0}
              icon={<UserCheck className="w-5 h-5" />}
              accentColor="primary"
            />
            <PortalStatCard
              title="Pending Actions"
              value={tracker.progress?.pendingTasks || 0}
              icon={<Clock className="w-5 h-5" />}
              accentColor="warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
