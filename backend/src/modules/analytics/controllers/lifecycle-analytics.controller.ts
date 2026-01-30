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

import { LifecycleAnalyticsService } from '../services/lifecycle-analytics.service';

@ApiTags('Lifecycle Analytics')
@ApiBearerAuth('access-token')
@Controller('lifecycle/analytics')
// @UseGuards(AuthenticationGuard, AuthorizationGuard)
export class LifecycleAnalyticsController {
    constructor(private readonly analyticsService: LifecycleAnalyticsService) { }

    // ============================================================
    // Dashboard Summary
    // ============================================================

    @Get('dashboard')
    @ApiOperation({ summary: 'Get comprehensive employee lifecycle analytics dashboard' })
    @ApiResponse({ status: 200, description: 'Returns complete dashboard metrics' })
    async getDashboardSummary() {
        return this.analyticsService.getDashboardSummary();
    }

    // ============================================================
    // Lifecycle Overview
    // ============================================================

    @Get('overview')
    @ApiOperation({ summary: 'Get lifecycle overview metrics' })
    @ApiResponse({ status: 200, description: 'Returns lifecycle overview statistics' })
    async getLifecycleOverview() {
        return this.analyticsService.getLifecycleOverview();
    }

    // ============================================================
    // Quality of Hire
    // ============================================================

    @Get('quality-of-hire')
    @ApiOperation({ summary: 'Get quality of hire metrics by cohort' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months for analysis', type: Number })
    @ApiResponse({ status: 200, description: 'Returns quality of hire data' })
    async getQualityOfHireMetrics(@Query('months') months?: number) {
        return this.analyticsService.getQualityOfHireMetrics(months || 6);
    }

    // ============================================================
    // Cohort Analysis
    // ============================================================

    @Get('cohort-analysis')
    @ApiOperation({ summary: 'Get cohort retention analysis' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of cohort months', type: Number })
    @ApiResponse({ status: 200, description: 'Returns cohort retention data' })
    async getCohortAnalysis(@Query('months') months?: number) {
        return this.analyticsService.getCohortAnalysis(months || 12);
    }

    // ============================================================
    // Source to Retention
    // ============================================================

    @Get('source-retention')
    @ApiOperation({ summary: 'Get source to retention analysis' })
    @ApiResponse({ status: 200, description: 'Returns source retention correlation' })
    async getSourceToRetentionAnalysis() {
        return this.analyticsService.getSourceToRetentionAnalysis();
    }

    // ============================================================
    // Department Lifecycle Metrics
    // ============================================================

    @Get('department-metrics')
    @ApiOperation({ summary: 'Get department lifecycle health metrics' })
    @ApiResponse({ status: 200, description: 'Returns department lifecycle data' })
    async getDepartmentLifecycleMetrics() {
        return this.analyticsService.getDepartmentLifecycleMetrics();
    }

    // ============================================================
    // Pipeline Flow Analysis
    // ============================================================

    @Get('pipeline-flow')
    @ApiOperation({ summary: 'Get pipeline flow analysis' })
    @ApiResponse({ status: 200, description: 'Returns pipeline flow metrics' })
    async getPipelineFlowAnalysis() {
        return this.analyticsService.getPipelineFlowAnalysis();
    }

    // ============================================================
    // Employee Journeys
    // ============================================================

    @Get('employee-journeys')
    @ApiOperation({ summary: 'Get recent employee journey metrics' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of journeys to return', type: Number })
    @ApiResponse({ status: 200, description: 'Returns employee journey data' })
    async getRecentEmployeeJourneys(@Query('limit') limit?: number) {
        return this.analyticsService.getRecentEmployeeJourneys(limit || 20);
    }
}
