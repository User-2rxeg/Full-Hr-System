'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';
import { 
  AlertCircle, Plus, Clock, CheckCircle, XCircle, FileText, 
  ChevronRight, ShieldAlert, BadgeInfo, Info, Send, 
  DollarSign, Receipt, History
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalBadge,
  PortalModal,
  PortalButton,
  PortalInput,
  PortalSelect,
  PortalTextarea,
  PortalTabs,
  PortalEmptyState,
  PortalErrorState,
} from '@/components/portal';
interface Claim {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  submittedAt: string;
  resolvedAt?: string;
  resolution?: string;
}
interface Dispute {
  id: string;
  payslipId: string;
  payslipPeriod?: string;
  reason: string;
  status: string;
  submittedAt: string;
  resolvedAt?: string;
  resolution?: string;
}
export default function PortalClaimsDisputesPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('claims');
  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [claimForm, setClaimForm] = useState({ type: 'EXPENSE', amount: '', description: '' });
  const [disputeForm, setDisputeForm] = useState({ payslipId: '', reason: '' });
  const fetchData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await payrollTrackingService.trackClaimsAndDisputes(user.id);
      const data = res?.data as any || { claims: [], disputes: [] };
      setClaims((data.claims || []).map((c: any) => ({
        id: c.id || c._id || Math.random().toString(),
        type: c.type || c.claimType || 'EXPENSE',
        amount: Number(c.amount ?? 0),
        description: c.description || '',
        status: c.status || 'PENDING',
        submittedAt: c.submittedAt || c.createdAt || new Date().toISOString(),
        resolvedAt: c.resolvedAt,
        resolution: c.resolution,
      })));
      setDisputes((data.disputes || []).map((d: any) => ({
        id: d.id || d._id || Math.random().toString(),
        payslipId: d.payslipId || '',
        payslipPeriod: d.payslipPeriod,
        reason: d.reason || d.description || '',
        status: d.status || 'PENDING',
        submittedAt: d.submittedAt || d.createdAt || new Date().toISOString(),
        resolvedAt: d.resolvedAt,
        resolution: d.resolution,
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to sync with finance registry');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, [user?.id]);
  const handleSubmitClaim = async () => {
    if (!claimForm.amount || !claimForm.description) return toast.error('Incomplete claim parameters');
    try {
      setSubmitting(true);
      await payrollTrackingService.createClaim(user!.id, {
        claimType: claimForm.type,
        amount: parseFloat(claimForm.amount),
        description: claimForm.description,
      });
      toast.success('Liability claim submitted for financial review');
      setIsClaimModalOpen(false);
      setClaimForm({ type: 'EXPENSE', amount: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Protocol failure during submission');
    } finally {
      setSubmitting(false);
    }
  };
  const handleSubmitDispute = async () => {
    if (!disputeForm.payslipId || !disputeForm.reason) return toast.error('Incomplete dispute parameters');
    try {
      setSubmitting(true);
      await payrollTrackingService.createDispute(user!.id, {
        payslipId: disputeForm.payslipId,
        description: disputeForm.reason,
      });
      toast.success('Dispute initiated against verified settlement');
      setIsDisputeModalOpen(false);
      setDisputeForm({ payslipId: '', reason: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Resolution path unavailable');
    } finally {
      setSubmitting(false);
    }
  };
  const getStatusVariant = (status: string): 'success' | 'warning' | 'destructive' | 'default' => {
    const s = status.toUpperCase();
    if (s === 'APPROVED' || s === 'RESOLVED') return 'success';
    if (s === 'REJECTED') return 'destructive';
    if (s === 'PENDING' || s === 'IN_REVIEW') return 'warning';
    return 'default';
  };
  if (loading) return <PortalLoading message="Auditing financial disputes..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PortalPageHeader
          title="Claims & Disputes ??????"
          description="Initiate financial liability claims or file formal disputes against payroll settlements"
          breadcrumbs={[{ label: 'Payroll', href: '/portal/payroll-tracking' }, { label: 'Claims' }]}
          actions={
            <div className="flex gap-2">
               <PortalButton variant="outline" onClick={() => setIsDisputeModalOpen(true)} icon={<AlertCircle className="w-4 h-4" />}>New Dispute</PortalButton>
               <PortalButton onClick={() => setIsClaimModalOpen(true)} icon={<Plus className="w-4 h-4" />}>Submit Claim</PortalButton>
            </div>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <PortalStatCard title="Open Claims" value={claims.filter(c => c.status === 'PENDING').length} icon={<Receipt className="w-5 h-5" />} accentColor="primary" />
           <PortalStatCard title="Active Disputes" value={disputes.filter(d => d.status === 'PENDING').length} icon={<ShieldAlert className="w-5 h-5" />} accentColor="warning" />
           <PortalStatCard title="Resolved YTD" value={claims.filter(c => c.status === 'APPROVED').length + disputes.filter(d => d.status === 'RESOLVED').length} icon={<CheckCircle className="w-5 h-5" />} accentColor="accent" />
           <PortalStatCard title="Global Health" value="NOMINAL" icon={<History className="w-5 h-5" />} accentColor="muted" />
        </div>
        {error && <PortalErrorState message={error} onRetry={fetchData} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <PortalTabs 
                tabs={[
                  { id: 'claims', label: 'Financial Claims', badge: claims.length },
                  { id: 'disputes', label: 'Settlement Disputes', badge: disputes.length }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              {activeTab === 'claims' && (
                <div className="space-y-3">
                   {claims.length > 0 ? claims.map((c) => (
                     <PortalCard key={c.id} hover padding="none" className="overflow-hidden group" onClick={() => setSelectedItem(c)}>
                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                           <div className="flex items-center gap-5">
                              <div className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                                 <Receipt className="w-6 h-6" />
                              </div>
                              <div>
                                 <h3 className="font-extrabold text-lg flex items-center gap-3">
                                    {c.type}
                                    <PortalBadge variant={getStatusVariant(c.status)} size="sm">{c.status}</PortalBadge>
                                 </h3>
                                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Submitted: {new Date(c.submittedAt).toLocaleDateString()}</p>
                              </div>
                           </div>
                           <div className="text-right flex items-center gap-8">
                              <div className="hidden sm:block">
                                 <p className="text-[10px] font-black opacity-40 uppercase mb-1">Claim Value</p>
                                 <p className="font-black text-xl text-primary">{c.amount.toLocaleString()} <span className="text-sm opacity-60">EGP</span></p>
                              </div>
                              <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />} />
                           </div>
                        </div>
                     </PortalCard>
                   )) : <PortalEmptyState icon={<Receipt className="w-16 h-16 opacity-10" />} title="Registry Clean" description="No financial claims found in your tactical log." />}
                </div>
              )}
              {activeTab === 'disputes' && (
                <div className="space-y-3">
                   {disputes.length > 0 ? disputes.map((d) => (
                     <PortalCard key={d.id} hover padding="none" className="overflow-hidden group" onClick={() => setSelectedItem(d)}>
                        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                           <div className="flex items-center gap-5">
                              <div className="p-4 rounded-2xl bg-warning/10 text-warning border border-warning/20 group-hover:bg-warning group-hover:text-white transition-all">
                                 <ShieldAlert className="w-6 h-6" />
                              </div>
                              <div>
                                 <h3 className="font-extrabold text-lg flex items-center gap-3">
                                    Dispute Case #{d.id.slice(-6).toUpperCase()}
                                    <PortalBadge variant={getStatusVariant(d.status)} size="sm">{d.status}</PortalBadge>
                                 </h3>
                                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Payslip Impact: {d.payslipPeriod || 'Unknown'}</p>
                              </div>
                           </div>
                           <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />} />
                        </div>
                     </PortalCard>
                   )) : <PortalEmptyState icon={<ShieldAlert className="w-16 h-16 opacity-10" />} title="Zero Disputes" description="No active or historical disputes filed against settlements." />}
                </div>
              )}
           </div>
           <div className="space-y-6">
              <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
                 <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 text-primary">Protocol Guidance</h3>
                 <ul className="space-y-4 px-1">
                    {[
                      'Expense claims require valid digital receipts for audit compliance.',
                      'Disputes must be filed within 72 hours of settlement receipt.',
                      'Resolution window for standard cases: 3-5 working days.'
                    ].map((text, i) => (
                      <li key={i} className="flex gap-4">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                         <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{text}"</p>
                      </li>
                    ))}
                 </ul>
              </PortalCard>
           </div>
        </div>
      </div>
      {/* Detail Modal */}
      <PortalModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title="Case Analytics">
         {selectedItem && (
           <div className="space-y-8">
              <div className="p-8 bg-muted/20 border border-border/50 rounded-[40px] flex justify-between items-center">
                 <div>
                    <PortalBadge variant={getStatusVariant(selectedItem.status)} size="md">{selectedItem.status}</PortalBadge>
                    <h4 className="font-black text-3xl mt-4 tracking-tighter uppercase">{selectedItem.type || 'Dispute'}</h4>
                    <p className="text-[10px] font-black opacity-40 uppercase mt-2">ID: {selectedItem.id.toUpperCase()}</p>
                 </div>
                 {selectedItem.amount && (
                   <div className="text-right">
                      <p className="text-[10px] font-black opacity-40 uppercase mb-1 text-primary">Tactical Value</p>
                      <p className="font-black text-4xl text-primary">{selectedItem.amount.toLocaleString()} <span className="text-sm opacity-60">EGP</span></p>
                   </div>
                 )}
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase opacity-40 mb-3 px-1">Case Rationale</p>
                 <div className="p-6 bg-background border border-border rounded-3xl italic text-foreground/80 leading-relaxed shadow-inner">
                    "{selectedItem.description || selectedItem.reason}"
                 </div>
              </div>
              {selectedItem.resolution && (
                <div className="p-6 bg-success/5 border-2 border-success/10 rounded-3xl">
                   <p className="text-[10px] font-black text-success uppercase tracking-widest mb-3">Resolution Verdict</p>
                   <p className="text-sm font-bold text-success/80">{selectedItem.resolution}</p>
                   {selectedItem.resolvedAt && <p className="text-[9px] font-black opacity-40 mt-3 uppercase">Closed: {new Date(selectedItem.resolvedAt).toLocaleString()}</p>}
                </div>
              )}
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                 <BadgeInfo className="w-5 h-5 text-primary shrink-0" />
                 <p className="text-[10px] font-black text-primary/80 leading-tight italic uppercase tracking-wider">Financial integrity monitoring is currently active for this case lifecycle.</p>
              </div>
           </div>
         )}
      </PortalModal>
      {/* Creation Modals */}
      <PortalModal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} title="New Financial Claim">
         <div className="space-y-4">
            <PortalSelect label="Claim Classification" value={claimForm.type} onChange={(e) => setClaimForm({...claimForm, type: e.target.value})} options={[
               { value: 'EXPENSE', label: 'Business Expense' },
               { value: 'MILEAGE', label: 'Mileage / Transport' },
               { value: 'EQUIPMENT', label: 'Hardware / Asset' },
               { value: 'OTHER', label: 'Other Reimbursable' }
            ]} />
            <PortalInput label="Monetary Value (EGP)" type="number" value={claimForm.amount} onChange={(e) => setClaimForm({...claimForm, amount: e.target.value})} placeholder="0.00" />
            <PortalTextarea label="Tactical Description" value={claimForm.description} onChange={(e) => setClaimForm({...claimForm, description: e.target.value})} placeholder="Describe the reimbursement requirement..." />
            <PortalButton className="w-full h-14" loading={submitting} onClick={handleSubmitClaim} icon={<Send className="w-4 h-4" />}>Submit Claim</PortalButton>
         </div>
      </PortalModal>
      <PortalModal isOpen={isDisputeModalOpen} onClose={() => setIsDisputeModalOpen(false)} title="Initiate Dispute protocol">
         <div className="space-y-4">
            <PortalInput label="Verified Payslip ID" value={disputeForm.payslipId} onChange={(e) => setDisputeForm({...disputeForm, payslipId: e.target.value})} placeholder="Enter the ID of the impacted settlement..." />
            <PortalTextarea label="Evidence & Rationale" value={disputeForm.reason} onChange={(e) => setDisputeForm({...disputeForm, reason: e.target.value})} placeholder="Detail the settlement discrepancy..." />
            <PortalButton className="w-full h-14" variant="destructive" loading={submitting} onClick={handleSubmitDispute} icon={<ShieldAlert className="w-4 h-4" />}>Initiate Dispute</PortalButton>
         </div>
      </PortalModal>
    </div>
  );
}
