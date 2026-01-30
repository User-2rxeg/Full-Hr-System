import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProfileAnalyticsService, type RiskAnalysis } from '../services/profile-analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@Controller('employee/analytics')
//@UseGuards(AuthenticationGuard, AuthorizationGuard)
// Skipping guards for now to ease manual testing if needed, or keeping them. Better to keep them and ensure token works.
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class EmployeeAnalyticsController {
    constructor(private readonly analyticsService: ProfileAnalyticsService) { }

    @Post('change-risk')
    @Roles(SystemRole.HR_ADMIN, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    analyzeChangeParameters(
        @Body() body: { changes: Record<string, any>; context: string }): RiskAnalysis {
        return this.analyticsService.analyzeChangeRequestRisk(body.changes, body.context);
    }

    @Get(':id/retention-risk')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getRetentionRisk(@Param('id') id: string) {
        return await this.analyticsService.calculateRetentionRisk(id);
    }

    @Get(':id/impact')
    @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getDeactivationImpact(@Param('id') id: string) {
        return await this.analyticsService.analyzeDeactivationImpact(id);
    }

    @Get(':id/health')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getProfileHealth(@Param('id') id: string) {
        return await this.analyticsService.getProfileHealth(id);
    }
}
