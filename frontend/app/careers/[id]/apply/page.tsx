'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJobById, applyToJob, createCandidate, uploadDocument } from '@/app/services/recruitment';
import { JobRequisition } from '@/app/types/recruitment';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { GlassCard } from '@/app/components/ui/glass-card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { LandingNavbar } from '@/app/components/landing/navbar';
import { LandingFooter } from '@/app/components/landing/footer';
import ConsentCheckbox from '@/app/components/recruitment/compliance/ConsentCheckbox';
import GdprTooltip from '@/app/components/recruitment/compliance/GdprTooltip';
import DataUsageNotice from '@/app/components/recruitment/compliance/DataUsageNotice';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Upload,
  Building2,
  MapPin
} from 'lucide-react';

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedInUrl: '',
    portfolioUrl: '',
    cvFile: null as File | null,
    dataProcessingConsent: false,
    backgroundCheckConsent: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const data = await getJobById(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.cvFile) errors.cvFile = 'CV/Resume is required';
    
    if (!formData.dataProcessingConsent) {
      errors.dataProcessingConsent = 'You must consent to data processing to apply (GDPR requirement)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors({ ...formErrors, cvFile: 'Only PDF and Word documents are allowed' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({ ...formErrors, cvFile: 'File size must be less than 5MB' });
        return;
      }
      setFormData({ ...formData, cvFile: file });
      setFormErrors({ ...formErrors, cvFile: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);

      const candidateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        linkedInUrl: formData.linkedInUrl || undefined,
        portfolioUrl: formData.portfolioUrl || undefined,
        source: 'career_site',
      };
      const candidate = await createCandidate(candidateData);

      const cvFormData = new FormData();
      cvFormData.append('file', formData.cvFile!);
      cvFormData.append('ownerId', candidate._id || candidate.id);
      cvFormData.append('type', 'cv');
      const uploadedDoc = await uploadDocument(cvFormData);

      await applyToJob({
        candidateId: candidate._id || candidate.id,
        requisitionId: jobId,
        cvFilePath: (uploadedDoc as any).filePath || (uploadedDoc as any).url || uploadedDoc.fileUrl,
        coverLetter: formData.coverLetter || undefined,
        dataProcessingConsent: formData.dataProcessingConsent,
        backgroundCheckConsent: formData.backgroundCheckConsent,
      });

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/careers');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-lg text-muted-foreground">Loading application form...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <GlassCard variant="strong" className="p-12 text-center max-w-2xl mx-auto border-destructive/20 bg-destructive/5">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-lg mb-6">Job not found</p>
            <Button asChild variant="outline">
              <Link href="/careers">Back to Careers</Link>
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassCard variant="strong" className="p-12 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for applying for {job.title}. We'll review your application and get back to you soon.
          </p>
          <Button asChild>
            <Link href="/careers">Back to Careers</Link>
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNavbar />
      
      <main className="flex-1">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href={`/careers/${jobId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Job Details
            </Link>
          </Button>
        </div>

        {/* Job Info Card */}
        <GlassCard variant="strong" className="p-6 mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Apply for {job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {job.department && (
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {job.department}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
            )}
          </div>
        </GlassCard>

        {/* Error Message */}
        {error && (
          <GlassCard variant="strong" className="p-6 mb-6 border-destructive/20 bg-destructive/5">
            <p className="text-destructive">{error}</p>
          </GlassCard>
        )}

        {/* Application Form */}
        <GlassCard variant="strong" className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">Personal Information</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={formErrors.firstName ? 'border-destructive' : ''}
                />
                {formErrors.firstName && (
                  <p className="text-destructive text-sm">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={formErrors.lastName ? 'border-destructive' : ''}
                />
                {formErrors.lastName && (
                  <p className="text-destructive text-sm">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-destructive text-sm">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={formErrors.phone ? 'border-destructive' : ''}
                />
                {formErrors.phone && (
                  <p className="text-destructive text-sm">{formErrors.phone}</p>
                )}
              </div>
            </div>

            {/* Additional Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="linkedInUrl">LinkedIn Profile (Optional)</Label>
                <Input
                  id="linkedInUrl"
                  type="url"
                  value={formData.linkedInUrl}
                  onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolioUrl">Portfolio URL (Optional)</Label>
                <Input
                  id="portfolioUrl"
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>

            {/* CV Upload */}
            <div className="space-y-2">
              <Label htmlFor="cvFile">
                Resume/CV <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="cvFile"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className={formErrors.cvFile ? 'border-destructive' : ''}
                />
                {formData.cvFile && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {formData.cvFile.name}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">PDF or Word document, max 5MB</p>
              {formErrors.cvFile && (
                <p className="text-destructive text-sm">{formErrors.cvFile}</p>
              )}
            </div>

            {/* Cover Letter */}
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
              <Textarea
                id="coverLetter"
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                rows={6}
                placeholder="Tell us why you're a great fit for this role..."
                className="resize-none"
              />
            </div>

            {/* GDPR Consent */}
            <GlassCard variant="hover" className="p-6 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-foreground">Data Processing Consent</h3>
                <GdprTooltip>
                  <button type="button" className="text-primary hover:text-primary/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </GdprTooltip>
              </div>
              
              <DataUsageNotice className="mb-4" />
              
              <ConsentCheckbox
                checked={formData.dataProcessingConsent}
                onChange={(checked) => setFormData({ ...formData, dataProcessingConsent: checked })}
                required={true}
                error={!!formErrors.dataProcessingConsent}
                errorMessage={formErrors.dataProcessingConsent}
                id="dataConsent"
                name="dataProcessingConsent"
                className="mb-4"
              />

              <div className="flex items-start mt-4 pt-4 border-t border-border/50">
                <input
                  type="checkbox"
                  id="backgroundConsent"
                  checked={formData.backgroundCheckConsent}
                  onChange={(e) => setFormData({ ...formData, backgroundCheckConsent: e.target.checked })}
                  className="mt-1 mr-3 h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="backgroundConsent" className="text-sm text-muted-foreground">
                  I consent to background checks if required for this position. <span className="text-muted-foreground/70">(Optional)</span>
                </label>
              </div>
            </GlassCard>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                asChild
                className="flex-1"
                disabled={submitting}
              >
                <Link href={`/careers/${jobId}`}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}
