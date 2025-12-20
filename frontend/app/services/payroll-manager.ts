import api, { ApiResponse } from './api';

// Payroll Manager Service - handles dispute and claim confirmations

// Helper function to extract specialist and manager comments
function extractComments(resolutionComment?: string, rejectionReason?: string, status?: string): { specialistNotes?: string; managerNotes?: string } {
  let specialistComment = '';
  let managerComment = '';
  
  const resolution = resolutionComment || '';
  const rejection = rejectionReason || '';
  const statusLower = (status || '').toLowerCase();

  if (statusLower === 'rejected') {
    // If rejected, manager comment is in rejectionReason
    managerComment = rejection;
    // Specialist comment is in resolutionComment (if set when specialist approved it before manager rejected)
    specialistComment = resolution;
  } else if (resolution.includes(' | Manager:')) {
    // New format: "specialist comment | Manager: manager comment"
    const parts = resolution.split(' | Manager:');
    specialistComment = parts[0].trim();
    managerComment = parts[1] ? parts[1].trim() : '';
  } else if (resolution.toLowerCase().includes('confirmed by payroll manager') ||
             resolution.toLowerCase().startsWith('confirmed by payroll manager')) {
    // Old format: manager confirmed without preserving specialist comment
    managerComment = resolution;
    specialistComment = '';
  } else if (resolution.toLowerCase().includes('approved by payroll specialist')) {
    // Specialist approved, no manager comment yet
    specialistComment = resolution;
    managerComment = '';
  } else {
    // Fallback for other cases, assume it's specialist comment
    specialistComment = resolution;
    managerComment = '';
  }

  return {
    specialistNotes: specialistComment || undefined,
    managerNotes: managerComment || undefined,
  };
}

// Transform backend dispute to frontend format
function transformDispute(backendDispute: any): DisputeConfirmation {
  const employee = backendDispute.employeeId || {};
  const specialist = backendDispute.payrollSpecialistId || {};
  const comments = extractComments(backendDispute.resolutionComment, backendDispute.rejectionReason, backendDispute.status);
  
  return {
    id: backendDispute._id?.toString() || backendDispute.id || '',
    employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown',
    employeeNumber: employee.employeeId || employee.employeeNumber || '',
    description: backendDispute.description || '',
    amount: backendDispute.amount,
    priority: backendDispute.priority || 'medium',
    status: backendDispute.status || 'pending payroll Manager approval',
    specialistName: specialist && typeof specialist === 'object' ? 
      `${specialist.firstName || ''} ${specialist.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
    specialistNotes: comments.specialistNotes,
    managerNotes: comments.managerNotes,
    submittedAt: backendDispute.createdAt ? new Date(backendDispute.createdAt).toISOString() : new Date().toISOString(),
    reviewedAt: backendDispute.updatedAt ? new Date(backendDispute.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// Transform backend claim to frontend format
function transformClaim(backendClaim: any): ClaimConfirmation {
  const employee = backendClaim.employeeId || {};
  const specialist = backendClaim.payrollSpecialistId || {};
  const comments = extractComments(backendClaim.resolutionComment, backendClaim.rejectionReason, backendClaim.status);
  
  return {
    id: backendClaim._id?.toString() || backendClaim.id || '',
    employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown',
    employeeNumber: employee.employeeId || employee.employeeNumber || '',
    claimType: backendClaim.claimType || '',
    description: backendClaim.description || '',
    amount: backendClaim.amount || 0,
    approvedAmount: backendClaim.approvedAmount,
    priority: backendClaim.priority || 'medium',
    status: backendClaim.status || 'pending payroll Manager approval',
    specialistName: specialist && typeof specialist === 'object' ? 
      `${specialist.firstName || ''} ${specialist.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
    specialistNotes: comments.specialistNotes,
    managerNotes: comments.managerNotes,
    submittedAt: backendClaim.createdAt ? new Date(backendClaim.createdAt).toISOString() : new Date().toISOString(),
    reviewedAt: backendClaim.updatedAt ? new Date(backendClaim.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export interface DisputeConfirmation {
  id: string;
  employeeName: string;
  employeeNumber: string;
  description: string;
  amount?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending payroll Manager approval' | 'approved' | 'rejected';
  specialistName: string;
  specialistNotes?: string;
  managerNotes?: string;
  submittedAt: string;
  reviewedAt: string;
}

export interface ClaimConfirmation {
  id: string;
  employeeName: string;
  employeeNumber: string;
  claimType: string;
  description: string;
  amount: number;
  approvedAmount?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending payroll Manager approval' | 'approved' | 'rejected';
  specialistName: string;
  specialistNotes?: string;
  managerNotes?: string;
  submittedAt: string;
  reviewedAt: string;
}

export interface DisputeConfirmationAction {
  disputeId: string;
  confirmed: boolean;
  notes?: string;
}

export interface ClaimConfirmationAction {
  claimId: string;
  confirmed: boolean;
  notes?: string;
}

class PayrollManagerService {
  async getPendingDisputeConfirmations(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/pending-confirmation');
  }

  async getPendingClaimConfirmations(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/pending-confirmation');
  }

  async confirmDispute(action: DisputeConfirmationAction, managerId: string): Promise<ApiResponse<DisputeConfirmation>> {
    if (!action.disputeId) {
      throw new Error('Dispute ID is required');
    }
    if (!managerId) {
      throw new Error('Manager ID is required');
    }
    
    const actionParam = action.confirmed ? 'confirm' : 'reject';
    const body = { reason: action.notes || '' };
    const url = `/payroll/tracking/disputes/${action.disputeId}/confirm?managerId=${managerId}&action=${actionParam}`;
    
    console.log('[PayrollManager] Confirming dispute:', { disputeId: action.disputeId, managerId, action: actionParam, url });
    
    return api.put<DisputeConfirmation>(url, body);
  }

  async confirmClaim(action: ClaimConfirmationAction, managerId: string): Promise<ApiResponse<ClaimConfirmation>> {
    if (!action.claimId) {
      throw new Error('Claim ID is required');
    }
    if (!managerId) {
      throw new Error('Manager ID is required');
    }
    
    const actionParam = action.confirmed ? 'confirm' : 'reject';
    const body = { reason: action.notes || '' };
    const url = `/payroll/tracking/claims/${action.claimId}/confirm?managerId=${managerId}&action=${actionParam}`;
    
    console.log('[PayrollManager] Confirming claim:', { claimId: action.claimId, managerId, action: actionParam, url });
    
    return api.put<ClaimConfirmation>(url, body);
  }

  async getConfirmedDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    const res = await api.get<DisputeConfirmation[]>('/payroll/tracking/disputes/approved');
    // backend returns an array for this endpoint; normalize just in case
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  async getConfirmedClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll/tracking/claims/approved');
  }

  async getUnderReviewDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    return api.get<DisputeConfirmation[]>('/payroll-manager/disputes/under-review');
  }

  async getUnderReviewClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    return api.get<ClaimConfirmation[]>('/payroll-manager/claims/under-review');
  }

  async getAllClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    // backend accepts GET /payroll/tracking/claims with optional ?status=...; omit status to get all
    const res = await api.get<any[]>('/payroll/tracking/claims');
    let rawData: any[] = [];
    
    if (res.data && Array.isArray(res.data)) {
      rawData = res.data;
    } else if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      rawData = (res.data as any).data;
    }
    
    // Transform backend data to frontend format
    const transformed = rawData.map(transformClaim);
    return { ...res, data: transformed };
  }

  async getAllDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    // backend accepts GET /payroll/tracking/disputes with optional ?status=...; omit status to get all
    const res = await api.get<any[]>('/payroll/tracking/disputes');
    let rawData: any[] = [];
    
    // backend `getAllDisputes` returns a wrapper { success, data, count }
    if (res.data && Array.isArray(res.data)) {
      rawData = res.data;
    } else if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      rawData = (res.data as any).data;
    }
    
    // Transform backend data to frontend format
    const transformed = rawData.map(transformDispute);
    return { ...res, data: transformed };
  }

  // Client-side helpers to fetch rejected items without backend changes
  async getRejectedClaims(): Promise<ApiResponse<ClaimConfirmation[]>> {
    const res = await api.get<ClaimConfirmation[]>('/payroll/tracking/claims?status=rejected');
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }

  async getRejectedDisputes(): Promise<ApiResponse<DisputeConfirmation[]>> {
    const res = await api.get<DisputeConfirmation[]>('/payroll/tracking/disputes?status=rejected');
    if (res.data && Array.isArray((res.data as any))) return res;
    if (res.data && (res.data as any).data && Array.isArray((res.data as any).data)) {
      return { ...res, data: (res.data as any).data };
    }
    return { ...res, data: [] };
  }
}

export const payrollManagerService = new PayrollManagerService();
