import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpStatus,
    HttpCode,
    UsePipes,
    ValidationPipe,
    Put,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../../auth/guards/authorization-guard';
import { Roles } from '../../../auth/decorators/roles-decorator';
import { SystemRole } from '../../../employee/enums/employee-profile.enums';
import { PayrollConfigurationService } from '../services/payroll-configuration.service';
import { CreatePayrollPolicyDto } from '../dto/create-payroll-policy.dto';
import { UpdatePayrollPolicyDto } from '../dto/update-payroll-policy.dto';
import { QueryPayrollPolicyDto } from '../dto/query-payroll-policy.dto';
import { ApprovePayrollPolicyDto } from '../dto/approve-payroll-policy.dto';
import { CreatePayTypeDto } from '../dto/create-pay-type.dto';
import { UpdatePayTypeDto } from '../dto/update-pay-type.dto';
import { QueryPayTypeDto } from '../dto/query-pay-type.dto';
import { ApprovePayTypeDto } from '../dto/approve-pay-type.dto';
import { CreateAllowanceDto } from '../dto/create-allowance.dto';
import { UpdateAllowanceDto } from '../dto/update-allowance.dto';
import { QueryAllowanceDto } from '../dto/query-allowance.dto';
import { ApproveAllowanceDto } from '../dto/approve-allowance.dto';
import { CreateSigningBonusDto } from '../dto/create-signing-bonus.dto';
import { UpdateSigningBonusDto } from '../dto/update-signing-bonus.dto';
import { QuerySigningBonusDto } from '../dto/query-signing-bonus.dto';
import { ApproveSigningBonusDto } from '../dto/approve-signing-bonus.dto';
import { CreateTerminationBenefitDto } from '../dto/create-termination-benefit.dto';
import { UpdateTerminationBenefitDto } from '../dto/update-termination-benefit.dto';
import { QueryTerminationBenefitDto } from '../dto/query-termination-benefit.dto';
import { ApproveTerminationBenefitDto } from '../dto/approve-termination-benefit.dto';
import { CreateTaxRuleDto } from '../dto/create-tax-rule.dto';
import { UpdateTaxRuleDto } from '../dto/update-tax-rule.dto';
import { ApproveTaxRuleDto } from '../dto/approve-tax-rule.dto';
import { CreateInsuranceDto } from '../dto/create-insurance.dto';
import { UpdateInsuranceDto } from '../dto/update-insurance.dto';
import { ApproveInsuranceDto } from '../dto/approve-insurance.dto';
import { UpdateCompanyWideSettingsDto } from '../dto/update-company-settings.dto';
import { ApproveConfigDto } from '../dto/approve-config.dto';
import { CreatePayGradeDto } from '../dto/create-paygrade.dto';
import { UpdatePayGradeDto } from '../dto/update-paygrade.dto';

@Controller('payroll-configuration-requirements')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollConfigurationController {
    constructor(
        private readonly payrollConfigService: PayrollConfigurationService,
    ) {}

    // ========== LAMA'S TAX RULES ENDPOINTS ==========
    @Post('tax-rules')
    @Roles(SystemRole.LEGAL_POLICY_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    createTaxRule(@Body() dto: CreateTaxRuleDto) {
        return this.payrollConfigService.createTaxRule(dto);
    }

    @Get('tax-rules')
    @HttpCode(HttpStatus.OK)
    getTaxRules() {
        return this.payrollConfigService.getTaxRules();
    }

    @Get('tax-rules/:id')
    @HttpCode(HttpStatus.OK)
    getTaxRuleById(@Param('id') id: string) {
        return this.payrollConfigService.getTaxRuleById(id);
    }

    @Patch('tax-rules/:id')
    @Roles(SystemRole.PAYROLL_MANAGER , SystemRole.LEGAL_POLICY_ADMIN)
    @HttpCode(HttpStatus.OK)
    updateLegalRule(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
        return this.payrollConfigService.updateLegalRule(id, dto);
    }

    @Patch('tax-rules/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    approveTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
        return this.payrollConfigService.approveTaxRule(id, dto);
    }

    @Delete('tax-rules/:id')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    deleteTaxRule(@Param('id') id: string) {
        return this.payrollConfigService.deleteTaxRule(id);
    }

    @Patch('tax-rules/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    rejectTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
        return this.payrollConfigService.rejectTaxRule(id, dto);
    }

    // ========== LAMA'S INSURANCE BRACKETS ENDPOINTS ==========
    @Post('insurance-brackets')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    createInsurance(@Body() dto: CreateInsuranceDto) {
        return this.payrollConfigService.createInsuranceBracket(dto);
    }

    @Get('insurance-brackets')
    @HttpCode(HttpStatus.OK)
    getInsuranceBrackets() {
        return this.payrollConfigService.getInsuranceBrackets();
    }

    @Get('insurance-brackets/:id')
    @HttpCode(HttpStatus.OK)
    getInsuranceBracketById(@Param('id') id: string) {
        return this.payrollConfigService.getInsuranceBracketById(id);
    }

    @Patch('insurance-brackets/:id')
    @HttpCode(HttpStatus.OK)
    updateInsurance(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
        return this.payrollConfigService.updateInsuranceBracket(id, dto);
    }

    @Patch('insurance-brackets/:id/approve')
    @Roles(SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    approveInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
        return this.payrollConfigService.approveInsuranceBracket(id, dto);
    }

    @Delete('insurance-brackets/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    deleteInsurance(@Param('id') id: string) {
        return this.payrollConfigService.deleteInsuranceBracket(id);
    }

    @Patch('insurance-brackets/:id/reject')
    @Roles(SystemRole.HR_MANAGER)
    @HttpCode(HttpStatus.OK)
    rejectInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
        return this.payrollConfigService.rejectInsuranceBracket(id, dto);
    }

  @Get('insurance-brackets/:id/calculate-contributions')
@HttpCode(HttpStatus.OK)
async calculateContributions(
    @Param('id') id: string,
    @Query('salary') salary: string,
) {
    const numericSalary = Number(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
        throw new BadRequestException('Salary must be a positive number');
    }

    const bracket = await this.payrollConfigService.getInsuranceBracketById(id);
    const result = this.payrollConfigService.calculateContributions(bracket, numericSalary);

    // Always return result even if invalid
    return result;
}


    // ========== DAREEN'S PAYROLL POLICIES ENDPOINTS ==========
    @Post('policies')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createDto: CreatePayrollPolicyDto) {
        const policy = await this.payrollConfigService.create(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Payroll policy created successfully as DRAFT',
            data: policy,
        };
    }

    @Get('policies/all')
    @HttpCode(HttpStatus.OK)
    async findAll(@Query() queryDto: QueryPayrollPolicyDto) {
        const result = await this.payrollConfigService.findAll(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policies retrieved successfully',
            ...result,
        };
    }

    @Get('policies/:id')
    @HttpCode(HttpStatus.OK)
    async findOne(@Param('id') id: string) {
        const policy = await this.payrollConfigService.findOne(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy retrieved successfully',
            data: policy,
        };
    }

    @Patch('policies/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.update(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy updated successfully',
            data: policy,
        };
    }

    @Delete('policies/:id')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async remove(@Param('id') id: string) {
        const result = await this.payrollConfigService.remove(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('policies/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approve(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.approve(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy approved successfully',
            data: policy,
        };
    }

    @Patch('policies/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async reject(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayrollPolicyDto,
    ) {
        const policy = await this.payrollConfigService.reject(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Payroll policy rejected successfully',
            data: policy,
        };
    }

    // ========== DAREEN'S PAY TYPES ENDPOINTS ==========
    @Post('pay-types')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createPayType(@Body() createDto: CreatePayTypeDto) {
        const payType = await this.payrollConfigService.createPayType(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Pay type created successfully as DRAFT',
            data: payType,
        };
    }

    @Get('pay-types/all')
    @HttpCode(HttpStatus.OK)
    async findAllPayTypes(@Query() queryDto: QueryPayTypeDto) {
        const result = await this.payrollConfigService.findAllPayTypes(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay types retrieved successfully',
            ...result,
        };
    }

    @Get('pay-types/:id')
    @HttpCode(HttpStatus.OK)
    async findOnePayType(@Param('id') id: string) {
        const payType = await this.payrollConfigService.findOnePayType(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type retrieved successfully',
            data: payType,
        };
    }

    @Patch('pay-types/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updatePayType(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.updatePayType(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type updated successfully',
            data: payType,
        };
    }

    @Delete('pay-types/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removePayType(@Param('id') id: string) {
        const result = await this.payrollConfigService.removePayType(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('pay-types/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approvePayType(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.approvePayType(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type approved successfully',
            data: payType,
        };
    }

    @Patch('pay-types/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectPayType(
        @Param('id') id: string,
        @Body() approveDto: ApprovePayTypeDto,
    ) {
        const payType = await this.payrollConfigService.rejectPayType(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay type rejected successfully',
            data: payType,
        };
    }

    // ========== DAREEN'S ALLOWANCE ENDPOINTS ==========
    @Post('allowances')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createAllowance(@Body() createDto: CreateAllowanceDto) {
        const allowance = await this.payrollConfigService.createAllowance(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Allowance created successfully as DRAFT',
            data: allowance,
        };
    }

    @Get('allowances/all')
    @HttpCode(HttpStatus.OK)
    async findAllAllowances(@Query() queryDto: QueryAllowanceDto) {
        const result = await this.payrollConfigService.findAllAllowances(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowances retrieved successfully',
            ...result,
        };
    }

    @Get('allowances/:id')
    @HttpCode(HttpStatus.OK)
    async findOneAllowance(@Param('id') id: string) {
        const allowance = await this.payrollConfigService.findOneAllowance(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance retrieved successfully',
            data: allowance,
        };
    }

    @Patch('allowances/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateAllowance(
        @Param('id') id: string,
        @Body() updateDto: UpdateAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.updateAllowance(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance updated successfully',
            data: allowance,
        };
    }

    @Delete('allowances/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeAllowance(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeAllowance(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('allowances/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveAllowance(
        @Param('id') id: string,
        @Body() approveDto: ApproveAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.approveAllowance(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance approved successfully',
            data: allowance,
        };
    }

    @Patch('allowances/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectAllowance(
        @Param('id') id: string,
        @Body() approveDto: ApproveAllowanceDto,
    ) {
        const allowance = await this.payrollConfigService.rejectAllowance(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Allowance rejected successfully',
            data: allowance,
        };
    }

    // ========== DAREEN'S SIGNING BONUS ENDPOINTS ==========
    @Post('signing-bonuses')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createSigningBonus(@Body() createDto: CreateSigningBonusDto) {
        const signingBonus = await this.payrollConfigService.createSigningBonus(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Signing bonus created successfully as DRAFT',
            data: signingBonus,
        };
    }

    @Get('signing-bonuses/all')
    @HttpCode(HttpStatus.OK)
    async findAllSigningBonuses(@Query() queryDto: QuerySigningBonusDto) {
        const result = await this.payrollConfigService.findAllSigningBonuses(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonuses retrieved successfully',
            ...result,
        };
    }

    @Get('signing-bonuses/:id')
    @HttpCode(HttpStatus.OK)
    async findOneSigningBonus(@Param('id') id: string) {
        const signingBonus = await this.payrollConfigService.findOneSigningBonus(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus retrieved successfully',
            data: signingBonus,
        };
    }

    @Patch('signing-bonuses/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateSigningBonus(
        @Param('id') id: string,
        @Body() updateDto: UpdateSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.updateSigningBonus(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus updated successfully',
            data: signingBonus,
        };
    }

    @Delete('signing-bonuses/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeSigningBonus(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeSigningBonus(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('signing-bonuses/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveSigningBonus(
        @Param('id') id: string,
        @Body() approveDto: ApproveSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.approveSigningBonus(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus approved successfully',
            data: signingBonus,
        };
    }

    @Patch('signing-bonuses/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectSigningBonus(
        @Param('id') id: string,
        @Body() approveDto: ApproveSigningBonusDto,
    ) {
        const signingBonus = await this.payrollConfigService.rejectSigningBonus(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Signing bonus rejected successfully',
            data: signingBonus,
        };
    }

    // ========== DAREEN'S TERMINATION BENEFITS ENDPOINTS ==========
    @Post('termination-benefits')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.CREATED)
    async createTerminationBenefit(@Body() createDto: CreateTerminationBenefitDto) {
        const benefit = await this.payrollConfigService.createTerminationBenefit(createDto);
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Termination benefit created successfully as DRAFT',
            data: benefit,
        };
    }

    @Get('termination-benefits/all')
    @HttpCode(HttpStatus.OK)
    async findAllTerminationBenefits(@Query() queryDto: QueryTerminationBenefitDto) {
        const result = await this.payrollConfigService.findAllTerminationBenefits(queryDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefits retrieved successfully',
            ...result,
        };
    }

    @Get('termination-benefits/:id')
    @HttpCode(HttpStatus.OK)
    async findOneTerminationBenefit(@Param('id') id: string) {
        const benefit = await this.payrollConfigService.findOneTerminationBenefit(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit retrieved successfully',
            data: benefit,
        };
    }

    @Patch('termination-benefits/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async updateTerminationBenefit(
        @Param('id') id: string,
        @Body() updateDto: UpdateTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.updateTerminationBenefit(id, updateDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit updated successfully',
            data: benefit,
        };
    }

    @Delete('termination-benefits/:id')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.PAYROLL_SPECIALIST)
    @HttpCode(HttpStatus.OK)
    async removeTerminationBenefit(@Param('id') id: string) {
        const result = await this.payrollConfigService.removeTerminationBenefit(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('termination-benefits/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async approveTerminationBenefit(
        @Param('id') id: string,
        @Body() approveDto: ApproveTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.approveTerminationBenefit(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit approved successfully',
            data: benefit,
        };
    }

    @Patch('termination-benefits/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async rejectTerminationBenefit(
        @Param('id') id: string,
        @Body() approveDto: ApproveTerminationBenefitDto,
    ) {
        const benefit = await this.payrollConfigService.rejectTerminationBenefit(id, approveDto.approvedBy);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination benefit rejected successfully',
            data: benefit,
        };
    }

    @Post('termination-benefits/calculate')
    @HttpCode(HttpStatus.OK)
    async calculateTerminationEntitlements(
        @Body() employeeData: any,
    ) {
        const result = await this.payrollConfigService.calculateTerminationEntitlements(employeeData);
        return {
            statusCode: HttpStatus.OK,
            message: 'Termination entitlements calculated successfully',
            data: result,
        };
    }

    // ========== MANOS' PAY GRADE ENDPOINTS (Keeping only unique) ==========
    @Post('pay-grades')
    @Roles(SystemRole.PAYROLL_SPECIALIST)
    createPayGrade(@Body() createDto: CreatePayGradeDto) {
        return this.payrollConfigService.createPayGrade(createDto);
    }

    @Get('pay-grades')
    findAllPayGrades(@Query('status') status?: string) {
        return this.payrollConfigService.findAllPayGrades(status as any);
    }

    @Get('pay-grades/:id')
    async findOnePayGrade(@Param('id') id: string) {
        const payGrade = await this.payrollConfigService.findOnePayGrade(id);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade retrieved successfully',
            data: payGrade,
        };
    }

    @Patch('pay-grades/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
    updatePayGrade(
        @Param('id') id: string,
        @Body() updateDto: UpdatePayGradeDto,
    ) {
        return this.payrollConfigService.updatePayGrade(id, updateDto);
    }

    @Delete('pay-grades/:id')
    @Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER)
    @HttpCode(HttpStatus.OK)
    async deletePayGrade(@Param('id') id: string) {
        const result = await this.payrollConfigService.deletePayGrade(id);
        return {
            statusCode: HttpStatus.OK,
            ...result,
        };
    }

    @Patch('pay-grades/:id/approve')
    @Roles(SystemRole.PAYROLL_MANAGER)
    async approvePayGrade(
        @Param('id') id: string,
        @Body() approveDto: ApproveConfigDto,
    ) {
        const payGrade = await this.payrollConfigService.approvePayGrade(id, approveDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade approved successfully',
            data: payGrade,
        };
    }

    @Patch('pay-grades/:id/reject')
    @Roles(SystemRole.PAYROLL_MANAGER)
    async rejectPayGrade(
        @Param('id') id: string,
        @Body() approveDto: ApproveConfigDto,
    ) {
        const payGrade = await this.payrollConfigService.rejectPayGrade(id, approveDto);
        return {
            statusCode: HttpStatus.OK,
            message: 'Pay grade rejected successfully',
            data: payGrade,
        };
    }

    // ========== MANOS' COMPANY WIDE SETTINGS ENDPOINTS ==========
    @Get('company-settings')
    getCompanyWideSettings() {
        return this.payrollConfigService.getCompanyWideSettings();
    }

    // New endpoint to get only the currency
    @Get('company-currency')
    async getCompanyCurrency() {
        return this.payrollConfigService.getCompanyCurrency();
    }

    @Put('company-settings')
    @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    updateCompanyWideSettings(@Body() updateDto: UpdateCompanyWideSettingsDto) {
        return this.payrollConfigService.updateCompanyWideSettings(updateDto);
    }

    @Patch('company-settings/approve')
    @Roles(SystemRole.SYSTEM_ADMIN)
    approveCompanyWideSettings() {
        return this.payrollConfigService.approveCompanyWideSettings();
    }

    @Patch('company-settings/reject')
    @Roles(SystemRole.SYSTEM_ADMIN)
    rejectCompanyWideSettings() {
        return this.payrollConfigService.rejectCompanyWideSettings();
    }

    // ========== MANOS' BACKUP ENDPOINTS ==========
    // @Post('backup/create')
    // @HttpCode(HttpStatus.CREATED)
    // createBackup(
    //     @Body() body?: { name?: string; oplog?: boolean; dumpDbUsersAndRoles?: boolean },
    // ) {
    //     return this.payrollConfigService.createBackup({
    //         name: body?.name || 'payroll-config-backup',
    //         oplog: body?.oplog ?? false,
    //         dumpDbUsersAndRoles: body?.dumpDbUsersAndRoles ?? false,
    //     });
    // }
    //
    // @Get('backup/list')
    // listBackups() {
    //     return this.payrollConfigService.listBackups();
    // }
    //
    // @Delete('backup/:filename')
    // @HttpCode(HttpStatus.OK)
    // deleteBackup(@Param('filename') filename: string) {
    //     return this.payrollConfigService.deleteBackup(filename);
    // }
}





// import {
//     Controller,
//     Get,
//     Post,
//     Put,
//     Patch,
//     Delete,
//     Body,
//     Param,
//     Query,
//     HttpCode,
//     HttpStatus, BadRequestException,
// } from '@nestjs/common';
// import { PayrollConfigurationService } from '../services/payroll-configuration-requirements.service';
// import { UpdateCompanyWideSettingsDto } from '../dto/update-company-settings.dto';
// import { ApproveConfigDto } from '../dto/approve-config.dto';
// import { UpdateAllowanceDto } from '../dto/update-allowance.dto';
// import { UpdatePayTypeDto } from '../dto/update-paytype.dto';
// import { CreatePayGradeDto } from '../dto/create-paygrade.dto';
// import { UpdatePayGradeDto } from '../dto/update-paygrade.dto';
//
// import { UpdatePayrollPolicyDto } from '../dto/update-payrollpolicy.dto';
// import { UpdateSigningBonusDto } from '../dto/update-signingbonus.dto';
// import { UpdateTerminationBenefitDto } from '../dto/update-terminationbenefit.dto';
// import {UpdateTaxRuleDto} from "../dto/update-tax-rule.dto";
// import {CreateTaxRuleDto} from "../dto/create-tax-rule.dto";
// import {ApproveTaxRuleDto} from "../dto/approve-tax-rule.dto";
// import {CreateInsuranceDto} from "../dto/create-insurance.dto";
// import {UpdateInsuranceDto} from "../dto/update-insurance.dto";
// import {ApproveInsuranceDto} from "../dto/approve-insurance.dto";
//
// @Controller('payroll-configuration-requirements')
// export class PayrollConfigurationController {
//   constructor(
//     private readonly payrollConfigurationService: PayrollConfigurationService,
//   ) {}
//
//   // ==================== ALLOWANCE ENDPOINTS ====================
//
//   /**
//    * PHASE 4 - REQ-PY-18: Update allowance configuration
//    * Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('allowances/:id')
//   updateAllowance(
//     @Param('id') id: string,
//     @Body() updateDto: UpdateAllowanceDto,
//   ) {
//     return this.payrollConfigurationService.updateAllowance(id, updateDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete allowance configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('allowances/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deleteAllowance(@Param('id') id: string) {
//     return this.payrollConfigurationService.deleteAllowance(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('allowances/:id/approve')
//   approveAllowance(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approveAllowance(id, approveDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('allowances/:id/reject')
//   rejectAllowance(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectAllowance(id, approveDto);
//   }
//
//   // ==================== PAY TYPE ENDPOINTS ====================
//
//   /**
//    * PHASE 4 - REQ-PY-18: Update pay type configuration
//    * Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('pay-types/:id')
//   updatePayType(
//     @Param('id') id: string,
//     @Body() updateDto: UpdatePayTypeDto,
//   ) {
//     return this.payrollConfigurationService.updatePayType(id, updateDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete pay type configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('pay-types/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deletePayType(@Param('id') id: string) {
//     return this.payrollConfigurationService.deletePayType(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('pay-types/:id/approve')
//   approvePayType(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approvePayType(id, approveDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('pay-types/:id/reject')
//   rejectPayType(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectPayType(id, approveDto);
//   }
//
//   // ==================== PAY GRADE ENDPOINTS ====================
//
//   /**
//    * PHASE 2 - REQ-PY-2: Create pay grade (create draft)
//    * As a Payroll Specialist, I want to define pay grades, salary ranges, and compensation limits
//    * All configuration items must be created with status = Draft
//    * Business Rules:
//    * - BR10: The system allows multiple pay scales by grade, department, or location
//    * - BR31: Gross Salary = Base Pay + Allowances
//    */
//   @Post('pay-grades')
//   createPayGrade(@Body() createDto: CreatePayGradeDto) {
//     return this.payrollConfigurationService.createPayGrade(createDto);
//   }
//
//   /**
//    * PHASE 2 - REQ-PY-2: View all pay grades
//    * As a Payroll Specialist, I want to view all pay grades
//    * @param status - Optional query parameter to filter by status (draft, approved, rejected)
//    */
//   @Get('pay-grades')
//   findAllPayGrades(@Query('status') status?: string) {
//     return this.payrollConfigurationService.findAllPayGrades(
//       status as any,
//     );
//   }
//
//   /**
//    * PHASE 2 - REQ-PY-2: Update pay grade configuration (edit draft)
//    * PHASE 4 - REQ-PY-18: Also allows editing REJECTED configurations
//    * Phase 2 Requirement: Editing is allowed ONLY while status is Draft
//    * Phase 4 Requirement: Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('pay-grades/:id')
//   updatePayGrade(
//     @Param('id') id: string,
//     @Body() updateDto: UpdatePayGradeDto,
//   ) {
//     return this.payrollConfigurationService.updatePayGrade(id, updateDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete pay grade configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('pay-grades/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deletePayGrade(@Param('id') id: string) {
//     return this.payrollConfigurationService.deletePayGrade(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('pay-grades/:id/approve')
//   approvePayGrade(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approvePayGrade(id, approveDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('pay-grades/:id/reject')
//   rejectPayGrade(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectPayGrade(id, approveDto);
//   }
//
//   // ==================== TAX RULES ENDPOINTS ====================
//
//
//     @Post('tax-rules')
//     @HttpCode(HttpStatus.CREATED)
//     createTaxRule(@Body() dto: CreateTaxRuleDto) {
//         return this.payrollConfigurationService.createTaxRule(dto);
//     }
//
//     @Get('tax-rules')
//     @HttpCode(HttpStatus.OK)
//     getTaxRules() {
//         return this.payrollConfigurationService.getTaxRules();
//     }
//
//     @Get('tax-rules/:id')
//     @HttpCode(HttpStatus.OK)
//     getTaxRuleById(@Param('id') id: string) {
//         return this.payrollConfigurationService.getTaxRuleById(id);
//     }
//
//     @Patch('tax-rules/:id')
//     @HttpCode(HttpStatus.OK)
//     updateLegalRule(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto) {
//         return this.payrollConfigurationService.updateLegalRule(id, dto);
//     }
//
//     @Patch('tax-rules/:id/approve')
//     @HttpCode(HttpStatus.OK)
//     approveTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
//         return this.payrollConfigurationService.approveTaxRule(id, dto);
//     }
//
//     @Delete('tax-rules/:id')
//     @HttpCode(HttpStatus.OK)
//     deleteTaxRule(@Param('id') id: string) {
//         return this.payrollConfigurationService.deleteTaxRule(id);
//     }
//
//     // ===== INSURANCE BRACKETS =====
//     @Post('insurance-brackets')
//     @HttpCode(HttpStatus.CREATED)
//     createInsurance(@Body() dto: CreateInsuranceDto) {
//         return this.payrollConfigurationService.createInsuranceBracket(dto);
//     }
//
//     @Get('insurance-brackets')
//     @HttpCode(HttpStatus.OK)
//     getInsuranceBrackets() {
//         return this.payrollConfigurationService.getInsuranceBrackets();
//     }
//
//     @Get('insurance-brackets/:id')
//     @HttpCode(HttpStatus.OK)
//     getInsuranceBracketById(@Param('id') id: string) {
//         return this.payrollConfigurationService.getInsuranceBracketById(id);
//     }
//
//     @Patch('insurance-brackets/:id')
//     @HttpCode(HttpStatus.OK)
//     updateInsurance(@Param('id') id: string, @Body() dto: UpdateInsuranceDto) {
//         return this.payrollConfigurationService.updateInsuranceBracket(id, dto);
//     }
//
//     @Patch('insurance-brackets/:id/approve')
//     @HttpCode(HttpStatus.OK)
//     approveInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
//         return this.payrollConfigurationService.approveInsuranceBracket(id, dto);
//     }
//
//     @Delete('insurance-brackets/:id')
//     @HttpCode(HttpStatus.OK)
//     deleteInsurance(@Param('id') id: string) {
//         return this.payrollConfigurationService.deleteInsuranceBracket(id);
//     }
//
//     @Patch('tax-rules/:id/reject')
//     @HttpCode(HttpStatus.OK)
//     rejectTaxRule(@Param('id') id: string, @Body() dto: ApproveTaxRuleDto) {
//         return this.payrollConfigurationService.rejectTaxRule(id, dto);
//     }
//
// // ===== INSURANCE BRACKETS =====
//
//     @Patch('insurance-brackets/:id/reject')
//     @HttpCode(HttpStatus.OK)
//     rejectInsurance(@Param('id') id: string, @Body() dto: ApproveInsuranceDto) {
//         return this.payrollConfigurationService.rejectInsuranceBracket(id, dto);
//     }
//
//     // ===== CONTRIBUTION CALCULATION =====
//     /**
//      * Calculate employee and employer contributions for a given insurance bracket and salary.
//      * Query parameters:
//      *   - salary: number
//      */
//     @Get('insurance-brackets/:id/calculate-contributions')
//     @HttpCode(HttpStatus.OK)
//     calculateContributions(@Param('id') id: string, @Query('salary') salary: string,) {
//         const numericSalary = Number(salary);
//         if (isNaN(numericSalary) || numericSalary < 0) {
//             throw new BadRequestException('Salary must be a positive number');
//         }
//         return this.payrollConfigurationService.getInsuranceBracketById(id).then((bracket) => {
//             const result = this.payrollConfigurationService.calculateContributions(bracket, numericSalary);
//             if (!result) {
//                 throw new BadRequestException('Salary does not fall within this insurance bracket');
//             }
//             return result;
//         });
//     }
//
//
//
//
//   // /**
//   //  * PHASE 4 - REQ-PY-18: Update tax rule configuration
//   //  * Cannot edit approved configurations - must delete and create new one
//   //  */
//   // @Put('tax-rules/:id')
//   // updateTaxRule(
//   //   @Param('id') id: string,
//   //   @Body() updateDto: UpdateTaxRuleDto,
//   // ) {
//   //   return this.payrollConfigurationService.updateLegalRule(id, updateDto);
//   // }
//   //
//   // /**
//   //  * PHASE 4 - REQ-PY-18: Delete tax rule configuration
//   //  * Delete is allowed for approved configurations (except Insurance)
//   //  */
//   // @Delete('tax-rules/:id')
//   // @HttpCode(HttpStatus.NO_CONTENT)
//   // deleteTaxRule(@Param('id') id: string) {
//   //   return this.payrollConfigurationService.deleteTaxRule(id);
//   // }
//   //
//   // /**
//   //  * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//   //  * Publishing requires Payroll Manager approval
//   //  */
//   // @Patch('tax-rules/:id/approve')
//   // approveTaxRule(
//   //   @Param('id') id: string,
//   //   @Body() approveDto: ApproveConfigDto,
//   // ) {
//   //   return this.payrollConfigurationService.approveTaxRule(id, approveDto);
//   // }
//   //
//   // /**
//   //  * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//   //  * Reject configuration changes
//   //  */
//   // @Patch('tax-rules/:id/reject')
//   // rejectTaxRule(
//   //   @Param('id') id: string,
//   //   @Body() approveDto: ApproveConfigDto,
//   // ) {
//   //   return this.payrollConfigurationService.rejectTaxRule(id, approveDto);
//   // }
//   //
//   // // ==================== INSURANCE BRACKETS ENDPOINTS ====================
//   //
//   // /**
//   //  * PHASE 5 - REQ-PY-22: HR Approval of Insurance Brackets
//   //  * HR Manager review, approve insurance brackets (special case - not Payroll Manager)
//   //  */
//   // @Patch('insurance-brackets/:id/approve')
//   // approveInsuranceBracket(
//   //   @Param('id') id: string,
//   //   @Body() approveDto: ApproveConfigDto,
//   // ) {
//   //   return this.payrollConfigurationService.approveInsuranceBracket(
//   //     id,
//   //     approveDto,
//   //   );
//   // }
//   //
//   // /**
//   //  * PHASE 5 - REQ-PY-22: HR Approval of Insurance Brackets
//   //  * HR Manager reject insurance brackets
//   //  */
//   // @Patch('insurance-brackets/:id/reject')
//   // rejectInsuranceBracket(
//   //   @Param('id') id: string,
//   //   @Body() approveDto: ApproveConfigDto,
//   // ) {
//   //   return this.payrollConfigurationService.rejectInsuranceBracket(
//   //     id,
//   //     approveDto,
//   //   );
//   // }
//
//   // ==================== PAYROLL POLICIES ENDPOINTS ====================
//
//   /**
//    * PHASE 4 - REQ-PY-18: Update payroll policy configuration
//    * Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('policies/:id')
//   updatePayrollPolicy(
//     @Param('id') id: string,
//     @Body() updateDto: UpdatePayrollPolicyDto,
//   ) {
//     return this.payrollConfigurationService.updatePayrollPolicy(id, updateDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete payroll policy configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('policies/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deletePayrollPolicy(@Param('id') id: string) {
//     return this.payrollConfigurationService.deletePayrollPolicy(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('policies/:id/approve')
//   approvePayrollPolicy(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approvePayrollPolicy(
//       id,
//       approveDto,
//     );
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('policies/:id/reject')
//   rejectPayrollPolicy(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectPayrollPolicy(id, approveDto);
//   }
//
//   // ==================== SIGNING BONUS ENDPOINTS ====================
//
//   /**
//    * PHASE 4 - REQ-PY-18: Update signing bonus configuration
//    * Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('signing-bonuses/:id')
//   updateSigningBonus(
//     @Param('id') id: string,
//     @Body() updateDto: UpdateSigningBonusDto,
//   ) {
//     return this.payrollConfigurationService.updateSigningBonus(id, updateDto);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete signing bonus configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('signing-bonuses/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deleteSigningBonus(@Param('id') id: string) {
//     return this.payrollConfigurationService.deleteSigningBonus(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('signing-bonuses/:id/approve')
//   approveSigningBonus(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approveSigningBonus(
//       id,
//       approveDto,
//     );
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('signing-bonuses/:id/reject')
//   rejectSigningBonus(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectSigningBonus(id, approveDto);
//   }
//
//   // ==================== TERMINATION BENEFITS ENDPOINTS ====================
//
//   /**
//    * PHASE 4 - REQ-PY-18: Update termination benefit configuration
//    * Cannot edit approved configurations - must delete and create new one
//    */
//   @Put('termination-benefits/:id')
//   updateTerminationBenefit(
//     @Param('id') id: string,
//     @Body() updateDto: UpdateTerminationBenefitDto,
//   ) {
//     return this.payrollConfigurationService.updateTerminationBenefit(
//       id,
//       updateDto,
//     );
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Delete termination benefit configuration
//    * Delete is allowed for approved configurations (except Insurance)
//    */
//   @Delete('termination-benefits/:id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deleteTerminationBenefit(@Param('id') id: string) {
//     return this.payrollConfigurationService.deleteTerminationBenefit(id);
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Publishing requires Payroll Manager approval
//    */
//   @Patch('termination-benefits/:id/approve')
//   approveTerminationBenefit(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.approveTerminationBenefit(
//       id,
//       approveDto,
//     );
//   }
//
//   /**
//    * PHASE 4 - REQ-PY-18: Payroll Manager Approval (Except Insurance)
//    * Reject configuration changes
//    */
//   @Patch('termination-benefits/:id/reject')
//   rejectTerminationBenefit(
//     @Param('id') id: string,
//     @Body() approveDto: ApproveConfigDto,
//   ) {
//     return this.payrollConfigurationService.rejectTerminationBenefit(
//       id,
//       approveDto,
//     );
//   }
//
//   // ==================== COMPANY WIDE SETTINGS ENDPOINTS ====================
//   /**
//    * PHASE 3 - REQ-PY-15: Company-Wide Payroll Settings
//    * Get company-wide settings (pay dates, time zone, currency)
//    */
//   @Get('company-settings')
//   getCompanyWideSettings() {
//     return this.payrollConfigurationService.getCompanyWideSettings();
//   }
//
//   /**
//    * PHASE 3 - REQ-PY-15: Company-Wide Payroll Settings
//    * Update company-wide settings (pay dates, time zone, currency)
//    */
//   @Put('company-settings')
//   updateCompanyWideSettings(@Body() updateDto: UpdateCompanyWideSettingsDto) {
//     return this.payrollConfigurationService.updateCompanyWideSettings(
//       updateDto,
//     );
//   }
//
//   // ==================== BACKUP ENDPOINTS ====================
//   /**
//    * PHASE 3 - REQ-PY-16: System backup Configuration
//    * Create backup of payroll configuration & tables
//    * @param body - backup options (name, oplog, dumpDbUsersAndRoles)
//    */
//   @Post('backup/create')
//   @HttpCode(HttpStatus.CREATED)
//   createBackup(
//     @Body() body?: { name?: string; oplog?: boolean; dumpDbUsersAndRoles?: boolean },
//   ) {
//     return this.payrollConfigurationService.createBackup({
//       name: body?.name || 'payroll-config-backup',
//       oplog: body?.oplog ?? false,
//       dumpDbUsersAndRoles: body?.dumpDbUsersAndRoles ?? false,
//     });
//   }
//
//   /**
//    * PHASE 3 - REQ-PY-16: System backup Configuration
//    * List all backups
//    */
//   @Get('backup/list')
//   listBackups() {
//     return this.payrollConfigurationService.listBackups();
//   }
//
//   /**
//    * PHASE 3 - REQ-PY-16: System backup Configuration
//    * Delete a backup
//    * @param filename - backup filename to delete
//    */
//   @Delete('backup/:filename')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   deleteBackup(@Param('filename') filename: string) {
//     return this.payrollConfigurationService.deleteBackup(filename);
//   }
// }
