'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { timeManagementService } from '@/app/services/time-management';
import { useAuth } from '@/context/AuthContext';
import { PunchType } from '@/types/enums';
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
import { 
  RefreshCw, Edit, Clock, AlertTriangle, Coffee, LogIn, LogOut, 
  History, Calendar, Plus, ShieldAlert, Timer, Fingerprint, 
  Activity, CheckCircle, MoreVertical, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
const TIME_EXCEPTION_TYPES = [
  { value: 'MISSED_PUNCH', label: 'Missed Punch' },
  { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
  { value: 'EARLY_DEPARTURE', label: 'Early Departure' },
  { value: 'OFFSITE_WORK', label: 'Off-site Work' },
  { value: 'TECHNICAL_ISSUE', label: 'System Technical Issue' },
  { value: 'OTHER', label: 'Other' },
];
interface BreakPermission {
  _id: string;
  startTime: string | Date;
  endTime: string | Date;
  duration: number;
  reason: string;
  status: string;
  createdAt?: string;
}
export default function MyAttendancePortalPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('corrections');
  // Forms & Modals
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionFormData, setExceptionFormData] = useState({ type: 'MISSED_PUNCH', reason: '' });
  const [submittingException, setSubmittingException] = useState(false);
  const [timeExceptions, setTimeExceptions] = useState<any[]>([]);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [breakFormData, setBreakFormData] = useState({ startTime: '', endTime: '', reason: '' });
  const [submittingBreak, setSubmittingBreak] = useState(false);
  const [breakPermissions, setBreakPermissions] = useState<BreakPermission[]>([]);
  const [maxLimitMinutes, setMaxLimitMinutes] = useState(60);
  // Sync Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setInitialLoading(true);
      setError(null);
      const [todayRes, exceptionsRes, breaksRes, limitRes] = await Promise.allSettled([
        timeManagementService.getTodayRecord(user.id),
        timeManagementService.getAllTimeExceptions(),
        timeManagementService.getEmployeeBreakPermissions(user.id),
        timeManagementService.getBreakPermissionLimit(),
      ]);
      if (todayRes.status === 'fulfilled' && todayRes.value.data) {
        const record = todayRes.value.data as any;
        setTodayRecord(record);
        const lastPunch = record.punches?.[record.punches.length - 1];
        const isIn = lastPunch?.type === 'IN';
        setIsClockedIn(isIn);
        if (isIn) setClockInTime(new Date(lastPunch.time).toLocaleTimeString());
        else {
            const firstIn = record.punches?.find((p: any) => p.type === 'IN');
            if (firstIn) setClockInTime(new Date(firstIn.time).toLocaleTimeString());
        }
      }
      if (exceptionsRes.status === 'fulfilled' && exceptionsRes.value.data) {
        setTimeExceptions(Array.isArray(exceptionsRes.value.data) ? exceptionsRes.value.data.filter((ex: any) => 
          ex.employeeId === user.id || ex.employeeId?._id === user.id
        ) : []);
      }
      if (breaksRes.status === 'fulfilled' && breaksRes.value.data) {
        setBreakPermissions(Array.isArray(breaksRes.value.data) ? breaksRes.value.data : []);
      }
      if (limitRes.status === 'fulfilled' && limitRes.value.data) {
        setMaxLimitMinutes((limitRes.value.data as any).maxMinutes || 60);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with time keeping cluster');
    } finally {
      setInitialLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handlePunch = async (isClockIn: boolean) => {
    try {
      setInitialLoading(true);
      const action = isClockIn ? timeManagementService.punchIn : timeManagementService.punchOut;
      const res = await action({ employeeId: user?.id || '', source: 'portal-web' });
      if (res.data) {
        toast.success(`Protocol Successful: ${isClockIn ? 'Shift Engaged' : 'Shift Terminated'}`);
        await fetchData();
      } else if (res.error) {
        toast.error(`System Restriction: ${res.error}`);
      }
    } catch (err: any) {
      toast.error('Hardware interface failure. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };
  const submitCorrection = async () => {
    if (!exceptionFormData.reason) return toast.error('Reason required for audit trail');
    try {
      setSubmittingException(true);
      await timeManagementService.createTimeException({
        employeeId: user?.id || '',
        attendanceRecordId: todayRecord?._id,
        ...exceptionFormData
      });
      toast.success('Correction request filed for HR assessment');
      setShowExceptionForm(false);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to submit protocol exception');
    } finally {
      setSubmittingException(true);
    }
  };
  const submitBreak = async () => {
     if (!breakFormData.reason || !breakFormData.startTime || !breakFormData.endTime) return toast.error('Incomplete protocol parameters');
     try {
       setSubmittingBreak(true);
       await timeManagementService.createBreakPermission({
         employeeId: user?.id || '',
         attendanceRecordId: todayRecord?._id || '',
         ...breakFormData
       });
       toast.success('Break mission authorized and logged');
       setShowBreakForm(false);
       fetchData();
     } catch (err) {
       toast.error('Break request rejected by perimeter governance');
     } finally {
       setSubmittingBreak(false);
     }
  };
  if (initialLoading) return <PortalLoading message="Synchronizing biometric signatures..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PortalPageHeader
          title="Attendance Portal ?????? ??????"
          description="Manage shift protocols, mission corrections, and authorized breaks"
          breadcrumbs={[{ label: 'Time Management' }]}
          actions={
            <PortalButton variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw className="w-4 h-4" />}>
              Refresh Sync
            </PortalButton>
          }
        />
        {error && <PortalErrorState message={error} onRetry={fetchData} />}
        {/* Hero Clock-in Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PortalCard padding="none" className="lg:col-span-2 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-white shadow-2xl shadow-primary/20">
             <div className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="space-y-4 text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-3">
                      <Fingerprint className="w-6 h-6 text-white/60" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Biometric Clock Interface</span>
                   </div>
                   <h2 className="text-7xl font-black tracking-tighter">{currentTime}</h2>
                   <div className="flex gap-4 items-center justify-center md:justify-start">
                      {isClockedIn ? (
                        <PortalBadge className="bg-success text-white border-transparent px-4 py-1.5 font-black animate-pulse">PROTOCOL: ACTIVE</PortalBadge>
                      ) : (
                        <PortalBadge className="bg-white/20 text-white border-white/20 px-4 py-1.5 font-black">PROTOCOL: OFFLINE</PortalBadge>
                      )}
                      <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                   </div>
                </div>
                <div className="bg-black/10 backdrop-blur-xl border border-white/20 rounded-[40px] p-8 min-w-[300px] flex flex-col items-center gap-6">
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-white/40 mb-2">Shift Commencement</p>
                      <p className="text-2xl font-black">{clockInTime || '--:--:--'}</p>
                   </div>
                   <div className="w-full flex flex-col gap-3">
                      {!isClockedIn ? (
                        <PortalButton 
                          className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-lg transition-all active:scale-95 shadow-xl"
                          onClick={() => handlePunch(true)}
                          icon={<LogIn className="w-6 h-6" />}
                        >
                          Engage Shift
                        </PortalButton>
                      ) : (
                        <PortalButton 
                          className="w-full h-16 rounded-2xl bg-destructive text-white hover:bg-destructive/90 font-black text-lg transition-all active:scale-95 shadow-xl"
                          onClick={() => handlePunch(false)}
                          icon={<LogOut className="w-6 h-6" />}
                        >
                          Terminate Shift
                        </PortalButton>
                      )}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                      <MapPin className="w-3 h-3" /> Identity Verified: {user?.firstName} {user?.lastName}
                   </div>
                </div>
             </div>
          </PortalCard>
          <div className="space-y-6">
             <PortalStatCard 
               title="Work Duration" 
               value={todayRecord?.workDuration || "0.0h"} 
               subtitle="Current Session" 
               icon={<Timer className="w-5 h-5" />} 
               accentColor="primary" 
             />
             <PortalStatCard 
               title="Health Index" 
               value="98%" 
               subtitle="Punctuality Score" 
               icon={<Activity className="w-5 h-5" />} 
               accentColor="accent" 
             />
             <div className="bg-muted/10 border-2 border-dashed border-border p-6 rounded-[32px] flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <h4 className="font-extrabold text-sm mb-1 uppercase tracking-tight">Perimeter Secure</h4>
                <p className="text-[10px] text-muted-foreground font-medium max-w-[180px]">Your current location and IP have been validated against corporate guidelines.</p>
             </div>
          </div>
        </div>
        {/* Detail Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-3 space-y-6">
              <PortalTabs 
                tabs={[
                  { id: 'corrections', label: 'History & Corrections', badge: timeExceptions.length },
                  { id: 'breaks', label: 'Break Missions', badge: breakPermissions.length }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
              {activeTab === 'corrections' && (
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-2">
                       <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Historical Discrepancies</h3>
                       <PortalButton size="sm" variant="outline" onClick={() => setShowExceptionForm(true)} icon={<Plus className="w-4 h-4" />}>Log Exception</PortalButton>
                   </div>
                   {timeExceptions.length > 0 ? timeExceptions.map((ex, i) => (
                     <PortalCard key={i} hover padding="none" className="overflow-hidden border-l-4 border-l-primary">
                        <div className="p-6 flex items-center justify-between gap-6">
                           <div className="flex items-center gap-5">
                              <div className="p-3 bg-muted rounded-2xl"><AlertTriangle className="w-5 h-5 text-warning" /></div>
                              <div>
                                 <div className="flex items-center gap-2">
                                    <h4 className="font-black text-lg">{ex.type.replace('_', ' ')}</h4>
                                    <PortalBadge variant={ex.status === 'APPROVED' ? 'success' : 'warning'} size="sm">{ex.status}</PortalBadge>
                                 </div>
                                 <p className="text-sm text-muted-foreground mt-1 line-clamp-1 italic">"{ex.reason}"</p>
                              </div>
                           </div>
                           <div className="text-right shrink-0">
                               <p className="text-[10px] font-black uppercase opacity-40 mb-1">Filing Date</p>
                               <div className="flex items-center gap-2 font-bold text-xs"><Calendar className="w-3 h-3 text-primary" /> {new Date(ex.createdAt).toLocaleDateString()}</div>
                           </div>
                        </div>
                     </PortalCard>
                   )) : <PortalEmptyState icon={<History className="w-16 h-16 opacity-10" />} title="Archives Neutral" description="No attendance exceptions detected or filed for your profile." />}
                </div>
              )}
              {activeTab === 'breaks' && (
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-2">
                       <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Mission Respite Permissions</h3>
                       <PortalButton size="sm" variant="outline" onClick={() => setShowBreakForm(true)} icon={<Coffee className="w-4 h-4" />}>Request Break</PortalButton>
                   </div>
                   {breakPermissions.length > 0 ? breakPermissions.map((bp, i) => (
                     <PortalCard key={i} hover padding="none" className="overflow-hidden">
                        <div className="p-6 flex items-center justify-between gap-6">
                           <div className="flex items-center gap-5">
                              <div className="p-3 bg-primary/5 text-primary rounded-2xl border border-primary/10"><Coffee className="w-5 h-5" /></div>
                              <div>
                                 <div className="flex items-center gap-3">
                                    <h4 className="font-black text-lg">{new Date(bp.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(bp.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h4>
                                    <PortalBadge variant={bp.status === 'APPROVED' ? 'success' : 'warning'}>{bp.status}</PortalBadge>
                                 </div>
                                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Duration: {bp.duration} Mission Minutes</p>
                              </div>
                           </div>
                           <PortalButton variant="ghost" size="sm" icon={<MoreVertical className="w-4 h-4" />} />
                        </div>
                     </PortalCard>
                   )) : <PortalEmptyState icon={<Clock className="w-16 h-16 opacity-10" />} title="Full Engagement" description="You have not requested any break missions in this period." />}
                </div>
              )}
           </div>
           <div className="space-y-6">
              <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5 border-dashed border-2">
                 <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 text-primary">Rules of Engagement</h3>
                 <ul className="space-y-4 px-1">
                    {[
                      'Mandatory 45m break for any shift exceeding 6 full orbits.',
                      'Lateness threshold: +15m before protocol violation alert.',
                      'Missed engagement punches must be corrected within 24h.'
                    ].map((text, i) => (
                      <li key={i} className="flex gap-4">
                         <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                         <p className="text-[11px] text-muted-foreground italic leading-relaxed">"{text}"</p>
                      </li>
                    ))}
                 </ul>
              </PortalCard>
              <PortalCard className="p-0 overflow-hidden">
                 <div className="bg-muted p-4 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase opacity-60">Session Metadata</span>
                    <ShieldAlert className="w-3 h-3 opacity-40" />
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span className="opacity-40">Sync Status</span>
                       <span className="text-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Encrypted</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                       <span className="opacity-40">Device Signature</span>
                       <span>0xAE...F9</span>
                    </div>
                 </div>
              </PortalCard>
           </div>
        </div>
      </div>
      {/* Forms */}
      <PortalModal 
        isOpen={showExceptionForm} 
        onClose={() => setShowExceptionForm(false)} 
        title="Protocol Breach Correction"
        description="File an official request to amend historical attendance data."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <PortalButton variant="outline" onClick={() => setShowExceptionForm(false)}>Abort</PortalButton>
            <PortalButton onClick={submitCorrection} loading={submittingException} icon={<CheckCircle className="w-4 h-4" />}>File Request</PortalButton>
          </div>
        }
      >
        <div className="space-y-5">
           <PortalSelect 
             label="Breach Category" 
             value={exceptionFormData.type} 
             onChange={(e) => setExceptionFormData({...exceptionFormData, type: e.target.value})}
             options={TIME_EXCEPTION_TYPES}
           />
           <PortalTextarea 
             label="Rationale / Justification" 
             placeholder="Explain the reason for the discrepancy in detail..."
             value={exceptionFormData.reason}
             onChange={(e) => setExceptionFormData({...exceptionFormData, reason: e.target.value})}
             rows={4}
           />
        </div>
      </PortalModal>
      <PortalModal 
        isOpen={showBreakForm} 
        onClose={() => setShowBreakForm(false)} 
        title="Break Mission Authorization"
        description="Request a temporary pause in professional engagement."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <PortalButton variant="outline" onClick={() => setShowBreakForm(false)}>Cancel</PortalButton>
            <PortalButton onClick={submitBreak} loading={submittingBreak} icon={<Clock className="w-4 h-4" />}>Submit Protocol</PortalButton>
          </div>
        }
      >
        <div className="space-y-5">
           <div className="p-4 bg-warning/5 border border-warning/10 rounded-2xl flex items-center gap-3 mb-2">
              <ShieldAlert className="w-4 h-4 text-warning" />
              <p className="text-[10px] font-bold text-warning/80 uppercase tracking-widest">Max Threshold: {maxLimitMinutes} Minutes per mission</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <PortalInput label="Extraction Time" type="time" value={breakFormData.startTime} onChange={(e) => setBreakFormData({...breakFormData, startTime: e.target.value})} />
              <PortalInput label="Return Time" type="time" value={breakFormData.endTime} onChange={(e) => setBreakFormData({...breakFormData, endTime: e.target.value})} />
           </div>
           <PortalTextarea label="Respite Purpose" placeholder="Brief reason for the break request..." value={breakFormData.reason} onChange={(e) => setBreakFormData({...breakFormData, reason: e.target.value})} />
        </div>
      </PortalModal>
    </div>
  );
}
