'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { FileText, Download, Eye, DollarSign, ShieldCheck, Search, History } from 'lucide-react';
import {
  PortalPageHeader,
  PortalCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalModal,
  PortalButton,
  PortalInput,
  PortalSelect,
  PortalStatCard,
  PortalErrorState,
} from '@/components/portal';
interface Payslip {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  baseSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  earnings?: { type: string; amount: number; description?: string }[];
  deductions?: { type: string; amount: number; description?: string }[];
}
export default function PortalPayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [filteredPayslips, setFilteredPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fetchPayslips = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await payrollTrackingService.getEmployeePayslipsMapped(user.id);
      let data: any[] = [];
      if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res)) data = res;
      const mapped = data.map((p: any) => ({
        id: p.id || p.payslipId || p._id || '',
        periodStart: p.periodStart || p.from || new Date().toISOString(),
        periodEnd: p.periodEnd || p.to || new Date().toISOString(),
        payDate: p.payDate || p.paidAt || new Date().toISOString(),
        status: p.status || 'paid',
        baseSalary: Number(p.baseSalary ?? 0) || 0,
        grossPay: Number(p.grossPay ?? 0) || 0,
        totalDeductions: Number(p.totalDeductions ?? 0) || 0,
        netPay: Number(p.netPay ?? 0) || 0,
        currency: p.currency || 'EGP',
        earnings: p.earnings || [],
        deductions: p.deductions || [],
      }));
      setPayslips(mapped);
      setFilteredPayslips(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPayslips();
  }, [user?.id]);
  useEffect(() => {
    let filtered = [...payslips];
    if (yearFilter !== 'all') filtered = filtered.filter(p => new Date(p.periodEnd).getFullYear().toString() === yearFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        new Date(p.periodEnd).toLocaleDateString('en-US', { month: 'long' }).toLowerCase().includes(q)
      );
    }
    setFilteredPayslips(filtered);
  }, [payslips, yearFilter, searchQuery]);
  const handleDownload = async (id: string) => {
    if (!user?.id) return;
    try {
      setDownloading(id);
      const res = await payrollTrackingService.downloadPayslip(id, user.id);
      if (res?.blob) {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename || `payslip-${id}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) { console.error(err); } finally { setDownloading(null); }
  };
  const handleViewDetails = async (p: Payslip) => {
    if (!user?.id) return;
    try {
      const res = await payrollTrackingService.getPayslipDetailsMapped(p.id, user.id);
      setSelectedPayslip({ ...p, ...res?.data?.payslip });
    } catch { setSelectedPayslip(p); }
  };
  const years = [...new Set(payslips.map(p => new Date(p.periodEnd).getFullYear()))].sort((a, b) => b - a);
  if (loading) return <PortalLoading message="Decrypting salary tokens..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Payslip Archives"
          description="Access your monthly verified earnings and historical settlement records"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'Payslips' }]}
          actions={
            <div className="flex gap-2">
               <PortalSelect
                 value={yearFilter}
                 onChange={(e) => setYearFilter(e.target.value)}
                 options={[{ label: 'All Years', value: 'all' }, ...years.map(y => ({ label: y.toString(), value: y.toString() }))]}
               />
            </div>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <PortalStatCard title="Total Collected" value={payslips.length} icon={<History className="w-5 h-5" />} accentColor="primary" />
           <PortalStatCard 
             title="Latest Net" 
             value={`${payslips[0]?.netPay.toLocaleString() || 0} ${payslips[0]?.currency || ''}`} 
             icon={<DollarSign className="w-5 h-5" />} 
             accentColor="accent" 
           />
           <PortalStatCard title="Verified Bank" value="Standard Chartered" icon={<ShieldCheck className="w-5 h-5" />} accentColor="muted" />
        </div>
        {error && <PortalErrorState message={error} onRetry={fetchPayslips} />}
        <PortalCard className="bg-muted/10 border-dashed">
           <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 <PortalInput
                   placeholder="Search by month (e.g. January)..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 h-12"
                 />
              </div>
           </div>
        </PortalCard>
        <div className="space-y-3">
          {filteredPayslips.length > 0 ? filteredPayslips.map((p) => (
            <PortalCard key={p.id} hover padding="none" className="overflow-hidden group" onClick={() => handleViewDetails(p)}>
               <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                     <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="font-black text-lg">{new Date(p.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date: {new Date(p.payDate).toLocaleDateString()}</span>
                           <PortalBadge variant={p.status === 'paid' ? 'success' : 'warning'} size="sm">{p.status.toUpperCase()}</PortalBadge>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                     <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Net Allocation</p>
                        <p className="font-extrabold text-xl text-primary">{p.netPay.toLocaleString()} <span className="text-sm opacity-60 font-bold">{p.currency}</span></p>
                     </div>
                     <div className="flex gap-2">
                        <PortalButton variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} />
                        <PortalButton
                          variant="outline"
                          size="sm"
                          loading={downloading === p.id}
                          onClick={(e) => { e.stopPropagation(); handleDownload(p.id); }}
                          icon={<Download className="w-4 h-4" />}
                        >
                          Download
                        </PortalButton>
                     </div>
                  </div>
               </div>
            </PortalCard>
          )) : <PortalEmptyState icon={<FileText className="w-16 h-16 opacity-10" />} title="No Records Found" description="Try adjusting your filters or search query." />}
        </div>
      </div>
      <PortalModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        title="Payslip Breakdown"
        size="lg"
        footer={<PortalButton onClick={() => selectedPayslip && handleDownload(selectedPayslip.id)}>Export as PDF</PortalButton>}
      >
        {selectedPayslip && (
          <div className="space-y-8">
             <div className="grid grid-cols-2 gap-4 p-6 bg-muted/20 rounded-[32px] border border-border/50">
                <div>
                   <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Settlement Period</p>
                   <p className="font-bold">{new Date(selectedPayslip.periodStart).toLocaleDateString()} - {new Date(selectedPayslip.periodEnd).toLocaleDateString()}</p>
                </div>
                <div className="text-right text-primary">
                   <p className="text-[10px] font-black uppercase opacity-60 mb-1">Status</p>
                   <p className="font-black uppercase tracking-widest">{selectedPayslip.status}</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <h4 className="font-black text-xs uppercase tracking-widest text-success border-b border-success/10 pb-2">Verified Earnings</h4>
                   {selectedPayslip.earnings?.map((e, i) => (
                     <div key={i} className="flex justify-between py-1">
                        <span className="text-sm font-medium text-muted-foreground">{e.type}</span>
                        <span className="text-sm font-bold">+{e.amount.toLocaleString()}</span>
                     </div>
                   ))}
                   <div className="pt-4 border-t border-dashed flex justify-between font-black text-success">
                      <span>Total Gross</span>
                      <span>{selectedPayslip.grossPay.toLocaleString()}</span>
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="font-black text-xs uppercase tracking-widest text-destructive border-b border-destructive/10 pb-2">Compliance Deductions</h4>
                   {selectedPayslip.deductions?.map((d, i) => (
                     <div key={i} className="flex justify-between py-1">
                        <span className="text-sm font-medium text-muted-foreground">{d.type}</span>
                        <span className="text-sm font-bold">-{d.amount.toLocaleString()}</span>
                     </div>
                   ))}
                   <div className="pt-4 border-t border-dashed flex justify-between font-black text-destructive">
                      <span>Total Deductions</span>
                      <span>{selectedPayslip.totalDeductions.toLocaleString()}</span>
                   </div>
                </div>
             </div>
             <div className="p-8 bg-primary text-primary-foreground rounded-[40px] shadow-2xl shadow-primary/20 flex flex-col items-center text-center">
                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2">Net Deposit Amount</p>
                <div className="text-5xl font-black tracking-tighter mb-4">
                   {selectedPayslip.netPay.toLocaleString()} <span className="text-xl opacity-60 uppercase">{selectedPayslip.currency}</span>
                </div>
                <p className="text-[10px] font-bold opacity-40 italic max-w-xs">This settlement has been verified and deposited into your registered bank account on {new Date(selectedPayslip.payDate).toLocaleDateString()}.</p>
             </div>
          </div>
        )}
      </PortalModal>
    </div>
  );
}
