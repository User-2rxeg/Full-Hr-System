import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Department, DepartmentSchema } from './models/organization-structure/department.schema';
import {Position,PositionSchema} from './models/organization-structure/position.schema'
import { PositionAssignmentSchema,PositionAssignment } from './models/organization-structure/position-assignment.schema';
import { StructureApproval,StructureApprovalSchema } from './models/organization-structure/structure-approval.schema';
import { StructureChangeLog,StructureChangeLogSchema } from './models/organization-structure/structure-change-log.schema';
import { StructureChangeRequest,StructureChangeRequestSchema } from './models/organization-structure/structure-change-request.schema';
// COMMENTED OUT FOR TESTING - Using no-auth controller
import {OrganizationStructureController} from "./controllers/organization-structure.controller";
//import {OrganizationStructureNoAuthController} from "./controllers/organization-structure-no-auth.controller";
import {OrganizationStructureService} from "./services/organization-structure.service";
import { SharedModule } from '../shared/shared.module';
import {AuthModule} from "../auth/auth-module";


@Module({
  imports: [
        AuthModule,
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      { name: StructureApproval.name, schema: StructureApprovalSchema },
      { name: StructureChangeLog.name, schema: StructureChangeLogSchema },
      {name: StructureChangeRequest.name,schema: StructureChangeRequestSchema,},
    ]),
    SharedModule,
  ],
  // COMMENTED OUT FOR TESTING - Using no-auth controller
  // controllers: [OrganizationStructureController],
  controllers: [OrganizationStructureController],
  providers: [OrganizationStructureService],
  exports: [OrganizationStructureService],
})
export class OrganizationStructureModule {}
