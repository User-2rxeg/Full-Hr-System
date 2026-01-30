import apiService from '../api';

// ============ INTERFACES ============

export interface StructuralHealthScore {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend?: 'improving' | 'stable' | 'declining';
    dimensions: {
        fillRate: number;
        spanOfControl: number;
        hierarchyBalance: number;
        successionReadiness: number;
    };
    insights: HealthInsight[];
}

export interface HealthInsight {
    type: 'critical' | 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    metric?: string;
    recommendation?: string;
}

export interface DepartmentAnalytics {
    departmentId: string;
    departmentName: string;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    frozenPositions?: number;
    fillRate: number;
    healthScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    headcount: number;
    avgTenure: number;
    headcountTrend?: 'growing' | 'stable' | 'shrinking';
}

export interface PositionRiskAssessment {
    positionId: string;
    positionTitle: string;
    department: string;
    departmentId: string;
    criticalityScore: number;
    vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    successionStatus: 'COVERED' | 'AT_RISK' | 'NO_PLAN';
    factors: string[];
    currentHolder?: {
        employeeId: string;
        name: string;
        tenure: number;
    };
}

export interface CostCenterSummary {
    costCenter: string;
    departmentCount: number;
    positionCount: number;
    estimatedHeadcount: number;
    utilizationRate: number;
}

export interface ChangeImpactAnalysis {
    actionType: string;
    targetId: string;
    targetName: string;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedPositions: number;
    affectedEmployees: number;
    downstreamEffects: string[];
    recommendation: string;
}

export interface SpanOfControlMetric {
    positionId: string;
    positionTitle: string;
    department: string;
    directReports: number;
    idealSpan: number;
    status: 'OPTIMAL' | 'UNDERSTAFFED' | 'OVERSTAFFED';
}

export interface VacancyForecast {
    positionId: string;
    positionTitle: string;
    department: string;
    likelihood: number;
    timeframe: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
}

export interface OrgSummaryStats {
    totalDepartments: number;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    fillRate: number;
    totalEmployees: number;
    costCenterCount: number;
}

export interface TeamStructureMetrics {
    departmentId: string;
    departmentName: string;
    metrics: {
        spanOfControl: {
            avg: number;
            min: number;
            max: number;
            median: number;
        };
        depth: {
            avg: number;
            max: number;
        };
        headcount: number;
        totalPositions: number;
        filledPositions: number;
        vacantPositions: number;
        fillRate: number;
        avgTenure: number;
        issues: string[];
    };
}

export interface OrgChartNode {
    id: string;
    name: string;
    position: string;
    department: string;
    managerId: string | null;
    imageUrl: string | null;
}

// New interfaces for forecasting and network analytics
export interface WorkforceVacancyForecast {
    currentAttritionRate: number;
    predictedVacancies: number;
    riskFactors: string[];
    monthlyProjections: { month: string; count: number }[];
    highRiskDepts: { name: string; attritionRate: number; headcount: number }[];
    methodology: string;
}

export interface NetworkMetrics {
    influencers: { id: string; name: string; score: number; dept: string; directReports: number }[];
    collaborationMatrix: { deptA: string; deptB: string; score: number }[];
    density: number;
    avgTeamSize: number;
    crossDeptConnections: number;
}

export interface StructureMetrics {
    totalEmployees: number;
    spanOfControl: {
        avg: number;
        min: number;
        max: number;
        median: number;
        distribution: Record<string, number>;
    };
    depth: {
        max: number;
        avg: number;
        distribution: Record<string, number>;
    };
    healthScore: number;
    issues: string[];
}

// ============ SERVICE ============

export const orgStructureAnalyticsService = {
    /**
     * Get overall structural health score
     */
    getStructuralHealth: async (): Promise<StructuralHealthScore> => {
        const response = await apiService.get<StructuralHealthScore>('/analytics/org-structure/health');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as StructuralHealthScore;
    },

    /**
     * Get organization summary statistics
     */
    getOrgSummaryStats: async (): Promise<OrgSummaryStats> => {
        const response = await apiService.get<OrgSummaryStats>('/analytics/org-structure/summary');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as OrgSummaryStats;
    },

    /**
     * Get department-level analytics
     */
    getDepartmentAnalytics: async (): Promise<DepartmentAnalytics[]> => {
        const response = await apiService.get<DepartmentAnalytics[]>('/analytics/org-structure/departments');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as DepartmentAnalytics[];
    },

    /**
     * Get position-level risk assessment
     */
    getPositionRiskAssessment: async (): Promise<PositionRiskAssessment[]> => {
        const response = await apiService.get<PositionRiskAssessment[]>('/analytics/org-structure/positions/risk');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as PositionRiskAssessment[];
    },

    /**
     * Get cost center analysis
     */
    getCostCenterAnalysis: async (): Promise<CostCenterSummary[]> => {
        const response = await apiService.get<CostCenterSummary[]>('/analytics/org-structure/cost-centers');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as CostCenterSummary[];
    },

    /**
     * Get span of control metrics
     */
    getSpanOfControlMetrics: async (): Promise<SpanOfControlMetric[]> => {
        const response = await apiService.get<SpanOfControlMetric[]>('/analytics/org-structure/span-of-control');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as SpanOfControlMetric[];
    },

    /**
     * Get vacancy forecasts
     */
    getVacancyForecasts: async (): Promise<VacancyForecast[]> => {
        const response = await apiService.get<VacancyForecast[]>('/analytics/org-structure/vacancy-forecasts');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as VacancyForecast[];
    },

    /**
     * Simulate change impact
     */
    simulateChangeImpact: async (
        actionType: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT',
        targetId: string
    ): Promise<ChangeImpactAnalysis> => {
        const response = await apiService.post<ChangeImpactAnalysis>('/analytics/org-structure/simulate', {
            actionType,
            targetId,
        });
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as ChangeImpactAnalysis;
    },

    // ============ TEAM-SPECIFIC METHODS (FOR DEPARTMENT HEADS) ============

    /**
     * Get team structure metrics for a specific department
     */
    getTeamStructureMetrics: async (departmentId: string): Promise<TeamStructureMetrics | null> => {
        const response = await apiService.get<TeamStructureMetrics>(`/analytics/org-structure/team/${departmentId}/metrics`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as TeamStructureMetrics;
    },

    /**
     * Get org chart data for a specific team
     */
    getTeamOrgChartData: async (departmentId: string): Promise<OrgChartNode[]> => {
        const response = await apiService.get<OrgChartNode[]>(`/analytics/org-structure/team/${departmentId}/org-chart`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as OrgChartNode[];
    },

    /**
     * Get vacancy forecasts for a specific team
     */
    getTeamVacancyForecasts: async (departmentId: string): Promise<VacancyForecast[]> => {
        const response = await apiService.get<VacancyForecast[]>(`/analytics/org-structure/team/${departmentId}/vacancy-forecasts`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as VacancyForecast[];
    },

    // ============ WORKFORCE ANALYTICS (FROM BACKEND) ============

    /**
     * Get workforce vacancy forecast based on historical attrition
     */
    getWorkforceVacancyForecast: async (months: number = 6): Promise<WorkforceVacancyForecast> => {
        const response = await apiService.get<WorkforceVacancyForecast>(`/analytics/vacancy-forecast?months=${months}`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as WorkforceVacancyForecast;
    },

    /**
     * Get organization network metrics (influencers, collaboration)
     */
    getNetworkMetrics: async (): Promise<NetworkMetrics> => {
        const response = await apiService.get<NetworkMetrics>('/analytics/network-metrics');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as NetworkMetrics;
    },

    /**
     * Get structure metrics (span of control, depth, health)
     */
    getStructureMetrics: async (): Promise<StructureMetrics> => {
        const response = await apiService.get<StructureMetrics>('/analytics/structure-metrics');
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data as StructureMetrics;
    },
};
