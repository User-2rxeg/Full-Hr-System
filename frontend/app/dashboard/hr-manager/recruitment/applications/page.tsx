'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  getApplications,
  getJobs,
  updateApplicationStage,
  updateApplicationStatus,
  rejectApplication,
} from '@/app/services/recruitment';
import { Application, JobRequisition } from '@/app/types/recruitment';
import { ApplicationStage, ApplicationStatus } from '@/app/types/enums';
import {
  Users,
  Search,
  Filter,
  Briefcase,
  Calendar,
  ArrowRight,
  MoreVertical,
  UserCheck,
  UserMinus,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  Download
} from 'lucide-react';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { toast } from 'sonner';

export default function HRManagerApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter, stageFilter, jobFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsData, jobsData] = await Promise.all([
        getApplications({
          ...(statusFilter !== 'all' && { status: statusFilter as ApplicationStatus }),
          ...(stageFilter !== 'all' && { stage: stageFilter as ApplicationStage }),
          ...(jobFilter !== 'all' && { requisitionId: jobFilter }),
        }),
        getJobs(),
      ]);

      setApplications(appsData);
      setJobs(jobsData);
    } catch (err: any) {
      toast.error('Failed to synchronize pipeline data');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const candidateName = app.candidateName || '';
      const candidateEmail = app.candidateEmail || '';
      const jobTitle = app.jobTitle || '';
      const searchLower = searchTerm.toLowerCase();
      return (
        candidateName.toLowerCase().includes(searchLower) ||
        candidateEmail.toLowerCase().includes(searchLower) ||
        jobTitle.toLowerCase().includes(searchLower)
      );
    });
  }, [applications, searchTerm]);

  const handleStageChange = async (appId: string, newStage: ApplicationStage) => {
    try {
      await updateApplicationStage(appId, newStage);
      toast.success('Pipeline stage transitioned');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Stage transition failed');
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt('Institutional rejection rationale (optional):');
    if (reason === null) return;

    try {
      await rejectApplication(appId, reason || undefined);
      toast.success('Dossier archived');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Archival protocol failed');
    }
  };

  const statusConfigs: Record<string, { label: string; color: string; icon: any }> = {
    [ApplicationStatus.SUBMITTED]: { label: 'New Arrival', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Mail },
    [ApplicationStatus.IN_PROCESS]: { label: 'Active Pipeline', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Zap },
    [ApplicationStatus.OFFER]: { label: 'Negotiation', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: Sparkles },
    [ApplicationStatus.HIRED]: { label: 'Strategic Hire', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: ShieldCheck },
    [ApplicationStatus.REJECTED]: { label: 'Archived', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Synchronizing Global Pipeline</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* Main Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-border/50 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-1">
            <span className="w-10 h-[1.5px] bg-primary/40 rounded-full" /> Pipeline Orchestration Center
          </div>
          <h1 className="text-5xl font-black text-foreground tracking-tighter leading-tight flex flex-wrap items-center gap-4">
            Talent Influx Hub
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm py-1.5 px-4 font-black tracking-widest h-fit">
              {applications.length} DATASETS
            </Badge>
          </h1>
          <p className="max-w-3xl text-muted-foreground text-lg font-medium opacity-70 leading-relaxed italic">
            Strategic oversight of the GIU global recruitment funnel. Monitor candidate velocity and manage institutional dossier transitions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-1.5 rounded-2xl border border-border/50 h-fit">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => setViewMode('list')}
            className={`rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest gap-2 transition-all ${viewMode === 'list' ? 'shadow-xl' : ''}`}
          >
            <List className="w-4 h-4" /> Operational List
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            onClick={() => setViewMode('kanban')}
            className={`rounded-xl h-11 px-6 font-black text-[10px] uppercase tracking-widest gap-2 transition-all ${viewMode === 'kanban' ? 'shadow-xl' : ''}`}
          >
            <LayoutGrid className="w-4 h-4" /> Pipeline Board
          </Button>
        </div>
      </div>

      {/* Analytics Command Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Unprocessed', count: applications.filter(a => a.status === ApplicationStatus.SUBMITTED).length, icon: Mail, color: 'text-blue-500', trend: '+12%' },
          { label: 'In Evaluation', count: applications.filter(a => a.status === ApplicationStatus.IN_PROCESS).length, icon: Users, color: 'text-amber-500', trend: '+5%' },
          { label: 'Active Offers', count: applications.filter(a => a.status === ApplicationStatus.OFFER).length, icon: Sparkles, color: 'text-indigo-500', trend: 'STABLE' },
          { label: 'Strategic Hires', count: applications.filter(a => a.status === ApplicationStatus.HIRED).length, icon: ShieldCheck, color: 'text-emerald-500', trend: '+24%' },
          { label: 'Archived Dossiers', count: applications.filter(a => a.status === ApplicationStatus.REJECTED).length, icon: XCircle, color: 'text-destructive', trend: '-8%' },
        ].map((s, i) => (
          <GlassCard key={i} className="p-6 relative group overflow-hidden border-border/30 hover:border-primary/20 transition-all">
            <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${s.color}`}>
              <s.icon size={120} strokeWidth={1} />
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl bg-muted/50 border border-border/50 group-hover:scale-110 transition-transform ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <Badge variant="secondary" className="text-[9px] font-black tracking-widest text-muted-foreground/50">{s.trend}</Badge>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{s.label} Dossiers</p>
                <p className="text-4xl font-black text-foreground tracking-tighter leading-none">{s.count}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Operational Hub */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-muted/10 p-2 rounded-3xl border border-border/30 backdrop-blur-xl">
          <div className="relative group flex-1 w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all" />
            <Input
              placeholder="Search by Identity, Position, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-background/50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold tracking-tight text-sm placeholder:font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 p-1 bg-background/30 rounded-2xl border border-white/5 w-full lg:w-auto">
            <div className="flex items-center h-14 px-4 gap-4 overflow-x-auto no-scrollbar">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Global Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 h-8 border-none bg-transparent font-black uppercase text-[10px] tracking-widest text-primary p-0 h-fit hover:text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All States</SelectItem>
                    {Object.values(ApplicationStatus).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[1px] h-8 bg-border/50" />

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Tunnel Stage</Label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-32 h-8 border-none bg-transparent font-black uppercase text-[10px] tracking-widest text-primary p-0 h-fit hover:text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">All Stages</SelectItem>
                    {Object.values(ApplicationStage).map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[1px] h-8 bg-border/50" />

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">Mandate Link</Label>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-48 h-8 border-none bg-transparent font-black uppercase text-[10px] tracking-widest text-primary p-0 h-fit hover:text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-w-[300px]">
                    <SelectItem value="all">All Mandates</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id || job._id || ''} value={job.id || job._id || ''}>
                        {job.requisitionId}: {job.templateTitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button variant="ghost" className="h-12 w-12 rounded-xl text-muted-foreground hover:text-primary transition-all">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <GlassCard className="overflow-hidden border-border/30 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50 shadow-sm">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Candidate Identity</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Target Mandate</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Process State</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">Velocity</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center opacity-30 gap-4">
                          <Users className="w-20 h-20 stroke-[1] text-primary" />
                          <div className="space-y-1">
                            <p className="text-2xl font-black tracking-tighter uppercase">No match found in current grid</p>
                            <p className="text-sm font-bold tracking-widest uppercase opacity-60">Try adjusting your filtration parameters</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => {
                      const cfg = statusConfigs[app.status] || { label: app.status, color: 'bg-muted text-muted-foreground', icon: Clock };
                      const Icon = cfg.icon;
                      return (
                        <tr key={app.id || app._id} className="group hover:bg-primary/5 transition-all duration-300">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <Avatar className="w-14 h-14 rounded-[20px] ring-2 ring-background shadow-xl group-hover:scale-105 transition-transform border border-border/50">
                                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xl uppercase italic">
                                    {app.candidateName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-emerald-500 border-2 border-background shadow-lg" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-black text-foreground group-hover:text-primary transition-colors tracking-tighter leading-none text-lg uppercase truncate max-w-[200px]">{app.candidateName}</p>
                                <p className="text-[11px] font-bold text-muted-foreground/60 flex items-center gap-2 tracking-tight uppercase">
                                  <Mail className="w-3.5 h-3.5 opacity-50" /> {app.candidateEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1.5">
                              <p className="text-sm font-black text-foreground/90 leading-tight uppercase tracking-tighter">{app.jobTitle}</p>
                              <Badge variant="secondary" className="p-0 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest hover:text-primary transition-colors cursor-default">
                                {app.departmentName}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2">
                              <Badge variant="outline" className={`py-1 px-3 uppercase text-[9px] font-black tracking-widest flex items-center gap-2 w-fit italic ${cfg.color}`}>
                                <Icon className="w-3.5 h-3.5" /> {cfg.label}
                              </Badge>
                              <span className="text-[10px] font-black uppercase text-foreground/70 flex items-center gap-1.5 tracking-widest">
                                <span className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                {app.currentStage.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden border border-border/20">
                                <div className={`h-full bg-primary/40 rounded-full w-2/3 animate-pulse`} />
                              </div>
                              <span className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest italic">Optimal Path</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/dashboard/hr-manager/recruitment/applications/${app.id}`)}
                                className="h-10 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-border hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                              >
                                View Dossier <ChevronRight className="w-3.5 h-3.5 ml-2" />
                              </Button>

                              {app.status !== ApplicationStatus.REJECTED && app.status !== ApplicationStatus.HIRED && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReject(app.id)}
                                    className="h-10 w-10 rounded-2xl hover:bg-destructive/5 text-destructive border border-transparent hover:border-destructive/10 transition-all"
                                    title="Archive Dossier"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ) : (
          <div className="p-20 text-center space-y-4 border-2 border-dashed border-border/30 rounded-[40px] opacity-40">
            <Zap className="w-20 h-20 mx-auto text-primary animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-3xl font-black tracking-tighter uppercase">Board Orchestration Offline</h3>
              <p className="text-sm font-bold tracking-widest uppercase">Visual Kanban rendering is currently in development for HR Manager core.</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
