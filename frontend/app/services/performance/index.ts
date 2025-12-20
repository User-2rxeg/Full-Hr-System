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
 * Performance Management Service
 * Handles appraisal cycles, templates, ratings, and dispute management
 */
export const performanceService = {
  // =============================================
  // Templates
  // =============================================

  /**
   * Create appraisal template
   * POST /performance/templates
   */
  createTemplate: async (data: any) => {
    return apiService.post(`/performance/templates`, data);
  },

  /**
   * Get all templates
   * GET /performance/templates
   */
  getTemplates: async () => {
    return apiService.get(`/performance/templates`);
  },

  /**
   * Search templates (paginated)
   * GET /performance/templates/search
   */
  searchTemplates: async (q?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/performance/templates/search${query}`);
  },

  /**
   * Get template statistics
   * GET /performance/templates/stats
   */
  getTemplateStats: async () => {
    return apiService.get(`/performance/templates/stats`);
  },

  /**
   * Get template by ID
   * GET /performance/templates/:id
   */
  getTemplateById: async (id: string) => {
    return apiService.get(`/performance/templates/${id}`);
  },

  /**
   * Update template
   * PATCH /performance/templates/:id
   */
  updateTemplate: async (id: string, data: any) => {
    return apiService.patch(`/performance/templates/${id}`, data);
  },

  /**
   * Deactivate template
   * PATCH /performance/templates/:id/deactivate
   */
  deactivateTemplate: async (id: string) => {
    return apiService.patch(`/performance/templates/${id}/deactivate`, {});
  },

  /**
   * Reactivate template
   * PATCH /performance/templates/:id/reactivate
   */
  reactivateTemplate: async (id: string) => {
    return apiService.patch(`/performance/templates/${id}/reactivate`, {});
  },

  // =============================================
  // Cycles
  // =============================================

  /**
   * Create appraisal cycle
   * POST /performance/cycles
   */
  createCycle: async (data: any) => {
    return apiService.post(`/performance/cycles`, data);
  },

  /**
   * Get all cycles
   * GET /performance/cycles
   */
  getCycles: async () => {
    return apiService.get(`/performance/cycles`);
  },

  /**
   * Search cycles (paginated)
   * GET /performance/cycles/search
   */
  searchCycles: async (q?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/performance/cycles/search${query}`);
  },

  /**
   * Get cycle statistics
   * GET /performance/cycles/stats
   */
  getCycleStats: async () => {
    return apiService.get(`/performance/cycles/stats`);
  },

  /**
   * Get cycle by ID
   * GET /performance/cycles/:id
   */
  getCycleById: async (id: string) => {
    return apiService.get(`/performance/cycles/${id}`);
  },

  /**
   * Update cycle
   * PATCH /performance/cycles/:id
   */
  updateCycle: async (id: string, data: any) => {
    return apiService.patch(`/performance/cycles/${id}`, data);
  },

  /**
   * Activate PLANNED cycle
   * POST /performance/cycles/:id/activate
   */
  activateCycle: async (id: string) => {
    return apiService.post(`/performance/cycles/${id}/activate`, {});
  },

  /**
   * Close ACTIVE cycle
   * POST /performance/cycles/:id/close
   */
  closeCycle: async (id: string) => {
    return apiService.post(`/performance/cycles/${id}/close`, {});
  },

  /**
   * Archive CLOSED cycle
   * POST /performance/cycles/:id/archive
   */
  archiveCycle: async (id: string) => {
    return apiService.post(`/performance/cycles/${id}/archive`, {});
  },

  // =============================================
  // Assignments
  // =============================================

  /**
   * Create assignment
   * POST /performance/assignments
   */
  createAssignment: async (data: any) => {
    return apiService.post(`/performance/assignments`, data);
  },

  /**
   * Bulk create assignments
   * POST /performance/assignments/bulk
   */
  bulkCreateAssignments: async (data: any) => {
    return apiService.post(`/performance/assignments/bulk`, data);
  },

  /**
   * Search assignments (paginated)
   * GET /performance/assignments
   */
  searchAssignments: async (q?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/performance/assignments${query}`);
  },

  /**
   * Get assignments for manager
   * GET /performance/assignments/manager/:id
   */
  getAssignmentsForManager: async (managerId: string, page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/performance/assignments/manager/${managerId}${query}`);
  },

  /**
   * Get assignments for employee
   * GET /performance/assignments/employee/:id
   */
  getAssignmentsForEmployee: async (employeeId: string, page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/performance/assignments/employee/${employeeId}${query}`);
  },

  /**
   * Get assignment by ID
   * GET /performance/assignments/:id
   */
  getAssignmentById: async (id: string) => {
    return apiService.get(`/performance/assignments/${id}`);
  },

  // =============================================
  // Records
  // =============================================

  /**
   * Submit appraisal record
   * POST /performance/records
   */
  submitAppraisalRecord: async (data: any) => {
    return apiService.post(`/performance/records`, data);
  },

  /**
   * Save draft record
   * POST /performance/records/draft
   */
  saveDraftRecord: async (data: any) => {
    return apiService.post(`/performance/records/draft`, data);
  },

  /**
   * Search records (paginated)
   * GET /performance/records
   */
  searchRecords: async (q?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/performance/records${query}`);
  },

  /**
   * Get record by assignment
   * GET /performance/records/assignment/:id
   */
  getRecordByAssignment: async (assignmentId: string) => {
    return apiService.get(`/performance/records/assignment/${assignmentId}`);
  },

  /**
   * Get record by ID
   * GET /performance/records/:id
   */
  getRecordById: async (id: string) => {
    return apiService.get(`/performance/records/${id}`);
  },

  /**
   * Publish record
   * POST /performance/records/:id/publish
   */
  publishRecord: async (id: string) => {
    return apiService.post(`/performance/records/${id}/publish`, {});
  },

  /**
   * Bulk publish records
   * POST /performance/records/bulk-publish
   */
  bulkPublishRecords: async (data: any) => {
    return apiService.post(`/performance/records/bulk-publish`, data);
  },

  /**
   * Acknowledge record (employee)
   * POST /performance/records/:id/acknowledge
   */
  acknowledgeRecord: async (id: string) => {
    return apiService.post(`/performance/records/${id}/acknowledge`, {});
  },

  /**
   * Mark record as viewed (employee)
   * POST /performance/records/:id/view
   */
  markRecordViewed: async (id: string) => {
    return apiService.post(`/performance/records/${id}/view`, {});
  },

  /**
   * Get employee appraisal history
   * GET /performance/employee/:id/history
   */
  getEmployeeAppraisalHistory: async (employeeId?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    const endpoint = employeeId
      ? `/performance/employee/${employeeId}/history${query}`
      : `/performance/employee/me/history${query}`;
    return apiService.get(endpoint);
  },

  // =============================================
  // Disputes
  // =============================================

  /**
   * File dispute/objection
   * POST /performance/disputes
   */
  fileDispute: async (data: any) => {
    return apiService.post(`/performance/disputes`, data);
  },

  /**
   * Search disputes (paginated)
   * GET /performance/disputes
   */
  searchDisputes: async (q?: string, page?: number, limit?: number) => {
    const query = buildQueryString({ q, page, limit });
    return apiService.get(`/performance/disputes${query}`);
  },

  /**
   * Get dispute statistics
   * GET /performance/disputes/stats
   */
  getDisputeStats: async () => {
    return apiService.get(`/performance/disputes/stats`);
  },

  /**
   * Get dispute by ID
   * GET /performance/disputes/:id
   */
  getDisputeById: async (id: string) => {
    return apiService.get(`/performance/disputes/${id}`);
  },

  /**
   * Assign dispute reviewer
   * PATCH /performance/disputes/:id/assign-reviewer
   */
  assignDisputeReviewer: async (id: string, data: any) => {
    return apiService.patch(`/performance/disputes/${id}/assign-reviewer`, data);
  },

  /**
   * Resolve dispute
   * PATCH /performance/disputes/:id/resolve
   */
  resolveDispute: async (id: string, data: any) => {
    return apiService.patch(`/performance/disputes/${id}/resolve`, data);
  },

  // =============================================
  // Dashboard
  // =============================================

  /**
   * Get completion dashboard
   * GET /performance/dashboard/:cycleId
   */
  getCompletionDashboard: async (cycleId: string) => {
    return apiService.get(`/performance/dashboard/${cycleId}`);
  },

  // =============================================
  // Self-Service (Employee Portal)
  // =============================================

  /**
   * Get my appraisal history
   * GET /performance/employee/me/history
   */
  getAppraisalHistory: async () => {
    return apiService.get(`/performance/employee/me/history`);
  },

  /**
   * Get my goals
   * GET /performance/employee/me/goals
   */
  getMyGoals: async () => {
    return apiService.get(`/performance/employee/me/goals`);
  },

  /**
   * Get my current appraisal
   * GET /performance/employee/me/current
   */
  getMyCurrentAppraisal: async () => {
    return apiService.get(`/performance/employee/me/current`);
  },
};

