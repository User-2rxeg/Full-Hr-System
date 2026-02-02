import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { OpenAIService } from './services/openai.service';
import { OpenAIController } from './controllers/openai.controller';
import { HRAssistantService } from './services/hr-assistant.service';
import { HRAssistantController } from './controllers/hr-assistant.controller';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee/models/employee/employee-profile.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leaves/models/leave-request.schema';
import { LeaveType, LeaveTypeSchema } from '../leaves/models/leave-type.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip, paySlipSchema } from '../payroll/payroll-execution/models/payslip.schema';
import { employeePayrollDetails, employeePayrollDetailsSchema } from '../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { claims, claimsSchema } from '../payroll/payroll-tracking/models/claims.schema';
import { disputes, disputesSchema } from '../payroll/payroll-tracking/models/disputes.schema';
import { AppraisalRecord, AppraisalRecordSchema } from '../performance/models/appraisal-record.schema';
import { AppraisalCycle, AppraisalCycleSchema } from '../performance/models/appraisal-cycle.schema';
import { Application, ApplicationSchema } from '../recruitment/models/application.schema';
import { JobRequisition, JobRequisitionSchema } from '../recruitment/models/job-requisition.schema';
import { Interview, InterviewSchema } from '../recruitment/models/interview.schema';
import { Offer, OfferSchema } from '../recruitment/models/offer.schema';
import { AttendanceRecord, AttendanceRecordSchema } from '../time-management/models/attendance-record.schema';
import { Shift, ShiftSchema } from '../time-management/models/shift.schema';
import { Holiday, HolidaySchema } from '../time-management/models/holiday.schema';
import {JobTemplate, JobTemplateSchema} from "../recruitment/models/job-template.schema";
import {
    ApplicationStatusHistory,
    ApplicationStatusHistorySchema
} from "../recruitment/models/application-history.schema";
import {Referral, ReferralSchema} from "../recruitment/models/referral.schema";
import {AssessmentResult, AssessmentResultSchema} from "../recruitment/models/assessment-result.schema";
import {Contract, ContractSchema} from "../recruitment/models/contract.schema";
import {Document, DocumentSchema} from "../recruitment/models/document.schema";
import {ClearanceChecklist, ClearanceChecklistSchema} from "../recruitment/models/clearance-checklist.schema";
import {Onboarding, OnboardingSchema} from "../recruitment/models/onboarding.schema";
import {TerminationRequest, TerminationRequestSchema} from "../recruitment/models/termination-request.schema";
import {allowance, allowanceSchema} from "../payroll/payroll-configuration/models/allowance.schema";
import {taxRules, taxRulesSchema} from "../payroll/payroll-configuration/models/taxRules.schema";
import {
    insuranceBrackets,
    insuranceBracketsSchema
} from "../payroll/payroll-configuration/models/insuranceBrackets.schema";
import {payGrade, payGradeSchema} from "../payroll/payroll-configuration/models/payGrades.schema";
import {payType, payTypeSchema} from "../payroll/payroll-configuration/models/payType.schema";
import {signingBonus, signingBonusSchema} from "../payroll/payroll-configuration/models/signingBonus.schema";
import {payrollPolicies, payrollPoliciesSchema} from "../payroll/payroll-configuration/models/payrollPolicies.schema";
import {
    terminationAndResignationBenefits,
    terminationAndResignationBenefitsSchema
} from "../payroll/payroll-configuration/models/terminationAndResignationBenefits";
import {
    CompanyWideSettings,
    CompanyWideSettingsSchema
} from "../payroll/payroll-configuration/models/CompanyWideSettings.schema";
import {ShiftAssignment, ShiftAssignmentSchema} from "../time-management/models/shift-assignment.schema";
import {ShiftType, ShiftTypeSchema} from "../time-management/models/shift-type.schema";
import {TimeException, TimeExceptionSchema} from "../time-management/models/time-exception.schema";
import {OvertimeRule, OvertimeRuleSchema} from "../time-management/models/overtime-rule.schema";
import {LeaveEntitlement, LeaveEntitlementSchema} from "../leaves/models/leave-entitlement.schema";
import {LeavePolicy, LeavePolicySchema} from "../leaves/models/leave-policy.schema";
import {LeaveCategory, LeaveCategorySchema} from "../leaves/models/leave-category.schema";
import {LeaveAdjustment, LeaveAdjustmentSchema} from "../leaves/models/leave-adjustment.schema";
import {
    EmployeeProfileAuditLog,
    EmployeeProfileAuditLogSchema
} from "../employee/models/audit/employee-profile-audit-log.schema";
import {
    PositionAssignment,
    PositionAssignmentSchema
} from "../organization-structure/models/position-assignment.schema";

@Global()
@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Position.name, schema: PositionSchema },
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: LeaveType.name, schema: LeaveTypeSchema },
            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: paySlip.name, schema: paySlipSchema },
            { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
            { name: claims.name, schema: claimsSchema },
            { name: disputes.name, schema: disputesSchema },
            { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
            { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
            { name: Application.name, schema: ApplicationSchema },
            { name: JobRequisition.name, schema: JobRequisitionSchema },
            { name: Interview.name, schema: InterviewSchema },
            { name: Offer.name, schema: OfferSchema },
            { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
            { name: Shift.name, schema: ShiftSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: paySlip.name, schema: paySlipSchema },
            { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
            { name: claims.name, schema: claimsSchema },
            { name: disputes.name, schema: disputesSchema },
            { name: AttendanceRecord.name, schema: AttendanceRecordSchema },

            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: EmployeeProfileAuditLog.name, schema: EmployeeProfileAuditLogSchema },
            { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
            { name: Department.name, schema: DepartmentSchema },
            { name: Position.name, schema: PositionSchema },
            { name: PositionAssignment.name, schema: PositionAssignmentSchema },

            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: paySlip.name, schema: paySlipSchema },
            { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
            { name: claims.name, schema: claimsSchema },
            { name: disputes.name, schema: disputesSchema },
            { name: AttendanceRecord.name, schema: AttendanceRecordSchema },

            { name: JobTemplate.name, schema: JobTemplateSchema },
            { name: JobRequisition.name, schema: JobRequisitionSchema },
            { name: Application.name, schema: ApplicationSchema },
            { name: ApplicationStatusHistory.name, schema: ApplicationStatusHistorySchema },
            { name: Referral.name, schema: ReferralSchema },
            { name: Interview.name, schema: InterviewSchema },
            { name: AssessmentResult.name, schema: AssessmentResultSchema },
            { name: Offer.name, schema: OfferSchema },
            { name: Contract.name, schema: ContractSchema },
            { name: Document.name, schema: DocumentSchema },
            { name: ClearanceChecklist.name, schema: ClearanceChecklistSchema },
            { name: Onboarding.name, schema: OnboardingSchema },
            { name: TerminationRequest.name, schema: TerminationRequestSchema },
            // Payroll Configuration schemas
            { name: allowance.name, schema: allowanceSchema },
            { name: taxRules.name, schema: taxRulesSchema },
            { name: insuranceBrackets.name, schema: insuranceBracketsSchema },
            { name: payGrade.name, schema: payGradeSchema },
            { name: payType.name, schema: payTypeSchema },
            { name: signingBonus.name, schema: signingBonusSchema },
            { name: payrollPolicies.name, schema: payrollPoliciesSchema },
            { name: terminationAndResignationBenefits.name, schema: terminationAndResignationBenefitsSchema },
            { name: CompanyWideSettings.name, schema: CompanyWideSettingsSchema },
            // Time Management schemas
            { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
            { name: Shift.name, schema: ShiftSchema },
            { name: ShiftType.name, schema: ShiftTypeSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: TimeException.name, schema: TimeExceptionSchema },
            { name: OvertimeRule.name, schema: OvertimeRuleSchema },
            // Leaves schemas
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: LeaveType.name, schema: LeaveTypeSchema },
            { name: LeaveEntitlement.name, schema: LeaveEntitlementSchema },
            { name: LeavePolicy.name, schema: LeavePolicySchema },
            { name: LeaveCategory.name, schema: LeaveCategorySchema },
            { name: LeaveAdjustment.name, schema: LeaveAdjustmentSchema },
        ]),
    ],
    controllers: [OpenAIController, HRAssistantController],
    providers: [OpenAIService, HRAssistantService],
    exports: [OpenAIService, HRAssistantService],
})
export class OpenAIModule {}
