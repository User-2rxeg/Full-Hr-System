import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationLogSchema, NotificationLog } from './models/notification-log.schema';
import { AttendanceCorrectionRequestSchema, AttendanceCorrectionRequest } from './models/attendance-correction-request.schema';
import { ShiftTypeSchema, ShiftType } from './models/shift-type.schema';
import { ScheduleRuleSchema, ScheduleRule } from './models/schedule-rule.schema';
import { AttendanceRecordSchema, AttendanceRecord } from './models/attendance-record.schema';
import { TimeExceptionSchema, TimeException } from './models/time-exception.schema';
import { OvertimeRuleSchema, OvertimeRule } from './models/overtime-rule.schema';
import { ShiftSchema, Shift } from './models/shift.schema';
import { ShiftAssignmentSchema, ShiftAssignment } from './models/shift-assignment.schema';
import { LatenessRule, latenessRuleSchema } from './models/lateness-rule.schema';
import { HolidaySchema, Holiday } from './models/holiday.schema';
import { payrollRuns, payrollRunsSchema } from '../payroll/payroll-execution/models/payrollRuns.schema';
import {AttendanceController} from "./controllers/AttendanceController";
import {TimeExceptionController} from "./controllers/TimeExceptionController";
import {AttendanceCorrectionController} from "./controllers/AttendanceCorrectionController";
import {ShiftManagementController} from "./controllers/ShiftManagementController";
import {AttendanceService} from "./services/AttendanceService";
import {TimeExceptionService} from "./services/TimeExceptionService";
import {AttendanceCorrectionService} from "./services/AttendanceCorrectionService";
import {ShiftManagementService} from "./services/ShiftManagementService";
import {HolidayService} from "./services/HolidayService";
import {RepeatedLatenessService} from "./services/RepeatedLatenessService";
import {HolidayController} from "./controllers/HolidayController";
import {NotificationController} from "./controllers/NotificationController";
import {AttendanceSyncController} from "./controllers/AttendanceSyncController";
import {ShiftExpiryScheduler} from "./services/ShiftExpiryScheduler";
import {NotificationService} from "./services/NotificationService";
import {AttendanceSyncService} from "./services/AttendanceSyncService";
import { EmployeeModule } from '../employee/employee.module';
import {EmployeeProfile, EmployeeProfileSchema} from "../employee/models/employee/employee-profile.schema";
import {BreakPermissionController} from "./controllers/BreakPermissionController";
import {BreakPermissionService} from "./services/BreakPermissionService";
import {AuthModule} from "../auth/auth.module";
import {TimeExceptionEscalationScheduler} from "./services/time-exception-escalation.scheduler";
import {TestSchedulersController} from "./controllers/test-schedulers.controller";
import {AttendanceDailySummaryScheduler} from "./services/attendance-daily-summary.scheduler";

@Module({
    imports:
        [MongooseModule.forFeature([
            { name: NotificationLog.name, schema: NotificationLogSchema },
            { name: AttendanceCorrectionRequest.name, schema: AttendanceCorrectionRequestSchema },
            { name: ShiftType.name, schema: ShiftTypeSchema },
            { name: payrollRuns.name, schema: payrollRunsSchema },
            { name: AttendanceCorrectionRequest.name, schema: AttendanceCorrectionRequestSchema },
            { name: ScheduleRule.name, schema: ScheduleRuleSchema },
            { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
            { name: TimeException.name, schema: TimeExceptionSchema },
            { name: OvertimeRule.name, schema: OvertimeRuleSchema },
            { name: Shift.name, schema: ShiftSchema },
            { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
            { name: LatenessRule.name, schema: latenessRuleSchema },
            { name: Holiday.name, schema: HolidaySchema },
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },


        ]),
            AuthModule,
        ],
    controllers: [AttendanceController,
        TimeExceptionController,
        AttendanceCorrectionController,
        HolidayController,
        ShiftManagementController,
        NotificationController,
        BreakPermissionController,
        AttendanceSyncController,
        TestSchedulersController],

    providers: [AttendanceService,
        TimeExceptionService,
        AttendanceCorrectionService,
        ShiftManagementService,
        HolidayService,
        ShiftExpiryScheduler,
        TimeExceptionEscalationScheduler,
        AttendanceDailySummaryScheduler,
        RepeatedLatenessService,
        NotificationService,
        BreakPermissionService,
        AttendanceSyncService],
    
    exports: [
        NotificationService,
        AttendanceService,
        HolidayService,
    ]
})
export class TimeManagementModule {}
