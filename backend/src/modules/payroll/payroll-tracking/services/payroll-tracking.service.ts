import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { claims, claimsDocument } from '../models/claims.schema';
import { disputes, disputesDocument } from '../models/disputes.schema';
import { refunds, refundsDocument } from '../models/refunds.schema';

import { ClaimStatus, DisputeStatus, RefundStatus } from '../enums/payroll-tracking-enum';
import { paySlip, PayslipDocument } from "../../payroll-execution/models/payslip.schema";
import { employeePayrollDetails, employeePayrollDetailsDocument } from "../../payroll-execution/models/employeePayrollDetails.schema";
import { EmployeeProfile } from "../../../employee/models/employee/employee-profile.schema";
import { Department, DepartmentDocument } from "../../../employee/models/organization-structure/department.schema";
import { ContractType, WorkType } from "../../../employee/enums/employee-profile.enums";
import { PayrollConfigurationService } from "../../payroll-configuration/services/payroll-configuration.service";
import { UnifiedLeaveService } from "../../../leaves/services/leaves.service";
import { NotificationService } from "../../../time-management/services/NotificationService";
// Time Management imports for attendance-based deductions
import { AttendanceRecord, AttendanceRecordDocument } from "../../../time-management/models/attendance-record.schema";
import { TimeException, TimeExceptionDocument } from "../../../time-management/models/time-exception.schema";
import { ShiftAssignment, ShiftAssignmentDocument } from "../../../time-management/models/shift-assignment.schema";
import { Shift, ShiftDocument } from "../../../time-management/models/shift.schema";
import { TimeExceptionType, TimeExceptionStatus } from "../../../time-management/models/enums";

@Injectable()
export class PayrollTrackingService {
  constructor(
    @InjectModel(claims.name) private claimsModel: Model<claimsDocument>,
    @InjectModel(disputes.name) private disputesModel: Model<disputesDocument>,
    @InjectModel(refunds.name) private refundsModel: Model<refundsDocument>,
    @InjectModel(paySlip.name) private payslipModel: Model<PayslipDocument>,
    @InjectModel(employeePayrollDetails.name) private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    // Time Management models for attendance-based deductions
    @InjectModel(AttendanceRecord.name) private attendanceRecordModel: Model<AttendanceRecordDocument>,
    @InjectModel(TimeException.name) private timeExceptionModel: Model<TimeExceptionDocument>,
    @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    private readonly payrollConfigService: PayrollConfigurationService,
    private readonly leavesService: UnifiedLeaveService,
    private readonly notificationService: NotificationService,
  ) { }

  // ========== Employee Self-Service Methods ==========

  // REQ-PY-1: View and download payslip
  async getEmployeePayslips(employeeId: string) {
    const objectId = new Types.ObjectId(employeeId);
    return this.payslipModel.find({ employeeId: objectId }).exec();
  }

  // REQ-PY-1 (download part): Get full payslip data for download
  async downloadPayslip(payslipId: string, employeeId: string) {
    const objectId = new Types.ObjectId(payslipId);
    const employeeObjectId = new Types.ObjectId(employeeId);

    const payslip = await this.payslipModel.findOne({
      _id: objectId,
      employeeId: employeeObjectId,
    }).exec();

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    // This structure is suitable for the frontend to generate a PDF/CSV download
    return {
      payslipId: payslip._id,
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      earningsDetails: payslip.earningsDetails,
      deductionsDetails: payslip.deductionsDetails,
      totalGrossSalary: this.resolveTotalGrossSalary(payslip),
      totalDeductions: this.resolveTotalDeductions(payslip),
      netPay: payslip.netPay,
      paymentStatus: payslip.paymentStatus,
      createdAt: (payslip as any)?.createdAt,
      updatedAt: (payslip as any)?.updatedAt,
    };
  }

  // REQ-PY-1 (view part): View payslip online
  async viewPayslip(payslipId: string, employeeId: string) {
    const objectId = new Types.ObjectId(payslipId);
    const employeeObjectId = new Types.ObjectId(employeeId);

    const payslip = await this.payslipModel.findOne({
      _id: objectId,
      employeeId: employeeObjectId,
    }).exec();

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    // Return structured payslip data for online viewing
    return {
      payslipId: payslip._id,
      employeeId: payslip.employeeId,
      payrollRunId: payslip.payrollRunId,
      paymentStatus: payslip.paymentStatus,
      payPeriod: (payslip as any)?.createdAt,
      earnings: {
        baseSalary: payslip.earningsDetails?.baseSalary || 0,
        allowances: payslip.earningsDetails?.allowances || [],
        bonuses: payslip.earningsDetails?.bonuses || [],
        benefits: payslip.earningsDetails?.benefits || [],
        refunds: payslip.earningsDetails?.refunds || [],
        totalEarnings: this.resolveTotalGrossSalary(payslip) || 0,
      },
      deductions: {
        taxes: payslip.deductionsDetails?.taxes || [],
        insurances: payslip.deductionsDetails?.insurances || [],
        penalties: payslip.deductionsDetails?.penalties || null,
        totalDeductions: this.resolveTotalDeductions(payslip) || 0,
      },
      netPay: payslip.netPay || 0,
      createdAt: (payslip as any)?.createdAt,
      updatedAt: (payslip as any)?.updatedAt,
    };
  }

  // REQ-PY-2: View payslip status and details
  async getPayslipDetails(payslipId: string, employeeId: string) {
    const objectId = new Types.ObjectId(payslipId);
    const employeeObjectId = new Types.ObjectId(employeeId);

    const payslip = await this.payslipModel.findOne({
      _id: objectId,
      employeeId: employeeObjectId
    }).exec();

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    // Get any disputes for this payslip
    const payslipDisputes = await this.disputesModel.find({
      payslipId: objectId
    }).exec();

    return {
      payslip,
      disputes: payslipDisputes
    };
  }

  // REQ-PY-3: View base salary according to employment contract (full-time, part-time)
  async getBaseSalary(employeeId: string) {
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Get contract type and work type from employee profile
    const contractType: ContractType | undefined = employee.contractType;
    const workType: WorkType | undefined = employee.workType;

    let baseSalary: number | undefined;
    let payGradeName: string | undefined;
    let grossSalary: number | undefined;

    // STEP 1: Try employeePayrollDetails first (most reliable source)
    const latestPayrollDetails = await this.employeePayrollDetailsModel
      .findOne({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .exec();

    if (latestPayrollDetails?.baseSalary) {
      baseSalary = latestPayrollDetails.baseSalary;
    }

    // STEP 2: If not found, try paygrade from employee profile
    if (baseSalary == null && (employee as any)?.payGradeId) {
      try {
        const payGradeData = await this.payrollConfigService.findOnePayGrade((employee as any).payGradeId.toString());
        if (payGradeData) {
          baseSalary = payGradeData.baseSalary;
          payGradeName = payGradeData.grade;
          grossSalary = payGradeData.grossSalary;
        }
      } catch (error) {
        // PayGrade not found, continue to fallback
      }
    }

    // STEP 3: If still not found, fall back to latest payslip
    if (baseSalary == null) {
      const latestPayslip = await this.payslipModel.findOne({
        employeeId: new Types.ObjectId(employeeId),
      })
        .sort({ createdAt: -1 })
        .exec();

      if (latestPayslip) {
        baseSalary =
          (latestPayslip as any).baseSalary ??
          latestPayslip.earningsDetails?.baseSalary ??
          undefined;
      }
    }

    // STEP 4: Try to find matching payGrade if we have baseSalary but no payGradeName
    if (baseSalary != null && !payGradeName) {
      try {
        const allPayGrades = await this.payrollConfigService.findAllPayGrades();
        if (allPayGrades && allPayGrades.length > 0) {
          const exactMatch = allPayGrades.find((pg: any) => pg.baseSalary === baseSalary);
          if (exactMatch) {
            payGradeName = exactMatch.grade;
            grossSalary = exactMatch.grossSalary;
          } else {
            const closest = allPayGrades.reduce((prev: any, curr: any) => {
              return Math.abs(curr.baseSalary - (baseSalary || 0)) < Math.abs(prev.baseSalary - (baseSalary || 0)) ? curr : prev;
            });
            payGradeName = closest.grade;
            grossSalary = closest.grossSalary;
          }
        }
      } catch (error) {
        // Could not fetch pay grades
      }
    }

    return {
      employeeId: employee._id,
      fullName: `${employee.firstName} ${employee.lastName}`,
      contractType: contractType || null,
      workType: workType || null,
      payGrade: payGradeName || null,
      baseSalary: baseSalary || 0,
      grossSalary: grossSalary || null,
      currency: 'EGP',
    };
  }

  // REQ-PY-5: View compensation for unused leave days (integrated with Leaves module)
  async getLeaveCompensation(employeeId: string) {
    // Validate employee exists
    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    let baseSalary = 0;
    let payGradeInfo: any = null;

    // STEP 1: Try to get base salary from employeePayrollDetails (most reliable source)
    const latestPayrollDetails = await this.employeePayrollDetailsModel
      .findOne({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .exec();

    if (latestPayrollDetails?.baseSalary) {
      baseSalary = latestPayrollDetails.baseSalary;
    }

    // STEP 2: If not found, try to get pay grade from employee's assigned payGradeId
    if (baseSalary === 0 && (employee as any)?.payGradeId) {
      try {
        const payGradeData = await this.payrollConfigService.findOnePayGrade(
          (employee as any).payGradeId.toString()
        );
        if (payGradeData) {
          payGradeInfo = {
            grade: payGradeData.grade,
            baseSalary: payGradeData.baseSalary,
            grossSalary: payGradeData.grossSalary,
          };
          baseSalary = payGradeData.baseSalary || 0;
        }
      } catch (error) {
        // PayGrade not found, continue to fallbacks
      }
    }

    // STEP 3: If still no baseSalary, try to get from latest payslip
    if (baseSalary === 0) {
      const latestPayslip = await this.payslipModel
        .findOne({ employeeId: new Types.ObjectId(employeeId) })
        .sort({ createdAt: -1 })
        .exec();

      if (latestPayslip) {
        baseSalary = (latestPayslip as any)?.baseSalary ?? latestPayslip?.earningsDetails?.baseSalary ?? 0;
      }
    }

    // STEP 4: If we have baseSalary but no payGradeInfo, try to find matching pay grade
    if (baseSalary > 0 && !payGradeInfo) {
      try {
        const allPayGrades = await this.payrollConfigService.findAllPayGrades();
        if (allPayGrades && allPayGrades.length > 0) {
          // Find pay grade with exact base salary match
          const exactMatch = allPayGrades.find((pg: any) => pg.baseSalary === baseSalary);
          if (exactMatch) {
            payGradeInfo = {
              grade: exactMatch.grade,
              baseSalary: exactMatch.baseSalary,
              grossSalary: exactMatch.grossSalary,
            };
          } else {
            // Find the pay grade with closest base salary
            const closest = allPayGrades.reduce((prev: any, curr: any) => {
              return Math.abs(curr.baseSalary - baseSalary) < Math.abs(prev.baseSalary - baseSalary) ? curr : prev;
            });
            payGradeInfo = {
              grade: closest.grade,
              baseSalary: closest.baseSalary,
              grossSalary: closest.grossSalary,
              note: 'Closest matching pay grade',
            };
          }
        }
      } catch (error) {
        // Could not fetch pay grades, continue without
      }
    }

    // STEP 5: Get unused leave days from Leaves module
    let totalUnusedDays = 0;
    const leaveEntitlements: any[] = [];

    try {
      const balances = await this.leavesService.getEmployeeBalances(employeeId);
      const allLeaveTypes = await this.leavesService.getAllLeaveTypes();

      // Build a map of unpaid leave type IDs (we want to EXCLUDE unpaid leave from compensation)
      const unpaidLeaveTypeIds = allLeaveTypes
        .filter((lt: any) => lt.paid === false)
        .map((lt: any) => lt._id.toString());

      if (Array.isArray(balances) && balances.length > 0) {
        for (const balance of balances) {
          const leaveTypeIdStr = balance.leaveTypeId?.toString();

          // Skip only if explicitly marked as unpaid leave
          // If leave type not found, include it (safer to include than exclude)
          if (unpaidLeaveTypeIds.includes(leaveTypeIdStr)) {
            continue;
          }

          const leaveType = allLeaveTypes.find((lt: any) => lt._id.toString() === leaveTypeIdStr);
          const remaining = balance.remaining || 0;

          if (remaining > 0) {
            totalUnusedDays += remaining;
          }

          leaveEntitlements.push({
            leaveTypeId: leaveTypeIdStr,
            leaveTypeName: leaveType?.name || 'Unknown Leave Type',
            remaining: remaining,
            carryForward: balance.carryForward || 0,
          });
        }
      }
    } catch (error) {
      // Could not fetch leave balances
    }

    // STEP 6: Get leave encashment policy (only if it's specifically for leave encashment)
    let encashmentRate = 100; // Default to 100% if no specific leave policy
    let policyDetails: any = null;

    try {
      const leavePolicies = await this.payrollConfigService.findAll({
        page: 1,
        limit: 50,
      });

      if (leavePolicies.data && leavePolicies.data.length > 0) {
        // Look for a leave encashment specific policy (not general deduction policies)
        const leavePolicy = leavePolicies.data.find((policy: any) => {
          const policyName = policy.policyName?.toLowerCase() || '';
          const description = policy.description?.toLowerCase() || '';
          // Only match if it's specifically about leave/encashment
          return policyName.includes('leave') || policyName.includes('encashment') ||
            description.includes('leave') || description.includes('encashment');
        });

        if (leavePolicy) {
          encashmentRate = leavePolicy.ruleDefinition?.percentage || 100;
          policyDetails = {
            policyName: leavePolicy.policyName,
            description: leavePolicy.description,
            effectiveDate: leavePolicy.effectiveDate,
            percentage: leavePolicy.ruleDefinition?.percentage || 0,
            fixedAmount: leavePolicy.ruleDefinition?.fixedAmount || 0,
          };
        }
        // If no leave-specific policy found, keep default 100% and policyDetails = null
      }
    } catch (error) {
      // Could not fetch policies, use default encashment rate
    }

    // STEP 7: Calculate daily rate and total compensation
    const dailyRate = baseSalary > 0 ? baseSalary / 30 : 0;
    const totalCompensation = dailyRate * totalUnusedDays * (encashmentRate / 100);

    return {
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: (employee as any).employeeNumber || null,
      baseSalary,
      payGrade: payGradeInfo,
      unusedLeaveDays: totalUnusedDays,
      leaveEntitlements: leaveEntitlements,
      encashmentRate: encashmentRate,
      dailyRate: Math.round(dailyRate * 100) / 100,
      totalCompensation: Math.round(totalCompensation * 100) / 100,
      currency: 'EGP',
      policyDetails,
      lastUpdated: new Date().toISOString(),
    };
  }

  // REQ-PY-7: View transportation compensation
  async getTransportationCompensation(employeeId: string) {
    // This would come from Payroll Execution data
    const payslips = await this.payslipModel.find({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .limit(1)
      .exec();

    if (payslips.length === 0) {
      return { transportationAllowance: 0 };
    }

    const latestPayslip = payslips[0];
    // Get transportation allowance from earnings details
    let transportationAllowance = 0;
    if (latestPayslip.earningsDetails?.allowances) {
      transportationAllowance = latestPayslip.earningsDetails.allowances
        .filter(a => (a as any)?.type === 'transportation')
        .reduce((sum, a) => sum + ((a as any)?.amount || 0), 0);
    }
    return {
      transportationAllowance,
      createdAt: (latestPayslip as any)?.createdAt || new Date()
    };
  }

  // REQ-PY-8: View tax deductions (BR 5: Identify tax brackets through Local Tax Law, BR 6: Support multiple tax components)
  async getTaxDeductions(employeeId: string, payslipId?: string) {
    let query: any = { employeeId: new Types.ObjectId(employeeId) };

    if (payslipId) {
      query._id = new Types.ObjectId(payslipId);
    }

    const payslips = await this.payslipModel.find(query)
      .sort({ createdAt: -1 })
      .exec();

    // Get all active tax rules to fetch law references and brackets
    let activeTaxRules: any[] = [];
    try {
      const taxRulesResponse = await this.payrollConfigService.getTaxRules();
      activeTaxRules = Array.isArray(taxRulesResponse)
        ? taxRulesResponse.filter((rule: any) => rule.status === 'approved')
        : [];
    } catch (error) {
      // Continue without tax rules if service unavailable
      console.warn('Could not fetch tax rules:', error);
    }

    return payslips.map(payslip => {
      const taxes = (payslip.deductionsDetails?.taxes || []) as any[];

      const taxableBase = this.resolveTotalGrossSalary(payslip) || (payslip.earningsDetails as any)?.baseSalary || 0;

      const taxDetails = taxes.map((tax: any) => {
        // In this codebase, payslip.deductionsDetails.taxes stores embedded Tax Rule config
        // (no calculated amount field). Compute amount from taxable base and configured rate.
        const configuredRatePct: number | null =
          typeof tax?.rate === 'number'
            ? tax.rate
            : (typeof (tax as any)?.configuredRatePct === 'number' ? (tax as any).configuredRatePct : null);

        const computedAmount =
          taxableBase > 0 && configuredRatePct != null
            ? (taxableBase * configuredRatePct) / 100
            : 0;

        const amount =
          typeof tax?.amount === 'number'
            ? tax.amount
            : Math.round(computedAmount * 100) / 100;
        const effectiveRatePct =
          taxableBase > 0 ? (amount / taxableBase) * 100 : null;

        // Find matching tax rule for law reference and bracket info
        const matchingRule = activeTaxRules.find((rule: any) =>
          rule.name === tax.name || rule._id?.toString?.() === tax._id?.toString?.()
        );

        // Determine tax bracket based on taxable base (BR 5)
        let taxBracket = 'Standard';
        if (taxableBase > 0 && matchingRule) {
          // Simple bracket logic - can be enhanced
          if (taxableBase >= 100000) taxBracket = 'High Income';
          else if (taxableBase >= 50000) taxBracket = 'Medium Income';
          else taxBracket = 'Low Income';
        }

        // Extract tax components if available (BR 6: multiple tax components)
        const taxComponents = matchingRule?.taxComponents || [];
        const componentBreakdown = taxComponents.map((component: any) => ({
          type: component.type,
          name: component.name,
          description: component.description,
          rate: component.rate,
          amount: taxableBase > 0 ? (taxableBase * component.rate / 100) : 0,
          minAmount: component.minAmount,
          maxAmount: component.maxAmount,
        }));

        return {
          ruleName: tax.name || matchingRule?.name || 'Tax Rule',
          description: tax.description || matchingRule?.description || '',
          configuredRatePct,
          calculatedAmount: amount,
          taxableBase,
          effectiveRatePct: taxableBase > 0 ? (amount / taxableBase) * 100 : null,
          // BR 5: Tax bracket identification
          taxBracket,
          // Law reference (from tax rule name/description)
          lawReference: matchingRule?.name || tax.name || 'Local Tax Law',
          // BR 6: Multiple tax components breakdown
          taxComponents: componentBreakdown,
          taxRuleId: matchingRule?._id?.toString() || tax._id?.toString(),
          approvedAt: matchingRule?.approvedAt || null,
        };
      });

      const totalTax = taxDetails.reduce(
        (sum, t) => sum + (t.calculatedAmount || 0),
        0,
      );

      return {
        payslipId: payslip._id,
        payslipPeriod: (payslip as any).payrollPeriod || null,
        totalTax,
        taxableBase,
        taxDetails,
        // Summary
        summary: {
          totalTaxComponents: taxDetails.reduce((sum, t) => sum + (t.taxComponents?.length || 0), 0),
          averageTaxRate: taxableBase > 0 ? (totalTax / taxableBase) * 100 : 0,
        }
      };
    });
  }

  // REQ-PY-9: View insurance deductions
  async getInsuranceDeductions(employeeId: string, payslipId?: string) {
    let query: any = { employeeId: new Types.ObjectId(employeeId) };

    if (payslipId) {
      query._id = new Types.ObjectId(payslipId);
    }

    const payslips = await this.payslipModel.find(query)
      .sort({ createdAt: -1 })
      .exec();

    // Base salary is needed to compute bracket-based contributions because the embedded schema
    // (`insuranceBrackets`) does not store computed amounts at execution time.
    const employeeBase = await this.getBaseSalary(employeeId).catch(() => null);
    const baseSalary = (employeeBase as any)?.baseSalary || 0;

    return payslips.map(payslip => {
      const ins = (payslip.deductionsDetails?.insurances || []) as any[];
      const mapped = ins.map((bracket: any) => {
        const employeeRate = typeof bracket?.employeeRate === 'number' ? bracket.employeeRate : (typeof bracket?.rate === 'number' ? bracket.rate : 0);
        const employerRate = typeof bracket?.employerRate === 'number' ? bracket.employerRate : 0;
        const employeeContribution = baseSalary > 0 ? Math.round(((baseSalary * employeeRate) / 100) * 100) / 100 : 0;
        const employerContribution = baseSalary > 0 ? Math.round(((baseSalary * employerRate) / 100) * 100) / 100 : 0;

        return {
          _id: bracket?._id,
          name: bracket?.name || 'Insurance',
          type: bracket?.type || bracket?.name || 'Insurance',
          // what employee sees deducted from salary
          amount: employeeContribution,
          rate: employeeRate,
          minSalary: bracket?.minSalary,
          maxSalary: bracket?.maxSalary,
          employeeContribution,
          employerContribution,
          approvedAt: bracket?.approvedAt,
          status: bracket?.status,
        };
      });

      const totalInsurance = mapped.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

      return {
        payslipId: payslip._id,
        payslipPeriod: (payslip as any).payrollPeriod || null,
        insuranceDeductions: mapped,
        totalInsurance,
      };
    });
  }

  // REQ-PY-10: View misconduct/absenteeism deductions
  async getMisconductDeductions(employeeId: string, payslipId?: string) {
    let query: any = { employeeId: new Types.ObjectId(employeeId) };

    if (payslipId) {
      query._id = new Types.ObjectId(payslipId);
    }

    const payslips = await this.payslipModel.find(query)
      .sort({ createdAt: -1 })
      .exec();

    return payslips.map(payslip => {
      const penaltiesObj = payslip.deductionsDetails?.penalties as any;
      const penaltiesArr = Array.isArray(penaltiesObj?.penalties) ? penaltiesObj.penalties : [];
      const totalPenalties = penaltiesArr.reduce((sum: number, p: any) => sum + (p?.amount || 0), 0);

      return {
        payslipId: payslip._id,
        payslipPeriod: (payslip as any).payrollPeriod || null,
        misconductDeductions: totalPenalties,
        totalPenalties,
        details: penaltiesArr.map((p: any) => ({
          type: 'Penalty',
          description: p?.reason || 'Penalty',
          amount: p?.amount || 0,
          date: (payslip as any)?.createdAt || new Date().toISOString(),
          reason: p?.reason,
        })),
      };
    });
  }

  // View salary deductions due to misconduct or unapproved absenteeism (missing days)
  // Integrates with Time Management module for attendance-based deductions
  async getAttendanceBasedDeductions(
    employeeId: string,
    options?: {
      from?: Date;
      to?: Date;
      payslipId?: string;
    }
  ) {
    // Validate employee exists
    if (!employeeId) {
      throw new BadRequestException('Employee ID is required');
    }

    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const employeeOid = new Types.ObjectId(employeeId);

    // Set date range (default to current month if not provided)
    const now = new Date();
    const fromDate = options?.from || new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = options?.to || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // STEP 1: Get base salary for deduction calculation
    let baseSalary = 0;
    const latestPayrollDetails = await this.employeePayrollDetailsModel
      .findOne({ employeeId: employeeOid })
      .sort({ createdAt: -1 })
      .exec();

    if (latestPayrollDetails?.baseSalary) {
      baseSalary = latestPayrollDetails.baseSalary;
    }

    // Fallback to paygrade
    if (baseSalary === 0 && (employee as any)?.payGradeId) {
      try {
        const payGradeData = await this.payrollConfigService.findOnePayGrade(
          (employee as any).payGradeId.toString()
        );
        if (payGradeData?.baseSalary) {
          baseSalary = payGradeData.baseSalary;
        }
      } catch (error) {
        // Continue
      }
    }

    // Calculate daily rate
    const dailyRate = baseSalary > 0 ? Math.round((baseSalary / 30) * 100) / 100 : 0;

    // STEP 2: Get time exceptions for the employee (misconduct, lateness, etc.)
    const timeExceptions = await this.timeExceptionModel.find({
      employeeId: employeeOid,
    }).lean();

    // Categorize exceptions
    const misconductExceptions = timeExceptions.filter(
      ex => ex.type === TimeExceptionType.LATE ||
        ex.type === TimeExceptionType.EARLY_LEAVE ||
        ex.type === TimeExceptionType.SHORT_TIME
    );

    const missedPunchExceptions = timeExceptions.filter(
      ex => ex.type === TimeExceptionType.MISSED_PUNCH
    );

    // STEP 3: Get attendance records to find missing days (no punch at all)
    const attendanceRecords = await this.attendanceRecordModel.find({
      employeeId: employeeOid,
    }).lean();

    // Get shift assignments to determine expected work days
    const shiftAssignments = await this.shiftAssignmentModel.find({
      employeeId: employeeOid,
      $or: [
        { startDate: { $lte: toDate }, endDate: { $gte: fromDate } },
        { startDate: { $lte: toDate }, endDate: { $exists: false } },
        { startDate: { $lte: toDate }, endDate: null },
      ],
    }).lean();

    // Calculate missing days (days with shift assignment but no attendance record)
    const attendanceDates = new Set(
      attendanceRecords
        .filter(ar => ar.punches && ar.punches.length > 0)
        .map(ar => {
          const firstPunch = ar.punches[0]?.time;
          if (firstPunch) {
            const d = new Date(firstPunch);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          }
          return null;
        })
        .filter(Boolean)
    );

    // Count missing work days
    let missingDaysCount = 0;
    const missingDays: { date: string; reason: string }[] = [];

    for (const assignment of shiftAssignments) {
      const shift = await this.shiftModel.findById(assignment.shiftId).lean();
      if (!shift) continue;

      // Get the range for this assignment
      const assignmentStart = new Date(Math.max(new Date(assignment.startDate).getTime(), fromDate.getTime()));
      const assignmentEnd = assignment.endDate
        ? new Date(Math.min(new Date(assignment.endDate).getTime(), toDate.getTime()))
        : toDate;

      // Iterate through each day in the range
      const current = new Date(assignmentStart);
      while (current <= assignmentEnd) {
        const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;

        // Check if this day has attendance
        if (!attendanceDates.has(dateKey)) {
          missingDaysCount++;
          missingDays.push({
            date: current.toISOString().split('T')[0],
            reason: 'No attendance record - unapproved absence',
          });
        }

        current.setDate(current.getDate() + 1);
      }
    }

    // STEP 4: Get payslip deductions if payslipId provided
    let payslipDeductions: any = null;
    if (options?.payslipId) {
      const payslip = await this.payslipModel.findOne({
        _id: new Types.ObjectId(options.payslipId),
        employeeId: employeeOid,
      }).exec();

      if (payslip?.deductionsDetails?.penalties) {
        payslipDeductions = {
          payslipId: payslip._id,
          penalties: payslip.deductionsDetails.penalties,
        };
      }
    }

    // Calculate total deductions
    const missingDaysDeduction = missingDaysCount * dailyRate;

    // Count unresolved exceptions that may lead to deductions
    const unresolvedMisconductCount = misconductExceptions.filter(
      ex => ex.status !== TimeExceptionStatus.RESOLVED && ex.status !== TimeExceptionStatus.APPROVED
    ).length;

    const unresolvedMissedPunchCount = missedPunchExceptions.filter(
      ex => ex.status !== TimeExceptionStatus.RESOLVED && ex.status !== TimeExceptionStatus.APPROVED
    ).length;

    // Build a flat list of deductions for UI consumption
    const deductions = [
      ...missingDays.map((m) => ({
        date: m.date,
        type: 'Absenteeism',
        description: m.reason,
        daysDeducted: 1,
        amount: dailyRate,
        reason: m.reason,
      })),
    ];

    return {
      employeeId: employee._id,
      fullName: `${employee.firstName} ${employee.lastName}`,
      dateRange: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      baseSalary,
      dailyRate,

      // Misconduct Deductions (from time exceptions)
      misconductDeductions: {
        lateArrivals: misconductExceptions.filter(ex => ex.type === TimeExceptionType.LATE).length,
        earlyDepartures: misconductExceptions.filter(ex => ex.type === TimeExceptionType.EARLY_LEAVE).length,
        shortTimeWorked: misconductExceptions.filter(ex => ex.type === TimeExceptionType.SHORT_TIME).length,
        totalMisconductExceptions: misconductExceptions.length,
        unresolvedCount: unresolvedMisconductCount,
        details: misconductExceptions.map(ex => ({
          id: ex._id,
          type: ex.type,
          status: ex.status,
          reason: ex.reason,
          attendanceRecordId: ex.attendanceRecordId,
        })),
      },

      // Unapproved Absenteeism (Missing Days)
      absenteeismDeductions: {
        missingDaysCount,
        missingDays,
        missedPunchExceptions: missedPunchExceptions.length,
        unresolvedMissedPunchCount,
        estimatedDeduction: missingDaysDeduction,
        missedPunchDetails: missedPunchExceptions.map(ex => ({
          id: ex._id,
          status: ex.status,
          reason: ex.reason,
          attendanceRecordId: ex.attendanceRecordId,
        })),
      },

      // Summary
      summary: {
        totalMisconductIncidents: misconductExceptions.length,
        totalAbsentDays: missingDaysCount,
        totalMissedPunches: missedPunchExceptions.length,
        estimatedTotalDeduction: missingDaysDeduction,
        unresolvedIssuesCount: unresolvedMisconductCount + unresolvedMissedPunchCount,
      },

      // Flat deductions list (used by frontend payroll tracking pages)
      deductions,
      totalDeduction: missingDaysDeduction,

      // Payslip deductions (if payslipId provided)
      payslipDeductions,

      // Additional info
      attendanceRecordsCount: attendanceRecords.length,
      shiftAssignmentsCount: shiftAssignments.length,
    };
  }

  // REQ-PY-11: View unpaid leave deductions (integrated with Leaves module)
  async getUnpaidLeaveDeductions(employeeId: string, payslipId?: string, dateRange?: { from?: Date; to?: Date }) {
    // Validate employee exists
    if (!employeeId) {
      throw new BadRequestException('Employee ID is required');
    }

    const employee = await this.employeeModel.findById(employeeId).exec();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // STEP 1: Get base salary for deduction calculation
    let baseSalary = 0;

    // Try employeePayrollDetails first
    const latestPayrollDetails = await this.employeePayrollDetailsModel
      .findOne({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .exec();

    if (latestPayrollDetails?.baseSalary) {
      baseSalary = latestPayrollDetails.baseSalary;
    }

    // Fallback to paygrade
    if (baseSalary === 0 && (employee as any)?.payGradeId) {
      try {
        const payGradeData = await this.payrollConfigService.findOnePayGrade(
          (employee as any).payGradeId.toString()
        );
        if (payGradeData?.baseSalary) {
          baseSalary = payGradeData.baseSalary;
        }
      } catch (error) {
        // Continue
      }
    }

    // Fallback to payslip
    if (baseSalary === 0) {
      const latestPayslip = await this.payslipModel
        .findOne({ employeeId: new Types.ObjectId(employeeId) })
        .sort({ createdAt: -1 })
        .exec();

      if (latestPayslip) {
        baseSalary = (latestPayslip as any)?.baseSalary ?? latestPayslip?.earningsDetails?.baseSalary ?? 0;
      }
    }

    // Calculate daily rate for unpaid leave deductions
    const dailyRate = baseSalary > 0 ? Math.round((baseSalary / 30) * 100) / 100 : 0;

    // Get unpaid leave types from Leaves module (where paid === false)
    const unpaidLeaveTypes = await this.leavesService.getAllLeaveTypes();
    const unpaidLeaveTypeIds = unpaidLeaveTypes
      .filter((lt: any) => lt.paid === false)
      .map((lt: any) => lt._id.toString());

    // Get unpaid leave type names for reference
    const unpaidLeaveTypeNames = unpaidLeaveTypes
      .filter((lt: any) => lt.paid === false)
      .map((lt: any) => ({ id: lt._id.toString(), name: lt.name, code: lt.code }));

    if (unpaidLeaveTypeIds.length === 0) {
      // No unpaid leave types configured in the system
      return {
        employeeId: employee._id,
        fullName: `${employee.firstName} ${employee.lastName}`,
        unpaidLeaveRequests: [],
        payslipDeductions: [],
        totalUnpaidLeaveDays: 0,
        message: 'No unpaid leave types configured in the system',
      };
    }

    // Get employee's leave history filtered by unpaid leave types and approved status
    const historyOpts: any = {
      status: 'approved',
    };
    if (dateRange?.from) {
      historyOpts.from = dateRange.from.toISOString();
    }
    if (dateRange?.to) {
      historyOpts.to = dateRange.to.toISOString();
    }

    const leaveHistory = await this.leavesService.getEmployeeHistory(employeeId, historyOpts);

    // Filter to only unpaid leave requests
    const unpaidLeaveRequests = (leaveHistory.data || []).filter((req: any) =>
      unpaidLeaveTypeIds.includes(req.leaveTypeId?.toString())
    );

    // Calculate total unpaid leave days from approved unpaid leave requests
    const totalUnpaidLeaveDays = unpaidLeaveRequests.reduce(
      (sum: number, req: any) => sum + (req.durationDays || 0),
      0
    );

    // Get unpaid leave type details for breakdown
    const unpaidLeaveBreakdown = await Promise.all(
      unpaidLeaveRequests.map(async (req: any) => {
        const leaveType = unpaidLeaveTypes.find(
          (lt: any) => lt._id.toString() === req.leaveTypeId?.toString()
        );

        // Provide frontend-friendly keys (it expects startDate/endDate/days)
        const from = req?.dates?.from ? new Date(req.dates.from) : null;
        const to = req?.dates?.to ? new Date(req.dates.to) : null;

        return {
          leaveRequestId: req._id,
          leaveTypeId: req.leaveTypeId,
          leaveTypeName: leaveType?.name || 'Unknown',
          leaveTypeCode: leaveType?.code || 'UNKNOWN',
          startDate: from ? from.toISOString() : null,
          endDate: to ? to.toISOString() : null,
          days: req.durationDays || 0,
          hours: null,
          status: req.status,
          approvedBy: null,
          approvedAt: null,
          // Keep original fields too (non-breaking for any other consumers)
          durationDays: req.durationDays || 0,
          dates: req.dates,
          justification: req.justification || null,
        };
      })
    );

    // Get payslip deductions related to unpaid leave
    let payslipQuery: any = { employeeId: new Types.ObjectId(employeeId) };
    if (payslipId) {
      payslipQuery._id = new Types.ObjectId(payslipId);
    }

    const payslips = await this.payslipModel
      .find(payslipQuery)
      .sort({ createdAt: -1 })
      .exec();

    // Extract unpaid leave deductions from payslips
    const payslipDeductions = payslips.map((payslip) => {
      // In this codebase, payslip.deductionsDetails.penalties is `employeePenalties`:
      // { employeeId, penalties: [{reason, amount}] }
      const penaltiesObj = payslip.deductionsDetails?.penalties as any;
      const penaltiesArr = Array.isArray(penaltiesObj?.penalties) ? penaltiesObj.penalties : [];

      const unpaidPenalties = penaltiesArr.filter((p: any) => {
        const reason = String(p?.reason || '').toLowerCase();
        return reason.includes('unpaid') || reason.includes('leave');
      });

      const unpaidLeaveDeductionAmount = unpaidPenalties.reduce(
        (sum: number, p: any) => sum + (p?.amount || 0),
        0,
      );

      return {
        payslipId: payslip._id,
        payslipPeriod: (payslip as any).payrollPeriod || null,
        leaveTypeName: 'Unpaid Leave',
        daysDeducted: dailyRate > 0 ? Math.round((unpaidLeaveDeductionAmount / dailyRate) * 100) / 100 : 0,
        dailyRate,
        deductionAmount: unpaidLeaveDeductionAmount,
        period: {
          from: (payslip as any)?.createdAt ? new Date((payslip as any).createdAt).toISOString().split('T')[0] : '',
          to: (payslip as any)?.createdAt ? new Date((payslip as any).createdAt).toISOString().split('T')[0] : '',
        },
        deductionDetails: unpaidPenalties.length ? unpaidPenalties : null,
      };
    });

    // Filter out payslips with no unpaid leave deductions if specific payslipId not requested
    const relevantPayslipDeductions = payslipId
      ? payslipDeductions
      : payslipDeductions.filter((p) => (p as any).deductionAmount > 0);

    return {
      employeeId: employee._id,
      fullName: `${employee.firstName} ${employee.lastName}`,
      // Salary & deduction calculation details
      baseSalary,
      dailyRate,
      currency: 'EGP',
      // Unpaid leave types in the system
      unpaidLeaveTypes: unpaidLeaveTypeNames,
      unpaidLeaveTypeCount: unpaidLeaveTypeIds.length,
      // Approved unpaid leave requests
      unpaidLeaveRequests: unpaidLeaveBreakdown,
      totalUnpaidLeaveDays,
      // Calculated deduction amount
      calculatedDeduction: Math.round(dailyRate * totalUnpaidLeaveDays * 100) / 100,
      // Compatibility field used by some frontend pages
      totalDeductionAmount: Math.round(dailyRate * totalUnpaidLeaveDays * 100) / 100,
      // Historical payslip deductions (shape matches frontend)
      payslipDeductions: relevantPayslipDeductions,
      totalDeductedFromPayslips: payslipDeductions.reduce(
        (sum: number, p: any) => sum + (p.deductionAmount || 0),
        0,
      ),
      lastUpdated: new Date().toISOString(),
      note: totalUnpaidLeaveDays === 0
        ? 'No approved unpaid leave requests found. The daily rate shown is the deduction amount per unpaid leave day.'
        : 'Unpaid leave deduction amounts are calculated based on daily rate × unpaid leave days.',
    };
  }

  // REQ-PY-13: View salary history
  async getSalaryHistory(employeeId: string) {
    const payslips = await this.payslipModel.find({
      employeeId: new Types.ObjectId(employeeId)
    })
      .sort({ createdAt: -1 })
      .exec();

    return payslips.map(payslip => ({
      payslipId: payslip._id,
      grossSalary: this.resolveTotalGrossSalary(payslip) || 0,
      netSalary: payslip.netPay || 0,
      status: payslip.paymentStatus,
      totalDeductions: this.resolveTotalDeductions(payslip) || 0,
      earningsDetails: payslip.earningsDetails || {},
      deductionsDetails: payslip.deductionsDetails || {},
      createdAt: (payslip as any)?.createdAt || new Date(),
    }));
  }

  // REQ-PY-14: View employer contributions
  async getEmployerContributions(employeeId: string, payslipId?: string) {
    let query: any = { employeeId: new Types.ObjectId(employeeId) };

    if (payslipId) {
      query._id = new Types.ObjectId(payslipId);
    }

    const payslips = await this.payslipModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    return payslips.map(payslip => ({
      payslipId: payslip._id,
      employerContributions: payslip.earningsDetails?.benefits || [],
      totalEmployerContribution:
        payslip.earningsDetails?.benefits?.reduce(
          (sum, b) => sum + (b.amount || 0),
          0,
        ) || 0,
    }));
  }

  // REQ-PY-15: Download tax documents (metadata)
  async getTaxDocuments(employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    return {
      employeeId,
      taxYear: targetYear,
      documents: [
        {
          type: 'ANNUAL_TAX_STATEMENT',
          fileName: `tax-statement-${employeeId}-${targetYear}.csv`,
          downloadUrl: `/api/payroll/tracking/employee/${employeeId}/tax-documents/${targetYear}/download`,
          generatedDate: new Date().toISOString(),
        },
      ],
    };
  }

  // REQ-PY-15 (download part): Aggregate annual tax data for download
  async downloadAnnualTaxStatement(employeeId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const payslips = await this.payslipModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const summary = payslips.reduce(
      (acc, payslip: any) => {
        const taxableBase =
          this.resolveTotalGrossSalary(payslip) || payslip.earningsDetails?.baseSalary || 0;
        const totalTaxForSlip = (payslip.deductionsDetails?.taxes || []).reduce(
          (sum: number, tax: any) => sum + (tax.amount || 0),
          0,
        );

        acc.totalTaxableIncome += taxableBase;
        acc.totalTaxPaid += totalTaxForSlip;
        acc.payslipsCount += 1;

        acc.payslips.push({
          payslipId: payslip._id,
          payrollRunId: payslip.payrollRunId,
          periodDate: (payslip as any)?.createdAt,
          taxableBase,
          totalTaxForSlip,
        });

        return acc;
      },
      {
        totalTaxableIncome: 0,
        totalTaxPaid: 0,
        payslipsCount: 0,
        payslips: [] as Array<{
          payslipId: string;
          payrollRunId: string;
          periodDate: Date | string;
          taxableBase: number;
          totalTaxForSlip: number;
        }>,
      },
    );

    const effectiveRatePct =
      summary.totalTaxableIncome > 0
        ? (summary.totalTaxPaid / summary.totalTaxableIncome) * 100
        : 0;

    return {
      employeeId,
      taxYear: targetYear,
      totalTaxableIncome: summary.totalTaxableIncome,
      totalTaxPaid: summary.totalTaxPaid,
      effectiveRatePct,
      payslipsCount: summary.payslipsCount,
      payslips: summary.payslips,
    };
  }

  // ========== Operational Reports Methods ==========

  // REQ-PY-38: Generate payroll reports by department
  async generateDepartmentPayrollReport(departmentId?: string, startDate?: Date, endDate?: Date) {
    const query: any = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const payslips = await this.payslipModel.find(query).exec();

    // Get unique employee IDs
    const employeeIds = [...new Set(payslips.map(p => p.employeeId))];

    // Fetch employees with populated departments
    const employees = await this.employeeModel.find({ _id: { $in: employeeIds } })
      .populate('primaryDepartmentId')
      .exec();

    // Create map of employeeId to department
    const employeeDepartmentMap = new Map();
    const employeeDepartmentIdMap = new Map();
    employees.forEach(emp => {
      const dept = emp.primaryDepartmentId as any;
      const deptName = dept ? dept.name || dept.code : 'Unknown';
      const deptId = dept ? dept._id?.toString() : 'unknown';
      employeeDepartmentMap.set(emp._id.toString(), deptName);
      employeeDepartmentIdMap.set(emp._id.toString(), deptId);
    });

    // Group by department
    const departmentSummary = payslips.reduce((acc, payslip) => {
      const empIdStr = payslip.employeeId.toString();
      const deptName = employeeDepartmentMap.get(empIdStr) || 'Unknown';
      const deptId = employeeDepartmentIdMap.get(empIdStr) || 'unknown';

      // If departmentId is specified, only include matching departments
      if (departmentId && deptId !== departmentId) {
        return acc;
      }

      if (!acc[deptId]) {
        acc[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          totalGross: 0,
          totalNet: 0,
          totalTax: 0,
          totalInsurance: 0,
          totalDeductions: 0,
          employeeCount: 0,
          employees: new Set()
        };
      }

      acc[deptId].totalGross += this.resolveTotalGrossSalary(payslip) || 0;
      acc[deptId].totalNet += payslip.netPay || 0;
      acc[deptId].totalTax += payslip.deductionsDetails?.taxes?.reduce((sum, t) => sum + ((t as any)?.amount || 0), 0) || 0;
      acc[deptId].totalInsurance += payslip.deductionsDetails?.insurances?.reduce((sum, i) => sum + ((i as any)?.amount || 0), 0) || 0;
      acc[deptId].totalDeductions += this.resolveTotalDeductions(payslip) || 0;
      acc[deptId].employees.add(empIdStr);

      return acc;
    }, {});

    // Convert to array format expected by frontend
    const reportsArray = Object.values(departmentSummary).map((dept: any) => ({
      id: `${dept.departmentId}_${Date.now()}`,
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      period: startDate && endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'All Time',
      totalEmployees: dept.employees.size,
      totalGrossPay: dept.totalGross,
      totalNetPay: dept.totalNet,
      totalDeductions: dept.totalDeductions,
      totalTaxes: dept.totalTax,
      averageSalary: dept.employees.size > 0 ? dept.totalGross / dept.employees.size : 0,
      costCenter: dept.departmentName,
      generatedAt: new Date().toISOString(),
      status: 'final' as const
    }));

    return {
      success: true,
      data: reportsArray.length > 0 ? reportsArray[0] : null,
      reports: reportsArray,
      reportType: 'DEPARTMENT_PAYROLL_SUMMARY',
      generatedDate: new Date().toISOString(),
      filters: { departmentId, startDate, endDate }
    };
  }

  // REQ-PY-29: Generate month-end/year-end summaries
  async generatePayrollSummary(reportType: 'monthly' | 'yearly', period?: string) {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (reportType === 'monthly') {
      const yearMonth = period || `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const [year, month] = yearMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else { // yearly
      const year = period ? parseInt(period) : now.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    const payslips = await this.payslipModel.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).exec();

    const summary = {
      totalGross: payslips.reduce((sum, p) => sum + (this.resolveTotalGrossSalary(p) || 0), 0),
      totalNet: payslips.reduce((sum, p) => sum + (p.netPay || 0), 0),
      totalTax: payslips.reduce((sum, p) => sum + (p.deductionsDetails?.taxes?.reduce((s, t) => s + ((t as any)?.amount || 0), 0) || 0), 0),
      totalInsurance: payslips.reduce((sum, p) => sum + (p.deductionsDetails?.insurances?.reduce((s, i) => s + ((i as any)?.amount || 0), 0) || 0), 0),
      totalPenalties: payslips.reduce((sum, p) => sum + ((p.deductionsDetails?.penalties as any)?.amount || 0), 0),
      totalEmployees: new Set(payslips.map(p => p.employeeId.toString())).size,
      totalPayslips: payslips.length
    };

    return {
      reportType: `${reportType.toUpperCase()}_PAYROLL_SUMMARY`,
      period: reportType === 'monthly'
        ? `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`
        : startDate.getFullYear().toString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      generatedDate: new Date().toISOString(),
      summary,
      byDepartment: this.groupByDepartment(payslips)
    };
  }

  // REQ-PY-25: Generate tax/insurance/benefits reports
  async generateComplianceReport(reportType: string, year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const payslips = await this.payslipModel.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).exec();

    let reportData;

    switch (reportType.toLowerCase()) {
      case 'tax':
        reportData = this.generateTaxReport(payslips, targetYear);
        break;
      case 'insurance':
        reportData = this.generateInsuranceReport(payslips, targetYear);
        break;
      case 'benefits':
        reportData = this.generateBenefitsReport(payslips, targetYear);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    return reportData;
  }

  // ========== Disputes and Claims Approval Methods ==========

  // REQ-PY-39: Payroll Specialist approve/reject disputes
  async reviewDispute(disputeId: string, specialistId: string, action: 'approve' | 'reject', reason?: string) {
    try {
      console.log('reviewDispute called with:', { disputeId, action });

      // Try finding by custom disputeId first, then by MongoDB _id
      let dispute = await this.disputesModel.findOne({ disputeId: disputeId });
      if (!dispute) {
        dispute = await this.disputesModel.findById(disputeId);
      }
      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      console.log('Before update - Dispute ID:', dispute._id, 'Current Status:', dispute.status);

      if (action === 'approve') {
        // When specialist approves, set status to PENDING_MANAGER_APPROVAL (escalates to manager)
        dispute.status = DisputeStatus.PENDING_MANAGER_APPROVAL;
        dispute.resolutionComment = reason || 'Approved by Payroll Specialist';
      } else {
        dispute.status = DisputeStatus.REJECTED;
        dispute.rejectionReason = reason || 'Rejected by Payroll Specialist';
      }

      await dispute.save();
      console.log('After save - Dispute ID:', dispute._id, 'New Status:', dispute.status);

      // Return populated dispute
      const updated = await this.disputesModel.findById(dispute._id)
        .populate('employeeId', 'firstName lastName employeeId')
        .populate('payslipId', 'payPeriod netSalary')
        .exec();

      console.log('Returning dispute with status:', updated?.status);
      return updated;
    } catch (error) {
      console.error('Error in reviewDispute:', error);
      throw error;
    }
  }

  // REQ-PY-40: Payroll Manager confirm dispute approval (multi-step)
  async confirmDisputeApproval(disputeId: string, managerId: string, action: 'confirm' | 'reject', reason?: string) {
    // Try finding by MongoDB _id first, then by custom disputeId
    let dispute = await this.disputesModel.findById(disputeId);
    if (!dispute) {
      dispute = await this.disputesModel.findOne({ disputeId: disputeId });
    }
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== DisputeStatus.PENDING_MANAGER_APPROVAL) {
      throw new BadRequestException('Only disputes pending manager approval can be confirmed by manager');
    }

    if (action === 'confirm') {
      dispute.status = DisputeStatus.APPROVED;
      // Preserve original specialist comment - store it before overwriting
      const originalSpecialistComment = dispute.resolutionComment || '';
      // Append manager confirmation, preserving original comment
      const managerNote = reason || `Confirmed by Payroll Manager ${managerId}`;
      dispute.resolutionComment = originalSpecialistComment ?
        `${originalSpecialistComment} | Manager: ${managerNote}` :
        managerNote;
      await dispute.save();

      // Notify Finance that manager approved the dispute
      try {
        const financeUsers = await this.notificationService.findUsersByRole('Finance');
        console.log('[PayrollManager] Found finance users:', financeUsers.length);

        if (financeUsers.length > 0) {
          for (const financeUser of financeUsers) {
            try {
              const financeUserId = typeof financeUser.employeeProfileId === 'string'
                ? new Types.ObjectId(financeUser.employeeProfileId)
                : financeUser.employeeProfileId;

              const notification = new this.notificationService['notificationModel']({
                to: financeUserId,
                type: 'DISPUTE_APPROVED',
                message: `Dispute has been approved by Payroll Manager for employee ${dispute.employeeId}`,
              });
              const saved = await notification.save();
              console.log('[PayrollManager] Notification created for finance user:', String(financeUserId), 'Notification ID:', saved._id);
            } catch (notifError) {
              console.error('[PayrollManager] Failed to create notification for finance user:', financeUser.employeeProfileId, notifError);
            }
          }
        } else {
          console.warn('[PayrollManager] No finance users found');
        }
      } catch (error) {
        console.error('[PayrollManager] Error notifying finance users:', error);
      }
    } else {
      dispute.status = DisputeStatus.REJECTED;
      dispute.rejectionReason = reason || 'Rejected by Payroll Manager';
      await dispute.save();
    }

    return dispute;
  }

  // REQ-PY-41: Finance staff view approved disputes
  async getApprovedDisputes(financeStaffId?: string) {
    // Only return disputes with APPROVED status (confirmed by manager)
    // APPROVED_BY_SPECIALIST means pending manager confirmation, not fully approved
    const query: any = { status: DisputeStatus.APPROVED };

    if (financeStaffId) {
      query.financeStaffId = new Types.ObjectId(financeStaffId);
    }

    const disputes = await this.disputesModel.find(query)
      .lean()
      .exec();

    console.log(`[getApprovedDisputes] Found ${disputes.length} disputes with APPROVED status`);

    // Fetch any refunds related to these disputes so we can compute refund status without modifying the dispute schema
    const disputeIds = disputes.map(d => d._id).filter(Boolean);
    const relatedRefunds = disputeIds.length ? await this.refundsModel.find({ disputeId: { $in: disputeIds } }).lean().exec() : [];
    const refundByDisputeId = new Map<string, any>(relatedRefunds.map((r: any) => [String(r.disputeId), r]));

    // Transform to expected format - NO POPULATION, return pure strings only
    const result = disputes.map((dispute: any) => {
      // Helper to safely convert to string - NEVER returns objects
      const toStr = (val: any): string => {
        if (val == null) return '';
        if (typeof val === 'object') {
          if (val._id) return String(val._id);
          return '';
        }
        return String(val);
      };
      const refund = refundByDisputeId.get(String(dispute._id));

      return {
        id: toStr(dispute._id),
        employeeId: toStr(dispute.employeeId), // Pure string ID, no population
        employeeName: 'Employee ' + toStr(dispute.employeeId).slice(-6), // Simple fallback
        employeeNumber: 'N/A',
        department: toStr(dispute.department || 'N/A'),
        type: toStr(dispute.disputeType || dispute.type || 'Unknown'),
        description: toStr(dispute.description),
        amount: dispute.amount || 0,
        period: toStr(dispute.payPeriod),
        approvedAt: dispute.updatedAt || dispute.createdAt,
        approvedBy: toStr(dispute.approvedBy || 'System'),
        priority: toStr(dispute.priority || 'medium'),
        refundStatus: toStr(refund ? refund.status : 'pending'),
        refundId: refund ? refund._id : null,
        needsRefund: Boolean(dispute.needsRefund)
      };
    });

    console.log('[getApprovedDisputes] First result:', JSON.stringify(result[0], null, 2));
    return result;
  }

  // REQ-PY-42: Payroll Specialist approve/reject claims
  async reviewClaim(claimId: string, specialistId: string, action: 'approve' | 'reject', approvedAmount?: number, reason?: string) {
    // Try to find by custom claimId field first, then by MongoDB _id
    let claim = await this.claimsModel.findOne({ claimId: claimId });
    if (!claim) {
      claim = await this.claimsModel.findById(claimId);
    }

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (action === 'approve') {
      // When specialist approves, set status to PENDING_MANAGER_APPROVAL (escalates to manager)
      claim.status = ClaimStatus.PENDING_MANAGER_APPROVAL;
      claim.approvedAmount = approvedAmount || claim.amount;
      claim.resolutionComment = reason || 'Approved by Payroll Specialist';
    } else {
      claim.status = ClaimStatus.REJECTED;
      claim.rejectionReason = reason || 'Rejected by Payroll Specialist';
    }

    return claim.save();
  }

  // REQ-PY-43: Payroll Manager confirm claim approval
  async confirmClaimApproval(claimId: string, managerId: string, action: 'confirm' | 'reject', reason?: string) {
    // Try finding by MongoDB _id first, then by custom claimId
    let claim = await this.claimsModel.findById(claimId);
    if (!claim) {
      claim = await this.claimsModel.findOne({ claimId: claimId });
    }
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== ClaimStatus.PENDING_MANAGER_APPROVAL) {
      throw new BadRequestException('Only claims pending manager approval can be confirmed by manager');
    }

    if (action === 'confirm') {
      claim.status = ClaimStatus.APPROVED;
      // Preserve original specialist comment - store it before overwriting
      const originalSpecialistComment = claim.resolutionComment || '';
      // Append manager confirmation, preserving original comment
      const managerNote = reason || `Confirmed by Payroll Manager ${managerId}`;
      claim.resolutionComment = originalSpecialistComment ?
        `${originalSpecialistComment} | Manager: ${managerNote}` :
        managerNote;
      await claim.save();

      // Notify Finance that manager approved the claim
      try {
        const financeUsers = await this.notificationService.findUsersByRole('Finance');
        console.log('[PayrollManager] Found finance users:', financeUsers.length);

        if (financeUsers.length > 0) {
          for (const financeUser of financeUsers) {
            try {
              const financeUserId = typeof financeUser.employeeProfileId === 'string'
                ? new Types.ObjectId(financeUser.employeeProfileId)
                : financeUser.employeeProfileId;

              const notification = new this.notificationService['notificationModel']({
                to: financeUserId,
                type: 'CLAIM_APPROVED',
                message: `Claim has been approved by Payroll Manager for employee ${claim.employeeId} - Amount: ${claim.amount}`,
              });
              const saved = await notification.save();
              console.log('[PayrollManager] Notification created for finance user:', String(financeUserId), 'Notification ID:', saved._id);
            } catch (notifError) {
              console.error('[PayrollManager] Failed to create notification for finance user:', financeUser.employeeProfileId, notifError);
            }
          }
        } else {
          console.warn('[PayrollManager] No finance users found');
        }
      } catch (error) {
        console.error('[PayrollManager] Error notifying finance users:', error);
      }
    } else {
      claim.status = ClaimStatus.REJECTED;
      claim.rejectionReason = reason || 'Rejected by Payroll Manager';
      await claim.save();
    }

    return claim;
  }

  // REQ-PY-44: Finance staff view approved claims
  async getApprovedClaims(financeStaffId?: string) {
    // Only return claims with APPROVED status
    const query: any = { status: ClaimStatus.APPROVED };

    if (financeStaffId) {
      query.financeStaffId = new Types.ObjectId(financeStaffId);
    }

    // Get approved claims - NO POPULATION
    const claims = await this.claimsModel.find(query)
      .lean()
      .exec();

    console.log(`[getApprovedClaims] Found ${claims.length} claims with APPROVED status`);

    // Mark CLAIM_APPROVED notifications as read for this finance staff member
    if (financeStaffId) {
      await this.notificationService['notificationModel'].updateMany(
        {
          to: new Types.ObjectId(financeStaffId),
          type: 'CLAIM_APPROVED'
        },
        { $set: { isRead: true } }
      ).exec();
    }

    // Fetch any refunds related to these claims so we can compute refund status without modifying the claim schema
    const claimIds = claims.map(c => c._id).filter(Boolean);
    const relatedClaimRefunds = claimIds.length ? await this.refundsModel.find({ claimId: { $in: claimIds } }).lean().exec() : [];
    const refundByClaimId = new Map<string, any>(relatedClaimRefunds.map((r: any) => [String(r.claimId), r]));

    // Transform to expected format - NO POPULATION, return pure strings only
    const result = claims.map((claim: any) => {
      // Helper to safely convert to string - NEVER returns objects
      const toStr = (val: any): string => {
        if (val == null) return '';
        if (typeof val === 'object') {
          if (val._id) return String(val._id);
          return '';
        }
        return String(val);
      };
      const refund = refundByClaimId.get(String(claim._id));

      return {
        id: toStr(claim._id),
        claimId: toStr(claim.claimId), // Added claimId
        employeeId: toStr(claim.employeeId), // Pure string ID, no population
        employeeName: 'Employee ' + toStr(claim.employeeId).slice(-6), // Simple fallback
        employeeNumber: 'N/A',
        department: toStr(claim.department || 'N/A'),
        title: toStr(claim.title || claim.claimType || 'Expense Claim'),
        description: toStr(claim.description),
        amount: claim.amount || 0,
        category: toStr(claim.claimType || claim.category || 'General'),
        period: toStr(claim.payPeriod),
        approvedAt: claim.updatedAt || claim.createdAt,
        approvedBy: toStr(claim.approvedBy || 'System'),
        priority: toStr(claim.priority || 'medium'),
        refundStatus: toStr(refund ? refund.status : 'pending'),
        refundId: refund ? refund._id : null,
        needsRefund: Boolean(claim.needsRefund)
      };
    });

    console.log('[getApprovedClaims] First result:', JSON.stringify(result[0], null, 2));
    return result;
  }

  // ========== Refund Process Methods ==========

  // REQ-PY-45: Generate refund for disputes
  async generateDisputeRefund(disputeId: string, financeStaffId: string, amount: number, description: string, employeeId: string) {
    // Try to find by custom disputeId field first, then by MongoDB _id
    let dispute = await this.disputesModel.findOne({ disputeId: disputeId });
    if (!dispute) {
      // Try MongoDB ObjectId if it's a valid ObjectId
      if (Types.ObjectId.isValid(disputeId)) {
        dispute = await this.disputesModel.findById(disputeId);
      }
    }

    if (!dispute) {
      throw new NotFoundException(`Dispute not found with ID: ${disputeId}`);
    }

    if (dispute.status !== DisputeStatus.APPROVED) {
      throw new BadRequestException('Only approved disputes can generate refunds');
    }

    // Check if refund already exists using the dispute's MongoDB _id
    const existingRefund = await this.refundsModel.findOne({ disputeId: dispute._id });
    if (existingRefund) {
      throw new BadRequestException('Refund already exists for this dispute');
    }

    const refund = new this.refundsModel({
      disputeId: dispute._id, // Use the dispute's MongoDB _id
      employeeId: dispute.employeeId,
      financeStaffId: new Types.ObjectId(financeStaffId),
      refundDetails: {
        description,
        amount
      },
      status: RefundStatus.PENDING
    });

    // No direct modifications to dispute schema — refunds are tracked in the `refunds` collection.
    // The refund document already captures the association (disputeId), so we just save the refund.
    return refund.save();
  }

  // REQ-PY-46: Generate refund for expense claims
  async generateClaimRefund(claimId: string, financeStaffId: string, amount: number, description: string, employeeId: string) {
    // Try to find by custom claimId field first, then by MongoDB _id
    let claim = await this.claimsModel.findOne({ claimId: claimId });
    if (!claim) {
      // Try MongoDB ObjectId if it's a valid ObjectId
      if (Types.ObjectId.isValid(claimId)) {
        claim = await this.claimsModel.findById(claimId);
      }
    }

    if (!claim) {
      throw new NotFoundException(`Claim not found with ID: ${claimId}`);
    }

    if (claim.status !== ClaimStatus.APPROVED) {
      throw new BadRequestException('Only approved claims can generate refunds');
    }

    // Check if refund already exists using the claim's MongoDB _id
    const existingRefund = await this.refundsModel.findOne({ claimId: claim._id });
    if (existingRefund) {
      throw new BadRequestException('Refund already exists for this claim');
    }

    const refund = new this.refundsModel({
      claimId: claim._id, // Use the claim's MongoDB _id
      employeeId: claim.employeeId,
      financeStaffId: new Types.ObjectId(financeStaffId),
      refundDetails: {
        description,
        amount
      },
      status: RefundStatus.PENDING
    });

    // No direct modifications to claim schema — refunds are tracked in the `refunds` collection.
    // The refund document already captures the association (claimId), so we just save the refund.
    return refund.save();
  }

  // Get pending refunds
  async getPendingRefunds() {
    return this.refundsModel.find({ status: RefundStatus.PENDING })
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('claimId', 'claimId description')
      .populate('disputeId', 'disputeId description')
      .exec();
  }

  // Update refund status when paid in payroll run
  async markRefundAsPaid(refundId: string, payrollRunId: string) {
    const refund = await this.refundsModel.findById(refundId);
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    refund.status = RefundStatus.PAID;
    refund.paidInPayrollRunId = new Types.ObjectId(payrollRunId);

    return refund.save();
  }

  // ========== Helper Methods ==========

  private groupByDepartment(payslips: any[]) {
    return payslips.reduce((acc, payslip) => {
      const dept = 'Unknown'; // Department info would need to be populated from employee
      if (!acc[dept]) {
        acc[dept] = {
          totalGross: 0,
          totalNet: 0,
          employeeCount: new Set()
        };
      }

      acc[dept].totalGross += this.resolveTotalGrossSalary(payslip) || 0;
      acc[dept].totalNet += payslip.netPay || 0;
      acc[dept].employeeCount.add(payslip.employeeId.toString());

      return acc;
    }, {});
  }

  // Helper: resolve total deductions from payslip robustly (handles legacy typo and computes if missing)
  private resolveTotalDeductions(payslip: any): number {
    if (!payslip) return 0;

    // Prefer existing numeric fields (handle legacy typo 'totaDeductions')
    const asAny: any = payslip as any;
    if (typeof asAny.totaDeductions === 'number') return asAny.totaDeductions;
    if (typeof asAny.totalDeductions === 'number') return asAny.totalDeductions;
    if (typeof asAny.totals?.totalDeductions === 'number') return asAny.totals.totalDeductions;

    // Otherwise compute from deductionsDetails
    const dd = payslip.deductionsDetails || {};
    const taxes = Array.isArray(dd.taxes) ? dd.taxes : [];
    const insurances = Array.isArray(dd.insurances) ? dd.insurances : [];

    let penaltiesArr: any[] = [];
    if (Array.isArray(dd.penalties)) penaltiesArr = dd.penalties;
    else if (Array.isArray(dd.penalties?.penalties)) penaltiesArr = dd.penalties.penalties;

    const sumFrom = (arr: any[]) => arr.reduce((s: number, it: any) => s + (typeof it?.amount === 'number' ? it.amount : (typeof it === 'number' ? it : 0)), 0);

    const total = sumFrom(taxes) + sumFrom(insurances) + sumFrom(penaltiesArr);
    return Math.round((total || 0) * 100) / 100;
  }

  // Helper: resolve total gross salary from payslip (prefer stored total, else sum earnings details)
  private resolveTotalGrossSalary(payslip: any): number {
    if (!payslip) return 0;
    const asAny: any = payslip as any;
    if (typeof asAny.totalGrossSalary === 'number') return asAny.totalGrossSalary;
    if (typeof asAny.totals?.totalGrossSalary === 'number') return asAny.totals.totalGrossSalary;

    const ed = payslip.earningsDetails || {};
    const base = typeof ed.baseSalary === 'number' ? ed.baseSalary : (typeof payslip.baseSalary === 'number' ? payslip.baseSalary : 0);
    const sumArr = (arr: any[]) => Array.isArray(arr) ? arr.reduce((s: number, it: any) => s + (typeof it?.amount === 'number' ? it.amount : (typeof it === 'number' ? it : 0)), 0) : 0;

    const allowances = sumArr(ed.allowances);
    const bonuses = sumArr(ed.bonuses);
    const benefits = sumArr(ed.benefits);
    const refunds = sumArr(ed.refunds);

    const total = base + allowances + bonuses + benefits + refunds;
    return Math.round((total || 0) * 100) / 100;
  }

  private generateTaxReport(payslips: any[], year: number) {
    const taxSummary = payslips.reduce((acc, payslip) => {
      const employeeId = payslip.employeeId.toString();
      if (!acc[employeeId]) {
        acc[employeeId] = {
          totalTax: 0,
          taxBreakdown: {},
          payslipsCount: 0
        };
      }

      const totalTax = payslip.deductionsDetails?.taxes?.reduce((sum, tax) => sum + (tax.amount || 0), 0) || 0;
      acc[employeeId].totalTax += totalTax;
      acc[employeeId].payslipsCount++;

      // Aggregate by tax type if available
      if (payslip.deductionsDetails?.taxes && Array.isArray(payslip.deductionsDetails.taxes)) {
        payslip.deductionsDetails.taxes.forEach((tax: any) => {
          const taxType = tax.type || 'Unknown';
          if (!acc[employeeId].taxBreakdown[taxType]) {
            acc[employeeId].taxBreakdown[taxType] = 0;
          }
          acc[employeeId].taxBreakdown[taxType] += tax.amount || 0;
        });
      }

      return acc;
    }, {});

    return {
      reportType: 'TAX_COMPLIANCE_REPORT',
      year,
      generatedDate: new Date().toISOString(),
      totalEmployees: Object.keys(taxSummary).length,
      totalTaxCollected: Object.values(taxSummary).reduce((sum: number, emp: any) => sum + emp.totalTax, 0),
      employeeTaxDetails: taxSummary
    };
  }

  private generateInsuranceReport(payslips: any[], year: number) {
    const insuranceSummary = payslips.reduce((acc, payslip) => {
      const employeeId = payslip.employeeId.toString();
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeContribution: 0,
          insuranceBreakdown: {},
          payslipsCount: 0
        };
      }

      const totalInsurance = payslip.deductionsDetails?.insurances?.reduce((sum, i) => sum + ((i as any).amount || 0), 0) || 0;
      acc[employeeId].employeeContribution += totalInsurance;
      acc[employeeId].payslipsCount++;

      // Aggregate by insurance type if available
      if (payslip.deductionsDetails?.insurances && Array.isArray(payslip.deductionsDetails.insurances)) {
        payslip.deductionsDetails.insurances.forEach((insurance: any) => {
          const insuranceType = insurance.type || 'Unknown';
          if (!acc[employeeId].insuranceBreakdown[insuranceType]) {
            acc[employeeId].insuranceBreakdown[insuranceType] = 0;
          }
          acc[employeeId].insuranceBreakdown[insuranceType] += insurance.amount || 0;
        });
      }

      return acc;
    }, {});

    return {
      reportType: 'INSURANCE_CONTRIBUTIONS_REPORT',
      year,
      generatedDate: new Date().toISOString(),
      totalEmployees: Object.keys(insuranceSummary).length,
      totalEmployeeContributions: Object.values(insuranceSummary).reduce((sum: number, emp: any) => sum + emp.employeeContribution, 0),
      insuranceDetails: insuranceSummary
    };
  }

  private generateBenefitsReport(payslips: any[], year: number) {
    const benefitsSummary = payslips.reduce((acc, payslip) => {
      const employeeId = payslip.employeeId.toString();
      if (!acc[employeeId]) {
        acc[employeeId] = {
          totalBenefits: 0,
          benefitsBreakdown: {},
          payslipsCount: 0
        };
      }

      // Sum up all benefits
      if (payslip.earningsDetails?.benefits && Array.isArray(payslip.earningsDetails.benefits)) {
        payslip.earningsDetails.benefits.forEach((benefit: any) => {
          const benefitType = benefit.type || 'Unknown';
          if (!acc[employeeId].benefitsBreakdown[benefitType]) {
            acc[employeeId].benefitsBreakdown[benefitType] = 0;
          }
          acc[employeeId].benefitsBreakdown[benefitType] += benefit.amount || 0;
          acc[employeeId].totalBenefits += benefit.amount || 0;
        });
      }

      acc[employeeId].payslipsCount++;

      return acc;
    }, {});

    return {
      reportType: 'BENEFITS_REPORT',
      year,
      generatedDate: new Date().toISOString(),
      totalEmployees: Object.keys(benefitsSummary).length,
      totalBenefitsProvided: Object.values(benefitsSummary).reduce((sum: number, emp: any) => sum + emp.totalBenefits, 0),
      benefitsDetails: benefitsSummary
    };
  }

  // ========== CRUD Methods for Claims ==========

  async getAllClaims(filters?: {
    status?: string;
    claimType?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const query: any = {};
    if (filters?.status && filters.status !== 'all') query.status = filters.status;
    if (filters?.claimType && filters.claimType !== 'all') query.claimType = filters.claimType;
    if (filters?.employeeId) query.employeeId = new Types.ObjectId(filters.employeeId);
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
    }

    return this.claimsModel.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('financeStaffId', 'firstName lastName employeeId')
      .populate('payrollSpecialistId', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getClaimById(id: string) {
    const claim = await this.claimsModel.findById(id)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('financeStaffId', 'firstName lastName employeeId')
      .exec();

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  async updateClaimById(id: string, updateClaimDto: any) {
    const claim = await this.claimsModel.findByIdAndUpdate(
      id,
      updateClaimDto,
      { new: true }
    ).exec();

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  async deleteClaimById(id: string) {
    const result = await this.claimsModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Claim not found');
    }
  }

  // ========== CRUD Methods for Disputes ==========

  async getAllDisputes(status?: string, employeeId?: string) {
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (employeeId) query.employeeId = new Types.ObjectId(employeeId);

    const disputes = await this.disputesModel.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate({
        path: 'payslipId',
        select: 'payrollRunId netPay totalGrossSalary',
        populate: {
          path: 'payrollRunId',
          select: 'payrollPeriod runId'
        }
      })
      .populate('financeStaffId', 'firstName lastName employeeId')
      .populate('payrollSpecialistId', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .exec();

    // Debug logging
    console.log('[getAllDisputes] Found disputes:', disputes.length);
    if (disputes.length > 0) {
      const firstDispute: any = disputes[0];
      console.log('[getAllDisputes] First dispute payslipId:', firstDispute.payslipId);
      console.log('[getAllDisputes] First dispute payslipId type:', typeof firstDispute.payslipId);
    }

    return {
      success: true,
      data: disputes,
      count: disputes.length
    };
  }

  async getDisputeById(id: string) {
    const dispute = await this.disputesModel.findById(id)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('payslipId', 'payPeriod netSalary grossSalary')
      .populate('financeStaffId', 'firstName lastName employeeId')
      .exec();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async updateDisputeById(id: string, updateDisputeDto: any) {
    const dispute = await this.disputesModel.findByIdAndUpdate(
      id,
      updateDisputeDto,
      { new: true }
    ).exec();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async deleteDisputeById(id: string) {
    const result = await this.disputesModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Dispute not found');
    }
  }

  // ========== CRUD Methods for Refunds ==========

  async getAllRefunds(status?: string, employeeId?: string) {
    const query: any = {};
    if (status) query.status = status;
    if (employeeId) query.employeeId = new Types.ObjectId(employeeId);

    return this.refundsModel.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('claimId', 'claimId description')
      .populate('disputeId', 'disputeId description')
      .populate('financeStaffId', 'firstName lastName employeeId')
      .populate('paidInPayrollRunId', 'runId period')
      .exec();
  }

  async getRefundById(id: string) {
    const refund = await this.refundsModel.findById(id)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('claimId', 'claimId description amount')
      .populate('disputeId', 'disputeId description')
      .populate('financeStaffId', 'firstName lastName employeeId')
      .populate('paidInPayrollRunId', 'runId period')
      .exec();

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  async updateRefundById(id: string, updateRefundDto: any) {
    const refund = await this.refundsModel.findByIdAndUpdate(
      id,
      updateRefundDto,
      { new: true }
    ).exec();

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  async deleteRefundById(id: string) {
    const result = await this.refundsModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Refund not found');
    }
  }

  // Add these methods to your existing PayrollTrackingService class:

  // REQ-PY-16: Dispute payroll errors
  async createDispute(employeeId: string, createDisputeDto: any) {
    try {
      // Validate employeeId is a valid ObjectId
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException(`Invalid employee ID format: ${employeeId}`);
      }

      // Generate dispute ID - find the highest existing dispute number
      const allDisputes = await this.disputesModel.find({}, { disputeId: 1 }).exec();

      let maxNumber = 0;
      for (const dispute of allDisputes) {
        if (dispute.disputeId) {
          const match = dispute.disputeId.match(/DISP-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      const disputeId = `DISP-${(maxNumber + 1).toString().padStart(4, '0')}`;

      console.log('Creating dispute with data:', {
        disputeId,
        employeeId,
        createDisputeDto,
      });

      const dispute = new this.disputesModel({
        disputeId,
        employeeId: new Types.ObjectId(employeeId),
        ...createDisputeDto,
        payslipId: new Types.ObjectId(createDisputeDto.payslipId),
        status: DisputeStatus.UNDER_REVIEW
      });

      const savedDispute = await dispute.save();
      console.log('Dispute saved successfully:', savedDispute);
      return savedDispute;
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  }

  // REQ-PY-17: Submit expense reimbursement claims
  async createClaim(employeeId: string, createClaimDto: any) {
    try {
      // Validate employeeId is a valid ObjectId
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException(`Invalid employee ID format: ${employeeId}`);
      }

      // Generate claim ID - find the highest existing claim number
      const allClaims = await this.claimsModel.find({}, { claimId: 1 }).exec();

      let maxNumber = 0;
      for (const claim of allClaims) {
        if (claim.claimId) {
          const match = claim.claimId.match(/CLAIM-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      const claimId = `CLAIM-${(maxNumber + 1).toString().padStart(4, '0')}`;

      console.log('Creating claim with data:', {
        claimId,
        employeeId,
        createClaimDto,
      });

      const claim = new this.claimsModel({
        claimId,
        employeeId: new Types.ObjectId(employeeId),
        ...createClaimDto,
        status: ClaimStatus.UNDER_REVIEW
      });

      const savedClaim = await claim.save();
      console.log('Claim saved successfully:', savedClaim);
      return savedClaim;
    } catch (error) {
      console.error('Error creating claim:', error);
      throw error;
    }
  }

  // REQ-PY-18: Track the approval and payment status of my claims, disputes
  async trackClaimsAndDisputes(employeeId: string) {
    const [claimsList, disputesList] = await Promise.all([
      this.claimsModel
        .find({ employeeId: new Types.ObjectId(employeeId) })
        .sort({ createdAt: -1 })
        .exec(),
      this.disputesModel
        .find({ employeeId: new Types.ObjectId(employeeId) })
        .sort({ createdAt: -1 })
        .exec(),
    ]);

    return {
      claims: claimsList.map((claim) => ({
        id: claim._id,
        claimId: claim.claimId,
        description: claim.description,
        claimType: (claim as any).claimType,
        amount: claim.amount,
        approvedAmount: claim.approvedAmount,
        status: claim.status,
        createdAt: (claim as any).createdAt,
        updatedAt: (claim as any).updatedAt,
      })),
      disputes: disputesList.map((dispute) => ({
        id: dispute._id,
        disputeId: dispute.disputeId,
        description: dispute.description,
        payslipId: dispute.payslipId,
        status: dispute.status,
        createdAt: (dispute as any)?.createdAt,
        updatedAt: (dispute as any)?.updatedAt,
      })),
    };
  }

}