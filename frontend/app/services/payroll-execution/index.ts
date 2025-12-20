import apiService from '../api';

// Updated to align with backend PayrollExecutionController routes
export const payrollExecutionService = {
  // Viewing
  getDraft: async (id: string) => {
    return apiService.get(`/payroll-execution/draft/${id}`);
  },

  // Approval workflow
  approveByManager: async (id: string) => {
    return apiService.post(`/payroll-execution/${id}/approve`);
  },

  approveByFinance: async (id: string) => {
    return apiService.post(`/payroll-execution/${id}/approve-finance`);
  },

  freeze: async (id: string, reason?: string) => {
    return apiService.post(`/payroll-execution/${id}/freeze`, { reason });
  },

  unfreeze: async (id: string, reason: string) => {
    return apiService.post(`/payroll-execution/${id}/unfreeze`, { reason });
  },

  generatePayslips: async (id: string) => {
    return apiService.post(`/payroll-execution/${id}/generate-payslips`, {});
  },

  // Initiation
  createInitiation: async (data: any) => {
    return apiService.post('/payroll-execution/initiation', data);
  },

  getInitiation: async (id: string) => {
    return apiService.get(`/payroll-execution/initiation/${id}`);
  },

  updateInitiation: async (id: string, data: any) => {
    return apiService.patch(`/payroll-execution/initiation/${id}`, data);
  },

  approveInitiation: async (id: string) => {
    return apiService.post(`/payroll-execution/initiation/${id}/approve`, {});
  },

  rejectInitiation: async (id: string, reason: string) => {
    return apiService.post(`/payroll-execution/initiation/${id}/reject`, { reason });
  },

  // Signing bonuses
  listSigningBonuses: async (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiService.get(`/payroll-execution/signing-bonuses${query}`);
  },

  getSigningBonus: async (id: string) => {
    return apiService.get(`/payroll-execution/signing-bonuses/${id}`);
  },

  editSigningBonus: async (id: string, data: any) => {
    return apiService.post(`/payroll-execution/signing-bonuses/${id}/edit`, data);
  },

  approveSigningBonus: async (id: string) => {
    return apiService.post(`/payroll-execution/signing-bonuses/${id}/approve`, {});
  },

  rejectSigningBonus: async (id: string, reason: string) => {
    return apiService.post(`/payroll-execution/signing-bonuses/${id}/reject`, { reason });
  },

  approveAllSigningBonuses: async () => {
    return apiService.post(`/payroll-execution/approve-signing-bonuses`, {});
  },

  // Termination benefits
  listTerminationBenefits: async (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiService.get(`/payroll-execution/termination-benefits${query}`);
  },

  getTerminationBenefit: async (id: string) => {
    return apiService.get(`/payroll-execution/termination-benefits/${id}`);
  },

  editTerminationBenefit: async (id: string, data: any) => {
    return apiService.post(`/payroll-execution/termination-benefits/${id}/edit`, data);
  },

  approveTerminationBenefit: async (id: string) => {
    return apiService.post(`/payroll-execution/termination-benefits/${id}/approve`, {});
  },

  rejectTerminationBenefit: async (id: string, reason: string) => {
    return apiService.post(`/payroll-execution/termination-benefits/${id}/reject`, { reason });
  },
  // Payroll runs listing
  listRuns: async (params?: { status?: string; period?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.period) q.set('period', params.period);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return apiService.get(`/payroll-execution/runs${suffix}`);
  },

  // Diagnostics endpoint
  getEmployeeStatusDiagnostics: async () => {
    return apiService.get('/payroll-execution/diagnostics/employee-status');
  },
  

  // List departments for entity dropdown
  listDepartments: async () => {
    return apiService.get('/payroll-execution/departments');
  },

  // REQ-PY-8: Payslip endpoints
  listPayslipsByRun: async (runId: string) => {
    return apiService.get(`/payroll-execution/${runId}/payslips`);
  },

  getPayslip: async (payslipId: string) => {
    return apiService.get(`/payroll-execution/payslips/${payslipId}`);
  },

  // REQ-PY-5/REQ-PY-20: Irregularity management
  listIrregularities: async (params?: { status?: string; payrollRunId?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.payrollRunId) q.set('payrollRunId', params.payrollRunId);
    if (params?.severity) q.set('severity', params.severity);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return apiService.get(`/payroll-execution/irregularities/list${suffix}`);
  },

  getIrregularity: async (id: string) => {
    return apiService.get(`/payroll-execution/irregularities/${id}`);
  },

  getPayrollRunIrregularities: async (runId: string) => {
    return apiService.get(`/payroll-execution/${runId}/irregularities`);
  },

  escalateIrregularity: async (id: string, reason: string) => {
    return apiService.post(`/payroll-execution/irregularities/${id}/escalate`, { reason });
  },

  resolveIrregularity: async (id: string, data: { action: string; notes: string; adjustedValue?: number }) => {
    return apiService.post(`/payroll-execution/irregularities/${id}/resolve`, data);
  },
};

