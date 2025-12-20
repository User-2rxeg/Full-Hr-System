import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Candidate, CandidateSchema } from './models/employee/Candidate.Schema';
import { EmployeeProfile, EmployeeProfileSchema } from './models/employee/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from './models/employee/employee-system-role.schema';
import {
  EmployeeQualification,
  EmployeeQualificationSchema,
} from './models/employee/qualification.schema';
import {
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeRequestSchema
} from "./models/employee/ep-change-request.schema";
import {
  EmployeeProfileAuditLog,
  EmployeeProfileAuditLogSchema
} from "./models/audit/employee-profile-audit-log.schema";
import { OrganizationStructureModule } from './organization-structure.module';
import { EmployeeProfileController } from "./controllers/employee-profile.controller";


import { EmployeeProfileService } from "./services/employee-profile.service";
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from "../auth/auth-module";


@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: EmployeeQualification.name, schema: EmployeeQualificationSchema },
      { name: EmployeeProfileChangeRequest.name, schema: EmployeeProfileChangeRequestSchema },
      { name: EmployeeProfileAuditLog.name, schema: EmployeeProfileAuditLogSchema },
    ]),
    OrganizationStructureModule,
    SharedModule,
  ],
  // Production mode - using authenticated controller
  controllers: [EmployeeProfileController],
  // Testing mode - no-auth controller (disabled for production)
  // controllers: [EmployeeProfileNoAuthController],
  providers: [EmployeeProfileService],
  exports: [EmployeeProfileService],
})
export class EmployeeModule { }
