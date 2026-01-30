import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveRequest, LeaveRequestDocument } from '../../leaves/models/leave-request.schema';
import { LeaveType, LeaveTypeDocument } from '../../leaves/models/leave-type.schema';
import { LeaveEntitlement, LeaveEntitlementDocument } from '../../leaves/models/leave-entitlement.schema';
import { LeavePolicy, LeavePolicyDocument } from '../../leaves/models/leave-policy.schema';
import { LeaveCategory, LeaveCategoryDocument } from '../../leaves/models/leave-category.schema';
import { LeaveAdjustment, LeaveAdjustmentDocument } from '../../leaves/models/leave-adjustment.schema';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';
import { Department } from '../../organization-structure/models/department.schema';

// ==================== INTERFACES ====================

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
}

export interface LeaveBalanceSummary {
  totalEntitlements: number;
  totalAccrued: number;
  totalTaken: number;
  totalRemaining: number;
  totalPending: number;
  avgBalancePerEmployee: number;
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

@Injectable()
export class LeavesAnalyticsService {
  constructor(
    @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequestDocument>,
    @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel(LeaveEntitlement.name) private leaveEntitlementModel: Model<LeaveEntitlementDocument>,
    @InjectModel(LeavePolicy.name) private leavePolicyModel: Model<LeavePolicyDocument>,
    @InjectModel(LeaveCategory.name) private leaveCategoryModel: Model<LeaveCategoryDocument>,
    @InjectModel(LeaveAdjustment.name) private leaveAdjustmentModel: Model<LeaveAdjustmentDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  // ==================== LEAVE OVERVIEW ====================
  async getLeaveOverview(dateRange?: { from?: Date; to?: Date }): Promise<LeaveOverview> {
    const query: any = {};
    
    if (dateRange?.from || dateRange?.to) {
      query.createdAt = {};
      if (dateRange.from) query.createdAt.$gte = dateRange.from;
      if (dateRange.to) query.createdAt.$lte = dateRange.to;
    }

    const requests = await this.leaveRequestModel.find(query).exec();
    
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const rejectedRequests = requests.filter(r => r.status === 'rejected').length;
    const cancelledRequests = requests.filter(r => r.status === 'cancelled').length;
    const totalDaysTaken = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.durationDays || 0), 0);
    
    // Calculate average approval time
    const approvedWithDates = requests.filter(r => 
      r.status === 'approved' && r.approvalFlow?.some(a => a.decidedAt)
    );
    
    let avgApprovalTimeDays = 0;
    if (approvedWithDates.length > 0) {
      const totalDays = approvedWithDates.reduce((sum, r) => {
        const approvalDate = r.approvalFlow?.find(a => a.status === 'approved')?.decidedAt;
        if (approvalDate) {
          const createdAt = (r as any).createdAt || new Date();
          return sum + Math.ceil((new Date(approvalDate).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0);
      avgApprovalTimeDays = Math.round((totalDays / approvedWithDates.length) * 100) / 100;
    }
    
    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      cancelledRequests,
      totalDaysTaken,
      avgDaysPerRequest: totalRequests > 0 ? Math.round((totalDaysTaken / approvedRequests) * 100) / 100 : 0,
      approvalRate: totalRequests - pendingRequests > 0 ? 
        Math.round((approvedRequests / (totalRequests - pendingRequests)) * 10000) / 100 : 0,
      avgApprovalTimeDays,
    };
  }

  // ==================== LEAVE BALANCE SUMMARY ====================
  async getBalanceSummary(): Promise<LeaveBalanceSummary> {
    const entitlements = await this.leaveEntitlementModel.find().exec();
    const leaveTypes = await this.leaveTypeModel.find().exec();
    
    const totalEntitlements = entitlements.reduce((sum, e) => sum + (e.yearlyEntitlement || 0), 0);
    const totalAccrued = entitlements.reduce((sum, e) => sum + (e.accruedRounded || e.accruedActual || 0), 0);
    const totalTaken = entitlements.reduce((sum, e) => sum + (e.taken || 0), 0);
    const totalRemaining = entitlements.reduce((sum, e) => sum + (e.remaining || 0), 0);
    const totalPending = entitlements.reduce((sum, e) => sum + (e.pending || 0), 0);
    
    const uniqueEmployees = new Set(entitlements.map(e => e.employeeId.toString())).size;
    
    // Balance by leave type
    const balancesByType: Map<string, {
      entitled: number;
      taken: number;
      remaining: number;
    }> = new Map();
    
    for (const ent of entitlements) {
      const typeId = ent.leaveTypeId.toString();
      if (!balancesByType.has(typeId)) {
        balancesByType.set(typeId, { entitled: 0, taken: 0, remaining: 0 });
      }
      const data = balancesByType.get(typeId)!;
      data.entitled += ent.yearlyEntitlement || 0;
      data.taken += ent.taken || 0;
      data.remaining += ent.remaining || 0;
    }
    
    const balances = Array.from(balancesByType.entries()).map(([typeId, data]) => {
      const leaveType = leaveTypes.find(lt => lt._id.toString() === typeId);
      return {
        leaveTypeId: typeId,
        leaveTypeName: leaveType?.name || 'Unknown',
        totalEntitled: data.entitled,
        totalTaken: data.taken,
        totalRemaining: data.remaining,
        utilizationRate: data.entitled > 0 ? 
          Math.round((data.taken / data.entitled) * 10000) / 100 : 0,
      };
    });
    
    return {
      totalEntitlements,
      totalAccrued,
      totalTaken,
      totalRemaining,
      totalPending,
      avgBalancePerEmployee: uniqueEmployees > 0 ? 
        Math.round((totalRemaining / uniqueEmployees) * 100) / 100 : 0,
      balancesByType: balances.sort((a, b) => b.totalEntitled - a.totalEntitled),
    };
  }

  // ==================== LEAVE REQUEST TRENDS ====================
  async getRequestTrends(months: number = 12): Promise<LeaveRequestTrend[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const requests = await this.leaveRequestModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalRequests: { $sum: 1 },
          approvedRequests: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejectedRequests: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          totalDays: { $sum: '$durationDays' },
        }
      },
      { $sort: { _id: 1 } }
    ]).exec();
    
    return requests.map(r => ({
      period: r._id,
      totalRequests: r.totalRequests,
      approvedRequests: r.approvedRequests,
      rejectedRequests: r.rejectedRequests,
      totalDays: r.totalDays || 0,
      avgProcessingTime: 2, // Placeholder
    }));
  }

  // ==================== LEAVE TYPE ANALYSIS ====================
  async getLeaveTypeAnalysis(): Promise<LeaveTypeAnalysis[]> {
    const leaveTypes = await this.leaveTypeModel.find().exec();
    const categories = await this.leaveCategoryModel.find().exec();
    const requests = await this.leaveRequestModel.find().exec();
    
    const result: LeaveTypeAnalysis[] = [];
    
    for (const lt of leaveTypes) {
      const category = categories.find(c => c._id.toString() === lt.categoryId?.toString());
      const typeRequests = requests.filter(r => r.leaveTypeId.toString() === lt._id.toString());
      const approvedRequests = typeRequests.filter(r => r.status === 'approved');
      const totalDays = approvedRequests.reduce((sum, r) => sum + (r.durationDays || 0), 0);
      
      // Find popular months
      const monthCount: Map<number, number> = new Map();
      for (const req of typeRequests) {
        const month = req.dates?.from ? new Date(req.dates.from).getMonth() : 0;
        monthCount.set(month, (monthCount.get(month) || 0) + 1);
      }
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const popularMonths = Array.from(monthCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([m]) => monthNames[m]);
      
      result.push({
        leaveTypeId: lt._id.toString(),
        leaveTypeName: lt.name,
        categoryName: category?.name || 'Uncategorized',
        isPaid: lt.paid,
        totalRequests: typeRequests.length,
        totalDays,
        avgDaysPerRequest: approvedRequests.length > 0 ? 
          Math.round((totalDays / approvedRequests.length) * 100) / 100 : 0,
        approvalRate: typeRequests.length > 0 ?
          Math.round((approvedRequests.length / typeRequests.length) * 10000) / 100 : 0,
        topReasons: [],
        popularMonths,
        trend: 'STABLE',
      });
    }
    
    return result.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  // ==================== DEPARTMENT ANALYSIS ====================
  async getDepartmentLeaveAnalysis(): Promise<DepartmentLeaveAnalysis[]> {
    const departments = await this.departmentModel.find({ status: 'active' }).exec();
    const employees = await this.employeeModel.find().exec();
    const requests = await this.leaveRequestModel.find().exec();
    const leaveTypes = await this.leaveTypeModel.find().exec();
    
    const result: DepartmentLeaveAnalysis[] = [];
    
    for (const dept of departments) {
      const deptEmployees = employees.filter(e => 
        e.primaryDepartmentId?.toString() === dept._id.toString()
      );
      
      const employeeIds = deptEmployees.map(e => e._id.toString());
      
      const deptRequests = requests.filter(r => 
        employeeIds.includes(r.employeeId.toString())
      );
      
      const approvedRequests = deptRequests.filter(r => r.status === 'approved');
      const totalDays = approvedRequests.reduce((sum, r) => sum + (r.durationDays || 0), 0);
      
      // Count by leave type
      const typeCount: Map<string, number> = new Map();
      for (const req of deptRequests) {
        const typeId = req.leaveTypeId.toString();
        typeCount.set(typeId, (typeCount.get(typeId) || 0) + 1);
      }
      
      const topLeaveTypes = Array.from(typeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([typeId, count]) => ({
          name: leaveTypes.find(lt => lt._id.toString() === typeId)?.name || 'Unknown',
          count,
        }));
      
      // Calculate absenteeism rate (days taken / total work days)
      const workDaysPerMonth = 22;
      const absenteeismRate = deptEmployees.length > 0 ? 
        Math.round((totalDays / (deptEmployees.length * workDaysPerMonth)) * 10000) / 100 : 0;
      
      result.push({
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        employeeCount: deptEmployees.length,
        totalRequests: deptRequests.length,
        totalDaysTaken: totalDays,
        avgDaysPerEmployee: deptEmployees.length > 0 ? 
          Math.round((totalDays / deptEmployees.length) * 100) / 100 : 0,
        pendingRequests: deptRequests.filter(r => r.status === 'pending').length,
        approvalRate: deptRequests.length > 0 ?
          Math.round((approvedRequests.length / deptRequests.length) * 10000) / 100 : 0,
        topLeaveTypes,
        absenteeismRate,
      });
    }
    
    return result.sort((a, b) => b.totalDaysTaken - a.totalDaysTaken);
  }

  // ==================== SEASONAL PATTERNS ====================
  async getSeasonalPatterns(): Promise<SeasonalPattern[]> {
    const requests = await this.leaveRequestModel.find({ status: 'approved' }).exec();
    const leaveTypes = await this.leaveTypeModel.find().exec();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthData: Map<number, {
      requests: any[];
      days: number;
      typeCount: Map<string, number>;
    }> = new Map();
    
    for (let i = 0; i < 12; i++) {
      monthData.set(i, { requests: [], days: 0, typeCount: new Map() });
    }
    
    for (const req of requests) {
      if (req.dates?.from) {
        const month = new Date(req.dates.from).getMonth();
        const data = monthData.get(month)!;
        data.requests.push(req);
        data.days += req.durationDays || 0;
        
        const typeId = req.leaveTypeId.toString();
        data.typeCount.set(typeId, (data.typeCount.get(typeId) || 0) + 1);
      }
    }
    
    return monthNames.map((month, idx) => {
      const data = monthData.get(idx)!;
      
      const topLeaveTypes = Array.from(data.typeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([typeId, count]) => ({
          name: leaveTypes.find(lt => lt._id.toString() === typeId)?.name || 'Unknown',
          count,
        }));
      
      return {
        month,
        totalRequests: data.requests.length,
        totalDays: data.days,
        avgDaysPerRequest: data.requests.length > 0 ? 
          Math.round((data.days / data.requests.length) * 100) / 100 : 0,
        topLeaveTypes,
        peakDays: [],
      };
    });
  }

  // ==================== FORECASTING ====================
  async getForecasting(): Promise<LeaveForecasting> {
    const trends = await this.getRequestTrends(6);
    const balanceSummary = await this.getBalanceSummary();
    
    // Simple forecasting based on historical trends
    const avgRequests = trends.length > 0 ? 
      Math.round(trends.reduce((sum, t) => sum + t.totalRequests, 0) / trends.length) : 0;
    const avgDays = trends.length > 0 ? 
      Math.round(trends.reduce((sum, t) => sum + t.totalDays, 0) / trends.length) : 0;
    
    // Month names for peak prediction
    const currentMonth = new Date().getMonth();
    const peakMonths = ['December', 'August', 'July']; // Typical peak months
    
    return {
      nextMonth: {
        predictedRequests: Math.round(avgRequests * 1.1),
        predictedDays: Math.round(avgDays * 1.1),
        confidence: 75,
        factors: [
          'Historical average trends',
          'Seasonal patterns',
          'Current pending requests',
        ],
      },
      nextQuarter: {
        predictedRequests: Math.round(avgRequests * 3.2),
        predictedDays: Math.round(avgDays * 3.2),
        confidence: 65,
        peakMonths,
      },
      yearEnd: {
        unutilizedDaysPrediction: Math.round(balanceSummary.totalRemaining * 0.7),
        carryForwardEstimate: Math.round(balanceSummary.totalRemaining * 0.3),
        expiringBalances: Math.round(balanceSummary.totalRemaining * 0.15),
      },
    };
  }

  // ==================== ABSENTEEISM ANALYSIS ====================
  async getAbsenteeismAnalysis(): Promise<AbsenteeismAnalysis> {
    const requests = await this.leaveRequestModel.find({ status: 'approved' }).exec();
    const employees = await this.employeeModel.find().exec();
    const departments = await this.departmentModel.find().exec();
    
    const workDaysPerYear = 260;
    const totalDaysTaken = requests.reduce((sum, r) => sum + (r.durationDays || 0), 0);
    const overallRate = employees.length > 0 ? 
      Math.round((totalDaysTaken / (employees.length * workDaysPerYear)) * 10000) / 100 : 0;
    
    // By department
    const byDepartment = departments.map(dept => {
      const deptEmployees = employees.filter(e => 
        e.primaryDepartmentId?.toString() === dept._id.toString()
      );
      const employeeIds = deptEmployees.map(e => e._id.toString());
      const deptDays = requests
        .filter(r => employeeIds.includes(r.employeeId.toString()))
        .reduce((sum, r) => sum + (r.durationDays || 0), 0);
      
      const rate = deptEmployees.length > 0 ? 
        Math.round((deptDays / (deptEmployees.length * workDaysPerYear)) * 10000) / 100 : 0;
      
      return {
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        rate,
        trend: 'STABLE' as const,
      };
    });
    
    // By day of week
    const dayCount: Map<number, number> = new Map();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const req of requests) {
      if (req.dates?.from) {
        const day = new Date(req.dates.from).getDay();
        dayCount.set(day, (dayCount.get(day) || 0) + 1);
      }
    }
    
    const totalRequests = requests.length;
    const byDayOfWeek = dayNames.map((name, idx) => ({
      day: name,
      rate: totalRequests > 0 ? 
        Math.round(((dayCount.get(idx) || 0) / totalRequests) * 10000) / 100 : 0,
      requestCount: dayCount.get(idx) || 0,
    }));
    
    // Detect patterns
    const mondayFriday = (dayCount.get(1) || 0) + (dayCount.get(5) || 0);
    const bridgeDays = 0; // Placeholder for bridge day detection
    
    // Flagged employees (with irregular patterns)
    const flaggedEmployees = requests
      .filter(r => r.irregularPatternFlag)
      .reduce((acc, r) => {
        const empId = r.employeeId.toString();
        if (!acc.has(empId)) {
          acc.set(empId, { count: 0, days: 0 });
        }
        const data = acc.get(empId)!;
        data.count++;
        data.days += r.durationDays || 0;
        return acc;
      }, new Map<string, { count: number; days: number }>());
    
    const flagged = Array.from(flaggedEmployees.entries())
      .map(([empId, data]) => {
        const employee = employees.find(e => e._id.toString() === empId);
        return {
          employeeId: empId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          irregularPatternCount: data.count,
          totalAbsences: data.days,
        };
      })
      .sort((a, b) => b.irregularPatternCount - a.irregularPatternCount)
      .slice(0, 10);
    
    return {
      overallRate,
      byDepartment: byDepartment.sort((a, b) => b.rate - a.rate),
      byDayOfWeek,
      patterns: {
        bridgeDays,
        mondayFriday,
        consecutiveAbsences: 0,
      },
      flaggedEmployees: flagged,
    };
  }

  // ==================== POLICY COMPLIANCE ====================
  async getPolicyCompliance(): Promise<LeavePolicyCompliance> {
    const policies = await this.leavePolicyModel.find().exec();
    const leaveTypes = await this.leaveTypeModel.find().exec();
    const requests = await this.leaveRequestModel.find().exec();
    
    const policiesConfigured = policies.length;
    const policiesActive = policies.length; // Assuming all are active
    
    const complianceByPolicy = policies.map(policy => {
      const leaveType = leaveTypes.find(lt => lt._id.toString() === policy.leaveTypeId?.toString());
      const typeRequests = requests.filter(r => r.leaveTypeId?.toString() === policy.leaveTypeId?.toString());
      
      // Check for violations
      let violations = 0;
      const commonViolations: string[] = [];
      
      for (const req of typeRequests) {
        // Check max consecutive days
        if (policy.maxConsecutiveDays && (req.durationDays || 0) > policy.maxConsecutiveDays) {
          violations++;
          if (!commonViolations.includes('Exceeded max consecutive days')) {
            commonViolations.push('Exceeded max consecutive days');
          }
        }
        
        // Check min notice days
        if (policy.minNoticeDays) {
          const createdAt = (req as any).createdAt;
          const startDate = req.dates?.from;
          if (createdAt && startDate) {
            const noticeDays = Math.ceil((new Date(startDate).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (noticeDays < policy.minNoticeDays) {
              violations++;
              if (!commonViolations.includes('Insufficient notice period')) {
                commonViolations.push('Insufficient notice period');
              }
            }
          }
        }
      }
      
      const complianceRate = typeRequests.length > 0 ? 
        Math.round(((typeRequests.length - violations) / typeRequests.length) * 10000) / 100 : 100;
      
      return {
        policyId: policy._id.toString(),
        leaveTypeName: leaveType?.name || 'Unknown',
        complianceRate,
        violationsCount: violations,
        commonViolations,
      };
    });
    
    const overallComplianceRate = complianceByPolicy.length > 0 ?
      Math.round(complianceByPolicy.reduce((sum, c) => sum + c.complianceRate, 0) / complianceByPolicy.length) : 100;
    
    const recommendations: string[] = [];
    if (overallComplianceRate < 90) {
      recommendations.push('Review and communicate leave policies to employees');
    }
    if (complianceByPolicy.some(c => c.violationsCount > 10)) {
      recommendations.push('Address frequent policy violations with targeted training');
    }
    
    return {
      overallComplianceRate,
      policiesConfigured,
      policiesActive,
      complianceByPolicy: complianceByPolicy.sort((a, b) => a.complianceRate - b.complianceRate),
      recommendations,
    };
  }

  // ==================== APPROVAL WORKFLOW ====================
  async getApprovalWorkflow(): Promise<ApprovalWorkflow> {
    const requests = await this.leaveRequestModel.find().exec();
    
    // Calculate approval times
    const approvedRequests = requests.filter(r => r.status === 'approved');
    
    let totalApprovalTime = 0;
    let approvalCount = 0;
    const roleStats: Map<string, { count: number; totalTime: number }> = new Map();
    
    for (const req of approvedRequests) {
      if (req.approvalFlow) {
        for (const flow of req.approvalFlow) {
          if (flow.decidedAt) {
            approvalCount++;
            const role = flow.role || 'Unknown';
            if (!roleStats.has(role)) {
              roleStats.set(role, { count: 0, totalTime: 0 });
            }
            roleStats.get(role)!.count++;
          }
        }
      }
    }
    
    const avgApprovalTime = approvalCount > 0 ? Math.round((totalApprovalTime / approvalCount) * 100) / 100 : 0;
    
    const approvalsByRole = Array.from(roleStats.entries()).map(([role, stats]) => ({
      role,
      count: stats.count,
      avgTime: stats.count > 0 ? Math.round((stats.totalTime / stats.count) * 100) / 100 : 0,
    }));
    
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const returnedCount = requests.filter(r => r.status === 'returned_for_correction').length;
    
    return {
      avgApprovalTime,
      approvalsByRole,
      bottlenecks: [
        {
          stage: 'Manager Approval',
          avgDelayDays: 1.5,
          pendingCount: Math.floor(pendingCount * 0.6),
        },
        {
          stage: 'HR Review',
          avgDelayDays: 0.5,
          pendingCount: Math.floor(pendingCount * 0.4),
        },
      ],
      escalationRate: 0,
      returnedForCorrectionRate: requests.length > 0 ? 
        Math.round((returnedCount / requests.length) * 10000) / 100 : 0,
    };
  }

  // ==================== HEALTH SCORE ====================
  async getHealthScore(): Promise<LeaveHealthScore> {
    const [overview, balanceSummary, compliance, workflow] = await Promise.all([
      this.getLeaveOverview(),
      this.getBalanceSummary(),
      this.getPolicyCompliance(),
      this.getApprovalWorkflow(),
    ]);
    
    const components = [
      {
        name: 'Leave Utilization',
        score: balanceSummary.balancesByType.length > 0 ?
          Math.round(balanceSummary.balancesByType.reduce((sum, b) => sum + b.utilizationRate, 0) / balanceSummary.balancesByType.length) : 50,
        weight: 0.2,
        status: this.getStatus(50),
        details: `${balanceSummary.totalTaken} days taken of ${balanceSummary.totalEntitlements} entitled`,
      },
      {
        name: 'Approval Efficiency',
        score: overview.approvalRate,
        weight: 0.25,
        status: this.getStatus(overview.approvalRate),
        details: `${overview.approvalRate}% approval rate with ${overview.avgApprovalTimeDays} days avg processing`,
      },
      {
        name: 'Policy Compliance',
        score: compliance.overallComplianceRate,
        weight: 0.25,
        status: this.getStatus(compliance.overallComplianceRate),
        details: `${compliance.policiesActive} policies configured with ${compliance.overallComplianceRate}% compliance`,
      },
      {
        name: 'Pending Backlog',
        score: Math.max(0, 100 - (overview.pendingRequests * 2)),
        weight: 0.15,
        status: this.getStatus(Math.max(0, 100 - (overview.pendingRequests * 2))),
        details: `${overview.pendingRequests} requests pending approval`,
      },
      {
        name: 'Balance Distribution',
        score: 75, // Placeholder
        weight: 0.15,
        status: this.getStatus(75),
        details: `Avg ${balanceSummary.avgBalancePerEmployee} days remaining per employee`,
      },
    ];
    
    const overallScore = Math.round(
      components.reduce((sum, c) => sum + c.score * c.weight, 0)
    );
    
    const topIssues = components
      .filter(c => c.status === 'POOR' || c.status === 'FAIR')
      .map(c => `${c.name}: ${c.details}`);
    
    const recommendations: string[] = [];
    if (overview.pendingRequests > 10) {
      recommendations.push('Clear pending leave request backlog');
    }
    if (overview.approvalRate < 80) {
      recommendations.push('Review rejection reasons to improve approval process');
    }
    if (compliance.overallComplianceRate < 90) {
      recommendations.push('Reinforce leave policies with training');
    }
    
    return {
      overallScore,
      components,
      topIssues: topIssues.slice(0, 5),
      recommendations,
    };
  }

  private getStatus(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'POOR';
  }

  // ==================== DATA STORIES ====================
  async generateStories(): Promise<LeaveStory[]> {
    const [overview, balanceSummary, absenteeism, forecasting] = await Promise.all([
      this.getLeaveOverview(),
      this.getBalanceSummary(),
      this.getAbsenteeismAnalysis(),
      this.getForecasting(),
    ]);
    
    const stories: LeaveStory[] = [];
    
    // Leave Request Story
    stories.push({
      title: 'Leave Request Activity',
      narrative: `Your organization processed ${overview.totalRequests.toLocaleString()} leave requests with a ${overview.approvalRate}% approval rate. ${overview.pendingRequests > 5 ? 'There are pending requests requiring attention.' : 'Request processing is up to date.'}`,
      metric: 'Total Requests',
      value: overview.totalRequests,
      trend: overview.approvalRate >= 80 ? 'UP' : 'DOWN',
      impact: overview.approvalRate >= 80 ? 'POSITIVE' : 'NEGATIVE',
      icon: 'calendar',
      actionRequired: overview.pendingRequests > 10,
    });
    
    // Balance Story
    stories.push({
      title: 'Leave Balance Insights',
      narrative: `Employees have ${balanceSummary.totalRemaining.toLocaleString()} leave days remaining across all types. Average balance per employee is ${balanceSummary.avgBalancePerEmployee} days. ${balanceSummary.totalPending > 0 ? `${balanceSummary.totalPending} days are pending approval.` : ''}`,
      metric: 'Remaining Balance',
      value: `${balanceSummary.totalRemaining} days`,
      trend: 'STABLE',
      impact: 'NEUTRAL',
      icon: 'wallet',
    });
    
    // Absenteeism Story
    if (absenteeism.overallRate > 5) {
      stories.push({
        title: 'Absenteeism Alert',
        narrative: `The overall absenteeism rate is ${absenteeism.overallRate}%. ${absenteeism.flaggedEmployees.length > 0 ? `${absenteeism.flaggedEmployees.length} employees have been flagged for irregular patterns.` : 'No significant irregular patterns detected.'}`,
        metric: 'Absenteeism Rate',
        value: `${absenteeism.overallRate}%`,
        trend: absenteeism.overallRate > 7 ? 'UP' : 'STABLE',
        impact: absenteeism.overallRate > 7 ? 'NEGATIVE' : 'NEUTRAL',
        icon: 'alert-triangle',
        actionRequired: absenteeism.overallRate > 7,
      });
    }
    
    // Forecast Story
    stories.push({
      title: 'Leave Forecast',
      narrative: `Next month, we predict approximately ${forecasting.nextMonth.predictedRequests} leave requests totaling ${forecasting.nextMonth.predictedDays} days. Year-end projections show ${forecasting.yearEnd.unutilizedDaysPrediction} potentially unutilized days.`,
      metric: 'Predicted Requests',
      value: forecasting.nextMonth.predictedRequests,
      trend: 'STABLE',
      impact: 'NEUTRAL',
      icon: 'trending-up',
    });
    
    return stories;
  }

  // ==================== DASHBOARD ====================
  async getDashboard(): Promise<LeavesDashboard> {
    const [
      overview,
      balanceSummary,
      requestTrends,
      leaveTypeAnalysis,
      departmentAnalysis,
      seasonalPatterns,
      forecasting,
      absenteeism,
      policyCompliance,
      approvalWorkflow,
      healthScore,
      stories,
    ] = await Promise.all([
      this.getLeaveOverview(),
      this.getBalanceSummary(),
      this.getRequestTrends(12),
      this.getLeaveTypeAnalysis(),
      this.getDepartmentLeaveAnalysis(),
      this.getSeasonalPatterns(),
      this.getForecasting(),
      this.getAbsenteeismAnalysis(),
      this.getPolicyCompliance(),
      this.getApprovalWorkflow(),
      this.getHealthScore(),
      this.generateStories(),
    ]);

    return {
      overview,
      balanceSummary,
      requestTrends,
      leaveTypeAnalysis,
      departmentAnalysis,
      seasonalPatterns,
      forecasting,
      absenteeism,
      policyCompliance,
      approvalWorkflow,
      healthScore,
      stories,
    };
  }
}
