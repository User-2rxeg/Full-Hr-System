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
 * Configuration for API mode
 * Set USE_AUTH_ENDPOINTS to true when using the authenticated controller in production
 * Set to false when using the no-auth testing controller
 */
const USE_AUTH_ENDPOINTS = true; // Production mode - user ID extracted from JWT token

/**
 * Helper to build the self-service endpoint path
 * - Auth mode: /employee-profile/me (user ID from JWT token)
 * - No-auth mode: /employee-profile/me/:userId (user ID in path)
 */
const getMePath = (userId?: string, suffix: string = '') => {
  if (USE_AUTH_ENDPOINTS) {
    return `/employee-profile/me${suffix}`;
  }
  if (!userId) throw new Error('User ID is required');
  return `/employee-profile/me/${userId}${suffix}`;
};

/**
 * Employee Profile Service
 * Handles all employee profile CRUD operations and corrections
 *
 * NOTE: When USE_AUTH_ENDPOINTS is true, the userId parameter is ignored
 * and the user ID is extracted from the JWT token on the backend.
 */
export const employeeProfileService = {


  getMyProfile: async (userId?: string) => {
    return apiService.get(getMePath(userId));
  },

  /**
   * Update contact information
   * Auth: PATCH /employee-profile/me/contact-info
   * No-auth: PATCH /employee-profile/me/:userId/contact-info
   */
  updateContactInfo: async (userId: string, data: any) => {
    return apiService.patch(getMePath(userId, '/contact-info'), data);
  },

  /**
   * Update biography and photo
   * Auth: PATCH /employee-profile/me/bio
   * No-auth: PATCH /employee-profile/me/:userId/bio
   */
  updateBio: async (userId: string, data: any) => {
    return apiService.patch(getMePath(userId, '/bio'), data);
  },

  /**
   * Submit correction request
   * Auth: POST /employee-profile/me/correction-request
   * No-auth: POST /employee-profile/me/:userId/correction-request
   */
  submitCorrectionRequest: async (userId: string, data: any) => {
    return apiService.post(getMePath(userId, '/correction-request'), data);
  },

  /**
   * Get own correction requests (paginated)
   * Auth: GET /employee-profile/me/correction-requests
   * No-auth: GET /employee-profile/me/:userId/correction-requests
   */
  getMyCorrectionRequests: async (userId: string, page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(getMePath(userId, `/correction-requests${query}`));
  },

  /**
   * Cancel own correction request
   * Auth: PATCH /employee-profile/me/correction-requests/:requestId/cancel
   * No-auth: PATCH /employee-profile/me/:userId/correction-requests/:requestId/cancel
   */
  cancelCorrectionRequest: async (userId: string, requestId: string) => {
    return apiService.patch(getMePath(userId, `/correction-requests/${requestId}/cancel`), {});
  },

  // =============================================
  // Document Management
  // =============================================

  /**
   * Upload a document
   * Auth: POST /employee-profile/me/documents
   * No-auth: POST /employee-profile/me/:userId/documents
   */
  uploadDocument: async (userId: string, data: any) => {
    return apiService.post(getMePath(userId, '/documents'), data);
  },

  /**
   * Get all my documents
   * Auth: GET /employee-profile/me/documents
   * No-auth: GET /employee-profile/me/:userId/documents
   */
  getMyDocuments: async (userId: string) => {
    return apiService.get(getMePath(userId, '/documents'));
  },

  /**
   * Get a specific document (full data including file)
   * Auth: GET /employee-profile/me/documents/:documentId
   * No-auth: GET /employee-profile/me/:userId/documents/:documentId
   */
  getDocument: async (userId: string, documentId: string) => {
    return apiService.get(getMePath(userId, `/documents/${documentId}`));
  },

  /**
   * Delete a document
   * Auth: DELETE /employee-profile/me/documents/:documentId
   * No-auth: DELETE /employee-profile/me/:userId/documents/:documentId
   */
  deleteDocument: async (userId: string, documentId: string) => {
    return apiService.delete(getMePath(userId, `/documents/${documentId}`));
  },

  // =============================================
  // Emergency Contact Management
  // =============================================

  /**
   * Get all emergency contacts
   * Auth: GET /employee-profile/me/emergency-contacts
   * No-auth: GET /employee-profile/me/:userId/emergency-contacts
   */
  getEmergencyContacts: async (userId: string) => {
    return apiService.get(getMePath(userId, '/emergency-contacts'));
  },

  /**
   * Add emergency contact
   * Auth: POST /employee-profile/me/emergency-contacts
   * No-auth: POST /employee-profile/me/:userId/emergency-contacts
   */
  addEmergencyContact: async (userId: string, data: any) => {
    return apiService.post(getMePath(userId, '/emergency-contacts'), data);
  },

  /**
   * Update emergency contact
   * Auth: PATCH /employee-profile/me/emergency-contacts/:index
   * No-auth: PATCH /employee-profile/me/:userId/emergency-contacts/:index
   */
  updateEmergencyContact: async (userId: string, index: number, data: any) => {
    return apiService.patch(getMePath(userId, `/emergency-contacts/${index}`), data);
  },

  /**
   * Delete emergency contact
   * Auth: DELETE /employee-profile/me/emergency-contacts/:index
   * No-auth: DELETE /employee-profile/me/:userId/emergency-contacts/:index
   */
  deleteEmergencyContact: async (userId: string, index: number) => {
    return apiService.delete(getMePath(userId, `/emergency-contacts/${index}`));
  },

  // =============================================
  // Qualification (Education) Management
  // =============================================

  /**
   * Get all qualifications
   */
  getQualifications: async (userId: string) => {
    return apiService.get(getMePath(userId, '/qualifications'));
  },

  /**
   * Add qualification
   */
  addQualification: async (userId: string, data: any) => {
    return apiService.post(getMePath(userId, '/qualifications'), data);
  },

  /**
   * Update qualification
   */
  updateQualification: async (userId: string, id: string, data: any) => {
    return apiService.patch(getMePath(userId, `/qualifications/${id}`), data);
  },

  /**
   * Delete qualification
   */
  deleteQualification: async (userId: string, id: string) => {
    return apiService.delete(getMePath(userId, `/qualifications/${id}`));
  },


  // =============================================
  // Manager Endpoints (Team View)
  // =============================================

  /**
   * Get team profiles
   * GET /employee-profile/team
   */
  getTeamProfiles: async () => {
    return apiService.get(`/employee-profile/team`);
  },

  /**
   * Get team profiles (paginated)
   * GET /employee-profile/team/paginated
   */
  getTeamProfilesPaginated: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/team/paginated${query}`);
  },

  // =============================================
  // HR Admin Endpoints (Master Data)
  // =============================================

  /**
   * Get all employees (paginated with optional filters)
   * GET /employee-profile/admin/employees
   */
  getAllEmployees: async (page?: number, limit?: number, status?: string, departmentId?: string) => {
    const query = buildQueryString({ page, limit, status, departmentId });
    return apiService.get(`/employee-profile/admin/employees${query}`);
  },

  /**
   * Search employees (paginated)
   * GET /employee-profile/admin/search
   */
  searchEmployees: async (q: string, page?: number, limit?: number, status?: string) => {
    const query = buildQueryString({ query: q, page, limit, status });
    return apiService.get(`/employee-profile/admin/search${query}`);
  },

  /**
   * Get all change requests (paginated)
   * GET /employee-profile/admin/change-requests
   */
  getAllChangeRequests: async (page?: number, limit?: number) => {
    const query = buildQueryString({ page, limit });
    return apiService.get(`/employee-profile/admin/change-requests${query}`);
  },

  /**
   * Get single change request
   * GET /employee-profile/admin/change-requests/:requestId
   */
  getChangeRequest: async (requestId: string) => {
    return apiService.get(`/employee-profile/admin/change-requests/${requestId}`);
  },

  /**
   * Process (approve/reject) change request
   * PATCH /employee-profile/admin/change-requests/:requestId/process
   */
  processChangeRequest: async (requestId: string, data: any) => {
    return apiService.patch(`/employee-profile/admin/change-requests/${requestId}/process`, data);
  },

  /**
   * Get pending change requests count
   * GET /employee-profile/admin/change-requests/count/pending
   */
  getPendingChangeRequestsCount: async () => {
    return apiService.get(`/employee-profile/admin/change-requests/count/pending`);
  },

  /**
   * Get employee count by status
   * GET /employee-profile/admin/stats/by-status
   */
  getEmployeeCountByStatus: async () => {
    return apiService.get(`/employee-profile/admin/stats/by-status`);
  },

  /**
   * Get employee count by department
   * GET /employee-profile/admin/stats/by-department
   */
  getEmployeeCountByDepartment: async () => {
    return apiService.get(`/employee-profile/admin/stats/by-department`);
  },

  /**
   * Get employee profile (admin view)
   * GET /employee-profile/:id
   */
  getEmployeeProfile: async (id: string) => {
    return apiService.get(`/employee-profile/${id}`);
  },

  /**
   * Update employee profile (admin)
   * PATCH /employee-profile/:id
   */
  updateEmployeeProfile: async (id: string, data: any) => {
    return apiService.patch(`/employee-profile/${id}`, data);
  },

  /**
   * Deactivate employee
   * PATCH /employee-profile/:id/deactivate
   */
  deactivateEmployee: async (id: string, data?: any) => {
    return apiService.patch(`/employee-profile/${id}/deactivate`, data || {});
  },

  /**
   * Assign role to employee
   * PATCH /employee-profile/:id/role
   */
  assignRole: async (id: string, data: any) => {
    return apiService.patch(`/employee-profile/${id}/role`, data);
  },
};

