import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from "@nestjs/mongoose";

import { UnifiedLeaveService } from "./services/leaves.service";
import { LeaveRequest, LeaveRequestSchema } from "./models/leave-request.schema";
import { LeavePolicy, LeavePolicySchema } from "./models/leave-policy.schema";
import { LeaveEntitlement, LeaveEntitlementSchema } from "./models/leave-entitlement.schema";
import { LeaveCategory, LeaveCategorySchema } from "./models/leave-category.schema";
import { LeaveAdjustment, LeaveAdjustmentSchema } from "./models/leave-adjustment.schema";
import { Calendar, CalendarSchema } from "./models/calendar.schema";
import { Attachment, AttachmentSchema } from "./models/attachment.schema";
import { UnifiedLeaveController } from "./controllers/leaves.controller";
import { LeaveType, LeaveTypeSchema } from "./models/leave-type.schema";
import { IntegrationModule } from "../integration/Integration.module";
import { AuthModule } from "../auth/auth.module";
import { OrganizationStructureModule } from "../organization-structure/organization-structure.module";
import { EmployeeModule } from "../employee/employee.module";
import { TimeManagementModule } from "../time-management/time-management.module";

/**
 * LeavesModule - Comprehensive Leave Management System
 *
 * Implements all 42 requirements from leaves.requirements document:
 * - Phase 1: Policy Configuration (REQ-001 to REQ-014)
 * - Phase 2: Leave Request Workflow (REQ-015 to REQ-031)
 * - Phase 3: Tracking & Integration (REQ-031 to REQ-042)
 *
 * Integrations:
 * - EmployeeModule: Employee profiles, tenure, contract types (REQ-003, REQ-008)
 * - OrganizationStructureModule: Approval hierarchy, positions (REQ-009, REQ-020)
 * - TimeManagementModule: Work schedules, attendance sync (REQ-010, REQ-042)
 * - IntegrationModule: Notifications, shared services (REQ-019, REQ-024, REQ-030)
 * - AuthModule: Role-based access control (REQ-002, REQ-014)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeavePolicy.name, schema: LeavePolicySchema },
      { name: LeaveEntitlement.name, schema: LeaveEntitlementSchema },
      { name: LeaveCategory.name, schema: LeaveCategorySchema },
      { name: LeaveAdjustment.name, schema: LeaveAdjustmentSchema },
      { name: Calendar.name, schema: CalendarSchema },
      { name: Attachment.name, schema: AttachmentSchema }
    ]),
    AuthModule,
    IntegrationModule,
    OrganizationStructureModule,
    EmployeeModule,
    TimeManagementModule,
    // Note: PayrollTrackingModule integration is handled via IntegrationModule
    // to avoid circular dependencies
  ],
  controllers: [UnifiedLeaveController],
  providers: [UnifiedLeaveService],
  exports: [UnifiedLeaveService]
})
export class LeavesModule { }
