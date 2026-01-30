import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { payrollRuns } from '../../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip } from '../../payroll/payroll-execution/models/payslip.schema';
import { employeePayrollDetails } from '../../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { AttendanceRecord } from '../../time-management/models/attendance-record.schema';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';
import { Department } from '../../organization-structure/models/department.schema';
import { claims } from '../../payroll/payroll-tracking/models/claims.schema';
import { disputes } from '../../payroll/payroll-tracking/models/disputes.schema';
import { PayRollStatus, PayRollPaymentStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';
import { ClaimStatus, DisputeStatus } from '../../payroll/payroll-tracking/enums/payroll-tracking-enum';

// ============ INTERFACES ============

export interface PayrollStory {
    headline: string;
    narrative: string;
    trend: 'RISING' | 'FALLING' | 'STABLE';
    changePercentage: number;
}

export interface PayrollAnomaly {
    type: 'GHOST_EMPLOYEE' | 'GRADE_DEVIATION' | 'UNUSUAL_BONUS' | 'SALARY_SPIKE' | 'NEGATIVE_NET_PAY';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    employeeId: string;
    employeeName?: string;
    description: string;
    detectedAt: Date;
    amount?: number;
}

export interface PayrollCostTrend {
    period: string;
    periodDate: Date;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    employeeCount: number;
    avgNetPerEmployee: number;
    changeFromPrevious: number;
}

export interface DepartmentCostBreakdown {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    avgSalary: number;
    percentageOfTotal: number;
    trend: 'RISING' | 'FALLING' | 'STABLE';
    changePercentage: number;
}

export interface DeductionsBreakdown {
    category: string;
    totalAmount: number;
    percentage: number;
    employeesAffected: number;
    avgPerEmployee: number;
    items: { name: string; amount: number; count: number }[];
}

export interface SalaryDistribution {
    bracket: string;
    minSalary: number;
    maxSalary: number;
    employeeCount: number;
    percentage: number;
    totalPayout: number;
}

export interface ClaimsDisputesMetrics {
    period: string;
    claimsSubmitted: number;
    claimsApproved: number;
    claimsRejected: number;
    claimsPending: number;
    totalClaimsAmount: number;
    avgClaimAmount: number;
    disputesSubmitted: number;
    disputesResolved: number;
    disputesPending: number;
    avgResolutionDays: number;
}

export interface PayrollComplianceMetrics {
    runId: string;
    period: string;
    totalEmployees: number;
    employeesWithExceptions: number;
    missingBankAccounts: number;
    negativeNetPay: number;
    salaryBelowMinimum: number;
    complianceScore: number;
    status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

export interface BudgetVarianceAnalysis {
    departmentId: string;
    departmentName: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercentage: number;
    status: 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET';
}

export interface PayrollForecast {
    period: string;
    predictedTotal: number;
    predictedGross: number;
    predictedDeductions: number;
    confidence: number;
    factors: string[];
}

export interface ExecutionMetrics {
    period: string;
    runsInitiated: number;
    runsApproved: number;
    runsRejected: number;
    avgProcessingDays: number;
    exceptionsRaised: number;
    exceptionsResolved: number;
    freezeCount: number;
    unfreezeCount: number;
}

export interface PayrollDashboardSummary {
    overview: {
        currentPeriod: string;
        totalPayrollCost: number;
        totalEmployees: number;
        avgSalary: number;
        totalDeductions: number;
        pendingApprovals: number;
        exceptionsCount: number;
        paymentsPending: number;
        paymentsPaid: number;
    };
    trends: PayrollCostTrend[];
    departmentBreakdown: DepartmentCostBreakdown[];
    deductions: DeductionsBreakdown[];
    salaryDistribution: SalaryDistribution[];
    claimsDisputes: ClaimsDisputesMetrics;
    compliance: PayrollComplianceMetrics;
    forecast: PayrollForecast;
    anomalies: PayrollAnomaly[];
    executionMetrics: ExecutionMetrics[];
}

@Injectable()
export class PayrollAnalyticsService {
    private readonly logger = new Logger(PayrollAnalyticsService.name);

    constructor(
        @InjectModel(payrollRuns.name) private runModel: Model<payrollRuns>,
        @InjectModel(paySlip.name) private payslipModel: Model<paySlip>,
        @InjectModel(employeePayrollDetails.name) private payrollDetailsModel: Model<employeePayrollDetails>,
        @InjectModel(AttendanceRecord.name) private attendanceModel: Model<AttendanceRecord>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
        @InjectModel(Department.name) private departmentModel: Model<Department>,
        @InjectModel(claims.name) private claimsModel: Model<claims>,
        @InjectModel(disputes.name) private disputesModel: Model<disputes>,
    ) { }

    /**
     * Engine 1: Storytelling
     * Generates a natural language summary of the latest payroll run compared to the previous one.
     */
    async getPayrollStory(entityId?: string): Promise<PayrollStory> {
        const runs = await this.runModel.find(entityId ? { entityId, status: PayRollStatus.APPROVED } : { status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .limit(2)
            .exec();

        if (runs.length < 2) return { headline: 'Insufficient Data', narrative: 'Not enough payroll history to generate a story.', trend: 'STABLE', changePercentage: 0 };

        const [current, previous] = runs;
        const diff = current.totalnetpay - previous.totalnetpay;
        const pct = (diff / (previous.totalnetpay || 1)) * 100;

        let headline = 'Payroll Stable';
        let narrative = `The payroll for ${current.payrollPeriod.toLocaleString('default', { month: 'long' })} closed at $${current.totalnetpay.toLocaleString()}. `;

        if (pct > 5) {
            headline = 'Significant Cost Increase';
            narrative += `Net pay jumped by ${pct.toFixed(1)}% compared to last month. This is driven by ${current.employees - previous.employees} new hires and ${current.exceptions} detected exceptions.`;
        } else if (pct < -5) {
            headline = 'Cost Reduction Observed';
            narrative += `Payroll costs dropped by ${Math.abs(pct).toFixed(1)}%, likely due to offboarding or reduced overtime payouts.`;
        } else {
            narrative += `Costs remained stable with a minor ${pct.toFixed(1)}% variance. Operational efficiency is steady.`;
        }

        return {
            headline,
            narrative,
            trend: pct > 1 ? 'RISING' : (pct < -1 ? 'FALLING' : 'STABLE'),
            changePercentage: parseFloat(pct.toFixed(1))
        };
    }

    /**
     * Engine 2: Anomaly Detection (Ghost Employees)
     * Detects employees who are getting paid but have ZERO attendance logs in the period.
     */
    async detectGhostEmployees(runId: string): Promise<PayrollAnomaly[]> {
        const run = await this.runModel.findOne({ runId }).exec(); // find by runId string or _id
        if (!run) return [];

        const startOfMonth = new Date(run.payrollPeriod.getFullYear(), run.payrollPeriod.getMonth(), 1);
        const endOfMonth = run.payrollPeriod;

        const payslips = await this.payslipModel.find({ payrollRunId: run._id }).populate('employeeId').exec();
        const anomalies: PayrollAnomaly[] = [];

        for (const slip of payslips) {
            const attendanceCount = await this.attendanceModel.countDocuments({
                employeeId: slip.employeeId,
                'punches.time': { $gte: startOfMonth, $lte: endOfMonth }
            });

            // Ghost Protocol: Paid > 0 but Attendance == 0
            if (attendanceCount === 0 && slip.netPay > 0) {
                // @ts-ignore
                const empName = slip.employeeId?.fullName || 'Unknown';
                anomalies.push({
                    type: 'GHOST_EMPLOYEE',
                    severity: 'HIGH',
                    // @ts-ignore
                    employeeId: slip.employeeId?._id?.toString(),
                    description: `Employee ${empName} received ${slip.netPay} but has 0 attendance logs this month.`,
                    detectedAt: new Date()
                });
            }
        }
        return anomalies;
    }

    /**
     * Engine 3: Predictive Modeling (Linear Forecasting)
     * Predicts next month's payroll cost based on 6-month history.
     */
    async getForecast(): Promise<{ nextMonthPrediction: number, confidence: number }> {
        const history = await this.runModel.find({ status: PayRollStatus.APPROVED }).sort({ payrollPeriod: 1 }).limit(6).exec();
        if (history.length < 3) return { nextMonthPrediction: 0, confidence: 0 };

        const x = history.map((_, i) => i);
        const y = history.map(h => h.totalnetpay);

        const n = y.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const nextX = n;
        const prediction = slope * nextX + intercept;

        return {
            nextMonthPrediction: parseFloat(prediction.toFixed(2)),
            confidence: 0.85 // Heuristic confidence
        };
    }

    // ============ COMPREHENSIVE ANALYTICS METHODS ============

    /**
     * Get payroll cost trends over time (last 12 months)
     */
    async getPayrollTrends(months: number = 12): Promise<PayrollCostTrend[]> {
        const runs = await this.runModel.find({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .limit(months)
            .lean();

        if (runs.length === 0) return [];

        const trends: PayrollCostTrend[] = [];
        
        for (let i = 0; i < runs.length; i++) {
            const run = runs[i];
            const payslips = await this.payslipModel.find({ payrollRunId: run._id }).lean();
            
            const totalGross = payslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0);
            const totalDeductions = payslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
            const totalNet = run.totalnetpay;
            
            const previousRun = runs[i + 1];
            const changeFromPrevious = previousRun 
                ? ((totalNet - previousRun.totalnetpay) / (previousRun.totalnetpay || 1)) * 100 
                : 0;

            trends.push({
                period: run.payrollPeriod.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                periodDate: run.payrollPeriod,
                totalGross,
                totalDeductions,
                totalNet,
                employeeCount: run.employees,
                avgNetPerEmployee: run.employees > 0 ? totalNet / run.employees : 0,
                changeFromPrevious: parseFloat(changeFromPrevious.toFixed(2)),
            });
        }

        return trends.reverse(); // Oldest first for charts
    }

    /**
     * Get cost breakdown by department
     */
    async getDepartmentCostBreakdown(): Promise<DepartmentCostBreakdown[]> {
        const latestRun = await this.runModel.findOne({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .lean();
        
        if (!latestRun) return [];

        const previousRun = await this.runModel.findOne({ 
            status: PayRollStatus.APPROVED,
            payrollPeriod: { $lt: latestRun.payrollPeriod }
        }).sort({ payrollPeriod: -1 }).lean();

        // Get payslips with employee details
        const payslips = await this.payslipModel.find({ payrollRunId: latestRun._id })
            .populate({
                path: 'employeeId',
                populate: { path: 'primaryDepartmentId', select: 'name' }
            })
            .lean();

        const previousPayslips = previousRun 
            ? await this.payslipModel.find({ payrollRunId: previousRun._id })
                .populate({
                    path: 'employeeId',
                    populate: { path: 'primaryDepartmentId', select: 'name' }
                })
                .lean()
            : [];

        const deptMap = new Map<string, {
            departmentId: string;
            departmentName: string;
            employees: number;
            totalGross: number;
            totalDeductions: number;
            totalNet: number;
        }>();

        const prevDeptTotals = new Map<string, number>();
        
        // Calculate previous period totals
        for (const slip of previousPayslips) {
            const emp = slip.employeeId as any;
            const deptName = emp?.primaryDepartmentId?.name || 'Unknown';
            prevDeptTotals.set(deptName, (prevDeptTotals.get(deptName) || 0) + slip.netPay);
        }

        // Calculate current period
        const totalPayroll = payslips.reduce((sum, p) => sum + p.netPay, 0);

        for (const slip of payslips) {
            const emp = slip.employeeId as any;
            const deptId = emp?.primaryDepartmentId?._id?.toString() || 'unknown';
            const deptName = emp?.primaryDepartmentId?.name || 'Unknown';

            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, {
                    departmentId: deptId,
                    departmentName: deptName,
                    employees: 0,
                    totalGross: 0,
                    totalDeductions: 0,
                    totalNet: 0,
                });
            }

            const data = deptMap.get(deptName)!;
            data.employees++;
            data.totalGross += slip.totalGrossSalary || 0;
            data.totalDeductions += slip.totaDeductions || 0;
            data.totalNet += slip.netPay;
        }

        const breakdown: DepartmentCostBreakdown[] = [];

        for (const [name, data] of deptMap) {
            const prevTotal = prevDeptTotals.get(name) || 0;
            const changePct = prevTotal > 0 ? ((data.totalNet - prevTotal) / prevTotal) * 100 : 0;

            breakdown.push({
                departmentId: data.departmentId,
                departmentName: data.departmentName,
                employeeCount: data.employees,
                totalGross: data.totalGross,
                totalDeductions: data.totalDeductions,
                totalNet: data.totalNet,
                avgSalary: data.employees > 0 ? data.totalNet / data.employees : 0,
                percentageOfTotal: totalPayroll > 0 ? (data.totalNet / totalPayroll) * 100 : 0,
                trend: changePct > 2 ? 'RISING' : (changePct < -2 ? 'FALLING' : 'STABLE'),
                changePercentage: parseFloat(changePct.toFixed(2)),
            });
        }

        return breakdown.sort((a, b) => b.totalNet - a.totalNet);
    }

    /**
     * Get deductions breakdown by category
     */
    async getDeductionsBreakdown(): Promise<DeductionsBreakdown[]> {
        const latestRun = await this.runModel.findOne({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .lean();
        
        if (!latestRun) return [];

        const payslips = await this.payslipModel.find({ payrollRunId: latestRun._id }).lean();
        
        const categories = new Map<string, {
            totalAmount: number;
            employeesAffected: Set<string>;
            items: Map<string, { amount: number; count: number }>;
        }>();

        let grandTotal = 0;

        for (const slip of payslips) {
            const deductions = slip.deductionsDetails;
            if (!deductions) continue;

            // Process taxes
            if (deductions.taxes?.length > 0) {
                if (!categories.has('Taxes')) {
                    categories.set('Taxes', { totalAmount: 0, employeesAffected: new Set(), items: new Map() });
                }
                const taxCat = categories.get('Taxes')!;
                
                for (const tax of deductions.taxes) {
                    taxCat.totalAmount += tax.amount;
                    grandTotal += tax.amount;
                    taxCat.employeesAffected.add(slip.employeeId.toString());
                    
                    const itemData = taxCat.items.get(tax.name) || { amount: 0, count: 0 };
                    itemData.amount += tax.amount;
                    itemData.count++;
                    taxCat.items.set(tax.name, itemData);
                }
            }

            // Process insurances
            if (deductions.insurances?.length) {
                if (!categories.has('Insurance')) {
                    categories.set('Insurance', { totalAmount: 0, employeesAffected: new Set(), items: new Map() });
                }
                const insCat = categories.get('Insurance')!;
                
                for (const ins of deductions.insurances) {
                    insCat.totalAmount += ins.amount;
                    grandTotal += ins.amount;
                    insCat.employeesAffected.add(slip.employeeId.toString());
                    
                    const itemData = insCat.items.get(ins.name) || { amount: 0, count: 0 };
                    itemData.amount += ins.amount;
                    itemData.count++;
                    insCat.items.set(ins.name, itemData);
                }
            }

            // Process penalties
            if (deductions.penalties) {
                if (!categories.has('Penalties')) {
                    categories.set('Penalties', { totalAmount: 0, employeesAffected: new Set(), items: new Map() });
                }
                const penCat = categories.get('Penalties')!;
                penCat.totalAmount += deductions.penalties.amount;
                grandTotal += deductions.penalties.amount;
                penCat.employeesAffected.add(slip.employeeId.toString());
                
                const itemData = penCat.items.get(deductions.penalties.name) || { amount: 0, count: 0 };
                itemData.amount += deductions.penalties.amount;
                itemData.count++;
                penCat.items.set(deductions.penalties.name, itemData);
            }
        }

        const breakdown: DeductionsBreakdown[] = [];

        for (const [category, data] of categories) {
            breakdown.push({
                category,
                totalAmount: data.totalAmount,
                percentage: grandTotal > 0 ? (data.totalAmount / grandTotal) * 100 : 0,
                employeesAffected: data.employeesAffected.size,
                avgPerEmployee: data.employeesAffected.size > 0 ? data.totalAmount / data.employeesAffected.size : 0,
                items: Array.from(data.items.entries()).map(([name, d]) => ({
                    name,
                    amount: d.amount,
                    count: d.count,
                })),
            });
        }

        return breakdown.sort((a, b) => b.totalAmount - a.totalAmount);
    }

    /**
     * Get salary distribution by brackets
     */
    async getSalaryDistribution(): Promise<SalaryDistribution[]> {
        const latestRun = await this.runModel.findOne({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .lean();
        
        if (!latestRun) return [];

        const payslips = await this.payslipModel.find({ payrollRunId: latestRun._id }).lean();
        
        const brackets = [
            { bracket: '0 - 5,000', min: 0, max: 5000 },
            { bracket: '5,001 - 10,000', min: 5001, max: 10000 },
            { bracket: '10,001 - 20,000', min: 10001, max: 20000 },
            { bracket: '20,001 - 35,000', min: 20001, max: 35000 },
            { bracket: '35,001 - 50,000', min: 35001, max: 50000 },
            { bracket: '50,001+', min: 50001, max: Infinity },
        ];

        const totalEmployees = payslips.length;
        const distribution: SalaryDistribution[] = [];

        for (const b of brackets) {
            const inBracket = payslips.filter(p => p.netPay >= b.min && p.netPay <= b.max);
            const totalPayout = inBracket.reduce((sum, p) => sum + p.netPay, 0);

            distribution.push({
                bracket: b.bracket,
                minSalary: b.min,
                maxSalary: b.max,
                employeeCount: inBracket.length,
                percentage: totalEmployees > 0 ? (inBracket.length / totalEmployees) * 100 : 0,
                totalPayout,
            });
        }

        return distribution;
    }

    /**
     * Get claims and disputes analytics
     */
    async getClaimsDisputesMetrics(months: number = 6): Promise<ClaimsDisputesMetrics[]> {
        const now = new Date();
        const metrics: ClaimsDisputesMetrics[] = [];

        for (let i = 0; i < months; i++) {
            const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const claims = await this.claimsModel.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).lean();

            const disputes = await this.disputesModel.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).lean();

            const claimsApproved = claims.filter(c => c.status === ClaimStatus.APPROVED).length;
            const claimsRejected = claims.filter(c => c.status === ClaimStatus.REJECTED).length;
            const claimsPending = claims.filter(c => 
                c.status === ClaimStatus.UNDER_REVIEW || c.status === ClaimStatus.PENDING_MANAGER_APPROVAL
            ).length;

            const disputesResolved = disputes.filter(d => 
                d.status === DisputeStatus.APPROVED || d.status === DisputeStatus.REJECTED
            ).length;
            const disputesPending = disputes.filter(d => 
                d.status === DisputeStatus.UNDER_REVIEW || d.status === DisputeStatus.PENDING_MANAGER_APPROVAL
            ).length;

            const totalClaimsAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);

            // Calculate avg resolution time for resolved disputes
            let totalResolutionDays = 0;
            let resolvedCount = 0;
            for (const d of disputes) {
                if (d.status === DisputeStatus.APPROVED || d.status === DisputeStatus.REJECTED) {
                    const created = new Date((d as any).createdAt);
                    const updated = new Date((d as any).updatedAt || created);
                    totalResolutionDays += (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                    resolvedCount++;
                }
            }

            metrics.push({
                period,
                claimsSubmitted: claims.length,
                claimsApproved,
                claimsRejected,
                claimsPending,
                totalClaimsAmount,
                avgClaimAmount: claims.length > 0 ? totalClaimsAmount / claims.length : 0,
                disputesSubmitted: disputes.length,
                disputesResolved,
                disputesPending,
                avgResolutionDays: resolvedCount > 0 ? totalResolutionDays / resolvedCount : 0,
            });
        }

        return metrics.reverse();
    }

    /**
     * Get payroll compliance metrics for latest run
     */
    async getComplianceMetrics(): Promise<PayrollComplianceMetrics | null> {
        const latestRun = await this.runModel.findOne({ status: { $ne: PayRollStatus.DRAFT } })
            .sort({ payrollPeriod: -1 })
            .lean();
        
        if (!latestRun) return null;

        const payrollDetails = await this.payrollDetailsModel.find({ 
            payrollRunId: latestRun._id 
        }).lean();

        const totalEmployees = payrollDetails.length;
        const employeesWithExceptions = payrollDetails.filter(p => p.exceptions).length;
        const missingBankAccounts = payrollDetails.filter(p => p.bankStatus === 'missing').length;
        const negativeNetPay = payrollDetails.filter(p => p.netPay < 0).length;
        
        // Egyptian minimum wage reference (can be made configurable)
        const minimumWage = 6000;
        const salaryBelowMinimum = payrollDetails.filter(p => p.baseSalary < minimumWage).length;

        // Calculate compliance score (weighted)
        let score = 100;
        if (totalEmployees > 0) {
            score -= (employeesWithExceptions / totalEmployees) * 30;
            score -= (missingBankAccounts / totalEmployees) * 25;
            score -= (negativeNetPay / totalEmployees) * 25;
            score -= (salaryBelowMinimum / totalEmployees) * 20;
        }
        score = Math.max(0, Math.min(100, score));

        return {
            runId: (latestRun as any).runId,
            period: latestRun.payrollPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            totalEmployees,
            employeesWithExceptions,
            missingBankAccounts,
            negativeNetPay,
            salaryBelowMinimum,
            complianceScore: parseFloat(score.toFixed(1)),
            status: score >= 90 ? 'COMPLIANT' : (score >= 70 ? 'AT_RISK' : 'NON_COMPLIANT'),
        };
    }

    /**
     * Get advanced multi-period forecast
     */
    async getAdvancedForecast(): Promise<PayrollForecast> {
        const history = await this.runModel.find({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .limit(12)
            .lean();

        if (history.length < 3) {
            return {
                period: 'Next Month',
                predictedTotal: 0,
                predictedGross: 0,
                predictedDeductions: 0,
                confidence: 0,
                factors: ['Insufficient historical data'],
            };
        }

        // Linear regression on net pay
        const x = history.map((_, i) => i).reverse();
        const y = history.map(h => h.totalnetpay).reverse();

        const n = y.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const predictedTotal = slope * n + intercept;

        // Estimate gross and deductions based on recent ratios
        const recentPayslips = await this.payslipModel.find({ payrollRunId: history[0]._id }).lean();
        const recentGross = recentPayslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0);
        const recentDeductions = recentPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);
        const recentNet = history[0].totalnetpay;

        const grossRatio = recentNet > 0 ? recentGross / recentNet : 1.2;
        const deductionsRatio = recentNet > 0 ? recentDeductions / recentNet : 0.2;

        // Identify factors affecting forecast
        const factors: string[] = [];
        if (slope > 0) factors.push('Upward cost trend detected');
        if (slope < 0) factors.push('Downward cost trend detected');
        
        const employeeChange = history[0].employees - history[history.length - 1].employees;
        if (employeeChange > 0) factors.push(`${employeeChange} employee growth over period`);
        if (employeeChange < 0) factors.push(`${Math.abs(employeeChange)} employee reduction over period`);

        // Calculate R-squared for confidence
        const yMean = sumY / n;
        const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
        const ssResidual = y.reduce((sum, yi, i) => {
            const predicted = slope * x[i] + intercept;
            return sum + Math.pow(yi - predicted, 2);
        }, 0);
        const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

        const nextMonth = new Date(history[0].payrollPeriod);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        return {
            period: nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            predictedTotal: Math.max(0, parseFloat(predictedTotal.toFixed(2))),
            predictedGross: Math.max(0, parseFloat((predictedTotal * grossRatio).toFixed(2))),
            predictedDeductions: Math.max(0, parseFloat((predictedTotal * deductionsRatio).toFixed(2))),
            confidence: parseFloat((rSquared * 100).toFixed(1)),
            factors,
        };
    }

    /**
     * Get execution metrics (run processing stats)
     */
    async getExecutionMetrics(months: number = 6): Promise<ExecutionMetrics[]> {
        const now = new Date();
        const metrics: ExecutionMetrics[] = [];

        for (let i = 0; i < months; i++) {
            const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const runs = await this.runModel.find({
                createdAt: { $gte: startDate, $lte: endDate }
            }).lean();

            const runsApproved = runs.filter(r => r.status === PayRollStatus.APPROVED).length;
            const runsRejected = runs.filter(r => r.status === PayRollStatus.REJECTED).length;
            const totalExceptions = runs.reduce((sum, r) => sum + (r.exceptions || 0), 0);
            const freezeCount = runs.filter(r => r.status === PayRollStatus.LOCKED).length;
            const unfreezeCount = runs.filter(r => r.unlockReason).length;

            // Calculate avg processing time (from creation to approval)
            let totalProcessingDays = 0;
            let processedCount = 0;
            for (const run of runs) {
                if (run.status === PayRollStatus.APPROVED && run.financeApprovalDate) {
                    const created = new Date((run as any).createdAt);
                    const approved = new Date(run.financeApprovalDate);
                    totalProcessingDays += (approved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                    processedCount++;
                }
            }

            metrics.push({
                period,
                runsInitiated: runs.length,
                runsApproved,
                runsRejected,
                avgProcessingDays: processedCount > 0 ? totalProcessingDays / processedCount : 0,
                exceptionsRaised: totalExceptions,
                exceptionsResolved: totalExceptions, // Assume resolved if run approved
                freezeCount,
                unfreezeCount,
            });
        }

        return metrics.reverse();
    }

    /**
     * Detect all types of payroll anomalies
     */
    async detectAllAnomalies(): Promise<PayrollAnomaly[]> {
        const latestRun = await this.runModel.findOne({ status: { $ne: PayRollStatus.DRAFT } })
            .sort({ payrollPeriod: -1 })
            .lean();
        
        if (!latestRun) return [];

        const anomalies: PayrollAnomaly[] = [];
        
        // Get ghost employees
        const ghosts = await this.detectGhostEmployees((latestRun as any).runId);
        anomalies.push(...ghosts);

        // Detect salary spikes (>20% increase from previous period)
        const previousRun = await this.runModel.findOne({
            status: PayRollStatus.APPROVED,
            payrollPeriod: { $lt: latestRun.payrollPeriod }
        }).sort({ payrollPeriod: -1 }).lean();

        if (previousRun) {
            const currentPayslips = await this.payslipModel.find({ payrollRunId: latestRun._id })
                .populate('employeeId', 'firstName lastName')
                .lean();
            const previousPayslips = await this.payslipModel.find({ payrollRunId: previousRun._id }).lean();

            const prevPayMap = new Map(previousPayslips.map(p => [p.employeeId.toString(), p.netPay]));

            for (const slip of currentPayslips) {
                const empId = slip.employeeId._id?.toString() || slip.employeeId.toString();
                const prevPay = prevPayMap.get(empId);
                
                if (prevPay && prevPay > 0) {
                    const change = ((slip.netPay - prevPay) / prevPay) * 100;
                    if (change > 20) {
                        const emp = slip.employeeId as any;
                        anomalies.push({
                            type: 'SALARY_SPIKE',
                            severity: change > 50 ? 'HIGH' : 'MEDIUM',
                            employeeId: empId,
                            employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                            description: `Salary increased by ${change.toFixed(1)}% (${prevPay.toFixed(0)} → ${slip.netPay.toFixed(0)})`,
                            detectedAt: new Date(),
                            amount: slip.netPay - prevPay,
                        });
                    }
                }

                // Detect negative net pay
                if (slip.netPay < 0) {
                    const emp = slip.employeeId as any;
                    anomalies.push({
                        type: 'NEGATIVE_NET_PAY',
                        severity: 'HIGH',
                        employeeId: empId,
                        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                        description: `Negative net pay detected: ${slip.netPay.toFixed(2)}`,
                        detectedAt: new Date(),
                        amount: slip.netPay,
                    });
                }
            }
        }

        return anomalies;
    }

    /**
     * Get comprehensive dashboard summary
     */
    async getDashboardSummary(): Promise<PayrollDashboardSummary> {
        const latestRun = await this.runModel.findOne({ status: PayRollStatus.APPROVED })
            .sort({ payrollPeriod: -1 })
            .lean();

        const pendingRuns = await this.runModel.countDocuments({ 
            status: PayRollStatus.UNDER_REVIEW 
        });

        const currentPayslips = latestRun 
            ? await this.payslipModel.find({ payrollRunId: latestRun._id }).lean()
            : [];

        const totalGross = currentPayslips.reduce((sum, p) => sum + (p.totalGrossSalary || 0), 0);
        const totalDeductions = currentPayslips.reduce((sum, p) => sum + (p.totaDeductions || 0), 0);

        const [
            trends,
            departmentBreakdown,
            deductions,
            salaryDistribution,
            claimsMetrics,
            compliance,
            forecast,
            anomalies,
            executionMetrics,
        ] = await Promise.all([
            this.getPayrollTrends(12),
            this.getDepartmentCostBreakdown(),
            this.getDeductionsBreakdown(),
            this.getSalaryDistribution(),
            this.getClaimsDisputesMetrics(1),
            this.getComplianceMetrics(),
            this.getAdvancedForecast(),
            this.detectAllAnomalies(),
            this.getExecutionMetrics(6),
        ]);

        return {
            overview: {
                currentPeriod: latestRun?.payrollPeriod?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'N/A',
                totalPayrollCost: latestRun?.totalnetpay || 0,
                totalEmployees: latestRun?.employees || 0,
                avgSalary: latestRun?.employees ? (latestRun.totalnetpay / latestRun.employees) : 0,
                totalDeductions,
                pendingApprovals: pendingRuns,
                exceptionsCount: latestRun?.exceptions || 0,
                paymentsPending: currentPayslips.filter(p => p.paymentStatus === 'pending').length,
                paymentsPaid: currentPayslips.filter(p => p.paymentStatus === 'paid').length,
            },
            trends,
            departmentBreakdown,
            deductions,
            salaryDistribution,
            claimsDisputes: claimsMetrics[0] || {
                period: 'N/A',
                claimsSubmitted: 0,
                claimsApproved: 0,
                claimsRejected: 0,
                claimsPending: 0,
                totalClaimsAmount: 0,
                avgClaimAmount: 0,
                disputesSubmitted: 0,
                disputesResolved: 0,
                disputesPending: 0,
                avgResolutionDays: 0,
            },
            compliance: compliance || {
                runId: 'N/A',
                period: 'N/A',
                totalEmployees: 0,
                employeesWithExceptions: 0,
                missingBankAccounts: 0,
                negativeNetPay: 0,
                salaryBelowMinimum: 0,
                complianceScore: 0,
                status: 'NON_COMPLIANT' as const,
            },
            forecast,
            anomalies,
            executionMetrics,
        };
    }
}
