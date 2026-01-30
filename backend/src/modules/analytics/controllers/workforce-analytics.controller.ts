import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WorkforceAnalyticsService } from '../services/workforce-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Workforce Analytics')
@Controller('analytics')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@ApiBearerAuth()
export class WorkforceAnalyticsController {
    constructor(private readonly workforceAnalyticsService: WorkforceAnalyticsService) { }

    @Get('headcount-trends')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get headcount trends over time (monthly new hires, terminations, net change)' })
    @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to retrieve (default: 12)' })
    async getHeadcountTrends(@Query('months') months?: number) {
        const numMonths = months && !isNaN(months) ? Math.min(Math.max(months, 1), 36) : 12;
        return this.workforceAnalyticsService.getHeadcountTrends(numMonths);
    }

    @Get('turnover-metrics')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get turnover metrics including rates by department and tenure band' })
    @ApiQuery({ name: 'months', required: false, type: Number, description: 'Period in months (default: 12)' })
    async getTurnoverMetrics(@Query('months') months?: number) {
        const numMonths = months && !isNaN(months) ? Math.min(Math.max(months, 1), 36) : 12;
        return this.workforceAnalyticsService.getTurnoverMetrics(numMonths);
    }

    @Get('demographics')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get workforce demographics breakdown (age, tenure, contract type)' })
    async getDemographicsBreakdown() {
        return this.workforceAnalyticsService.getDemographicsBreakdown();
    }

    @Get('attrition-forecast')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get attrition forecast with predictive modeling and risk factors' })
    async getAttritionForecast() {
        return this.workforceAnalyticsService.getAttritionForecast();
    }

    @Get('tenure-distribution')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get employee tenure distribution buckets' })
    async getTenureDistribution() {
        return this.workforceAnalyticsService.getTenureDistribution();
    }

    @Get('age-demographics')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get employee age demographics distribution' })
    async getAgeDemographics() {
        return this.workforceAnalyticsService.getAgeDemographics();
    }

    @Get('employment-types')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get employment type distribution (full-time, part-time, contract, etc.)' })
    async getEmploymentTypes() {
        return this.workforceAnalyticsService.getEmploymentTypes();
    }

    @Get('high-risk-employees')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get employees at high risk of attrition based on various factors' })
    async getHighRiskEmployees() {
        return this.workforceAnalyticsService.getHighRiskEmployees();
    }

    @Get('vacancy-forecast')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get vacancy forecast based on historical attrition and current structure' })
    @ApiQuery({ name: 'months', required: false, type: Number, description: 'Forecast period in months (default: 6)' })
    async getVacancyForecast(@Query('months') months?: number) {
        const numMonths = months && !isNaN(months) ? Math.min(Math.max(months, 1), 12) : 6;
        return this.workforceAnalyticsService.getVacancyForecast(numMonths);
    }

    @Get('network-metrics')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get organization network metrics including influencers and collaboration matrix' })
    async getNetworkMetrics() {
        return this.workforceAnalyticsService.getNetworkMetrics();
    }

    @Get('structure-metrics')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get structure metrics including span of control, depth analysis, and health score' })
    async getStructureMetrics() {
        return this.workforceAnalyticsService.getStructureMetrics();
    }
}
