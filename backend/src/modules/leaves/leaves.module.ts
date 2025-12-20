import { Module } from '@nestjs/common';
import {MongooseModule} from "@nestjs/mongoose";

import {UnifiedLeaveService} from "./services/leaves.service";
import {LeaveRequest, LeaveRequestSchema} from "./models/leave-request.schema";
import {LeavePolicy, LeavePolicySchema} from "./models/leave-policy.schema";
import {LeaveEntitlement, LeaveEntitlementSchema} from "./models/leave-entitlement.schema";
import {LeaveCategory, LeaveCategorySchema} from "./models/leave-category.schema";
import {LeaveAdjustment, LeaveAdjustmentSchema} from "./models/leave-adjustment.schema";
import {Calendar, CalendarSchema} from "./models/calendar.schema";
import {Attachment, AttachmentSchema} from "./models/attachment.schema";
import {UnifiedLeaveController} from "./controllers/leaves.controller";
import {LeaveType, LeaveTypeSchema} from "./models/leave-type.schema";
import {SharedModule} from "../shared/shared.module";
import {AuthModule} from "../auth/auth-module";


@Module({
  imports:[
      AuthModule,
      MongooseModule.forFeature([{name:LeaveType.name,schema:LeaveTypeSchema},
    {name:LeaveRequest.name, schema: LeaveRequestSchema},
    {name:LeavePolicy.name, schema:LeavePolicySchema},
    {name:LeaveEntitlement.name, schema:LeaveEntitlementSchema},
    {name: LeaveCategory.name, schema:LeaveCategorySchema},
    {name: LeaveAdjustment.name, schema:LeaveAdjustmentSchema},
    {name:Calendar.name, schema:CalendarSchema},
    {name:Attachment.name, schema: AttachmentSchema}
  ]),
      SharedModule,
  ],
  controllers: [UnifiedLeaveController],
  providers: [UnifiedLeaveService],
  exports:[UnifiedLeaveService]
})
export class LeavesModule {}
