import apiService from '../api';

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

export const payrollConfigurationService = {
  // ========== TAX RULES ==========
  getTaxRules: async () => {
    return apiService.get('/payroll-configuration-requirements/tax-rules');
  },

  getTaxRuleById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/tax-rules/${id}`);
  },

  createTaxRule: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/tax-rules', data);
  },

  updateTaxRule: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-rules/${id}`, data);
  },

  approveTaxRule: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-rules/${id}/approve`, data);
  },

  rejectTaxRule: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-rules/${id}/reject`, data);
  },

  deleteTaxRule: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/tax-rules/${id}`);
  },

   getTaxBrackets: async () => {
    return apiService.get('/payroll-configuration-requirements/tax-brackets');
  },

  getTaxBracketById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/tax-brackets/${id}`);
  },

  createTaxBracket: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/tax-brackets', data);
  },

  updateTaxBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-brackets/${id}`, data);
  },

  deleteTaxBracket: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/tax-brackets/${id}`);
  },

  approveTaxBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-brackets/${id}/approve`, data);
  },

  rejectTaxBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/tax-brackets/${id}/reject`, data);
  },

  // ========== INSURANCE BRACKETS ==========
  getInsuranceBrackets: async () => {
    return apiService.get('/payroll-configuration-requirements/insurance-brackets');
  },

  getInsuranceBracketById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/insurance-brackets/${id}`);
  },

  createInsuranceBracket: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/insurance-brackets', data);
  },

  updateInsuranceBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/insurance-brackets/${id}`, data);
  },

  approveInsuranceBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/insurance-brackets/${id}/approve`, data);
  },

  rejectInsuranceBracket: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/insurance-brackets/${id}/reject`, data);
  },

  deleteInsuranceBracket: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/insurance-brackets/${id}`);
  },

  calculateContributions: async (id: string, salary: number) => {
    const url = `/payroll-configuration-requirements/insurance-brackets/${id}/calculate-contributions?salary=${salary}`;
    return apiService.get(url);
  },

  

  // ========== PAYROLL POLICIES ==========
  getPayrollPolicies: async (queryParams?: any) => {
    const queryString = buildQueryString(queryParams || {});
    const url = `/payroll-configuration-requirements/policies/all${queryString}`;
    return apiService.get(url);
  },

  getPayrollPolicyById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/policies/${id}`);
  },

  createPayrollPolicy: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/policies', data);
  },

  updatePayrollPolicy: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/policies/${id}`, data);
  },

  approvePayrollPolicy: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/policies/${id}/approve`, data);
  },

  rejectPayrollPolicy: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/policies/${id}/reject`, data);
  },

  deletePayrollPolicy: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/policies/${id}`);
  },

  // ========== PAY TYPES ==========
  getPayTypes: async (queryParams?: any) => {
    const queryString = buildQueryString(queryParams || {});
    const url = `/payroll-configuration-requirements/pay-types/all${queryString}`;
    return apiService.get(url);
  },

  getPayTypeById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/pay-types/${id}`);
  },

  createPayType: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/pay-types', data);
  },

  updatePayType: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-types/${id}`, data);
  },

  approvePayType: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-types/${id}/approve`, data);
  },

  rejectPayType: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-types/${id}/reject`, data);
  },

  deletePayType: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/pay-types/${id}`);
  },

  // ========== ALLOWANCES ==========
  getAllowances: async (queryParams?: any) => {
    const queryString = buildQueryString(queryParams || {});
    const url = `/payroll-configuration-requirements/allowances/all${queryString}`;
    return apiService.get(url);
  },

  getAllowanceById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/allowances/${id}`);
  },

  createAllowance: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/allowances', data);
  },

  updateAllowance: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/allowances/${id}`, data);
  },

  approveAllowance: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/allowances/${id}/approve`, data);
  },

  rejectAllowance: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/allowances/${id}/reject`, data);
  },

  deleteAllowance: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/allowances/${id}`);
  },

  // ========== SIGNING BONUSES ==========
  getSigningBonuses: async (queryParams?: any) => {
    const queryString = buildQueryString(queryParams || {});
    const url = `/payroll-configuration-requirements/signing-bonuses/all${queryString}`;
    return apiService.get(url);
  },

  getSigningBonusById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/signing-bonuses/${id}`);
  },

  createSigningBonus: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/signing-bonuses', data);
  },

  updateSigningBonus: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/signing-bonuses/${id}`, data);
  },

  approveSigningBonus: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/signing-bonuses/${id}/approve`, data);
  },

  rejectSigningBonus: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/signing-bonuses/${id}/reject`, data);
  },

  deleteSigningBonus: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/signing-bonuses/${id}`);
  },

  // ========== TERMINATION BENEFITS ==========
  getTerminationBenefits: async (queryParams?: any) => {
    const queryString = buildQueryString(queryParams || {});
    const url = `/payroll-configuration-requirements/termination-benefits/all${queryString}`;
    return apiService.get(url);
  },

  getTerminationBenefitById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/termination-benefits/${id}`);
  },

  createTerminationBenefit: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/termination-benefits', data);
  },

  updateTerminationBenefit: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/termination-benefits/${id}`, data);
  },

  approveTerminationBenefit: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/termination-benefits/${id}/approve`, data);
  },

  rejectTerminationBenefit: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/termination-benefits/${id}/reject`, data);
  },

  deleteTerminationBenefit: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/termination-benefits/${id}`);
  },

  calculateTerminationEntitlements: async (employeeData: any) => {
    return apiService.post('/payroll-configuration-requirements/termination-benefits/calculate', employeeData);
  },

  // ========== PAY GRADES ==========
  getPayGrades: async (status?: string) => {
    const queryString = status ? `?status=${encodeURIComponent(status)}` : '';
    const url = `/payroll-configuration-requirements/pay-grades${queryString}`;
    return apiService.get(url);
  },

  getPayGradeById: async (id: string) => {
    return apiService.get(`/payroll-configuration-requirements/pay-grades/${id}`);
  },

  createPayGrade: async (data: any) => {
    return apiService.post('/payroll-configuration-requirements/pay-grades', data);
  },

  updatePayGrade: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-grades/${id}`, data);
  },

  approvePayGrade: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-grades/${id}/approve`, data);
  },

  rejectPayGrade: async (id: string, data: any) => {
    return apiService.patch(`/payroll-configuration-requirements/pay-grades/${id}/reject`, data);
  },

  deletePayGrade: async (id: string) => {
    return apiService.delete(`/payroll-configuration-requirements/pay-grades/${id}`);
  },

  // ========== COMPANY SETTINGS ==========

    getCompanyWideSettings: async () => {
      return apiService.get('/payroll-configuration-requirements/company-settings');
    },

    updateCompanyWideSettings: async (data: any) => {
      return apiService.put('/payroll-configuration-requirements/company-settings', data);
    },

    // New: Get only the company currency
    getCompanyCurrency: async () => {
      return apiService.get('/payroll-configuration-requirements/company-currency');
    },

};