'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/app/components/ui/button';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Badge } from '@/app/components/ui/badge';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    GraduationCap,
    Edit,
    FileText,
    MapPin,
    Hash,
    Clock,
    Building,
    Award,
    TrendingUp,
    AlertCircle,
    ExternalLink,
    UserCircle,
    Shield,
    DollarSign,
    CalendarCheck,
} from 'lucide-react';

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

    // Calculate tenure
    const tenure = useMemo(() => {
        if (!profile?.dateOfHire) return null;
        const hire = new Date(profile.dateOfHire);
        const now = new Date();
        const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const months = Math.floor(((now.getTime() - hire.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
        return { years, months };
    }, [profile?.dateOfHire]);

    // Calculate profile completion
    const profileCompletion = useMemo(() => {
        if (!profile) return 0;
        const fields = [
            profile.firstName,
            profile.lastName,
            profile.workEmail,
            profile.mobilePhone,
            profile.personalEmail,
            profile.dateOfBirth,
            profile.address,
            profile.biography,
            profile.profilePictureUrl,
            profile.education?.length > 0,
            profile.emergencyContacts?.length > 0,
        ];
        const completed = fields.filter(Boolean).length;
        return Math.round((completed / fields.length) * 100);
    }, [profile]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <LoadingSpinner size="lg" />
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
        <div className="relative min-h-screen pb-10 space-y-6">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
            <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10" />
            <div className="absolute top-40 left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[60px] -z-10" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        My Profile
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">View and manage your personal information</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/portal/my-profile/correction-requests">
                        <Button variant="outline" size="sm" className="gap-2">
                            <FileText className="w-4 h-4" />
                            Correction Requests
                        </Button>
                    </Link>
                    <Link href="/portal/my-profile/edit">
                        <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                            <Edit className="w-4 h-4" />
                            Update Profile
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassCard className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tenure</p>
                            <p className="text-lg font-bold text-foreground">
                                {tenure ? `${tenure.years}y ${tenure.months}m` : 'N/A'}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Hired Date</p>
                            <p className="text-lg font-bold text-foreground">
                                {new Date(profile.dateOfHire).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Profile Complete</p>
                            <p className="text-lg font-bold text-foreground">{profileCompletion}%</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <StatusBadge status={profile.status} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Profile Card */}
            <GlassCard className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0">
                        <div className="w-32 h-32 rounded-full border-4 border-primary/20 overflow-hidden bg-muted/50 flex items-center justify-center shadow-lg">
                            {profile.profilePictureUrl ? (
                                <img
                                    src={profile.profilePictureUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserCircle className="w-16 h-16 text-muted-foreground" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-foreground">
                                    {profile.firstName} {profile.middleName && `${profile.middleName} `}{profile.lastName}
                                </h2>
                                <div className="flex flex-wrap gap-3 text-sm mt-2">
                                    <Badge variant="outline" className="text-primary border-primary/30">
                                        <Briefcase className="w-3 h-3 mr-1" />
                                        {profile.primaryPositionId?.title || 'No Position'}
                                    </Badge>
                                    <Badge variant="outline" className="border-border">
                                        <Building className="w-3 h-3 mr-1" />
                                        {profile.primaryDepartmentId?.name || 'No Department'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Mail className="w-4 h-4 text-primary" />
                                <span className="text-sm">{profile.workEmail}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Hash className="w-4 h-4 text-primary" />
                                <span className="text-sm">{profile.employeeNumber}</span>
                            </div>
                            {profile.mobilePhone && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Phone className="w-4 h-4 text-primary" />
                                    <span className="text-sm">{profile.mobilePhone}</span>
                                </div>
                            )}
                            {profile.dateOfBirth && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="text-sm">
                                        {new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Quick Links */}
            <GlassCard className="p-6">
                <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5" />
                    Quick Links
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Link href="/portal/my-performance">
                        <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                            <TrendingUp className="w-4 h-4" />
                            <div className="text-left">
                                <div className="text-xs text-muted-foreground">Performance</div>
                                <div className="text-sm font-medium">View Reviews</div>
                            </div>
                        </Button>
                    </Link>
                    <Link href="/portal/my-leaves">
                        <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                            <CalendarCheck className="w-4 h-4" />
                            <div className="text-left">
                                <div className="text-xs text-muted-foreground">Leaves</div>
                                <div className="text-sm font-medium">Balance & Requests</div>
                            </div>
                        </Button>
                    </Link>
                    <Link href="/portal/my-organization">
                        <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                            <Building className="w-4 h-4" />
                            <div className="text-left">
                                <div className="text-xs text-muted-foreground">Organization</div>
                                <div className="text-sm font-medium">View Structure</div>
                            </div>
                        </Button>
                    </Link>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Biography */}
                    <GlassCard className="p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
                            <User className="w-5 h-5" />
                            Biography
                        </h3>
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                            {profile.biography || (
                                <span className="italic text-muted-foreground/70">No biography details provided.
                                    <Link href="/portal/my-profile/edit?tab=bio" className="text-primary hover:underline ml-1">
                                        Add one now
                                    </Link>
                                </span>
                            )}
                        </p>
                    </GlassCard>

                    {/* Employment Details */}
                    <GlassCard className="p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
                            <Briefcase className="w-5 h-5" />
                            Employment Details
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract Type</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.contractType ? (
                                        <Badge variant="outline">{profile.contractType}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Work Type</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.workType ? (
                                        <Badge variant="outline">{profile.workType}</Badge>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract Start</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.contractStartDate ? (
                                        new Date(profile.contractStartDate).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract End</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.contractEndDate ? (
                                        new Date(profile.contractEndDate).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </GlassCard>

                    {/* Education */}
                    <GlassCard className="p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
                            <GraduationCap className="w-5 h-5" />
                            Education & Qualifications
                        </h3>
                        {profile.education && profile.education.length > 0 ? (
                            <div className="space-y-4">
                                {profile.education.map((edu: any, i: number) => (
                                    <div key={i} className="p-4 rounded-lg border border-border/50 bg-muted/30 last:border-0">
                                        <div className="font-medium text-foreground">{edu.establishmentName}</div>
                                        <div className="text-sm text-muted-foreground mt-1">{edu.graduationType}</div>
                                        {edu.grade && (
                                            <div className="text-xs text-muted-foreground mt-1">Grade: {edu.grade}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No education details added.
                                <Link href="/portal/my-profile/edit?tab=education" className="text-primary hover:underline ml-1">
                                    Add education
                                </Link>
                            </p>
                        )}
                    </GlassCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Employment Details */}
                    <GlassCard className="p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center justify-between border-b border-border/50 pb-3">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5" />
                                Employment Details
                            </div>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-tighter font-bold">Official Records</span>
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                                    Contract Type
                                    <span className="text-primary">*</span>
                                </dt>
                                <dd className="text-sm font-bold text-foreground">
                                    {profile.contractType || <span className="text-muted-foreground/50">-</span>}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1 flex items-center gap-1">
                                    Work Type
                                    <span className="text-primary">*</span>
                                </dt>
                                <dd className="text-sm font-bold text-foreground">
                                    {profile.workType || <span className="text-muted-foreground/50">-</span>}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract Start</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.contractStartDate ? (
                                        new Date(profile.contractStartDate).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Contract End</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.contractEndDate ? (
                                        new Date(profile.contractEndDate).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                            {profile.gender && (
                                <div>
                                    <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Gender</dt>
                                    <dd className="text-sm font-medium text-foreground">
                                        <Badge variant="outline">{profile.gender}</Badge>
                                    </dd>
                                </div>
                            )}
                            {profile.maritalStatus && (
                                <div>
                                    <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Marital Status</dt>
                                    <dd className="text-sm font-medium text-foreground">
                                        <Badge variant="outline">{profile.maritalStatus}</Badge>
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-xs text-muted-foreground uppercase font-semibold mb-1">Address</dt>
                                <dd className="text-sm font-medium text-foreground">
                                    {profile.address ? (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                            <div>
                                                {profile.address.streetAddress}<br />
                                                {profile.address.city}, {profile.address.country}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </GlassCard>

                    {/* Emergency Contacts */}
                    <GlassCard className="p-6">
                        <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
                            <AlertCircle className="w-5 h-5" />
                            Emergency Contacts
                        </h3>
                        {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                            <div className="space-y-3">
                                {profile.emergencyContacts.map((contact: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`p-4 rounded-lg border ${contact.isPrimary
                                            ? 'border-primary/30 bg-primary/5'
                                            : 'border-border/50 bg-muted/30'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-foreground flex items-center gap-2">
                                                    {contact.name}
                                                    {contact.isPrimary && (
                                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">{contact.relationship}</div>
                                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {contact.phone}
                                                </div>
                                                {contact.email && (
                                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {contact.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                No contacts added.
                                <Link href="/portal/my-profile/edit?tab=emergency" className="text-primary hover:underline ml-1">
                                    Add emergency contact
                                </Link>
                            </p>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}