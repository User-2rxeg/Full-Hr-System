import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { PayrollAnalyticsService } from '../services/payroll-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@Controller('payroll-analytics')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PayrollAnalyticsController {
    constructor(private readonly analyticsService: PayrollAnalyticsService) { }

    /**
     * Get comprehensive dashboard summary with all analytics
     */
    @Get('dashboard')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getDashboardSummary() {
        return await this.analyticsService.getDashboardSummary();
    }

    /**
     * Get payroll story/narrative
     */
    @Get('story')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async getPayrollStory(@Query('entityId') entityId?: string) {
        return await this.analyticsService.getPayrollStory(entityId);
    }

    /**
     * Get payroll cost trends over time
     */
    @Get('trends')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getPayrollTrends(@Query('months') months?: string) {
        return await this.analyticsService.getPayrollTrends(months ? parseInt(months) : 12);
    }

    /**
     * Get cost breakdown by department
     */
    @Get('departments')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getDepartmentCostBreakdown() {
        return await this.analyticsService.getDepartmentCostBreakdown();
    }

    /**
     * Get deductions breakdown by category
     */
    @Get('deductions')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getDeductionsBreakdown() {
        return await this.analyticsService.getDeductionsBreakdown();
    }

    /**
     * Get salary distribution by brackets
     */
    @Get('salary-distribution')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getSalaryDistribution() {
        return await this.analyticsService.getSalaryDistribution();
    }

    /**
     * Get claims and disputes analytics
     */
    @Get('claims-disputes')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    async getClaimsDisputesMetrics(@Query('months') months?: string) {
        return await this.analyticsService.getClaimsDisputesMetrics(months ? parseInt(months) : 6);
    }

    /**
     * Get payroll compliance metrics
     */
    @Get('compliance')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async getComplianceMetrics() {
        return await this.analyticsService.getComplianceMetrics();
    }

    /**
     * Get advanced forecast
     */
    @Get('forecast')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF)
    async getForecast() {
        return await this.analyticsService.getAdvancedForecast();
    }

    /**
     * Get simple forecast (legacy)
     */
    @Get('forecast/simple')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.FINANCE_STAFF)
    async getSimpleForecast() {
        return await this.analyticsService.getForecast();
    }

    /**
     * Detect all anomalies
     */
    @Get('anomalies')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async detectAnomalies() {
        return await this.analyticsService.detectAllAnomalies();
    }

    /**
     * Detect ghost employees for a specific run
     */
    @Get('anomalies/ghosts/:runId')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async detectGhostEmployees(@Param('runId') runId: string) {
        return await this.analyticsService.detectGhostEmployees(runId);
    }

    /**
     * Get execution metrics (run processing stats)
     */
    @Get('execution')
    @Roles(SystemRole.PAYROLL_MANAGER, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    async getExecutionMetrics(@Query('months') months?: string) {
        return await this.analyticsService.getExecutionMetrics(months ? parseInt(months) : 6);
    }
}
