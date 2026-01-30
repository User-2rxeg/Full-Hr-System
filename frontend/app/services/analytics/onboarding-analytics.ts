// =====================================================
// Onboarding Analytics Service - Frontend API Layer
// Matches backend interfaces exactly
// =====================================================

import api from "@/app/services/api";

// ============ TYPES - Match Backend Interfaces ============

export interface OnboardingOverviewMetrics {
    totalOnboardings: number;
    activeOnboardings: number;
    completedThisMonth: number;
    avgCompletionDays: number;
    onTimeCompletionRate: number;
    currentlyOverdue: number;
}

export interface TaskBottleneckAnalysis {
    taskName: string;
    department: string;
    totalOccurrences: number;
    avgCompletionDays: number;
    medianCompletionDays: number;
    overdueCount: number;
    overdueRate: number;
    slaComplianceRate: number;
    isBottleneck: boolean;
}

export interface DepartmentSLAMetrics {
    department: string;
    totalTasks: number;
    completedOnTime: number;
    completedLate: number;
    pending: number;
    overdue: number;
    avgCompletionDays: number;
    slaComplianceRate: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TimeToProductivityMetrics {
    employeeId: string;
    employeeName: string;
    department: string;
    startDate: string;
    onboardingDays: number;
    tasksCompleted: number;
    totalTasks: number;
    completionRate: number;
    isFullyOnboarded: boolean;
    daysToFullOnboarding: number | null;
}

export interface OnboardingProgressByDepartment {
    department: string;
    totalNewHires: number;
    fullyOnboarded: number;
    inProgress: number;
    avgCompletionRate: number;
    avgDaysToComplete: number;
}

export interface OnboardingTrend {
    period: string;
    newOnboardings: number;
    completedOnboardings: number;
    avgCompletionDays: number;
    overdueRate: number;
}

export interface TaskCompletionTimeline {
    taskName: string;
    department: string;
    expectedDays: number;
    actualAvgDays: number;
    variance: number;
    status: 'ON_TRACK' | 'DELAYED' | 'AT_RISK';
}

export interface OnboardingDashboardSummary {
    overview: OnboardingOverviewMetrics;
    departmentSLA: DepartmentSLAMetrics[];
    taskBottlenecks: TaskBottleneckAnalysis[];
    progressByDepartment: OnboardingProgressByDepartment[];
    recentOnboardings: TimeToProductivityMetrics[];
    trends: OnboardingTrend[];
    taskTimeline: TaskCompletionTimeline[];
}

// ============ API SERVICE ============

export const onboardingAnalyticsService = {
    /**
     * Get comprehensive onboarding analytics dashboard
     */
    getDashboardSummary: async (): Promise<OnboardingDashboardSummary> => {
        const response = await api.get<OnboardingDashboardSummary>('/onboarding/analytics/dashboard');
        return response.data as OnboardingDashboardSummary;
    },

    /**
     * Get onboarding overview metrics
     */
    getOverviewMetrics: async (): Promise<OnboardingOverviewMetrics> => {
        const response = await api.get<OnboardingOverviewMetrics>('/onboarding/analytics/overview');
        return response.data as OnboardingOverviewMetrics;
    },

    /**
     * Get task bottleneck analysis
     */
    getTaskBottleneckAnalysis: async (): Promise<TaskBottleneckAnalysis[]> => {
        const response = await api.get<TaskBottleneckAnalysis[]>('/onboarding/analytics/task-bottlenecks');
        return response.data as TaskBottleneckAnalysis[];
    },

    /**
     * Get department SLA compliance metrics
     */
    getDepartmentSLAMetrics: async (): Promise<DepartmentSLAMetrics[]> => {
        const response = await api.get<DepartmentSLAMetrics[]>('/onboarding/analytics/department-sla');
        return response.data as DepartmentSLAMetrics[];
    },

    /**
     * Get time-to-productivity metrics for recent hires
     */
    getTimeToProductivityMetrics: async (limit?: number): Promise<TimeToProductivityMetrics[]> => {
        const query = limit ? `?limit=${limit}` : '';
        const response = await api.get<TimeToProductivityMetrics[]>(`/onboarding/analytics/time-to-productivity${query}`);
        return response.data as TimeToProductivityMetrics[];
    },

    /**
     * Get onboarding progress grouped by department
     */
    getProgressByDepartment: async (): Promise<OnboardingProgressByDepartment[]> => {
        const response = await api.get<OnboardingProgressByDepartment[]>('/onboarding/analytics/progress-by-department');
        return response.data as OnboardingProgressByDepartment[];
    },

    /**
     * Get onboarding trends over time
     */
    getOnboardingTrends: async (months?: number): Promise<OnboardingTrend[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<OnboardingTrend[]>(`/onboarding/analytics/trends${query}`);
        return response.data as OnboardingTrend[];
    },

    /**
     * Get task completion timeline analysis
     */
    getTaskCompletionTimeline: async (): Promise<TaskCompletionTimeline[]> => {
        const response = await api.get<TaskCompletionTimeline[]>('/onboarding/analytics/task-timeline');
        return response.data as TaskCompletionTimeline[];
    },
};

export default onboardingAnalyticsService;
