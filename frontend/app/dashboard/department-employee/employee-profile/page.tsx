'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/app/components/ui/button';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Badge } from '@/app/components/ui/badge';
import {
    User,
    MapPin,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    GraduationCap,
    Edit,
    FileText,
    AlertCircle,
    Hash,
    Clock,
    Building
} from 'lucide-react';
import { DotPattern } from '@/app/components/dot-pattern';

export default function EmployeeProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await employeeProfileService.getMyProfile();
                setProfile(response.data);
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-muted-foreground animate-pulse font-medium">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 flex justify-center">
                <GlassCard className="max-w-md w-full p-6 border-destructive/20 bg-destructive/5 text-center">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load profile</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </GlassCard>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="relative min-h-screen pb-10">
            {/* Background Decorations - Subtler */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
            <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10" />
            <div className="absolute top-40 left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] -z-10" />

            {/* Header / Hero Section */}
            <div className="space-y-5 max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            My Profile
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Manage your personal information and employment details</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/dashboard/department-employee/employee-profile/correction-requests">
                            <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur-sm h-9">
                                <FileText className="w-3.5 h-3.5" />
                                Correction Requests
                            </Button>
                        </Link>
                        <Link href="/dashboard/department-employee/employee-profile/edit">
                            <Button size="sm" className="gap-2 shadow-sm shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 border-0 h-9">
                                <Edit className="w-3.5 h-3.5" />
                                Update Profile
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Profile Overview Card - Compact */}
                <GlassCard className="p-0 overflow-hidden relative group">
                    <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-800 relative overflow-hidden">
                        <DotPattern className="opacity-10 text-white" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>

                    <div className="px-5 pb-5 md:px-6 md:pb-6 flex flex-col md:flex-row gap-5 relative">
                        <div className="-mt-10 flex-shrink-0 relative">
                            <div className="w-24 h-24 rounded-full border-[3px] border-background bg-muted flex items-center justify-center shadow-md ring-2 ring-background/50 overflow-hidden">
                                {profile.profilePictureUrl ? (
                                    <img
                                        src={profile.profilePictureUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-muted-foreground/50" />
                                )}
                            </div>
                            <div className={`absolute bottom-1 right-1 w-5 h-5 border-[3px] border-background rounded-full ${profile.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'
                                }`} title={profile.status}></div>
                        </div>

                        <div className="pt-1 flex-grow">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                        {profile.firstName} {profile.lastName}
                                        <Badge variant="outline" className="ml-1 bg-primary/5 border-primary/10 text-primary text-[10px] px-1.5 py-0 h-5">
                                            {profile.status}
                                        </Badge>
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground mt-1 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5 text-primary/70" />
                                            <span className="font-medium text-foreground/80">{profile.primaryPositionId?.title || 'No Position'}</span>
                                        </div>
                                        <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                                        <div className="flex items-center gap-1.5">
                                            <Building className="w-3.5 h-3.5 text-primary/70" />
                                            <span>{profile.primaryDepartmentId?.name || 'No Department'}</span>
                                        </div>
                                        <div className="hidden sm:block w-1 h-1 rounded-full bg-border" />
                                        <div className="flex items-center gap-1.5">
                                            <Hash className="w-3.5 h-3.5 text-primary/70" />
                                            <span className="text-xs">ID: <span className="font-mono">{profile.employeeNumber}</span></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-start md:items-end gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/40">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3" />
                                        {profile.workEmail}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        Hired: {new Date(profile.dateOfHire).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Content Grid - Denser */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Biography */}
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2.5 mb-3 border-b border-border/50 pb-2.5">
                                <div className="p-1.5 bg-blue-500/10 rounded-md">
                                    <User className="w-4 h-4 text-blue-500" />
                                </div>
                                <h3 className="font-semibold text-base">Biography</h3>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-sm">
                                {profile.biography ? (
                                    <p>{profile.biography}</p>
                                ) : (
                                    <p className="italic text-muted-foreground/60">No biography details provided yet.</p>
                                )}
                            </div>
                        </GlassCard>

                        {/* Employment Details */}
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2.5 mb-4 border-b border-border/50 pb-2.5">
                                <div className="p-1.5 bg-purple-500/10 rounded-md">
                                    <Briefcase className="w-4 h-4 text-purple-500" />
                                </div>
                                <h3 className="font-semibold text-base">Employment Details</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contract Type</p>
                                    <p className="text-sm font-medium text-foreground">{profile.contractType || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Work Type</p>
                                    <p className="text-sm font-medium text-foreground">{profile.workType || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contract Start</p>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        {profile.contractStartDate ? new Date(profile.contractStartDate).toLocaleDateString() : '-'}
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contract End</p>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        {profile.contractEndDate ? new Date(profile.contractEndDate).toLocaleDateString() : 'Indefinite'}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Education */}
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2.5 mb-4 border-b border-border/50 pb-2.5">
                                <div className="p-1.5 bg-green-500/10 rounded-md">
                                    <GraduationCap className="w-4 h-4 text-green-500" />
                                </div>
                                <h3 className="font-semibold text-base">Education History</h3>
                            </div>

                            {profile.education && profile.education.length > 0 ? (
                                <div className="space-y-4 relative">
                                    {/* Vertical Timeline Line */}
                                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50"></div>

                                    {profile.education.map((edu: any, i: number) => (
                                        <div key={i} className="relative pl-9 group">
                                            <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 bg-background border border-primary rounded-full group-hover:bg-primary group-hover:scale-110 transition-all z-10"></div>
                                            <div className="bg-muted/20 rounded-lg p-2.5 border border-border/40 hover:border-border transition-colors">
                                                <h4 className="font-medium text-sm text-foreground">{edu.establishmentName}</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">{edu.graduationType}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <GraduationCap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground italic">No education details added.</p>
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-5">
                        {/* Personal Info */}
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2.5 mb-4 border-b border-border/50 pb-2.5">
                                <div className="p-1.5 bg-amber-500/10 rounded-md">
                                    <User className="w-4 h-4 text-amber-500" />
                                </div>
                                <h3 className="font-semibold text-base">Personal Info</h3>
                            </div>

                            <dl className="space-y-3">
                                <div>
                                    <dt className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5 mb-1">
                                        <Mail className="w-2.5 h-2.5" /> Personal Email
                                    </dt>
                                    <dd className="text-xs font-medium text-foreground break-all bg-muted/30 px-2 py-1.5 rounded border border-border/30">
                                        {profile.personalEmail || '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5 mb-1">
                                        <Phone className="w-2.5 h-2.5" /> Home Phone
                                    </dt>
                                    <dd className="text-xs font-medium text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/30">
                                        {profile.homePhone || '-'}
                                    </dd>
                                </div>
                                {profile.mobilePhone && (
                                    <div>
                                        <dt className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5 mb-1">
                                            <Phone className="w-2.5 h-2.5" /> Mobile Phone
                                        </dt>
                                        <dd className="text-xs font-medium text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/30">
                                            {profile.mobilePhone}
                                        </dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5 mb-1">
                                        <Calendar className="w-2.5 h-2.5" /> Date of Birth
                                    </dt>
                                    <dd className="text-xs font-medium text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/30">
                                        {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '-'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5 mb-1">
                                        <MapPin className="w-2.5 h-2.5" /> Address
                                    </dt>
                                    <dd className="text-xs font-medium text-foreground bg-muted/30 px-2 py-1.5 rounded border border-border/30 leading-relaxed">
                                        {profile.address ? (
                                            <>
                                                {profile.address.streetAddress}<br />
                                                {profile.address.city}, {profile.address.country}
                                            </>
                                        ) : '-'}
                                    </dd>
                                </div>
                            </dl>
                        </GlassCard>

                        {/* Emergency Contacts */}
                        <GlassCard className="p-5">
                            <div className="flex items-center gap-2.5 mb-4 border-b border-border/50 pb-2.5">
                                <div className="p-1.5 bg-rose-500/10 rounded-md">
                                    <AlertCircle className="w-4 h-4 text-rose-500" />
                                </div>
                                <h3 className="font-semibold text-base">Emergency Contacts</h3>
                            </div>

                            {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                                <div className="space-y-2.5">
                                    {profile.emergencyContacts.map((contact: any, i: number) => (
                                        <div key={i} className={`p-2.5 rounded-lg border transition-all ${contact.isPrimary
                                                ? 'bg-rose-500/5 border-rose-500/20 shadow-sm'
                                                : 'bg-accent/10 border-border/40 hover:bg-accent/30'
                                            }`}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className="font-medium text-sm text-foreground">{contact.name}</div>
                                                {contact.isPrimary && (
                                                    <span className="text-[9px] uppercase font-bold text-rose-500 bg-rose-500/10 px-1 py-px rounded-sm">Primary</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mb-1">{contact.relationship}</div>
                                            <div className="flex items-center gap-1 text-[11px] text-foreground/80">
                                                <Phone className="w-2.5 h-2.5 text-rose-500" />
                                                {contact.phone}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <p className="text-xs text-muted-foreground italic mb-2">No contacts added.</p>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                        <Link href="/dashboard/department-employee/employee-profile/edit">Add Contact</Link>
                                    </Button>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
