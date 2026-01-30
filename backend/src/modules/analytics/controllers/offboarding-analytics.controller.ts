import {
    Controller,
    Get,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { OffboardingAnalyticsService } from '../services/offboarding-analytics.service';

@ApiTags('Offboarding Analytics')
@ApiBearerAuth('access-token')
@Controller('offboarding/analytics')
// @UseGuards(AuthenticationGuard, AuthorizationGuard)
export class OffboardingAnalyticsController {
    constructor(private readonly analyticsService: OffboardingAnalyticsService) { }

    // ============================================================
    // Dashboard Summary
    // ============================================================

    @Get('dashboard')
    @ApiOperation({ summary: 'Get comprehensive offboarding analytics dashboard' })
    @ApiResponse({ status: 200, description: 'Returns complete dashboard metrics' })
    async getDashboardSummary() {
        return this.analyticsService.getDashboardSummary();
    }

    // ============================================================
    // Overview Metrics
    // ============================================================

    @Get('overview')
    @ApiOperation({ summary: 'Get offboarding overview metrics' })
    @ApiResponse({ status: 200, description: 'Returns overview statistics' })
    async getOverviewMetrics() {
        return this.analyticsService.getOverviewMetrics();
    }

    // ============================================================
    // Clearance Efficiency
    // ============================================================

    @Get('clearance-efficiency')
    @ApiOperation({ summary: 'Get clearance efficiency by department' })
    @ApiResponse({ status: 200, description: 'Returns clearance efficiency metrics' })
    async getClearanceEfficiencyMetrics() {
        return this.analyticsService.getClearanceEfficiencyMetrics();
    }

    // ============================================================
    // Attrition Patterns
    // ============================================================

    @Get('attrition-patterns')
    @ApiOperation({ summary: 'Get attrition pattern analysis' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months for analysis', type: Number })
    @ApiResponse({ status: 200, description: 'Returns attrition pattern data' })
    async getAttritionPatterns(@Query('months') months?: number) {
        return this.analyticsService.getAttritionPatterns(months || 6);
    }

    // ============================================================
    // Exit Reason Analysis
    // ============================================================

    @Get('exit-reasons')
    @ApiOperation({ summary: 'Get exit reason analysis' })
    @ApiResponse({ status: 200, description: 'Returns exit reason breakdown' })
    async getExitReasonAnalysis() {
        return this.analyticsService.getExitReasonAnalysis();
    }

    // ============================================================
    // Tenure at Exit
    // ============================================================

    @Get('tenure-analysis')
    @ApiOperation({ summary: 'Get tenure at exit metrics' })
    @ApiResponse({ status: 200, description: 'Returns tenure analysis data' })
    async getTenureAtExitMetrics() {
        return this.analyticsService.getTenureAtExitMetrics();
    }

    // ============================================================
    // Termination Trends
    // ============================================================

    @Get('trends')
    @ApiOperation({ summary: 'Get termination trends over time' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months for trend analysis', type: Number })
    @ApiResponse({ status: 200, description: 'Returns termination trends' })
    async getTerminationTrends(@Query('months') months?: number) {
        return this.analyticsService.getTerminationTrends(months || 6);
    }

    // ============================================================
    // Equipment Return Metrics
    // ============================================================

    @Get('equipment-tracking')
    @ApiOperation({ summary: 'Get equipment return tracking metrics' })
    @ApiResponse({ status: 200, description: 'Returns equipment return data' })
    async getEquipmentReturnMetrics() {
        return this.analyticsService.getEquipmentReturnMetrics();
    }

    // ============================================================
    // Department Attrition Risk
    // ============================================================

    @Get('department-risk')
    @ApiOperation({ summary: 'Get department attrition risk analysis' })
    @ApiResponse({ status: 200, description: 'Returns department risk scores' })
    async getDepartmentAttritionRisk() {
        return this.analyticsService.getDepartmentAttritionRisk();
    }
}
