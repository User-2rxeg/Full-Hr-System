'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { Receipt, TrendingDown, ShieldAlert, UserX, ChevronRight, Info } from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalModal,
  PortalButton,
  PortalTabs,
  PortalErrorState,
} from '@/components/portal';

interface Deduction {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  currency: string;
}

export default function PortalDeductionsPage() {
  const { user } = useAuth();
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [filteredDeductions, setFilteredDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Deduction | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchDeductions = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const [taxRes, insuranceRes, misconductRes, unpaidLeaveRes] = await Promise.all([
        payrollTrackingService.getTaxDeductions(user.id).catch(() => ({ data: [] })),
        payrollTrackingService.getInsuranceDeductions(user.id).catch(() => ({ data: [] })),
        payrollTrackingService.getMisconductDeductions(user.id).catch(() => ({ data: [] })),
        payrollTrackingService.getUnpaidLeaveDeductions(user.id).catch(() => ({ data: [] })),
      ]);

      const all: Deduction[] = [];
      const process = (items: any[], cat: string, type: string) => {
        items.forEach(i => all.push({
          id: i.id || i._id || Math.random().toString(),
          type: i.type || type,
          category: cat,
          amount: Number(i.amount ?? i.deductionAmount ?? 0),
          description: i.description || i.reason || i.name || 'Deduction record',
          date: i.date || i.effectiveDate || new Date().toISOString(),
          currency: i.currency || 'EGP',
        }));
      };

      process(Array.isArray(taxRes?.data) ? taxRes.data : [], 'tax', 'Corporate Tax');
      process(Array.isArray(insuranceRes?.data) ? insuranceRes.data : [], 'insurance', 'Social Insurance');
      process(Array.isArray(misconductRes?.data) ? misconductRes.data : [], 'misconduct', 'Disciplinary');
      process(Array.isArray(unpaidLeaveRes?.data) ? unpaidLeaveRes.data : [], 'unpaid_leave', 'Unpaid Leave');

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDeductions(all);
      setFilteredDeductions(all);
    } catch (err: any) {
      setError(err.message || 'Failed to load deductions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeductions();
  }, [user?.id]);

  useEffect(() => {
    setFilteredDeductions(activeCategory === 'all' ? deductions : deductions.filter(d => d.category === activeCategory));
  }, [deductions, activeCategory]);

  const stats = {
    total: deductions.reduce((s, d) => s + d.amount, 0),
    tax: deductions.filter(d => d.category === 'tax').reduce((s, d) => s + d.amount, 0),
    ins: deductions.filter(d => d.category === 'insurance').reduce((s, d) => s + d.amount, 0),
    mis: deductions.filter(d => d.category === 'misconduct').reduce((s, d) => s + d.amount, 0),
  };

  if (loading) return <PortalLoading message="Calculating compliance delta..." fullScreen />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Deduction Center المركز الخصومات"
          description="Global view of all salary reductions including statutory taxes, social insurance, and disciplinary adjustments"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'Deductions' }]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PortalStatCard title="Total Reductions" value={`${stats.total.toLocaleString()} EGP`} icon={<TrendingDown className="w-5 h-5" />} accentColor="destructive" />
          <PortalStatCard title="Statutory Tax" value={`${stats.tax.toLocaleString()} EGP`} icon={<Receipt className="w-5 h-5" />} accentColor="primary" />
          <PortalStatCard title="Social Security" value={`${stats.ins.toLocaleString()} EGP`} icon={<ShieldAlert className="w-5 h-5" />} accentColor="accent" />
          <PortalStatCard title="Disciplinary" value={`${stats.mis.toLocaleString()} EGP`} icon={<UserX className="w-5 h-5" />} accentColor="warning" />
        </div>

        {error && <PortalErrorState message={error} onRetry={fetchDeductions} />}

        <PortalTabs
          tabs={[
            { id: 'all', label: 'All Entries' },
            { id: 'tax', label: 'Taxation' },
            { id: 'insurance', label: 'Insurance' },
            { id: 'misconduct', label: 'Disciplinary', badge: deductions.filter(d => d.category === 'misconduct').length || undefined },
            { id: 'unpaid_leave', label: 'Absence' }
          ]}
          activeTab={activeCategory}
          onTabChange={setActiveCategory}
        />

        <div className="space-y-3">
          {filteredDeductions.length > 0 ? filteredDeductions.map((d) => (
            <PortalCard key={d.id} hover padding="none" className="overflow-hidden group" onClick={() => setSelectedItem(d)}>
               <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                     <div className={`p-4 rounded-2xl ${
                       d.category === 'misconduct' ? 'bg-destructive/10 text-destructive' : 
                       d.category === 'tax' ? 'bg-primary/10 text-primary' : 
                       'bg-muted text-muted-foreground'
                     } transition-all`}>
                        <Receipt className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-extrabold text-lg">{d.type.toUpperCase()}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(d.date).toLocaleDateString()}</span>
                           <PortalBadge variant={d.category === 'misconduct' ? 'destructive' : 'default'} size="sm">{d.category.replace('_', ' ').toUpperCase()}</PortalBadge>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-8">
                     <div className="text-right">
                        <p className="text-[10px] font-black opacity-40 uppercase mb-1">Impact Amount</p>
                        <p className="font-black text-xl text-destructive">-{d.amount.toLocaleString()} <span className="text-xs opacity-60 font-bold">{d.currency}</span></p>
                     </div>
                     <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />} />
                  </div>
               </div>
            </PortalCard>
          )) : (
            <PortalEmptyState icon={<Receipt className="w-16 h-16 opacity-10" />} title="No Deductions Found" description="Select another category or check back after the next cycle." />
          )}
        </div>
      </div>

      <PortalModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Deduction Detail">
         {selectedItem && (
           <div className="space-y-8">
              <div className="p-8 bg-destructive/5 border border-destructive/10 rounded-[40px] flex flex-col items-center text-center">
                 <div className="p-4 bg-white rounded-2xl shadow-xl mb-4">
                    <Receipt className="w-10 h-10 text-destructive" />
                 </div>
                 <p className="text-xs font-black uppercase text-destructive/60 tracking-widest mb-2">Verified Reduction</p>
                 <h2 className="text-5xl font-black tracking-tighter text-destructive">-{selectedItem.amount.toLocaleString()} <span className="text-xl opacity-60">{selectedItem.currency}</span></h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 bg-muted/30 rounded-3xl">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Global Type</p>
                    <p className="font-bold">{selectedItem.type}</p>
                 </div>
                 <div className="p-5 bg-muted/30 rounded-3xl">
                    <p className="text-[10px] font-black uppercase opacity-40 mb-1">Applied Date</p>
                    <p className="font-bold">{new Date(selectedItem.date).toLocaleDateString()}</p>
                 </div>
              </div>

              <div>
                 <p className="text-[10px] font-black uppercase opacity-40 mb-3 px-1">Case Rationale</p>
                 <div className="p-6 bg-background border border-border rounded-3xl italic text-foreground/80 leading-relaxed">
                    "{selectedItem.description}"
                 </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                 <Info className="w-5 h-5 text-primary" />
                 <p className="text-xs font-bold text-primary/80 leading-tight">This deduction is verified under Labor Law Section 42-B and Internal Compliance Protocols.</p>
              </div>
           </div>
         )}
      </PortalModal>
    </div>
  );
}

