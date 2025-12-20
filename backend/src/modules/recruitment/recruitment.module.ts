import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from "@nestjs/mongoose";

// Models
import { Application, ApplicationSchema } from "./models/application.schema";
import { ApplicationStatusHistory, ApplicationStatusHistorySchema } from './models/application-history.schema';
import { AssessmentResult, AssessmentResultSchema } from "./models/assessment-result.schema";
import { ClearanceChecklist, ClearanceChecklistSchema } from "./models/clearance-checklist.schema";
import { JobTemplate, JobTemplateSchema } from './models/job-template.schema';
import { JobRequisition, JobRequisitionSchema } from './models/job-requisition.schema';

import { Referral, ReferralSchema } from './models/referral.schema';
import { Interview, InterviewSchema } from './models/interview.schema';
import { Offer, OfferSchema } from "./models/offer.schema";
import { Contract, ContractSchema } from "./models/contract.schema";
import { Document, DocumentSchema } from "./models/document.schema";
import { Onboarding, OnboardingSchema } from "./models/onboarding.schema";
import { TerminationRequest, TerminationRequestSchema } from "./models/termination-request.schema";

// Payroll Models for Integration
import { employeeSigningBonus, employeeSigningBonusSchema } from "../payroll/payroll-execution/models/EmployeeSigningBonus.schema";
import { signingBonus, signingBonusSchema } from "../payroll/payroll-configuration/models/signingBonus.schema";
import { employeePayrollDetails, employeePayrollDetailsSchema } from "../payroll/payroll-execution/models/employeePayrollDetails.schema";
import { payrollRuns, payrollRunsSchema } from "../payroll/payroll-execution/models/payrollRuns.schema";
import { EmployeeTerminationResignation, EmployeeTerminationResignationSchema } from "../payroll/payroll-execution/models/EmployeeTerminationResignation.schema";
import { terminationAndResignationBenefits, terminationAndResignationBenefitsSchema } from "../payroll/payroll-configuration/models/terminationAndResignationBenefits";

// Leaves Models for Offboarding Integration
import { LeaveEntitlement, LeaveEntitlementSchema } from "../leaves/models/leave-entitlement.schema";
import { LeaveRequest, LeaveRequestSchema } from "../leaves/models/leave-request.schema";
import { LeaveType, LeaveTypeSchema } from "../leaves/models/leave-type.schema";

// Employee Models
import { EmployeeProfile, EmployeeProfileSchema } from "../employee/models/employee/employee-profile.schema";
import { EmployeeSystemRole, EmployeeSystemRoleSchema } from "../employee/models/employee/employee-system-role.schema";
import { Candidate, CandidateSchema } from "../employee/models/employee/Candidate.Schema";
import { payGrade, payGradeSchema } from "../payroll/payroll-configuration/models/payGrades.schema";

// Payroll Module for Service Integration
import { PayrollExecutionModule } from "../payroll/payroll-execution/payroll-execution.module";
import { PayrollConfigurationModule } from "../payroll/payroll-configuration/payroll-configuration.module";

// controllers
import { RecruitmentController } from "./controllers/recruitment.controller";
import { OffboardingController } from "./controllers/offboarding.controller";
import { OnboardingController } from "./controllers/onboarding.controller";

// services
import { RecruitmentService } from "./services/recruitment.service";
import { OffboardingService } from "./services/offboarding.service";
import { OnboardingService } from "./services/onboarding.service";

// Shared Module
import { SharedModule } from "../shared/shared.module";
import { AuthModule } from "../auth/auth-module";


@Module({
    imports: [
        AuthModule,
        forwardRef(() => PayrollExecutionModule),
        forwardRef(() => PayrollConfigurationModule),
        MongooseModule.forFeature([
            // Recruitment Models
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
            // Payroll Models for Integration
            { name: employeeSigningBonus.name, schema: employeeSigningBonusSchema },
            { name: signingBonus.name, schema: signingBonusSchema },
            { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: EmployeeTerminationResignation.name, schema: EmployeeTerminationResignationSchema },
            { name: terminationAndResignationBenefits.name, schema: terminationAndResignationBenefitsSchema },
            { name: payGrade.name, schema: payGradeSchema },
            // Leaves Models for Offboarding Integration
            { name: LeaveEntitlement.name, schema: LeaveEntitlementSchema },
            { name: LeaveRequest.name, schema: LeaveRequestSchema },
            { name: LeaveType.name, schema: LeaveTypeSchema },
            // Employee Models
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
            { name: Candidate.name, schema: CandidateSchema },
        ]),
        SharedModule,
    ],
    controllers: [RecruitmentController, OnboardingController, OffboardingController],
    providers: [RecruitmentService, OnboardingService, OffboardingService],
    exports: [RecruitmentService, OnboardingService, OffboardingService]
})
export class RecruitmentModule { }

