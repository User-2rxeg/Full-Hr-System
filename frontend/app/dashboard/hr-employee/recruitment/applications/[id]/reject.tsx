'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { getApplicationById, rejectApplication, sendRejectionNotification, getEmailTemplates } from '@/app/services/recruitment';

// =====================================================
// Types
// =====================================================

interface CandidateInfo {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  appliedDate: string;
  currentStage: string;
}

interface RejectionReason {
  id: string;
  label: string;
  description: string;
}

interface RejectionTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// =====================================================
// Static Data
// =====================================================

const rejectionReasons: RejectionReason[] = [
  {
    id: 'not_qualified',
    label: 'Not Qualified',
    description: 'Candidate does not meet the minimum qualifications for the position.',
  },
  {
    id: 'lack_experience',
    label: 'Insufficient Experience',
    description: 'Candidate lacks the required years or type of experience.',
  },
  {
    id: 'poor_interview',
    label: 'Interview Performance',
    description: 'Candidate did not perform well during the interview process.',
  },
  {
    id: 'cultural_fit',
    label: 'Cultural Fit',
    description: 'Candidate may not align with company culture and values.',
  },
  {
    id: 'better_candidate',
    label: 'Position Filled',
    description: 'Another candidate was selected for this position.',
  },
  {
    id: 'salary_mismatch',
    label: 'Salary Expectations',
    description: 'Candidate\'s salary expectations exceed the budgeted range.',
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Other reason not listed above.',
  },
];

const rejectionTemplates: RejectionTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Rejection',
    subject: 'Update on Your Application - {jobTitle}',
    body: `Dear {candidateName},

Thank you for taking the time to apply for the {jobTitle} position at {companyName} and for your interest in joining our team.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate the effort you put into your application and wish you the best in your job search and future endeavors.

Best regards,
{senderName}
Human Resources
{companyName}`,
  },
  {
    id: 'interview_rejection',
    name: 'Post-Interview Rejection',
    subject: 'Application Update - {jobTitle} Position',
    body: `Dear {candidateName},

Thank you for meeting with us regarding the {jobTitle} position. We enjoyed learning about your background and experience.

After thorough evaluation, we have decided to proceed with other candidates for this role. This was a difficult decision given the quality of applicants we received.

We encourage you to apply for future openings that match your skills and experience. We will keep your information on file for consideration.

We wish you continued success in your career.

Best regards,
{senderName}
Human Resources
{companyName}`,
  },
  {
    id: 'position_filled',
    name: 'Position Filled',
    subject: 'Application Status - {jobTitle}',
    body: `Dear {candidateName},

Thank you for your interest in the {jobTitle} position at {companyName}.

We wanted to let you know that this position has been filled. However, we were impressed with your qualifications and would like to keep your resume on file for future opportunities that may be a better fit.

Thank you again for considering {companyName}, and we wish you the best in your career pursuits.

Warm regards,
{senderName}
Human Resources
{companyName}`,
  },
];

// =====================================================
// Components
// =====================================================

function EmailPreview({
  template,
  candidate,
  customMessage,
}: {
  template: RejectionTemplate | null;
  candidate: CandidateInfo;
  customMessage: string;
}) {
  if (!template) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500">
        Select a template to preview the email.
      </div>
    );
  }

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{candidateName}/g, candidate.candidateName)
      .replace(/{jobTitle}/g, candidate.jobTitle)
      .replace(/{companyName}/g, 'TechCorp Solutions')
      .replace(/{senderName}/g, 'HR Team');
  };

  const subject = replacePlaceholders(template.subject);
  const body = customMessage || replacePlaceholders(template.body);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Email Header */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-slate-500">To:</span>
          <span className="text-sm font-medium text-slate-900">{candidate.candidateEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Subject:</span>
          <span className="text-sm font-medium text-slate-900">{subject}</span>
        </div>
      </div>
      
      {/* Email Body */}
      <div className="p-6">
        <div className="whitespace-pre-line text-slate-700 text-sm leading-relaxed">
          {body}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function RejectApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('standard');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load candidate data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const appData = await getApplicationById(resolvedParams.id);
      
      const candidateInfo: CandidateInfo = {
        id: appData.candidateId || appData.id,
        applicationId: `APP-${appData.id}`,
        candidateName: appData.candidateName || 'Unknown',
        candidateEmail: appData.candidateEmail || '',
        jobTitle: appData.jobTitle || '',
        departmentName: appData.departmentName || '',
        appliedDate: appData.createdAt || '',
        currentStage: appData.currentStage || 'Unknown',
      };
      
      setCandidate(candidateInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application data');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate form (BR-36, BR-37)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedReason) {
      newErrors.reason = 'Please select a rejection reason';
    }

    if (!selectedTemplate) {
      newErrors.template = 'Please select an email template';
    }

    if (useCustomMessage && !customMessage.trim()) {
      newErrors.customMessage = 'Custom message cannot be empty';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle confirm click
  const handleConfirmClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // Send rejection (BR-36, BR-37, REC-022)
  const handleSendRejection = async () => {
    try {
      setSending(true);
      setError(null);
      
      const reasonLabel = rejectionReasons.find(r => r.id === selectedReason)?.label || selectedReason;
      const reason = `${reasonLabel}${internalNotes ? ` - Notes: ${internalNotes}` : ''}`;
      
      // First, reject the application to update status
      await rejectApplication(resolvedParams.id, reason);
      
      // Then send the rejection notification email (REC-022)
      await sendRejectionNotification({
        applicationId: resolvedParams.id,
           candidateEmail: candidate?.candidateEmail || '',
           rejectionReason: reasonLabel,
        templateId: useCustomMessage ? undefined : selectedTemplate,
        customMessage: useCustomMessage ? customMessage : undefined,
      });
      
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send rejection');
      setShowConfirmation(false);
    } finally {
      setSending(false);
    }
  };

  const selectedReasonData = rejectionReasons.find((r) => r.id === selectedReason);
  const selectedTemplateData = rejectionTemplates.find((t) => t.id === selectedTemplate);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Application not found.</p>
        <Link href="/dashboard/hr-employee/recruitment/applications">
          <Button variant="default" className="mt-4">
            Back to Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  // Success Screen
  if (sent) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Rejection Sent</h2>
          <p className="text-slate-600 mb-6">
            The rejection notification has been sent to {candidate.candidateName}.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-slate-900 mb-2">Summary</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li><strong>Candidate:</strong> {candidate.candidateName}</li>
              <li><strong>Position:</strong> {candidate.jobTitle}</li>
              <li><strong>Reason:</strong> {selectedReasonData?.label}</li>
              <li><strong>Template:</strong> {selectedTemplateData?.name}</li>
              <li><strong>Sent:</strong> {new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            This action has been logged in the candidate's communication history (BR-37).
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard/hr-employee/recruitment/applications">
              <Button variant="outline">Back to Pipeline</Button>
            </Link>
            <Link href={`/dashboard/hr-employee/recruitment/applications/${candidate.applicationId}`}>
              <Button variant="default">View Application</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/hr-employee/recruitment/applications/${resolvedParams.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Application
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Reject Application</h1>
        <p className="text-slate-600 mt-1">
          Send an automated rejection notification to the candidate (BR-36)
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="font-medium text-red-800">This action cannot be undone</p>
          <p className="text-sm text-red-700 mt-1">
            Rejecting this application will send a notification to the candidate and update their application status.
          </p>
        </div>
      </div>

      {/* Candidate Info */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-bold text-xl">
              {candidate.candidateName.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{candidate.candidateName}</h2>
            <p className="text-slate-600">{candidate.jobTitle} • {candidate.departmentName}</p>
            <p className="text-sm text-slate-500">
              Applied: {new Date(candidate.appliedDate).toLocaleDateString()} • Stage: {candidate.currentStage}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Rejection Reason */}
          <Card>
            <p className="text-sm text-slate-600 mb-4">
              Select the primary reason for rejecting this application.
            </p>
            <div className="space-y-2">
              {rejectionReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedReason === reason.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">{reason.label}</p>
                  <p className="text-sm text-slate-500">{reason.description}</p>
                </button>
              ))}
            </div>
            {errors.reason && (
              <p className="text-red-600 text-sm mt-2">{errors.reason}</p>
            )}
          </Card>

          {/* Email Template */}
          <Card>
            <div className="space-y-3">
              {rejectionTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setUseCustomMessage(false);
                  }}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedTemplate === template.id && !useCustomMessage
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">{template.name}</p>
                  <p className="text-sm text-slate-500 truncate">{template.subject}</p>
                </button>
              ))}
            </div>
            {errors.template && (
              <p className="text-red-600 text-sm mt-2">{errors.template}</p>
            )}

            {/* Custom Message Option */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCustomMessage}
                  onChange={(e) => setUseCustomMessage(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Use custom message</span>
              </label>
              {useCustomMessage && (
                <div className="mt-3">
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={8}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                      errors.customMessage ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'
                    }`}
                    placeholder="Enter your custom rejection message..."
                  />
                  {errors.customMessage && (
                    <p className="text-red-600 text-sm mt-1">{errors.customMessage}</p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Internal Notes */}
          <Card>
            <p className="text-sm text-slate-600 mb-3">
              Add notes for internal records. These will not be shared with the candidate.
            </p>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add any internal notes about this rejection..."
            />
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <EmailPreview
              template={selectedTemplateData || null}
              candidate={candidate}
              customMessage={useCustomMessage ? customMessage : ''}
            />
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200">
        <Link href={`/dashboard/hr-employee/recruitment/applications/${resolvedParams.id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="destructive" onClick={handleConfirmClick}>
          Send Rejection
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                Confirm Rejection
              </h3>
              <p className="text-slate-600 text-center mb-6">
                Are you sure you want to send a rejection email to <strong>{candidate.candidateName}</strong>? 
                This action will be logged in the communication history.
              </p>
              <div className="bg-slate-50 rounded-lg p-3 mb-6 text-sm">
                <p><strong>Reason:</strong> {selectedReasonData?.label}</p>
                <p><strong>Template:</strong> {useCustomMessage ? 'Custom Message' : selectedTemplateData?.name}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowConfirmation(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleSendRejection}
                  disabled={sending}
                >
                  Confirm & Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
