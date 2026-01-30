import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeavesAnalyticsService } from '../services/leaves-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';


@Controller('leaves-analytics')
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class LeavesAnalyticsController {
  constructor(
    private readonly analyticsService: LeavesAnalyticsService,
  ) {}

  /**
   * Get comprehensive leaves dashboard with all analytics
   */
  @Get('dashboard')
  async getDashboard() {
    return this.analyticsService.getDashboard();
  }

  /**
   * Get leave overview statistics
   */
  @Get('overview')
  async getLeaveOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    return this.analyticsService.getLeaveOverview(dateRange);
  }

  /**
   * Get leave balance summary across organization
   */
  @Get('balance-summary')
  async getBalanceSummary() {
    return this.analyticsService.getBalanceSummary();
  }

  /**
   * Get leave request trends over time
   */
  @Get('request-trends')
  async getRequestTrends(@Query('months') months?: string) {
    return this.analyticsService.getRequestTrends(months ? parseInt(months) : 12);
  }

  /**
   * Get analysis by leave type
   */
  @Get('by-type')
  async getLeaveTypeAnalysis() {
    return this.analyticsService.getLeaveTypeAnalysis();
  }

  /**
   * Get leave analysis by department
   */
  @Get('by-department')
  async getDepartmentLeaveAnalysis() {
    return this.analyticsService.getDepartmentLeaveAnalysis();
  }

  /**
   * Get seasonal patterns in leave requests
   */
  @Get('seasonal-patterns')
  async getSeasonalPatterns() {
    return this.analyticsService.getSeasonalPatterns();
  }

  /**
   * Get leave forecasting predictions
   */
  @Get('forecasting')
  async getForecasting() {
    return this.analyticsService.getForecasting();
  }

  /**
   * Get absenteeism analysis
   */
  @Get('absenteeism')
  async getAbsenteeismAnalysis() {
    return this.analyticsService.getAbsenteeismAnalysis();
  }

  /**
   * Get policy compliance metrics
   */
  @Get('policy-compliance')
  async getPolicyCompliance() {
    return this.analyticsService.getPolicyCompliance();
  }

  /**
   * Get approval workflow analytics
   */
  @Get('approval-workflow')
  async getApprovalWorkflow() {
    return this.analyticsService.getApprovalWorkflow();
  }

  /**
   * Get leaves management health score
   */
  @Get('health-score')
  async getHealthScore() {
    return this.analyticsService.getHealthScore();
  }

  /**
   * Get data-driven stories for leave management
   */
  @Get('stories')
  async getStories() {
    return this.analyticsService.generateStories();
  }
}
