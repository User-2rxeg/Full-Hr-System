import apiService from '../api';

// DTO Types
export interface CreateDisputeDto {
  payslipId: string;
  description: string;
  amount?: number;
}

export interface UpdateDisputeDto {
  description?: string;
  status?: string;
}

export interface CreateClaimDto {
  claimType: string;
  description: string;
  amount: number;
}

export interface UpdateClaimDto {
  description?: string;
  amount?: number;
  status?: string;
}

export interface CreateRefundDto {
  // Support both a simple shape and the backend's nested `refundDetails` shape
  amount?: number;
  description?: string;
  refundDetails?: {
    amount: number;
    description?: string;
  };
  // backend fields
  employeeId?: string;
  claimId?: string;
  disputeId?: string;
  financeStaffId?: string;
  status?: string;
  paidInPayrollRunId?: string;
}

export interface UpdateRefundDto {
  amount?: number;
  description?: string;
  status?: string;
}

// Helper function to build query strings
const buildQueryString = (params: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // Handle arrays: convert to comma-separated string or multiple params
        value.forEach(item => {
          searchParams.append(key, String(item));
        });
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// Normalize base salary response to frontend `BaseSalaryInfo` shape
const normalizeBaseSalary = (payload: any) => {
  if (!payload) return null;

  const currentBaseSalary =
    (payload.currentBaseSalary ?? payload.currentSalary ?? payload.baseSalary ?? payload.base_salary) || 0;

  const currency = payload.currency || payload.curr || 'EGP';

  const contractType = payload.contractType ?? payload.workType ?? null;

  let payGrade = null;
  if (payload.payGrade) {
    payGrade = typeof payload.payGrade === 'string' ? payload.payGrade : (payload.payGrade.grade || payload.payGrade.name || null);
  }

  const effectiveDate = payload.effectiveDate || payload.lastUpdated || payload.updatedAt || payload.createdAt || payload.periodStart || null;

  return {
    currentBaseSalary: Number(currentBaseSalary || 0),
    currency,
    contractType,
    payGrade,
    effectiveDate,
    workHoursPerWeek: payload.workHoursPerWeek ?? payload.workHours ?? undefined,
    salaryFrequency: payload.salaryFrequency ?? payload.frequency ?? 'Monthly',
  };
};

// Helpers for resolving totals (moved out to avoid referencing the service during initialization)
const resolveTotalDeductions = (backendPayslip: any) => {
  if (!backendPayslip) return 0;
  if (typeof backendPayslip.totalDeductions === 'number') return backendPayslip.totalDeductions;
  if (typeof backendPayslip.totaDeductions === 'number') return backendPayslip.totaDeductions;

  const taxes = Array.isArray(backendPayslip.deductionsDetails?.taxes)
    ? backendPayslip.deductionsDetails.taxes.reduce((s: number, t: any) => s + (t.amount || 0), 0)
    : (backendPayslip.deductionsDetails?.taxAmount || 0);

  const insurances = Array.isArray(backendPayslip.deductionsDetails?.insurances)
    ? backendPayslip.deductionsDetails.insurances.reduce((s: number, i: any) => s + (i.amount || 0), 0)
    : (backendPayslip.deductionsDetails?.insuranceAmount || 0);

  let penalties = 0;
  if (Array.isArray(backendPayslip.deductionsDetails?.penalties)) {
    penalties = backendPayslip.deductionsDetails.penalties.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  } else if (typeof backendPayslip.deductionsDetails?.penalties?.totalAmount === 'number') {
    penalties = backendPayslip.deductionsDetails.penalties.totalAmount;
  } else {
    penalties = backendPayslip.deductionsDetails?.penaltiesAmount || 0;
  }

  return Number((taxes || 0) + (insurances || 0) + (penalties || 0));
};

const resolveTotalGrossSalary = (backendPayslip: any) => {
  if (!backendPayslip) return 0;
  if (typeof backendPayslip.totalGrossSalary === 'number') return backendPayslip.totalGrossSalary;
  if (typeof backendPayslip.totals?.totalGrossSalary === 'number') return backendPayslip.totals.totalGrossSalary;

  const base = backendPayslip.earningsDetails?.baseSalary || 0;
  const allowances = Array.isArray(backendPayslip.earningsDetails?.allowances)
    ? backendPayslip.earningsDetails.allowances.reduce((s: number, a: any) => s + (a.amount || 0), 0)
    : 0;
  const bonuses = Array.isArray(backendPayslip.earningsDetails?.bonuses)
    ? backendPayslip.earningsDetails.bonuses.reduce((s: number, b: any) => s + (b.amount || 0), 0)
    : 0;
  const benefits = Array.isArray(backendPayslip.earningsDetails?.benefits)
    ? backendPayslip.earningsDetails.benefits.reduce((s: number, b: any) => s + (b.amount || 0), 0)
    : 0;
  const refunds = Array.isArray(backendPayslip.earningsDetails?.refunds)
    ? backendPayslip.earningsDetails.refunds.reduce((s: number, r: any) => s + (r.amount || 0), 0)
    : 0;
  return Number(base + allowances + bonuses + benefits + refunds);
};

export const payrollTrackingService = {
  // ========== Employee Self-Service Endpoints ==========

  // GET /payroll/tracking/employee/:employeeId/payslips
  getEmployeePayslips: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/payslips`);
  },

  // GET /payroll/tracking/payslip/:payslipId/employee/:employeeId
  getPayslipDetails: async (payslipId: string, employeeId: string) => {
    return apiService.get(`/payroll/tracking/payslip/${payslipId}/employee/${employeeId}`);
  },

  // GET /payroll/tracking/payslip/:payslipId/employee/:employeeId/download
  // Returns a file blob for download
  downloadPayslip: async (payslipId: string, employeeId: string) => {
    return apiService.downloadFile(`/payroll/tracking/payslip/${payslipId}/employee/${employeeId}/download`);
  },

  // GET /payroll/tracking/employee/:employeeId/base-salary
    getBaseSalary: async (employeeId: string) => {
      const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/base-salary`);
      // If no data, return as-is
      if (!res || !res.data) return res;

      const mapped = normalizeBaseSalary(res.data);
      // Return the original response shape but replace data with normalized object
      return { ...res, data: mapped };
    },

  // GET /payroll/tracking/employee/:employeeId/leave-compensation
  getLeaveCompensation: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/leave-compensation`);
  },

  // GET /payroll/tracking/employee/:employeeId/transportation
  getTransportationCompensation: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/transportation`);
  },

  // GET /payroll/tracking/employee/:employeeId/tax-deductions
  getTaxDeductions: async (employeeId: string, payslipId?: string) => {
    const qs = buildQueryString({ payslipId });
    const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/tax-deductions${qs}`);
    if (!res?.data || (Array.isArray(res.data) && res.data.length === 0)) console.debug('[payroll] getTaxDeductions empty response', { employeeId, payslipId, res });
    return res;
  },

  // GET /payroll/tracking/employee/:employeeId/insurance-deductions
  getInsuranceDeductions: async (employeeId: string, payslipId?: string) => {
    const qs = buildQueryString({ payslipId });
    return apiService.get(`/payroll/tracking/employee/${employeeId}/insurance-deductions${qs}`);
  },

  // GET /payroll/tracking/employee/:employeeId/misconduct-deductions
  getMisconductDeductions: async (employeeId: string, payslipId?: string) => {
    const qs = buildQueryString({ payslipId });
    return apiService.get(`/payroll/tracking/employee/${employeeId}/misconduct-deductions${qs}`);
  },

  // GET /payroll/tracking/employee/:employeeId/attendance-based-deductions
  getAttendanceBasedDeductions: async (
    employeeId: string,
    options?: { payslipId?: string; from?: string; to?: string }
  ) => {
    const qs = buildQueryString(options || {});
    return apiService.get(`/payroll/tracking/employee/${employeeId}/attendance-based-deductions${qs}`);
  },

  // GET /payroll/tracking/employee/:employeeId/unpaid-leave-deductions
  getUnpaidLeaveDeductions: async (
    employeeId: string,
    options?: { payslipId?: string; from?: string; to?: string }
  ) => {
    const qs = buildQueryString(options || {});
    const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/unpaid-leave-deductions${qs}`);
    if (!res?.data) console.debug('[payroll] getUnpaidLeaveDeductions empty response', { employeeId, options, res });
    return res;
  },

  // GET /payroll/tracking/employee/:employeeId/salary-history
  getSalaryHistory: async (employeeId: string) => {
    const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/salary-history`);
    if (!res?.data || (Array.isArray(res.data) && res.data.length === 0)) console.debug('[payroll] getSalaryHistory empty response', { employeeId, res });
    return res;
  },

  // GET /payroll/tracking/employee/:employeeId/employer-contributions
  getEmployerContributions: async (employeeId: string, payslipId?: string) => {
    const qs = buildQueryString({ payslipId });
    return apiService.get(`/payroll/tracking/employee/${employeeId}/employer-contributions${qs}`);
  },

  // GET /payroll/tracking/employee/:employeeId/tax-documents
  getTaxDocuments: async (employeeId: string, year?: number) => {
    const qs = buildQueryString({ year });
    const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/tax-documents${qs}`);
    if (!res?.data) console.debug('[payroll] getTaxDocuments empty response', { employeeId, year, res });
    return res;
  },

  // GET /payroll/tracking/employee/:employeeId/tax-documents/:year/download
  downloadAnnualTaxStatement: async (employeeId: string, year: number) => {
    return apiService.downloadFile(`/payroll/tracking/employee/${employeeId}/tax-documents/${year}/download`);
  },

  // POST /payroll/tracking/employee/:employeeId/disputes
  createDispute: async (employeeId: string, data: CreateDisputeDto) => {
    return apiService.post(`/payroll/tracking/employee/${employeeId}/disputes`, data);
  },

  // POST /payroll/tracking/employee/:employeeId/claims
  createClaim: async (employeeId: string, data: CreateClaimDto) => {
    return apiService.post(`/payroll/tracking/employee/${employeeId}/claims`, data);
  },

  // GET /payroll/tracking/employee/:employeeId/track-requests
  trackClaimsAndDisputes: async (employeeId: string) => {
    return apiService.get(`/payroll/tracking/employee/${employeeId}/track-requests`);
  },

  // ========== Operational Reports Endpoints ==========

  // GET /payroll/tracking/reports/department-payroll
  generateDepartmentPayrollReport: async (options?: {
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const qs = buildQueryString(options || {});
    return apiService.get(`/payroll/tracking/reports/department-payroll${qs}`);
  },

  // GET /payroll/tracking/reports/payroll-summary
  generatePayrollSummary: async (type: 'monthly' | 'yearly', period?: string) => {
    const qs = buildQueryString({ type, period });
    return apiService.get(`/payroll/tracking/reports/payroll-summary${qs}`);
  },

  // GET /payroll/tracking/reports/compliance
  generateComplianceReport: async (type: string, year?: number) => {
    const qs = buildQueryString({ type, year });
    return apiService.get(`/payroll/tracking/reports/compliance${qs}`);
  },

  // ========== Disputes and Claims Approval Endpoints ==========

  // PUT /payroll/tracking/disputes/:disputeId/review
  reviewDispute: async (
    disputeId: string,
    specialistId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/disputes/${disputeId}/review?specialistId=${specialistId}&action=${action}`,
      { reason }
    );
  },

  // PUT /payroll/tracking/disputes/:disputeId/confirm
  confirmDisputeApproval: async (
    disputeId: string,
    managerId: string,
    action: 'confirm' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/disputes/${disputeId}/confirm?managerId=${managerId}&action=${action}`,
      { reason }
    );
  },

  // GET /payroll/tracking/disputes/approved
  getApprovedDisputes: async (financeStaffId?: string) => {
    const qs = buildQueryString({ financeStaffId });
    return apiService.get(`/payroll/tracking/disputes/approved${qs}`);
  },

  // PUT /payroll/tracking/claims/:claimId/review
  reviewClaim: async (
    claimId: string,
    specialistId: string,
    action: 'approve' | 'reject',
    approvedAmount?: number,
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/claims/${claimId}/review?specialistId=${specialistId}&action=${action}`,
      { approvedAmount, reason }
    );
  },

  // PUT /payroll/tracking/claims/:claimId/confirm
  confirmClaimApproval: async (
    claimId: string,
    managerId: string,
    action: 'confirm' | 'reject',
    reason?: string
  ) => {
    return apiService.put(
      `/payroll/tracking/claims/${claimId}/confirm?managerId=${managerId}&action=${action}`,
      { reason }
    );
  },

  // GET /payroll/tracking/claims/approved
  getApprovedClaims: async (financeStaffId?: string) => {
    const qs = buildQueryString({ financeStaffId });
    return apiService.get(`/payroll/tracking/claims/approved${qs}`);
  },

  // ========== Refund Process Endpoints ==========

  // POST /payroll/tracking/refunds/dispute/:disputeId
  generateDisputeRefund: async (
    disputeId: string,
    financeStaffId: string,
    data: CreateRefundDto
  ) => {
    const refundDetails = data.refundDetails ?? { amount: data.amount ?? 0, description: data.description };
    const payload: any = {
      ...data,
      refundDetails,
      employeeId: data.employeeId,
    };
    return apiService.post(
      `/payroll/tracking/refunds/dispute/${disputeId}?financeStaffId=${financeStaffId}`,
      payload
    );
  },

  // POST /payroll/tracking/refunds/claim/:claimId
  generateClaimRefund: async (
    claimId: string,
    financeStaffId: string,
    data: CreateRefundDto
  ) => {
    const refundDetails = data.refundDetails ?? { amount: data.amount ?? 0, description: data.description };
    const payload: any = {
      ...data,
      refundDetails,
      employeeId: data.employeeId,
    };
    return apiService.post(
      `/payroll/tracking/refunds/claim/${claimId}?financeStaffId=${financeStaffId}`,
      payload
    );
  },

  // GET /payroll/tracking/refunds/pending
  getPendingRefunds: async () => {
    return apiService.get('/payroll/tracking/refunds/pending');
  },

  // PUT /payroll/tracking/refunds/:refundId/mark-paid
  markRefundAsPaid: async (refundId: string, payrollRunId: string) => {
    return apiService.put(`/payroll/tracking/refunds/${refundId}/mark-paid`, { payrollRunId });
  },

  // ========== CRUD Endpoints for Claims ==========

  // GET /payroll/tracking/claims
  getAllClaims: async (status?: string, employeeId?: string) => {
    const qs = buildQueryString({ status, employeeId });
    return apiService.get(`/payroll/tracking/claims${qs}`);
  },

  // GET /payroll/tracking/claims/:id
  getClaimById: async (id: string) => {
    return apiService.get(`/payroll/tracking/claims/${id}`);
  },

  // PUT /payroll/tracking/claims/:id
  updateClaim: async (id: string, data: UpdateClaimDto) => {
    return apiService.put(`/payroll/tracking/claims/${id}`, data);
  },

  // DELETE /payroll/tracking/claims/:id
  deleteClaim: async (id: string) => {
    return apiService.delete(`/payroll/tracking/claims/${id}`);
  },

  // ========== CRUD Endpoints for Disputes ==========

  // GET /payroll/tracking/disputes
  getAllDisputes: async (status?: string, employeeId?: string) => {
    const qs = buildQueryString({ status, employeeId });
    return apiService.get(`/payroll/tracking/disputes${qs}`);
  },

  // GET /payroll/tracking/disputes/:id
  getDisputeById: async (id: string) => {
    return apiService.get(`/payroll/tracking/disputes/${id}`);
  },

  // PUT /payroll/tracking/disputes/:id
  updateDispute: async (id: string, data: UpdateDisputeDto) => {
    return apiService.put(`/payroll/tracking/disputes/${id}`, data);
  },

  // DELETE /payroll/tracking/disputes/:id
  deleteDispute: async (id: string) => {
    return apiService.delete(`/payroll/tracking/disputes/${id}`);
  },

  // ========== CRUD Endpoints for Refunds ==========

  // GET /payroll/tracking/refunds
  getAllRefunds: async (status?: string, employeeId?: string) => {
    const qs = buildQueryString({ status, employeeId });
    return apiService.get(`/payroll/tracking/refunds${qs}`);
  },

  // GET /payroll/tracking/refunds/:id
  getRefundById: async (id: string) => {
    return apiService.get(`/payroll/tracking/refunds/${id}`);
  },

  // PUT /payroll/tracking/refunds/:id
  updateRefund: async (id: string, data: UpdateRefundDto) => {
    return apiService.put(`/payroll/tracking/refunds/${id}`, data);
  },

  // DELETE /payroll/tracking/refunds/:id
  deleteRefund: async (id: string) => {
    return apiService.delete(`/payroll/tracking/refunds/${id}`);
  },

  // ========== Mapped helpers (canonical shapes returned to pages) ==========
  getEmployeePayslipsMapped: async (employeeId: string) => {
    const res = await apiService.get(`/payroll/tracking/employee/${employeeId}/payslips`);
    const resData = res?.data as any;
    const items: any[] = Array.isArray(resData) ? (resData as any[]) : (resData || []);
    const mapped = (items || []).map((p: any) => {
      const gross = resolveTotalGrossSalary(p);
      const deductions = resolveTotalDeductions(p);
      const net = typeof p.netPay === 'number' ? p.netPay : Number((gross || 0) - (deductions || 0));
      return {
        id: p._id || p.payslipId || p.id,
        payslipId: p._id || p.payslipId || p.id,
        employeeId: p.employeeId,
        payrollRunId: p.payrollRunId,
        periodStart: p.periodStart || p.periodDate || (p as any)?.createdAt || null,
        payDate: p.payDate || p.periodDate || (p as any)?.createdAt || null,
        status: p.paymentStatus || p.status || 'unknown',
        baseSalary: p.earningsDetails?.baseSalary || p.baseSalary || 0,
        grossPay: gross,
        totalDeductions: deductions,
        netPay: net,
        currency: p.currency || 'EGP',
        earnings: [
          ...(p.earningsDetails?.allowances || []),
          ...(p.earningsDetails?.bonuses || []),
          ...(p.earningsDetails?.benefits || []),
          ...(p.earningsDetails?.refunds || []),
        ].map((e: any) => ({ type: e.type || e.name || 'earning', amount: e.amount || 0, description: e.description || e.note })),
        deductions: [
          ...(p.deductionsDetails?.taxes || []),
          ...(p.deductionsDetails?.insurances || []),
          ...(Array.isArray(p.deductionsDetails?.penalties)
            ? p.deductionsDetails.penalties
            : (p.deductionsDetails?.penalties ? [p.deductionsDetails.penalties] : [])),
        ].map((d: any) => ({ type: d.type || 'deduction', amount: d.amount || d.totalAmount || 0, description: d.description })),
      };
    });
    return { ...res, data: mapped };
  },

  getPayslipDetailsMapped: async (payslipId: string, employeeId: string) => {
    const res = await apiService.get(`/payroll/tracking/payslip/${payslipId}/employee/${employeeId}`);
    // Backend may return { payslip, disputes } or raw payslip; normalize both
    const resData = res?.data as any;
    const rawPayslip = resData?.payslip ?? resData ?? null;
    const disputes = resData?.disputes ?? (Array.isArray(resData) ? [] : ((res as any)?.disputes ?? []));
    if (!rawPayslip) return { ...res, data: { payslip: null, disputes } };

    const gross = resolveTotalGrossSalary(rawPayslip);
    const deductions = resolveTotalDeductions(rawPayslip);
    const net = typeof rawPayslip.netPay === 'number' ? rawPayslip.netPay : Number((gross || 0) - (deductions || 0));

    const mappedPayslip = {
      id: rawPayslip._id || rawPayslip.payslipId || rawPayslip.id,
      payslipId: rawPayslip._id || rawPayslip.payslipId || rawPayslip.id,
      employeeId: rawPayslip.employeeId,
      payrollRunId: rawPayslip.payrollRunId,
      periodStart: rawPayslip.periodStart || rawPayslip.periodDate || (rawPayslip as any)?.createdAt || null,
      payDate: rawPayslip.payDate || rawPayslip.periodDate || (rawPayslip as any)?.createdAt || null,
      status: rawPayslip.paymentStatus || rawPayslip.status || 'unknown',
      baseSalary: rawPayslip.earningsDetails?.baseSalary || rawPayslip.baseSalary || 0,
      grossPay: gross,
      totalDeductions: deductions,
      netPay: net,
      currency: rawPayslip.currency || 'EGP',
      earningsDetails: rawPayslip.earningsDetails || {},
      deductionsDetails: rawPayslip.deductionsDetails || {},
    };

    return { ...res, data: { payslip: mappedPayslip, disputes } };
  },
};