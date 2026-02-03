'use client';
import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationReason,
  TerminationInitiation,
} from '@/app/services/offboarding';
import { useAuth } from '@/context/AuthContext';
import {
  PortalPageHeader,
  PortalCard,
  PortalLoading,
  PortalBadge,
  PortalButton,
  PortalInput,
  PortalTextarea,
  PortalSelect,
} from '@/components/portal';
import { Send, History, Clock, CheckCircle, ShieldAlert, Calendar, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function MyResignationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setNotifications] = useState<TerminationRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    reason: TerminationReason.PERSONAL,
    terminationDate: '',
    employeeComments: '',
  });
  const fetchData = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      const data = await offboardingService.getAllTerminationRequests(user.id);
      setNotifications(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load resignation history');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setSubmitting(true);
      await offboardingService.createTerminationRequest({
        employeeId: user.id,
        initiator: TerminationInitiation.EMPLOYEE,
        reason: formData.reason as any,
        employeeComments: formData.employeeComments,
        terminationDate: formData.terminationDate,
      });
      toast.success('Resignation protocol initiated successfully');
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate resignation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PortalLoading message="Loading offboarding protocols..." fullScreen />;

  const activeRequest = requests[0];
  const hasActiveRequest = activeRequest && activeRequest.status !== TerminationStatus.REJECTED;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <PortalPageHeader
          title="Resignation المركز"
          description="Initiate separation protocol or track your resignation journey"
          breadcrumbs={[{ label: 'Resignation' }]}
        />
        {!showForm && !hasActiveRequest && (
          <PortalCard className="text-center py-20 bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
             <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
                <Send className="w-10 h-10 text-primary" />
             </div>
             <h3 className="text-3xl font-black text-foreground">Protocol Initiation</h3>
             <p className="text-muted-foreground mt-4 max-w-sm mx-auto leading-relaxed">
                If you wish to formally depart from the organization, you must initiate the resignation protocol for HR review.
             </p>
             <PortalButton className="mt-10" size="lg" onClick={() => setShowForm(true)} icon={<Send className="w-4 h-4" />}>
                Initiate Resignation
             </PortalButton>
          </PortalCard>
        )}
        {showForm && !hasActiveRequest && (
          <PortalCard className="border-t-4 border-primary">
             <div className="flex items-center justify-between mb-10 pb-6 border-b border-border/50">
                <h3 className="text-2xl font-black">Resignation Formalities</h3>
                <PortalButton variant="ghost" onClick={() => setShowForm(false)}>Cancel</PortalButton>
             </div>
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <PortalSelect
                      label="Primary Reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value as TerminationReason })}
                      options={Object.values(TerminationReason).map(r => ({ label: r.replace(/_/g, ' '), value: r }))}
                   />
                   <PortalInput
                      label="Desired Leave Date"
                      type="date"
                      value={formData.terminationDate}
                      onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                   />
                </div>
                <PortalTextarea
                   label="Additonal Rationale (Optional)"
                   placeholder="Your feedback is valued for our continuous improvement..."
                   value={formData.employeeComments}
                   onChange={(e) => setFormData({ ...formData, employeeComments: e.target.value })}
                   rows={5}
                />
                <div className="p-6 bg-warning/5 border border-warning/20 rounded-2xl flex gap-4 items-start">
                   <ShieldAlert className="w-6 h-6 text-warning shrink-0 mt-1" />
                   <div className="text-sm">
                      <p className="font-bold text-warning-foreground">Security Disclaimer</p>
                      <p className="text-muted-foreground mt-1">Initiating this protocol is a formal action. HR will be notified immediately to start the review process.</p>
                   </div>
                </div>
                <div className="flex justify-end pt-4">
                   <PortalButton type="submit" loading={submitting} icon={<Send className="w-4 h-4" />}>
                      Submit Protocol
                   </PortalButton>
                </div>
             </form>
          </PortalCard>
        )}
        {hasActiveRequest && (
          <div className="space-y-8">
             <PortalCard padding="none" className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground overflow-hidden">
                <div className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="space-y-2 text-center md:text-left">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Active Separation Protocol</p>
                      <h2 className="text-5xl font-black tracking-tight uppercase">{activeRequest.status}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-xs font-bold bg-white/10 w-fit px-4 py-2 rounded-xl">
                         <Calendar className="w-4 h-4" />
                         <span>Requested LWD: {activeRequest.terminationDate ? new Date(activeRequest.terminationDate).toLocaleDateString() : 'Pending'}</span>
                      </div>
                   </div>
                   <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-center">
                      <Clock className="w-10 h-10 text-white mx-auto mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest">In Governance Review</p>
                   </div>
                </div>
             </PortalCard>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                   <PortalCard>
                      <h3 className="font-bold mb-6 flex items-center gap-2 text-xl"><FileText className="w-5 h-5 text-primary" /> Case Detail</h3>
                      <div className="space-y-6">
                         <div className="p-6 bg-muted/30 border-l-4 border-primary rounded-r-2xl">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Protocol Rationale</p>
                            <p className="text-lg italic opacity-80 leading-relaxed">"{activeRequest.reason}"</p>
                         </div>
                         {activeRequest.employeeComments && (
                            <div>
                               <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 px-1">Your Comments</p>
                               <div className="p-4 bg-muted/10 rounded-2xl border border-border/50 text-sm">
                                  {activeRequest.employeeComments}
                               </div>
                            </div>
                         )}
                      </div>
                   </PortalCard>
                </div>
                <div className="space-y-6">
                   <PortalCard className="bg-gradient-to-br from-accent/5 to-primary/5">
                      <h3 className="font-bold mb-6 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Timeline</h3>
                      <div className="space-y-6 relative">
                         <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border"></div>
                         {[
                           { l: 'Protocol Submitted', d: new Date(activeRequest.createdAt).toLocaleDateString(), done: true },
                           { l: 'HR Review Stage', d: 'In Progress', active: true },
                           { l: 'Clearance & LWD', d: 'Pending' }
                         ].map((s, i) => (
                           <div key={i} className="flex gap-6 items-start relative pl-8">
                              <div className={`absolute left-0 w-5 h-5 rounded-full border-4 flex items-center justify-center shadow-sm ${
                                s.done ? 'bg-primary border-primary' : s.active ? 'bg-background border-primary' : 'bg-background border-border'
                              }`}>
                                 {s.done && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                 <p className="font-bold text-sm">{s.l}</p>
                                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">{s.d}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </PortalCard>
                </div>
             </div>
          </div>
        )}
        {requests.length > 1 && (
          <div className="space-y-6">
             <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-2 opacity-40">
                <History className="w-5 h-5" /> Archive Trace
             </h3>
             <div className="space-y-3">
                {requests.slice(1).map((req) => (
                   <PortalCard key={req._id} hover padding="none">
                      <div className="p-6 flex items-center justify-between">
                         <div className="flex gap-5 items-center">
                            <div className="p-3 bg-muted rounded-2xl">
                               <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                               <h4 className="font-bold uppercase tracking-tight">{req.reason}</h4>
                               <p className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">Closed on {new Date(req.updatedAt).toLocaleDateString()}</p>
                            </div>
                         </div>
                         <PortalBadge variant={req.status === TerminationStatus.APPROVED ? 'success' : 'destructive'}>
                            {req.status}
                         </PortalBadge>
                      </div>
                   </PortalCard>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
