'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { Briefcase, TrendingUp, Users, ShieldCheck, Heart, Landmark, Info, ChevronRight, History } from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalModal,
  PortalButton,
  PortalBadge,
  PortalErrorState,
} from '@/components/portal';
interface Contribution {
  id: string;
  type: string;
  employerAmount: number;
  employeeAmount: number;
  description: string;
  date: string;
  currency: string;
}
export default function PortalContributionsPage() {
  const { user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Contribution | null>(null);
  const fetchContributions = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await payrollTrackingService.getEmployerContributions(user.id);
      const data = (res?.data || []) as any[];
      const normalized = data.map((item: any) => ({
        id: item.id || item._id || Math.random().toString(),
        type: item.type || item.contributionType || 'Other',
        employerAmount: Number(item.employerAmount ?? item.amount ?? 0),
        employeeAmount: Number(item.employeeAmount ?? 0),
        description: item.description || item.name || '',
        date: item.date || item.effectiveDate || new Date().toISOString(),
        currency: item.currency || 'EGP',
      }));
      setContributions(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchContributions();
  }, [user?.id]);
  const totalEmployer = contributions.reduce((s, c) => s + c.employerAmount, 0);
  const totalEmployee = contributions.reduce((s, c) => s + c.employeeAmount, 0);
  if (loading) return <PortalLoading message="Auditing corporate contributions..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Corporate Contributions المركز المساهمات"
          description="View supplementary payments made by the organization on your behalf for insurance, retirement, and safety"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'Contributions' }]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PortalStatCard title="Employer Support" value={`${totalEmployer.toLocaleString()} EGP`} icon={<Briefcase className="h-5 w-5" />} accentColor="primary" />
          <PortalStatCard title="Personal Stake" value={`${totalEmployee.toLocaleString()} EGP`} icon={<Users className="h-5 w-5" />} accentColor="primary" />
          <PortalStatCard title="Global Aggregate" value={`${(totalEmployer + totalEmployee).toLocaleString()} EGP`} icon={<History className="w-5 h-5" />} accentColor="muted" />
        </div>
        {error && <PortalErrorState message={error} onRetry={fetchContributions} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-4">
              {contributions.length > 0 ? contributions.map((c) => (
                <PortalCard key={c.id} hover padding="none" className="overflow-hidden group" onClick={() => setSelectedItem(c)}>
                   <div className="p-6 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                         <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                            <ShieldCheck className="w-6 h-6" />
                         </div>
                         <div>
                            <h3 className="font-extrabold text-lg uppercase">{c.type.replace('_', ' ')}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-widest">{new Date(c.date).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <div className="text-right flex items-center gap-10">
                         <div className="hidden sm:block">
                            <p className="text-[10px] font-black opacity-40 uppercase mb-1">Corporate Delta</p>
                            <p className="font-black text-xl text-primary">+{c.employerAmount.toLocaleString()} <span className="text-xs opacity-60">{c.currency}</span></p>
                         </div>
                         <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />} />
                      </div>
                   </div>
                </PortalCard>
              )) : (
                <PortalEmptyState icon={<Landmark className="w-16 h-16 opacity-10" />} title="No Active Contributions" description="Company-paid benefits will appear here after verification." />
              )}
           </div>
           <div className="space-y-6">
              <PortalCard className="bg-gradient-to-br from-primary/5 to-primary/5 border-dashed border-2">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Mechanism</h3>
                 <p className="text-xs text-muted-foreground leading-relaxed italic mb-6">
                    "These contributions are directly remitted to the relevant statutory bodies and do not impact your liquidity."
                 </p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Heart className="w-4 h-4" /></div>
                       <p className="text-[10px] font-bold uppercase tracking-wide">Health & Wellness Insurance</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Landmark className="w-4 h-4" /></div>
                       <p className="text-[10px] font-bold uppercase tracking-wide">National Pension Scheme</p>
                    </div>
                 </div>
              </PortalCard>
           </div>
        </div>
      </div>
      <PortalModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Contribution Analytics">
         {selectedItem && (
           <div className="space-y-8">
              <div className="text-center p-8 bg-primary/5 border border-primary/10 rounded-[40px]">
                 <div className="p-4 bg-white shadow-xl rounded-2xl w-fit mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                 </div>
                 <p className="text-xs font-black uppercase text-primary/60 tracking-[0.2em] mb-2">Verified Support</p>
                 <h2 className="text-5xl font-black tracking-tighter text-primary">+{selectedItem.employerAmount.toLocaleString()} <span className="text-xl opacity-60">{selectedItem.currency}</span></h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <PortalCard className="bg-muted/30 border-none">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Benefit Model</p>
                    <p className="font-bold">{selectedItem.type.replace('_', ' ')}</p>
                 </PortalCard>
                 <PortalCard className="bg-muted/30 border-none">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Effective Window</p>
                    <p className="font-bold">{new Date(selectedItem.date).toLocaleDateString()}</p>
                 </PortalCard>
              </div>
              <div className="p-6 bg-muted/10 rounded-3xl space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-muted-foreground">Employer Liquidity</span>
                    <span className="font-black text-primary">+{selectedItem.employerAmount.toLocaleString()} {selectedItem.currency}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-t border-border pt-4">
                    <span className="font-bold text-muted-foreground">Personal Liability</span>
                    <span className="font-black text-primary">-{selectedItem.employeeAmount.toLocaleString()} {selectedItem.currency}</span>
                 </div>
              </div>
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                 <Info className="w-5 h-5 text-primary shrink-0" />
                 <p className="text-[10px] font-bold text-primary/80 leading-tight italic">Global compensation auditing ensures 100% compliance with international and local employment standards.</p>
              </div>
           </div>
         )}
      </PortalModal>
    </div>
  );
}
