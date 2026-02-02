// @ts-nocheck
import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus, Get, Query, Patch, Req } from '@nestjs/common';
import { PayrollExecutionService } from '../services/payroll-execution.service';
import { SigningBonusEditDto } from '../dto/signing-bonus-edit.dto';
import { PayrollInitiationCreateDto } from '../dto/payroll-initiation-create.dto';
import { PayrollInitiationUpdateDto } from '../dto/payroll-initiation-update.dto';
import { PayrollUnfreezeDto } from '../dto/unfreeze.dto';
import { GeneratePayslipsDto } from '../dto/generate-payslips.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { BonusStatus } from '../enums/payroll-execution-enum';
import { BenefitStatus } from '../enums/payroll-execution-enum';
import { AuthenticationGuard } from '../../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../../common/guards/authorization-guard';
import { Roles } from '../../../common/decorators/roles-decorator';
import { CurrentUser } from '../../../common/decorators/current-user';
import { SystemRole } from '../../../employee/enums/employee-profile.enums';
import type { JwtPayload } from '../../../common/payload/jwt-payload';
import { TerminationBenefitEditDto } from '../dto/termination-benefit-edit.dto';

@Controller('payroll-execution')
@ApiTags('Payroll Execution')
@ApiBearerAuth()
export class PayrollExecutionController {
	constructor(private readonly payrollService: PayrollExecutionService) {}

	// ============ SIGNING BONUS ENDPOINTS ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Post('approve-signing-bonuses')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'REQ-PY-28: Approve all pending signing bonuses' })
	@ApiResponse({ status: 200, description: 'Signing bonuses approved' })
	async approveSigningBonuses(@CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.approveSigningBonuses(user?.sub);
		return { status: 'all_signing_bonuses_approved', ...result };
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('signing-bonuses')
	@ApiOperation({ summary: 'List signing bonuses (optional status filter)' })
	@ApiResponse({ status: 200, description: 'List of signing bonuses' })
	@ApiQuery({ name: 'status', required: false, enum: BonusStatus })
	async listSigningBonuses(@Query('status') statusParam: string | undefined) {
		const status = statusParam as any;
		const items = await this.payrollService.listSigningBonuses(status);
		return items;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('signing-bonuses/:id')
	@ApiOperation({ summary: 'Get a single signing bonus by id' })
	@ApiParam({ name: 'id', description: 'Signing bonus id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Signing bonus document' })
	async getSigningBonus(@Param('id') id: string) {
		const item = await this.payrollService.getSigningBonus(id);
		return item;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('signing-bonuses/:id/edit')
	@ApiOperation({ summary: 'REQ-PY-29: Edit a signing bonus (BR 25: requires authorization)' })
	@ApiParam({ name: 'id', description: 'Signing bonus id', type: 'string' })
	@ApiBody({ type: SigningBonusEditDto })
	@ApiConsumes('application/json')
	@ApiResponse({ status: 200, description: 'Updated signing bonus' })
	async editSigningBonus(@Param('id') id: string, @Body() dto: SigningBonusEditDto, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.updateSigningBonus(id, dto, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('signing-bonuses/:id/approve')
	@ApiOperation({ summary: 'REQ-PY-28: Approve a single signing bonus (BR 28: disbursed only once)' })
	@ApiParam({ name: 'id', description: 'Signing bonus id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Approved signing bonus' })
	async approveSingleSigningBonus(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.approveSigningBonus(id, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('signing-bonuses/:id/reject')
	@ApiOperation({ summary: 'REQ-PY-28: Reject a signing bonus' })
	@ApiParam({ name: 'id', description: 'Signing bonus id', type: 'string' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
	@ApiResponse({ status: 200, description: 'Rejected signing bonus' })
	async rejectSigningBonus(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.rejectSigningBonus(id, user?.sub, body?.reason);
		return updated;
	}

	// ============ TERMINATION/RESIGNATION BENEFITS ENDPOINTS ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Get('termination-benefits')
	@ApiOperation({ summary: 'List termination/resignation benefits (optional status filter)' })
	@ApiQuery({ name: 'status', required: false, enum: BenefitStatus })
	@ApiResponse({ status: 200, description: 'List of termination/resignation benefits' })
	async listTerminationBenefits(@Query('status') statusParam: string | undefined) {
		const status = statusParam as any;
		const items = await this.payrollService.listTerminationBenefits(status);
		return items;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Get('termination-benefits/:id')
	@ApiOperation({ summary: 'Get a single termination/resignation benefit by id' })
	@ApiParam({ name: 'id', description: 'Termination benefit id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Termination benefit document' })
	async getTerminationBenefit(@Param('id') id: string) {
		const item = await this.payrollService.getTerminationBenefit(id);
		return item;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('termination-benefits/:id/edit')
	@ApiOperation({ summary: 'REQ-PY-32: Edit a termination/resignation benefit (BR 27: requires approval)' })
	@ApiParam({ name: 'id', description: 'Termination benefit id', type: 'string' })
	@ApiBody({ type: TerminationBenefitEditDto })
	@ApiConsumes('application/json')
	@ApiResponse({ status: 200, description: 'Updated termination benefit' })
	async editTerminationBenefit(@Param('id') id: string, @Body() dto: TerminationBenefitEditDto, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.updateTerminationBenefit(id, dto as any, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('termination-benefits/:id/approve')
	@ApiOperation({ summary: 'REQ-PY-31: Approve a termination/resignation benefit (BR 26: requires clearance)' })
	@ApiParam({ name: 'id', description: 'Termination benefit id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Approved termination benefit' })
	async approveTerminationBenefit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.approveTerminationBenefit(id, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('termination-benefits/:id/reject')
	@ApiOperation({ summary: 'REQ-PY-31: Reject a termination/resignation benefit' })
	@ApiParam({ name: 'id', description: 'Termination benefit id', type: 'string' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
	@ApiResponse({ status: 200, description: 'Rejected termination benefit' })
	async rejectTerminationBenefit(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.rejectTerminationBenefit(id, user?.sub, body?.reason);
		return updated;
	}

	// ============ PAYROLL INITIATION ENDPOINTS ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('initiation')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'REQ-PY-23: Create payroll initiation (BR 63: with validation)' })
	@ApiResponse({ status: 201, description: 'Payroll initiation created' })
	@ApiBody({ type: PayrollInitiationCreateDto })
	@ApiConsumes('application/json')
	async createInitiation(@Req() req: any, @Body() dto: PayrollInitiationCreateDto, @CurrentUser() user: JwtPayload) {
		const created = await this.payrollService.createPayrollInitiation(dto as any, user?.sub);
		return created;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Get('initiation/:id')
	@ApiOperation({ summary: 'Get payroll initiation by id' })
	@ApiParam({ name: 'id', description: 'Payroll initiation id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payroll initiation details' })
	async getInitiation(@Param('id') id: string) {
		const initiation = await this.payrollService.getPayrollInitiation(id);
		return initiation;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Patch('initiation/:id')
	@ApiOperation({ summary: 'REQ-PY-26: Edit a payroll initiation (only when draft or rejected)' })
	@ApiParam({ name: 'id', description: 'Payroll initiation id', type: 'string' })
	@ApiBody({ type: PayrollInitiationUpdateDto })
	@ApiConsumes('application/json')
	@ApiResponse({ status: 200, description: 'Updated payroll initiation' })
	async editInitiation(@Req() req: any, @Param('id') id: string, @Body() dto: PayrollInitiationUpdateDto, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.updatePayrollInitiation(id, dto as any, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('initiation/:id/approve')
	@ApiOperation({ summary: 'REQ-PY-24: Approve payroll initiation (triggers automatic processing REQ-PY-23)' })
	@ApiParam({ name: 'id', description: 'Payroll initiation id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payroll initiation approved and processing started' })
	async approveInitiation(@Req() req: any, @Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const updated = await this.payrollService.approvePayrollInitiation(id, user?.sub);
		return updated;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('initiation/:id/reject')
	@ApiOperation({ summary: 'Reject a payroll initiation with reason' })
	@ApiParam({ name: 'id', description: 'Payroll initiation id', type: 'string' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
	@ApiResponse({ status: 200, description: 'Payroll initiation rejected' })
	async rejectInitiation(@Req() req: any, @Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() body: { reason: string }) {
		const updated = await this.payrollService.rejectPayrollInitiation(id, user?.sub, body?.reason);
		return updated;
	}

	// ============ PAYROLL APPROVAL WORKFLOW ENDPOINTS ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.HR_MANAGER, SystemRole.PAYROLL_MANAGER)
	@Post(':id/approve')
	@ApiOperation({ summary: 'REQ-PY-22: Manager approval of payroll run (BR 30: multi-step approval)' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payroll approved by manager' })
	async approvePayroll(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<{ id: string; status: string }> {
		await this.payrollService.approvePayroll(id, user?.sub);
		return { id, status: 'approved_by_manager' };
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.FINANCE_STAFF)
	@Post(':id/approve-finance')
	@ApiOperation({ summary: 'REQ-PY-15: Finance approval before payment (BR 18: final validation)' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payroll approved by finance and marked as paid' })
	async approvePayrollFinance(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<{ id: string; status: string; paymentStatus: string }> {
		await this.payrollService.approvePayrollFinance(id, user?.sub);
		return { id, status: 'approved_by_finance', paymentStatus: 'paid' };
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.HR_MANAGER, SystemRole.PAYROLL_MANAGER)
	@Post(':id/freeze')
	@ApiOperation({ summary: 'REQ-PY-7: Lock/freeze finalized payroll (prevents unauthorized changes)' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payroll frozen/locked' })
	async freezePayroll(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<{ id: string; status: string }> {
		await this.payrollService.freezePayroll(id, user?.sub);
		return { id, status: 'frozen' };
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.HR_MANAGER, SystemRole.PAYROLL_MANAGER)
	@Post(':id/unfreeze')
	@ApiOperation({ summary: 'REQ-PY-19: Unfreeze payroll under exceptional circumstances (requires reason)' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiBody({ type: PayrollUnfreezeDto })
	@ApiConsumes('application/json')
	@ApiResponse({ status: 200, description: 'Payroll unfrozen with reason logged' })
	async unfreezePayroll(@Param('id') id: string, @Body() body: PayrollUnfreezeDto, @CurrentUser() user: JwtPayload): Promise<{ id: string; status: string; reason?: string }> {
		await this.payrollService.unfreezePayroll(id, user?.sub, body?.reason);
		return { id, status: 'unfrozen', reason: body?.reason };
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.FINANCE_STAFF)
	@Post(':id/generate-payslips')
	@ApiOperation({ summary: 'REQ-PY-8: Generate and distribute employee payslips (automatic after REQ-PY-15)' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiBody({ type: GeneratePayslipsDto })
	@ApiConsumes('application/json')
	@ApiResponse({ status: 200, description: 'Payslips generated and ready for distribution' })
	async generatePayslips(@Param('id') id: string, @Body() body: GeneratePayslipsDto, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.generatePayslips(id, user?.sub);
		return result;
	}

	// ============ VIEWING AND REPORTING ENDPOINTS ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('draft/:id')
	@ApiOperation({ summary: 'REQ-PY-6: Fetch payroll draft/run details for review' })
	@ApiResponse({ status: 200, description: 'Payroll draft details' })
	@ApiParam({ name: 'id', description: 'Draft/Run id', type: 'string' })
	async getDraft(@Req() req: any, @Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.getDraft(id, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN)
	@Get('runs')
	@ApiOperation({ summary: 'List payroll runs with optional filters' })
	@ApiQuery({ name: 'status', required: false })
	@ApiQuery({ name: 'period', required: false, description: 'YYYY-MM or exact period string' })
	@ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
	@ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
	@ApiResponse({ status: 200, description: 'List of payroll runs' })
	async listRuns(
		@Query('status') status?: string,
		@Query('period') period?: string,
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@CurrentUser() user?: JwtPayload,
	) {
		try {
			const pg = page ? Number(page) : 1;
			const lm = limit ? Number(limit) : 10;
			const result = await this.payrollService.listPayrollRuns({ status, period, page: pg, limit: lm }, user?.sub);
			return result;
		} catch (error) {
			console.error('[PayrollExecution] Error listing runs:', error);
			throw error;
		}
	}

	// ============ PAYSLIP ENDPOINTS (REQ-PY-8, BR 17) ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('payslips/:payslipId')
	@ApiOperation({ summary: 'REQ-PY-8 BR 17: Get single payslip with full breakdown of components' })
	@ApiParam({ name: 'payslipId', description: 'Payslip id', type: 'string' })
	@ApiResponse({ status: 200, description: 'Payslip details with complete earnings and deductions breakdown' })
	async getPayslip(@Param('payslipId') payslipId: string, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.getPayslip(payslipId, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('diagnostics/employee-status')
	@ApiOperation({ summary: 'Diagnostic: Check employee status distribution for payroll processing' })
	@ApiResponse({ status: 200, description: 'Employee status breakdown' })
	async getEmployeeStatusDiagnostics(@CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.getEmployeeStatusDiagnostics(user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('departments')
	@ApiOperation({ summary: 'List all active departments for payroll entity dropdown' })
	@ApiResponse({ status: 200, description: 'List of departments' })
	async listDepartments(@CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.listDepartments(user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get(':id/payslips')
	@ApiOperation({ summary: 'REQ-PY-8 BR 17: List all payslips for a payroll run with clear breakdown' })
	@ApiParam({ name: 'id', description: 'Payroll run id', type: 'string' })
	@ApiResponse({ status: 200, description: 'List of payslips with earnings and deductions breakdown' })
	async listPayslipsByRun(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.listPayslipsByRun(id, user?.sub);
		return result;
	}

	// ============ IRREGULARITY MANAGEMENT ENDPOINTS (REQ-PY-20) ============

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('irregularities/list')
	@ApiOperation({ summary: 'REQ-PY-5/REQ-PY-20: List all irregularities with optional filters' })
	@ApiQuery({ name: 'status', required: false, enum: ['pending', 'escalated', 'resolved', 'rejected'] })
	@ApiQuery({ name: 'payrollRunId', required: false, description: 'Filter by payroll run ID' })
	@ApiQuery({ name: 'severity', required: false, enum: ['info', 'low', 'medium', 'high', 'critical'] })
	@ApiResponse({ status: 200, description: 'List of irregularities' })
	async listIrregularities(
		@Query('status') status?: string,
		@Query('payrollRunId') payrollRunId?: string,
		@Query('severity') severity?: string,
		@CurrentUser() user?: JwtPayload
	) {
		const result = await this.payrollService.listIrregularities({ status, payrollRunId, severity }, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get('irregularities/:id')
	@ApiOperation({ summary: 'Get a single irregularity by ID' })
	@ApiParam({ name: 'id', description: 'Irregularity ID', type: 'string' })
	@ApiResponse({ status: 200, description: 'Irregularity details' })
	async getIrregularity(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.getIrregularity(id, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST)
	@Post('irregularities/:id/escalate')
	@ApiOperation({ summary: 'REQ-PY-20: Escalate an irregularity to manager for resolution' })
	@ApiParam({ name: 'id', description: 'Irregularity ID', type: 'string' })
	@ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } })
	@ApiResponse({ status: 200, description: 'Irregularity escalated to manager' })
	async escalateIrregularity(
		@Param('id') id: string,
		@Body() body: { reason: string },
		@CurrentUser() user: JwtPayload
	) {
		const result = await this.payrollService.escalateIrregularity(id, body.reason, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.HR_MANAGER, SystemRole.PAYROLL_MANAGER)
	@Post('irregularities/:id/resolve')
	@ApiOperation({ summary: 'REQ-PY-20: Resolve an escalated irregularity (Manager only)' })
	@ApiParam({ name: 'id', description: 'Irregularity ID', type: 'string' })
	@ApiBody({ schema: { 
		type: 'object', 
		properties: { 
			action: { type: 'string', enum: ['approved', 'rejected', 'excluded', 'adjusted'] },
			notes: { type: 'string' },
			adjustedValue: { type: 'number' }
		}, 
		required: ['action', 'notes'] 
	}})
	@ApiResponse({ status: 200, description: 'Irregularity resolved' })
	async resolveIrregularity(
		@Param('id') id: string,
		@Body() body: { action: string; notes: string; adjustedValue?: number },
		@CurrentUser() user: JwtPayload
	) {
		const result = await this.payrollService.resolveIrregularity(id, body, user?.sub);
		return result;
	}

	@UseGuards(AuthenticationGuard, AuthorizationGuard)
	@Roles(SystemRole.PAYROLL_SPECIALIST, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER)
	@Get(':id/irregularities')
	@ApiOperation({ summary: 'Get all irregularities for a specific payroll run' })
	@ApiParam({ name: 'id', description: 'Payroll run ID', type: 'string' })
	@ApiResponse({ status: 200, description: 'List of irregularities for the payroll run' })
	async getPayrollRunIrregularities(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
		const result = await this.payrollService.listIrregularities({ payrollRunId: id }, user?.sub);
		return result;
	}
}
