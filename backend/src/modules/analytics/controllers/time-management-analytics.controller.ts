import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TimeManagementAnalyticsService } from '../services/time-management-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';


@Controller('time-management-analytics')
@UseGuards(AuthenticationGuard,AuthorizationGuard)
export class TimeManagementAnalyticsController {
  constructor(
    private readonly analyticsService: TimeManagementAnalyticsService,
  ) {}

  /**
   * Get comprehensive time management dashboard with all analytics
   */
  @Get('dashboard')
  async getDashboard() {
    return this.analyticsService.getDashboard();
  }

  /**
   * Get attendance overview statistics
   */
  @Get('attendance/overview')
  async getAttendanceOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    return this.analyticsService.getAttendanceOverview(dateRange);
  }

  /**
   * Get attendance trends over time
   */
  @Get('attendance/trends')
  async getAttendanceTrends(@Query('days') days?: string) {
    return this.analyticsService.getAttendanceTrends(days ? parseInt(days) : 30);
  }

  /**
   * Get attendance analysis by department
   */
  @Get('attendance/by-department')
  async getDepartmentAttendance() {
    return this.analyticsService.getDepartmentAttendance();
  }

  /**
   * Get shift distribution analysis
   */
  @Get('shifts/distribution')
  async getShiftDistribution() {
    return this.analyticsService.getShiftDistribution();
  }

  /**
   * Get overtime analysis
   */
  @Get('overtime/analysis')
  async getOvertimeAnalysis(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
    return this.analyticsService.getOvertimeAnalysis(dateRange);
  }

  /**
   * Get time exception analysis
   */
  @Get('exceptions/analysis')
  async getExceptionAnalysis() {
    return this.analyticsService.getExceptionAnalysis();
  }

  /**
   * Get holiday calendar analysis
   */
  @Get('holidays/analysis')
  async getHolidayCalendarAnalysis() {
    return this.analyticsService.getHolidayCalendarAnalysis();
  }

  /**
   * Get punctuality score across organization
   */
  @Get('punctuality/score')
  async getPunctualityScore() {
    return this.analyticsService.getPunctualityScore();
  }

  /**
   * Get work pattern insights
   */
  @Get('work-patterns')
  async getWorkPatternInsights() {
    return this.analyticsService.getWorkPatternInsights();
  }

  /**
   * Get time management health score
   */
  @Get('health-score')
  async getHealthScore() {
    return this.analyticsService.getHealthScore();
  }

  /**
   * Get data-driven stories for time management
   */
  @Get('stories')
  async getStories() {
    return this.analyticsService.generateStories();
  }
}
