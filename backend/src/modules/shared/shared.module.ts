import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationLog, NotificationLogSchema } from '../time-management/models/notification-log.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleSchema } from '../employee/models/employee/employee-system-role.schema';
import { Candidate, CandidateSchema } from '../employee/models/employee/Candidate.Schema';
import { AppraisalRecord, AppraisalRecordSchema } from '../employee/models/performance/appraisal-record.schema';

import { AuthModule } from '../auth/auth-module';
import { SharedRecruitmentService } from './services/shared-recruitment.service';
import { SharedEmployeeService } from './services/shared-employee.service';
import { SharedOrganizationService } from './services/shared-organization.service';
import { SharedPerformanceService } from './services/shared-performance.service';
import { SharedLeavesService } from './services/shared-leaves.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: NotificationLog.name, schema: NotificationLogSchema },
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
            { name: Candidate.name, schema: CandidateSchema },
            { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
        ]),
        forwardRef(() => AuthModule),
    ],
    providers: [SharedRecruitmentService, SharedEmployeeService, SharedOrganizationService, SharedPerformanceService, SharedLeavesService],
    exports: [SharedRecruitmentService, SharedEmployeeService, SharedOrganizationService, SharedPerformanceService, SharedLeavesService],
})
export class SharedModule {}
