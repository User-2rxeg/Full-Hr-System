'use client';
import { useState, useEffect } from 'react';
import { timeManagementService, ShiftAssignment, ShiftAssignmentStatus } from '@/app/services/time-management';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  PortalPageHeader,
  PortalCard,
  PortalStatCard,
  PortalLoading,
  PortalEmptyState,
  PortalBadge,
  PortalTabs,
  PortalErrorState,
  PortalButton,
} from '@/components/portal';
import { Calendar, Clock, AlertTriangle, ShieldCheck, History, ChevronRight, Info } from 'lucide-react';
interface LeaveEntitlement {
  _id: string;
  employeeId: string;
  leaveTypeId: {
    _id: string;
    name: string;
  };
  yearlyEntitlement: number;
  accruedActual: number;
  accruedRounded: number;
  carryForward: number;
  taken: number;
  pending: number;
  remaining: number;
  lastAccrualDate?: string;
  nextResetDate?: string;
}
export default function MySchedulePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [shiftsMap, setShiftsMap] = useState<{ [key: string]: any }>({});
  const [leaveEntitlements, setLeaveEntitlements] = useState<LeaveEntitlement[]>([]);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  useEffect(() => {
    const fetchShiftAssignments = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await timeManagementService.getAssignmentsForEmployee(user.id);
        if (response.data && Array.isArray(response.data)) {
          setShiftAssignments(response.data);
          try {
            const allShifts = await timeManagementService.getShifts();
            if (allShifts.data && Array.isArray(allShifts.data)) {
              const shiftsDict: { [key: string]: any } = {};
              allShifts.data.forEach((shift: any) => {
                shiftsDict[shift._id] = shift;
              });
              setShiftsMap(shiftsDict);
            }
          } catch (shiftErr) {
            console.warn('[MySchedule] Failed to fetch shift details:', shiftErr);
          }
        }
        try {
          setLoadingEntitlements(true);
          const entitlementsResponse = await leavesService.getEntitlements(user.id);
          if (entitlementsResponse.data && Array.isArray(entitlementsResponse.data)) {
            setLeaveEntitlements(entitlementsResponse.data);
          }
        } catch (entitlementErr) {
          console.warn('[MySchedule] Failed to fetch leave entitlements:', entitlementErr);
        } finally {
          setLoadingEntitlements(false);
        }
      } catch (err) {
        console.error('[MySchedule] Error fetching assignments:', err);
        setError('Failed to load your schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchShiftAssignments();
  }, [user?.id]);
  const getStatusVariant = (status: ShiftAssignmentStatus): 'success' | 'warning' | 'destructive' | 'default' => {
    switch (status) {
      case ShiftAssignmentStatus.APPROVED: return 'success';
      case ShiftAssignmentStatus.PENDING: return 'warning';
      case ShiftAssignmentStatus.CANCELLED: return 'destructive';
      case ShiftAssignmentStatus.EXPIRED: return 'default';
      default: return 'default';
    }
  };
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    const parts = timeString.split(':');
    if (parts.length < 2) return timeString;
    return `${parts[0]}:${parts[1]}`;
  };
  const isExpiring = (endDate: string | undefined) => {
    if (!endDate) return false;
    const today = new Date();
    const expireDate = new Date(endDate);
    const diff = expireDate.getTime() - today.getTime();
    if (diff < 0) return false;
    const daysUntilExpire = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return daysUntilExpire <= 7 && daysUntilExpire > 0;
  };
  if (loading) return <PortalLoading message="Loading schedule..." fullScreen />;
  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PortalPageHeader
          title="My Schedule"
          description="View your active assignments and vacation packages"
          breadcrumbs={[{ label: 'My Schedule' }]}
        />
        {error && <PortalErrorState message={error} onRetry={() => window.location.reload()} />}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PortalStatCard title="Active Shifts" value={shiftAssignments.filter(a => a.status === ShiftAssignmentStatus.APPROVED).length.toString()} icon={<ShieldCheck className="h-5 w-5" />} accentColor="primary" />
          <PortalStatCard title="Pending" value={shiftAssignments.filter(a => a.status === ShiftAssignmentStatus.PENDING).length.toString()} icon={<Clock className="h-5 w-5" />} accentColor="warning" />
          <PortalStatCard title="Packages" value={leaveEntitlements.length.toString()} icon={<Calendar className="h-5 w-5" />} accentColor="accent" />
        </div>
        <PortalTabs
          tabs={[
            { id: 'schedule', label: 'My Schedule', badge: shiftAssignments.length },
            { id: 'vacation', label: 'Vacation Packages', badge: leaveEntitlements.length },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="mt-6">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {shiftAssignments.length === 0 ? (
                <PortalEmptyState icon={<Clock className="h-12 w-12 opacity-20" />} title="No Shift Assignments" description="You don't have any shift assignments yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shiftAssignments.map((assignment) => {
                    const shift = shiftsMap[assignment.shiftId];
                    return (
                      <PortalCard key={assignment._id} hover className="border-t-2 border-primary">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
                            <div>
                              <h3 className="font-bold">{shift?.name || 'Shift Assignment'}</h3>
                              <p className="text-[10px] uppercase font-black opacity-40">{shift?.code || 'WEB-ASGN'}</p>
                            </div>
                          </div>
                          <PortalBadge variant={getStatusVariant(assignment.status)}>{assignment.status}</PortalBadge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-muted/30 rounded-xl p-4 mb-4">
                          <div>
                            <p className="text-[8px] font-black uppercase opacity-40">Period</p>
                            <p className="text-xs font-bold">{formatDate(assignment.startDate)} - {assignment.endDate ? formatDate(assignment.endDate) : 'End'}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase opacity-40">Hours</p>
                            <p className="text-xs font-black text-primary">{shift ? `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}` : '--:--'}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-between items-center">
                           <span className="text-[10px] font-bold opacity-40 uppercase">Assigned Shift</span>
                           <PortalButton variant="ghost" size="sm" icon={<ChevronRight className="h-4 w-4" />}>Details</PortalButton>
                        </div>
                      </PortalCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {activeTab === 'vacation' && (
            <div className="space-y-6">
              {loadingEntitlements ? <PortalLoading message="Loading..." /> : leaveEntitlements.length === 0 ? (
                <PortalEmptyState icon={<Calendar className="h-12 w-12 opacity-20" />} title="No Vacation Packages" description="You have no entitlements." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {leaveEntitlements.map((pkg) => (
                    <PortalCard key={pkg._id} hover className="border-l-4 border-primary">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-4">
                          <div className="p-3 bg-primary/5 text-primary rounded-xl"><Calendar className="h-6 w-6" /></div>
                          <div>
                            <h3 className="font-bold text-lg">{pkg.leaveTypeId?.name}</h3>
                            <p className="text-[10px] opacity-40 uppercase font-bold">Policy: {pkg._id.substring(0,8)}</p>
                          </div>
                        </div>
                        <PortalBadge variant="info">{pkg.yearlyEntitlement} Days</PortalBadge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {[{l:'Entitled',v:pkg.yearlyEntitlement,c:'text-primary'},{l:'Carry',v:pkg.carryForward,c:'text-accent-foreground'},{l:'Taken',v:pkg.taken,c:'text-destructive'},{l:'Left',v:pkg.remaining,c:'text-success'}].map(s=>(
                          <div key={s.l} className="p-2 bg-muted/30 rounded-xl text-center">
                            <p className="text-[8px] font-black uppercase opacity-40">{s.l}</p>
                            <p className={`text-sm font-black ${s.c}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-border flex justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <History className="h-3 w-3 opacity-40" />
                          <span className="text-[10px] font-bold opacity-40 uppercase">Next: {pkg.nextResetDate ? formatDate(pkg.nextResetDate) : 'N/A'}</span>
                        </div>
                      </div>
                    </PortalCard>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
