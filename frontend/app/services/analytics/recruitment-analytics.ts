// =====================================================
// Recruitment Analytics Service - Frontend API Layer
// Matches backend interfaces exactly
// =====================================================

import api from "@/app/services/api";

// ============ TYPES - Match Backend Interfaces ============

export interface FunnelStageMetrics {
    stage: string;
    count: number;
    conversionRate: number;
    avgDaysInStage: number;
    dropoffRate: number;
}

export interface RecruitmentFunnelAnalytics {
    stages: FunnelStageMetrics[];
    overallConversionRate: number;
    avgTimeToHire: number;
    totalApplications: number;
    totalHires: number;
}

export interface SourceEffectivenessMetrics {
    source: string;
    totalApplications: number;
    qualifiedApplications: number;
    hires: number;
    qualificationRate: number;
    conversionToHire: number;
    avgTimeToHire: number;
    costPerHire: number;
}

export interface TimeToHireBreakdown {
    stage: string;
    avgDays: number;
    medianDays: number;
    minDays: number;
    maxDays: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface InterviewerCalibrationMetrics {
    interviewerId: string;
    interviewerName: string;
    totalInterviews: number;
    avgRating: number;
    passRate: number;
    hireRate: number;
    consistency: number;
    calibrationScore: number;
}

export interface RequisitionHealthScore {
    requisitionId: string;
    jobTitle: string;
    department: string;
    daysOpen: number;
    applicantCount: number;
    qualifiedCount: number;
    pipelineVelocity: number;
    healthScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendations: string[];
}

export interface StageBottleneck {
    stage: string;
    avgDaysStuck: number;
    applicationsStuck: number;
    bottleneckScore: number;
    suggestedAction: string;
}

export interface RecruitmentTrend {
    period: string;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
    avgTimeToHire: number;
}

export interface RecruitmentDashboardSummary {
    funnel: RecruitmentFunnelAnalytics;
    sourceEffectiveness: SourceEffectivenessMetrics[];
    timeToHire: TimeToHireBreakdown[];
    interviewerCalibration: InterviewerCalibrationMetrics[];
    requisitionHealth: RequisitionHealthScore[];
    bottlenecks: StageBottleneck[];
    trends: RecruitmentTrend[];
}

// ============ API SERVICE ============

export const recruitmentAnalyticsService = {
    /**
     * Get comprehensive recruitment analytics dashboard
     */
    getDashboardSummary: async (): Promise<RecruitmentDashboardSummary> => {
        const response = await api.get<RecruitmentDashboardSummary>('/recruitment/analytics/dashboard');
        return response.data as RecruitmentDashboardSummary;
    },

    /**
     * Get recruitment funnel analytics
     */
    getFunnelAnalytics: async (startDate?: string, endDate?: string): Promise<RecruitmentFunnelAnalytics> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get<RecruitmentFunnelAnalytics>(`/recruitment/analytics/funnel${query}`);
        return response.data as RecruitmentFunnelAnalytics;
    },

    /**
     * Get hiring source effectiveness metrics
     */
    getSourceEffectiveness: async (): Promise<SourceEffectivenessMetrics[]> => {
        const response = await api.get<SourceEffectivenessMetrics[]>('/recruitment/analytics/source-effectiveness');
        return response.data as SourceEffectivenessMetrics[];
    },

    /**
     * Get time-to-hire breakdown by stage
     */
    getTimeToHireBreakdown: async (months?: number): Promise<TimeToHireBreakdown[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<TimeToHireBreakdown[]>(`/recruitment/analytics/time-to-hire${query}`);
        return response.data as TimeToHireBreakdown[];
    },

    /**
     * Get interviewer calibration and consistency metrics
     */
    getInterviewerCalibration: async (): Promise<InterviewerCalibrationMetrics[]> => {
        const response = await api.get<InterviewerCalibrationMetrics[]>('/recruitment/analytics/interviewer-calibration');
        return response.data as InterviewerCalibrationMetrics[];
    },

    /**
     * Get health scores for active job requisitions
     */
    getRequisitionHealthScores: async (): Promise<RequisitionHealthScore[]> => {
        const response = await api.get<RequisitionHealthScore[]>('/recruitment/analytics/requisition-health');
        return response.data as RequisitionHealthScore[];
    },

    /**
     * Identify recruitment pipeline bottlenecks
     */
    getBottleneckAnalysis: async (): Promise<StageBottleneck[]> => {
        const response = await api.get<StageBottleneck[]>('/recruitment/analytics/bottlenecks');
        return response.data as StageBottleneck[];
    },

    /**
     * Get recruitment trends over time
     */
    getRecruitmentTrends: async (months?: number): Promise<RecruitmentTrend[]> => {
        const query = months ? `?months=${months}` : '';
        const response = await api.get<RecruitmentTrend[]>(`/recruitment/analytics/trends${query}`);
        return response.data as RecruitmentTrend[];
    },
};

export default recruitmentAnalyticsService;
