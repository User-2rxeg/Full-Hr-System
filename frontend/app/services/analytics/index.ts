import api from "@/app/services/api";

// Re-export all analytics services
export * from './recruitment-analytics';
export * from './onboarding-analytics';
export * from './offboarding-analytics';
export * from './lifecycle-analytics';
export * from './time-management-analytics';
export * from './leaves-analytics';

export interface PayrollStory {
    headline: string;
    narrative: string;
    trend: 'RISING' | 'FALLING' | 'STABLE';
    changePercentage: number;
}

export interface PayrollAnomaly {
    type: 'GHOST_EMPLOYEE' | 'GRADE_DEVIATION' | 'UNUSUAL_BONUS' | 'SALARY_SPIKE' | 'NEGATIVE_NET_PAY';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    employeeId: string;
    employeeName?: string;
    description: string;
    detectedAt: string;
    amount?: number;
}

export interface ForecastResponse {
    nextMonthPrediction: number;
    confidence: number;
}

export interface PayrollCostTrend {
    period: string;
    periodDate: string;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    employeeCount: number;
    avgNetPerEmployee: number;
    changeFromPrevious: number;
}

export interface DepartmentCostBreakdown {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    avgSalary: number;
    percentageOfTotal: number;
    trend: 'RISING' | 'FALLING' | 'STABLE';
    changePercentage: number;
}

export interface DeductionsBreakdown {
    category: string;
    totalAmount: number;
    percentage: number;
    employeesAffected: number;
    avgPerEmployee: number;
    items: { name: string; amount: number; count: number }[];
}

export interface SalaryDistribution {
    bracket: string;
    minSalary: number;
    maxSalary: number;
    employeeCount: number;
    percentage: number;
    totalPayout: number;
}

export interface ClaimsDisputesMetrics {
    period: string;
    claimsSubmitted: number;
    claimsApproved: number;
    claimsRejected: number;
    claimsPending: number;
    totalClaimsAmount: number;
    avgClaimAmount: number;
    disputesSubmitted: number;
    disputesResolved: number;
    disputesPending: number;
    avgResolutionDays: number;
}

export interface PayrollComplianceMetrics {
    runId: string;
    period: string;
    totalEmployees: number;
    employeesWithExceptions: number;
    missingBankAccounts: number;
    negativeNetPay: number;
    salaryBelowMinimum: number;
    complianceScore: number;
    status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

export interface PayrollForecast {
    period: string;
    predictedTotal: number;
    predictedGross: number;
    predictedDeductions: number;
    confidence: number;
    factors: string[];
}

export interface ExecutionMetrics {
    period: string;
    runsInitiated: number;
    runsApproved: number;
    runsRejected: number;
    avgProcessingDays: number;
    exceptionsRaised: number;
    exceptionsResolved: number;
    freezeCount: number;
    unfreezeCount: number;
}

export interface PayrollDashboardSummary {
    overview: {
        currentPeriod: string;
        totalPayrollCost: number;
        totalEmployees: number;
        avgSalary: number;
        totalDeductions: number;
        pendingApprovals: number;
        exceptionsCount: number;
        paymentsPending: number;
        paymentsPaid: number;
    };
    trends: PayrollCostTrend[];
    departmentBreakdown: DepartmentCostBreakdown[];
    deductions: DeductionsBreakdown[];
    salaryDistribution: SalaryDistribution[];
    claimsDisputes: ClaimsDisputesMetrics;
    compliance: PayrollComplianceMetrics;
    forecast: PayrollForecast;
    anomalies: PayrollAnomaly[];
    executionMetrics: ExecutionMetrics[];
}

export const payrollAnalyticsService = {
    // Dashboard summary with all analytics
    getDashboardSummary: async (): Promise<PayrollDashboardSummary> => {
        const response = await api.get<PayrollDashboardSummary>('/payroll-analytics/dashboard');
        return response.data as PayrollDashboardSummary;
    },

    getStory: async (entityId?: string): Promise<PayrollStory> => {
        const query = entityId ? `?entityId=${entityId}` : '';
        const response = await api.get<PayrollStory>(`/payroll-analytics/story${query}`);
        // @ts-ignore
        return response.data;
    },

    getGhostEmployees: async (runId: string): Promise<PayrollAnomaly[]> => {
        const response = await api.get<PayrollAnomaly[]>(`/payroll-analytics/anomalies/ghosts/${runId}`);
        // @ts-ignore
        return response.data;
    },

    getForecast: async (): Promise<ForecastResponse> => {
        const response = await api.get<ForecastResponse>('/payroll-analytics/forecast');
        // @ts-ignore
        return response.data;
    },

    // Cost trends over time
    getTrends: async (months: number = 12): Promise<PayrollCostTrend[]> => {
        const response = await api.get<PayrollCostTrend[]>(`/payroll-analytics/trends?months=${months}`);
        return response.data as PayrollCostTrend[];
    },

    // Department cost breakdown
    getDepartmentBreakdown: async (): Promise<DepartmentCostBreakdown[]> => {
        const response = await api.get<DepartmentCostBreakdown[]>('/payroll-analytics/departments');
        return response.data as DepartmentCostBreakdown[];
    },

    // Deductions breakdown
    getDeductionsBreakdown: async (): Promise<DeductionsBreakdown[]> => {
        const response = await api.get<DeductionsBreakdown[]>('/payroll-analytics/deductions');
        return response.data as DeductionsBreakdown[];
    },

    // Salary distribution
    getSalaryDistribution: async (): Promise<SalaryDistribution[]> => {
        const response = await api.get<SalaryDistribution[]>('/payroll-analytics/salary-distribution');
        return response.data as SalaryDistribution[];
    },

    // Claims and disputes metrics
    getClaimsDisputesMetrics: async (months: number = 6): Promise<ClaimsDisputesMetrics[]> => {
        const response = await api.get<ClaimsDisputesMetrics[]>(`/payroll-analytics/claims-disputes?months=${months}`);
        return response.data as ClaimsDisputesMetrics[];
    },

    // Compliance metrics
    getComplianceMetrics: async (): Promise<PayrollComplianceMetrics> => {
        const response = await api.get<PayrollComplianceMetrics>('/payroll-analytics/compliance');
        return response.data as PayrollComplianceMetrics;
    },

    // Advanced forecast
    getAdvancedForecast: async (): Promise<PayrollForecast> => {
        const response = await api.get<PayrollForecast>('/payroll-analytics/forecast');
        return response.data as PayrollForecast;
    },

    // All anomalies
    getAnomalies: async (): Promise<PayrollAnomaly[]> => {
        const response = await api.get<PayrollAnomaly[]>('/payroll-analytics/anomalies');
        return response.data as PayrollAnomaly[];
    },

    // Execution metrics
    getExecutionMetrics: async (months: number = 6): Promise<ExecutionMetrics[]> => {
        const response = await api.get<ExecutionMetrics[]>(`/payroll-analytics/execution?months=${months}`);
        return response.data as ExecutionMetrics[];
    },
};


export interface RiskAnalysis {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    flags: string[];
}

export interface ImpactAnalysis {
    replacementDays: number;
    capacityLossScore: number;
    knowledgeLossRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ProfileHealth {
    completenessScore: number;
    missingCriticalFields: string[];
    dataQualityIssues: string[];
    lastUpdated: Date;
}

export const ProfileAnalyticsService = {
    /**
     * Engine 1: Risk Analysis
     */
    analyzeChangeRisk: async (data: { changes: Record<string, any>; context: string }) => {
        const response = await api.post<RiskAnalysis>('/employee/analytics/change-risk', data);
        return response.data;
    },

    getRetentionRisk: async (employeeId: string) => {
        const response = await api.get<RiskAnalysis>(`/employee/analytics/${employeeId}/retention-risk`);
        return response.data;
    },

    /**
     * Engine 2: Impact Analysis
     */
    getDeactivationImpact: async (employeeId: string) => {
        const response = await api.get<ImpactAnalysis>(`/employee/analytics/${employeeId}/impact`);
        return response.data;
    },

    /**
     * Engine 3: Profile Health
     */
    getProfileHealth: async (employeeId: string) => {
        const response = await api.get<ProfileHealth>(`/employee/analytics/${employeeId}/health`);
        return response.data;
    }
};


export interface AttritionRiskResponse {
    employeeId: string;
    name: string;
    riskScore: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    factors: string[];
    updatedAt: string;
}

export interface OrgPulseResponse {
    headcount: number;
    genderDiversity: { _id: string; count: number }[];
    avgPerformanceScore: number;
    activeAppraisals: number;
    avgTenure?: number;
    dominantDepartment?: string;
    timestamp: string;
}

export interface SkillMatrixResponse {
    skill: string;
    avgLevel: number;
    headcount: number;
    topTalent: { name: string; level: number }[];
}

// ============ PAYROLL CONFIGURATION ANALYTICS INTERFACES ============

export interface ConfigStatusOverview {
    category: string;
    total: number;
    draft: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    pendingActions: number;
    lastUpdated: string | null;
}

export interface AllowanceAnalysis {
    totalAllowances: number;
    totalValue: number;
    avgAllowanceAmount: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    distribution: { name: string; amount: number; status: string }[];
    topAllowances: { name: string; amount: number }[];
}

export interface TaxRulesAnalysis {
    totalRules: number;
    avgTaxRate: number;
    minRate: number;
    maxRate: number;
    byStatus: { status: string; count: number }[];
    rateDistribution: { name: string; rate: number; status: string; description?: string }[];
    effectiveTaxBurden: number;
}

export interface InsuranceAnalysis {
    totalBrackets: number;
    avgEmployeeRate: number;
    avgEmployerRate: number;
    totalEmployerBurden: number;
    byStatus: { status: string; count: number }[];
    brackets: {
        name: string;
        minSalary: number;
        maxSalary: number;
        employeeRate: number;
        employerRate: number;
        status: string;
    }[];
    coverageGaps: { min: number; max: number }[];
}

export interface PayGradeAnalysis {
    totalGrades: number;
    avgBaseSalary: number;
    avgGrossSalary: number;
    minSalary: number;
    maxSalary: number;
    salarySpread: number;
    byStatus: { status: string; count: number; totalSalary: number }[];
    gradeDistribution: {
        grade: string;
        baseSalary: number;
        grossSalary: number;
        allowanceComponent: number;
        status: string;
    }[];
}

export interface PayTypeAnalysis {
    totalTypes: number;
    byStatus: { status: string; count: number }[];
    types: { type: string; amount: number; status: string }[];
    avgAmount: number;
}

export interface SigningBonusAnalysis {
    totalBonuses: number;
    totalValue: number;
    avgBonusAmount: number;
    minBonus: number;
    maxBonus: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    byPosition: { positionName: string; amount: number; status: string }[];
    topPositions: { positionName: string; amount: number }[];
}

export interface PolicyAnalysis {
    totalPolicies: number;
    byType: { type: string; count: number; avgPercentage: number; avgFixedAmount: number }[];
    byApplicability: { applicability: string; count: number }[];
    byStatus: { status: string; count: number }[];
    policies: {
        policyName: string;
        policyType: string;
        applicability: string;
        percentage: number;
        fixedAmount: number;
        effectiveDate: string;
        status: string;
    }[];
    upcomingEffective: {
        policyName: string;
        effectiveDate: string;
        daysUntilEffective: number;
    }[];
}

export interface TerminationBenefitsAnalysis {
    totalBenefits: number;
    totalValue: number;
    avgBenefitAmount: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    benefits: { name: string; amount: number; terms?: string; status: string }[];
}

export interface ApprovalWorkflowMetrics {
    totalConfigurations: number;
    pendingApprovals: number;
    avgApprovalTime: number;
    approvalRateByCategory: {
        category: string;
        approved: number;
        rejected: number;
        pending: number;
        approvalRate: number;
    }[];
    recentApprovals: {
        category: string;
        name: string;
        approvedBy?: string;
        approvedAt?: string;
    }[];
    recentRejections: {
        category: string;
        name: string;
        rejectedAt?: string;
    }[];
}

export interface CompanySettingsAnalysis {
    hasSettings: boolean;
    payDate: string | null;
    timeZone: string | null;
    currency: string;
    lastUpdated: string | null;
}

export interface ConfigurationHealthScore {
    overallScore: number;
    categories: {
        category: string;
        score: number;
        issues: string[];
        suggestions: string[];
    }[];
    criticalIssues: string[];
    recommendations: string[];
}

export interface ConfigurationDashboardSummary {
    overview: {
        totalConfigurations: number;
        approvedConfigurations: number;
        pendingApprovals: number;
        rejectedConfigurations: number;
        overallApprovalRate: number;
        lastConfigUpdate: string | null;
    };
    statusOverview: ConfigStatusOverview[];
    allowanceAnalysis: AllowanceAnalysis;
    taxRulesAnalysis: TaxRulesAnalysis;
    insuranceAnalysis: InsuranceAnalysis;
    payGradeAnalysis: PayGradeAnalysis;
    payTypeAnalysis: PayTypeAnalysis;
    signingBonusAnalysis: SigningBonusAnalysis;
    policyAnalysis: PolicyAnalysis;
    terminationBenefits: TerminationBenefitsAnalysis;
    approvalMetrics: ApprovalWorkflowMetrics;
    companySettings: CompanySettingsAnalysis;
    healthScore: ConfigurationHealthScore;
}

export const payrollConfigAnalyticsService = {
    // Dashboard summary with all configuration analytics
    getDashboardSummary: async (): Promise<ConfigurationDashboardSummary> => {
        const response = await api.get<ConfigurationDashboardSummary>('/payroll-config-analytics/dashboard');
        return response.data as ConfigurationDashboardSummary;
    },

    // Status overview for all categories
    getStatusOverview: async (): Promise<ConfigStatusOverview[]> => {
        const response = await api.get<ConfigStatusOverview[]>('/payroll-config-analytics/status-overview');
        return response.data as ConfigStatusOverview[];
    },

    // Allowance analysis
    getAllowanceAnalysis: async (): Promise<AllowanceAnalysis> => {
        const response = await api.get<AllowanceAnalysis>('/payroll-config-analytics/allowances');
        return response.data as AllowanceAnalysis;
    },

    // Tax rules analysis
    getTaxRulesAnalysis: async (): Promise<TaxRulesAnalysis> => {
        const response = await api.get<TaxRulesAnalysis>('/payroll-config-analytics/tax-rules');
        return response.data as TaxRulesAnalysis;
    },

    // Insurance analysis
    getInsuranceAnalysis: async (): Promise<InsuranceAnalysis> => {
        const response = await api.get<InsuranceAnalysis>('/payroll-config-analytics/insurance');
        return response.data as InsuranceAnalysis;
    },

    // Pay grades analysis
    getPayGradeAnalysis: async (): Promise<PayGradeAnalysis> => {
        const response = await api.get<PayGradeAnalysis>('/payroll-config-analytics/pay-grades');
        return response.data as PayGradeAnalysis;
    },

    // Pay types analysis
    getPayTypeAnalysis: async (): Promise<PayTypeAnalysis> => {
        const response = await api.get<PayTypeAnalysis>('/payroll-config-analytics/pay-types');
        return response.data as PayTypeAnalysis;
    },

    // Signing bonus analysis
    getSigningBonusAnalysis: async (): Promise<SigningBonusAnalysis> => {
        const response = await api.get<SigningBonusAnalysis>('/payroll-config-analytics/signing-bonuses');
        return response.data as SigningBonusAnalysis;
    },

    // Policy analysis
    getPolicyAnalysis: async (): Promise<PolicyAnalysis> => {
        const response = await api.get<PolicyAnalysis>('/payroll-config-analytics/policies');
        return response.data as PolicyAnalysis;
    },

    // Termination benefits analysis
    getTerminationBenefitsAnalysis: async (): Promise<TerminationBenefitsAnalysis> => {
        const response = await api.get<TerminationBenefitsAnalysis>('/payroll-config-analytics/termination-benefits');
        return response.data as TerminationBenefitsAnalysis;
    },

    // Approval workflow metrics
    getApprovalMetrics: async (): Promise<ApprovalWorkflowMetrics> => {
        const response = await api.get<ApprovalWorkflowMetrics>('/payroll-config-analytics/approval-metrics');
        return response.data as ApprovalWorkflowMetrics;
    },

    // Company settings analysis
    getCompanySettings: async (): Promise<CompanySettingsAnalysis> => {
        const response = await api.get<CompanySettingsAnalysis>('/payroll-config-analytics/company-settings');
        return response.data as CompanySettingsAnalysis;
    },

    // Configuration health score
    getHealthScore: async (): Promise<ConfigurationHealthScore> => {
        const response = await api.get<ConfigurationHealthScore>('/payroll-config-analytics/health-score');
        return response.data as ConfigurationHealthScore;
    },
};

export const analyticsService = {
    getOrgPulse: async (): Promise<OrgPulseResponse> => {
        const response = await api.get('/analytics/org-pulse');
        console.log('[Analytics] Org Pulse response:', response);
        if (response.error || !response.data) {
            console.warn('[Analytics] Org Pulse error:', response.error);
            return {
                headcount: 0,
                genderDiversity: [],
                avgPerformanceScore: 0,
                activeAppraisals: 0,
                timestamp: new Date().toISOString(),
            };
        }
        return response.data as OrgPulseResponse;
    },

    getAttritionRisk: async (employeeId: string): Promise<AttritionRiskResponse> => {
        const response = await api.get(`/analytics/attrition/${employeeId}`);
        return response.data as AttritionRiskResponse;
    },

    getDepartmentSkills: async (departmentId: string): Promise<SkillMatrixResponse[]> => {
        const response = await api.get(`/analytics/department/${departmentId}/skills`);
        return response.data as SkillMatrixResponse[];
    },
};