import { Controller, Get, UseGuards } from '@nestjs/common';
import { PayrollConfigurationAnalyticsService } from '../services/payroll-configuration-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';


@Controller('payroll-config-analytics')
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class PayrollConfigurationAnalyticsController {
    constructor(
        private readonly analyticsService: PayrollConfigurationAnalyticsService
    ) { }

    /**
     * Get comprehensive dashboard summary with all configuration analytics
     */
    @Get('dashboard')
    async getDashboard() {
        return this.analyticsService.getDashboardSummary();
    }

    /**
     * Get status overview for all configuration categories
     */
    @Get('status-overview')
    async getStatusOverview() {
        return this.analyticsService.getConfigStatusOverview();
    }

    /**
     * Get allowance analysis
     */
    @Get('allowances')
    async getAllowanceAnalysis() {
        return this.analyticsService.getAllowanceAnalysis();
    }

    /**
     * Get tax rules analysis
     */
    @Get('tax-rules')
    async getTaxRulesAnalysis() {
        return this.analyticsService.getTaxRulesAnalysis();
    }

    /**
     * Get insurance brackets analysis
     */
    @Get('insurance')
    async getInsuranceAnalysis() {
        return this.analyticsService.getInsuranceAnalysis();
    }

    /**
     * Get pay grades analysis
     */
    @Get('pay-grades')
    async getPayGradeAnalysis() {
        return this.analyticsService.getPayGradeAnalysis();
    }

    /**
     * Get pay types analysis
     */
    @Get('pay-types')
    async getPayTypeAnalysis() {
        return this.analyticsService.getPayTypeAnalysis();
    }

    /**
     * Get signing bonus analysis
     */
    @Get('signing-bonuses')
    async getSigningBonusAnalysis() {
        return this.analyticsService.getSigningBonusAnalysis();
    }

    /**
     * Get policy analysis
     */
    @Get('policies')
    async getPolicyAnalysis() {
        return this.analyticsService.getPolicyAnalysis();
    }

    /**
     * Get termination benefits analysis
     */
    @Get('termination-benefits')
    async getTerminationBenefitsAnalysis() {
        return this.analyticsService.getTerminationBenefitsAnalysis();
    }

    /**
     * Get approval workflow metrics
     */
    @Get('approval-metrics')
    async getApprovalMetrics() {
        return this.analyticsService.getApprovalWorkflowMetrics();
    }

    /**
     * Get company-wide settings analysis
     */
    @Get('company-settings')
    async getCompanySettings() {
        return this.analyticsService.getCompanySettingsAnalysis();
    }

    /**
     * Get configuration health score
     */
    @Get('health-score')
    async getHealthScore() {
        return this.analyticsService.getConfigurationHealthScore();
    }
}
