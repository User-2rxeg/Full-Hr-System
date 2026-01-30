import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee/models/employee/employee-profile.schema';
import { EmployeeProfileAuditLog, EmployeeProfileAuditLogSchema } from '../employee/models/audit/employee-profile-audit-log.schema';
import { AppraisalRecord, AppraisalRecordSchema } from '../performance/models/appraisal-record.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { PositionAssignment, PositionAssignmentSchema } from '../organization-structure/models/position-assignment.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll/payroll-execution/models/payrollRuns.schema';
import { paySlip, paySlipSchema } from '../payroll/payroll-execution/models/payslip.schema';
import { employeePayrollDetails, employeePayrollDetailsSchema } from '../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { claims, claimsSchema } from '../payroll/payroll-tracking/models/claims.schema';
import { disputes, disputesSchema } from '../payroll/payroll-tracking/models/disputes.schema';
import { AttendanceRecord, AttendanceRecordSchema } from '../time-management/models/attendance-record.schema';
import { AnalyticsController } from "./controllers/analytics.controller";
import { AnalyticsService } from "./services/analytics.service";
import { ProfileAnalyticsService } from "./services/profile-analytics.service";
import { PayrollAnalyticsService } from "./services/payroll-analytics.service";
import { WorkforceAnalyticsService } from "./services/workforce-analytics.service";
import { OrgStructureAnalyticsService } from "./services/org-structure-analytics.service";
import { EmployeeAnalyticsController } from "./controllers/employee-analytics.controller";
import { PayrollAnalyticsController } from "./controllers/payroll-analytics.controller";
import { WorkforceAnalyticsController } from "./controllers/workforce-analytics.controller";
import { OrgStructureAnalyticsController } from "./controllers/org-structure-analytics.controller";
import { AuthModule } from "../auth/auth.module";
import { RecruitmentAnalyticsService } from './services/recruitment-analytics.service';
import { OnboardingAnalyticsService } from './services/onboarding-analytics.service';
import { OffboardingAnalyticsService } from './services/offboarding-analytics.service';
import { LifecycleAnalyticsService } from './services/lifecycle-analytics.service';
import { LifecycleAnalyticsController } from './controllers/lifecycle-analytics.controller';
import { OnboardingAnalyticsController } from './controllers/onboarding-analytics.controller';
import { OffboardingAnalyticsController } from './controllers/offboarding-analytics.controller';
import { RecruitmentAnalyticsController } from './controllers/recruitment-analytics.controller';
import { TerminationRequest, TerminationRequestSchema } from '../recruitment/models/termination-request.schema';
import { ClearanceChecklist, ClearanceChecklistSchema } from '../recruitment/models/clearance-checklist.schema';
import { Contract, ContractSchema } from '../recruitment/models/contract.schema';
import { Document, DocumentSchema } from '../recruitment/models/document.schema';
import { Onboarding, OnboardingSchema } from '../recruitment/models/onboarding.schema'; 
import { JobTemplate, JobTemplateSchema } from '../recruitment/models/job-template.schema';
import { JobRequisition, JobRequisitionSchema } from '../recruitment/models/job-requisition.schema';
import { Application, ApplicationSchema } from '../recruitment/models/application.schema';
import { ApplicationStatusHistory, ApplicationStatusHistorySchema } from '../recruitment/models/application-history.schema';
import { Referral, ReferralSchema } from '../recruitment/models/referral.schema';
import { Interview, InterviewSchema } from '../recruitment/models/interview.schema';
import { AssessmentResult, AssessmentResultSchema } from '../recruitment/models/assessment-result.schema';
import { Offer, OfferSchema } from '../recruitment/models/offer.schema';
// Payroll Configuration imports
import { allowance, allowanceSchema } from '../payroll/payroll-configuration/models/allowance.schema';
import { taxRules, taxRulesSchema } from '../payroll/payroll-configuration/models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsSchema } from '../payroll/payroll-configuration/models/insuranceBrackets.schema';
import { payGrade, payGradeSchema } from '../payroll/payroll-configuration/models/payGrades.schema';
import { payType, payTypeSchema } from '../payroll/payroll-configuration/models/payType.schema';
import { signingBonus, signingBonusSchema } from '../payroll/payroll-configuration/models/signingBonus.schema';
import { payrollPolicies, payrollPoliciesSchema } from '../payroll/payroll-configuration/models/payrollPolicies.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsSchema } from '../payroll/payroll-configuration/models/terminationAndResignationBenefits';
import { CompanyWideSettings, CompanyWideSettingsSchema } from '../payroll/payroll-configuration/models/CompanyWideSettings.schema';
import { PayrollConfigurationAnalyticsService } from './services/payroll-configuration-analytics.service';
import { PayrollConfigurationAnalyticsController } from './controllers/payroll-configuration-analytics.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
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
        ]),
        AuthModule,
    ],
    controllers: [
        AnalyticsController, 
        EmployeeAnalyticsController, 
        PayrollAnalyticsController, 
        WorkforceAnalyticsController,
        OrgStructureAnalyticsController,
        LifecycleAnalyticsController,
        OnboardingAnalyticsController,
        OffboardingAnalyticsController,
        RecruitmentAnalyticsController,
        PayrollConfigurationAnalyticsController,
    ],
    providers: [
        AnalyticsService, 
        ProfileAnalyticsService, 
        PayrollAnalyticsService, 
        WorkforceAnalyticsService,
        OrgStructureAnalyticsService,
         RecruitmentAnalyticsService,
        OnboardingAnalyticsService,
        OffboardingAnalyticsService,
        LifecycleAnalyticsService,
        PayrollConfigurationAnalyticsService,
    ],
    exports: [
        AnalyticsService, 
        ProfileAnalyticsService, 
        PayrollAnalyticsService, 
        WorkforceAnalyticsService,
        OrgStructureAnalyticsService,
        RecruitmentAnalyticsService,
        OnboardingAnalyticsService,
        OffboardingAnalyticsService,
        LifecycleAnalyticsService,
        PayrollConfigurationAnalyticsService,
    ],
})
export class AnalyticsModule { }
