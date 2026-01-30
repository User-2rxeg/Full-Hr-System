import { Controller, Get, Post, Query, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrgStructureAnalyticsService } from '../services/org-structure-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

class SimulateChangeDto {
    actionType: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT';
    targetId: string;
}

@ApiTags('Organization Structure Analytics')
@Controller('analytics/org-structure')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@ApiBearerAuth()
export class OrgStructureAnalyticsController {
    constructor(private readonly orgAnalyticsService: OrgStructureAnalyticsService) { }

    @Get('health')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get overall structural health score with grade and insights' })
    async getStructuralHealth() {
        return this.orgAnalyticsService.getStructuralHealth();
    }

    @Get('summary')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get organization summary statistics' })
    async getOrgSummaryStats() {
        return this.orgAnalyticsService.getOrgSummaryStats();
    }

    @Get('departments')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get department-level analytics (fill rates, health scores, risk levels)' })
    async getDepartmentAnalytics() {
        return this.orgAnalyticsService.getDepartmentAnalytics();
    }

    @Get('positions/risk')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get position-level risk assessment (criticality, vacancy risk, succession status)' })
    async getPositionRiskAssessment() {
        return this.orgAnalyticsService.getPositionRiskAssessment();
    }

    @Get('cost-centers')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get cost center analysis with utilization rates' })
    async getCostCenterAnalysis() {
        return this.orgAnalyticsService.getCostCenterAnalysis();
    }

    @Get('span-of-control')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get span of control metrics for management positions' })
    async getSpanOfControlMetrics() {
        return this.orgAnalyticsService.getSpanOfControlMetrics();
    }

    @Get('vacancy-forecasts')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get vacancy forecasts based on tenure and risk factors' })
    async getVacancyForecasts() {
        return this.orgAnalyticsService.getVacancyForecasts();
    }

    @Post('simulate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Simulate the impact of a structural change (deactivate position/department)' })
    @ApiBody({ type: SimulateChangeDto })
    async simulateChangeImpact(@Body() body: SimulateChangeDto) {
        return this.orgAnalyticsService.simulateChangeImpact(body.actionType, body.targetId);
    }

    // ============ TEAM-SPECIFIC ENDPOINTS (FOR DEPARTMENT HEADS) ============

    @Get('team/:departmentId/metrics')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'Get structure metrics for a specific team/department' })
    @ApiParam({ name: 'departmentId', description: 'The department ID' })
    async getTeamStructureMetrics(@Param('departmentId') departmentId: string) {
        return this.orgAnalyticsService.getTeamStructureMetrics(departmentId);
    }

    @Get('team/:departmentId/org-chart')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'Get org chart data for a specific team/department' })
    @ApiParam({ name: 'departmentId', description: 'The department ID' })
    async getTeamOrgChartData(@Param('departmentId') departmentId: string) {
        return this.orgAnalyticsService.getTeamOrgChartData(departmentId);
    }

    @Get('team/:departmentId/vacancy-forecasts')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'Get vacancy forecasts for a specific team/department' })
    @ApiParam({ name: 'departmentId', description: 'The department ID' })
    async getTeamVacancyForecasts(@Param('departmentId') departmentId: string) {
        return this.orgAnalyticsService.getTeamVacancyForecasts(departmentId);
    }
}
