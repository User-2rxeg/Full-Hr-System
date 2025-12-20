'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getJobById, applyToJob, uploadDocument, getJobTemplateById, type PublicApplicationRequest } from '@/app/services/recruitment';
import { authService } from '@/app/services/auth';

// =====================================================
// TypeScript Interfaces
// =====================================================

interface JobDetails {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
  qualifications: string[];
  responsibilities: string[];
  openings: number;
  postedDate: string;
  expiryDate?: string;
}

interface ApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string; // Required for candidate registration
  password: string; // Required for candidate account creation
  cvFile: File | null;
  coverLetter: string;
  consentGiven: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  password?: string;
  cvFile?: string;
  consent?: string;
}

// =====================================================
// Utility Functions
// =====================================================

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateFile = (file: File): string | null => {
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return 'Please upload a PDF or DOC/DOCX file';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 5MB';
  }
  return null;
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// =====================================================
// Icons
// =====================================================

const BriefcaseIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LocationIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BuildingIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UploadIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const DocumentIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowLeftIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// =====================================================
// Loading Spinner Component
// =====================================================

const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
    />
  );
};

// =====================================================
// Main Component
// =====================================================

export default function JobApplyPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobId = params.jobId as string;

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState<ApplicationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationalId: '',
    password: '',
    cvFile: null,
    coverLetter: '',
    consentGiven: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Load job details from API
  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch job requisition
      const jobData = await getJobById(jobId);
      
      // Try to fetch template details if templateId exists
      let templateData = null;
      if (jobData.templateId) {
        try {
          templateData = await getJobTemplateById(jobData.templateId);
        } catch {
          // Template fetch failed, use denormalized data from requisition
          console.warn('Could not fetch template details, using requisition data');
        }
      }
      
      // Transform API response to local interface
      // Priority: template data > denormalized requisition data > defaults
      const jobDetails: JobDetails = {
        id: jobData.requisitionId || jobData.id,
        title: templateData?.title || jobData.templateTitle || 'Job Opening',
        department: templateData?.department || 'Department',
        location: jobData.location || 'Location TBD',
        description: templateData?.description || 'No description available',
        requirements: templateData?.skills || [],
        qualifications: templateData?.qualifications || [],
        responsibilities: [],
        openings: jobData.openings || 1,
        postedDate: jobData.postingDate || jobData.createdAt || '',
        expiryDate: jobData.expiryDate,
      };
      
      setJob(jobDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId, loadJob]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.nationalId.trim()) {
      newErrors.nationalId = 'National ID is required for registration';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required to create your account';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.cvFile) {
      newErrors.cvFile = 'CV/Resume is required (BR-12)';
    }

    if (!formData.consentGiven) {
      newErrors.consent = 'You must consent to data processing to apply (BR-28)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid for enabling submit button
  const isFormValid = (): boolean => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      validateEmail(formData.email) &&
      validatePhone(formData.phone) &&
      formData.nationalId.trim() !== '' &&
      formData.password.length >= 6 &&
      formData.cvFile !== null &&
      formData.consentGiven
    );
  };

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const fileError = validateFile(file);
    if (fileError) {
      setErrors(prev => ({ ...prev, cvFile: fileError }));
      return;
    }

    setFormData(prev => ({ ...prev, cvFile: file }));
    setErrors(prev => ({ ...prev, cvFile: undefined }));
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, cvFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      nationalId: true,
      password: true,
      cvFile: true,
      consent: true,
    });

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Step 1: Register candidate to get candidateId
      // POST /auth/register-candidate
      const registerResponse = await authService.registerCandidate({
        firstName: formData.firstName,
        lastName: formData.lastName,
        nationalId: formData.nationalId,
        personalEmail: formData.email,
        password: formData.password,
        mobilePhone: formData.phone,
      });

      if (registerResponse.error || !registerResponse.data?.candidateId) {
        throw new Error(registerResponse.error || 'Failed to create candidate profile');
      }

      const candidateId = registerResponse.data.candidateId;

      // Step 2: Upload CV document (if upload service available)
      // For now, generate a placeholder path since file upload may require cloud storage
      let cvFilePath = `/uploads/cv/${candidateId}/${formData.cvFile!.name}`;
      
      // Try to upload the document if the endpoint exists
      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.cvFile!);
        uploadFormData.append('ownerId', candidateId);
        uploadFormData.append('documentType', 'cv');
        
        const uploadResult = await uploadDocument(uploadFormData);
        if (uploadResult?.fileUrl) {
          cvFilePath = uploadResult.fileUrl;
        }
      } catch (uploadErr) {
        // If upload fails, continue with placeholder path
        // The backend may handle this or it can be uploaded later
        console.warn('CV upload not available, using placeholder path');
      }

      // Step 3: Submit application with candidateId and cvFilePath
      // POST /recruitment/applications (matches CreateApplicationDto)
      const applicationPayload: PublicApplicationRequest = {
        candidateId: candidateId,
        requisitionId: job!.id, // Use the job's requisitionId
        cvFilePath: cvFilePath,
        coverLetter: formData.coverLetter || undefined,
        dataProcessingConsent: formData.consentGiven, // BR-28: GDPR consent
        backgroundCheckConsent: formData.consentGiven, // Optional consent
      };

      const result = await applyToJob(applicationPayload);

      setSubmitSuccess(true);
      setApplicationId(result.id || `APP-${Date.now()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      setError(errorMessage);
      
      // Provide user-friendly error messages
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        setErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists. Please login to apply.',
        }));
      } else if (errorMessage.includes('already applied')) {
        setErrors(prev => ({
          ...prev,
          consent: 'You have already applied for this position.',
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Job not found
  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-6">
            The job you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/portal/jobs" className="btn-primary inline-block">
            Browse All Jobs
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card text-center max-w-lg">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Application Submitted Successfully!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for applying to <strong>{job.title}</strong>. We&apos;ve received your
            application and will review it shortly.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600">
              Application Reference: <strong className="text-slate-900">{applicationId}</strong>
            </p>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            You will receive email updates about your application status. Check your inbox
            (and spam folder) for notifications.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal/jobs" className="btn-secondary">
              Browse More Jobs
            </Link>
            <Link href="/dashboard/job-candidate" className="btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href={`/portal/jobs/${jobId}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Job Details</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Job Summary - Sticky Sidebar */}
          <aside className="lg:col-span-2">
            <div className="card sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">{job.title}</h2>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <BuildingIcon className="w-5 h-5 text-slate-400" />
                  <span>{job.department}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <LocationIcon className="w-5 h-5 text-slate-400" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <BriefcaseIcon className="w-5 h-5 text-slate-400" />
                  <span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{job.description}</p>
              </div>

              {job.requirements.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Requirements</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-indigo-500 mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>

          {/* Application Form */}
          <div className="lg:col-span-3">
            <div className="card">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Apply for this Position</h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="subsection-title">Personal Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="firstName" className="form-label">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('firstName')}
                        className={`form-input ${
                          touched.firstName && errors.firstName ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your first name"
                      />
                      {touched.firstName && errors.firstName && (
                        <p className="form-error">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName" className="form-label">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('lastName')}
                        className={`form-input ${
                          touched.lastName && errors.lastName ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your last name"
                      />
                      {touched.lastName && errors.lastName && (
                        <p className="form-error">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('email')}
                        className={`form-input ${
                          touched.email && errors.email ? 'border-red-500' : ''
                        }`}
                        placeholder="your.email@example.com"
                      />
                      {touched.email && errors.email && (
                        <p className="form-error">{errors.email}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('phone')}
                        className={`form-input ${
                          touched.phone && errors.phone ? 'border-red-500' : ''
                        }`}
                        placeholder="+20 123 456 7890"
                      />
                      {touched.phone && errors.phone && (
                        <p className="form-error">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Account Creation Fields */}
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div className="form-group">
                      <label htmlFor="nationalId" className="form-label">
                        National ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="nationalId"
                        name="nationalId"
                        value={formData.nationalId}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('nationalId')}
                        className={`form-input ${
                          touched.nationalId && errors.nationalId ? 'border-red-500' : ''
                        }`}
                        placeholder="Enter your national ID"
                      />
                      {touched.nationalId && errors.nationalId && (
                        <p className="form-error">{errors.nationalId}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        Required to create your candidate account
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="password" className="form-label">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur('password')}
                        className={`form-input ${
                          touched.password && errors.password ? 'border-red-500' : ''
                        }`}
                        placeholder="Create a password (min 6 characters)"
                      />
                      {touched.password && errors.password && (
                        <p className="form-error">{errors.password}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        You&apos;ll use this to track your application status
                      </p>
                    </div>
                  </div>
                </div>

                {/* CV Upload Section */}
                <div>
                  <h3 className="subsection-title">
                    CV / Resume <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Upload your CV in PDF or DOC/DOCX format (max 5MB)
                  </p>

                  {!formData.cvFile ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : errors.cvFile && touched.cvFile
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                      />

                      <UploadIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 font-medium mb-2">
                        Drag and drop your CV here
                      </p>
                      <p className="text-sm text-slate-500 mb-4">or</p>
                      <button
                        type="button"
                        onClick={handleFileSelect}
                        className="btn-secondary"
                      >
                        Browse Files
                      </button>
                      <p className="text-xs text-slate-400 mt-3">
                        Accepted formats: PDF, DOC, DOCX
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <DocumentIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{formData.cvFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(formData.cvFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {touched.cvFile && errors.cvFile && (
                    <p className="form-error mt-2">{errors.cvFile}</p>
                  )}
                </div>

                {/* Cover Letter (Optional) */}
                <div>
                  <h3 className="subsection-title">Cover Letter (Optional)</h3>
                  <textarea
                    name="coverLetter"
                    value={formData.coverLetter}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-input resize-none"
                    placeholder="Tell us why you're interested in this position and what makes you a great fit..."
                  />
                </div>

                {/* GDPR Consent Section - BR-28 & NFR-33 */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="subsection-title flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Data Processing Consent
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="consentGiven"
                        checked={formData.consentGiven}
                        onChange={handleInputChange}
                        className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">
                        I consent to the processing of my personal data for recruitment purposes.
                        I understand that my data will be stored securely and used only for
                        evaluating my application. <span className="text-red-500">*</span>
                      </span>
                    </label>

                    {errors.consent && (
                      <div className="alert-error text-sm">
                        <p>{errors.consent}</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-500">
                      By submitting this application, you agree to our{' '}
                      <a href="#" className="text-indigo-600 hover:underline">
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-indigo-600 hover:underline">
                        Terms of Service
                      </a>
                      . Your data is handled in compliance with GDPR and local labor laws (NFR-33).
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={!isFormValid() || submitting}
                    className={`btn-primary w-full flex items-center justify-center gap-2 ${
                      !isFormValid() || submitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {submitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>

                  {!isFormValid() && (
                    <p className="text-center text-sm text-slate-500 mt-3">
                      Please complete all required fields and accept the consent to submit.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>© 2025 HRMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
