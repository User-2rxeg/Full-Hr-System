import api from './api';

// Types for Month-End and Year-End Payroll Summaries
export interface PayrollSummary {
  id: string;
  type: 'month_end' | 'year_end';
  period: string;
  title: string;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalTaxes: number;
  employeeCount: number;
  departmentBreakdown: DepartmentBreakdown[];
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

export interface DepartmentBreakdown {
  departmentName: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
}

export interface SummaryFilters {
  type?: 'month_end' | 'year_end';
  period?: string;
  status?: 'draft' | 'final' | 'archived';
  departmentId?: string;
}

// Types for Tax, Insurance, and Benefits Reports
export interface TaxReport {
  id: string;
  period: string;
  title: string;
  totalTaxWithheld: number;
  taxTypes: TaxTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface TaxTypeBreakdown {
  taxType: string;
  amount: number;
  employeeCount: number;
}

export interface InsuranceReport {
  id: string;
  period: string;
  title: string;
  totalContributions: number;
  totalEmployeeContributions?: number;
  totalEmployerContributions?: number;
  insuranceTypes: InsuranceTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface InsuranceTypeBreakdown {
  insuranceType: string;
  amount: number;
  employeeContribution?: number;
  employerContribution?: number;
  employeeCount: number;
}

export interface BenefitsReport {
  id: string;
  period: string;
  title: string;
  totalBenefits: number;
  benefitTypes: BenefitTypeBreakdown[];
  employeeCount: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface BenefitTypeBreakdown {
  benefitType: string;
  amount: number;
  employeeCount: number;
}

export interface PayslipHistoryReport {
  id: string;
  period: string;
  title: string;
  totalPayslips: number;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  departmentBreakdown: DepartmentBreakdown[];
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface DepartmentalReport {
  id: string;
  reportType: 'departmental';
  departmentId: string;
  departmentName?: string;
  period: string;
  startDate: string;
  endDate: string;
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalTaxes: number;
  generatedAt: string;
  status: 'draft' | 'final' | 'archived';
  downloadUrl?: string;
}

// Types for Approved Disputes and Claims Notifications
export interface ApprovedDispute {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  type: string;
  description: string;
  amount: number;
  period: string;
  approvedAt: string;
  approvedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  refundStatus: 'pending' | 'processed' | 'paid';
  refundId?: string;
  needsRefund: boolean;
}

export interface ApprovedClaim {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  period: string;
  approvedAt: string;
  approvedBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  refundStatus: 'pending' | 'processed' | 'paid';
  refundId?: string;
  needsRefund: boolean;
}

// Types for Refund Generation
export interface RefundGeneration {
  _id: string;
  claimId?: string;
  disputeId?: string;
  refundDetails: {
    description: string;
    amount: number;
  };
  employeeId: string;
  financeStaffId?: string;
  status: 'pending' | 'processed' | 'paid';
  createdAt: string;
  updatedAt: string;
  paidInPayrollRunId?: string;
  __v?: number;
}

export interface RefundRequest {
  disputeId?: string;
  claimId?: string;
  refundDetails: {
    description: string;
    amount: number;
  };
  employeeId: string;
  financeStaffId?: string;
  status?: 'pending' | 'processed' | 'paid';
  paidInPayrollRunId?: string;
}

export interface PayrollCycle {
  id: string;
  name: string;
  period: string;
  status: 'draft' | 'processing' | 'completed' | 'locked';
  startDate: string;
  endDate: string;
}

// API Service Functions
// Helper to transform backend Tax Report to frontend interface
const transformTaxReport = (data: any): TaxReport => {
  const year = data.year || (data.period && data.period.includes('_') ? data.period.split('_')[0].split('-')[0] : data.period);
  const count = data.employeeCount || data.totalEmployees || 0;
  const amount = data.totalTaxWithheld || data.totalTaxCollected || 0;

  return {
    id: data.id || data._id || `tax_${year || new Date().getFullYear()}_${count}_${amount}`,
    period: data.period || (data.year ? data.year.toString() : ''),
    title: 'Tax Report',
    totalTaxWithheld: amount,
    taxTypes: data.taxTypes || [],
    employeeCount: count,
    generatedAt: data.generatedAt || data.generatedDate || new Date().toISOString(),
    status: data.status || 'final',
    downloadUrl: data.downloadUrl,
    startDate: data.startDate,
    endDate: data.endDate
  };
};

// Helper to transform backend Insurance Report
const transformInsuranceReport = (data: any): InsuranceReport => {
  const year = data.year || (data.period && data.period.includes('_') ? data.period.split('_')[0].split('-')[0] : data.period);
  const count = data.employeeCount || data.totalEmployees || 0;
  const amount = data.totalContributions || data.totalInsuranceCollected || 0;

  return {
    id: data.id || data._id || `ins_${year || new Date().getFullYear()}_${count}_${amount}`,
    period: data.period || (data.year ? data.year.toString() : ''),
    title: 'Insurance Report',
    totalContributions: amount,
    insuranceTypes: data.insuranceTypes || [],
    employeeCount: count,
    generatedAt: data.generatedAt || data.generatedDate || new Date().toISOString(),
    status: data.status || 'final',
    downloadUrl: data.downloadUrl,
    startDate: data.startDate,
    endDate: data.endDate
  };
};

// Helper to transform backend Benefits Report
const transformBenefitsReport = (data: any): BenefitsReport => {
  const year = data.year || (data.period && data.period.includes('_') ? data.period.split('_')[0].split('-')[0] : data.period);
  const count = data.employeeCount || data.totalEmployees || 0;
  const amount = data.totalBenefits || data.totalBenefitsCollected || 0;

  return {
    id: data.id || data._id || `ben_${year || new Date().getFullYear()}_${count}_${amount}`,
    period: data.period || (data.year ? data.year.toString() : ''),
    title: 'Benefits Report',
    totalBenefits: amount,
    benefitTypes: data.benefitTypes || [],
    employeeCount: count,
    generatedAt: data.generatedAt || data.generatedDate || new Date().toISOString(),
    status: data.status || 'final',
    downloadUrl: data.downloadUrl,
    startDate: data.startDate,
    endDate: data.endDate
  };
};

export const financeStaffService = {
  // Month-End and Year-End Payroll Summaries
  async getPayrollSummaries(filters?: SummaryFilters) {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);

    const response = await api.get<PayrollSummary[]>(`/finance/payroll-summaries?${params}`);
    return response;
  },

  async generatePayrollSummary(reportData: {
    reportType?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.post<PayrollSummary>('/finance/payroll-summaries/generate', reportData);
    return response;
  },

  async downloadPayrollSummary(summaryId: string) {
    return await api.downloadFile(`/finance/payroll-summaries/${summaryId}/download`);
  },

  // Tax, Insurance, and Benefits Reports
  async getTaxReports(period?: string) {
    // If period/year is provided, pass as year param, otherwise default to current year
    const dateStr = period && period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr && dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;
    const finalYear = year || new Date().getFullYear();
    const params = `?type=tax&year=${finalYear}`;
    const response = await api.get<any>(`/payroll/tracking/reports/compliance${params}`);
    if (response.data) {
      // Handle both array and single object responses
      const data = Array.isArray(response.data) ? response.data : [response.data];
      response.data = data.map(transformTaxReport);
    }
    return response as any;
  },

  async generateTaxReport(period: string) {
    // Match payroll-specialist.ts logic: extract year from period/date
    // Handle "YYYY-MM-DD_YYYY-MM-DD" format from component
    const dateStr = period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;

    const response = await api.get<any>(`/payroll/tracking/reports/compliance?type=tax&year=${year}`);
    if (response.data) {
      response.data = transformTaxReport(response.data);
    }
    return response as any;
  },

  async getInsuranceReports(period?: string) {
    // If period/year is provided, pass as year param, otherwise default to current year
    const dateStr = period && period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr && dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;
    const finalYear = year || new Date().getFullYear();
    const params = `?type=insurance&year=${finalYear}`;
    const response = await api.get<any>(`/payroll/tracking/reports/compliance${params}`);
    if (response.data) {
      const data = Array.isArray(response.data) ? response.data : [response.data];
      response.data = data.map(transformInsuranceReport);
    }
    return response as any;
  },

  async generateInsuranceReport(period: string) {
    // Match payroll-specialist.ts logic: extract year from period/date
    const dateStr = period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;
    const response = await api.get<any>(`/payroll/tracking/reports/compliance?type=insurance&year=${year}`);
    if (response.data) {
      response.data = transformInsuranceReport(response.data);
    }
    return response as any;
  },

  async getBenefitsReports(period?: string) {
    // If period/year is provided, pass as year param, otherwise default to current year
    const dateStr = period && period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr && dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;
    const finalYear = year || new Date().getFullYear();
    const params = `?type=benefits&year=${finalYear}`;
    const response = await api.get<any>(`/payroll/tracking/reports/compliance${params}`);
    if (response.data) {
      const data = Array.isArray(response.data) ? response.data : [response.data];
      response.data = data.map(transformBenefitsReport);
    }
    return response as any;
  },

  async generateBenefitsReport(period: string) {
    // Match payroll-specialist.ts logic: extract year from period/date
    const dateStr = period.includes('_') ? period.split('_')[0] : period;
    const year = dateStr.includes('-') ? new Date(dateStr).getFullYear() : dateStr;
    const response = await api.get<any>(`/payroll/tracking/reports/compliance?type=benefits&year=${year}`);
    if (response.data) {
      response.data = transformBenefitsReport(response.data);
    }
    return response as any;
  },

  async getPayslipHistory(period?: string) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    const response = await api.get<PayslipHistoryReport[]>(`/payroll/tracking/reports/department-payroll?${params}`);
    // Payslip history structure usually matches, but we can add transform here if needed in future
    return response;
  },

  async generatePayslipHistoryReport(period: string) {
    const response = await api.get<PayslipHistoryReport>(`/payroll/tracking/reports/department-payroll?period=${period}`);
    return response;
  },

  async generateDepartmentalReport(reportData: {
    reportType?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.post<any>('/payroll/tracking/reports/departmental/generate', reportData);
    return response;
  },

  async getDepartmentalReports(filters?: any) {
    const params = new URLSearchParams();
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<any[]>(`/payroll/tracking/reports/department-payroll?${params}`);
    return response;
  },

  async downloadReport(reportId: string, reportType: 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'payroll-summary') {
    // Standardize to use payroll tracking routes where actual data resides
    // Note: If a specific download endpoint doesn't exist, this might still fail, 
    // but these are more correct than the previous /finance/ routes.
    let endpoint = `/payroll/tracking/reports/compliance/${reportId}/download`;
    if (reportType === 'payroll-summary' || reportType === 'payslip-history') {
      endpoint = `/payroll/tracking/reports/department-payroll/${reportId}/download`;
    }
    return await api.downloadFile(endpoint);
  },

  // Approved Disputes and Claims Notifications
  async getApprovedDisputes() {
    const response = await api.get<ApprovedDispute[]>('/payroll/tracking/disputes/approved');
    return response;
  },

  async getApprovedClaims() {
    const response = await api.get<ApprovedClaim[]>('/payroll/tracking/claims/approved');
    return response;
  },

  async markNotificationAsRead(type: 'dispute' | 'claim', id: string) {
    const response = await api.post(`/finance/notifications/${type}/${id}/read`);
    return response;
  },

  // Refund Generation
  async getRefunds(status?: RefundGeneration['status']) {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<RefundGeneration[]>(`/payroll/tracking/refunds${params}`);
    return response;
  },

  async generateRefund(request: RefundRequest, financeStaffId: string) {
    if (request.disputeId) {
      // Generate dispute refund
      const response = await api.post<RefundGeneration>(
        `/payroll/tracking/refunds/dispute/${request.disputeId}?financeStaffId=${financeStaffId}`,
        {
          refundDetails: {
            amount: request.refundDetails.amount,
            description: request.refundDetails.description
          },
          employeeId: request.employeeId
        }
      );
      return response;
    } else if (request.claimId) {
      // Generate claim refund
      const response = await api.post<RefundGeneration>(
        `/payroll/tracking/refunds/claim/${request.claimId}?financeStaffId=${financeStaffId}`,
        {
          refundDetails: {
            amount: request.refundDetails.amount,
            description: request.refundDetails.description
          },
          employeeId: request.employeeId
        }
      );
      return response;
    } else {
      throw new Error('Either disputeId or claimId must be provided');
    }
  },

  async getPayrollCycles() {
    const response = await api.get<PayrollCycle[]>('/payroll/tracking/payroll-cycles');
    return response;
  },

  async processRefund(refundId: string) {
    const response = await api.post<RefundGeneration>(`/finance/refunds/${refundId}/process`);
    return response;
  },

  async updateRefundStatus(refundId: string, status: RefundGeneration['status'], notes?: string) {
    const response = await api.patch<RefundGeneration>(`/finance/refunds/${refundId}`, { status, notes });
    return response;
  },
};
