// =====================================================
// Offboarding Analytics Service - Frontend API Layer
// Matches backend interfaces exactly
// =====================================================

import api from "@/app/services/api";

// ============ TYPES - Match Backend Interfaces ============

export interface OffboardingOverviewMetrics {
    totalTerminations: number;
    pendingReview: number;
    inProgress: number;
    completedThisMonth: number;
    avgClearanceDays: number;
    voluntaryRate: number;
    involuntaryRate: number;
}

export interface AttritionPatternAnalysis {
    period: string;
    totalExits: number;
    voluntary: number;
    involuntary: number;
    voluntaryRate: number;
    byDepartment: { department: string; count: number }[];
    byTenure: { range: string; count: number }[];
}

export interface ClearanceEfficiencyMetrics {
    department: string;
    totalProcessed: number;
    avgProcessingDays: number;
    onTimeRate: number;
    pendingCount: number;
    overdueCount: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ExitReasonAnalysis {
    reason: string;
    count: number;
    percentage: number;
    byInitiator: {
        employee: number;
        hr: number;
        manager: number;
    };
}

export interface TenureAtExitMetrics {
    range: string;
    count: number;
    percentage: number;
    avgTenureDays: number;
    voluntaryPercentage: number;
}

export interface TerminationTrend {
    period: string;
    total: number;
    voluntary: number;
    involuntary: number;
    approvalRate: number;
    avgProcessingDays: number;
}

export interface EquipmentReturnMetrics {
    equipmentType: string;
    totalTracked: number;
    returned: number;
    pending: number;
    returnRate: number;
    avgReturnDays: number;
}

export interface DepartmentAttritionRisk {
    department: string;
    totalEmployees: number;
    exitedLast90Days: number;
    exitedLast180Days: number;
    attritionRate90Days: number;
    attritionRate180Days: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    topExitReasons: string[];
}

export interface OffboardingDashboardSummary {
    overview: OffboardingOverviewMetrics;
    clearanceEfficiency: ClearanceEfficiencyMetrics[];
    attritionPatterns: AttritionPatternAnalysis[];
    exitReasons: ExitReasonAnalysis[];
    tenureMetrics: TenureAtExitMetrics[];
    trends: TerminationTrend[];
    equipmentTracking: EquipmentReturnMetrics[];
    departmentRisk: DepartmentAttritionRisk[];
}

// ============ API SERVICE ============

export const offboardingAnalyticsService = {
    /**
     * Get comprehensive offboarding analytics dashboard
     */
    getDashboardSummary: async (): Promise<OffboardingDashboardSummary> => {
        const response = await api.get<OffboardingDashboardSummary>('/offboarding/analytics/dashboard');
        return response.data as OffboardingDashboardSummary;
    },

    /**
     * Get offboarding overview metrics
     */
    getOverviewMetrics: async (): Promise<OffboardingOverviewMetrics> => {
        const response = await api.get<OffboardingOverviewMetrics>('/offboarding/analytics/overview');
        return response.data as OffboardingOverviewMetrics;
    },

    /**
     * Get clearance efficiency by department
     */
    getClearanceEfficiencyMetrics: async (): Promise<ClearanceEfficiencyMetrics[]> => {
        const response = await api.get<ClearanceEfficiencyMetrics[]>('/offboarding/analytics/clearance-efficiency');
        return response.data as ClearanceEfficiencyMetrics[];
    },

    /**
     * Get attrition pattern analysis
     */
    getAttritionPatterns: async (months?: number): Promise<AttritionPatternAnalysis[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<AttritionPatternAnalysis[]>(`/offboarding/analytics/attrition-patterns${query}`);
        return response.data as AttritionPatternAnalysis[];
    },

    /**
     * Get exit reason analysis
     */
    getExitReasonAnalysis: async (): Promise<ExitReasonAnalysis[]> => {
        const response = await api.get<ExitReasonAnalysis[]>('/offboarding/analytics/exit-reasons');
        return response.data as ExitReasonAnalysis[];
    },

    /**
     * Get tenure at exit metrics
     */
    getTenureAtExitMetrics: async (): Promise<TenureAtExitMetrics[]> => {
        const response = await api.get<TenureAtExitMetrics[]>('/offboarding/analytics/tenure-analysis');
        return response.data as TenureAtExitMetrics[];
    },

    /**
     * Get termination trends over time
     */
    getTerminationTrends: async (months?: number): Promise<TerminationTrend[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<TerminationTrend[]>(`/offboarding/analytics/trends${query}`);
        return response.data as TerminationTrend[];
    },

    /**
     * Get equipment return tracking metrics
     */
    getEquipmentReturnMetrics: async (): Promise<EquipmentReturnMetrics[]> => {
        const response = await api.get<EquipmentReturnMetrics[]>('/offboarding/analytics/equipment-tracking');
        return response.data as EquipmentReturnMetrics[];
    },

    /**
     * Get department attrition risk analysis
     */
    getDepartmentAttritionRisk: async (): Promise<DepartmentAttritionRisk[]> => {
        const response = await api.get<DepartmentAttritionRisk[]>('/offboarding/analytics/department-risk');
        return response.data as DepartmentAttritionRisk[];
    },
};

export default offboardingAnalyticsService;
