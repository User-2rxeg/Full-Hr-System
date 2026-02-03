'use client';
import { useState, useEffect } from 'react';
import { leavesService } from '@/app/services/leaves';
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
  PortalModal,
  PortalInput,
  PortalTextarea,
  PortalSelect
} from '@/components/portal';
import { 
  Plus, Clock, CheckCircle,
  AlertCircle, History, FileText, ChevronRight,
  Plane, HeartPulse, ShieldCheck, Users, Paperclip,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
interface LeaveRequest {
  _id: string;
  leaveTypeId: { _id: string; name: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  durationDays: number;
  attachmentUrl?: string;
  createdAt: string;
}
interface Entitlement {
  _id: string;
  leaveTypeId: { _id: string; name: string };
  yearlyEntitlement: number;
  taken: number;
  pending: number;
  remaining: number;
}
export default function MyLeavesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [reqsRes, entsRes, typesRes] = await Promise.all([
        leavesService.getEmployeeRequests(user.id),
        leavesService.getEntitlements(user.id),
        leavesService.getLeaveTypes(),
      ]);
      setRequests(Array.isArray(reqsRes.data) ? reqsRes.data : []);
      setEntitlements(Array.isArray(entsRes.data) ? entsRes.data : []);
      setLeaveTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with leave registry');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [user?.id]);
  const handleRequestSubmit = async () => {
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error('Validation Error: All fields required for protocol initiation');
      return;
    }
    try {
      setSubmitting(true);
      await leavesService.createRequest({
        employeeId: user?.id || '',
        ...formData
      });
      toast.success('Leave request submitted and routed to management');
      setShowRequestModal(false);
      setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };
  const getStatusVariant = (status: string): 'success' | 'warning' | 'destructive' | 'default' => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'destructive';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };
  const getLeaveIcon = (typeName: string) => {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('annual') || name.includes('vacation')) return <Plane className="w-5 h-5" />;
    if (name.includes('sick') || name.includes('medical')) return <HeartPulse className="w-5 h-5" />;
    return <Briefcase className="w-5 h-5" />;
  };
  if (loading) return <PortalLoading message="Decrypting leave balances..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PortalPageHeader
          title="Leaves & Time Off"
          description="Manage your absence schedule, track entitlements, and submit time-off requests"
          breadcrumbs={[{ label: 'My Leaves' }]}
          actions={
            <PortalButton onClick={() => setShowRequestModal(true)} icon={<Plus className="w-4 h-4" />}>
              Request Leave
            </PortalButton>
          }
        />
        {error && <PortalErrorState message={error} onRetry={fetchData} />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PortalStatCard 
            title="Remaining Balance" 
            value={entitlements.reduce((sum, e) => sum + (e.remaining || 0), 0)} 
            subtitle="Combined Days"
            icon={<CheckCircle className="w-5 h-5" />} 
            accentColor="primary" 
          />
          <PortalStatCard 
            title="Pending Approval" 
            value={requests.filter(r => r.status === 'PENDING').length} 
            icon={<Clock className="w-5 h-5" />} 
            accentColor="warning" 
          />
          <PortalStatCard 
            title="Taken This Year" 
            value={entitlements.reduce((sum, e) => sum + (e.taken || 0), 0)} 
            icon={<History className="w-5 h-5" />} 
            accentColor="accent" 
          />
          <PortalStatCard 
            title="Active Policies" 
            value={entitlements.length} 
            icon={<ShieldCheck className="w-5 h-5" />} 
            accentColor="muted" 
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PortalTabs 
              tabs={[
                { id: 'requests', label: 'My Requests', badge: requests.length },
                { id: 'entitlements', label: 'Allowances' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            {activeTab === 'requests' && (
              <div className="space-y-3">
                {requests.length > 0 ? requests.map((req) => (
                  <PortalCard key={req._id} hover padding="none" className="overflow-hidden group">
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl border transition-all ${
                          req.status === 'APPROVED' ? 'bg-success/10 text-success border-success/20' : 
                          req.status === 'REJECTED' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          'bg-warning/10 text-warning border-warning/20'
                        }`}>
                          {getLeaveIcon(req.leaveTypeId?.name)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg flex items-center gap-2">
                            {req.leaveTypeId?.name}
                            <PortalBadge variant={getStatusVariant(req.status)} size="sm">{req.status}</PortalBadge>
                          </h3>
                          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">
                             {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-black opacity-40 uppercase mb-1">Duration</p>
                          <p className="font-black text-xl text-primary">{req.durationDays} <span className="text-xs opacity-60">Days</span></p>
                        </div>
                        <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}>Details</PortalButton>
                      </div>
                    </div>
                  </PortalCard>
                )) : (
                  <PortalEmptyState icon={<FileText className="w-16 h-16 opacity-10" />} title="Registry Clean" description="You have no historical leave requests on record." />
                )}
              </div>
            )}
            {activeTab === 'entitlements' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {entitlements.map((ent) => (
                  <PortalCard key={ent._id} hover className="border-t-4 border-primary">
                    <div className="flex items-start justify-between mb-6">
                       <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">{getLeaveIcon(ent.leaveTypeId?.name)}</div>
                          <h4 className="font-black uppercase tracking-tight">{ent.leaveTypeId?.name}</h4>
                       </div>
                       <PortalBadge variant="info" className="font-black">{ent.yearlyEntitlement} Total</PortalBadge>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase opacity-40">Usage Index</span>
                          <span className="text-xs font-black">{Math.round((ent.taken / (ent.yearlyEntitlement || 1)) * 100)}%</span>
                       </div>
                       <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                          <div className="h-full bg-primary" style={{ width: `${(ent.taken / (ent.yearlyEntitlement || 1)) * 100}%` }}></div>
                          <div className="h-full bg-warning opacity-50" style={{ width: `${(ent.pending / (ent.yearlyEntitlement || 1)) * 100}%` }}></div>
                       </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-8">
                       <div className="p-3 bg-muted/20 rounded-2xl text-center">
                          <p className="text-[8px] font-black uppercase opacity-40 mb-1">Taken</p>
                          <p className="text-sm font-black">{ent.taken}</p>
                       </div>
                       <div className="p-3 bg-muted/20 rounded-2xl text-center">
                          <p className="text-[8px] font-black uppercase opacity-40 mb-1">Wait</p>
                          <p className="text-sm font-black text-warning">{ent.pending}</p>
                       </div>
                       <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl text-center">
                          <p className="text-[8px] font-black uppercase text-primary/60 mb-1">Free</p>
                          <p className="text-sm font-black text-primary">{ent.remaining}</p>
                       </div>
                    </div>
                  </PortalCard>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
               <h3 className="font-bold mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-primary" /> Leave Policy</h3>
               <ul className="space-y-4">
                  {[
                    'Annual leaves must be requested 48 hours in advance.',
                    'Sick leaves require medical documentation for > 1 day.',
                    'Leave balances are reset on January 1st each year.'
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                       <p className="text-xs text-muted-foreground leading-relaxed italic">"{text}"</p>
                    </li>
                  ))}
               </ul>
            </PortalCard>
            <PortalCard className="p-0 overflow-hidden">
               <div className="bg-muted p-4 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase opacity-60">Team Availability</span>
                  <Users className="w-3 h-3 opacity-40" />
               </div>
               <div className="p-5 flex flex-col items-center text-center">
                  <p className="text-xs text-muted-foreground mb-4">You are the only member from your department currently requesting time off in this period.</p>
                  <PortalBadge variant="success">LOW IMPACT</PortalBadge>
               </div>
            </PortalCard>
          </div>
        </div>
      </div>
      <PortalModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Leave Submission"
        description="Initiate an absence request protocol for management review."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <PortalButton variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</PortalButton>
            <PortalButton onClick={handleRequestSubmit} loading={submitting} icon={<Plus className="w-4 h-4" />}>Submit Request</PortalButton>
          </div>
        }
      >
        <div className="space-y-5">
          <PortalSelect 
            label="Absence Category" 
            value={formData.leaveTypeId} 
            onChange={(e) => setFormData({...formData, leaveTypeId: e.target.value})}
            options={[{ label: 'Select category...', value: '' }, ...leaveTypes.map(t => ({ label: t.name, value: t._id }))]}
          />
          <div className="grid grid-cols-2 gap-4">
            <PortalInput label="Launch Date" type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
            <PortalInput label="Return Date" type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
          </div>
          <PortalTextarea label="Rationale" placeholder="Briefly describe the reason for your absence..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
             <Paperclip className="w-4 h-4 text-primary" />
             <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">Optional: Attach supporting documents after submission</p>
          </div>
        </div>
      </PortalModal>
    </div>
  );
}
