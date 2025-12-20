import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// import controller and services 
import { PayrollExecutionController } from './controllers/payroll-execution.controller';
import { PayrollExecutionService } from './services/payroll-execution.service';
// import schemas from payroll-configuration subsystem
import { terminationAndResignationBenefits, terminationAndResignationBenefitsSchema } from '../payroll-configuration/models/terminationAndResignationBenefits';
import { signingBonus, signingBonusSchema } from '../payroll-configuration/models/signingBonus.schema';
// import schemas from current subsystem
import { employeePayrollDetails, employeePayrollDetailsSchema } from './models/employeePayrollDetails.schema';
// payrollDraft schema removed - drafts are no longer used
import { employeePenalties, employeePenaltiesSchema } from './models/employeePenalties.schema';
import { employeeSigningBonus, employeeSigningBonusSchema } from './models/EmployeeSigningBonus.schema';
import { EmployeeTerminationResignation, EmployeeTerminationResignationSchema } from './models/EmployeeTerminationResignation.schema';
import { payrollRuns, payrollRunsSchema } from './models/payrollRuns.schema';
import { paySlip, paySlipSchema } from './models/payslip.schema';
import { PayCalculatorService } from './services/payCalculator.service';
// import payroll-tracking module
import { PayrollTrackingModule } from '../payroll-tracking/payroll-tracking.module';
// import payroll-configuration-requirements module
import { PayrollConfigurationModule } from '../payroll-configuration/payroll-configuration.module';
// import time-management module
import { TimeManagementModule } from '../../time-management/time-management.module';
import { AttendanceRecord, AttendanceRecordSchema } from '../../time-management/models/attendance-record.schema';
// import employee module
import { EmployeeModule } from '../../employee/employee.module';
// import leaves module
import { LeavesModule } from '../../leaves/leaves.module';
// import auth module for guards/services
import { AuthModule } from '../../auth/auth-module';
// import shared module for SharedPayrollService
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [forwardRef(() => PayrollTrackingModule), PayrollConfigurationModule, TimeManagementModule, EmployeeModule, LeavesModule, AuthModule, SharedModule,
  MongooseModule.forFeature([
    { name: payrollRuns.name, schema: payrollRunsSchema },
    { name: paySlip.name, schema: paySlipSchema },
    { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
    // payrollDraft entries removed
    { name: employeeSigningBonus.name, schema: employeeSigningBonusSchema },
    { name: EmployeeTerminationResignation.name, schema: EmployeeTerminationResignationSchema },
    { name: terminationAndResignationBenefits.name, schema: terminationAndResignationBenefitsSchema },
    { name: signingBonus.name, schema: signingBonusSchema },
    { name: employeePenalties.name, schema: employeePenaltiesSchema },
    { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
  ])],
  controllers: [PayrollExecutionController],
  providers: [PayrollExecutionService, PayCalculatorService],
  exports: [PayrollExecutionService]
})
export class PayrollExecutionModule { }
