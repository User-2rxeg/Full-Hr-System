'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  FileX,
  AlertTriangle,
  LogOut,
  UserMinus,
  ClipboardCheck,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  ShieldCheck,
  History,
  TrendingDown
} from 'lucide-react';

export default function OffboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TerminationStatus>('all');
  const [filterType, setFilterType] = useState<'all' | 'resignations' | 'terminations'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getAllTerminationRequests();
      setRequests(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch offboarding data:', err);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setRequests([]);
      } else {
        setError(err.message || 'Failed to fetch offboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizeValue = (val: string) => val?.toLowerCase?.() || val;

  const filteredRequests = requests.filter((request) => {
    const requestStatus = normalizeValue(request.status);
    const requestInitiator = normalizeValue(request.initiator);

    if (filterStatus !== 'all' && requestStatus !== normalizeValue(filterStatus)) return false;
    if (filterType === 'resignations' && requestInitiator !== normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    if (filterType === 'terminations' && requestInitiator === normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.PENDING)).length,
    underReview: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.UNDER_REVIEW)).length,
    approved: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.APPROVED)).length,
    resignations: requests.filter((r) => normalizeValue(r.initiator) === normalizeValue(TerminationInitiation.EMPLOYEE)).length,
    terminations: requests.filter((r) => normalizeValue(r.initiator) !== normalizeValue(TerminationInitiation.EMPLOYEE)).length,
  };

  const getInitiatorLabel = (initiator: TerminationInitiation) => {
    switch (initiator) {
      case TerminationInitiation.EMPLOYEE:
        return 'Resignation';
      case TerminationInitiation.HR:
        return 'HR Initiated';
      case TerminationInitiation.MANAGER:
        return 'Manager Initiated';
      default:
        return initiator;
    }
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
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-orange-500/5 to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full -z-10 animate-pulse transition-duration-700"></div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 border-b border-border/50 pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Offboarding Protocol
            </h1>
            <p className="text-muted-foreground text-lg font-medium">
              Ensure graceful exits and complete compliance for every separation.
            </p>
          </div>
          <Button size="lg" className="h-11 shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-600 to-red-600 hover:shadow-xl transition-all hover:scale-[1.02] gap-2" asChild>
            <Link href="/dashboard/hr-manager/offboarding/termination-reviews">
              <UserMinus className="w-5 h-5" />
              <span>Initiate Termination</span>
            </Link>
          </Button>
        </div>

        {error && (
          <GlassCard className=" border-destructive/20 bg-destructive/5 text-destructive p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="hover:bg-destructive/10 border-destructive/20 text-destructive">Retry</Button>
          </GlassCard>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Separations', value: stats.total, icon: FileX, color: 'text-foreground', sub: 'Lifetime Volume' },
            { label: 'Action Required', value: stats.pending + stats.underReview, icon: AlertTriangle, color: 'text-orange-500', sub: 'Pending Review' },
            { label: 'Voluntary', value: stats.resignations, icon: LogOut, color: 'text-blue-500', sub: 'Resignations' },
            { label: 'Involuntary', value: stats.terminations, icon: UserMinus, color: 'text-red-500', sub: 'Terminations' },
          ].map((stat, i) => (
            <GlassCard key={i} variant="hover" className="p-6 relative overflow-hidden group border-l-4 border-l-border/10">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className={`w-20 h-20 ${stat.color}`} />
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-4xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
                </div>
                <p className="text-xs text-muted-foreground font-medium">{stat.sub}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Workflow Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { href: '/dashboard/hr-manager/offboarding/resignations', icon: LogOut, color: 'text-blue-500', title: 'Resignations', desc: 'Voluntary separation desk' },
            { href: '/dashboard/hr-manager/offboarding/termination-reviews', icon: ShieldCheck, color: 'text-orange-500', title: 'Reviews', desc: 'Termination audit trail' },
            { href: '/dashboard/hr-manager/offboarding/checklist', icon: ClipboardCheck, color: 'text-emerald-500', title: 'Clearance', desc: 'Departmental sign-offs' },
            { href: '/dashboard/hr-manager/offboarding/final-settlement', icon: DollarSign, color: 'text-purple-500', title: 'Settlement', desc: 'Financial closure' }
          ].map((item, i) => (
            <Link key={i} href={item.href}>
              <GlassCard className="p-5 flex items-center gap-4 hover:bg-muted/50 transition-all group hover:border-primary/20 hover:scale-[1.02]">
                <div className="p-3 rounded-2xl bg-muted/80 group-hover:bg-background border border-border group-hover:border-primary/10 transition-all shadow-sm">
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

        {/* Table/List Filter Workspace */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-2 rounded-2xl backdrop-blur-md border border-border/50">
            <div className="flex items-center gap-2 p-1 bg-background/50 rounded-xl border border-border/50 w-full md:w-auto overflow-x-auto">
              <div className="flex px-2 py-1 items-center gap-1 border-r border-border/50 mr-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-transparent text-xs font-bold px-3 py-1.5 focus:outline-none focus:ring-0 text-foreground"
              >
                <option value="all">Every Move</option>
                <option value="resignations">Resignation Only</option>
                <option value="terminations">Terminations Only</option>
              </select>
              <div className="h-4 w-[1px] bg-border/50 mx-1" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent text-xs font-bold px-3 py-1.5 focus:outline-none focus:ring-0 text-foreground"
              >
                <option value="all">Current Status</option>
                <option value={TerminationStatus.PENDING}>Pending</option>
                <option value={TerminationStatus.UNDER_REVIEW}>Under Review</option>
                <option value={TerminationStatus.APPROVED}>Approved</option>
                <option value={TerminationStatus.REJECTED}>Rejected</option>
              </select>
            </div>

            <div className="relative group w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Find a specific request..."
                className="w-full pl-10 pr-4 py-2 bg-background/40 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          <GlassCard className="overflow-hidden border-border/40">
            <div className="px-6 py-5 border-b border-border/50 bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                <h2 className="font-bold text-foreground tracking-tight">Active Separation Cases</h2>
                <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-500/10 py-0.5">{filteredRequests.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-9 gap-2 text-xs font-bold hover:bg-background">
                <History className="w-3.5 h-3.5" />
                View Archives
              </Button>
            </div>

            <div className="divide-y divide-border/30">
              {filteredRequests.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 bg-muted/40 rounded-[2rem] flex items-center justify-center mb-8 rotate-12 transition-transform">
                    <TrendingDown className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Minimal Attrition</h3>
                  <p className="text-muted-foreground mt-3 max-w-sm text-sm font-medium leading-relaxed">
                    No active separation cases match your current filters. Looking clean!
                  </p>
                  <Button variant="outline" className="mt-8 rounded-xl border-border px-8 font-bold" onClick={() => { setFilterType('all'); setFilterStatus('all'); }}>Reset View</Button>
                </div>
              ) : (
                filteredRequests.map((request) => {
                  const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
                  const employeeName = employee
                    ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Internal User'
                    : 'Internal User';
                  const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;
                  return (
                    <Link
                      key={request._id}
                      href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                      className="block hover:bg-muted/30 transition-all duration-300 group"
                    >
                      <div className="px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-95 ${isResignation ? 'bg-blue-500/10 text-blue-500 border border-blue-500/10' : 'bg-red-500/10 text-red-500 border border-red-500/10'}`}>
                            {isResignation ? <LogOut className="w-6 h-6" /> : <UserMinus className="w-6 h-6" />}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors tracking-tight">{employeeName}</h3>
                              <StatusBadge status={request.status} />
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                              <span className="flex items-center gap-1.5">
                                {isResignation ? <LogOut className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                                {getInitiatorLabel(request.initiator)}
                              </span>
                              <span className="w-1 h-1 bg-border rounded-full"></span>
                              <span className="italic normal-case font-medium text-muted-foreground/80 max-w-md truncate">"{request.reason}"</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8 justify-between md:justify-end">
                          <div className="text-right space-y-1.5 font-bold">
                            <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground tracking-widest uppercase">
                              <Calendar className="w-3 h-3" />
                              Logged: {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                            {request.terminationDate && (
                              <p className="text-xs text-orange-500 bg-orange-500/5 px-2 py-0.5 rounded-md border border-orange-500/10">
                                Last Day: {new Date(request.terminationDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all border border-border/50 group-hover:border-primary">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </Link>
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
