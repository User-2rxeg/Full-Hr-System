import api from './api';

// Claim Status - defined first to avoid circular reference
export const ClaimStatus = {
  UNDER_REVIEW: 'under review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type ClaimStatus = typeof ClaimStatus[keyof typeof ClaimStatus];

// Claim interface
export interface Claim {
  _id: string;
  claimId: string;
  description: string;
  claimType: string;
  employeeId: string;
  financeStaffId?: string;
  amount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ClaimFilters {
  status?: ClaimStatus | 'all';
  claimType?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ClaimResponse {
  success: boolean;
  data: Claim;
  message?: string;
}

export interface ClaimsListResponse {
  success: boolean;
  data: Claim[];
  count: number;
}

// Claims API Service
export const claimsService = {
  async getAllClaims(filters?: ClaimFilters): Promise<ClaimsListResponse> {
    const params = new URLSearchParams();

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.claimType) {
      params.append('claimType', filters.claimType);
    }
    if (filters?.employeeId) {
      params.append('employeeId', filters.employeeId);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters?.minAmount) {
      params.append('minAmount', filters.minAmount.toString());
    }
    if (filters?.maxAmount) {
      params.append('maxAmount', filters.maxAmount.toString());
    }

    const queryString = params.toString();
    const response = await api.get<ClaimsListResponse>(
      `/payroll/tracking/claims${queryString ? `?${queryString}` : ''}`
    );

    // Backend returns { success, data: [...], count }
    // The axios wrapper puts this in response.data
    if (!response.data) {
      throw new Error('No data received from API');
    }

    // If response.data has a data property, use that (backend format)
    // Otherwise use response.data directly (for backward compatibility)
    if ((response.data as any).data) {
      return {
        success: (response.data as any).success,
        data: (response.data as any).data,
        count: (response.data as any).count
      };
    }

    return response.data;
  },

  async getClaimById(claimId: string): Promise<ClaimResponse> {
    const response = await api.get<ClaimResponse>(`/payroll/tracking/claims/${claimId}`);

    if (!response.data) {
      throw new Error('No data received from API');
    }

    return response.data;
  },

  async approveClaim(claimId: string, approvedAmount?: number, resolutionComment?: string): Promise<ClaimResponse> {
    // Get specialist ID from auth context or pass it as parameter
    // For now, we'll use a placeholder - in real implementation this should come from auth
    const specialistId = 'specialist_id_placeholder';

    const response = await api.put<ClaimResponse>(
      `/payroll/tracking/claims/${claimId}/review?action=approve&specialistId=${specialistId}`,
      {
        approvedAmount,
        reason: resolutionComment
      }
    );

    if (!response.data) {
      throw new Error('No data received from API');
    }

    return response.data;
  },

  async rejectClaim(claimId: string, rejectionReason: string): Promise<ClaimResponse> {
    // Get specialist ID from auth context or pass it as parameter
    // For now, we'll use a placeholder - in real implementation this should come from auth
    const specialistId = 'specialist_id_placeholder';

    const response = await api.put<ClaimResponse>(
      `/payroll/tracking/claims/${claimId}/review?action=reject&specialistId=${specialistId}`,
      {
        reason: rejectionReason
      }
    );

    if (!response.data) {
      throw new Error('No data received from API');
    }

    return response.data;
  }
};