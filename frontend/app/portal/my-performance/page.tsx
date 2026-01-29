'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Appraisal {
  _id: string;
  cycleId: string;
  cycleName: string;
  templateName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
  overallRating?: number;
  feedback?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  developmentPlan?: string;
  completedAt?: string;
  reviewedBy?: string;
  createdAt: string;
}

interface Goal {
  _id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  category: string;
}

export default function MyPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [latestAppraisal, setLatestAppraisal] = useState<Appraisal | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const appraisalRes = await performanceService.getAppraisalHistory?.() || { data: [] };
      const rawData = Array.isArray(appraisalRes.data) ? appraisalRes.data : (Array.isArray(appraisalRes) ? appraisalRes : []);

      const mappedAppraisals: Appraisal[] = rawData.map((item: any) => {
        let mappedStatus: Appraisal['status'] = 'PENDING';
        if (item.status === 'HR_PUBLISHED') mappedStatus = 'COMPLETED';
        else if (item.status === 'ARCHIVED') mappedStatus = 'COMPLETED';
        else if (item.status === 'MANAGER_SUBMITTED') mappedStatus = 'IN_PROGRESS';
        else if (item.status === 'DRAFT') mappedStatus = 'IN_PROGRESS';

        return {
          _id: item._id,
          cycleId: typeof item.cycleId === 'object' ? item.cycleId?._id : item.cycleId,
          cycleName: typeof item.cycleId === 'object' ? item.cycleId?.name : 'Performance Cycle',
          templateName: typeof item.templateId === 'object' ? item.templateId?.name : 'Standard Appraisal',
          status: mappedStatus,
          overallRating: item.totalScore || 0,
          feedback: item.managerSummary || '',
          strengths: typeof item.strengths === 'string'
            ? item.strengths.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
            : (Array.isArray(item.strengths) ? item.strengths : []),
          areasForImprovement: typeof item.improvementAreas === 'string'
            ? item.improvementAreas.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
            : (Array.isArray(item.improvementAreas) ? item.improvementAreas : []),
          completedAt: item.hrPublishedAt || item.managerSubmittedAt,
          reviewedBy: typeof item.managerProfileId === 'object' ? item.managerProfileId?.fullName : 'Manager',
          createdAt: item.createdAt,
        };
      });

      setAppraisals(mappedAppraisals);
      if (mappedAppraisals.length > 0) {
        setLatestAppraisal(mappedAppraisals[0]);
      }

      const goalsRes = await performanceService.getMyGoals?.() || { data: [] };
      const rawGoals = Array.isArray(goalsRes.data) ? goalsRes.data : (Array.isArray(goalsRes) ? goalsRes : []);
      setGoals(rawGoals);

    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'bg-muted text-muted-foreground';
    if (rating >= 4.5) return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    if (rating >= 3.5) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    if (rating >= 2.5) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const statusConfigs: Record<string, string> = {
    PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    COMPLETED: 'bg-green-500/10 text-green-600 border-green-500/20',
    DISPUTED: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your performance metrics...</p>
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
            <Link href="/portal" className="hover:text-foreground">Employee Portal</Link>
            <span>/</span>
            <span className="text-foreground">My Performance</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Performance Overview</h1>
          <p className="text-muted-foreground mt-1">Track your growth, appraisals, and development milestones</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/portal/my-performance/history">
            Investment History
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Hero Section - Latest Appraisal */}
      {latestAppraisal ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start text-center lg:text-left">
              <div className="relative shrink-0">
                <div className={`w-40 h-40 rounded-full border-[6px] border-background flex flex-col items-center justify-center shadow-xl ${getRatingColor(latestAppraisal.overallRating)}`}>
                  <span className="text-5xl font-black">{latestAppraisal.overallRating?.toFixed(1) || '--'}</span>
                  <span className="text-[10px] uppercase font-black opacity-60 tracking-widest mt-1">Global Score</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <h2 className="text-3xl font-black text-foreground tracking-tight">{latestAppraisal.cycleName}</h2>
                  <Badge variant="outline" className={`px-4 py-1 font-black ${statusConfigs[latestAppraisal.status]}`}>
                    {latestAppraisal.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-lg font-medium">{latestAppraisal.templateName}</p>

                {latestAppraisal.feedback && (
                  <div className="p-6 bg-muted/30 border-l-4 border-primary rounded-r-xl italic text-foreground leading-relaxed">
                    "{latestAppraisal.feedback}"
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{latestAppraisal.reviewedBy}</span>
                  </div>
                  {latestAppraisal.completedAt && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{new Date(latestAppraisal.completedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(latestAppraisal.strengths?.length || latestAppraisal.areasForImprovement?.length) && (
            <div className="bg-muted/30 border-t border-border p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-green-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Demonstrated Strengths
                </h3>
                <div className="flex flex-wrap gap-2">
                  {latestAppraisal.strengths?.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-500/5 text-green-700 border-green-500/10 px-3 py-1 text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Evolution Opportunities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {latestAppraisal.areasForImprovement?.map((a, i) => (
                    <Badge key={i} variant="secondary" className="bg-amber-500/5 text-amber-700 border-amber-500/10 px-3 py-1 text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {latestAppraisal.status === 'COMPLETED' && (
            <div className="bg-primary/5 px-8 py-4 flex items-center justify-between border-t border-primary/10">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Formal appraisal published</span>
              <Link href={`/portal/my-performance/dispute?appraisalId=${latestAppraisal._id}`} className="text-xs font-black uppercase tracking-widest text-primary hover:underline underline-offset-4">
                Raise Inquiry
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 bg-card border border-border rounded-xl border-dashed">
          <svg className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-bold text-foreground">No Appraisal Data</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">Your performance reviews will be systematically populated here following the appraisal cycle.</p>
        </div>
      )}

      {/* Grid for Goals and History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Development Goals */}
        <div className="bg-card border border-border rounded-xl flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Strategic Objectives</h3>
            <Badge variant="outline" className="rounded-full bg-primary/5">{goals.length}</Badge>
          </div>
          <div className="flex-1 p-6 space-y-6">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
                <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs font-bold uppercase tracking-widest">Target-free zone</p>
              </div>
            ) : (
              goals.slice(0, 4).map((goal) => (
                <div key={goal._id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground truncate max-w-[70%]">{goal.title}</span>
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Due {new Date(goal.targetDate).toLocaleDateString()}</span>
                  </div>
                  <Progress value={goal.progress} className="h-1.5" />
                  <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest opacity-60">
                    <span>{goal.status.replace('_', ' ')}</span>
                    <span>{goal.progress}% Completion</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Historical trajectory */}
        <div className="bg-card border border-border rounded-xl flex flex-col h-full shadow-sm">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Growth Trajectory</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {appraisals.slice(0, 4).map((app, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-4 border border-border flex flex-col items-center justify-center space-y-2 text-center group hover:bg-primary/5 hover:border-primary/20 transition-all">
                  <span className="text-2xl font-black text-foreground group-hover:text-primary">{app.overallRating?.toFixed(1) || '--'}</span>
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground truncate w-full">{app.cycleName}</div>
                    <div className="text-[10px] font-medium text-slate-400">{new Date(app.createdAt).getFullYear()}</div>
                  </div>
                </div>
              ))}
              {appraisals.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-4 border border-border border-dashed flex flex-col items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-slate-200/50"></div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
              <h4 className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2">Policy reminder</h4>
              <p className="text-sm font-medium leading-relaxed mb-4">
                Your professional evolution is a collective journey. Use these data points as catalysts for your next 1-on-1 performance dialogue.
              </p>
              <Link href="/portal/learning" className="text-xs font-black uppercase tracking-widest text-primary-foreground hover:opacity-80 flex items-center gap-2">
                Explore Development Resources
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
