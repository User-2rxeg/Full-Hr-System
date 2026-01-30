import api from "@/app/services/api";

// ==================== LEAVES ANALYTICS INTERFACES ====================

export interface LeaveOverview {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  totalDaysTaken: number;
  avgDaysPerRequest: number;
  approvalRate: number;
  avgApprovalTimeDays: number;
  avgUtilizationRate: number;
  requestsByStatus: Record<string, number>;
}

export interface LeaveBalanceSummary {
  totalEntitlements: number;
  totalAccrued: number;
  totalTaken: number;
  totalRemaining: number;
  totalPending: number;
  avgBalancePerEmployee: number;
  utilizationRate: number;
  employeesWithLowBalance: number;
  employeesWithHighBalance: number;
  balancesByType: {
    leaveTypeId: string;
    leaveTypeName: string;
    totalEntitled: number;
    totalTaken: number;
    totalRemaining: number;
    utilizationRate: number;
  }[];
}

export interface LeaveRequestTrend {
  period: string;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  avgProcessingTime: number;
}

export interface LeaveTypeAnalysis {
  leaveTypeId: string;
  leaveTypeName: string;
  categoryName: string;
  isPaid: boolean;
  totalRequests: number;
  totalDays: number;
  avgDaysPerRequest: number;
  approvalRate: number;
  topReasons: string[];
  popularMonths: string[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface DepartmentLeaveAnalysis {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalRequests: number;
  totalDaysTaken: number;
  avgDaysPerEmployee: number;
  pendingRequests: number;
  approvalRate: number;
  utilizationRate: number;
  topLeaveTypes: { name: string; count: number }[];
  absenteeismRate: number;
}

export interface SeasonalPattern {
  month: string;
  totalRequests: number;
  totalDays: number;
  avgDaysPerRequest: number;
  topLeaveTypes: { name: string; count: number }[];
  peakDays: string[];
}

export interface LeaveForecasting {
  nextMonth: {
    predictedRequests: number;
    predictedDays: number;
    confidence: number;
    factors: string[];
  };
  nextQuarter: {
    predictedRequests: number;
    predictedDays: number;
    confidence: number;
    peakMonths: string[];
  };
  yearEnd: {
    unutilizedDaysPrediction: number;
    carryForwardEstimate: number;
    expiringBalances: number;
  };
}

export interface AbsenteeismAnalysis {
  overallRate: number;
  byDepartment: {
    departmentId: string;
    departmentName: string;
    rate: number;
    trend: 'IMPROVING' | 'WORSENING' | 'STABLE';
  }[];
  byDayOfWeek: {
    day: string;
    rate: number;
    requestCount: number;
  }[];
  patterns: {
    bridgeDays: number;
    mondayFriday: number;
    consecutiveAbsences: number;
  };
  flaggedEmployees: {
    employeeId: string;
    employeeName: string;
    irregularPatternCount: number;
    totalAbsences: number;
  }[];
}

export interface LeavePolicyCompliance {
  overallComplianceRate: number;
  policiesConfigured: number;
  policiesActive: number;
  complianceByPolicy: {
    policyId: string;
    leaveTypeName: string;
    complianceRate: number;
    violationsCount: number;
    commonViolations: string[];
  }[];
  recommendations: string[];
}

export interface ApprovalWorkflow {
  avgApprovalTime: number;
  approvalsByRole: {
    role: string;
    count: number;
    avgTime: number;
  }[];
  bottlenecks: {
    stage: string;
    avgDelayDays: number;
    pendingCount: number;
  }[];
  escalationRate: number;
  returnedForCorrectionRate: number;
}

export interface LeaveHealthScore {
  overallScore: number;
  components: {
    name: string;
    score: number;
    weight: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    details: string;
  }[];
  topIssues: string[];
  recommendations: string[];
}

export interface LeaveStory {
  title: string;
  narrative: string;
  metric: string;
  value: number | string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  icon: string;
  actionRequired?: boolean;
}

export interface LeavesDashboard {
  overview: LeaveOverview;
  balanceSummary: LeaveBalanceSummary;
  requestTrends: LeaveRequestTrend[];
  leaveTypeAnalysis: LeaveTypeAnalysis[];
  departmentAnalysis: DepartmentLeaveAnalysis[];
  seasonalPatterns: SeasonalPattern[];
  forecasting: LeaveForecasting;
  absenteeism: AbsenteeismAnalysis;
  policyCompliance: LeavePolicyCompliance;
  approvalWorkflow: ApprovalWorkflow;
  healthScore: LeaveHealthScore;
  stories: LeaveStory[];
}

// ==================== LEAVES ANALYTICS SERVICE ====================

export const leavesAnalyticsService = {
  getDashboard: async (): Promise<LeavesDashboard> => {
    const response = await api.get<LeavesDashboard>('/leaves-analytics/dashboard');
    return response.data!;
  },

  getLeaveOverview: async (from?: string, to?: string): Promise<LeaveOverview> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get<LeaveOverview>(`/leaves-analytics/overview?${params}`);
    return response.data!;
  },

  getBalanceSummary: async (): Promise<LeaveBalanceSummary> => {
    const response = await api.get<LeaveBalanceSummary>('/leaves-analytics/balance-summary');
    return response.data!;
  },

  getRequestTrends: async (months?: number): Promise<LeaveRequestTrend[]> => {
    const params = months ? `?months=${months}` : '';
    const response = await api.get<LeaveRequestTrend[]>(`/leaves-analytics/request-trends${params}`);
    return response.data!;
  },

  getLeaveTypeAnalysis: async (): Promise<LeaveTypeAnalysis[]> => {
    const response = await api.get<LeaveTypeAnalysis[]>('/leaves-analytics/by-type');
    return response.data!;
  },

  getDepartmentLeaveAnalysis: async (): Promise<DepartmentLeaveAnalysis[]> => {
    const response = await api.get<DepartmentLeaveAnalysis[]>('/leaves-analytics/by-department');
    return response.data!;
  },

  getSeasonalPatterns: async (): Promise<SeasonalPattern[]> => {
    const response = await api.get<SeasonalPattern[]>('/leaves-analytics/seasonal-patterns');
    return response.data!;
  },

  getForecasting: async (): Promise<LeaveForecasting> => {
    const response = await api.get<LeaveForecasting>('/leaves-analytics/forecasting');
    return response.data!;
  },

  getAbsenteeismAnalysis: async (): Promise<AbsenteeismAnalysis> => {
    const response = await api.get<AbsenteeismAnalysis>('/leaves-analytics/absenteeism');
    return response.data!;
  },

  getPolicyCompliance: async (): Promise<LeavePolicyCompliance> => {
    const response = await api.get<LeavePolicyCompliance>('/leaves-analytics/policy-compliance');
    return response.data!;
  },

  getApprovalWorkflow: async (): Promise<ApprovalWorkflow> => {
    const response = await api.get<ApprovalWorkflow>('/leaves-analytics/approval-workflow');
    return response.data!;
  },

  getHealthScore: async (): Promise<LeaveHealthScore> => {
    const response = await api.get<LeaveHealthScore>('/leaves-analytics/health-score');
    return response.data!;
  },

  getStories: async (): Promise<LeaveStory[]> => {
    const response = await api.get<LeaveStory[]>('/leaves-analytics/stories');
    return response.data!;
  },
};
