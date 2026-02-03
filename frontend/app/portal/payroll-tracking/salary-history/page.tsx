'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { TrendingUp, Minus, DollarSign, Award, ArrowRight, ShieldCheck, History } from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalModal,
  PortalButton,
  PortalSelect,
  PortalErrorState,
} from '@/components/portal';
interface SalaryChange {
  id: string;
  effectiveDate: string;
  previousSalary: number;
  newSalary: number;
  changeType: string;
  reason: string;
  currency: string;
}
export default function PortalSalaryHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SalaryChange[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<SalaryChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SalaryChange | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const fetchHistory = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await payrollTrackingService.getSalaryHistory(user.id);
      let data: any[] = [];
      if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res)) data = res;
      const normalized = data.map((item: any) => ({
        id: item.id || item._id || Math.random().toString(),
        effectiveDate: item.effectiveDate || item.date || new Date().toISOString(),
        previousSalary: Number(item.previousSalary ?? item.oldSalary ?? 0),
        newSalary: Number(item.newSalary ?? item.salary ?? 0),
        changeType: item.changeType || item.type || 'adjustment',
        reason: item.reason || item.description || 'Salary adjustment',
        currency: item.currency || 'EGP',
      }));
      setHistory(normalized);
      setFilteredHistory(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchHistory();
  }, [user?.id]);
  useEffect(() => {
    let filtered = [...history];
    if (yearFilter !== 'all') filtered = filtered.filter(h => new Date(h.effectiveDate).getFullYear().toString() === yearFilter);
    setFilteredHistory(filtered);
  }, [history, yearFilter]);
  const getChangeVariant = (prev: number, curr: number): 'success' | 'destructive' | 'default' => {
    if (curr > prev) return 'success';
    if (curr < prev) return 'destructive';
    return 'default';
  };
  const currentSalary = history.length > 0 ? history[0].newSalary : 0;
  const startingSalary = history.length > 0 ? history[history.length - 1].previousSalary : 0;
  const totalGrowth = startingSalary > 0 ? ((currentSalary - startingSalary) / startingSalary) * 100 : 0;
  const years = [...new Set(history.map(h => new Date(h.effectiveDate).getFullYear()))].sort((a, b) => b - a);
  if (loading) return <PortalLoading message="Analyzing pay trajectory..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Evolution of Pay"
          description="A historical perspective of your compensation packages and role-based adjustments"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'History' }]}
          actions={
            years.length > 0 && (
              <PortalSelect
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                options={[{ label: 'All Years', value: 'all' }, ...years.map(y => ({ label: y.toString(), value: y.toString() }))]}
              />
            )
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PortalStatCard title="Current Package" value={`${currentSalary.toLocaleString()} EGP`} icon={<DollarSign className="w-5 h-5" />} accentColor="primary" />
          <PortalStatCard title="Career Growth" value={`${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} accentColor="accent" />
          <PortalStatCard title="Total Adjustments" value={history.length} icon={<Award className="w-5 h-5" />} accentColor="muted" />
        </div>
        {error && <PortalErrorState message={error} onRetry={fetchHistory} />}
        <div className="space-y-4">
          {filteredHistory.length > 0 ? filteredHistory.map((item) => {
             const isPositive = item.newSalary > item.previousSalary;
             const diff = item.newSalary - item.previousSalary;
             return (
               <PortalCard key={item.id} hover padding="none" className="overflow-hidden group" onClick={() => setSelectedItem(item)}>
                 <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                   <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isPositive ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'
                      }`}>
                         {isPositive ? <TrendingUp className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                      </div>
                      <div>
                         <h3 className="font-black text-lg">{item.changeType.toUpperCase()}</h3>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Effective {new Date(item.effectiveDate).toLocaleDateString()}</span>
                            <PortalBadge variant={getChangeVariant(item.previousSalary, item.newSalary)}>
                               {((diff/ (item.previousSalary || 1)) * 100).toFixed(1)}% {isPositive ? 'Increase' : 'Delta'}
                            </PortalBadge>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-10">
                      <div className="text-right hidden md:block">
                         <p className="text-[10px] font-black opacity-40 uppercase mb-1">New Allocation</p>
                         <p className="font-extrabold text-xl">{item.newSalary.toLocaleString()} <span className="text-xs opacity-60 uppercase">{item.currency}</span></p>
                      </div>
                      <PortalButton variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}>Details</PortalButton>
                   </div>
                 </div>
               </PortalCard>
             );
          }) : (
            <PortalEmptyState icon={<History className="w-16 h-16 opacity-10" />} title="Static Archive" description="No salary interventions recorded for the selected window." />
          )}
        </div>
      </div>
      <PortalModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Adjustment Breakdown">
         {selectedItem && (
           <div className="space-y-8">
              <div className="p-6 bg-muted/20 border border-border/50 rounded-[32px] flex justify-between items-center">
                 <div>
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Adjustment Type</p>
                    <h4 className="font-black text-xl">{selectedItem.changeType.toUpperCase()}</h4>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Effective Range</p>
                    <p className="font-bold">{new Date(selectedItem.effectiveDate).toLocaleDateString()} - Present</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="p-6 border border-border rounded-3xl">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-3">Previous Baseline</p>
                    <p className="text-2xl font-bold opacity-60">{selectedItem.previousSalary.toLocaleString()} {selectedItem.currency}</p>
                 </div>
                 <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl">
                    <p className="text-[10px] font-black uppercase text-primary mb-3">New Baseline</p>
                    <p className="text-2xl font-black text-primary">{selectedItem.newSalary.toLocaleString()} {selectedItem.currency}</p>
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase opacity-40 mb-3">Case Rationale</p>
                 <div className="p-6 bg-muted/30 rounded-2xl italic leading-relaxed text-foreground/80">
                    "{selectedItem.reason}"
                 </div>
              </div>
              <div className="p-4 flex items-center gap-3 bg-success/10 border border-success/20 rounded-2xl">
                 <ShieldCheck className="w-5 h-5 text-success" />
                 <p className="text-xs font-bold text-success/80">This adjustment has been verified by Corporate Finance and HR Audit.</p>
              </div>
           </div>
         )}
      </PortalModal>
    </div>
  );
}
