'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProfileAnalyticsService, ProfileHealth } from '@/app/services/analytics';
import {
    PortalPageHeader,
    PortalCard,
    PortalLoading,
    PortalBadge,
    PortalButton,
    PortalErrorState,
} from '@/components/portal';
import {
    CheckCircle, TrendingUp, Award, Zap, AlertTriangle,
    Target, Rocket, Star, ExternalLink, Download
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
export default function MyCareerPage() {
    const { user } = useAuth();
    const [health, setHealth] = useState<ProfileHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (user?.id) {
            setLoading(true);
            ProfileAnalyticsService.getProfileHealth(user.id)
                .then((data) => {
                    if (data) setHealth(data);
                })
                .catch((err) => {
                    console.error(err);
                    setError(err.message || 'Failed to load career analytics');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user?.id]);
    const timelineData = [
        { year: '2023', role: 'Junior Associate', level: 1 },
        { year: '2024', role: 'Associate', level: 2 },
        { year: '2025', role: 'Senior Associate (Current)', level: 3 },
        { year: '2026', role: 'Team Lead (Projected)', level: 4, projected: true },
        { year: '2027', role: 'Manager (Goal)', level: 5, projected: true },
    ];
    const skillsData = [
        { subject: 'Technical', A: 120, B: 110, fullMark: 150 },
        { subject: 'Leadership', A: 98, B: 130, fullMark: 150 },
        { subject: 'Communication', A: 86, B: 130, fullMark: 150 },
        { subject: 'Strategy', A: 99, B: 100, fullMark: 150 },
        { subject: 'Delivery', A: 85, B: 90, fullMark: 150 },
        { subject: 'Innovation', A: 65, B: 85, fullMark: 150 },
    ];
    if (loading) return <PortalLoading message="Analyzing your growth potential..." fullScreen />;
    if (error) return <PortalErrorState message={error} onRetry={() => window.location.reload()} />;
    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <PortalPageHeader
                    title="Career & Growth"
                    description="Visualize your journey, track skills, and optimize your profile for the next milestone"
                    breadcrumbs={[{ label: 'Career' }]}
                    actions={
                        <PortalButton variant="outline" icon={<Download className="w-4 h-4" />}>
                            Export Journey
                        </PortalButton>
                    }
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <PortalCard padding="none" className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
                            <div className="p-8 relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                        <Zap className="h-6 w-6 text-white" />
                                    </div>
                                    <PortalBadge className="bg-white/10 border-white/20 text-white">ELITE STATUS</PortalBadge>
                                </div>
                                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Profile Strength Index</p>
                                <h3 className="text-6xl font-black tracking-tighter mb-4">{health?.completenessScore || 0}%</h3>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/10 mb-6">
                                    <div className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_10px_white]" style={{ width: `${health?.completenessScore || 0}%` }}></div>
                                </div>
                                {health?.missingCriticalFields?.length ? (
                                    <div className="bg-black/10 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                                            <AlertTriangle className="h-4 w-4" /> Boost Potential
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {health.missingCriticalFields.map((field) => (
                                                <span key={field} className="text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded-full border border-white/5">
                                                    + {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                                        <CheckCircle className="h-4 w-4" /> Profile Fully Optimized
                                    </div>
                                )}
                            </div>
                        </PortalCard>
                        <PortalCard>
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" /> Current Benchmark
                            </h3>
                            <div className="space-y-6">
                                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-3">Next Projected Role</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <h4 className="font-black text-xl text-foreground">Team Lead</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">Estimated Q3 2026</p>
                                        </div>
                                        <Rocket className="w-8 h-8 text-primary/30" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                   <div className="flex justify-between items-center px-1">
                                       <span className="text-sm font-bold">Skills Readiness</span>
                                       <span className="text-sm font-black text-primary">82%</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                       <div className="h-full bg-primary" style={{ width: '82%' }}></div>
                                   </div>
                                </div>
                            </div>
                        </PortalCard>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <PortalCard className="h-full">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold text-lg text-foreground">Evolution Pathway</h3>
                                </div>
                                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Actual</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted-foreground"></div> Projection</span>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                        <YAxis hide domain={[0, 6]} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--background)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="level"
                                            stroke="var(--primary)"
                                            strokeWidth={4}
                                            dot={{ r: 8, strokeWidth: 4, fill: 'var(--background)' }}
                                            activeDot={{ r: 10, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </PortalCard>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <PortalCard>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 rounded-xl bg-accent/10 text-accent-foreground border border-accent/20">
                                <Award className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground">Competency Architecture</h3>
                        </div>
                        <div className="h-[350px] flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={120} data={skillsData}>
                                    <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                                    <Radar
                                        name="My Competency"
                                        dataKey="A"
                                        stroke="var(--primary)"
                                        fill="var(--primary)"
                                        fillOpacity={0.4}
                                    />
                                    <Radar
                                        name="Role Benchmark"
                                        dataKey="B"
                                        stroke="var(--muted-foreground)"
                                        fill="var(--muted-foreground)"
                                        fillOpacity={0.05}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </PortalCard>
                    <div className="space-y-6">
                        <PortalCard className="bg-gradient-to-br from-accent/5 to-primary/5 border-dashed border-2">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <Star className="h-5 w-5 text-accent-foreground" /> Acceleration Plan
                            </h3>
                            <div className="space-y-4">
                                <div className="p-5 bg-background border border-border rounded-2xl group hover:border-primary/50 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Rocket className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Advanced Leadership 2.0</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Required for Manager track</p>
                                            </div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="mt-4 flex items-center gap-4">
                                        <PortalBadge variant="info">CERTIFICATION</PortalBadge>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">+ 15 Strategy Points</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-background border border-border rounded-2xl group hover:border-accent/50 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors flex items-center justify-center">
                                                <Target className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground">Internal Mobility: Team Lead</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Engineering Dept • 2 slots open</p>
                                            </div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="mt-4 flex gap-4 items-center">
                                        <PortalBadge variant="success">OPEN ROLE</PortalBadge>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">High Match Profile</span>
                                    </div>
                                </div>
                            </div>
                            <PortalButton className="w-full mt-6 py-6" variant="outline">Explore Talent Marketplace</PortalButton>
                        </PortalCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
