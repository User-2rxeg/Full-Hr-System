'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

// Custom Input component with label support
interface InputWithLabelProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

function InputWithLabel({ label, className, ...props }: InputWithLabelProps) {
    return (
        <div className="w-full">
            {label && (
                <Label className="block text-sm font-medium text-foreground mb-1.5">
                    {label}
                </Label>
            )}
            <Input className={className} {...props} />
        </div>
    );
}

// Custom Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    children: React.ReactNode;
}

function LoadingButton({ isLoading, children, disabled, ...props }: LoadingButtonProps) {
    return (
        <Button disabled={disabled || isLoading} {...props}>
            {isLoading ? (
                <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                </>
            ) : (
                children
            )}
        </Button>
    );
}

/**
 * Employee Profile Edit Page - Department Employee
 * US-E2-05: Update contact information (immediate)
 * US-E2-12: Update bio and photo (immediate)
 * US-E6-02: Submit correction request for critical data
 */
export default function EditProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'contact' | 'bio' | 'education' | 'emergency' | 'correction'>('contact');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['contact', 'bio', 'education', 'emergency', 'correction'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);
    // Contact Info State
    const [contactInfo, setContactInfo] = useState({
        mobilePhone: '',
        homePhone: '',
        personalEmail: '',
        address: {
            city: '',
            streetAddress: '',
            country: '',
        },
    });

    // Bio State
    const [bioInfo, setBioInfo] = useState({
        biography: '',
        profilePictureUrl: '',
    });

    // Correction Request State
    const [correctionRequest, setCorrectionRequest] = useState({
        requestDescription: '',
        reason: '',
    });

    // Emergency Contact State
    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
    const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
    const [contactForm, setContactForm] = useState({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        isPrimary: false,
    });
    const [showContactForm, setShowContactForm] = useState(false);

    // Education State
    const [qualifications, setQualifications] = useState<any[]>([]);
    const [editingQualificationId, setEditingQualificationId] = useState<string | null>(null);
    const [qualificationForm, setQualificationForm] = useState({
        establishmentName: '',
        graduationType: 'BACHELOR',
    });
    const [showQualificationForm, setShowQualificationForm] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await employeeProfileService.getMyProfile();
                const data = response.data as any;
                setProfile(data);

                // Initialize contact info
                setContactInfo({
                    mobilePhone: data?.mobilePhone || '',
                    homePhone: data?.homePhone || '',
                    personalEmail: data?.personalEmail || '',
                    address: {
                        city: data?.address?.city || '',
                        streetAddress: data?.address?.streetAddress || '',
                        country: data?.address?.country || '',
                    },
                });

                // Initialize bio
                setBioInfo({
                    biography: data?.biography || '',
                    profilePictureUrl: data?.profilePictureUrl || '',
                });

                // Initialize emergency contacts
                setEmergencyContacts(data?.emergencyContacts || []);

                // Initialize qualifications
                setQualifications(data?.education || []);
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleUpdateContactInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            await employeeProfileService.updateContactInfo(profile._id, contactInfo);
            setSuccessMessage('Contact information updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update contact information');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateBio = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            await employeeProfileService.updateBio(profile._id, bioInfo);
            setSuccessMessage('Biography updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update biography');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEmergencyContact = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);

            let updatedContacts;
            if (editingContactIndex !== null) {
                // Update existing
                const response = await employeeProfileService.updateEmergencyContact(profile._id, editingContactIndex, contactForm);
                updatedContacts = response.data;
                setSuccessMessage('Emergency contact updated successfully!');
            } else {
                // Add new
                const response = await employeeProfileService.addEmergencyContact(profile._id, contactForm);
                updatedContacts = response.data;
                setSuccessMessage('Emergency contact added successfully!');
            }

            setEmergencyContacts(updatedContacts as any[]);
            setShowContactForm(false);
            setEditingContactIndex(null);
            setContactForm({
                name: '',
                relationship: '',
                phone: '',
                email: '',
                isPrimary: false,
            });
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save emergency contact');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteEmergencyContact = async (index: number) => {
        if (!window.confirm('Are you sure you want to delete this emergency contact?')) return;

        try {
            setLoading(true);
            const response = await employeeProfileService.deleteEmergencyContact(profile._id, index);
            setEmergencyContacts(response.data as any[]);
            setSuccessMessage('Emergency contact deleted successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to delete emergency contact');
        } finally {
            setLoading(false);
        }
    };

    const startEditContact = (index: number) => {
        const contact = emergencyContacts[index];
        setContactForm({
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            email: contact.email || '',
            isPrimary: contact.isPrimary || false,
        });
        setEditingContactIndex(index);
        setShowContactForm(true);
    };

    const handleSaveQualification = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);

            let updatedQuals;
            if (editingQualificationId) {
                // Update existing
                const response = await employeeProfileService.updateQualification(profile._id, editingQualificationId, qualificationForm);
                updatedQuals = response.data;
                setSuccessMessage('Education detail updated successfully!');
            } else {
                // Add new
                const response = await employeeProfileService.addQualification(profile._id, qualificationForm);
                updatedQuals = response.data;
                setSuccessMessage('Education detail added successfully!');
            }

            setQualifications(updatedQuals as any[]);
            setShowQualificationForm(false);
            setEditingQualificationId(null);
            setQualificationForm({
                establishmentName: '',
                graduationType: 'BACHELOR',
            });
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save education detail');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQualification = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this education detail?')) return;

        try {
            setLoading(true);
            const response = await employeeProfileService.deleteQualification(profile._id, id);
            setQualifications(response.data as any[]);
            setSuccessMessage('Education detail deleted successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to delete education detail');
        } finally {
            setLoading(false);
        }
    };

    const startEditQualification = (id: string) => {
        const qual = qualifications.find(q => q._id === id);
        if (qual) {
            setQualificationForm({
                establishmentName: qual.establishmentName,
                graduationType: qual.graduationType,
            });
            setEditingQualificationId(id);
            setShowQualificationForm(true);
        }
    };

    const handleSubmitCorrectionRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!correctionRequest.requestDescription.trim()) {
            setError('Please describe the correction you need');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await employeeProfileService.submitCorrectionRequest(profile._id, correctionRequest);
            setSuccessMessage('Correction request submitted successfully! HR will review it.');
            setCorrectionRequest({ requestDescription: '', reason: '' });
            setTimeout(() => {
                setSuccessMessage(null);
                router.push('/portal/my-profile');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit correction request');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-800 font-medium">No profile data found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Edit Profile</h1>
                    <p className="text-muted-foreground mt-2">Update your personal information</p>
                </div>
                <Link href="/portal/my-profile">
                    <Button variant="outline">
                        ← Back to Profile
                    </Button>
                </Link>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-in slide-in-from-top-1 duration-300">
                    <p className="text-emerald-800 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        {successMessage}
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-1 duration-300">
                    <p className="text-red-800 text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        {error}
                    </p>
                </div>
            )}

            {/* Profile Header Card */}
            <div className="bg-foreground rounded-2xl p-8 text-background shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-24 h-24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <div className="flex items-center gap-8 relative z-10">
                    <div className="w-24 h-24 flex items-center justify-center bg-background/10 rounded-full border border-background/20 backdrop-blur-sm">
                        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">{profile.firstName} {profile.lastName}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <span className="px-3 py-1 bg-background/10 rounded-full text-xs font-bold uppercase tracking-widest">{profile.positionName || 'N/A'}</span>
                            <span className="text-background/60 text-xs font-medium">{profile.departmentName || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-border">
                {[
                    { id: 'contact', label: 'Contact Details', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg> },
                    { id: 'bio', label: 'Bio & Photo', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> },
                    { id: 'education', label: 'Education', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg> },
                    { id: 'emergency', label: 'Emergency', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
                    { id: 'correction', label: 'Corrections', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
                ].map((tab: any) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-3 text-sm font-bold flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'border-primary text-primary bg-primary/5'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'contact' && (
                <form onSubmit={handleUpdateContactInfo} className="bg-card rounded-lg border border-border shadow-sm p-6">
                    <h3 className="text-lg font-bold text-foreground mb-6">Update Contact Information</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        These changes will be applied immediately without requiring approval.
                    </p>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputWithLabel
                                label="Mobile Phone"
                                type="tel"
                                value={contactInfo.mobilePhone}
                                onChange={(e) => setContactInfo({ ...contactInfo, mobilePhone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                                required
                            />
                            <InputWithLabel
                                label="Home Phone"
                                type="tel"
                                value={contactInfo.homePhone}
                                onChange={(e) => setContactInfo({ ...contactInfo, homePhone: e.target.value })}
                                placeholder="+1 (555) 987-6543"
                            />
                        </div>

                        <InputWithLabel
                            label="Personal Email"
                            type="email"
                            value={contactInfo.personalEmail}
                            onChange={(e) => setContactInfo({ ...contactInfo, personalEmail: e.target.value })}
                            placeholder="your.email@example.com"
                            required
                        />

                        <div className="space-y-6">
                            <h4 className="font-semibold text-foreground">Address</h4>
                            <InputWithLabel
                                label="Street Address"
                                value={contactInfo.address.streetAddress}
                                onChange={(e) => setContactInfo(prev => ({
                                    ...prev,
                                    address: { ...prev.address, streetAddress: e.target.value }
                                }))}
                                placeholder="123 Main Street, Apt 4B"
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputWithLabel
                                    label="City"
                                    value={contactInfo.address.city}
                                    onChange={(e) => setContactInfo(prev => ({
                                        ...prev,
                                        address: { ...prev.address, city: e.target.value }
                                    }))}
                                    placeholder="New York"
                                    required
                                />
                                <InputWithLabel
                                    label="Country"
                                    value={contactInfo.address.country}
                                    onChange={(e) => setContactInfo(prev => ({
                                        ...prev,
                                        address: { ...prev.address, country: e.target.value }
                                    }))}
                                    placeholder="United States"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 pt-6 border-t border-border/50">
                        <LoadingButton type="submit" isLoading={saving} className="min-w-[160px]">
                            Update Contact Details
                        </LoadingButton>
                        <Link href="/portal/my-profile">
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            )}

            {activeTab === 'bio' && (
                <form onSubmit={handleUpdateBio} className="bg-card rounded-lg border border-border shadow-sm p-6">
                    <h3 className="text-lg font-bold text-foreground mb-6">Update Biography & Photo</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        These changes will be applied immediately without requiring approval.
                    </p>

                    <div className="space-y-6">
                        {/* Profile Picture Upload */}
                        <div className="w-full">
                            <label className="block text-sm font-medium text-foreground mb-3">
                                Profile Picture
                            </label>

                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {/* Current/Preview Image */}
                                <div className="flex-shrink-0">
                                    <div className="w-32 h-32 rounded-full border border-border shadow-inner overflow-hidden bg-muted/40 flex items-center justify-center">
                                        {bioInfo.profilePictureUrl ? (
                                            <img
                                                src={bioInfo.profilePictureUrl}
                                                alt="Profile preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.src = '';
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="text-muted-foreground/30">
                                                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Upload Controls */}
                                <div className="flex-1">
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            id="profile-picture-upload"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Validate file size (max 2MB)
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        alert('Image size should be less than 2MB');
                                                        return;
                                                    }

                                                    // Convert to base64
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setBioInfo({ ...bioInfo, profilePictureUrl: reader.result as string });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />

                                        <label
                                            htmlFor="profile-picture-upload"
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-full hover:opacity-90 transition-all cursor-pointer font-bold text-xs uppercase tracking-widest shadow-lg shadow-foreground/10"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                            Upload Photo
                                        </label>

                                        {bioInfo.profilePictureUrl && (
                                            <button
                                                type="button"
                                                onClick={() => setBioInfo({ ...bioInfo, profilePictureUrl: '' })}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-destructive/5 text-destructive border border-destructive/20 rounded-full hover:bg-destructive/10 transition-all font-bold text-xs uppercase tracking-widest ml-3"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Upload a profile picture (JPG, PNG, or GIF). Max size: 2MB
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                Biography
                            </label>
                            <textarea
                                value={bioInfo.biography}
                                onChange={(e) => setBioInfo({ ...bioInfo, biography: e.target.value })}
                                placeholder="Tell us about yourself, your role, interests, and professional background..."
                                rows={6}
                                className="w-full px-4 py-3 border border-input bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                            />
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {bioInfo.biography.length} characters
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 pt-6 border-t border-border/50">
                        <LoadingButton type="submit" isLoading={saving} className="min-w-[160px]">
                            Update Biography
                        </LoadingButton>
                        <Link href="/portal/my-profile">
                            <Button type="button" variant="ghost">
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            )}

            {activeTab === 'education' && (
                <div className="space-y-6">
                    {!showQualificationForm ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-foreground">Education & Qualifications</h3>
                                <Button onClick={() => {
                                    setQualificationForm({
                                        establishmentName: '',
                                        graduationType: 'BACHELOR',
                                    });
                                    setEditingQualificationId(null);
                                    setShowQualificationForm(true);
                                }}>
                                    + Add Education
                                </Button>
                            </div>

                            {qualifications.length === 0 ? (
                                <div className="text-center py-16 bg-muted/20 rounded-3xl border border-border/50 border-dashed">
                                    <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
                                    </div>
                                    <h4 className="text-xl font-black text-foreground uppercase tracking-tight">No Education Details</h4>
                                    <p className="text-muted-foreground text-sm mt-2 mb-8 max-w-xs mx-auto">Please add your academic background and professional qualifications.</p>
                                    <Button onClick={() => setShowQualificationForm(true)} className="rounded-full px-8">Add Education</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {qualifications.map((qual, index) => (
                                        <div key={qual._id || index} className="relative p-6 rounded-lg border border-border bg-card">
                                            <div className="mb-4">
                                                <h4 className="font-bold text-lg text-foreground">{qual.establishmentName}</h4>
                                                <p className="text-primary font-medium">{qual.graduationType}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => startEditQualification(qual._id)}>
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleDeleteQualification(qual._id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSaveQualification} className="bg-card rounded-lg border border-border shadow-sm p-6">
                            <h3 className="text-lg font-bold text-foreground mb-6">
                                {editingQualificationId ? 'Edit Education Detail' : 'Add Education Detail'}
                            </h3>

                            <div className="space-y-6">
                                <InputWithLabel
                                    label="Establishment Name"
                                    value={qualificationForm.establishmentName}
                                    onChange={(e) => setQualificationForm({ ...qualificationForm, establishmentName: e.target.value })}
                                    required
                                    placeholder="e.g. Cairo University"
                                />

                                <div className="w-full">
                                    <Label className="block text-sm font-medium text-foreground mb-1.5">
                                        Graduation Type
                                    </Label>
                                    <select
                                        value={qualificationForm.graduationType}
                                        onChange={(e) => setQualificationForm({ ...qualificationForm, graduationType: e.target.value as any })}
                                        className="w-full px-4 py-2 border border-input bg-background rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                        required
                                    >
                                        <option value="UNDERGRADE">Undergraduate</option>
                                        <option value="BACHELOR">Bachelor's Degree</option>
                                        <option value="MASTER">Master's Degree</option>
                                        <option value="PHD">PhD</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <LoadingButton type="submit" isLoading={saving}>
                                    {editingQualificationId ? 'Update Detail' : 'Add Detail'}
                                </LoadingButton>
                                <Button type="button" variant="outline" onClick={() => setShowQualificationForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {activeTab === 'emergency' && (
                <div className="space-y-6">
                    {!showContactForm ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-foreground">Your Emergency Contacts</h3>
                                <Button onClick={() => {
                                    setContactForm({
                                        name: '',
                                        relationship: '',
                                        phone: '',
                                        email: '',
                                        isPrimary: false,
                                    });
                                    setEditingContactIndex(null);
                                    setShowContactForm(true);
                                }}>
                                    + Add New Contact
                                </Button>
                            </div>

                            {emergencyContacts.length === 0 ? (
                                <div className="text-center py-16 bg-muted/20 rounded-3xl border border-border/50 border-dashed">
                                    <div className="w-16 h-16 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    </div>
                                    <h4 className="text-xl font-black text-foreground uppercase tracking-tight">No Emergency Contacts</h4>
                                    <p className="text-muted-foreground text-sm mt-2 mb-8 max-w-xs mx-auto">Safety first! Please provide at least one contact for emergency situations.</p>
                                    <Button onClick={() => setShowContactForm(true)} className="rounded-full px-8">Add Initial Contact</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {emergencyContacts.map((contact, index) => (
                                        <div key={index} className={`relative p-6 rounded-lg border ${contact.isPrimary ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                                            {contact.isPrimary && (
                                                <span className="absolute top-4 right-4 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                                                    Primary
                                                </span>
                                            )}
                                            <div className="mb-4">
                                                <h4 className="font-bold text-lg text-foreground">{contact.name}</h4>
                                                <p className="text-muted-foreground font-medium">{contact.relationship}</p>
                                            </div>
                                            <div className="space-y-2 text-sm text-foreground mb-6">
                                                <div className="flex items-center gap-3">
                                                    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                    {contact.phone}
                                                </div>
                                                {contact.email && (
                                                    <div className="flex items-center gap-3">
                                                        <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                        {contact.email}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => startEditContact(index)}>
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleDeleteEmergencyContact(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSaveEmergencyContact} className="bg-card rounded-lg border border-border shadow-sm p-6">
                            <h3 className="text-lg font-bold text-foreground mb-6">
                                {editingContactIndex !== null ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                            </h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputWithLabel
                                        label="Full Name"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        required
                                        placeholder="e.g. John Doe"
                                    />
                                    <InputWithLabel
                                        label="Relationship"
                                        value={contactForm.relationship}
                                        onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                                        required
                                        placeholder="e.g. Spouse, Parent, Sibling"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputWithLabel
                                        label="Phone Number"
                                        type="tel"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        required
                                        placeholder="+1 (555) 000-0000"
                                    />
                                    <InputWithLabel
                                        label="Email (Optional)"
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isPrimary"
                                        checked={contactForm.isPrimary}
                                        onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                                        className="w-4 h-4 text-primary rounded border-input focus:ring-ring bg-background"
                                    />
                                    <label htmlFor="isPrimary" className="text-sm font-medium text-foreground">
                                        Set as Primary Contact
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <LoadingButton type="submit" isLoading={saving}>
                                    {editingContactIndex !== null ? 'Update Contact' : 'Add Contact'}
                                </LoadingButton>
                                <Button type="button" variant="outline" onClick={() => setShowContactForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {activeTab === 'correction' && (
                <div className="space-y-6">
                    <div className="bg-foreground text-background rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        </div>
                        <h4 className="font-black uppercase tracking-widest text-xs mb-2">Profile Revision Requests</h4>
                        <p className="text-background/70 text-sm leading-relaxed max-w-md">
                            Changes to sensitive data like legal names, IDs, or contracts require HR verification for compliance and security.
                        </p>
                    </div>

                    <form onSubmit={handleSubmitCorrectionRequest} className="bg-card rounded-lg border border-border shadow-sm p-6">
                        <h3 className="text-lg font-bold text-foreground mb-6">Request Profile Correction</h3>

                        <div className="space-y-6">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Correction Description <span className="text-destructive">*</span>
                                </label>
                                <textarea
                                    value={correctionRequest.requestDescription}
                                    onChange={(e) => setCorrectionRequest({ ...correctionRequest, requestDescription: e.target.value })}
                                    placeholder="Describe what needs to be corrected and what the correct information should be..."
                                    rows={5}
                                    required
                                    className="w-full px-4 py-3 border border-input bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                                />
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    Be specific about what needs to be changed
                                </p>
                            </div>

                            <div className="w-full">
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Reason (Optional)
                                </label>
                                <textarea
                                    value={correctionRequest.reason}
                                    onChange={(e) => setCorrectionRequest({ ...correctionRequest, reason: e.target.value })}
                                    placeholder="Provide additional context or reason for this correction..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-input bg-background rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8 pt-6 border-t border-border/50">
                            <LoadingButton type="submit" isLoading={saving} className="min-w-[180px]">
                                Submit Formal Request
                            </LoadingButton>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCorrectionRequest({ requestDescription: '', reason: '' })}
                            >
                                Reset Form
                            </Button>
                        </div>
                    </form>

                    {/* View My Requests Link */}
                    <div className="bg-muted/10 border border-border/40 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h4 className="font-bold text-foreground">Archive & Tracking</h4>
                            <p className="text-muted-foreground text-sm mt-1">
                                Interested in monitoring your submission history?
                            </p>
                        </div>
                        <Link href="/portal/my-profile/correction-requests">
                            <Button variant="secondary" className="rounded-full px-8">
                                View Your Revision History
                                <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}