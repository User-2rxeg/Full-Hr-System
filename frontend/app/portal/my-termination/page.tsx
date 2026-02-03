'use client';
import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  ClearanceChecklist,
  ClearanceCompletionStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/context/AuthContext';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalBadge,
  PortalTabs,
  PortalEmptyState,
} from '@/components/portal';
import {
    CheckCircle, Shield, Layout,
    Calendar, Info, FileText, ShieldCheck, Box, UserX,
} from 'lucide-react';

export default function MyTerminationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [termination, setTermination] = useState<TerminationRequest | null>(null);
  const [clearanceChecklist, setClearanceChecklist] = useState<ClearanceChecklist | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const fetchTerminationStatus = async () => {
    try {
      setLoading(true);
      const employeeId = user?.id;
      if (!employeeId) return;
      const requests = await offboardingService.getAllTerminationRequests(employeeId);
      if (requests && requests.length > 0) {
        const latestTermination = requests[0];
        setTermination(latestTermination);
        if (latestTermination.status === TerminationStatus.APPROVED) {
          try {
            const checklist = await offboardingService.getClearanceChecklistByTerminationId(latestTermination._id);
            setClearanceChecklist(checklist);
            const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
            setClearanceStatus(status);
          } catch (err) {}
        }
      }
    } catch (err) {} finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user?.id) fetchTerminationStatus();
  }, [user?.id]);
  if (loading) return <PortalLoading message="Decrypting separation vault..." fullScreen />;
  if (!termination) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <PortalEmptyState
           icon={<ShieldCheck className="w-20 h-20 text-success opacity-10" />}
           title="Active Professional Identity"
           description="Your employment status is fully active. No pending separation protocols detected."
           action={{ label: 'Back to Safety', onClick: () => window.location.href = '/portal' }}
        />
      </div>
    );
  }
  const clearanceProgress = clearanceChecklist && clearanceStatus
    ? Math.round(((clearanceChecklist.items.filter((i: any) => i.status === 'approved').length || 0) / (clearanceChecklist.items.length || 1)) * 100)
    : 0;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PortalPageHeader
          title="Separation Vault المركز"
          description="Manage your offboarding, clearance checklist, and final settlement"
          breadcrumbs={[{ label: 'Separation' }]}
        />
        <PortalCard padding="none" className="bg-gradient-to-br from-destructive to-destructive/80 text-white overflow-hidden">
          <div className="p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="space-y-2 text-center lg:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Employment Termination Status</p>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">{termination.status}</h2>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20">
                    <Calendar className="w-4 h-4 opacity-60" />
                    <span className="text-xs font-bold">LWD: {termination.terminationDate ? new Date(termination.terminationDate).toLocaleDateString() : 'TBD'}</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20">
                    <Shield className="w-4 h-4 opacity-60" />
                    <span className="text-xs font-bold uppercase">Ref: T-{termination._id.slice(-6).toUpperCase()}</span>
                 </div>
              </div>
            </div>
            <div className="w-full max-w-sm p-6 bg-white/10 backdrop-blur-md rounded-[32px] border border-white/20">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Clearance Progress</span>
                  <span className="text-sm font-black">{clearanceProgress}%</span>
               </div>
               <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_white]" style={{ width: `${clearanceProgress}%` }}></div>
               </div>
            </div>
          </div>
        </PortalCard>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PortalTabs
               tabs={[
                 { id: 'overview', label: 'Separation Brief' },
                 { id: 'checklist', label: 'Clearance Items', badge: clearanceChecklist?.items.length }
               ]}
               activeTab={activeTab}
               onTabChange={setActiveTab}
            />
            {activeTab === 'overview' && (
              <PortalCard className="space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-destructive/10 text-destructive rounded-2xl"><Info className="w-6 h-6" /></div>
                    <div>
                        <h3 className="font-bold text-xl text-foreground">Official Case Note</h3>
                        <p className="text-sm text-muted-foreground">Detailed reasoning regarding the separation event</p>
                    </div>
                 </div>
                 <div className="p-6 bg-muted/30 border-l-4 border-destructive rounded-r-2xl italic text-lg opacity-80 leading-relaxed">
                    "{termination.reason}"
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PortalCard className="bg-muted/10">
                        <UserX className="w-5 h-5 text-muted-foreground mb-4" />
                        <p className="text-[10px] font-black uppercase opacity-40">Initiator</p>
                        <p className="text-sm font-bold uppercase">{termination.initiator}</p>
                    </PortalCard>
                    <PortalCard className="bg-muted/10">
                        <Box className="w-5 h-5 text-muted-foreground mb-4" />
                        <p className="text-[10px] font-black uppercase opacity-40">Notice Type</p>
                        <p className="text-sm font-bold uppercase">Standard Protocol</p>
                    </PortalCard>
                 </div>
              </PortalCard>
            )}
            {activeTab === 'checklist' && (
               <div className="space-y-4">
                  {clearanceChecklist ? clearanceChecklist.items.map((item: any, idx: number) => (
                    <PortalCard key={idx} hover padding="none" className="overflow-hidden">
                       <div className="p-6 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-2xl ${item.status === 'approved' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                {item.status === 'approved' ? <CheckCircle className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                             </div>
                             <div>
                                <h4 className={`font-bold transition-colors ${item.status === 'approved' ? 'text-success' : 'text-foreground'}`}>{item.name}</h4>
                                <p className="text-[10px] font-black uppercase opacity-40">{item.department}</p>
                             </div>
                          </div>
                          <PortalBadge variant={item.status === 'approved' ? 'success' : 'warning'}>{item.status.toUpperCase()}</PortalBadge>
                       </div>
                    </PortalCard>
                  )) : (
                    <PortalEmptyState
                      icon={<Layout className="w-16 h-16 opacity-10" />}
                      title="Waiting for Checklist"
                      description="Your clearance checklist will be generated once your separation is officially authorized by all stakeholders."
                    />
                  )}
               </div>
            )}
          </div>
          <div className="space-y-6">
            <PortalCard className="bg-gradient-to-br from-destructive/5 to-primary/5 border-dashed border-2">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-destructive" /> Critical Protocols</h3>
                <ul className="space-y-4">
                  {[
                    'LWD entitlement is subject to full asset clearance.',
                    'Identity revocation will occur at 17:00 on your LWD.',
                    'Final settlement takes 5-7 working days after LWD.'
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{text}"</p>
                    </li>
                  ))}
                </ul>
            </PortalCard>
            <PortalStatCard title="Total Protocols" value={clearanceChecklist?.items.length || 0} icon={<FileText className="w-5 h-5" />} accentColor="muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
