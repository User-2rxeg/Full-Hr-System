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

import { RecruitmentAnalyticsService } from '../services/recruitment-analytics.service';

@ApiTags('Recruitment Analytics')
@ApiBearerAuth('access-token')
@Controller('recruitment/analytics')
// @UseGuards(AuthenticationGuard, AuthorizationGuard)
export class RecruitmentAnalyticsController {
    constructor(private readonly analyticsService: RecruitmentAnalyticsService) { }

    // ============================================================
    // Dashboard Summary
    // ============================================================

    @Get('dashboard')
    @ApiOperation({ summary: 'Get comprehensive recruitment analytics dashboard' })
    @ApiResponse({ status: 200, description: 'Returns complete dashboard metrics' })
    async getDashboardSummary() {
        return this.analyticsService.getDashboardSummary();
    }

    // ============================================================
    // Funnel Analytics
    // ============================================================

    @Get('funnel')
    @ApiOperation({ summary: 'Get recruitment funnel analytics' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date for filtering' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date for filtering' })
    @ApiResponse({ status: 200, description: 'Returns funnel stage metrics' })
    async getFunnelAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.analyticsService.getFunnelAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    // ============================================================
    // Source Effectiveness
    // ============================================================

    @Get('source-effectiveness')
    @ApiOperation({ summary: 'Get hiring source effectiveness metrics' })
    @ApiResponse({ status: 200, description: 'Returns source effectiveness analysis' })
    async getSourceEffectiveness() {
        return this.analyticsService.getSourceEffectiveness();
    }

    // ============================================================
    // Time to Hire Breakdown
    // ============================================================

    @Get('time-to-hire')
    @ApiOperation({ summary: 'Get time-to-hire breakdown by stage' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months to analyze', type: Number })
    @ApiResponse({ status: 200, description: 'Returns time-to-hire metrics' })
    async getTimeToHireBreakdown(@Query('months') months?: number) {
        return this.analyticsService.getTimeToHireBreakdown(months || 6);
    }

    // ============================================================
    // Interviewer Calibration
    // ============================================================

    @Get('interviewer-calibration')
    @ApiOperation({ summary: 'Get interviewer calibration and consistency metrics' })
    @ApiResponse({ status: 200, description: 'Returns interviewer performance data' })
    async getInterviewerCalibration() {
        return this.analyticsService.getInterviewerCalibration();
    }

    // ============================================================
    // Requisition Health Scores
    // ============================================================

    @Get('requisition-health')
    @ApiOperation({ summary: 'Get health scores for active job requisitions' })
    @ApiResponse({ status: 200, description: 'Returns requisition health analysis' })
    async getRequisitionHealthScores() {
        return this.analyticsService.getRequisitionHealthScores();
    }

    // ============================================================
    // Bottleneck Analysis
    // ============================================================

    @Get('bottlenecks')
    @ApiOperation({ summary: 'Identify recruitment pipeline bottlenecks' })
    @ApiResponse({ status: 200, description: 'Returns bottleneck analysis' })
    async getBottleneckAnalysis() {
        return this.analyticsService.getBottleneckAnalysis();
    }

    // ============================================================
    // Recruitment Trends
    // ============================================================

    @Get('trends')
    @ApiOperation({ summary: 'Get recruitment trends over time' })
    @ApiQuery({ name: 'months', required: false, description: 'Number of months for trend analysis', type: Number })
    @ApiResponse({ status: 200, description: 'Returns recruitment trends' })
    async getRecruitmentTrends(@Query('months') months?: number) {
        return this.analyticsService.getRecruitmentTrends(months || 6);
    }
}
