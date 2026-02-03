'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { 
  User, Building, Briefcase, History, BrainCircuit,
  Edit, ShieldAlert, Trophy, Target,
  Fingerprint, Sparkles, UserCircle
} from 'lucide-react';
import { JourneyTimeline, TimelineEvent } from '@/components/ui/journey-timeline';
import { analyticsService, AttritionRiskResponse } from '@/app/services/analytics';
import { SkillRadar } from '@/components/analytics/SkillRadar';
import { AttritionRiskCard } from '@/components/analytics/AttritionRiskCard';
import {
    PortalPageHeader,
    PortalCard,
    PortalLoading,
    PortalBadge,
    PortalButton,
    PortalErrorState, 
    PortalEmptyState,
    PortalTabs,
} from '@/components/portal';
export default function MyProfilePortalPage() {
    const [profile, setProfile] = useState<any>(null);
    const [attritionRisk, setAttritionRisk] = useState<AttritionRiskResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setLoading(true);
                const profileResponse = await employeeProfileService.getMyProfile();
                const data = profileResponse.data as any;
                setProfile(data);
                try {
                    const riskData = await analyticsService.getAttritionRisk(data.id || data._id);
                    setAttritionRisk(riskData);
                } catch (riskErr) {
                    console.error('Failed to load risk data:', riskErr);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);
    if (loading) return <PortalLoading message="Decrypting talent identity..." fullScreen />;
    if (error) return <PortalErrorState message={error} onRetry={() => window.location.reload()} />;
    if (!profile) return <PortalEmptyState icon={<UserCircle className="w-16 h-16 opacity-10" />} title="Profile Not Found" description="The system could not retrieve your employee profile." />;
    const journeyEvents: TimelineEvent[] = [
        {
            id: 'hiring',
            date: new Date(profile.dateOfHire),
            title: 'Initial Deployment',
            description: `Recruited as ${profile.primaryPositionId?.title || 'a new member'}`,
            type: 'hiring'
        },
        {
            id: 'current',
            date: new Date(),
            title: 'Current Orbit',
            description: `Stationed in ${profile.primaryDepartmentId?.name || 'Department'} as ${profile.primaryPositionId?.title || 'Employee'}`,
            type: 'current'
        }
    ];
    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <PortalPageHeader
                    title="Talent Identity المركز"
                    description="Visualize your professional footprint, skills architecture, and company journey"
                    breadcrumbs={[{ label: 'My Identity' }]}
                    actions={
                        <div className="flex gap-2">
                            <Link href="/portal/my-profile/correction-requests">
                                <PortalButton variant="outline" icon={<ShieldAlert className="w-4 h-4" />}>
                                    ID Correction
                                </PortalButton>
                            </Link>
                            <Link href="/portal/my-profile/edit">
                                <PortalButton icon={<Edit className="w-4 h-4" />}>
                                    Update DNA
                                </PortalButton>
                            </Link>
                        </div>
                    }
                />
                {/* Hero Profile Card */}
                <PortalCard padding="none" className="overflow-hidden border-t-4 border-primary bg-gradient-to-br from-background via-background to-primary/[0.02]">
                    <div className="p-8 md:p-12 flex flex-col lg:flex-row gap-12 items-center lg:items-start text-center lg:text-left relative">
                        <div className="flex-shrink-0 relative group">
                            <div className="w-48 h-48 rounded-[40px] border-8 border-background shadow-2xl shadow-primary/20 overflow-hidden bg-muted flex items-center justify-center transition-all duration-500 group-hover:scale-105 group-hover:rotate-1">
                                {profile.profilePictureUrl ? (
                                    <img src={profile.profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground opacity-30" />
                                )}
                            </div>
                            <div className="absolute -bottom-4 -right-4">
                                <PortalBadge variant={profile.status === 'ACTIVE' ? 'success' : 'default'} className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg border-2 border-background">
                                    {profile.status}
                                </PortalBadge>
                            </div>
                            <div className="absolute -top-4 -left-4 p-3 bg-primary text-white rounded-2xl shadow-lg animate-bounce-slow">
                               <Sparkles className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-6 w-full">
                            <div>
                                <h2 className="text-5xl font-black tracking-tighter text-foreground mb-4">
                                    {profile.firstName} {profile.lastName}
                                </h2>
                                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-primary/20">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        {profile.primaryPositionId?.title || 'Unassigned'}
                                    </div>
                                    <div className="flex items-center gap-2 bg-muted/50 text-muted-foreground px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-border">
                                        <Building className="w-3.5 h-3.5" />
                                        {profile.primaryDepartmentId?.name || 'Central Command'}
                                    </div>
                                    <div className="flex items-center gap-2 bg-accent/10 text-accent-foreground px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-accent/20">
                                        <Target className="w-3.5 h-3.5" />
                                        Grade 4
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-border/50">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Secure Email</span>
                                    <span className="text-sm font-bold truncate">{profile.workEmail}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Ident Code</span>
                                    <span className="text-sm font-mono font-bold text-primary">{profile.employeeNumber}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Deployment Date</span>
                                    <span className="text-sm font-bold">{new Date(profile.dateOfHire).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Emergency Link</span>
                                    <span className="text-sm font-bold">{profile.mobilePhone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </PortalCard>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <PortalTabs 
                            tabs={[
                                { id: 'overview', label: 'DNA Overview' },
                                { id: 'journey', label: 'History Archive' },
                                { id: 'skills', label: 'Skill Architecture' }
                            ]}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PortalCard>
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-primary" /> Core Achievements
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl group hover:border-primary/50 transition-all cursor-crosshair">
                                            <p className="text-[10px] font-black uppercase opacity-40 mb-1">Recent Milestone</p>
                                            <p className="font-bold text-sm">Quarterly Performance Elite</p>
                                        </div>
                                        <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl">
                                            <p className="text-[10px] font-black uppercase opacity-40 mb-1">Company Longevity</p>
                                            <p className="font-bold text-sm">Vanguard Class ({Math.floor((new Date().getTime() - new Date(profile.dateOfHire).getTime()) / (1000 * 60 * 60 * 24 * 365))} Years)</p>
                                        </div>
                                    </div>
                                </PortalCard>
                                <PortalCard className="bg-gradient-to-br from-primary/5 to-accent/5">
                                   <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4 text-primary" /> Potential Vector
                                    </h3>
                                    <div className="space-y-6">
                                       <div className="space-y-2">
                                          <div className="flex justify-between items-end">
                                             <span className="text-[10px] font-black uppercase opacity-40">Leader Maturity</span>
                                             <span className="text-xs font-black">74%</span>
                                          </div>
                                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                             <div className="h-full bg-primary" style={{ width: '74%' }}></div>
                                          </div>
                                       </div>
                                       <div className="space-y-2">
                                          <div className="flex justify-between items-end">
                                             <span className="text-[10px] font-black uppercase opacity-40">Technical Versatility</span>
                                             <span className="text-xs font-black">91%</span>
                                          </div>
                                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                             <div className="h-full bg-accent" style={{ width: '91%' }}></div>
                                          </div>
                                       </div>
                                    </div>
                                </PortalCard>
                            </div>
                        )}
                        {activeTab === 'journey' && (
                            <PortalCard className="relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                                   <History className="w-48 h-48" />
                                </div>
                                <div className="relative z-10 px-4">
                                    <JourneyTimeline events={journeyEvents} />
                                </div>
                            </PortalCard>
                        )}
                        {activeTab === 'skills' && (
                            <PortalCard>
                                <div className="h-[400px] w-full flex items-center justify-center">
                                    <SkillRadar skills={profile.skills || []} />
                                </div>
                            </PortalCard>
                        )}
                    </div>
                    <div className="space-y-6">
                        {attritionRisk && (
                            <AttritionRiskCard 
                                riskScore={attritionRisk.riskScore}
                                level={attritionRisk.level}
                                factors={attritionRisk.factors}
                            />
                        )}
                        <PortalCard className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white shadow-xl shadow-primary/20">
                           <div className="flex items-center gap-3 mb-6">
                              <Fingerprint className="w-6 h-6 opacity-60" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Legacy Authorization</span>
                           </div>
                           <p className="text-sm font-medium leading-relaxed mb-8 opacity-80">"Your profile data is encrypted and synced across all tactical HR modules."</p>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                 <p className="text-2xl font-black">Level 3</p>
                                 <p className="text-[8px] font-black uppercase opacity-60 mt-1">Clearance Tier</p>
                              </div>
                              <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                 <p className="text-2xl font-black">Core</p>
                                 <p className="text-[8px] font-black uppercase opacity-60 mt-1">Role Group</p>
                              </div>
                           </div>
                        </PortalCard>
                        <PortalCard>
                           <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <History className="w-4 h-4 text-muted-foreground" /> DNA Trace (Audit)
                            </h3>
                            <div className="space-y-4">
                               <div className="flex gap-4 items-start group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 group-hover:scale-150 transition-transform" />
                                  <div>
                                     <p className="text-xs font-bold">Profile last synced</p>
                                     <p className="text-[10px] text-muted-foreground">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                               </div>
                               <div className="flex gap-4 items-start group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2" />
                                  <div>
                                     <p className="text-xs font-bold text-muted-foreground">Contract revised</p>
                                     <p className="text-[10px] text-muted-foreground/60">Nov 12, 2025</p>
                                  </div>
                               </div>
                            </div>
                        </PortalCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
