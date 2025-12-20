'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import {
  User,
  ArrowLeft,
  Save,
  Upload,
  Trash2,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  Plus
} from 'lucide-react';

// Custom components
function InputWithLabel({ label, className, icon: Icon, ...props }: any) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          {label}
        </Label>
      )}
      <Input className={`bg-background/50 h-9 text-sm ${className}`} {...props} />
    </div>
  );
}

function LoadingButton({ isLoading, children, disabled, className, ...props }: any) {
  return (
    <Button disabled={disabled || isLoading} className={className} size="sm" {...props}>
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white mr-2"></div>
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contact' | 'bio' | 'emergency' | 'correction'>('contact');

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
        const response = await employeeProfileService.updateEmergencyContact(profile._id, editingContactIndex, contactForm);
        updatedContacts = response.data;
        setSuccessMessage('Emergency contact updated successfully!');
      } else {
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
      setLoading(true); // Using loading for delete feedback
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
      setSuccessMessage('Correction request submitted! Redirecting...');
      setCorrectionRequest({ requestDescription: '', reason: '' });
      setTimeout(() => {
        setSuccessMessage(null);
        router.push('/dashboard/department-employee/employee-profile');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction request');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground animate-pulse font-medium">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all rounded-md w-full text-left ${activeTab === id
        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen pb-10 relative">
      {/* Background */}
      <div className="absolute top-0 right-0 w-1/3 h-96 bg-primary/5 rounded-bl-[100px] -z-10 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Link href="/dashboard/department-employee/employee-profile" className="hover:text-primary transition-colors flex items-center gap-1 text-xs">
                <ArrowLeft className="w-3 h-3" /> Back to Profile
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Profile</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Update your personal information and preferences</p>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <GlassCard className="border-green-500/20 bg-green-500/5 p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-green-700 dark:text-green-400 font-medium text-sm">{successMessage}</p>
          </GlassCard>
        )}

        {error && (
          <GlassCard className="border-destructive/20 bg-destructive/5 p-3 flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-destructive font-medium text-sm">{error}</p>
          </GlassCard>
        )}

        {/* Profile Card Header - Compact */}
        <div className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white h-24 flex items-center">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-md font-bold">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
              <div className="flex items-center gap-2 mt-1 text-blue-100/90 text-xs">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20 px-1.5 py-0 h-5 font-normal">{profile.positionName || 'No Position'}</Badge>
                <span>•</span>
                <span>{profile.departmentName || 'No Department'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation - More Compact */}
          <div className="lg:w-60 flex-shrink-0">
            <GlassCard className="p-1 space-y-0.5 sticky top-6">
              <TabButton id="contact" label="Contact Info" icon={Phone} />
              <TabButton id="bio" label="Bio & Photo" icon={User} />
              <TabButton id="emergency" label="Emergency Contacts" icon={AlertTriangle} />
              <div className="h-px bg-border/50 my-1 mx-2" />
              <TabButton id="correction" label="Request Correction" icon={FileEdit} />
            </GlassCard>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">

            {/* CONTACT INFO TAB */}
            {activeTab === 'contact' && (
              <GlassCard className="p-5 md:p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Contact Information</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Updates are applied immediately.</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <form onSubmit={handleUpdateContactInfo} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputWithLabel
                      label="Mobile Phone"
                      icon={Phone}
                      type="tel"
                      value={contactInfo.mobilePhone}
                      onChange={(e: any) => setContactInfo({ ...contactInfo, mobilePhone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                    <InputWithLabel
                      label="Home Phone"
                      icon={Phone}
                      type="tel"
                      value={contactInfo.homePhone}
                      onChange={(e: any) => setContactInfo({ ...contactInfo, homePhone: e.target.value })}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>

                  <InputWithLabel
                    label="Personal Email"
                    icon={Mail}
                    type="email"
                    value={contactInfo.personalEmail}
                    onChange={(e: any) => setContactInfo({ ...contactInfo, personalEmail: e.target.value })}
                    placeholder="your.email@example.com"
                  />

                  <div className="pt-3 border-t border-border/50">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Address Details
                    </h4>
                    <div className="space-y-4">
                      <InputWithLabel
                        label="Street Address"
                        value={contactInfo.address.streetAddress}
                        onChange={(e: any) => setContactInfo({
                          ...contactInfo,
                          address: { ...contactInfo.address, streetAddress: e.target.value }
                        })}
                        placeholder="123 Main Street, Apt 4B"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputWithLabel
                          label="City"
                          value={contactInfo.address.city}
                          onChange={(e: any) => setContactInfo({
                            ...contactInfo,
                            address: { ...contactInfo.address, city: e.target.value }
                          })}
                          placeholder="New York"
                        />
                        <InputWithLabel
                          label="Country"
                          value={contactInfo.address.country}
                          onChange={(e: any) => setContactInfo({
                            ...contactInfo,
                            address: { ...contactInfo.address, country: e.target.value }
                          })}
                          placeholder="United States"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <LoadingButton type="submit" isLoading={saving} className="bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90">
                      <Save className="w-3.5 h-3.5 mr-2" />
                      Save Changes
                    </LoadingButton>
                  </div>
                </form>
              </GlassCard>
            )}

            {/* BIO TAB */}
            {activeTab === 'bio' && (
              <GlassCard className="p-5 md:p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Biography & Photo</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Personalize your profile.</p>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <User className="w-5 h-5 text-purple-500" />
                  </div>
                </div>

                <form onSubmit={handleUpdateBio} className="space-y-6">
                  {/* Profile Picture Upload - Smaller */}
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <Label className="text-sm font-semibold text-foreground mb-3 block">Profile Picture</Label>

                    <div className="flex flex-col md:flex-row gap-5 items-start">
                      <div className="flex-shrink-0 relative group">
                        <div className="w-24 h-24 rounded-full border-[3px] border-background shadow-md overflow-hidden bg-muted flex items-center justify-center ring-2 ring-border">
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
                            <User className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer pointer-events-none">
                          <Upload className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <div className="relative">
                            <input
                              type="file"
                              id="profile-picture-upload"
                              accept="image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert('Image size should be less than 2MB');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setBioInfo({ ...bioInfo, profilePictureUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <Button type="button" variant="outline" size="sm" className="pointer-events-none relative z-10 h-8 text-xs">
                              <Upload className="w-3 h-3 mr-2" /> Choose Photo
                            </Button>
                          </div>

                          {bioInfo.profilePictureUrl && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setBioInfo({ ...bioInfo, profilePictureUrl: '' })}
                            >
                              <Trash2 className="w-3 h-3 mr-2" /> Remove
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-sm">
                          Upload a professional photo (JPG, PNG, or GIF). Max size: 2MB. This will be visible to your team and manager.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-foreground">Biography</Label>
                    <Textarea
                      value={bioInfo.biography}
                      onChange={(e) => setBioInfo({ ...bioInfo, biography: e.target.value })}
                      placeholder="Tell us about yourself, your role, interests..."
                      rows={5}
                      className="bg-background/50 resize-y min-h-[100px] text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                      {bioInfo.biography.length} characters
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <LoadingButton type="submit" isLoading={saving} className="bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90">
                      <Save className="w-3.5 h-3.5 mr-2" />
                      Save Changes
                    </LoadingButton>
                  </div>
                </form>
              </GlassCard>
            )}

            {/* EMERGENCY CONTACTS TAB */}
            {activeTab === 'emergency' && (
              <div className="space-y-5">
                {!showContactForm ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <GlassCard className="p-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Emergency Contacts</h3>
                        <p className="text-xs text-muted-foreground">Manage your emergency contact details.</p>
                      </div>
                      <Button size="sm" onClick={() => {
                        setContactForm({ name: '', relationship: '', phone: '', email: '', isPrimary: false });
                        setEditingContactIndex(null);
                        setShowContactForm(true);
                      }} className="shadow-sm shadow-primary/20 h-8 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add Contact
                      </Button>
                    </GlassCard>

                    {emergencyContacts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/5">
                        <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h4 className="text-base font-medium text-foreground">No Contacts Yet</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-4 max-w-xs">
                          It's important to have emergency contacts on file.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setShowContactForm(true)}>
                          Add Your First Contact
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {emergencyContacts.map((contact, index) => (
                          <GlassCard key={index} className={`p-4 relative group transition-all duration-300 ${contact.isPrimary ? 'border-l-[3px] border-l-rose-500 bg-rose-500/5' : 'hover:border-primary/50'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-base text-foreground">{contact.name}</h4>
                                  {contact.isPrimary && (
                                    <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0 h-4">Primary</Badge>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">{contact.relationship}</p>

                                <div className="flex flex-wrap gap-3 text-xs text-foreground/80">
                                  <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                    <Phone className="w-3 h-3 text-primary" /> {contact.phone}
                                  </div>
                                  {contact.email && (
                                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                      <Mail className="w-3 h-3 text-primary" /> {contact.email}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" onClick={() => startEditContact(index)} className="h-8 w-8 p-0">
                                  <FileEdit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteEmergencyContact(index)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </GlassCard>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <GlassCard className="p-5 md:p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-5 border-b border-border/50 pb-3">
                      <h3 className="text-base font-bold text-foreground">
                        {editingContactIndex !== null ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                      </h3>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowContactForm(false)}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>

                    <form onSubmit={handleSaveEmergencyContact} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputWithLabel
                          label="Full Name"
                          icon={User}
                          value={contactForm.name}
                          onChange={(e: any) => setContactForm({ ...contactForm, name: e.target.value })}
                          required
                          placeholder="e.g. John Doe"
                        />
                        <InputWithLabel
                          label="Relationship"
                          icon={User}
                          value={contactForm.relationship}
                          onChange={(e: any) => setContactForm({ ...contactForm, relationship: e.target.value })}
                          required
                          placeholder="e.g. Spouse"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InputWithLabel
                          label="Phone Number"
                          icon={Phone}
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e: any) => setContactForm({ ...contactForm, phone: e.target.value })}
                          required
                          placeholder="+1 (555) 000-0000"
                        />
                        <InputWithLabel
                          label="Email (Optional)"
                          icon={Mail}
                          type="email"
                          value={contactForm.email}
                          onChange={(e: any) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="john@example.com"
                        />
                      </div>

                      <div className="flex items-center gap-2.5 p-3 bg-muted/40 rounded-lg border border-border/50 cursor-pointer" onClick={() => setContactForm({ ...contactForm, isPrimary: !contactForm.isPrimary })}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${contactForm.isPrimary ? 'bg-primary border-primary' : 'border-muted-foreground bg-background'}`}>
                          {contactForm.isPrimary && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-xs font-medium text-foreground select-none">
                          Set as Primary Emergency Contact
                        </span>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowContactForm(false)}>
                          Cancel
                        </Button>
                        <LoadingButton type="submit" isLoading={saving} className="bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                          {editingContactIndex !== null ? 'Update Contact' : 'Add Contact'}
                        </LoadingButton>
                      </div>
                    </form>
                  </GlassCard>
                )}
              </div>
            )}

            {/* CORRECTION REQUEST TAB */}
            {activeTab === 'correction' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <GlassCard className="p-4 bg-blue-500/5 border-blue-500/20">
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg h-fit">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-0.5">About Profile Corrections</h4>
                      <p className="text-xs text-blue-800/80 dark:text-blue-300/80 text-justify leading-relaxed">
                        Use this form to request changes to critical profile data such as name, date of birth,
                        national ID, or employment details. These requests require HR approval before being applied.
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 md:p-6">
                  <h3 className="text-base font-bold text-foreground mb-5">Request Profile Correction</h3>

                  <form onSubmit={handleSubmitCorrectionRequest} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <FileEdit className="w-3.5 h-3.5 text-primary" />
                        Correction Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        value={correctionRequest.requestDescription}
                        onChange={(e) => setCorrectionRequest({ ...correctionRequest, requestDescription: e.target.value })}
                        placeholder="Describe what needs to be corrected and what the correct information should be..."
                        rows={4}
                        required
                        className="bg-background/50 resize-y min-h-[100px] text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">Reason (Optional)</Label>
                      <Textarea
                        value={correctionRequest.reason}
                        onChange={(e) => setCorrectionRequest({ ...correctionRequest, reason: e.target.value })}
                        placeholder="Provide additional context..."
                        rows={2}
                        className="bg-background/50 resize-y text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCorrectionRequest({ requestDescription: '', reason: '' })}
                      >
                        Clear Form
                      </Button>
                      <LoadingButton type="submit" isLoading={saving} className="bg-primary text-primary-foreground shadow-md shadow-primary/20">
                        Submit Request
                      </LoadingButton>
                    </div>
                  </form>
                </GlassCard>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
