import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import controllers and services of the current subsystem
import { PayrollTrackingController } from './controllers/payroll-tracking.controller';
import { PayrollTrackingService } from './services/payroll-tracking.service';
// import schemas of the current subsystem
import { refunds, refundsSchema } from './models/refunds.schema';
import { claims, claimsSchema } from './models/claims.schema';
import { disputes, disputesSchema } from './models/disputes.schema';
import { PayrollExecutionModule } from "../payroll-execution/payroll-execution.module";
import { paySlip, paySlipSchema } from "../payroll-execution/models/payslip.schema";
import { employeePayrollDetails, employeePayrollDetailsSchema } from "../payroll-execution/models/employeePayrollDetails.schema";
import { payrollRuns, payrollRunsSchema } from "../payroll-execution/models/payrollRuns.schema";
import { PayrollConfigurationModule } from "../payroll-configuration/payroll-configuration.module";
import { EmployeeModule } from "../../employee/employee.module";
import { EmployeeProfile, EmployeeProfileSchema } from "../../employee/models/employee/employee-profile.schema";
import { Department, DepartmentSchema } from "../../employee/models/organization-structure/department.schema";
import { LeavesModule } from "../../leaves/leaves.module";
import { TimeManagementModule } from "../../time-management/time-management.module";
import { AuthModule } from "../../auth/auth-module";
// Time Management schemas for attendance-based deductions
import { AttendanceRecord, AttendanceRecordSchema } from "../../time-management/models/attendance-record.schema";
import { TimeException, TimeExceptionSchema } from "../../time-management/models/time-exception.schema";
import { ShiftAssignment, ShiftAssignmentSchema } from "../../time-management/models/shift-assignment.schema";
import { Shift, ShiftSchema } from "../../time-management/models/shift.schema";
// import payroll-execution module & schemas


@Module({
  imports: [
    PayrollConfigurationModule,
    EmployeeModule,
    LeavesModule,
    TimeManagementModule,
    AuthModule,
    forwardRef(() => PayrollExecutionModule),
    MongooseModule.forFeature([
      { name: refunds.name, schema: refundsSchema },
      { name: claims.name, schema: claimsSchema },
      { name: disputes.name, schema: disputesSchema },
      { name: paySlip.name, schema: paySlipSchema },
      { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: Department.name, schema: DepartmentSchema },
      // Time Management schemas for attendance-based deductions
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
      { name: TimeException.name, schema: TimeExceptionSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [PayrollTrackingController],
  providers: [PayrollTrackingService],
  exports: [PayrollTrackingService],
})
export class PayrollTrackingModule { }
