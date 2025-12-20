import apiService from '../api';

// Helper function to get post-leave configuration
const getPostLeaveConfigHelper = () => {
  return {
    maxPostLeaveDays: 30,
    enabled: true,
  };
};

// Helper function to validate post-leave request dates
const validatePostLeaveRequestHelper = (toDate: string) => {
  const config = getPostLeaveConfigHelper();
  const endDate = new Date(toDate);
  const now = new Date();
  const diffMs = now.getTime() - endDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > config.maxPostLeaveDays) {
    return {
      valid: false,
      error: `Post-leave requests must be submitted within ${config.maxPostLeaveDays} days after leave end. Your leave ended ${diffDays} days ago.`,
      daysSinceLeaveEnd: diffDays,
      maxAllowedDays: config.maxPostLeaveDays,
    };
  }

  return {
    valid: true,
    error: null,
    daysSinceLeaveEnd: diffDays,
    maxAllowedDays: config.maxPostLeaveDays,
  };
};

// Helper function to calculate unpaid leave deduction
const calculateUnpaidDeductionHelper = (
  baseSalary: number,
  workDaysInMonth: number,
  unpaidLeaveDays: number
) => {
  const dailyRate = baseSalary / workDaysInMonth;
  const deductionAmount = dailyRate * unpaidLeaveDays;
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    deductionAmount: Math.round(deductionAmount * 100) / 100,
    formula: `(${baseSalary} / ${workDaysInMonth}) × ${unpaidLeaveDays}`,
    netSalary: Math.round((baseSalary - deductionAmount) * 100) / 100,
  };
};

// Unified leaves API client aligned with backend `UnifiedLeaveController`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const leavesService: Record<string, any> = {
  // Create a new leave request
  submitRequest: async (data: {
    employeeId: string;
    leaveTypeId: string;
    from: string;
    to: string;
    durationDays?: number;
    justification?: string;
    attachmentId?: string;
    postLeave?: boolean;
  }) => {
    return apiService.post('/leaves/requests', data);
  },

  // Get the current employee's leave history ("My Leaves") with filtering and sorting
  getMyRequests: async (employeeId: string, params?: {
    status?: string;
    leaveTypeId?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = qs
      ? `/leaves/employees/${employeeId}/history?${qs}`
      : `/leaves/employees/${employeeId}/history`;

    return apiService.get(endpoint);
  },

  // Get the current employee's leave balances by leave type
  getBalance: async (employeeId: string) => {
    return apiService.get(`/leaves/employees/${employeeId}/balances`);
  },

  // Update an existing leave request
  updateRequest: async (
    id: string,
    data: Partial<{
      from: string;
      to: string;
      durationDays: number;
      justification: string;
      attachmentId: string;
      postLeave: boolean;
    }>,
  ) => {
    return apiService.patch(`/leaves/requests/${id}`, data);
  },

  // Cancel a leave request for the given employee
  cancelRequest: async (id: string, employeeId: string) => {
    return apiService.patch(`/leaves/requests/${id}/cancel?employeeId=${employeeId}`);
  },

  // Get all leave types
  getLeaveTypes: async () => {
    return apiService.get('/leaves/types');
  },

  // Get a single leave request by id
  getRequest: async (id: string) => {
    return apiService.get(`/leaves/requests/${id}`);
  },

  // Save an attachment metadata record
  saveAttachment: async (data: {
    originalName: string;
    filePath: string;
    fileType?: string;
    size?: number;
  }) => {
    return apiService.post('/leaves/attachments', data);
  },

  // HR Manager / Admin functions
  // Get all leave requests (for HR/Admin)
  getAllRequests: async (params?: {
    page?: number;
    limit?: number;
    employeeId?: string;
    status?: string;
    leaveTypeId?: string;
    from?: string;
    to?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.status) query.set('status', params.status);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return apiService.get(qs ? `/leaves/requests?${qs}` : '/leaves/requests');
  },

  // Manager approve/reject
  managerApprove: async (id: string, managerId: string) => {
    return apiService.patch(`/leaves/requests/${id}/manager-approve?managerId=${managerId}`);
  },

  managerReject: async (id: string, managerId: string, reason?: string) => {
    const query = new URLSearchParams();
    query.set('managerId', managerId);
    if (reason) query.set('reason', reason);
    return apiService.patch(`/leaves/requests/${id}/manager-reject?${query.toString()}`);
  },

  // ============================================
  // MANAGER TEAM VIEW METHODS
  // ============================================

  // Get team members' leave balances
  getTeamBalances: async (managerId: string, params?: {
    department?: string;
    leaveTypeId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/team-balances?${qs}`
      : `/leaves/manager/${managerId}/team-balances`
    );
  },

  // Get team members' leave requests (upcoming/history)
  getTeamRequests: async (managerId: string, params?: {
    leaveTypeId?: string;
    status?: string;
    department?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.status) query.set('status', params.status);
    if (params?.department) query.set('department', params.department);
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/team-requests?${qs}`
      : `/leaves/manager/${managerId}/team-requests`
    );
  },

  // Get irregular leave patterns for team
  getIrregularPatterns: async (managerId: string, params?: {
    department?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.department) query.set('department', params.department);
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/manager/${managerId}/irregular-patterns?${qs}`
      : `/leaves/manager/${managerId}/irregular-patterns`
    );
  },

  // Flag a leave request as irregular
  flagIrregular: async (requestId: string, flag: boolean, reason?: string) => {
    return apiService.post(`/leaves/manager/flag-irregular/${requestId}`, {
      flag,
      reason,
    });
  },

  // Return leave request for correction (manager/HR can return to employee for fixes)
  returnForCorrection: async (id: string, reviewerId: string, reason: string) => {
    const query = new URLSearchParams();
    query.set('reviewerId', reviewerId);
    query.set('reason', reason);
    return apiService.patch(`/leaves/requests/${id}/return-for-correction?${query.toString()}`);
  },

  // Resubmit a corrected leave request (employee resubmits after corrections)
  resubmitCorrectedRequest: async (id: string, employeeId: string, corrections: Partial<{
    from: string;
    to: string;
    justification: string;
    attachmentId: string;
  }>) => {
    return apiService.patch(`/leaves/requests/${id}/resubmit?employeeId=${employeeId}`, corrections);
  },

  // HR finalize (approve/reject)
  hrFinalize: async (id: string, hrId: string, decision: 'approve' | 'reject', allowNegative?: boolean, reason?: string, isOverride?: boolean) => {
    const query = new URLSearchParams();
    query.set('hrId', hrId);
    query.set('decision', decision);
    if (allowNegative) query.set('allowNegative', 'true');
    if (reason) query.set('reason', reason);
    if (isOverride) query.set('isOverride', 'true');
    return apiService.patch(`/leaves/requests/${id}/hr-finalize?${query.toString()}`);
  },

  // Bulk process leave requests (REQ-027)
  bulkProcessRequests: async (requestIds: string[], action: 'approve' | 'reject', actorId: string) => {
    return apiService.post('/leaves/requests/bulk-process', {
      requestIds,
      action,
      actorId,
    });
  },

  // Get attachment details (REQ-028)
  getAttachment: async (attachmentId: string) => {
    return apiService.get(`/leaves/attachments/${attachmentId}`);
  },

  // Validate medical attachment (REQ-028)
  validateMedicalAttachment: async (attachmentId: string, verifiedBy?: string) => {
    const query = verifiedBy ? `?verifiedBy=${verifiedBy}` : '';
    return apiService.post(`/leaves/attachments/${attachmentId}/validate-medical${query}`);
  },

  // HR finalize with payroll sync - updates employee records and calculates payroll adjustments
  hrFinalizeWithPayrollSync: async (
    requestId: string,
    hrId: string,
    decision: 'approve' | 'reject',
    options?: {
      allowNegative?: boolean;
      syncPayroll?: boolean;
      baseSalary?: number;
      workDaysInMonth?: number;
      durationDays?: number;
      leaveTypeName?: string;
    }
  ): Promise<{
    ok: boolean;
    message: string;
    request?: {
      _id?: string;
      id?: string;
      employeeId?: string;
      leaveTypeId?: string;
      status?: string;
      approvalFlow?: Array<{ role: string; status: string }>;
    };
    payrollImpact?: {
      isUnpaidLeave: boolean;
      deductionAmount: number;
      dailyRate: number;
      daysDeducted: number;
      formula: string;
    };
    balanceUpdate?: {
      leaveTypeName: string;
      previousBalance: number;
      newBalance: number;
      daysDeducted: number;
    };
    error?: string;
  }> => {
    try {
      // Perform the finalization directly
      const query = new URLSearchParams();
      query.set('hrId', hrId);
      query.set('decision', decision);
      if (options?.allowNegative) query.set('allowNegative', 'true');

      const finalizeResponse = await apiService.patch(`/leaves/requests/${requestId}/hr-finalize?${query.toString()}`);

      if (finalizeResponse.error) {
        return { ok: false, message: 'Failed to finalize request', error: finalizeResponse.error };
      }

      const durationDays = options?.durationDays || 0;
      const leaveTypeName = options?.leaveTypeName || 'Leave';
      const isUnpaidLeave = (leaveTypeName || '').toLowerCase().includes('unpaid');

      // Calculate payroll impact for approved unpaid leaves
      let payrollImpact = undefined;
      if (decision === 'approve' && isUnpaidLeave && options?.syncPayroll && durationDays > 0) {
        const baseSalary = options.baseSalary || 5000;
        const workDays = options.workDaysInMonth || 22;
        const dailyRate = baseSalary / workDays;
        const deductionAmount = dailyRate * durationDays;

        payrollImpact = {
          isUnpaidLeave: true,
          deductionAmount: Math.round(deductionAmount * 100) / 100,
          dailyRate: Math.round(dailyRate * 100) / 100,
          daysDeducted: durationDays,
          formula: `(${baseSalary} / ${workDays}) × ${durationDays} = $${deductionAmount.toFixed(2)}`,
        };
      }

      // Calculate balance update for approved leaves
      let balanceUpdate = undefined;
      if (decision === 'approve' && durationDays > 0) {
        balanceUpdate = {
          leaveTypeName,
          previousBalance: 0, // We don't fetch this anymore
          newBalance: 0,
          daysDeducted: durationDays,
        };
      }

      return {
        ok: true,
        message: decision === 'approve'
          ? `Leave request approved successfully!${durationDays > 0 ? ` ${durationDays} days of ${leaveTypeName} will be deducted.` : ''}`
          : 'Leave request rejected.',
        request: finalizeResponse.data ? {
          _id: (finalizeResponse.data as Record<string, unknown>)?._id as string | undefined,
          id: (finalizeResponse.data as Record<string, unknown>)?.id as string | undefined,
          employeeId: (finalizeResponse.data as Record<string, unknown>)?.employeeId as string | undefined,
          leaveTypeId: (finalizeResponse.data as Record<string, unknown>)?.leaveTypeId as string | undefined,
          status: (finalizeResponse.data as Record<string, unknown>)?.status as string | undefined,
        } : undefined,
        payrollImpact,
        balanceUpdate,
      };
    } catch (err) {
      console.error('HR finalize with payroll sync error:', err);
      return {
        ok: false,
        message: 'Failed to finalize leave request',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },

  // Assign entitlement to employee
  assignEntitlement: async (data: {
    employeeId: string;
    leaveTypeId: string;
    yearlyEntitlement: number;
  }) => {
    return apiService.post('/leaves/entitlements/assign', data);
  },

  // Get employee entitlements
  getEntitlements: async (employeeId: string) => {
    return apiService.get(`/leaves/entitlements/${employeeId}`);
  },
// Get employee entitlement summary
getEntitlementSummary: async (employeeId: string) => {
  return apiService.get(`/leaves/employees/${employeeId}/entitlement-summary`);
},
// Get adjustment history
getAdjustmentHistory: async (employeeId: string, leaveTypeId?: string) => {
  const qs = leaveTypeId ? `?leaveTypeId=${leaveTypeId}` : '';
  return apiService.get(`/leaves/employees/${employeeId}/adjustment-history${qs}`);
},



  // Create manual balance adjustment
  createAdjustment: async (data: {
    employeeId: string;
    leaveTypeId: string;
    adjustmentType: 'add' | 'deduct' | 'encashment';
    amount: number;
    reason: string;
    hrUserId: string;
  }) => {
    return apiService.post('/leaves/adjustments', data);
  },

  // ============================================
  // HR ADMIN CONFIGURATION METHODS
  // ============================================

  // Leave Categories
  createCategory: async (data: { name: string; description?: string }) => {
    return apiService.post('/leaves/categories', data);
  },

  getAllCategories: async () => {
    return apiService.get('/leaves/categories');
  },

  getCategory: async (id: string) => {
    return apiService.get(`/leaves/categories/${id}`);
  },

  updateCategory: async (id: string, data: { name?: string; description?: string }) => {
    return apiService.put(`/leaves/categories/${id}`, data);
  },

  deleteCategory: async (id: string) => {
    return apiService.delete(`/leaves/categories/${id}`);
  },

  // Leave Types
  createLeaveType: async (data: {
    code: string;
    name: string;
    categoryId: string;
    description?: string;
    paid?: boolean;
    deductible?: boolean;
    requiresAttachment?: boolean;
    attachmentType?: 'medical' | 'document' | 'other';
    minTenureMonths?: number;
    maxDurationDays?: number;
  }) => {
    return apiService.post('/leaves/types', data);
  },

  updateLeaveType: async (id: string, data: {
    code?: string;
    name?: string;
    categoryId?: string;
    description?: string;
    paid?: boolean;
    deductible?: boolean;
    requiresAttachment?: boolean;
    attachmentType?: 'medical' | 'document' | 'other';
    minTenureMonths?: number;
    maxDurationDays?: number;
  }) => {
    return apiService.put(`/leaves/types/${id}`, data);
  },

  deleteLeaveType: async (id: string) => {
    return apiService.delete(`/leaves/types/${id}`);
  },

  getLeaveType: async (id: string) => {
    return apiService.get(`/leaves/types/${id}`);
  },

  // Leave Eligibility
  setEligibility: async (id: string, data: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
    employmentTypes?: string[];
  }) => {
    return apiService.patch(`/leaves/types/${id}/eligibility`, data);
  },

  // Leave Policies
  createPolicy: async (data: {
    leaveTypeId: string;
    accrualMethod: 'monthly' | 'yearly' | 'per-term';
    monthlyRate?: number;
    yearlyRate?: number;
    carryForwardAllowed?: boolean;
    maxCarryForward?: number;
    expiryAfterMonths?: number;
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
    minNoticeDays?: number;
    maxConsecutiveDays?: number;
  }) => {
    return apiService.post('/leaves/policies', data);
  },

  getPolicies: async () => {
    return apiService.get('/leaves/policies');
  },

  getPolicyByLeaveType: async (leaveTypeId: string) => {
    return apiService.get(`/leaves/policies/by-leave-type/${leaveTypeId}`);
  },

  getPolicy: async (id: string) => {
    return apiService.get(`/leaves/policies/${id}`);
  },

  updatePolicy: async (id: string, data: {
    accrualMethod?: 'monthly' | 'yearly' | 'per-term';
    monthlyRate?: number;
    yearlyRate?: number;
    carryForwardAllowed?: boolean;
    maxCarryForward?: number;
    expiryAfterMonths?: number;
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
    minNoticeDays?: number;
    maxConsecutiveDays?: number;
  }) => {
    return apiService.put(`/leaves/policies/${id}`, data);
  },

  deletePolicy: async (id: string) => {
    return apiService.delete(`/leaves/policies/${id}`);
  },

  // Calendar & Holidays
  addHoliday: async (data: { year: number; date: string; reason?: string }) => {
    return apiService.post('/leaves/calendar/holidays', data);
  },

  addBlockedPeriod: async (data: { year: number; from: string; to: string; reason: string }) => {
    return apiService.post('/leaves/calendar/blocked-periods', data);
  },

  getCalendar: async (year: number) => {
    return apiService.get(`/leaves/calendar/${year}`);
  },

  updateCalendar: async (year: number, data: { holidays?: string[]; blockedPeriods?: Array<{ from: string; to: string; reason: string }> }) => {
    return apiService.put(`/leaves/calendar/${year}`, data);
  },

  removeHoliday: async (year: number, date: string) => {
    return apiService.delete(`/leaves/calendar/${year}/holidays?date=${date}`);
  },

  // Accruals & Carry Forward
  runAccrual: async (data?: {
    referenceDate?: string;
    method?: 'monthly' | 'yearly' | 'per-term';
    roundingRule?: 'none' | 'round' | 'round_up' | 'round_down';
  }) => {
    const query = data?.referenceDate ? `?referenceDate=${data.referenceDate}` : '';
    return apiService.post(`/leaves/accruals/run${query}`, {
      method: data?.method,
      roundingRule: data?.roundingRule,
    });
  },

  carryForward: async (data?: {
    referenceDate?: string;
    capDays?: number;
    expiryMonths?: number;
    leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
    dryRun?: boolean;
  }) => {
    const query = data?.referenceDate ? `?referenceDate=${data.referenceDate}` : '';
    return apiService.post(`/leaves/accruals/carryforward${query}`, {
      capDays: data?.capDays,
      expiryMonths: data?.expiryMonths,
      leaveTypeRules: data?.leaveTypeRules,
      dryRun: data?.dryRun,
    });
  },

  // Preview carry-forward without making changes
  previewCarryForward: async (data?: {
    referenceDate?: string;
    capDays?: number;
    expiryMonths?: number;
    leaveTypeRules?: Record<string, { cap: number; expiryMonths: number; canCarryForward: boolean }>;
  }) => {
    const query = data?.referenceDate ? `?referenceDate=${data.referenceDate}` : '';
    return apiService.post(`/leaves/accruals/carryforward/preview${query}`, {
      capDays: data?.capDays,
      expiryMonths: data?.expiryMonths,
      leaveTypeRules: data?.leaveTypeRules,
    });
  },

  // Override carry-forward for specific employee
  overrideCarryForward: async (data: {
    employeeId: string;
    leaveTypeId: string;
    carryForwardDays: number;
    expiryDate?: string;
    reason?: string;
  }) => {
    return apiService.post('/leaves/accruals/carryforward/override', data);
  },

  // Get carry-forward report
  getCarryForwardReport: async (params?: {
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', params.employeeId);
    if (params?.leaveTypeId) query.set('leaveTypeId', params.leaveTypeId);
    if (params?.year) query.set('year', params.year.toString());
    const qs = query.toString();
    return apiService.get(qs
      ? `/leaves/accruals/carryforward/report?${qs}`
      : '/leaves/accruals/carryforward/report'
    );
  },

  recalcEmployee: async (employeeId: string) => {
    return apiService.get(`/leaves/accruals/employee/${employeeId}/recalc`);
  },

 // Leave Year Reset
resetLeaveYear: async (data: {
  strategy: "hireDate" | "calendarYear" | "custom";
  referenceDate?: string;
  dryRun?: boolean;
}) => apiService.post("/leaves/accruals/reset-year", data),



  // ============================================
  // LEAVE REQUEST VALIDATION HELPERS
  // ============================================


  // Check if employee has overlapping leave requests
  checkOverlappingRequests: async (employeeId: string, from: string, to: string) => {
    // Get employee's history and check for overlaps
    const response = await apiService.get(`/leaves/employees/${employeeId}/history`);
    if (response.error || !response.data) {
      return { hasOverlap: false, overlappingRequest: null };
    }

    // Handle different response structures - could be array directly or object with data property
    let requests: Array<{
      _id?: string;
      id?: string;
      status: string;
      dates: { from: string; to: string };
    }> = [];

    if (Array.isArray(response.data)) {
      requests = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Check if it's an object with a data/requests/items array
      const dataObj = response.data as Record<string, unknown>;
      if (Array.isArray(dataObj.data)) {
        requests = dataObj.data;
      } else if (Array.isArray(dataObj.requests)) {
        requests = dataObj.requests;
      } else if (Array.isArray(dataObj.items)) {
        requests = dataObj.items;
      }
    }

    // If still not an array, return no overlap
    if (!Array.isArray(requests)) {
      return { hasOverlap: false, overlappingRequest: null };
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Check for overlaps with PENDING or APPROVED requests
    const overlap = requests.find((req) => {
      if (!req || !req.dates) return false;
      if (req.status !== 'pending' && req.status !== 'approved') {
        return false;
      }
      const reqFrom = new Date(req.dates.from);
      const reqTo = new Date(req.dates.to);
      // Overlap: fromDate <= reqTo AND toDate >= reqFrom
      return fromDate <= reqTo && toDate >= reqFrom;
    });

    return {
      hasOverlap: !!overlap,
      overlappingRequest: overlap || null,
    };
  },

  // Get post-leave configuration (maximum days after leave to submit)
  getPostLeaveConfig: () => {
    return getPostLeaveConfigHelper();
  },

  // Validate post-leave request dates
  validatePostLeaveRequest: (toDate: string) => {
    return validatePostLeaveRequestHelper(toDate);
  },

  // Check if attachment is required for leave type
  checkAttachmentRequirement: async (leaveTypeId: string, durationDays: number) => {
    const response = await apiService.get(`/leaves/types/${leaveTypeId}`);
    if (response.error || !response.data) {
      return { required: false, reason: null };
    }

    const leaveType = response.data as {
      _id?: string;
      name?: string;
      code?: string;
      requiresAttachment?: boolean;
      attachmentType?: string;
    };

    const typeName = (leaveType.name || '').toLowerCase();
    const isSick = typeName.includes('sick');

    // Attachment required if:
    // 1. Leave type requires attachment, OR
    // 2. Sick leave exceeding 1 day (REQ-028: Medical certificate required)
    if (leaveType.requiresAttachment) {
      return {
        required: true,
        reason: `Attachment is required for ${leaveType.name}`,
        attachmentType: leaveType.attachmentType || 'document',
      };
    }

    if (isSick && durationDays > 1) {
      return {
        required: true,
        reason: 'Medical certificate is required for sick leave exceeding 1 day',
        attachmentType: 'medical',
      };
    }

    return { required: false, reason: null };
  },

  // Full validation before submitting leave request (mirrors backend logic)
  validateLeaveRequest: async (data: {
    employeeId: string;
    leaveTypeId: string;
    from: string;
    to: string;
    durationDays: number;
    postLeave?: boolean;
    hasAttachment?: boolean;
    availableBalance: number;
  }) => {
    const errors: string[] = [];

    // 1. Check required fields
    if (!data.employeeId || !data.leaveTypeId || !data.from || !data.to) {
      errors.push('Missing required fields');
    }

    // 2. Check duration
    if (data.durationDays <= 0) {
      errors.push('Invalid date range - duration must be at least 1 day');
    }

    // 3. Post-leave validation
    if (data.postLeave) {
      const postLeaveValidation = validatePostLeaveRequestHelper(data.to);
      if (!postLeaveValidation.valid) {
        errors.push(postLeaveValidation.error!);
      }
    }

    // 4. Balance check (skip for post-leave)
    if (!data.postLeave && data.durationDays > data.availableBalance) {
      errors.push(
        `Insufficient leave balance. You have ${data.availableBalance} days available but requested ${data.durationDays} days. You can submit a post-leave request for emergencies.`
      );
    }

    // 5. Check for overlapping requests
    const historyResponse = await apiService.get(`/leaves/employees/${data.employeeId}/history`);
    if (!historyResponse.error && historyResponse.data) {
      let requests: Array<{ status: string; dates: { from: string; to: string } }> = [];
      if (Array.isArray(historyResponse.data)) {
        requests = historyResponse.data;
      } else if (historyResponse.data && typeof historyResponse.data === 'object') {
        const dataObj = historyResponse.data as Record<string, unknown>;
        if (Array.isArray(dataObj.data)) requests = dataObj.data;
        else if (Array.isArray(dataObj.requests)) requests = dataObj.requests;
        else if (Array.isArray(dataObj.items)) requests = dataObj.items;
      }

      const fromDate = new Date(data.from);
      const toDate = new Date(data.to);
      const hasOverlap = requests.some((req) => {
        if (!req?.dates) return false;
        const status = (req.status || '').toLowerCase();
        if (status !== 'pending' && status !== 'approved') return false;
        const reqFrom = new Date(req.dates.from);
        const reqTo = new Date(req.dates.to);
        return fromDate <= reqTo && toDate >= reqFrom;
      });

      if (hasOverlap) {
        errors.push('You already have a pending or approved leave request for these dates');
      }
    }

    // 6. Check attachment requirement
    const leaveTypeResponse = await apiService.get(`/leaves/types/${data.leaveTypeId}`);
    if (!leaveTypeResponse.error && leaveTypeResponse.data) {
      const leaveType = leaveTypeResponse.data as { name?: string; requiresAttachment?: boolean; attachmentType?: string };
      const typeName = (leaveType.name || '').toLowerCase();
      const isSick = typeName.includes('sick');

      let attachmentRequired = false;
      let reason = '';

      if (leaveType.requiresAttachment) {
        attachmentRequired = true;
        reason = `Attachment is required for ${leaveType.name}`;
      } else if (isSick && data.durationDays > 1) {
        attachmentRequired = true;
        reason = 'Medical certificate is required for sick leave exceeding 1 day';
      }

      if (attachmentRequired && !data.hasAttachment) {
        errors.push(reason);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // ============================================
  // PAYROLL SYNC FUNCTIONALITY
  // Real-time sync with payroll system for salary deductions/adjustments
  // ============================================

  /**
   * Calculate unpaid leave deduction for payroll
   * @param baseSalary - Employee's base monthly salary
   * @param workDaysInMonth - Number of working days in the month
   * @param unpaidLeaveDays - Number of unpaid leave days taken
   */
  calculateUnpaidDeduction: (
    baseSalary: number,
    workDaysInMonth: number,
    unpaidLeaveDays: number
  ): {
    dailyRate: number;
    deductionAmount: number;
    formula: string;
    netSalary: number;
  } => {
    const dailyRate = baseSalary / workDaysInMonth;
    const deductionAmount = dailyRate * unpaidLeaveDays;
    return {
      dailyRate: Math.round(dailyRate * 100) / 100,
      deductionAmount: Math.round(deductionAmount * 100) / 100,
      formula: `(${baseSalary} / ${workDaysInMonth}) × ${unpaidLeaveDays}`,
      netSalary: Math.round((baseSalary - deductionAmount) * 100) / 100,
    };
  },

  /**
   * Calculate leave encashment amount
   * @param dailySalaryRate - Employee's daily salary rate
   * @param unusedLeaveDays - Number of unused leave days to encash
   * @param maxEncashableDays - Maximum days allowed for encashment (default: 30)
   */
  calculateLeaveEncashment: (
    dailySalaryRate: number,
    unusedLeaveDays: number,
    maxEncashableDays: number = 30
  ): {
    daysEncashed: number;
    encashmentAmount: number;
    formula: string;
    daysForfeited: number;
  } => {
    const daysEncashed = Math.min(unusedLeaveDays, maxEncashableDays);
    const encashmentAmount = dailySalaryRate * daysEncashed;
    const daysForfeited = Math.max(0, unusedLeaveDays - maxEncashableDays);
    return {
      daysEncashed,
      encashmentAmount: Math.round(encashmentAmount * 100) / 100,
      formula: `${dailySalaryRate} × ${daysEncashed}`,
      daysForfeited,
    };
  },

  /**
   * Get all unpaid leave requests for an employee in a given period
   * Used for payroll deduction calculations
   */
  getUnpaidLeavesForPayroll: async (
    employeeId: string,
    fromDate: string,
    toDate: string
  ): Promise<{
    ok: boolean;
    unpaidLeaves: Array<{
      requestId: string;
      from: string;
      to: string;
      durationDays: number;
      leaveTypeName: string;
      status: string;
    }>;
    totalUnpaidDays: number;
  }> => {
    try {
      console.log('=== PAYROLL SYNC DEBUG ===');
      console.log('Employee ID:', employeeId);
      console.log('Period:', fromDate, 'to', toDate);

      // Get all leave requests for this employee
      const response = await apiService.get(`/leaves/requests?employeeId=${employeeId}`);
      console.log('API Response:', response);

      if (response.error) {
        console.log('API Error:', response.error);
        return { ok: false, unpaidLeaves: [], totalUnpaidDays: 0 };
      }

      // Get leave types
      const typesResponse = await apiService.get('/leaves/types');
      const leaveTypes = Array.isArray(typesResponse.data) ? typesResponse.data : [];

      interface LeaveType {
        name?: string;
        code?: string;
        _id?: string;
        id?: string;
      }

      console.log('Leave Types:', (leaveTypes as LeaveType[]).map((lt: LeaveType) => `${lt.name} (${lt._id})`));

      // Find unpaid leave type IDs
      const unpaidTypeIds: string[] = [];
      (leaveTypes as LeaveType[]).forEach((lt: LeaveType) => {
        const name = (lt.name || '').toLowerCase();
        const code = (lt.code || '').toLowerCase();
        if (name.includes('unpaid') || code.includes('unpaid') ||
            name.includes('no pay') || name.includes('without pay')) {
          const id = String(lt._id || lt.id);
          unpaidTypeIds.push(id);
          console.log('Found unpaid type:', lt.name, 'ID:', id);
        }
      });

      // Parse requests from response
      interface RequestData {
        _id?: string;
        id?: string;
        dates?: { from?: string | Date; to?: string | Date };
        from?: string | Date;
        to?: string | Date;
        startDate?: string | Date;
        endDate?: string | Date;
        status?: string;
        leaveTypeId?: string | { _id?: string; id?: string };
        leaveTypeName?: string;
        durationDays?: number;
      }

      let requests: RequestData[] = [];
      const data = response.data as Record<string, unknown>;

      if (Array.isArray(data)) {
        requests = data as RequestData[];
      } else if (data?.data && Array.isArray(data.data)) {
        requests = data.data as RequestData[];
      } else if (data?.requests && Array.isArray(data.requests)) {
        requests = data.requests as RequestData[];
      } else if (data?.items && Array.isArray(data.items)) {
        requests = data.items as RequestData[];
      }

      console.log('Total requests found:', requests.length);

      const periodFrom = new Date(fromDate);
      const periodTo = new Date(toDate);

      // Set time to start/end of day for accurate comparison
      periodFrom.setHours(0, 0, 0, 0);
      periodTo.setHours(23, 59, 59, 999);

      console.log('Period range:', periodFrom.toISOString(), 'to', periodTo.toISOString());

      const unpaidLeaves: Array<{
        requestId: string;
        from: string;
        to: string;
        durationDays: number;
        leaveTypeName: string;
        status: string;
      }> = [];

      for (const req of requests) {
        console.log('--- Checking request:', req._id || req.id);

        // Get dates - handle different structures
        const reqFromStr = req.dates?.from || req.from || req.startDate;
        const reqToStr = req.dates?.to || req.to || req.endDate;

        if (!reqFromStr || !reqToStr) {
          console.log('  SKIP: No dates found');
          continue;
        }

        // Check status
        const status = String(req.status || '').toUpperCase();
        console.log('  Status:', status);

        if (status !== 'APPROVED') {
          console.log('  SKIP: Not approved');
          continue;
        }

        // Parse dates
        const reqFrom = new Date(reqFromStr);
        const reqTo = new Date(reqToStr);
        reqFrom.setHours(0, 0, 0, 0);
        reqTo.setHours(23, 59, 59, 999);

        console.log('  Request dates:', reqFrom.toISOString(), 'to', reqTo.toISOString());

        // Check overlap with payroll period
        const overlaps = reqFrom <= periodTo && reqTo >= periodFrom;
        console.log('  Overlaps with period:', overlaps);

        if (!overlaps) {
          console.log('  SKIP: No overlap');
          continue;
        }

        // Get leave type ID - handle populated object or string
        let leaveTypeId: string;
        if (typeof req.leaveTypeId === 'object' && req.leaveTypeId !== null) {
          leaveTypeId = String(req.leaveTypeId._id || req.leaveTypeId.id || req.leaveTypeId);
        } else {
          leaveTypeId = String(req.leaveTypeId);
        }

        console.log('  Leave Type ID:', leaveTypeId);
        console.log('  Unpaid Type IDs:', unpaidTypeIds);

        // Check if this is unpaid leave
        const isUnpaid = unpaidTypeIds.includes(leaveTypeId);
        console.log('  Is Unpaid:', isUnpaid);

        if (!isUnpaid) {
          console.log('  SKIP: Not unpaid leave type');
          continue;
        }

        // Calculate days within the payroll period
        const overlapStart = new Date(Math.max(reqFrom.getTime(), periodFrom.getTime()));
        const overlapEnd = new Date(Math.min(reqTo.getTime(), periodTo.getTime()));
        const daysInPeriod = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const leaveType = (leaveTypes as LeaveType[]).find((lt: LeaveType) => String(lt._id || lt.id) === leaveTypeId);

        console.log('  >>> MATCHED! Days:', daysInPeriod);

        unpaidLeaves.push({
          requestId: (req._id || req.id) as string,
          from: String(reqFromStr),
          to: String(reqToStr),
          durationDays: daysInPeriod,
          leaveTypeName: leaveType?.name || req.leaveTypeName || 'Unpaid Leave',
          status: req.status || 'PENDING',
        });
      }

      const totalUnpaidDays = unpaidLeaves.reduce((sum, l) => sum + l.durationDays, 0);

      console.log('=== RESULT ===');
      console.log('Unpaid leaves found:', unpaidLeaves.length);
      console.log('Total unpaid days:', totalUnpaidDays);

      return {
        ok: true,
        unpaidLeaves,
        totalUnpaidDays,
      };
    } catch (err) {
      console.error('Failed to get unpaid leaves for payroll:', err);
      return { ok: false, unpaidLeaves: [], totalUnpaidDays: 0 };
    }
  },

  /**
   * Generate payroll sync data for an employee
   * Combines all leave-related payroll information
   */
  generatePayrollSyncData: async (
    employeeId: string,
    payrollPeriod: {
      year: number;
      month: number;
      baseSalary: number;
      workDaysInMonth: number;
    }
  ): Promise<{
    ok: boolean;
    employeeId: string;
    payrollPeriod: string;
    unpaidLeaveDeduction: {
      totalDays: number;
      deductionAmount: number;
      formula: string;
      leaves: Array<{
        requestId: string;
        from: string;
        to: string;
        days: number;
      }>;
    };
    balanceSummary: {
      annual: { entitled: number; taken: number; remaining: number };
      sick: { entitled: number; taken: number; remaining: number };
    };
    syncedAt: string;
    error?: string;
  }> => {
    const periodStart = new Date(payrollPeriod.year, payrollPeriod.month - 1, 1);
    const periodEnd = new Date(payrollPeriod.year, payrollPeriod.month, 0);
    const periodStr = `${payrollPeriod.year}-${String(payrollPeriod.month).padStart(2, '0')}`;

    try {
      // Get unpaid leaves for the period
      const unpaidData = await leavesService.getUnpaidLeavesForPayroll(
        employeeId,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0]
      );

      // Calculate deduction
      const deduction = calculateUnpaidDeductionHelper(
        payrollPeriod.baseSalary,
        payrollPeriod.workDaysInMonth,
        unpaidData.totalUnpaidDays
      );

      // Get current balances
      const balanceResponse = await apiService.get(`/leaves/employees/${employeeId}/balances`);
      const balances = Array.isArray(balanceResponse.data) ? balanceResponse.data : [];

      interface Balance {
        leaveTypeName?: string;
        entitled?: number;
        yearlyEntitlement?: number;
        taken?: number;
        remaining?: number;
      }

      const getBalanceForType = (typeName: string) => {
        const balance = (balances as Balance[]).find((b: Balance) => {
          const name = (b.leaveTypeName || '').toLowerCase();
          return name.includes(typeName);
        });
        return {
          entitled: balance?.entitled || balance?.yearlyEntitlement || 0,
          taken: balance?.taken || 0,
          remaining: balance?.remaining || 0,
        };
      };

      return {
        ok: true,
        employeeId,
        payrollPeriod: periodStr,
        unpaidLeaveDeduction: {
          totalDays: unpaidData.totalUnpaidDays,
          deductionAmount: deduction.deductionAmount,
          formula: deduction.formula,
          leaves: unpaidData.unpaidLeaves.map((l: { requestId: string; from: string; to: string; durationDays: number }) => ({
            requestId: l.requestId,
            from: l.from,
            to: l.to,
            days: l.durationDays,
          })),
        },
        balanceSummary: {
          annual: getBalanceForType('annual'),
          sick: getBalanceForType('sick'),
        },
        syncedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Failed to generate payroll sync data:', err);
      return {
        ok: false,
        employeeId,
        payrollPeriod: periodStr,
        unpaidLeaveDeduction: {
          totalDays: 0,
          deductionAmount: 0,
          formula: '',
          leaves: [],
        },
        balanceSummary: {
          annual: { entitled: 0, taken: 0, remaining: 0 },
          sick: { entitled: 0, taken: 0, remaining: 0 },
        },
        syncedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },

  /**
   * Batch generate payroll sync data for multiple employees
   */
  batchGeneratePayrollSync: async (
    employeeIds: string[],
    payrollPeriod: {
      year: number;
      month: number;
      baseSalary?: number;
      workDaysInMonth: number;
    },
    employeeSalaries?: Record<string, number>
  ): Promise<{
    ok: boolean;
    totalEmployees: number;
    processedCount: number;
    totalDeductions: number;
    results: Array<Awaited<ReturnType<typeof leavesService.generatePayrollSyncData>>>;
  }> => {
    const results: Array<Awaited<ReturnType<typeof leavesService.generatePayrollSyncData>>> = [];
    let totalDeductions = 0;

    for (const employeeId of employeeIds) {
      const salary = employeeSalaries?.[employeeId] || payrollPeriod.baseSalary || 0;
      const result = await leavesService.generatePayrollSyncData(employeeId, {
        ...payrollPeriod,
        baseSalary: salary,
      });
      results.push(result);
      if (result.ok) {
        totalDeductions += result.unpaidLeaveDeduction.deductionAmount;
      }
    }

    return {
      ok: true,
      totalEmployees: employeeIds.length,
      processedCount: results.filter(r => r.ok).length,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      results,
    };
  },

  /**
   * Get payroll sync status for display
   */
  getPayrollSyncStatus: async (employeeId: string): Promise<{
    lastSyncedAt: string | null;
    pendingUnpaidLeaves: number;
    pendingDeductionAmount: number;
    needsSync: boolean;
  }> => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Check for pending unpaid leaves in current month
      const unpaidData = await leavesService.getUnpaidLeavesForPayroll(
        employeeId,
        new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
        new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
      );

      // Estimate deduction (assuming 22 work days and placeholder salary)
      // In real implementation, this would get actual salary from payroll
      const estimatedDeduction = unpaidData.totalUnpaidDays > 0
        ? calculateUnpaidDeductionHelper(5000, 22, unpaidData.totalUnpaidDays)
        : { deductionAmount: 0 };

      return {
        lastSyncedAt: null, // Would be stored/retrieved from backend
        pendingUnpaidLeaves: unpaidData.totalUnpaidDays,
        pendingDeductionAmount: estimatedDeduction.deductionAmount,
        needsSync: unpaidData.totalUnpaidDays > 0,
      };
    } catch (err) {
      console.error('Failed to get payroll sync status:', err);
      return {
        lastSyncedAt: null,
        pendingUnpaidLeaves: 0,
        pendingDeductionAmount: 0,
        needsSync: false,
      };
    }
  },

  // Fix unpaid leave balances (add days and reset taken)
  fixUnpaidLeaveBalances: async (employeeId?: string, addDays: number = 0) => {
    const query = new URLSearchParams();
    if (employeeId) query.set('employeeId', employeeId);
    if (addDays > 0) query.set('addDays', addDays.toString());
    return apiService.post(`/leaves/fix-unpaid-balances?${query.toString()}`);
  },

  // User Role Management (REQ: HR Admin manages user roles and permissions)
  /**
   * Get user by ID or email for role management
   * @param query - User ID (ObjectId) or email address
   * @returns User profile with roles
   */
  getUserByIdOrEmail: async (query: string) => {
    return apiService.get(`/leaves/users/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Update user role for leave management
   * @param userId - User ID (ObjectId)
   * @param payload - Update payload with role and optional actorId
   * @returns Updated user profile with roles
   */
  updateUserRole: async (userId: string, payload: { role: string; actorId?: string }) => {
    return apiService.patch(`/leaves/users/${userId}/role`, payload);
  },
};



