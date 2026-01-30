import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '../../common/payload/jwt-payload';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics & Data Science')
@Controller('analytics')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('org-pulse')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Get organizational-wide pulse metrics (Diversity, Performance Avg)' })
    async getOrgPulse() {
        return this.analyticsService.getOrgPulse();
    }

    @Get('attrition/:employeeId')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.HR_EMPLOYEE, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'Predict attrition risk for a specific employee' })
    async getAttritionRisk(@Param('employeeId') employeeId: string) {
        return this.analyticsService.predictAttritionRisk(employeeId);
    }

    @Get('department/:departmentId/skills')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'Get skill matrix and top talent for a department' })
    async getDepartmentSkills(@Param('departmentId') departmentId: string, @CurrentUser() user: any) {
        return this.analyticsService.getDepartmentSkillMatrix(departmentId, user.sub);
    }
}
