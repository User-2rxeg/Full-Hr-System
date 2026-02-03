'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalButton,
  PortalTabs,
  PortalErrorState,
} from '@/components/portal';
import { CheckCircle, Calendar, Star, History, Target, TrendingUp, ChevronRight, MessageSquare, Award, ShieldAlert } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('summary');
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
      const flattenedGoals: Goal[] = [];
      rawGoals.forEach((cycleEntry: any) => {
        if (cycleEntry.goals && Array.isArray(cycleEntry.goals)) {
          cycleEntry.goals.forEach((g: any, idx: number) => {
            flattenedGoals.push({
              _id: `${cycleEntry.assignmentId}-${idx}`,
              title: g.title,
              description: g.description || '',
              targetDate: cycleEntry.dueDate || new Date().toISOString(),
              status: g.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
              progress: g.status === 'COMPLETED' ? 100 : 50,
              category: cycleEntry.templateName || 'Appraisal',
            });
          });
        }
      });
      setGoals(flattenedGoals);
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };
  if (loading) return <PortalLoading message="Loading performance insights..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PortalPageHeader
          title="Performance"
          description="Track your growth, appraisals, and development goals"
          breadcrumbs={[{ label: 'Performance' }]}
          actions={
            <Link href="/portal/my-performance/history">
              <PortalButton variant="outline" icon={<History className="h-4 w-4" />}>History</PortalButton>
            </Link>
          }
        />
        {error && <PortalErrorState message={error} onRetry={fetchData} />}
        {/* Hero Aspect - Latest Score */}
        {latestAppraisal && (
          <PortalCard padding="none" className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground overflow-hidden">
            <div className="p-8 md:p-10 relative z-10 flex flex-col lg:flex-row items-center gap-10">
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-40 h-40 rounded-full border-8 border-white/10 flex flex-col items-center justify-center bg-white shadow-2xl relative">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></div>
                  <span className="text-5xl font-black text-primary leading-none">{latestAppraisal.overallRating?.toFixed(1) || '--'}</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-primary/60 mt-1">Score Index</span>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= (latestAppraisal.overallRating || 0) ? 'fill-white text-white' : 'text-white/20'}`} />
                  ))}
                </div>
              </div>
              <div className="flex-1 text-center lg:text-left space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">Current Evaluation</p>
                  <h2 className="text-4xl font-black tracking-tight">{latestAppraisal.cycleName}</h2>
                </div>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  <PortalBadge variant="info" className="bg-white/10 border-white/20 text-white">{latestAppraisal.templateName}</PortalBadge>
                  <PortalBadge variant="success" className="bg-white font-black text-primary border-none">{latestAppraisal.status}</PortalBadge>
                </div>
                {latestAppraisal.feedback && (
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative group">
                    <MessageSquare className="absolute -top-3 -left-3 w-8 h-8 text-white/20" />
                    <p className="italic text-lg font-medium">"{latestAppraisal.feedback}"</p>
                    <p className="text-[10px] uppercase font-black tracking-widest mt-4 text-white/40">Reviewed by {latestAppraisal.reviewedBy}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-10 py-4 bg-black/10 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs font-bold opacity-60">Completed on {new Date(latestAppraisal.completedAt || '').toLocaleDateString()}</span>
              <PortalButton variant="ghost" className="text-white hover:bg-white/10 group">
                Full Summary <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </PortalButton>
            </div>
          </PortalCard>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PortalTabs
              tabs={[
                { id: 'summary', label: 'Analysis', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'goals', label: 'Benchmarks', badge: goals.length, icon: <Target className="w-4 h-4" /> },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            {activeTab === 'summary' && latestAppraisal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PortalCard>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-success/10 text-success"><Award className="h-5 w-5" /></div>
                    <h3 className="font-bold">Key Strengths</h3>
                  </div>
                  <div className="space-y-3">
                    {latestAppraisal.strengths?.length ? latestAppraisal.strengths.map((s, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-success/5 border border-success/10 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{s}</p>
                      </div>
                    )) : <p className="text-xs text-muted-foreground italic">No strengths highlighted in this cycle.</p>}
                  </div>
                </PortalCard>
                <PortalCard>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
                    <h3 className="font-bold">Growth Opportunities</h3>
                  </div>
                  <div className="space-y-3">
                    {latestAppraisal.areasForImprovement?.length ? latestAppraisal.areasForImprovement.map((a, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                        <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{a}</p>
                      </div>
                    )) : <p className="text-xs text-muted-foreground italic">No specific growth areas identified.</p>}
                  </div>
                </PortalCard>
              </div>
            )}
            {activeTab === 'goals' && (
              <div className="space-y-4">
                {goals.length > 0 ? goals.map((goal) => (
                  <PortalCard key={goal._id} hover padding="md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{goal.description}</p>
                      </div>
                      <PortalBadge variant={goal.status === 'COMPLETED' ? 'success' : 'warning'}>{goal.status}</PortalBadge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] uppercase font-black opacity-40">Progress Index</span>
                        <span className="text-xs font-black">{goal.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${goal.progress}%` }}></div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-[10px] font-bold uppercase opacity-40">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      <span>Category: {goal.category}</span>
                    </div>
                  </PortalCard>
                )) : (
                  <PortalEmptyState icon={<Target className="w-12 h-12 opacity-20" />} title="No Active Goals" description="Set some benchmarks to track your personal growth trajectory." />
                )}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <PortalCard className="bg-gradient-to-br from-accent/5 to-primary/5">
              <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Guidelines</h3>
              <ul className="space-y-4">
                {[
                  'Evaluations are performed semi-annually by department heads.',
                  'Scores contribute directly to eligibility for internal job applications.',
                  'You can dispute any appraisal outcome within 7 working days.'
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{text}"</p>
                  </li>
                ))}
              </ul>
            </PortalCard>
            <PortalStatCard title="Total Appraisals" value={appraisals.length.toString()} icon={<History className="w-5 h-5" />} accentColor="muted" />
            <PortalStatCard title="Goal Completion" value={`${goals.filter(g => g.status === 'COMPLETED').length}/${goals.length}`} icon={<CheckCircle className="h-5 w-5" />} accentColor="primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
