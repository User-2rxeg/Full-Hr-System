import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from '../../time-management/models/attendance-record.schema';
import { LatenessRule, LatenessRuleDocument } from '../../time-management/models/lateness-rule.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from '../../time-management/models/shift-assignment.schema';
import { Shift, ShiftDocument } from '../../time-management/models/shift.schema';
import { OvertimeRule, OvertimeRuleDocument } from '../../time-management/models/overtime-rule.schema';

/**
 * SharedPayrollService - Centralized payroll calculations that integrate with
 * Time Management and Leaves modules.
 * 
 * This service provides:
 * - Attendance-based deductions (lateness, missing work, short time)
 * - Leave-based calculations (unpaid leave deductions)
 * - Overtime calculations
 * - Integration with Time Management and Leaves modules
 */
@Injectable()
export class SharedPayrollService {
    private readonly logger = new Logger(SharedPayrollService.name);

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecordDocument>,
        @InjectModel(LatenessRule.name) private readonly latenessRuleModel: Model<LatenessRuleDocument>,
        @InjectModel(ShiftAssignment.name) private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
        @InjectModel(OvertimeRule.name) private readonly overtimeRuleModel: Model<OvertimeRuleDocument>,
    ) {}

    /**
     * Get attendance data for an employee for payroll period
     * Integrates with Time Management module
     */
    async getAttendanceDataForPayroll(
        employeeId: string | Types.ObjectId,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{
        actualWorkMinutes: number;
        scheduledWorkMinutes: number;
        missingWorkMinutes: number;
        overtimeMinutes: number;
        latenessMinutes: number;
        workingDays: number;
        latenessDays: number;
        absentDays: number;
        records: any[];
    }> {
        const empId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        
        // Get all attendance records for the period
        const records = await this.attendanceModel.find({
            employeeId: empId,
            $or: [
                { 'punches.time': { $gte: periodStart, $lte: periodEnd } },
                { createdAt: { $gte: periodStart, $lte: periodEnd } }
            ]
        }).lean().exec();

        let actualWorkMinutes = 0;
        let scheduledWorkMinutes = 0;
        let overtimeMinutes = 0;
        let latenessMinutes = 0;
        let latenessDays = 0;
        let absentDays = 0;

        for (const rec of records) {
            const record = rec as any; // Cast to any to access dynamic fields
            actualWorkMinutes += record.totalWorkMinutes || 0;
            scheduledWorkMinutes += await this.getScheduledMinutesForRecord(record);
            overtimeMinutes += record.approvedOvertimeMinutes || record.overtimeMinutes || 0;
            
            if (record.latenessMinutes && record.latenessMinutes > 0) {
                latenessMinutes += record.latenessMinutes;
                latenessDays++;
            }
            
            if (record.hasMissedPunch || (record.totalWorkMinutes === 0 && !record.isOnLeave && !record.isHoliday)) {
                absentDays++;
            }
        }

        const missingWorkMinutes = Math.max(0, scheduledWorkMinutes - actualWorkMinutes);

        return {
            actualWorkMinutes,
            scheduledWorkMinutes,
            missingWorkMinutes,
            overtimeMinutes,
            latenessMinutes,
            workingDays: records.length,
            latenessDays,
            absentDays,
            records,
        };
    }

    /**
     * Calculate penalties based on Time Management rules
     * Returns detailed breakdown of each penalty type
     */
    async calculateTimeBasedPenalties(
        employeeId: string | Types.ObjectId,
        baseSalary: number,
        attendanceData: {
            missingWorkMinutes: number;
            latenessMinutes: number;
            scheduledWorkMinutes: number;
        },
        daysInMonth: number,
    ): Promise<{
        missingWorkPenalty: number;
        missingWorkReason: string;
        latenessPenalty: number;
        latenessReason: string;
        totalPenalty: number;
    }> {
        const hourlyRate = baseSalary / (daysInMonth * 8); // Assuming 8-hour workday
        const minuteRate = hourlyRate / 60;

        // 1. Missing Work Penalty - from Short Time Rules
        let missingWorkPenalty = 0;
        let missingWorkReason = '';
        
        if (attendanceData.missingWorkMinutes > 0) {
            // Check for short time rules
            const shortTimeRule = await this.connection.collection('shorttimerules').findOne({
                status: 'approved',
            });
            
            if (shortTimeRule) {
                const deductionRate = shortTimeRule.deductionRate || 100; // Default 100% deduction
                missingWorkPenalty = (attendanceData.missingWorkMinutes * minuteRate) * (deductionRate / 100);
                missingWorkReason = `Missing ${Math.round(attendanceData.missingWorkMinutes)} minutes @ ${deductionRate}% rate (Short Time Rule)`;
            } else {
                // Default: Full deduction for missing work
                missingWorkPenalty = attendanceData.missingWorkMinutes * minuteRate;
                missingWorkReason = `Missing ${Math.round(attendanceData.missingWorkMinutes)} minutes @ full rate`;
            }
        }

        // 2. Lateness Penalty - from Lateness Rules
        let latenessPenalty = 0;
        let latenessReason = '';
        
        if (attendanceData.latenessMinutes > 0) {
            const latenessRuleDoc = await this.latenessRuleModel.findOne({}).lean().exec();
            const latenessRule = latenessRuleDoc as any; // Cast to any for dynamic fields
            
            if (latenessRule) {
                const graceMinutes = latenessRule.graceMinutes || 0;
                const penaltyPerMinute = latenessRule.penaltyPerMinute || 0;
                const maxPenalty = latenessRule.maxPenalty || Number.MAX_SAFE_INTEGER;
                
                const chargeableLateness = Math.max(0, attendanceData.latenessMinutes - graceMinutes);
                if (chargeableLateness > 0) {
                    latenessPenalty = Math.min(chargeableLateness * penaltyPerMinute, maxPenalty);
                    latenessReason = `${chargeableLateness} late minutes (after ${graceMinutes}min grace) @ ${penaltyPerMinute}/min`;
                }
            } else {
                // Default: Deduct at minute rate
                latenessPenalty = attendanceData.latenessMinutes * minuteRate;
                latenessReason = `${Math.round(attendanceData.latenessMinutes)} late minutes @ minute rate`;
            }
        }

        return {
            missingWorkPenalty: Math.round(missingWorkPenalty * 100) / 100,
            missingWorkReason,
            latenessPenalty: Math.round(latenessPenalty * 100) / 100,
            latenessReason,
            totalPenalty: Math.round((missingWorkPenalty + latenessPenalty) * 100) / 100,
        };
    }

    /**
     * Calculate overtime pay based on Time Management rules
     */
    async calculateOvertimePay(
        employeeId: string | Types.ObjectId,
        baseSalary: number,
        overtimeMinutes: number,
        daysInMonth: number,
    ): Promise<{
        overtimePay: number;
        overtimeReason: string;
        overtimeHours: number;
        overtimeRate: number;
    }> {
        if (overtimeMinutes <= 0) {
            return {
                overtimePay: 0,
                overtimeReason: 'No overtime',
                overtimeHours: 0,
                overtimeRate: 0,
            };
        }

        const hourlyRate = baseSalary / (daysInMonth * 8);
        const overtimeHours = overtimeMinutes / 60;
        
        // Get overtime rule
        const overtimeRuleDoc = await this.overtimeRuleModel.findOne({
            status: 'approved',
        }).lean().exec();
        const overtimeRule = overtimeRuleDoc as any; // Cast to any for dynamic fields
        
        let overtimeRate = 1.5; // Default 150% rate
        if (overtimeRule && overtimeRule.multiplier) {
            overtimeRate = overtimeRule.multiplier;
        }
        
        const overtimePay = overtimeHours * hourlyRate * overtimeRate;
        
        return {
            overtimePay: Math.round(overtimePay * 100) / 100,
            overtimeReason: `${overtimeHours.toFixed(2)} hours @ ${overtimeRate * 100}% rate`,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            overtimeRate,
        };
    }

    /**
     * Get unpaid leave days for payroll deduction
     * Integrates with Leaves module
     */
    async getUnpaidLeaveDays(
        employeeId: string | Types.ObjectId,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{
        unpaidLeaveDays: number;
        unpaidLeaveRecords: any[];
    }> {
        const empId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        
        // Query leave requests for unpaid leaves
        const unpaidLeaves = await this.connection.collection('leaverequests').find({
            employeeId: empId,
            status: 'approved',
            isPaid: false,
            'dates.from': { $lte: periodEnd },
            'dates.to': { $gte: periodStart },
        }).toArray();
        
        let totalUnpaidDays = 0;
        const records: any[] = [];
        
        for (const leave of unpaidLeaves) {
            // Calculate days within the payroll period
            const leaveStart = new Date(Math.max(leave.dates.from.getTime(), periodStart.getTime()));
            const leaveEnd = new Date(Math.min(leave.dates.to.getTime(), periodEnd.getTime()));
            const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            totalUnpaidDays += days;
            records.push({
                leaveId: leave._id,
                leaveType: leave.leaveTypeId,
                days,
                from: leaveStart,
                to: leaveEnd,
            });
        }
        
        return {
            unpaidLeaveDays: totalUnpaidDays,
            unpaidLeaveRecords: records,
        };
    }

    /**
     * Calculate unpaid leave deduction
     */
    calculateUnpaidLeaveDeduction(
        baseSalary: number,
        workDaysInMonth: number,
        unpaidLeaveDays: number,
    ): {
        deductionAmount: number;
        reason: string;
        formula: string;
    } {
        if (unpaidLeaveDays <= 0) {
            return {
                deductionAmount: 0,
                reason: 'No unpaid leave',
                formula: '',
            };
        }
        
        const dailyRate = baseSalary / workDaysInMonth;
        const deductionAmount = dailyRate * unpaidLeaveDays;
        
        return {
            deductionAmount: Math.round(deductionAmount * 100) / 100,
            reason: `${unpaidLeaveDays} unpaid leave day(s)`,
            formula: `(${baseSalary} / ${workDaysInMonth}) × ${unpaidLeaveDays} = ${deductionAmount.toFixed(2)}`,
        };
    }

    /**
     * Get scheduled minutes for an attendance record
     */
    private async getScheduledMinutesForRecord(record: any): Promise<number> {
        if (!record.employeeId) return 480; // Default 8 hours
        
        const empId = typeof record.employeeId === 'string' 
            ? new Types.ObjectId(record.employeeId) 
            : record.employeeId;
        
        // Get shift assignment for the date
        const recordDate = record.punches?.[0]?.time || record.createdAt || new Date();
        const dayStart = new Date(recordDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(recordDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const assignment = await this.shiftAssignmentModel.findOne({
            employeeId: empId,
            startDate: { $lte: dayEnd },
            $or: [
                { endDate: { $gte: dayStart } },
                { endDate: null },
            ],
            status: 'active',
        }).lean().exec();
        
        if (assignment?.shiftId) {
            const shift = await this.shiftModel.findById(assignment.shiftId).lean().exec();
            if (shift) {
                const [startH, startM] = (shift.startTime || '09:00').split(':').map(Number);
                const [endH, endM] = (shift.endTime || '17:00').split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                return Math.max(0, endMinutes - startMinutes);
            }
        }
        
        return 480; // Default 8 hours
    }

    /**
     * Get misconduct penalties from Payroll Tracking
     */
    async getMisconductPenalties(
        employeeId: string | Types.ObjectId,
    ): Promise<{
        totalAmount: number;
        penalties: Array<{ reason: string; amount: number }>;
    }> {
        const empId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        
        const misconductPenalties = await this.connection.collection('employeepenalties').findOne({
            employeeId: empId,
        });
        
        if (!misconductPenalties || !Array.isArray(misconductPenalties.penalties)) {
            return { totalAmount: 0, penalties: [] };
        }
        
        const penalties = misconductPenalties.penalties.map((p: any) => ({
            reason: p.reason || 'Misconduct penalty',
            amount: p.amount || 0,
        }));
        
        const totalAmount = penalties.reduce((sum: number, p: any) => sum + p.amount, 0);
        
        return { totalAmount, penalties };
    }

    /**
     * Get refunds from Payroll Tracking
     */
    async getApprovedRefunds(
        employeeId: string | Types.ObjectId,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<{
        totalAmount: number;
        refunds: Array<{ description: string; amount: number }>;
    }> {
        const empId = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        
        const refundsDoc = await this.connection.collection('employeerefunds').findOne({
            employeeId: empId,
            status: 'APPROVED',
            payrollPeriod: { $gte: periodStart, $lte: periodEnd },
        });
        
        if (!refundsDoc || !Array.isArray(refundsDoc.refunds)) {
            return { totalAmount: 0, refunds: [] };
        }
        
        const refunds = refundsDoc.refunds.map((r: any) => ({
            description: r.description || 'Refund',
            amount: r.amount || 0,
        }));
        
        const totalAmount = refunds.reduce((sum: number, r: any) => sum + r.amount, 0);
        
        return { totalAmount, refunds };
    }

    /**
     * Complete payroll calculation for an employee
     * This is the main method that integrates all calculations
     * 
     * SALARY CALCULATION:
     * - Employees are paid for the TIME THEY ACTUALLY WORKED (from Time Management)
     * - Gross = (Base + Allowances) × (Actual Work Minutes / Scheduled Work Minutes)
     * - Then deductions (tax, insurance, penalties) are subtracted
     * - Overtime and refunds are added
     */
    async calculateEmployeePayroll(
        employeeId: string | Types.ObjectId,
        baseSalary: number,
        totalAllowances: number,
        periodStart: Date,
        periodEnd: Date,
        daysInMonth: number,
    ): Promise<{
        grossSalary: number;
        proratedGross: number;
        workRatio: number;
        attendance: any;
        penalties: {
            missingWork: { amount: number; reason: string };
            lateness: { amount: number; reason: string };
            misconduct: { amount: number; penalties: any[] };
            total: number;
        };
        overtime: { amount: number; reason: string; hours: number };
        unpaidLeave: { deduction: number; days: number; reason: string };
        refunds: { amount: number; items: any[] };
        netSalary: number;
        netPay: number;
    }> {
        // 1. Get attendance data from Time Management
        const attendance = await this.getAttendanceDataForPayroll(employeeId, periodStart, periodEnd);
        
        // 2. Calculate gross based on actual time worked
        const fullGrossSalary = baseSalary + totalAllowances;
        let workRatio = 1;
        let proratedGross = fullGrossSalary;
        
        if (attendance.scheduledWorkMinutes > 0) {
            // Pay based on actual hours worked (from Time Management)
            workRatio = Math.min(attendance.actualWorkMinutes / attendance.scheduledWorkMinutes, 1);
            proratedGross = fullGrossSalary * workRatio;
            this.logger.log(`[Employee ${employeeId}] Time-based pay: ${attendance.actualWorkMinutes}/${attendance.scheduledWorkMinutes} minutes = ${(workRatio * 100).toFixed(1)}%`);
        }
        
        // 3. Calculate time-based penalties
        const timePenalties = await this.calculateTimeBasedPenalties(
            employeeId,
            baseSalary,
            attendance,
            daysInMonth,
        );
        
        // 4. Calculate overtime (paid separately at higher rate)
        const overtime = await this.calculateOvertimePay(
            employeeId,
            baseSalary,
            attendance.overtimeMinutes,
            daysInMonth,
        );
        
        // 5. Get unpaid leave days from Leaves module
        const unpaidLeaveData = await this.getUnpaidLeaveDays(employeeId, periodStart, periodEnd);
        const unpaidLeaveDeduction = this.calculateUnpaidLeaveDeduction(
            baseSalary,
            daysInMonth,
            unpaidLeaveData.unpaidLeaveDays,
        );
        
        // 6. Get misconduct penalties
        const misconductData = await this.getMisconductPenalties(employeeId);
        
        // 7. Get refunds
        const refundsData = await this.getApprovedRefunds(employeeId, periodStart, periodEnd);
        
        // Calculate totals
        // Note: proratedGross already reflects actual time worked, so no need to subtract missing work penalty again
        // Penalty is only for lateness and misconduct
        const totalPenalties = timePenalties.latenessPenalty + misconductData.totalAmount;
        const netSalary = proratedGross - unpaidLeaveDeduction.deductionAmount;
        const netPay = netSalary - totalPenalties + overtime.overtimePay + refundsData.totalAmount;
        
        return {
            grossSalary: fullGrossSalary,
            proratedGross,
            workRatio,
            attendance,
            penalties: {
                missingWork: { amount: timePenalties.missingWorkPenalty, reason: timePenalties.missingWorkReason },
                lateness: { amount: timePenalties.latenessPenalty, reason: timePenalties.latenessReason },
                misconduct: { amount: misconductData.totalAmount, penalties: misconductData.penalties },
                total: totalPenalties,
            },
            overtime: { amount: overtime.overtimePay, reason: overtime.overtimeReason, hours: overtime.overtimeHours },
            unpaidLeave: { 
                deduction: unpaidLeaveDeduction.deductionAmount, 
                days: unpaidLeaveData.unpaidLeaveDays, 
                reason: unpaidLeaveDeduction.reason 
            },
            refunds: { amount: refundsData.totalAmount, items: refundsData.refunds },
            netSalary,
            netPay,
        };
    }
}
