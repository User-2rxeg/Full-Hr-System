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

import { OnboardingAnalyticsService } from '../services/onboarding-analytics.service';

@ApiTags('Onboarding Analytics')
@ApiBearerAuth('access-token')
@Controller('onboarding/analytics')
// @UseGuards(AuthenticationGuard, AuthorizationGuard)
export class OnboardingAnalyticsController {
    constructor(private readonly analyticsService: OnboardingAnalyticsService) { }

    // ============================================================
    // Dashboard Summary
    // ============================================================

    @Get('dashboard')
    @ApiOperation({ summary: 'Get comprehensive onboarding analytics dashboard' })
    @ApiResponse({ status: 200, description: 'Returns complete dashboard metrics' })
    async getDashboardSummary() {
        return this.analyticsService.getDashboardSummary();
    }

    // ============================================================
    // Overview Metrics
    // ============================================================

    @Get('overview')
    @ApiOperation({ summary: 'Get onboarding overview metrics' })
    @ApiResponse({ status: 200, description: 'Returns overview statistics' })
    async getOverviewMetrics() {
        return this.analyticsService.getOverviewMetrics();
    }

    // ============================================================
    // Task Bottleneck Analysis
    // ============================================================

    @Get('task-bottlenecks')
    @ApiOperation({ summary: 'Get task bottleneck analysis' })
    @ApiResponse({ status: 200, description: 'Returns task bottleneck metrics' })
    async getTaskBottleneckAnalysis() {
        return this.analyticsService.getTaskBottleneckAnalysis();
    }

    // ============================================================
    // Department SLA Metrics
    // ============================================================

    @Get('department-sla')
    @ApiOperation({ summary: 'Get department SLA compliance metrics' })
    @ApiResponse({ status: 200, description: 'Returns department SLA data' })
    async getDepartmentSLAMetrics() {
        return this.analyticsService.getDepartmentSLAMetrics();
    }

    // ============================================================
    // Time to Productivity
    // ============================================================

    @Get('time-to-productivity')
    @ApiOperation({ summary: 'Get time-to-productivity metrics for recent hires' })
    @ApiQuery({ name: 'limit', required: false, description: 'Number of employees to return', type: Number })
    @ApiResponse({ status: 200, description: 'Returns time-to-productivity data' })
    async getTimeToProductivityMetrics(@Query('limit') limit?: number) {
        return this.analyticsService.getTimeToProductivityMetrics(limit || 20);
    }

    // ============================================================
    // Progress by Department
    // ============================================================

    @Get('progress-by-department')
    @ApiOperation({ summary: 'Get onboarding progress grouped by department' })
    @ApiResponse({ status: 200, description: 'Returns department progress data' })
    async getProgressByDepartment() {
        return this.analyticsService.getProgressByDepartment();
    }

    // ============================================================
    // Onboarding Trends
    // ============================================================

    @Get('trends')
    @ApiOperation({ summary: 'Get onboarding trends over time' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months for trend analysis', type: Number })
    @ApiResponse({ status: 200, description: 'Returns onboarding trends' })
    async getOnboardingTrends(@Query('months') months?: number) {
        return this.analyticsService.getOnboardingTrends(months || 6);
    }

    // ============================================================
    // Task Completion Timeline
    // ============================================================

    @Get('task-timeline')
    @ApiOperation({ summary: 'Get task completion timeline analysis' })
    @ApiResponse({ status: 200, description: 'Returns task timeline data' })
    async getTaskCompletionTimeline() {
        return this.analyticsService.getTaskCompletionTimeline();
    }
}
