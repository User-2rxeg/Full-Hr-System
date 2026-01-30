import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { TerminationRequest, TerminationRequestDocument } from '../../recruitment/models/termination-request.schema';
import { ClearanceChecklist, ClearanceChecklistDocument } from '../../recruitment/models/clearance-checklist.schema';
import { Contract, ContractDocument } from '../../recruitment/models/contract.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';

// Enums
import { TerminationStatus } from '../../recruitment/enums/termination-status.enum';
import { TerminationInitiation } from '../../recruitment/enums/termination-initiation.enum';
import { ApprovalStatus } from '../../recruitment/enums/approval-status.enum';

// ============ INTERFACES ============

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
    // Note: Sentiment analysis would be added via ChatGPT API later
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

// ============ SERVICE ============

@Injectable()
export class OffboardingAnalyticsService {
    constructor(
        @InjectModel(TerminationRequest.name) private terminationModel: Model<TerminationRequestDocument>,
        @InjectModel(ClearanceChecklist.name) private clearanceModel: Model<ClearanceChecklistDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    ) { }

    /**
     * Get overview metrics for offboarding
     */
    async getOverviewMetrics(): Promise<OffboardingOverviewMetrics> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const allTerminations = await this.terminationModel.find().lean();
        
        const pendingReview = allTerminations.filter(t => 
            t.status === TerminationStatus.PENDING || 
            t.status === TerminationStatus.UNDER_REVIEW
        ).length;

        const inProgress = allTerminations.filter(t => 
            t.status === TerminationStatus.APPROVED && 
            (!t.terminationDate || new Date(t.terminationDate) >= now)
        ).length;

        const completedThisMonth = allTerminations.filter(t => 
            t.status === TerminationStatus.APPROVED && 
            t.terminationDate && 
            new Date(t.terminationDate) >= monthStart &&
            new Date(t.terminationDate) <= now
        ).length;

        // Calculate voluntary vs involuntary rates
        const voluntary = allTerminations.filter(t => t.initiator === TerminationInitiation.EMPLOYEE).length;
        const involuntary = allTerminations.filter(t => 
            t.initiator === TerminationInitiation.HR || 
            t.initiator === TerminationInitiation.MANAGER
        ).length;
        const total = allTerminations.length || 1;

        // Calculate avg clearance days
        const completedWithDates = allTerminations.filter(t => 
            t.status === TerminationStatus.APPROVED && 
            (t as any).createdAt && 
            t.terminationDate
        );
        let totalDays = 0;
        for (const term of completedWithDates) {
            const days = this.daysBetween(new Date((term as any).createdAt), new Date(term.terminationDate!));
            totalDays += days;
        }
        const avgClearanceDays = completedWithDates.length > 0 ? totalDays / completedWithDates.length : 0;

        return {
            totalTerminations: allTerminations.length,
            pendingReview,
            inProgress,
            completedThisMonth,
            avgClearanceDays: Math.round(avgClearanceDays),
            voluntaryRate: Math.round((voluntary / total) * 100),
            involuntaryRate: Math.round((involuntary / total) * 100),
        };
    }

    /**
     * Get clearance efficiency by department
     */
    async getClearanceEfficiencyMetrics(): Promise<ClearanceEfficiencyMetrics[]> {
        const checklists = await this.clearanceModel.find().lean();
        const terminations = await this.terminationModel.find().lean();
        const now = new Date();

        // Map termination IDs to their creation dates
        const terminationDateMap = new Map<string, Date>();
        for (const term of terminations) {
            terminationDateMap.set(term._id.toString(), (term as any).createdAt);
        }

        const deptMap = new Map<string, {
            processed: number;
            processingDays: number[];
            onTime: number;
            pending: number;
            overdue: number;
        }>();

        for (const checklist of checklists) {
            const termCreatedAt = terminationDateMap.get(checklist.terminationId.toString());

            for (const item of checklist.items || []) {
                const dept = item.department || 'Unknown';
                
                if (!deptMap.has(dept)) {
                    deptMap.set(dept, {
                        processed: 0,
                        processingDays: [],
                        onTime: 0,
                        pending: 0,
                        overdue: 0,
                    });
                }

                const data = deptMap.get(dept)!;

                if (item.status === ApprovalStatus.APPROVED || item.status === ApprovalStatus.REJECTED) {
                    data.processed++;
                    if (termCreatedAt && item.updatedAt) {
                        const days = this.daysBetween(new Date(termCreatedAt), new Date(item.updatedAt));
                        data.processingDays.push(days);
                        if (days <= 7) data.onTime++; // 7 days target
                    } else {
                        data.onTime++; // No date = assume on time
                    }
                } else if (item.status === ApprovalStatus.PENDING) {
                    data.pending++;
                    // Check if overdue (more than 7 days since creation)
                    if (termCreatedAt && this.daysBetween(new Date(termCreatedAt), now) > 7) {
                        data.overdue++;
                    }
                }
            }
        }

        const metrics: ClearanceEfficiencyMetrics[] = [];

        for (const [dept, data] of deptMap) {
            const avgDays = data.processingDays.length > 0
                ? data.processingDays.reduce((a, b) => a + b, 0) / data.processingDays.length
                : 0;
            const onTimeRate = data.processed > 0
                ? (data.onTime / data.processed) * 100
                : 100;

            let grade: 'A' | 'B' | 'C' | 'D' | 'F';
            if (onTimeRate >= 90) grade = 'A';
            else if (onTimeRate >= 75) grade = 'B';
            else if (onTimeRate >= 60) grade = 'C';
            else if (onTimeRate >= 40) grade = 'D';
            else grade = 'F';

            metrics.push({
                department: dept,
                totalProcessed: data.processed,
                avgProcessingDays: Math.round(avgDays * 10) / 10,
                onTimeRate: Math.round(onTimeRate),
                pendingCount: data.pending,
                overdueCount: data.overdue,
                grade,
            });
        }

        return metrics.sort((a, b) => b.onTimeRate - a.onTimeRate);
    }

    /**
     * Get attrition pattern analysis
     */
    async getAttritionPatterns(months: number = 6): Promise<AttritionPatternAnalysis[]> {
        const now = new Date();
        const patterns: AttritionPatternAnalysis[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const terminations = await this.terminationModel.find({
                status: TerminationStatus.APPROVED,
                terminationDate: { $gte: monthStart, $lte: monthEnd }
            }).populate({
                path: 'employeeId',
                populate: { path: 'primaryDepartmentId', select: 'name' },
                select: 'dateOfHire primaryDepartmentId'
            }).lean();

            const voluntary = terminations.filter(t => t.initiator === TerminationInitiation.EMPLOYEE).length;
            const involuntary = terminations.length - voluntary;

            // Group by department
            const deptCounts = new Map<string, number>();
            const tenureCounts = new Map<string, number>();

            for (const term of terminations) {
                const emp = term.employeeId as any;
                const dept = emp?.primaryDepartmentId?.name || 'Unknown';
                deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);

                // Calculate tenure
                if (emp?.dateOfHire && term.terminationDate) {
                    const tenureDays = this.daysBetween(new Date(emp.dateOfHire), new Date(term.terminationDate));
                    const range = this.getTenureRange(tenureDays);
                    tenureCounts.set(range, (tenureCounts.get(range) || 0) + 1);
                }
            }

            patterns.push({
                period,
                totalExits: terminations.length,
                voluntary,
                involuntary,
                voluntaryRate: terminations.length > 0 ? Math.round((voluntary / terminations.length) * 100) : 0,
                byDepartment: Array.from(deptCounts.entries())
                    .map(([department, count]) => ({ department, count }))
                    .sort((a, b) => b.count - a.count),
                byTenure: Array.from(tenureCounts.entries())
                    .map(([range, count]) => ({ range, count })),
            });
        }

        return patterns;
    }

    /**
     * Get exit reason analysis
     * Note: Sentiment analysis would be added via ChatGPT API later
     */
    async getExitReasonAnalysis(): Promise<ExitReasonAnalysis[]> {
        const terminations = await this.terminationModel.find({
            status: TerminationStatus.APPROVED
        }).lean();

        const reasonMap = new Map<string, {
            count: number;
            employee: number;
            hr: number;
            manager: number;
        }>();

        for (const term of terminations) {
            const reason = this.normalizeReason(term.reason || 'Not Specified');
            
            if (!reasonMap.has(reason)) {
                reasonMap.set(reason, { count: 0, employee: 0, hr: 0, manager: 0 });
            }

            const data = reasonMap.get(reason)!;
            data.count++;

            switch (term.initiator) {
                case TerminationInitiation.EMPLOYEE:
                    data.employee++;
                    break;
                case TerminationInitiation.HR:
                    data.hr++;
                    break;
                case TerminationInitiation.MANAGER:
                    data.manager++;
                    break;
            }
        }

        const total = terminations.length || 1;
        const analysis: ExitReasonAnalysis[] = [];

        for (const [reason, data] of reasonMap) {
            analysis.push({
                reason,
                count: data.count,
                percentage: Math.round((data.count / total) * 100),
                byInitiator: {
                    employee: data.employee,
                    hr: data.hr,
                    manager: data.manager,
                },
            });
        }

        return analysis.sort((a, b) => b.count - a.count);
    }

    /**
     * Get tenure at exit metrics
     */
    async getTenureAtExitMetrics(): Promise<TenureAtExitMetrics[]> {
        const terminations = await this.terminationModel.find({
            status: TerminationStatus.APPROVED
        }).populate('employeeId', 'dateOfHire').lean();

        const rangeMap = new Map<string, {
            count: number;
            tenureDays: number[];
            voluntary: number;
        }>();

        for (const term of terminations) {
            const emp = term.employeeId as any;
            if (!emp?.dateOfHire || !term.terminationDate) continue;

            const tenureDays = this.daysBetween(new Date(emp.dateOfHire), new Date(term.terminationDate));
            const range = this.getTenureRange(tenureDays);

            if (!rangeMap.has(range)) {
                rangeMap.set(range, { count: 0, tenureDays: [], voluntary: 0 });
            }

            const data = rangeMap.get(range)!;
            data.count++;
            data.tenureDays.push(tenureDays);
            if (term.initiator === TerminationInitiation.EMPLOYEE) {
                data.voluntary++;
            }
        }

        const total = terminations.filter(t => {
            const emp = t.employeeId as any;
            return emp?.dateOfHire && t.terminationDate;
        }).length || 1;

        const metrics: TenureAtExitMetrics[] = [];
        const rangeOrder = ['0-90 days', '3-6 months', '6-12 months', '1-2 years', '2-5 years', '5+ years'];

        for (const range of rangeOrder) {
            const data = rangeMap.get(range);
            if (!data) continue;

            const avgTenure = data.tenureDays.length > 0
                ? data.tenureDays.reduce((a, b) => a + b, 0) / data.tenureDays.length
                : 0;

            metrics.push({
                range,
                count: data.count,
                percentage: Math.round((data.count / total) * 100),
                avgTenureDays: Math.round(avgTenure),
                voluntaryPercentage: data.count > 0 ? Math.round((data.voluntary / data.count) * 100) : 0,
            });
        }

        return metrics;
    }

    /**
     * Get termination trends over time
     */
    async getTerminationTrends(months: number = 6): Promise<TerminationTrend[]> {
        const now = new Date();
        const trends: TerminationTrend[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const allRequests = await this.terminationModel.find({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            }).lean();

            const approved = allRequests.filter(r => r.status === TerminationStatus.APPROVED);
            const voluntary = approved.filter(r => r.initiator === TerminationInitiation.EMPLOYEE).length;
            const involuntary = approved.length - voluntary;

            // Calculate avg processing days
            let totalDays = 0;
            let count = 0;
            for (const req of approved) {
                if ((req as any).createdAt && req.terminationDate) {
                    const days = this.daysBetween(new Date((req as any).createdAt), new Date(req.terminationDate));
                    totalDays += days;
                    count++;
                }
            }
            const avgDays = count > 0 ? totalDays / count : 0;

            const approvalRate = allRequests.length > 0
                ? Math.round((approved.length / allRequests.length) * 100)
                : 0;

            trends.push({
                period,
                total: approved.length,
                voluntary,
                involuntary,
                approvalRate,
                avgProcessingDays: Math.round(avgDays),
            });
        }

        return trends;
    }

    /**
     * Get equipment return metrics
     */
    async getEquipmentReturnMetrics(): Promise<EquipmentReturnMetrics[]> {
        const checklists = await this.clearanceModel.find().lean();
        const terminations = await this.terminationModel.find().lean();

        // Map termination IDs to creation dates
        const terminationDateMap = new Map<string, { createdAt: Date; terminationDate?: Date }>();
        for (const term of terminations) {
            terminationDateMap.set(term._id.toString(), {
                createdAt: (term as any).createdAt,
                terminationDate: term.terminationDate,
            });
        }

        const equipmentMap = new Map<string, {
            total: number;
            returned: number;
            pending: number;
            returnDays: number[];
        }>();

        for (const checklist of checklists) {
            const termData = terminationDateMap.get(checklist.terminationId.toString());

            for (const eq of checklist.equipmentList || []) {
                const name = eq.name || 'Unknown Equipment';
                
                if (!equipmentMap.has(name)) {
                    equipmentMap.set(name, { total: 0, returned: 0, pending: 0, returnDays: [] });
                }

                const data = equipmentMap.get(name)!;
                data.total++;

                if (eq.returned) {
                    data.returned++;
                    // Estimate return days based on checklist update vs termination creation
                    if (termData?.createdAt) {
                        // Assume 3 days average if we don't have exact timestamps
                        data.returnDays.push(3);
                    }
                } else {
                    data.pending++;
                }
            }
        }

        const metrics: EquipmentReturnMetrics[] = [];

        for (const [name, data] of equipmentMap) {
            const avgDays = data.returnDays.length > 0
                ? data.returnDays.reduce((a, b) => a + b, 0) / data.returnDays.length
                : 0;
            const returnRate = data.total > 0 ? (data.returned / data.total) * 100 : 0;

            metrics.push({
                equipmentType: name,
                totalTracked: data.total,
                returned: data.returned,
                pending: data.pending,
                returnRate: Math.round(returnRate),
                avgReturnDays: Math.round(avgDays * 10) / 10,
            });
        }

        return metrics.sort((a, b) => b.totalTracked - a.totalTracked);
    }

    /**
     * Get department attrition risk analysis
     */
    async getDepartmentAttritionRisk(): Promise<DepartmentAttritionRisk[]> {
        const now = new Date();
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const days180Ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        // Get all employees by department
        const employees = await this.employeeModel.find({ status: 'active' })
            .populate('primaryDepartmentId', 'name')
            .lean();

        const deptEmployeeCounts = new Map<string, number>();
        for (const emp of employees) {
            const dept = (emp as any).primaryDepartmentId?.name || 'Unknown';
            deptEmployeeCounts.set(dept, (deptEmployeeCounts.get(dept) || 0) + 1);
        }

        // Get terminations in last 180 days
        const terminations = await this.terminationModel.find({
            status: TerminationStatus.APPROVED,
            terminationDate: { $gte: days180Ago }
        }).populate({
            path: 'employeeId',
            populate: { path: 'primaryDepartmentId', select: 'name' }
        }).lean();

        const deptAttrition = new Map<string, {
            exits90: number;
            exits180: number;
            reasons: string[];
        }>();

        for (const term of terminations) {
            const emp = term.employeeId as any;
            const dept = emp?.primaryDepartmentId?.name || 'Unknown';
            const termDate = new Date(term.terminationDate!);

            if (!deptAttrition.has(dept)) {
                deptAttrition.set(dept, { exits90: 0, exits180: 0, reasons: [] });
            }

            const data = deptAttrition.get(dept)!;
            data.exits180++;
            if (termDate >= days90Ago) {
                data.exits90++;
            }
            if (term.reason) {
                data.reasons.push(this.normalizeReason(term.reason));
            }
        }

        const riskAnalysis: DepartmentAttritionRisk[] = [];

        for (const [dept, empCount] of deptEmployeeCounts) {
            const attrition = deptAttrition.get(dept) || { exits90: 0, exits180: 0, reasons: [] };
            const totalWithExits = empCount + attrition.exits180; // Include those who left

            const rate90 = totalWithExits > 0 ? (attrition.exits90 / totalWithExits) * 100 : 0;
            const rate180 = totalWithExits > 0 ? (attrition.exits180 / totalWithExits) * 100 : 0;

            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            if (rate180 >= 30) riskLevel = 'CRITICAL';
            else if (rate180 >= 20) riskLevel = 'HIGH';
            else if (rate180 >= 10) riskLevel = 'MEDIUM';
            else riskLevel = 'LOW';

            // Get top 3 reasons
            const reasonCounts = new Map<string, number>();
            for (const reason of attrition.reasons) {
                reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
            }
            const topReasons = Array.from(reasonCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([reason]) => reason);

            riskAnalysis.push({
                department: dept,
                totalEmployees: empCount,
                exitedLast90Days: attrition.exits90,
                exitedLast180Days: attrition.exits180,
                attritionRate90Days: Math.round(rate90),
                attritionRate180Days: Math.round(rate180),
                riskLevel,
                topExitReasons: topReasons,
            });
        }

        return riskAnalysis.sort((a, b) => b.attritionRate180Days - a.attritionRate180Days);
    }

    /**
     * Get comprehensive dashboard summary
     */
    async getDashboardSummary(): Promise<OffboardingDashboardSummary> {
        const [overview, clearanceEfficiency, attritionPatterns, exitReasons, tenureMetrics, trends, equipmentTracking, departmentRisk] =
            await Promise.all([
                this.getOverviewMetrics(),
                this.getClearanceEfficiencyMetrics(),
                this.getAttritionPatterns(6),
                this.getExitReasonAnalysis(),
                this.getTenureAtExitMetrics(),
                this.getTerminationTrends(6),
                this.getEquipmentReturnMetrics(),
                this.getDepartmentAttritionRisk(),
            ]);

        return {
            overview,
            clearanceEfficiency,
            attritionPatterns,
            exitReasons,
            tenureMetrics,
            trends,
            equipmentTracking,
            departmentRisk,
        };
    }

    // ============ HELPER METHODS ============

    private daysBetween(date1: Date, date2: Date): number {
        const diff = Math.abs(date2.getTime() - date1.getTime());
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }

    private getTenureRange(days: number): string {
        if (days <= 90) return '0-90 days';
        if (days <= 180) return '3-6 months';
        if (days <= 365) return '6-12 months';
        if (days <= 730) return '1-2 years';
        if (days <= 1825) return '2-5 years';
        return '5+ years';
    }

    private normalizeReason(reason: string): string {
        const lower = reason.toLowerCase();
        
        // Common reason categories
        if (lower.includes('resign') || lower.includes('personal') || lower.includes('family')) {
            return 'Personal/Resignation';
        }
        if (lower.includes('salary') || lower.includes('compensation') || lower.includes('pay')) {
            return 'Compensation';
        }
        if (lower.includes('career') || lower.includes('growth') || lower.includes('opportunity')) {
            return 'Career Growth';
        }
        if (lower.includes('relocat') || lower.includes('move')) {
            return 'Relocation';
        }
        if (lower.includes('performance') || lower.includes('termination') || lower.includes('fired')) {
            return 'Performance Issues';
        }
        if (lower.includes('health') || lower.includes('medical')) {
            return 'Health/Medical';
        }
        if (lower.includes('retire')) {
            return 'Retirement';
        }
        if (lower.includes('contract') || lower.includes('end')) {
            return 'Contract End';
        }
        if (lower.includes('culture') || lower.includes('environment') || lower.includes('management')) {
            return 'Culture/Management';
        }
        
        return 'Other';
    }
}
