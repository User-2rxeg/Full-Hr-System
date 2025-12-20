// =====================================================
// Recruitment Services - Axios-based API Layer
// =====================================================

import api from '../api';
import {
  JobTemplate,
  ProcessTemplate,
  HiringStage,
  JobRequisition,
  CreateJobRequisitionRequest,
  Application,
  CreateApplicationRequest,
  UpdateApplicationStatusRequest,
  Interview,
  CreateInterviewRequest,
  AssessmentResult,
  SubmitAssessmentRequest,
  SubmitFeedbackRequest,
  FeedbackResult,
  JobOffer,
  CreateJobOfferRequest,
  RecruitmentStats,
  RecruitmentPipeline,
  Candidate,
  RecruitmentDocument,
  RecruitmentNotification,
  AuditLog,
  AnalyticsSummary,
  Referral,
} from '@/app/types/recruitment';
import { ApplicationStage } from '@/app/types/enums';

// =====================================================
// Helper Functions
// =====================================================

/**
 * Helper to extract MongoDB ID from various formats
 * Handles string IDs, ObjectId objects, and Extended JSON format
 */
function extractId(obj: any): string {
  if (!obj) return '';
  // Check for id field first (already a string)
  if (obj.id && typeof obj.id === 'string') return obj.id;
  // Handle _id which could be a string, object with $oid, or ObjectId-like object
  const rawId = obj._id;
  if (!rawId) return '';
  if (typeof rawId === 'string') return rawId;
  // MongoDB Extended JSON format: { "$oid": "..." }
  if (rawId.$oid) return rawId.$oid;
  // ObjectId with toString method
  if (typeof rawId.toString === 'function') return rawId.toString();
  // Fallback
  return String(rawId);
}

/**
 * Helper to extract a single ID value from various formats
 */
function extractIdValue(idValue: any): string {
  if (!idValue) return '';
  if (typeof idValue === 'string') return idValue;
  if (idValue.$oid) return idValue.$oid;
  if (idValue._id) return extractIdValue(idValue._id);
  if (typeof idValue.toString === 'function') return idValue.toString();
  return String(idValue);
}

// =====================================================
// Job Templates
// =====================================================

/**
 * Get all job templates
 */
export async function getJobTemplates(): Promise<JobTemplate[]> {
  const response = await api.get<JobTemplate[]>('/recruitment/job-templates');
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Get a job template by ID
 */
export async function getJobTemplateById(id: string): Promise<JobTemplate> {
  const response = await api.get<JobTemplate>(`/recruitment/job-templates/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Template not found');
  }
  return response.data;
}

/**
 * Create a new job template
 */
export async function createJobTemplate(data: {
  title: string;
  department: string;
  description?: string;
  qualifications: string[];
  skills: string[];
}): Promise<JobTemplate> {
  const response = await api.post<JobTemplate>('/recruitment/job-templates', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to create template');
  }
  return response.data;
}

/**
 * Update a job template
 */
export async function updateJobTemplate(id: string, data: {
  title?: string;
  department?: string;
  description?: string;
  qualifications?: string[];
  skills?: string[];
}): Promise<JobTemplate> {
  const response = await api.put<JobTemplate>(`/recruitment/job-templates/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update template');
  }
  return response.data;
}

/**
 * Delete a job template
 */
export async function deleteJobTemplate(id: string): Promise<void> {
  const response = await api.delete(`/recruitment/job-templates/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
}

// =====================================================
// Process Templates (Hiring Workflows)
// NOTE: Backend uses fixed ApplicationStage enum, NOT dynamic process templates
// These functions are DEPRECATED and will throw errors since the endpoints don't exist
// The hiring workflow is defined in backend: SCREENING -> DEPARTMENT_INTERVIEW -> HR_INTERVIEW -> OFFER
// =====================================================

/**
 * @deprecated Backend does not have process templates API.
 * Hiring stages are defined as ApplicationStage enum in backend.
 * See: src/modules/recruitment/enums/application-stage.enum.ts
 */
export async function getProcessTemplates(): Promise<ProcessTemplate[]> {
  // Backend uses fixed ApplicationStage enum, not dynamic templates
  // Throwing error to indicate this API doesn't exist
  throw new Error('Process templates are not supported. Hiring stages are defined in backend ApplicationStage enum.');
}

/**
 * @deprecated Backend does not have process templates API.
 */
export async function getProcessTemplateById(id: string): Promise<ProcessTemplate> {
  throw new Error('Process templates are not supported. Hiring stages are defined in backend ApplicationStage enum.');
}

/**
 * @deprecated Backend does not have process templates API.
 */
export async function createProcessTemplate(data: Omit<ProcessTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcessTemplate> {
  throw new Error('Process templates are not supported. Hiring stages are defined in backend ApplicationStage enum.');
}

/**
 * @deprecated Backend does not have process templates API.
 */
export async function updateProcessTemplate(id: string, data: Partial<ProcessTemplate>): Promise<ProcessTemplate> {
  throw new Error('Process templates are not supported. Hiring stages are defined in backend ApplicationStage enum.');
}

/**
 * @deprecated Backend does not have process templates API.
 */
export async function deleteProcessTemplate(id: string): Promise<void> {
  throw new Error('Process templates are not supported. Hiring stages are defined in backend ApplicationStage enum.');
}

// =====================================================
// Job Requisitions (Jobs)
// =====================================================

/**
 * Get all job requisitions
 */
export async function getJobs(filters?: { status?: string; managerId?: string }): Promise<JobRequisition[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.managerId) params.append('managerId', filters.managerId);

  const query = params.toString();
  const response = await api.get<JobRequisition[]>(`/recruitment/job-requisitions${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  // Transform _id to id if needed
  const jobs = response.data || [];
  return jobs.map(job => ({
    ...job,
    id: extractId(job)
  }));
}

/**
 * Get a job requisition by ID
 */
export async function getJobById(id: string): Promise<JobRequisition> {
  const response = await api.get<JobRequisition>(`/recruitment/job-requisitions/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Job requisition not found');
  }
  return response.data;
}

/**
 * Create a new job requisition
 */
export async function createJob(data: CreateJobRequisitionRequest): Promise<JobRequisition> {
  const response = await api.post<JobRequisition>('/recruitment/job-requisitions', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to create job requisition');
  }
  return response.data;
}

/**
 * Update a job requisition
 */
export async function updateJob(id: string, data: Partial<JobRequisition>): Promise<JobRequisition> {
  const response = await api.put<JobRequisition>(`/recruitment/job-requisitions/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update job requisition');
  }
  return response.data;
}

/**
 * Publish a job requisition
 * Backend expects: { publishStatus: 'draft' | 'published' | 'closed', postingDate?: string }
 */
export async function publishJob(id: string, publish: boolean = true): Promise<JobRequisition> {
  const payload = {
    publishStatus: publish ? 'published' : 'draft',
    postingDate: publish ? new Date().toISOString() : undefined,
  };
  const response = await api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}/publish`, payload);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to publish job requisition');
  }
  return response.data;
}

/**
 * Close a job requisition
 * Uses the publish endpoint with publishStatus: 'closed'
 */
export async function closeJob(id: string): Promise<JobRequisition> {
  const payload = {
    publishStatus: 'closed',
  };
  const response = await api.patch<JobRequisition>(`/recruitment/job-requisitions/${id}/publish`, payload);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to close job requisition');
  }
  return response.data;
}

/**
 * Get requisition progress
 */
export async function getRequisitionProgress(id: string): Promise<unknown> {
  const response = await api.get(`/recruitment/job-requisitions/${id}/progress`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

// =====================================================
// Applications
// =====================================================

/**
 * Get all applications with enriched candidate and job data
 */
export async function getApplications(filters?: {
  requisitionId?: string;
  status?: string;
  stage?: ApplicationStage;
  hrId?: string;
}): Promise<Application[]> {
  const params = new URLSearchParams();
  if (filters?.requisitionId) params.append('requisitionId', filters.requisitionId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.stage) params.append('stage', filters.stage);
  if (filters?.hrId) params.append('hrId', filters.hrId);

  const query = params.toString();

  // Fetch applications, candidates, and jobs in parallel
  const [appsResponse, candidatesResponse, jobsResponse] = await Promise.all([
    api.get<any[]>(`/recruitment/applications${query ? `?${query}` : ''}`),
    api.get<any[]>('/recruitment/candidates'),
    api.get<any[]>('/recruitment/job-requisitions'),
  ]);

  if (appsResponse.error) {
    throw new Error(appsResponse.error);
  }

  const apps = appsResponse.data || [];
  const candidates = candidatesResponse.data || [];
  const jobs = jobsResponse.data || [];

  // Create lookup maps
  const candidateMap: Record<string, any> = {};
  candidates.forEach(c => {
    const id = extractId(c);
    if (id) candidateMap[id] = c;
  });

  const jobMap: Record<string, any> = {};
  jobs.forEach(j => {
    const id = extractId(j);
    if (id) jobMap[id] = j;
  });

  // Enrich applications with candidate and job data
  return apps.map(app => {
    const appId = extractId(app);
    const candidateId = extractIdValue(app.candidateId);
    const requisitionId = extractIdValue(app.requisitionId);

    const candidate = candidateMap[candidateId];
    const job = jobMap[requisitionId];

    return {
      ...app,
      id: appId,
      candidateId,
      requisitionId,
      candidateName: candidate
        ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || candidate.email || 'Unknown'
        : 'Unknown Candidate',
      candidateEmail: candidate?.email || '',
      jobTitle: job?.title || job?.jobTitle || 'Unknown Position',
      departmentName: job?.department || '',
    };
  });
}

/**
 * Get an application by ID
 */
export async function getApplicationById(id: string): Promise<Application> {
  const response = await api.get<Application>(`/recruitment/applications/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Application not found');
  }
  const app = response.data;
  return {
    ...app,
    id: extractId(app)
  };
}

/**
 * Public application request payload
 * Matches backend CreateApplicationDto for public job applications (REC-007, REC-028)
 */
export interface PublicApplicationRequest {
  candidateId: string;
  requisitionId: string;
  cvFilePath: string;
  coverLetter?: string;
  dataProcessingConsent: boolean;
  backgroundCheckConsent?: boolean;
}

/**
 * Submit a public job application (REC-007 & REC-028)
 * This endpoint is @Public() - no auth required
 * Flow: First create/get candidate, upload CV, then submit application
 */
export async function applyToJob(applicationData: PublicApplicationRequest): Promise<Application> {
  // Validate GDPR consent before submission (BR-28)
  if (!applicationData.dataProcessingConsent) {
    throw new Error('Data processing consent is required to submit application (GDPR compliance)');
  }

  const response = await api.post<Application>('/recruitment/applications', applicationData);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to submit application');
  }
  return response.data;
}

/**
 * Create an application (internal use)
 */
export async function createApplication(data: CreateApplicationRequest): Promise<Application> {
  const response = await api.post<Application>('/recruitment/applications', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to create application');
  }
  return response.data;
}

/**
 * Assign HR to application
 */
export async function assignHrToApplication(id: string, hrId: string): Promise<Application> {
  const response = await api.patch<Application>(`/recruitment/applications/${id}/assign-hr`, { hrId });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to assign HR');
  }
  return response.data;
}

/**
 * Update application stage
 */
export async function updateApplicationStage(id: string, stage: ApplicationStage): Promise<Application> {
  const response = await api.patch<Application>(`/recruitment/applications/${id}/stage`, { stage });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update application stage');
  }
  return response.data;
}

/**
 * Update application status
 */
export async function updateApplicationStatus(id: string, data: UpdateApplicationStatusRequest): Promise<Application> {
  const response = await api.patch<Application>(`/recruitment/applications/${id}/status`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update application status');
  }
  return response.data;
}

/**
 * Reject an application
 */
export async function rejectApplication(id: string, reason?: string): Promise<Application> {
  try {
    const response = await api.patch<Application>(`/recruitment/applications/${id}/reject`, reason ? { reason } : {});
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reject application');
    }
    return response.data;
  } catch (error: any) {
    // Provide more specific error messages
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Invalid request. Application may already be rejected or hired.');
    }
    if (error.response?.status === 404) {
      throw new Error('Application not found');
    }
    throw error;
  }
}

/**
 * Get application history/timeline
 */
export async function getApplicationHistory(id: string): Promise<unknown[]> {
  const response = await api.get<unknown[]>(`/recruitment/applications/${id}/history`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}


/**
 * Get applications by candidate
 */
export async function getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
  const response = await api.get<Application[]>(`/recruitment/candidates/${candidateId}/applications`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Trigger pre-boarding
 */
export async function triggerPreboarding(applicationId: string): Promise<unknown> {
  const response = await api.post(`/recruitment/applications/${applicationId}/trigger-preboarding`, {});
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

// =====================================================
// Interviews
// =====================================================

/**
 * Transform interview from backend to frontend format
 * Handles MongoDB _id to id mapping and populated fields
 */
function transformInterview(interview: any): Interview {
  // Handle populated applicationId (could be object or string)
  const applicationId = extractIdValue(interview.applicationId);

  // Handle populated panel array (could contain objects or strings)
  const panel = Array.isArray(interview.panel)
    ? interview.panel.map((p: any) => extractIdValue(p))
    : [];

  // Extract full application data if populated
  const applicationData = typeof interview.applicationId === 'object' && interview.applicationId
    ? interview.applicationId
    : undefined;

  // Extract full panel data if populated
  const panelData = Array.isArray(interview.panel) && interview.panel.some((p: any) => typeof p === 'object')
    ? interview.panel
    : undefined;

  return {
    ...interview,
    id: extractId(interview),
    applicationId,
    panel,
    // Preserve full populated data for display
    applicationData,
    panelData,
  };
}

/**
 * Get all interviews
 */
export async function getInterviews(filters?: {
  applicationId?: string;
  interviewerId?: string;
  type?: string;
  status?: string;
  days?: number;
}): Promise<Interview[]> {
  const params = new URLSearchParams();
  if (filters?.applicationId) params.append('applicationId', filters.applicationId);
  if (filters?.interviewerId) params.append('interviewerId', filters.interviewerId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.days !== undefined) params.append('days', filters.days.toString());

  const query = params.toString();
  const response = await api.get<any[]>(`/recruitment/interviews${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformInterview);
}

/**
 * Get upcoming interviews (REC-010)
 * Backend: GET /recruitment/interviews with ?days param
 */
export async function getUpcomingInterviews(days: number = 7): Promise<Interview[]> {
  const response = await api.get<any[]>(`/recruitment/interviews?days=${days}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformInterview);
}

/**
 * Get interviews for a panelist/interviewer (REC-021)
 * Backend: GET /recruitment/interviews/panelist/:panelistId
 */
export async function getInterviewsByPanelist(panelistId: string): Promise<Interview[]> {
  const response = await api.get<any[]>(`/recruitment/interviews/panelist/${panelistId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformInterview);
}

/**
 * Get an interview by ID
 */
export async function getInterviewById(id: string): Promise<Interview> {
  const response = await api.get<any>(`/recruitment/interviews/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Interview not found');
  }
  return transformInterview(response.data);
}

/**
 * Schedule a new interview
 */
export async function scheduleInterview(data: CreateInterviewRequest): Promise<Interview> {
  // Ensure applicationId is a valid string (MongoDB ObjectId)
  const payload = {
    ...data,
    applicationId: extractIdValue(data.applicationId),
  };
  const response = await api.post<any>('/recruitment/interviews', payload);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to schedule interview');
  }
  return transformInterview(response.data);
}

/**
 * Update an interview
 */
export async function updateInterview(id: string, data: Partial<Interview>): Promise<Interview> {
  const response = await api.put<any>(`/recruitment/interviews/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update interview');
  }
  return transformInterview(response.data);
}

/**
 * Cancel an interview
 */
export async function cancelInterview(id: string, reason?: string): Promise<Interview> {
  const response = await api.patch<any>(`/recruitment/interviews/${id}/cancel`, { reason });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to cancel interview');
  }
  return transformInterview(response.data);
}

/**
 * Complete an interview
 */
export async function completeInterview(id: string): Promise<Interview> {
  const response = await api.patch<any>(`/recruitment/interviews/${id}/complete`, {});
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to complete interview');
  }
  return transformInterview(response.data);
}

/**
 * Reschedule an interview
 */
export async function rescheduleInterview(id: string, data: { scheduledAt: string; duration?: number; location?: string }): Promise<Interview> {
  const response = await api.patch<any>(`/recruitment/interviews/${id}/reschedule`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to reschedule interview');
  }
  return transformInterview(response.data);
}

// =====================================================
// Interview Feedback / Assessment
// =====================================================

/**
 * Submit interview feedback/assessment (REC-011)
 */
export async function submitInterviewFeedback(data: SubmitFeedbackRequest): Promise<FeedbackResult> {
  const response = await api.post<FeedbackResult>('/recruitment/feedback', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to submit feedback');
  }
  return response.data;
}

/**
 * Transform feedback/assessment result from backend to frontend format
 * Handles populated interviewerId and interviewId fields
 */
function transformFeedback(feedback: any): FeedbackResult {
  // Handle interviewId and interviewerId (may be objects or strings)
  const interviewId = extractIdValue(feedback.interviewId);
  const interviewerId = extractIdValue(feedback.interviewerId);

  return {
    ...feedback,
    id: extractId(feedback),
    interviewId,
    interviewerId,
    // Preserve full data if populated (backend doesn't populate these anymore, but keep for compatibility)
    interviewData: typeof feedback.interviewId === 'object' ? feedback.interviewId : undefined,
    interviewerData: typeof feedback.interviewerId === 'object' ? feedback.interviewerId : undefined,
  };
}

/**
 * Get feedback/assessment results for an interview (REC-011)
 * Backend: GET /recruitment/feedback/interview/:interviewId
 */
export async function getFeedbackByInterview(interviewId: string): Promise<FeedbackResult[]> {
  const response = await api.get<any[]>(`/recruitment/feedback/interview/${interviewId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformFeedback);
}

/**
 * Get assessment results for an interview
 * @deprecated Use getFeedbackByInterview instead
 */
export async function getAssessmentResults(interviewId: string): Promise<AssessmentResult[]> {
  const response = await api.get<AssessmentResult[]>(`/recruitment/feedback/interview/${interviewId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Update an assessment
 */
export async function updateAssessment(id: string, data: Partial<SubmitAssessmentRequest>): Promise<AssessmentResult> {
  const response = await api.put<AssessmentResult>(`/recruitment/assessments/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update assessment');
  }
  return response.data;
}

// =====================================================
// Offers
// =====================================================

/**
 * Transform offer from backend to frontend format
 * Handles MongoDB _id to id mapping and populated fields
 */
function transformOffer(offer: any): JobOffer {
  // Handle populated applicationId, candidateId, hrEmployeeId
  const applicationId = extractIdValue(offer.applicationId);
  const candidateId = extractIdValue(offer.candidateId);
  const hrEmployeeId = extractIdValue(offer.hrEmployeeId);

  // Handle populated approvers array
  const approvers = (offer.approvers || []).map((a: any) => ({
    ...a,
    employeeId: extractIdValue(a.employeeId),
    // Preserve populated employee data if needed for display
    employeeData: typeof a.employeeId === 'object' ? a.employeeId : undefined,
  }));

  // Extract full application data if populated (now includes all fields)
  const applicationData = typeof offer.applicationId === 'object' && offer.applicationId
    ? offer.applicationId
    : undefined;

  // Extract full candidate data if populated (now includes all fields)
  const candidateData = typeof offer.candidateId === 'object' && offer.candidateId
    ? offer.candidateId
    : undefined;

  return {
    ...offer,
    id: extractId(offer),
    applicationId,
    candidateId,
    hrEmployeeId,
    approvers,
    // Preserve full populated data for display
    applicationData,
    candidateData,
    hrEmployeeData: typeof offer.hrEmployeeId === 'object' ? offer.hrEmployeeId : undefined,
  };
}

/**
 * Get all offers
 */
export async function getOffers(filters?: {
  applicationId?: string;
  status?: string;
}): Promise<JobOffer[]> {
  const params = new URLSearchParams();
  if (filters?.applicationId) params.append('applicationId', filters.applicationId);
  if (filters?.status) params.append('status', filters.status);

  const query = params.toString();
  const response = await api.get<any[]>(`/recruitment/offers${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformOffer);
}

/**
 * Get an offer by ID
 */
export async function getOfferById(id: string): Promise<JobOffer> {
  const response = await api.get<any>(`/recruitment/offers/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Offer not found');
  }
  return transformOffer(response.data);
}

/**
 * Create a new offer
 */
export async function createOffer(data: CreateJobOfferRequest): Promise<JobOffer> {
  const response = await api.post<any>('/recruitment/offers', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to create offer');
  }
  return transformOffer(response.data);
}

/**
 * Update an offer
 */
export async function updateOffer(id: string, data: Partial<CreateJobOfferRequest>): Promise<JobOffer> {
  const response = await api.put<any>(`/recruitment/offers/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update offer');
  }
  return transformOffer(response.data);
}

/**
 * Approve an offer (for approvers)
 * Backend requires ApproveOfferDto: { approverId, status, comment? }
 */
export async function approveOffer(id: string, approverId: string, comment?: string): Promise<JobOffer> {
  const response = await api.patch<any>(`/recruitment/offers/${id}/approve`, {
    approverId,
    status: 'approved',
    comment,
  });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to approve offer');
  }
  return transformOffer(response.data);
}

/**
 * Reject an offer (for approvers)
 * Backend requires ApproveOfferDto: { approverId, status, comment? }
 */
export async function rejectOffer(id: string, approverId: string, comment?: string): Promise<JobOffer> {
  const response = await api.patch<any>(`/recruitment/offers/${id}/approve`, {
    approverId,
    status: 'rejected',
    comment,
  });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to reject offer');
  }
  return transformOffer(response.data);
}

/**
 * Send offer to candidate (REC-018)
 * Backend endpoint: POST /recruitment/offers/:id/send
 */
export async function sendOffer(id: string): Promise<{ sent: boolean; message: string }> {
  const response = await api.post<{ sent: boolean; message: string }>(`/recruitment/offers/${id}/send`, {});
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to send offer');
  }
  return response.data;
}

/**
 * Candidate responds to offer (accept/reject) (REC-018)
 * Backend: PATCH /recruitment/offers/:id/candidate-response
 */
export async function respondToOffer(id: string, candidateResponse: 'accepted' | 'rejected'): Promise<JobOffer> {
  const response = await api.patch<any>(`/recruitment/offers/${id}/candidate-response`, { response: candidateResponse });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to respond to offer');
  }
  return transformOffer(response.data);
}

/**
 * Sign offer (candidate signature)
 */
export async function signOffer(id: string, signatureData: string): Promise<JobOffer> {
  const response = await api.patch<any>(`/recruitment/offers/${id}/sign`, { signature: signatureData });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to sign offer');
  }
  return transformOffer(response.data);
}

// =====================================================
// Candidates
// =====================================================

/**
 * Get all candidates
 */
export async function getCandidates(filters?: {
  status?: string;
  source?: string;
}): Promise<Candidate[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.source) params.append('source', filters.source);

  const query = params.toString();
  const response = await api.get<Candidate[]>(`/recruitment/candidates${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Get a candidate by ID
 */
export async function getCandidateById(id: string): Promise<Candidate> {
  const response = await api.get<Candidate>(`/recruitment/candidates/${id}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Candidate not found');
  }
  return response.data;
}

/**
 * Create a candidate profile
 */
export async function createCandidate(data: Partial<Candidate>): Promise<Candidate> {
  const response = await api.post<Candidate>('/recruitment/candidates', data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to create candidate');
  }
  return response.data;
}

/**
 * Update candidate profile
 */
export async function updateCandidate(id: string, data: Partial<Candidate>): Promise<Candidate> {
  const response = await api.put<Candidate>(`/recruitment/candidates/${id}`, data);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to update candidate');
  }
  return response.data;
}

// =====================================================
// Documents
// =====================================================

/**
 * Upload a document (CV, etc.)
 */
export async function uploadDocument(formData: FormData): Promise<RecruitmentDocument> {
  const response = await api.postFormData<RecruitmentDocument>('/recruitment/documents', formData);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to upload document');
  }
  return response.data;
}

/**
 * Get documents for a candidate/employee
 */
export async function getDocuments(ownerId: string): Promise<RecruitmentDocument[]> {
  const response = await api.get<RecruitmentDocument[]>(`/recruitment/documents?ownerId=${ownerId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  const response = await api.delete(`/recruitment/documents/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
}

// =====================================================
// Analytics & Statistics
// =====================================================

/**
 * Get recruitment statistics
 */
export async function getRecruitmentStats(): Promise<RecruitmentStats> {
  const response = await api.get<RecruitmentStats>('/recruitment/analytics/stats');
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to fetch recruitment stats');
  }
  return response.data;
}

/**
 * Get recruitment pipeline data
 */
export async function getRecruitmentPipeline(): Promise<RecruitmentPipeline[]> {
  const response = await api.get<RecruitmentPipeline[]>('/recruitment/analytics/pipeline');
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Get time-to-hire report
 */
export async function getTimeToHireReport(params?: { startDate?: string; endDate?: string }): Promise<unknown> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);

  const query = searchParams.toString();
  const response = await api.get(`/recruitment/analytics/time-to-hire${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

// =====================================================
// Referrals
// =====================================================

/**
 * Create a referral
 * REC-030: Tag candidates as referrals for preferential filtering
 * Note: candidateId should be the MongoDB ObjectId from application._id
 */
export async function createReferral(data: {
  referringEmployeeId: string;
  candidateId: string; // MongoDB ObjectId
  role?: string;
  level?: string;
}): Promise<unknown> {
  const response = await api.post('/recruitment/referrals', data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Get all referrals
 */
export async function getReferrals(filters?: {
  referrerId?: string;
  status?: string;
}): Promise<Referral[]> {
  const params = new URLSearchParams();
  if (filters?.referrerId) params.append('referrerId', filters.referrerId);
  if (filters?.status) params.append('status', filters.status);

  const query = params.toString();
  const response = await api.get<Referral[]>(`/recruitment/referrals${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Get referral by ID
 */
export async function getReferralById(id: string): Promise<unknown> {
  const response = await api.get(`/recruitment/referrals/${id}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Get referral by candidate ID (REC-030)
 * Backend: GET /recruitment/referrals/candidate/:candidateId
 */
export async function getReferralByCandidate(candidateId: string): Promise<unknown> {
  const response = await api.get(`/recruitment/referrals/candidate/${candidateId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Check if candidate is a referral (REC-030)
 * Backend: GET /recruitment/referrals/check/:candidateId
 */
export async function checkIsReferral(candidateId: string): Promise<{ isReferral: boolean }> {
  const response = await api.get<{ isReferral: boolean }>(`/recruitment/referrals/check/${candidateId}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to check referral status');
  }
  return response.data;
}

/**
 * Update referral status
 */
export async function updateReferralStatus(id: string, status: string): Promise<unknown> {
  const response = await api.patch(`/recruitment/referrals/${id}/status`, { status });
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

// =====================================================
// Notifications (BR-11, BR-36, REC-017, REC-022)
// =====================================================

/**
 * Get notifications for current user
 */
export async function getNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<RecruitmentNotification[]> {
  const searchParams = new URLSearchParams();
  if (params?.unreadOnly) searchParams.append('unreadOnly', 'true');
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const query = searchParams.toString();
  const response = await api.get<RecruitmentNotification[]>(`/recruitment/notifications${query ? `?${query}` : ''}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Send status update notification to candidate (REC-017)
 */
export async function sendStatusUpdateNotification(data: {
  applicationId: string;
  status: string;
  customMessage?: string;
}): Promise<unknown> {
  const response = await api.post('/recruitment/notifications/status-update', data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Send rejection notification with template (REC-022, BR-36, BR-37)
 */
export async function sendRejectionNotification(data: {
  applicationId: string;
  candidateEmail: string;
  rejectionReason: string;
  templateId?: string;
  customMessage?: string;
  message?: string;
}): Promise<unknown> {
  const response = await api.post('/recruitment/notifications/rejection', data);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Get email templates (REC-022)
 */
export async function getEmailTemplates(): Promise<{ id: string; name: string; subject: string; body: string }[]> {
  const response = await api.get<{ id: string; name: string; subject: string; body: string }[]>('/recruitment/notifications/templates');
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string): Promise<RecruitmentNotification> {
  const response = await api.patch<RecruitmentNotification>(`/recruitment/notifications/${id}/read`, {});
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to mark notification as read');
  }
  return response.data;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const response = await api.patch<{ count: number }>('/recruitment/notifications/mark-all-read', {});
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to mark all notifications as read');
  }
  return response.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  const response = await api.get<{ count: number }>('/recruitment/notifications/unread-count');
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to get unread count');
  }
  return response.data;
}

// =====================================================
// Audit Logs (BR-37, BR-26)
// =====================================================

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
  entityId: string,
  entityType?: 'application' | 'interview' | 'offer' | 'job' | 'candidate'
): Promise<AuditLog[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('entityId', entityId);
  if (entityType) searchParams.append('entityType', entityType);

  const response = await api.get<AuditLog[]>(`/recruitment/audit-logs?${searchParams.toString()}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data || [];
}

// =====================================================
// Analytics Summary (BR-33)
// =====================================================

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(params?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}): Promise<AnalyticsSummary> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  if (params?.departmentId) searchParams.append('departmentId', params.departmentId);

  const query = searchParams.toString();
  const response = await api.get<AnalyticsSummary>(`/recruitment/analytics/summary${query ? `?${query}` : ''}`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to get analytics summary');
  }
  return response.data;
}

// =====================================================
// Additional API functions
// =====================================================

/**
 * Get recruitment dashboard data
 */
export async function getRecruitmentDashboard(): Promise<unknown> {
  const response = await api.get('/recruitment/dashboard');
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data;
}

/**
 * Get interviews by application
 */
export async function getInterviewsByApplication(applicationId: string): Promise<Interview[]> {
  const response = await api.get<any[]>(`/recruitment/interviews?applicationId=${applicationId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformInterview);
}

/**
 * Get feedback by application
 */
export async function getFeedbackByApplication(applicationId: string): Promise<FeedbackResult[]> {
  const response = await api.get<any[]>(`/recruitment/feedback/application/${applicationId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  return (response.data || []).map(transformFeedback);
}

/**
 * Get average score for an application
 */
export async function getAverageScore(applicationId: string): Promise<{ averageScore: number }> {
  const response = await api.get<{ averageScore: number }>(`/recruitment/feedback/application/${applicationId}/average-score`);
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to get average score');
  }
  return response.data;
}

/**
 * Get offer by application
 */
export async function getOfferByApplication(applicationId: string): Promise<JobOffer | null> {
  const response = await api.get<JobOffer>(`/recruitment/offers?applicationId=${applicationId}`);
  if (response.error) {
    throw new Error(response.error);
  }
  // Return first offer or null
  const offers = response.data as unknown as JobOffer[];
  return Array.isArray(offers) && offers.length > 0 ? offers[0] : null;
}

/**
 * Get published jobs (public endpoint for careers page)
 */
export async function getPublishedJobs(): Promise<JobRequisition[]> {
  const response = await api.get<any[]>('/recruitment/job-requisitions/published');
  if (response.error) {
    throw new Error(response.error);
  }
  const jobs = response.data || [];

  // Transform and filter jobs
  return jobs
    .map(job => {
      // Extract ID
      const id = job._id || job.id || job.requisitionId;

      // Extract title from template or direct field
      const title = job.title || job.templateTitle || (job.templateId?.title) || (job.templateId?.templateTitle) || '';

      // Transform job data
      return {
        ...job,
        id: typeof id === 'object' ? (id._id || id.id || String(id)) : id,
        _id: typeof id === 'object' ? (id._id || id.id || String(id)) : id,
        requisitionId: typeof id === 'object' ? (id._id || id.id || String(id)) : id,
        title: title,
        templateTitle: title,
        numberOfOpenings: job.numberOfOpenings || job.openings || 0,
        department: job.department || job.templateId?.department || '',
        location: job.location || job.templateId?.location || '',
        employmentType: job.employmentType || job.templateId?.employmentType || '',
        description: job.description || job.templateId?.description || '',
      } as JobRequisition;
    })
    .filter(job => {
      // Must have an ID
      if (!job.id && !job._id && !job.requisitionId) {
        console.warn('Job missing ID:', job);
        return false;
      }

      // Must have a title
      if (!job.title && !job.templateTitle) {
        console.warn('Job missing title:', job);
        return false;
      }

      // Must have at least one opening
      const openings = job.numberOfOpenings || job.openings || 0;
      if (openings <= 0) {
        console.warn('Job has no openings:', job);
        return false;
      }

      // Check if expired
      if (job.expiryDate) {
        const expiry = new Date(job.expiryDate);
        if (expiry < new Date()) {
          console.warn('Job expired:', job);
          return false;
        }
      }

      return true;
    });
}

/**
 * Get employees (for panel selection)
 * Uses the employee-profile admin endpoint which returns paginated data
 */
export async function getEmployees(departmentId?: string): Promise<unknown[]> {
  const query = departmentId ? `?departmentId=${departmentId}&limit=100` : '?limit=100';
  const response = await api.get<{ data: unknown[]; pagination: unknown }>(`/employee-profile/admin/employees${query}`);
  if (response.error) {
    // If employee endpoint fails, return empty array instead of throwing
    console.warn('Failed to fetch employees:', response.error);
    return [];
  }
  // Backend returns paginated response with { data: [], pagination: {} }
  const result = response.data;
  let employees: any[] = [];

  if (result && Array.isArray(result.data)) {
    employees = result.data;
  } else if (Array.isArray(result)) {
    employees = result;
  }

  // Transform employees to ensure id and fullName are set
  return employees.map((emp: any) => {
    const firstName = emp.firstName || emp.first_name || '';
    const lastName = emp.lastName || emp.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      ...emp,
      id: extractId(emp),
      fullName: fullName || emp.name || emp.email || `Employee ${extractId(emp)?.slice(-6) || 'Unknown'}`,
    };
  });
}

// Export all functions as a service object for convenience
const recruitmentService = {
  // Job Templates
  getJobTemplates,
  getJobTemplateById,
  createJobTemplate,
  updateJobTemplate,
  deleteJobTemplate,

  // Process Templates
  getProcessTemplates,
  getProcessTemplateById,
  createProcessTemplate,
  updateProcessTemplate,
  deleteProcessTemplate,

  // Jobs (Job Requisitions)
  getJobs,
  getJobById,
  createJob,
  updateJob,
  publishJob,
  closeJob,
  getRequisitionProgress,

  // Applications
  getApplications,
  getApplicationById,
  applyToJob,
  createApplication,
  assignHrToApplication,
  updateApplicationStage,
  updateApplicationStatus,
  rejectApplication,
  getApplicationHistory,
  getApplicationsByCandidate,
  triggerPreboarding,

  // Interviews
  getInterviews,
  getUpcomingInterviews,
  getInterviewsByPanelist,
  getInterviewById,
  scheduleInterview,
  updateInterview,
  cancelInterview,
  completeInterview,
  rescheduleInterview,
  getInterviewsByApplication,

  // Feedback / Assessments
  submitInterviewFeedback,
  getFeedbackByInterview,
  getAssessmentResults,
  updateAssessment,
  getFeedbackByApplication,
  getAverageScore,

  // Offers
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  approveOffer,
  rejectOffer,
  sendOffer,
  respondToOffer,
  signOffer,
  getOfferByApplication,

  // Candidates
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,

  // Documents
  uploadDocument,
  getDocuments,
  deleteDocument,

  // Analytics
  getRecruitmentStats,
  getRecruitmentPipeline,
  getTimeToHireReport,
  getAnalyticsSummary,
  getRecruitmentDashboard,

  // Jobs (public)
  getPublishedJobs,

  // Referrals
  createReferral,
  getReferrals,
  getReferralById,
  getReferralByCandidate,
  checkIsReferral,
  updateReferralStatus,

  // Notifications (BR-11, BR-36, REC-017, REC-022)
  getNotifications,
  sendStatusUpdateNotification,
  sendRejectionNotification,
  getEmailTemplates,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,

  // Audit Logs (BR-37, BR-26)
  getAuditLogs,

  // Employees
  getEmployees,
};

export default recruitmentService;