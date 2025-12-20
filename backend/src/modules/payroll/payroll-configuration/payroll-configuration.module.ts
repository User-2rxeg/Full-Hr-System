import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { PayrollConfigurationController } from './controllers/payroll-configuration.controller';
import { PayrollConfigurationService } from './services/payroll-configuration.service';
import { EmployeeModule } from '../../employee/employee.module';
import { OrganizationStructureModule } from '../../employee/organization-structure.module';


import { CompanyWideSettings, CompanyWideSettingsSchema } from './models/CompanyWideSettings.schema';
import { allowance, allowanceSchema } from './models/allowance.schema';
import { insuranceBrackets, insuranceBracketsSchema } from './models/insuranceBrackets.schema';
import { payrollPolicies, payrollPoliciesSchema } from './models/payrollPolicies.schema';
import { payType, payTypeSchema } from './models/payType.schema';
import { signingBonus, signingBonusSchema } from './models/signingBonus.schema';
import { taxRules, taxRulesSchema } from './models/taxRules.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsSchema } from './models/terminationAndResignationBenefits';
import { payGrade, payGradeSchema } from './models/payGrades.schema';
import {RecruitmentModule} from "../../recruitment/recruitment.module";
import { EmployeeProfile, EmployeeProfileSchema } from '../../employee/models/employee/employee-profile.schema';
import { AuthModule } from '../../auth/auth-module';




@Module({
  imports: [
    ScheduleModule.forRoot(),
    EmployeeModule,
    OrganizationStructureModule,
    RecruitmentModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: allowance.name, schema: allowanceSchema },
      { name: signingBonus.name, schema: signingBonusSchema },
      { name: taxRules.name, schema: taxRulesSchema },
      { name: insuranceBrackets.name, schema: insuranceBracketsSchema },
      { name: payType.name, schema: payTypeSchema },
      { name: payrollPolicies.name, schema: payrollPoliciesSchema },
      { name: terminationAndResignationBenefits.name, schema: terminationAndResignationBenefitsSchema },
      { name: CompanyWideSettings.name, schema: CompanyWideSettingsSchema },
      { name: payGrade.name, schema: payGradeSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema }
    ]),
  ],
  controllers: [PayrollConfigurationController],
  providers: [ PayrollConfigurationService ],
  exports: [ PayrollConfigurationService ],
})
export class PayrollConfigurationModule { }
