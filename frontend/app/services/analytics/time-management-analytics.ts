import api from "@/app/services/api";

// ==================== TIME MANAGEMENT ANALYTICS INTERFACES ====================

export interface AttendanceOverview {
  totalRecords: number;
  totalWorkMinutes: number;
  avgWorkMinutesPerDay: number;
  avgWorkHoursPerDay: number;
  missedPunchCount: number;
  missedPunchRate: number;
  finalisedForPayrollCount: number;
  pendingPayrollCount: number;
}

export interface AttendanceTrend {
  date: string;
  dayOfWeek: string;
  totalEmployees: number;
  avgWorkMinutes: number;
  avgWorkHours: number;
  missedPunches: number;
  lateArrivals: number;
  earlyDepartures: number;
  onTimeRate: number;
}

export interface DepartmentAttendance {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  avgAttendanceRate: number;
  avgWorkHoursPerDay: number;
  totalExceptions: number;
  missedPunchRate: number;
  lateArrivalRate: number;
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface ShiftDistribution {
  shiftId: string;
  shiftName: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  employeeCount: number;
  percentage: number;
  avgAttendanceRate: number;
}

export interface OvertimeAnalysis {
  totalOvertimeMinutes: number;
  totalOvertimeHours: number;
  avgOvertimePerEmployee: number;
  employeesWithOvertime: number;
  overtimeByDepartment: {
    departmentId: string;
    departmentName: string;
    totalMinutes: number;
    employeeCount: number;
    avgPerEmployee: number;
  }[];
  overtimeTrend: {
    period: string;
    totalMinutes: number;
    employeeCount: number;
  }[];
  topOvertimeEmployees: {
    employeeId: string;
    employeeName: string;
    departmentName: string;
    totalMinutes: number;
  }[];
}

export interface ExceptionAnalysis {
  totalExceptions: number;
  exceptionsByType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  exceptionsByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  resolutionMetrics: {
    avgResolutionTimeHours: number;
    resolvedCount: number;
    pendingCount: number;
    escalatedCount: number;
  };
  exceptionTrend: {
    period: string;
    count: number;
    resolved: number;
    pending: number;
  }[];
}

export interface HolidayCalendarAnalysis {
  totalHolidays: number;
  upcomingHolidays: {
    name: string;
    date: string;
    type: string;
    daysUntil: number;
  }[];
  holidaysByType: {
    type: string;
    count: number;
    totalDays: number;
  }[];
  holidaysByMonth: {
    month: string;
    count: number;
  }[];
}

export interface PunctualityScore {
  overallScore: number;
  onTimePercentage: number;
  latePercentage: number;
  earlyDeparturePercentage: number;
  scoreByDepartment: {
    departmentId: string;
    departmentName: string;
    score: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  }[];
  scoreByShift: {
    shiftId: string;
    shiftName: string;
    score: number;
  }[];
}

export interface WorkPatternInsights {
  peakProductivityHours: string[];
  avgDailyWorkHours: number;
  mostActiveDay: string;
  leastActiveDay: string;
  workDistributionByDay: {
    day: string;
    avgHours: number;
    employeeCount: number;
  }[];
  workloadBalance: {
    underworked: number;
    optimal: number;
    overworked: number;
  };
}

export interface TimeManagementHealthScore {
  overallScore: number;
  components: {
    name: string;
    score: number;
    weight: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    recommendations: string[];
  }[];
  topIssues: string[];
  improvements: string[];
}

export interface TimeManagementStory {
  title: string;
  narrative: string;
  metric: string;
  value: number | string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  icon: string;
}

export interface TimeManagementDashboard {
  overview: AttendanceOverview;
  attendanceTrends: AttendanceTrend[];
  departmentAttendance: DepartmentAttendance[];
  shiftDistribution: ShiftDistribution[];
  overtimeAnalysis: OvertimeAnalysis;
  exceptionAnalysis: ExceptionAnalysis;
  holidayCalendar: HolidayCalendarAnalysis;
  punctualityScore: PunctualityScore;
  workPatterns: WorkPatternInsights;
  healthScore: TimeManagementHealthScore;
  stories: TimeManagementStory[];
}

// ==================== TIME MANAGEMENT ANALYTICS SERVICE ====================

export const timeManagementAnalyticsService = {
  getDashboard: async (): Promise<TimeManagementDashboard> => {
    const response = await api.get<TimeManagementDashboard>('/time-management-analytics/dashboard');
    return response.data!;
  },

  getAttendanceOverview: async (from?: string, to?: string): Promise<AttendanceOverview> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get<AttendanceOverview>(`/time-management-analytics/attendance/overview?${params}`);
    return response.data!;
  },

  getAttendanceTrends: async (days?: number): Promise<AttendanceTrend[]> => {
    const params = days ? `?days=${days}` : '';
    const response = await api.get<AttendanceTrend[]>(`/time-management-analytics/attendance/trends${params}`);
    return response.data!;
  },

  getDepartmentAttendance: async (): Promise<DepartmentAttendance[]> => {
    const response = await api.get<DepartmentAttendance[]>('/time-management-analytics/attendance/by-department');
    return response.data!;
  },

  getShiftDistribution: async (): Promise<ShiftDistribution[]> => {
    const response = await api.get<ShiftDistribution[]>('/time-management-analytics/shifts/distribution');
    return response.data!;
  },

  getOvertimeAnalysis: async (from?: string, to?: string): Promise<OvertimeAnalysis> => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get<OvertimeAnalysis>(`/time-management-analytics/overtime/analysis?${params}`);
    return response.data!;
  },

  getExceptionAnalysis: async (): Promise<ExceptionAnalysis> => {
    const response = await api.get<ExceptionAnalysis>('/time-management-analytics/exceptions/analysis');
    return response.data!;
  },

  getHolidayCalendarAnalysis: async (): Promise<HolidayCalendarAnalysis> => {
    const response = await api.get<HolidayCalendarAnalysis>('/time-management-analytics/holidays/analysis');
    return response.data!;
  },

  getPunctualityScore: async (): Promise<PunctualityScore> => {
    const response = await api.get<PunctualityScore>('/time-management-analytics/punctuality/score');
    return response.data!;
  },

  getWorkPatternInsights: async (): Promise<WorkPatternInsights> => {
    const response = await api.get<WorkPatternInsights>('/time-management-analytics/work-patterns');
    return response.data!;
  },

  getHealthScore: async (): Promise<TimeManagementHealthScore> => {
    const response = await api.get<TimeManagementHealthScore>('/time-management-analytics/health-score');
    return response.data!;
  },

  getStories: async (): Promise<TimeManagementStory[]> => {
    const response = await api.get<TimeManagementStory[]>('/time-management-analytics/stories');
    return response.data!;
  },
};
