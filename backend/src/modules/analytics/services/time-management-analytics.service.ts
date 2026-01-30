import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from '../../time-management/models/attendance-record.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from '../../time-management/models/shift-assignment.schema';
import { Shift, ShiftDocument } from '../../time-management/models/shift.schema';
import { ShiftType, ShiftTypeDocument } from '../../time-management/models/shift-type.schema';
import { Holiday, HolidayDocument } from '../../time-management/models/holiday.schema';
import { TimeException, TimeExceptionDocument } from '../../time-management/models/time-exception.schema';
import { OvertimeRule, OvertimeRuleDocument } from '../../time-management/models/overtime-rule.schema';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';
import { Department } from '../../organization-structure/models/department.schema';

// ==================== INTERFACES ====================

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

export interface TimeManagementStory {
  title: string;
  narrative: string;
  metric: string;
  value: number | string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  icon: string;
}

@Injectable()
export class TimeManagementAnalyticsService {
  constructor(
    @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(ShiftType.name) private shiftTypeModel: Model<ShiftTypeDocument>,
    @InjectModel(Holiday.name) private holidayModel: Model<HolidayDocument>,
    @InjectModel(TimeException.name) private timeExceptionModel: Model<TimeExceptionDocument>,
    @InjectModel(OvertimeRule.name) private overtimeRuleModel: Model<OvertimeRuleDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  // ==================== ATTENDANCE OVERVIEW ====================
  async getAttendanceOverview(dateRange?: { from?: Date; to?: Date }): Promise<AttendanceOverview> {
    const query: any = {};
    
    if (dateRange?.from || dateRange?.to) {
      query.createdAt = {};
      if (dateRange.from) query.createdAt.$gte = dateRange.from;
      if (dateRange.to) query.createdAt.$lte = dateRange.to;
    }

    const records = await this.attendanceModel.find(query).exec();
    
    const totalRecords = records.length;
    const totalWorkMinutes = records.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0);
    const missedPunchCount = records.filter(r => r.hasMissedPunch).length;
    const finalisedForPayrollCount = records.filter(r => r.finalisedForPayroll).length;
    
    return {
      totalRecords,
      totalWorkMinutes,
      avgWorkMinutesPerDay: totalRecords > 0 ? Math.round(totalWorkMinutes / totalRecords) : 0,
      avgWorkHoursPerDay: totalRecords > 0 ? Math.round((totalWorkMinutes / totalRecords / 60) * 100) / 100 : 0,
      missedPunchCount,
      missedPunchRate: totalRecords > 0 ? Math.round((missedPunchCount / totalRecords) * 10000) / 100 : 0,
      finalisedForPayrollCount,
      pendingPayrollCount: totalRecords - finalisedForPayrollCount,
    };
  }

  // ==================== ATTENDANCE TRENDS ====================
  async getAttendanceTrends(days: number = 30): Promise<AttendanceTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const records = await this.attendanceModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalEmployees: { $addToSet: '$employeeId' },
          avgWorkMinutes: { $avg: '$totalWorkMinutes' },
          missedPunches: { $sum: { $cond: ['$hasMissedPunch', 1, 0] } },
          records: { $push: '$$ROOT' }
        }
      },
      { $sort: { _id: 1 } }
    ]).exec();

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return records.map(r => {
      const date = new Date(r._id);
      const totalRecords = r.records.length;
      return {
        date: r._id,
        dayOfWeek: dayNames[date.getDay()],
        totalEmployees: r.totalEmployees.length,
        avgWorkMinutes: Math.round(r.avgWorkMinutes || 0),
        avgWorkHours: Math.round((r.avgWorkMinutes || 0) / 60 * 100) / 100,
        missedPunches: r.missedPunches,
        lateArrivals: 0, // Calculated from exceptions
        earlyDepartures: 0, // Calculated from exceptions
        onTimeRate: totalRecords > 0 ? Math.round(((totalRecords - r.missedPunches) / totalRecords) * 100) : 100,
      };
    });
  }

  // ==================== DEPARTMENT ATTENDANCE ====================
  async getDepartmentAttendance(): Promise<DepartmentAttendance[]> {
    const departments = await this.departmentModel.find({ status: 'active' }).exec();
    const employees = await this.employeeModel.find().exec();
    const exceptions = await this.timeExceptionModel.find().exec();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceRecords = await this.attendanceModel.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).exec();

    const result: DepartmentAttendance[] = [];

    for (const dept of departments) {
      const deptEmployees = employees.filter(e => 
        e.primaryDepartmentId?.toString() === dept._id.toString()
      );
      
      const employeeIds = deptEmployees.map(e => e._id.toString());
      
      const deptAttendance = attendanceRecords.filter(r => 
        employeeIds.includes(r.employeeId.toString())
      );
      
      const deptExceptions = exceptions.filter(e => 
        employeeIds.includes(e.employeeId.toString())
      );
      
      const totalRecords = deptAttendance.length;
      const missedPunchCount = deptAttendance.filter(r => r.hasMissedPunch).length;
      const totalWorkMinutes = deptAttendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0);
      
      result.push({
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        employeeCount: deptEmployees.length,
        avgAttendanceRate: deptEmployees.length > 0 ? 
          Math.round((totalRecords / (deptEmployees.length * 30)) * 100) : 0,
        avgWorkHoursPerDay: totalRecords > 0 ? 
          Math.round((totalWorkMinutes / totalRecords / 60) * 100) / 100 : 0,
        totalExceptions: deptExceptions.length,
        missedPunchRate: totalRecords > 0 ? 
          Math.round((missedPunchCount / totalRecords) * 100) : 0,
        lateArrivalRate: deptExceptions.length > 0 ? 
          Math.round((deptExceptions.filter(e => e.type === 'LATE').length / totalRecords) * 100) : 0,
        trend: 'STABLE',
      });
    }

    return result.sort((a, b) => b.avgAttendanceRate - a.avgAttendanceRate);
  }

  // ==================== SHIFT DISTRIBUTION ====================
  async getShiftDistribution(): Promise<ShiftDistribution[]> {
    const shifts = await this.shiftModel.find({ active: true }).exec();
    const shiftTypes = await this.shiftTypeModel.find({ active: true }).exec();
    const assignments = await this.shiftAssignmentModel.find({ 
      status: 'APPROVED',
      $or: [{ endDate: null }, { endDate: { $gte: new Date() } }]
    }).exec();
    
    const totalAssignments = assignments.length;
    
    const result: ShiftDistribution[] = [];
    
    for (const shift of shifts) {
      const shiftType = shiftTypes.find(st => st._id.toString() === shift.shiftType?.toString());
      const shiftAssignments = assignments.filter(a => a.shiftId.toString() === shift._id.toString());
      
      result.push({
        shiftId: shift._id.toString(),
        shiftName: shift.name,
        shiftType: shiftType?.name || 'Unknown',
        startTime: shift.startTime,
        endTime: shift.endTime,
        employeeCount: shiftAssignments.length,
        percentage: totalAssignments > 0 ? 
          Math.round((shiftAssignments.length / totalAssignments) * 10000) / 100 : 0,
        avgAttendanceRate: 0, // Calculated from attendance records
      });
    }

    return result.sort((a, b) => b.employeeCount - a.employeeCount);
  }

  // ==================== OVERTIME ANALYSIS ====================
  async getOvertimeAnalysis(dateRange?: { from?: Date; to?: Date }): Promise<OvertimeAnalysis> {
    const query: any = {};
    const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.to || new Date();
    
    query.createdAt = { $gte: startDate, $lte: endDate };
    
    const attendanceRecords = await this.attendanceModel.find(query).exec();
    const employees = await this.employeeModel.find().populate('primaryDepartmentId').exec();
    const departments = await this.departmentModel.find().exec();
    
    // Standard work minutes per day (8 hours = 480 minutes)
    const standardMinutes = 480;
    
    // Calculate overtime
    const overtimeByEmployee: Map<string, number> = new Map();
    
    for (const record of attendanceRecords) {
      const overtime = Math.max(0, (record.totalWorkMinutes || 0) - standardMinutes);
      if (overtime > 0) {
        const empId = record.employeeId.toString();
        overtimeByEmployee.set(empId, (overtimeByEmployee.get(empId) || 0) + overtime);
      }
    }
    
    const totalOvertimeMinutes = Array.from(overtimeByEmployee.values()).reduce((a, b) => a + b, 0);
    const employeesWithOvertime = overtimeByEmployee.size;
    
    // Overtime by department
    const deptOvertime: Map<string, { minutes: number; employees: Set<string> }> = new Map();
    
    for (const [empId, minutes] of overtimeByEmployee) {
      const employee = employees.find(e => e._id.toString() === empId);
      const deptId = employee?.primaryDepartmentId?.toString() || 'unknown';
      
      if (!deptOvertime.has(deptId)) {
        deptOvertime.set(deptId, { minutes: 0, employees: new Set() });
      }
      
      const data = deptOvertime.get(deptId)!;
      data.minutes += minutes;
      data.employees.add(empId);
    }
    
    const overtimeByDepartment = Array.from(deptOvertime.entries()).map(([deptId, data]) => {
      const dept = departments.find(d => d._id.toString() === deptId);
      return {
        departmentId: deptId,
        departmentName: dept?.name || 'Unknown',
        totalMinutes: data.minutes,
        employeeCount: data.employees.size,
        avgPerEmployee: data.employees.size > 0 ? Math.round(data.minutes / data.employees.size) : 0,
      };
    });
    
    // Top overtime employees
    const topOvertimeEmployees = Array.from(overtimeByEmployee.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([empId, minutes]) => {
        const employee = employees.find(e => e._id.toString() === empId);
        const dept = departments.find(d => d._id.toString() === employee?.primaryDepartmentId?.toString());
        return {
          employeeId: empId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          departmentName: dept?.name || 'Unknown',
          totalMinutes: minutes,
        };
      });

    return {
      totalOvertimeMinutes,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
      avgOvertimePerEmployee: employeesWithOvertime > 0 ? 
        Math.round(totalOvertimeMinutes / employeesWithOvertime) : 0,
      employeesWithOvertime,
      overtimeByDepartment: overtimeByDepartment.sort((a, b) => b.totalMinutes - a.totalMinutes),
      overtimeTrend: [],
      topOvertimeEmployees,
    };
  }

  // ==================== EXCEPTION ANALYSIS ====================
  async getExceptionAnalysis(): Promise<ExceptionAnalysis> {
    const exceptions = await this.timeExceptionModel.find().exec();
    const totalExceptions = exceptions.length;
    
    // Group by type
    const typeCount: Map<string, number> = new Map();
    for (const exc of exceptions) {
      typeCount.set(exc.type, (typeCount.get(exc.type) || 0) + 1);
    }
    
    const exceptionsByType = Array.from(typeCount.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: totalExceptions > 0 ? Math.round((count / totalExceptions) * 10000) / 100 : 0,
    }));
    
    // Group by status
    const statusCount: Map<string, number> = new Map();
    for (const exc of exceptions) {
      statusCount.set(exc.status, (statusCount.get(exc.status) || 0) + 1);
    }
    
    const exceptionsByStatus = Array.from(statusCount.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalExceptions > 0 ? Math.round((count / totalExceptions) * 10000) / 100 : 0,
    }));
    
    const resolvedCount = statusCount.get('RESOLVED') || 0;
    const pendingCount = (statusCount.get('OPEN') || 0) + (statusCount.get('PENDING') || 0);
    const escalatedCount = statusCount.get('ESCALATED') || 0;
    
    return {
      totalExceptions,
      exceptionsByType: exceptionsByType.sort((a, b) => b.count - a.count),
      exceptionsByStatus: exceptionsByStatus.sort((a, b) => b.count - a.count),
      resolutionMetrics: {
        avgResolutionTimeHours: 24, // Placeholder
        resolvedCount,
        pendingCount,
        escalatedCount,
      },
      exceptionTrend: [],
    };
  }

  // ==================== HOLIDAY CALENDAR ====================
  async getHolidayCalendarAnalysis(): Promise<HolidayCalendarAnalysis> {
    const holidays = await this.holidayModel.find({ active: true }).exec();
    const now = new Date();
    
    // Upcoming holidays
    const upcomingHolidays = holidays
      .filter(h => h.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10)
      .map(h => ({
        name: h.name || 'Holiday',
        date: h.startDate.toISOString().split('T')[0],
        type: h.type,
        daysUntil: Math.ceil((h.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }));
    
    // Group by type
    const typeGroup: Map<string, { count: number; days: number }> = new Map();
    for (const h of holidays) {
      const days = h.endDate ? 
        Math.ceil((h.endDate.getTime() - h.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1;
      
      if (!typeGroup.has(h.type)) {
        typeGroup.set(h.type, { count: 0, days: 0 });
      }
      const data = typeGroup.get(h.type)!;
      data.count++;
      data.days += days;
    }
    
    const holidaysByType = Array.from(typeGroup.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalDays: data.days,
    }));
    
    // Group by month
    const monthGroup: Map<string, number> = new Map();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (const h of holidays) {
      const month = monthNames[h.startDate.getMonth()];
      monthGroup.set(month, (monthGroup.get(month) || 0) + 1);
    }
    
    const holidaysByMonth = monthNames.map(month => ({
      month,
      count: monthGroup.get(month) || 0,
    }));
    
    return {
      totalHolidays: holidays.length,
      upcomingHolidays,
      holidaysByType,
      holidaysByMonth,
    };
  }

  // ==================== PUNCTUALITY SCORE ====================
  async getPunctualityScore(): Promise<PunctualityScore> {
    const exceptions = await this.timeExceptionModel.find().exec();
    const attendanceRecords = await this.attendanceModel.find().exec();
    const departments = await this.departmentModel.find().exec();
    const employees = await this.employeeModel.find().exec();
    
    const totalRecords = attendanceRecords.length;
    const lateCount = exceptions.filter(e => e.type === 'LATE').length;
    const earlyLeaveCount = exceptions.filter(e => e.type === 'EARLY_LEAVE').length;
    const onTimeCount = totalRecords - lateCount - earlyLeaveCount;
    
    const onTimePercentage = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 100;
    const latePercentage = totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0;
    const earlyDeparturePercentage = totalRecords > 0 ? Math.round((earlyLeaveCount / totalRecords) * 100) : 0;
    
    // Calculate overall score (weighted average)
    const overallScore = Math.min(100, Math.max(0, 
      onTimePercentage * 1.0 - latePercentage * 0.5 - earlyDeparturePercentage * 0.3
    ));
    
    // Score by department
    const scoreByDepartment = departments.map(dept => {
      const deptEmployeeIds = employees
        .filter(e => e.primaryDepartmentId?.toString() === dept._id.toString())
        .map(e => e._id.toString());
      
      const deptExceptions = exceptions.filter(e => 
        deptEmployeeIds.includes(e.employeeId.toString())
      );
      
      const deptLate = deptExceptions.filter(e => e.type === 'LATE').length;
      const deptEarly = deptExceptions.filter(e => e.type === 'EARLY_LEAVE').length;
      const deptTotal = deptEmployeeIds.length * 22; // Approx work days per month
      
      const score = deptTotal > 0 ? 
        Math.min(100, Math.max(0, 100 - (deptLate + deptEarly) / deptTotal * 100)) : 100;
      
      return {
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        score: Math.round(score),
        trend: 'STABLE' as const,
      };
    });
    
    return {
      overallScore: Math.round(overallScore),
      onTimePercentage,
      latePercentage,
      earlyDeparturePercentage,
      scoreByDepartment: scoreByDepartment.sort((a, b) => b.score - a.score),
      scoreByShift: [],
    };
  }

  // ==================== WORK PATTERN INSIGHTS ====================
  async getWorkPatternInsights(): Promise<WorkPatternInsights> {
    const attendanceRecords = await this.attendanceModel.find().exec();
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats: Map<number, { totalMinutes: number; count: number }> = new Map();
    
    for (const record of attendanceRecords) {
      // Get day from first punch
      if (record.punches && record.punches.length > 0) {
        const day = new Date(record.punches[0].time).getDay();
        if (!dayStats.has(day)) {
          dayStats.set(day, { totalMinutes: 0, count: 0 });
        }
        const data = dayStats.get(day)!;
        data.totalMinutes += record.totalWorkMinutes || 0;
        data.count++;
      }
    }
    
    const workDistributionByDay = dayNames.map((name, idx) => {
      const stats = dayStats.get(idx) || { totalMinutes: 0, count: 0 };
      return {
        day: name,
        avgHours: stats.count > 0 ? Math.round((stats.totalMinutes / stats.count / 60) * 100) / 100 : 0,
        employeeCount: stats.count,
      };
    });
    
    // Find most/least active days
    const activeDays = workDistributionByDay
      .filter(d => d.avgHours > 0)
      .sort((a, b) => b.avgHours - a.avgHours);
    
    const mostActiveDay = activeDays.length > 0 ? activeDays[0].day : 'N/A';
    const leastActiveDay = activeDays.length > 0 ? activeDays[activeDays.length - 1].day : 'N/A';
    
    // Calculate workload balance
    const avgMinutes = attendanceRecords.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) / 
      (attendanceRecords.length || 1);
    
    const underworked = attendanceRecords.filter(r => (r.totalWorkMinutes || 0) < 360).length;
    const overworked = attendanceRecords.filter(r => (r.totalWorkMinutes || 0) > 540).length;
    const optimal = attendanceRecords.length - underworked - overworked;
    
    return {
      peakProductivityHours: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      avgDailyWorkHours: Math.round(avgMinutes / 60 * 100) / 100,
      mostActiveDay,
      leastActiveDay,
      workDistributionByDay,
      workloadBalance: {
        underworked,
        optimal,
        overworked,
      },
    };
  }

  // ==================== HEALTH SCORE ====================
  async getHealthScore(): Promise<TimeManagementHealthScore> {
    const [overview, exceptions, punctuality] = await Promise.all([
      this.getAttendanceOverview(),
      this.getExceptionAnalysis(),
      this.getPunctualityScore(),
    ]);
    
    const components = [
      {
        name: 'Attendance Rate',
        score: Math.min(100, 100 - overview.missedPunchRate),
        weight: 0.25,
        status: this.getStatus(100 - overview.missedPunchRate),
        recommendations: overview.missedPunchRate > 5 ? 
          ['Implement attendance reminders', 'Review punch-in/out procedures'] : [],
      },
      {
        name: 'Punctuality',
        score: punctuality.overallScore,
        weight: 0.25,
        status: this.getStatus(punctuality.overallScore),
        recommendations: punctuality.latePercentage > 10 ? 
          ['Address frequent late arrivals', 'Consider flexible work hours'] : [],
      },
      {
        name: 'Exception Resolution',
        score: exceptions.totalExceptions > 0 ? 
          Math.round((exceptions.resolutionMetrics.resolvedCount / exceptions.totalExceptions) * 100) : 100,
        weight: 0.25,
        status: this.getStatus(exceptions.resolutionMetrics.resolvedCount / (exceptions.totalExceptions || 1) * 100),
        recommendations: exceptions.resolutionMetrics.pendingCount > 10 ? 
          ['Clear backlog of pending exceptions', 'Assign more reviewers'] : [],
      },
      {
        name: 'Payroll Finalization',
        score: overview.totalRecords > 0 ? 
          Math.round((overview.finalisedForPayrollCount / overview.totalRecords) * 100) : 100,
        weight: 0.25,
        status: this.getStatus((overview.finalisedForPayrollCount / (overview.totalRecords || 1)) * 100),
        recommendations: overview.pendingPayrollCount > 0 ? 
          ['Finalize pending attendance records', 'Review correction requests'] : [],
      },
    ];
    
    const overallScore = Math.round(
      components.reduce((sum, c) => sum + c.score * c.weight, 0)
    );
    
    const topIssues = components
      .filter(c => c.status === 'POOR' || c.status === 'FAIR')
      .flatMap(c => c.recommendations);
    
    const improvements = components
      .filter(c => c.status === 'EXCELLENT' || c.status === 'GOOD')
      .map(c => `${c.name} is performing well`);
    
    return {
      overallScore,
      components,
      topIssues: topIssues.slice(0, 5),
      improvements: improvements.slice(0, 3),
    };
  }

  private getStatus(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'POOR';
  }

  // ==================== DATA STORIES ====================
  async generateStories(): Promise<TimeManagementStory[]> {
    const [overview, punctuality, overtime] = await Promise.all([
      this.getAttendanceOverview(),
      this.getPunctualityScore(),
      this.getOvertimeAnalysis(),
    ]);
    
    const stories: TimeManagementStory[] = [];
    
    // Attendance story
    stories.push({
      title: 'Attendance Snapshot',
      narrative: `Your organization logged ${overview.totalRecords.toLocaleString()} attendance records with an average of ${overview.avgWorkHoursPerDay} work hours per day. ${overview.missedPunchRate > 5 ? 'Missed punches are higher than optimal.' : 'Attendance tracking is running smoothly.'}`,
      metric: 'Average Work Hours',
      value: overview.avgWorkHoursPerDay,
      trend: overview.avgWorkHoursPerDay >= 8 ? 'UP' : 'DOWN',
      impact: overview.avgWorkHoursPerDay >= 7.5 ? 'POSITIVE' : 'NEGATIVE',
      icon: 'clock',
    });
    
    // Punctuality story
    stories.push({
      title: 'Punctuality Report',
      narrative: `${punctuality.onTimePercentage}% of employees arrive on time. ${punctuality.latePercentage > 10 ? 'Late arrivals are a growing concern.' : 'Your team maintains good punctuality habits.'}`,
      metric: 'On-Time Rate',
      value: `${punctuality.onTimePercentage}%`,
      trend: punctuality.onTimePercentage >= 90 ? 'UP' : 'DOWN',
      impact: punctuality.onTimePercentage >= 85 ? 'POSITIVE' : 'NEGATIVE',
      icon: 'timer',
    });
    
    // Overtime story
    if (overtime.totalOvertimeHours > 0) {
      stories.push({
        title: 'Overtime Insights',
        narrative: `${overtime.employeesWithOvertime} employees logged ${overtime.totalOvertimeHours.toLocaleString()} overtime hours. ${overtime.totalOvertimeHours > 100 ? 'Consider workload redistribution to prevent burnout.' : 'Overtime levels are manageable.'}`,
        metric: 'Total Overtime Hours',
        value: overtime.totalOvertimeHours,
        trend: overtime.totalOvertimeHours > 50 ? 'UP' : 'STABLE',
        impact: overtime.totalOvertimeHours > 100 ? 'NEGATIVE' : 'NEUTRAL',
        icon: 'trending-up',
      });
    }
    
    return stories;
  }

  // ==================== DASHBOARD ====================
  async getDashboard(): Promise<TimeManagementDashboard> {
    const [
      overview,
      attendanceTrends,
      departmentAttendance,
      shiftDistribution,
      overtimeAnalysis,
      exceptionAnalysis,
      holidayCalendar,
      punctualityScore,
      workPatterns,
      healthScore,
      stories,
    ] = await Promise.all([
      this.getAttendanceOverview(),
      this.getAttendanceTrends(30),
      this.getDepartmentAttendance(),
      this.getShiftDistribution(),
      this.getOvertimeAnalysis(),
      this.getExceptionAnalysis(),
      this.getHolidayCalendarAnalysis(),
      this.getPunctualityScore(),
      this.getWorkPatternInsights(),
      this.getHealthScore(),
      this.generateStories(),
    ]);

    return {
      overview,
      attendanceTrends,
      departmentAttendance,
      shiftDistribution,
      overtimeAnalysis,
      exceptionAnalysis,
      holidayCalendar,
      punctualityScore,
      workPatterns,
      healthScore,
      stories,
    };
  }
}
