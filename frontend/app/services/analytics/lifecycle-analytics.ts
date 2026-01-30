// =====================================================
// Lifecycle Analytics Service - Frontend API Layer
// Matches backend interfaces exactly
// =====================================================

import api from "@/app/services/api";

// ============ TYPES - Match Backend Interfaces ============

export interface QualityOfHireMetrics {
    hiringCohort: string;
    totalHires: number;
    stillEmployed: number;
    retentionRate: number;
    avgOnboardingDays: number;
    onboardingCompletionRate: number;
    voluntaryExits: number;
    involuntaryExits: number;
    avgTenureDays: number;
    qualityScore: number;
}

export interface CohortAnalysis {
    cohort: string;
    hireMonth: string;
    totalHired: number;
    stillActive: number;
    left30Days: number;
    left90Days: number;
    left180Days: number;
    leftYear: number;
    retentionRate30: number;
    retentionRate90: number;
    retentionRate180: number;
    retentionRateYear: number;
}

export interface EmployeeJourneyMetrics {
    employeeId: string;
    employeeName: string;
    department: string;
    applicationDate: string | null;
    interviewCount: number;
    offerDate: string | null;
    contractDate: string | null;
    startDate: string | null;
    onboardingCompletionDate: string | null;
    terminationDate: string | null;
    currentStatus: 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'CONTRACTED' | 'ONBOARDING' | 'ACTIVE' | 'TERMINATED';
    timeToHireDays: number | null;
    onboardingDays: number | null;
    tenureDays: number | null;
    totalJourneyDays: number | null;
}

export interface SourceToRetentionAnalysis {
    source: string;
    totalHires: number;
    stillActive: number;
    retentionRate: number;
    avgTenureDays: number;
    avgOnboardingScore: number;
    exitedWithin90Days: number;
    early90DayAttrition: number;
}

export interface HiringChannelROI {
    source: string;
    applicationsReceived: number;
    hiresMade: number;
    conversionRate: number;
    avgTimeToHire: number;
    retentionRate1Year: number;
    costPerHire: number;
    qualityScore: number;
    roiScore: number;
}

export interface DepartmentLifecycleMetrics {
    department: string;
    openPositions: number;
    applicationsLast30Days: number;
    hiresLast90Days: number;
    avgTimeToFill: number;
    onboardingInProgress: number;
    avgOnboardingDays: number;
    activeEmployees: number;
    terminationsLast90Days: number;
    attritionRate: number;
    healthScore: number;
}

export interface PipelineFlowAnalysis {
    stage: string;
    currentCount: number;
    avgDaysInStage: number;
    conversionToNext: number;
    dropoffRate: number;
    bottleneckScore: number;
}

export interface LifecycleOverview {
    totalOpenPositions: number;
    totalActiveApplications: number;
    totalPendingOffers: number;
    totalOnboarding: number;
    totalActiveEmployees: number;
    totalPendingTerminations: number;
    avgTimeToHire: number;
    avgOnboardingDays: number;
    overallRetentionRate: number;
    monthlyHires: number;
    monthlyTerminations: number;
    netGrowth: number;
}

export interface LifecycleDashboardSummary {
    overview: LifecycleOverview;
    qualityOfHire: QualityOfHireMetrics[];
    cohortAnalysis: CohortAnalysis[];
    sourceRetention: SourceToRetentionAnalysis[];
    departmentMetrics: DepartmentLifecycleMetrics[];
    pipelineFlow: PipelineFlowAnalysis[];
    recentJourneys: EmployeeJourneyMetrics[];
}

// ============ API SERVICE ============

export const lifecycleAnalyticsService = {
    /**
     * Get comprehensive employee lifecycle analytics dashboard
     */
    getDashboardSummary: async (): Promise<LifecycleDashboardSummary> => {
        const response = await api.get<LifecycleDashboardSummary>('/lifecycle/analytics/dashboard');
        return response.data as LifecycleDashboardSummary;
    },

    /**
     * Get lifecycle overview metrics
     */
    getLifecycleOverview: async (): Promise<LifecycleOverview> => {
        const response = await api.get<LifecycleOverview>('/lifecycle/analytics/overview');
        return response.data as LifecycleOverview;
    },

    /**
     * Get quality of hire metrics by cohort
     */
    getQualityOfHireMetrics: async (months?: number): Promise<QualityOfHireMetrics[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<QualityOfHireMetrics[]>(`/lifecycle/analytics/quality-of-hire${query}`);
        return response.data as QualityOfHireMetrics[];
    },

    /**
     * Get cohort retention analysis
     */
    getCohortAnalysis: async (months?: number): Promise<CohortAnalysis[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<CohortAnalysis[]>(`/lifecycle/analytics/cohort-analysis${query}`);
        return response.data as CohortAnalysis[];
    },

    /**
     * Get source to retention analysis
     */
    getSourceToRetentionAnalysis: async (): Promise<SourceToRetentionAnalysis[]> => {
        const response = await api.get<SourceToRetentionAnalysis[]>('/lifecycle/analytics/source-retention');
        return response.data as SourceToRetentionAnalysis[];
    },

    /**
     * Get department lifecycle health metrics
     */
    getDepartmentLifecycleMetrics: async (): Promise<DepartmentLifecycleMetrics[]> => {
        const response = await api.get<DepartmentLifecycleMetrics[]>('/lifecycle/analytics/department-metrics');
        return response.data as DepartmentLifecycleMetrics[];
    },

    /**
     * Get pipeline flow analysis
     */
    getPipelineFlowAnalysis: async (): Promise<PipelineFlowAnalysis[]> => {
        const response = await api.get<PipelineFlowAnalysis[]>('/lifecycle/analytics/pipeline-flow');
        return response.data as PipelineFlowAnalysis[];
    },

    /**
     * Get recent employee journey metrics
     */
    getRecentEmployeeJourneys: async (limit?: number): Promise<EmployeeJourneyMetrics[]> => {
        const query = limit ? `?limit=${limit}` : '';
        const response = await api.get<EmployeeJourneyMetrics[]>(`/lifecycle/analytics/employee-journeys${query}`);
        return response.data as EmployeeJourneyMetrics[];
    },
};

export default lifecycleAnalyticsService;
