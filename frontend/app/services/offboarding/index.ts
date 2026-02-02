'use client';

import apiService from '../api';

// Enums matching backend
export enum TerminationInitiation {
  EMPLOYEE = 'employee',
  HR = 'hr',
  MANAGER = 'manager',
}

export enum TerminationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export enum TerminationReason {
  PERSONAL = 'personal',
  CAREER_CHANGE = 'career_change',
  RELOCATION = 'relocation',
  HEALTH = 'health',
  RETIREMENT = 'retirement',
  OTHER = 'other',
}

// Interfaces matching backend schemas
export interface TerminationRequest {
  _id: string;
  employeeId: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  status: TerminationStatus;
  terminationDate?: string;
  contractId: string;
  createdAt: string;
  updatedAt: string;
  performanceWarnings?: string[];
  performanceData?: {
    hasPublishedAppraisals: boolean;
    totalAppraisals: number;
    averageScore: number;
    lowScoreCount: number;
  };
}

export interface ClearanceItem {
  department: string;
  status: ApprovalStatus;
  comments?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface EquipmentItem {
  equipmentId?: string;
  name: string;
  returned: boolean;
  condition?: string;
}

export interface ClearanceChecklist {
  _id: string;
  terminationId: string;
  items: ClearanceItem[];
  equipmentList: EquipmentItem[];
  cardReturned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClearanceCompletionStatus {
  checklistId: string;
  allDepartmentsCleared: boolean;
  allEquipmentReturned: boolean;
  cardReturned: boolean;
  fullyCleared: boolean;
  pendingDepartments: string[];
  pendingEquipment: string[];
}

// DTOs for API calls
export interface CreateTerminationRequestDto {
  employeeId: string;
  contractId?: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  terminationDate?: string;
}

export interface CreateResignationRequestDto {
  employeeId: string;
  contractId?: string;
  reason: string;
  employeeComments?: string;
  terminationDate?: string;
}

export interface UpdateTerminationStatusDto {
  status: TerminationStatus;
  hrComments?: string;
}

export interface CreateClearanceChecklistDto {
  terminationId: string;
  items?: Array<{
    department: string;
    comments?: string;
    updatedBy?: string;
  }>;
  equipmentList?: Array<{
    equipmentId?: string;
    name: string;
    returned: boolean;
    condition?: string;
  }>;
  cardReturned?: boolean;
}

export interface UpdateClearanceItemDto {
  department: string;
  status: ApprovalStatus;
  comments?: string;
  updatedBy: string;
  updatedAt?: string;
}

export interface UpdateEquipmentItemDto {
  equipmentId?: string;
  name: string;
  returned: boolean;
  condition?: string;
}

export interface RevokeAccessDto {
  employeeId: string;
}

export interface TriggerFinalSettlementDto {
  terminationId: string;
  notes?: string;
}

// New interfaces for enhanced endpoints
export interface EmployeePerformanceForTermination {
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
  performanceData: {
    hasPublishedAppraisals: boolean;
    totalAppraisals: number;
    averageScore: number | null;
    lowScoreCount: number;
    latestAppraisal?: {
      cycleId?: any;
      totalScore?: number;
      publishedAt?: string;
    };
  };
  terminationJustification: {
    isJustified: boolean;
    warnings: string[];
  };
  recommendation: string;
}

export interface ResignationStatusWithHistory {
  employeeId: string;
  hasActiveRequest: boolean;
  activeRequest?: {
    requestId: string;
    reason: string;
    submittedAt: string;
    proposedLastDay?: string;
    status: TerminationStatus;
    hrComments?: string;
  };
  history: {
    requestId: string;
    reason: string;
    status: TerminationStatus;
    submittedAt: string;
    resolvedAt?: string;
  }[];
}

export interface PendingAccessRevocation {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  workEmail?: string;
  terminationDate?: string;
  terminationReason: string;
  approvedAt: string;
  daysSinceApproval: number;
  isUrgent: boolean;
}

export interface FinalSettlementPreview {
  terminationId: string;
  employeeId: string;
  employeeName: string;
  terminationDate?: string;
  clearanceStatus: {
    hasChecklist: boolean;
    isComplete: boolean;
    pendingItems?: string[];
  };
  leaveEncashment: {
    unusedDays: number;
    dailyRate: number;
    encashmentAmount: number;
    leaveDetails: {
      leaveType: string;
      entitled: number;
      taken: number;
      remaining: number;
    }[];
  };
  terminationBenefit: {
    hasConfig: boolean;
    configName?: string;
    baseAmount: number;
    totalAmount: number;
  };
  canTrigger: boolean;
  blockers: string[];
}

export interface ClearanceUpdateResult {
  checklist: ClearanceChecklist;
  departmentCleared: boolean;
  allDepartmentsCleared: boolean;
  fullyCleared: boolean;
  pendingDepartments: string[];
  filedToHR: boolean;
}

class OffboardingService {
  // ============================================================
  // OFF-001: Termination Review (HR Manager)
  // ============================================================

  // Get employee performance data before initiating termination
  async getEmployeePerformanceForTermination(employeeId: string): Promise<EmployeePerformanceForTermination> {
    const response = await apiService.get<EmployeePerformanceForTermination>(
      `/offboarding/termination-reviews/employee/${employeeId}/performance`
    );
    if (response.error) throw new Error(response.error);
    return response.data as EmployeePerformanceForTermination;
  }

  // Create termination request (HR Manager)
  async createTerminationRequest(dto: CreateTerminationRequestDto): Promise<TerminationRequest> {
    const response = await apiService.post<TerminationRequest>('/offboarding/termination-requests', dto);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Get all termination requests with optional filters
  async getAllTerminationRequests(
    employeeId?: string,
    status?: TerminationStatus,
    initiator?: TerminationInitiation
  ): Promise<TerminationRequest[]> {
    const params = new URLSearchParams();
    if (employeeId) params.append('employeeId', employeeId);
    if (status) params.append('status', status);
    if (initiator) params.append('initiator', initiator);

    const queryString = params.toString();
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests${queryString ? '?' + queryString : ''}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination requests by initiator type
  async getTerminationRequestsByInitiator(
    initiator: TerminationInitiation,
    status?: TerminationStatus
  ): Promise<TerminationRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests/by-initiator/${initiator}${params}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get all resignation requests (employee-initiated)
  async getAllResignationRequests(status?: TerminationStatus): Promise<TerminationRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/resignation-requests/all${params}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination requests by status
  async getTerminationRequestsByStatus(status: TerminationStatus): Promise<TerminationRequest[]> {
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/termination-requests/by-status/${status}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get termination request by ID
  async getTerminationRequestById(id: string): Promise<TerminationRequest> {
    const response = await apiService.get<TerminationRequest>(`/offboarding/termination-requests/${id}`);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Update termination request status (workflow approval)
  async updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto): Promise<TerminationRequest> {
    const response = await apiService.patch<TerminationRequest>(
      `/offboarding/termination-requests/${id}/status`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // Delete termination request (only if not approved)
  async deleteTerminationRequest(id: string): Promise<{ message: string; deletedId: string }> {
    const response = await apiService.delete<{ message: string; deletedId: string }>(
      `/offboarding/termination-requests/${id}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as { message: string; deletedId: string };
  }

  // OFF-018: Create resignation request (Employee)
  async createResignationRequest(dto: CreateResignationRequestDto): Promise<TerminationRequest> {
    const response = await apiService.post<TerminationRequest>('/offboarding/resignation-requests', dto);
    if (response.error) throw new Error(response.error);
    return response.data as TerminationRequest;
  }

  // OFF-019: Get resignation requests by employee ID (Employee tracking)
  async getResignationRequestsByEmployeeId(employeeId: string): Promise<TerminationRequest[]> {
    const response = await apiService.get<TerminationRequest[]>(
      `/offboarding/resignation-requests/employee/${employeeId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // OFF-019: Get resignation status with history
  async getResignationStatusWithWorkflow(employeeId: string): Promise<ResignationStatusWithHistory> {
    const response = await apiService.get<ResignationStatusWithHistory>(
      `/offboarding/resignation-requests/employee/${employeeId}/workflow-status`
    );
    if (response.error) throw new Error(response.error);
    return response.data as ResignationStatusWithHistory;
  }

  // OFF-006: Create clearance checklist (HR Manager)
  async createClearanceChecklist(dto: CreateClearanceChecklistDto): Promise<ClearanceChecklist> {
    const response = await apiService.post<ClearanceChecklist>('/offboarding/clearance-checklists', dto);
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get all clearance checklists
  async getAllClearanceChecklists(): Promise<ClearanceChecklist[]> {
    const response = await apiService.get<ClearanceChecklist[]>('/offboarding/clearance-checklists');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // Get clearance checklist by ID
  async getClearanceChecklistById(id: string): Promise<ClearanceChecklist> {
    const response = await apiService.get<ClearanceChecklist>(`/offboarding/clearance-checklists/${id}`);
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get clearance checklist by termination ID
  async getClearanceChecklistByTerminationId(terminationId: string): Promise<ClearanceChecklist> {
    const response = await apiService.get<ClearanceChecklist>(
      `/offboarding/clearance-checklists/termination/${terminationId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Get clearance completion status
  async getClearanceCompletionStatus(checklistId: string): Promise<ClearanceCompletionStatus> {
    const response = await apiService.get<ClearanceCompletionStatus>(
      `/offboarding/clearance-checklists/${checklistId}/status`
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceCompletionStatus;
  }

  // OFF-010: Update clearance item (department sign-off)
  async updateClearanceItem(checklistId: string, dto: UpdateClearanceItemDto): Promise<ClearanceUpdateResult> {
    const response = await apiService.patch<ClearanceUpdateResult>(
      `/offboarding/clearance-checklists/${checklistId}/items`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceUpdateResult;
  }

  // Update equipment return status
  async updateEquipmentItem(
    checklistId: string,
    equipmentName: string,
    dto: UpdateEquipmentItemDto
  ): Promise<ClearanceChecklist> {
    const response = await apiService.patch<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/equipment/${encodeURIComponent(equipmentName)}`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Add equipment to checklist
  async addEquipmentToChecklist(checklistId: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
    const response = await apiService.post<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/equipment`,
      dto
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // Update access card return status
  async updateCardReturn(checklistId: string, cardReturned: boolean): Promise<ClearanceChecklist> {
    const response = await apiService.patch<ClearanceChecklist>(
      `/offboarding/clearance-checklists/${checklistId}/card-return`,
      { cardReturned }
    );
    if (response.error) throw new Error(response.error);
    return response.data as ClearanceChecklist;
  }

  // OFF-007: Get employees pending access revocation (System Admin)
  async getEmployeesPendingAccessRevocation(): Promise<PendingAccessRevocation[]> {
    const response = await apiService.get<PendingAccessRevocation[]>(
      '/offboarding/pending-access-revocation'
    );
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  // OFF-007: Revoke system access (System Admin)
  async revokeSystemAccess(dto: RevokeAccessDto): Promise<{
    success: boolean;
    employeeId: string;
    message: string;
    revokedAt: string;
    details: {
      employeeDeactivated: boolean;
      systemRolesDisabled: number;
    };
  }> {
    const response = await apiService.post<{
      success: boolean;
      employeeId: string;
      message: string;
      revokedAt: string;
      details: {
        employeeDeactivated: boolean;
        systemRolesDisabled: number;
      };
    }>('/offboarding/revoke-access', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }

  // OFF-013: Preview final settlement (HR Manager)
  async previewFinalSettlement(terminationId: string): Promise<FinalSettlementPreview> {
    const response = await apiService.get<FinalSettlementPreview>(
      `/offboarding/final-settlement/preview/${terminationId}`
    );
    if (response.error) throw new Error(response.error);
    return response.data as FinalSettlementPreview;
  }

  // OFF-013: Trigger final settlement (HR Manager)
  async triggerFinalSettlement(dto: TriggerFinalSettlementDto): Promise<{
    success: boolean;
    terminationId: string;
    message: string;
    triggeredAt: string;
    leaveEncashment?: {
      unusedDays: number;
      encashmentAmount: number;
    };
    terminationBenefit?: {
      benefitId: string;
      amount: number;
    };
  }> {
    const response = await apiService.post<{
      success: boolean;
      terminationId: string;
      message: string;
      triggeredAt: string;
      leaveEncashment?: {
        unusedDays: number;
        encashmentAmount: number;
      };
      terminationBenefit?: {
        benefitId: string;
        amount: number;
      };
    }>('/offboarding/trigger-final-settlement', dto);
    if (response.error) throw new Error(response.error);
    return response.data as any;
  }
}

export const offboardingService = new OffboardingService();

