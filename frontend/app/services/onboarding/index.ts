'use client';

import apiService from '../api';

// Enums matching backend
export enum OnboardingTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum DocumentType {
  CV = 'cv',
  CONTRACT = 'contract',
  ID = 'id',
  CERTIFICATE = 'certificate',
  RESIGNATION = 'resignation',
}

// Interfaces matching backend schemas
export interface OnboardingTask {
  name: string;
  department: string;
  status: OnboardingTaskStatus;
  deadline?: string;
  completedAt?: string;
  documentId?: string;
  notes?: string;
}

export interface Onboarding {
  _id: string;
  employeeId: string;
  contractId: string;
  tasks: OnboardingTask[];
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  ownerId: string;
  type: DocumentType;
  filePath: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  _id: string;
  offerId: string;
  acceptanceDate?: string;
  grossSalary: number;
  signingBonus?: number;
  role: string;
  benefits?: string[];
  documentId?: string;
  employeeSignatureUrl?: string;
  employerSignatureUrl?: string;
  employeeSignedAt?: string;
  employerSignedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProgress {
  onboardingId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  progressPercentage: number;
  isComplete: boolean;
}

export interface PendingTasksResponse {
  employeeId: string;
  pendingTasks: OnboardingTask[];
  overdueTasks: OnboardingTask[];
}

// DTOs for API calls
export interface CreateOnboardingDto {
  employeeId: string;
  contractId: string;
  tasks: Array<{
    name: string;
    department: string;
    deadline?: string;
    documentId?: string;
    notes?: string;
  }>;
}

export interface CreateOnboardingTaskDto {
  name: string;
  department: string;
  deadline?: string;
  documentId?: string;
  notes?: string;
}

export interface UpdateTaskStatusDto {
  status: OnboardingTaskStatus;
  completedAt?: string;
}

export interface UploadDocumentDto {
  ownerId: string;
  type: DocumentType;
  filePath: string;
}

export interface ProvisionAccessDto {
  employeeId: string;
}

export interface ReserveEquipmentDto {
  employeeId: string;
  equipment?: string[];
  deskNumber?: string;
  accessCardNumber?: string;
}

export interface ScheduleAccessRevocationDto {
  employeeId: string;
  revocationDate?: string;
}

export interface TriggerPayrollInitiationDto {
  contractId: string;
}

export interface CancelOnboardingDto {
  reason: string;
}

// New interfaces for enhanced endpoints
export interface RequiredDocument {
  documentType: string;
  name: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  documentId?: string;
  uploadedAt?: string;
}

export interface RequiredDocumentsResponse {
  candidateId: string;
  candidateName: string;
  offerStatus: string;
  requiredDocuments: RequiredDocument[];
  uploadedCount: number;
  totalRequired: number;
  allRequiredUploaded: boolean;
}

export interface DocumentUploadResult {
  document: Document;
  message: string;
  uploadProgress: {
    uploadedCount: number;
    totalRequired: number;
    allRequiredUploaded: boolean;
    remainingRequired: string[];
  };
  readyForOnboarding: boolean;
}

export interface OnboardingEligibility {
  candidateId: string;
  candidateName: string;
  isEligible: boolean;
  reasons: string[];
  checklist: {
    hasAcceptedOffer: boolean;
    hasSignedContract: boolean;
    allRequiredDocumentsUploaded: boolean;
    documentsUploaded: number;
    documentsRequired: number;
  };
  nextSteps: string[];
}

export interface OnboardingTracker {
  employeeId: string;
  employeeName: string;
  onboardingId: string;
  started: string;
  progress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    progressPercentage: number;
    isComplete: boolean;
  };
  tasksByStatus: {
    pending: OnboardingTask[];
    inProgress: OnboardingTask[];
    completed: OnboardingTask[];
  };
  tasksByDepartment: Record<string, OnboardingTask[]>;
  nextTask?: OnboardingTask;
  overdueTasks: OnboardingTask[];
  upcomingDeadlines: OnboardingTask[];
}

export interface PendingProvisioning {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  startDate?: string;
  daysUntilStart: number;
  isUrgent: boolean;
  onboardingId: string;
  itTasksStatus: {
    total: number;
    completed: number;
    pending: string[];
  };
}

export interface PendingEquipment {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  startDate?: string;
  daysUntilStart: number;
  isUrgent: boolean;
  onboardingId: string;
  adminTasksStatus: {
    total: number;
    completed: number;
    pending: string[];
  };
}

class OnboardingService {
  // ============================================================
  // Candidate Document Upload - Initiate Onboarding Process
  // ============================================================

  // Get required document templates for candidate
  async getRequiredDocumentTemplates(candidateId: string): Promise<RequiredDocumentsResponse> {
    const response = await apiService.get<RequiredDocumentsResponse>(
      `/onboarding/candidate/${candidateId}/required-documents`
    );
    if (response.error) throw new Error(response.error);
    return response.data as RequiredDocumentsResponse;
  }

  // Candidate upload document
  async uploadCandidateDocument(candidateId: string, dto: UploadDocumentDto): Promise<DocumentUploadResult> {
    const response = await apiService.post<DocumentUploadResult>(
      `/onboarding/candidate/${candidateId}/upload-document`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as DocumentUploadResult;
  }

  // Get candidate document progress
  async getCandidateDocumentProgress(candidateId: string): Promise<{
    candidateId: string;
    totalRequired: number;
    uploadedCount: number;
    progressPercentage: number;
    missingDocuments: string[];
    uploadedDocuments: { type: string; documentId: string; uploadedAt: string }[];
  }> {
    const response = await apiService.get<any>(
      `/onboarding/candidate/${candidateId}/document-progress`
    );
    if (response.error) throw new Error(response.error);
    return response.data;
  }

  // Check onboarding eligibility
  async validateOnboardingEligibility(candidateId: string): Promise<OnboardingEligibility> {
    const response = await apiService.get<OnboardingEligibility>(
      `/onboarding/candidate/${candidateId}/eligibility`
    );
    if (response.error) throw new Error(response.error);
    return response.data as OnboardingEligibility;
  }

  // Delete candidate document
  async deleteCandidateDocument(candidateId: string, documentId: string): Promise<{ message: string }> {
    const response = await apiService.delete<{ message: string }>(
      `/onboarding/candidate/${candidateId}/documents/${documentId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as { message: string };
  }

  // ============================================================
  // ONB-001: Create Onboarding Task Checklists
  // ============================================================

  // ONB-001: Create onboarding checklist
  async createOnboarding(dto: CreateOnboardingDto): Promise<Onboarding> {
    const response = await apiService.post<Onboarding>('/onboarding', dto);
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // Get all onboarding checklists
  async getAllOnboardings(): Promise<Onboarding[]> {
    const response = await apiService.get<Onboarding[]>('/onboarding');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get onboarding by ID
  async getOnboardingById(id: string): Promise<Onboarding> {
    const response = await apiService.get<any>(`/onboarding/${id}`);
    if (response.error) throw new Error(response.error);
    const data = response.data;
    
    // Transform populated fields to strings
    const transformed: Onboarding = {
      ...data,
      employeeId: typeof data.employeeId === 'object' 
        ? (data.employeeId._id || data.employeeId.id || String(data.employeeId))
        : (data.employeeId || ''),
      contractId: typeof data.contractId === 'object'
        ? (data.contractId._id || data.contractId.id || String(data.contractId))
        : (data.contractId || ''),
    };
    
    return transformed;
  }

  // ONB-004: Get onboarding by employee ID (New Hire tracker view)
  async getOnboardingByEmployeeId(employeeId: string): Promise<Onboarding> {
    const response = await apiService.get<Onboarding>(`/onboarding/employee/${employeeId}`);
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // ONB-004: Get detailed onboarding tracker
  async getOnboardingTracker(employeeId: string): Promise<OnboardingTracker> {
    const response = await apiService.get<OnboardingTracker>(`/onboarding/employee/${employeeId}/tracker`);
    if (response.error) throw new Error(response.error);
    return response.data as OnboardingTracker;
  }

  // ONB-004: Start a task
  async startTask(employeeId: string, taskName: string): Promise<Onboarding> {
    const response = await apiService.post<Onboarding>(
      `/onboarding/employee/${employeeId}/tasks/${encodeURIComponent(taskName)}/start`,
      {}
    );
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // ONB-004: Complete a task
  async completeTask(employeeId: string, taskName: string, documentId?: string): Promise<Onboarding> {
    const response = await apiService.post<Onboarding>(
      `/onboarding/employee/${employeeId}/tasks/${encodeURIComponent(taskName)}/complete`,
      { documentId }
    );
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // Get onboarding progress statistics
  async getOnboardingProgress(onboardingId: string): Promise<OnboardingProgress> {
    const response = await apiService.get<OnboardingProgress>(`/onboarding/${onboardingId}/progress`);
    if (response.error) throw new Error(response.error);
    return response.data as OnboardingProgress;
  }

  // Add task to onboarding checklist
  async addTask(onboardingId: string, dto: CreateOnboardingTaskDto): Promise<Onboarding> {
    const response = await apiService.post<Onboarding>(`/onboarding/${onboardingId}/tasks`, dto);
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // Update task status
  async updateTaskStatus(onboardingId: string, taskName: string, dto: UpdateTaskStatusDto): Promise<Onboarding> {
    const response = await apiService.patch<Onboarding>(
      `/onboarding/${onboardingId}/tasks/${encodeURIComponent(taskName)}/status`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // ONB-002: Get signed contracts pending employee creation
  async getSignedContractsForOnboarding(): Promise<any[]> {
    const response = await apiService.get<any[]>(`/onboarding/contracts/pending-employee-creation`);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // ONB-002: Get signed contract details
  async getContractDetails(contractId: string): Promise<Contract> {
    const response = await apiService.get<Contract>(`/onboarding/contracts/${contractId}`);
    if (response.error) throw new Error(response.error);
    return response.data as Contract;
  }

  // ONB-002: Create employee profile from signed contract
  async createEmployeeFromContract(contractId: string): Promise<{
    employee: any;
    temporaryPassword: string;
    contract: Contract;
  }> {
    const response = await apiService.post<{
      employee: any;
      temporaryPassword: string;
      contract: Contract;
    }>(`/onboarding/contracts/${contractId}/create-employee`, {});
    if (response.error) throw new Error(response.error);
    return response.data as { employee: any; temporaryPassword: string; contract: Contract };
  }

  // ONB-005: Get pending tasks with reminders
  async getPendingTasks(employeeId: string): Promise<PendingTasksResponse> {
    const response = await apiService.get<PendingTasksResponse>(`/onboarding/employee/${employeeId}/pending-tasks`);
    if (response.error) throw new Error(response.error);
    return response.data as PendingTasksResponse;
  }

  // ONB-005: Get pending tasks without sending reminders
  async getPendingTasksQuiet(employeeId: string): Promise<PendingTasksResponse & { upcomingDeadlines: OnboardingTask[] }> {
    const response = await apiService.get<any>(`/onboarding/employee/${employeeId}/pending-tasks/quiet`);
    if (response.error) throw new Error(response.error);
    return response.data;
  }

  // ONB-005: Send task reminders
  async sendTaskReminders(employeeId: string): Promise<{ success: boolean; remindersSent: number; message: string }> {
    const response = await apiService.post<any>(`/onboarding/employee/${employeeId}/send-reminders`, {});
    if (response.error) throw new Error(response.error);
    return response.data;
  }

  // ONB-005: Send batch reminders to all employees
  async sendBatchReminders(): Promise<{ success: boolean; employeesNotified: number; totalReminders: number; message: string }> {
    const response = await apiService.post<any>('/onboarding/send-batch-reminders', {});
    if (response.error) throw new Error(response.error);
    return response.data;
  }

  // ONB-007: Upload compliance document
  async uploadDocument(dto: UploadDocumentDto): Promise<Document> {
    const response = await apiService.post<Document>('/onboarding/documents', dto);
    if (response.error) throw new Error(response.error);
    return response.data as Document;
  }

  // Get documents by owner
  async getDocumentsByOwner(ownerId: string): Promise<Document[]> {
    const response = await apiService.get<Document[]>(`/onboarding/documents/owner/${ownerId}`);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Link document to task
  async linkDocumentToTask(onboardingId: string, taskName: string, documentId: string): Promise<Onboarding> {
    const response = await apiService.patch<Onboarding>(
      `/onboarding/${onboardingId}/tasks/${encodeURIComponent(taskName)}/document`,
      { documentId }
    );
    if (response.error) throw new Error(response.error);
    return response.data as Onboarding;
  }

  // ONB-009: Get employees pending access provisioning
  async getEmployeesPendingProvisioning(): Promise<PendingProvisioning[]> {
    const response = await apiService.get<PendingProvisioning[]>('/onboarding/pending-provisioning');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // ONB-009: Provision system access (System Admin)
  async provisionSystemAccess(dto: ProvisionAccessDto): Promise<{
    success: boolean;
    employeeId: string;
    message: string;
    provisionedAt: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      employeeId: string;
      message: string;
      provisionedAt: string;
    }>('/onboarding/provision-access', dto);
    if (response.error) throw new Error(response.error);
    return response.data as { success: boolean; employeeId: string; message: string; provisionedAt: string };
  }

  // ONB-012: Get employees pending equipment reservation
  async getEmployeesPendingEquipment(): Promise<PendingEquipment[]> {
    const response = await apiService.get<PendingEquipment[]>('/onboarding/pending-equipment');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // ONB-012: Reserve equipment and resources (HR Employee)
  async reserveEquipment(dto: ReserveEquipmentDto): Promise<{
    success: boolean;
    employeeId: string;
    reservedItems: {
      equipment?: string[];
      deskNumber?: string;
      accessCardNumber?: string;
    };
    message: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      employeeId: string;
      reservedItems: {
        equipment?: string[];
        deskNumber?: string;
        accessCardNumber?: string;
      };
      message: string;
    }>('/onboarding/reserve-equipment', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // ONB-013: Schedule access revocation
  async scheduleAccessRevocation(dto: ScheduleAccessRevocationDto): Promise<{
    success: boolean;
    employeeId: string;
    revocationDate?: string;
    message: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      employeeId: string;
      revocationDate?: string;
      message: string;
    }>('/onboarding/schedule-access-revocation', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // ONB-018: Trigger payroll initiation
  async triggerPayrollInitiation(dto: TriggerPayrollInitiationDto): Promise<{
    success: boolean;
    contractId: string;
    message: string;
    triggeredAt: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      contractId: string;
      message: string;
      triggeredAt: string;
    }>('/onboarding/trigger-payroll-initiation', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // ONB-019: Process signing bonus
  async processSigningBonus(contractId: string): Promise<{
    success: boolean;
    contractId: string;
    bonusAmount: number;
    message: string;
  }> {
    const response = await apiService.post<{
      success: boolean;
      contractId: string;
      bonusAmount: number;
      message: string;
    }>(`/onboarding/contracts/${contractId}/process-signing-bonus`, {});
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // ONB-020: Cancel onboarding (No-show)
  async cancelOnboarding(onboardingId: string, dto: CancelOnboardingDto): Promise<{
    success: boolean;
    onboardingId: string;
    message: string;
    cancelledAt: string;
  }> {
    // Use post with _method override or send body with delete
    // Since apiService.delete doesn't support body, we use a workaround
    const response = await apiService.post<{
      success: boolean;
      onboardingId: string;
      message: string;
      cancelledAt: string;
    }>(`/onboarding/${onboardingId}/cancel`, dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // Upload contract and forms (Candidate)
  async uploadContractAndForms(dto: UploadDocumentDto): Promise<Document> {
    const response = await apiService.post<Document>('/onboarding/upload-contract', dto);
    if (response.error) throw new Error(response.error);
    return response.data as Document;
  }
}

export const onboardingService = new OnboardingService();

