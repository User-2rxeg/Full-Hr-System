import apiService from '../api';

/**
 * Helper function to build query string
 */
const buildQueryString = (params: Record<string, any>): string => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return filteredParams ? `?${filteredParams}` : '';
};

/**
 * Organization Structure Service
 * Handles organization hierarchy, departments, positions, and change requests
 */
export const organizationStructureService = {
  // =============================================
  // Department Management
  // =============================================

  /**
   * Create new department
   * POST /organization-structure/departments
   */
  createDepartment: async (data: any) => {
    return apiService.post(`/organization-structure/departments`, data);
  },

  /**
   * Get all departments
   * GET /organization-structure/departments
   */
  getDepartments: async (isActive?: boolean) => {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return apiService.get(`/organization-structure/departments${query}`);
  },

  /**
   * Search departments (paginated)
   * GET /organization-structure/departments/search
   */
  searchDepartments: async (query?: string, isActive?: boolean, page?: number, limit?: number) => {
    const queryStr = buildQueryString({ query, isActive, page, limit });
    return apiService.get(`/organization-structure/departments/search${queryStr}`);
  },

  /**
   * Get department statistics
   * GET /organization-structure/departments/stats
   */
  getDepartmentStats: async () => {
    return apiService.get(`/organization-structure/departments/stats`);
  },

  /**
   * Get department by ID
   * GET /organization-structure/departments/:id
   */
  getDepartmentById: async (id: string) => {
    return apiService.get(`/organization-structure/departments/${id}`);
  },

  /**
   * Get department hierarchy
   * GET /organization-structure/departments/:id/hierarchy
   */
  getDepartmentHierarchy: async (id: string) => {
    return apiService.get(`/organization-structure/departments/${id}/hierarchy`);
  },

  /**
   * Update department
   * PATCH /organization-structure/departments/:id
   */
  updateDepartment: async (id: string, data: any) => {
    return apiService.patch(`/organization-structure/departments/${id}`, data);
  },

  /**
   * Deactivate department
   * PATCH /organization-structure/departments/:id/deactivate
   */
  deactivateDepartment: async (id: string) => {
    return apiService.patch(`/organization-structure/departments/${id}/deactivate`, {});
  },

  /**
   * Reactivate department
   * PATCH /organization-structure/departments/:id/reactivate
   */
  reactivateDepartment: async (id: string) => {
    return apiService.patch(`/organization-structure/departments/${id}/reactivate`, {});
  },

  // =============================================
  // Position Management
  // =============================================

  /**
   * Create new position
   * POST /organization-structure/positions
   */
  createPosition: async (data: any) => {
    return apiService.post(`/organization-structure/positions`, data);
  },

  /**
   * Get all positions
   * GET /organization-structure/positions
   */
  getPositions: async (departmentId?: string, isActive?: boolean) => {
    const query = buildQueryString({ departmentId, isActive });
    return apiService.get(`/organization-structure/positions${query}`);
  },

  /**
   * Search positions (paginated)
   * GET /organization-structure/positions/search
   */
  searchPositions: async (query?: string, departmentId?: string, isActive?: boolean, page?: number, limit?: number) => {
    const queryStr = buildQueryString({ query, departmentId, isActive, page, limit });
    return apiService.get(`/organization-structure/positions/search${queryStr}`);
  },

  /**
   * Get position statistics
   * GET /organization-structure/positions/stats
   */
  getPositionStats: async () => {
    return apiService.get(`/organization-structure/positions/stats`);
  },

  /**
   * Get position by ID
   * GET /organization-structure/positions/:id
   */
  getPositionById: async (id: string) => {
    return apiService.get(`/organization-structure/positions/${id}`);
  },

  /**
   * Get subordinate positions
   * GET /organization-structure/positions/:id/subordinates
   */
  getPositionSubordinates: async (id: string) => {
    return apiService.get(`/organization-structure/positions/${id}/subordinates`);
  },

  /**
   * Update position
   * PATCH /organization-structure/positions/:id
   */
  updatePosition: async (id: string, data: any) => {
    return apiService.patch(`/organization-structure/positions/${id}`, data);
  },

  /**
   * Deactivate position
   * PATCH /organization-structure/positions/:id/deactivate
   */
  deactivatePosition: async (id: string, reason?: string) => {
    return apiService.patch(`/organization-structure/positions/${id}/deactivate`, { reason });
  },

  /**
   * Reactivate position
   * PATCH /organization-structure/positions/:id/reactivate
   */
  reactivatePosition: async (id: string) => {
    return apiService.patch(`/organization-structure/positions/${id}/reactivate`, {});
  },

  // =============================================
  // Position Assignments
  // =============================================

  /**
   * Assign employee to position
   * POST /organization-structure/assignments
   */
  assignEmployeeToPosition: async (data: any) => {
    return apiService.post(`/organization-structure/assignments`, data);
  },

  /**
   * Search assignments
   * GET /organization-structure/assignments
   */
  searchAssignments: async (employeeProfileId?: string, positionId?: string, departmentId?: string, activeOnly?: boolean, page?: number, limit?: number) => {
    const query = buildQueryString({ employeeProfileId, positionId, departmentId, activeOnly, page, limit });
    return apiService.get(`/organization-structure/assignments${query}`);
  },

  /**
   * Get employee assignment history
   * GET /organization-structure/assignments/employee/:employeeProfileId/history
   */
  getEmployeeAssignmentHistory: async (employeeProfileId: string) => {
    return apiService.get(`/organization-structure/assignments/employee/${employeeProfileId}/history`);
  },

  /**
   * Get assignment by ID
   * GET /organization-structure/assignments/:id
   */
  getAssignmentById: async (id: string) => {
    return apiService.get(`/organization-structure/assignments/${id}`);
  },

  /**
   * End assignment
   * PATCH /organization-structure/assignments/:id/end
   */
  endAssignment: async (id: string, data: any) => {
    return apiService.patch(`/organization-structure/assignments/${id}/end`, data);
  },

  // =============================================
  // Change Requests (REQ-OSM-03, REQ-OSM-04)
  // =============================================

  /**
   * Create change request
   * POST /organization-structure/change-requests
   */
  createChangeRequest: async (data: any) => {
    return apiService.post(`/organization-structure/change-requests`, data);
  },

  /**
   * Search change requests
   * GET /organization-structure/change-requests
   */
  searchChangeRequests: async (status?: string, requestType?: string, requestedByEmployeeId?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ status, requestType, requestedByEmployeeId, page, limit });
    return apiService.get(`/organization-structure/change-requests${query}`);
  },

  /**
   * Get pending requests count
   * GET /organization-structure/change-requests/count/pending
   */
  getPendingRequestsCount: async () => {
    return apiService.get(`/organization-structure/change-requests/count/pending`);
  },

  /**
   * Get change request by number
   * GET /organization-structure/change-requests/by-number/:requestNumber
   */
  getChangeRequestByNumber: async (requestNumber: string) => {
    return apiService.get(`/organization-structure/change-requests/by-number/${requestNumber}`);
  },

  /**
   * Get change request by ID
   * GET /organization-structure/change-requests/:id
   */
  getChangeRequestById: async (id: string) => {
    return apiService.get(`/organization-structure/change-requests/${id}`);
  },

  /**
   * Get approvals by change request
   * GET /organization-structure/change-requests/:id/approvals
   */
  getApprovalsByChangeRequest: async (id: string) => {
    return apiService.get(`/organization-structure/change-requests/${id}/approvals`);
  },

  /**
   * Update change request
   * PATCH /organization-structure/change-requests/:id
   */
  updateChangeRequest: async (id: string, data: any) => {
    return apiService.patch(`/organization-structure/change-requests/${id}`, data);
  },

  /**
   * Cancel change request
   * PATCH /organization-structure/change-requests/:id/cancel
   */
  cancelChangeRequest: async (id: string) => {
    return apiService.patch(`/organization-structure/change-requests/${id}/cancel`, {});
  },

  /**
   * Submit approval decision
   * POST /organization-structure/change-requests/:id/approvals
   */
  submitApprovalDecision: async (id: string, data: any) => {
    return apiService.post(`/organization-structure/change-requests/${id}/approvals`, data);
  },

  // =============================================
  // Organization Chart (REQ-SANV-01, REQ-SANV-02)
  // =============================================

  /**
   * Get organization chart
   * GET /organization-structure/org-chart
   */
  getOrgChart: async () => {
    return apiService.get(`/organization-structure/org-chart`);
  },

  // =============================================
  // Change Logs (REQ-OSM-11)
  // =============================================

  /**
   * Get change logs by entity
   * GET /organization-structure/change-logs/:entityType/:entityId
   */
  getChangeLogsByEntity: async (entityType: string, entityId: string, page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/organization-structure/change-logs/${entityType}/${entityId}${query}`);
  },
};

