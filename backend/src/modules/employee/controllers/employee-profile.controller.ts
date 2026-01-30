// Production mode authenticated controller
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UpdateContactInfoDto } from '../dto\'s/update-contact-info.dto';
import { UpdateBioDto } from '../dto\'s/update-bio.dto';
import { CreateCorrectionRequestDto } from '../dto\'s/create-correction-request.dto';
import { AdminUpdateProfileDto } from '../dto\'s/admin-update-profile.dto';
import { AdminAssignRoleDto } from '../dto\'s/admin-assign-role.dto';
import { SearchEmployeesDto, PaginationQueryDto } from '../dto\'s/search-employees.dto';
import { ProcessChangeRequestDto } from '../dto\'s/process-change-request.dto';
import { ProfileChangeStatus, SystemRole } from '../enums/employee-profile.enums';
import { AddEmergencyContactDto, UpdateEmergencyContactDto } from '../dto\'s/emergency-contact.dto';
import { AddQualificationDto, UpdateQualificationDto } from '../dto\'s/qualification.dto';
import { EmployeeProfileService } from '../services/employee-profile.service';

import { AuthenticationGuard } from '../../common/guards/authentication-guard';
import { AuthorizationGuard } from '../../common/guards/authorization-guard';
import { Roles } from '../../common/decorators/roles-decorator';
import { CurrentUser } from '../../common/decorators/current-user';
import type { JwtPayload } from '../../common/payload/jwt-payload';

@Controller('employee-profile')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class EmployeeProfileController {
    constructor(
        private readonly employeeProfileService: EmployeeProfileService,

    ) { }

    // ==========================================
    // EMPLOYEE SELF-SERVICE ROUTES
    // ==========================================

    @Get('me')
    async getMyProfile(@CurrentUser() user: JwtPayload) {
        return this.employeeProfileService.getProfile(user.sub);
    }

    @Patch('me/contact-info')
    async updateContactInfo(@CurrentUser() user: JwtPayload, @Body() dto: UpdateContactInfoDto) {
        return this.employeeProfileService.updateContactInfo(user.sub, dto);
    }

    @Patch('me/bio')
    async updateBio(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBioDto) {
        return this.employeeProfileService.updateBio(user.sub, dto);
    }

    @Post('me/correction-request')
    async createCorrectionRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateCorrectionRequestDto) {
        return this.employeeProfileService.createCorrectionRequest(user.sub, dto);
    }

    @Get('me/correction-requests')
    async getMyChangeRequests(@CurrentUser() user: JwtPayload, @Query() queryDto: PaginationQueryDto) {
        return this.employeeProfileService.getMyChangeRequests(user.sub, queryDto);
    }

    @Patch('me/correction-requests/:requestId/cancel')
    async cancelMyChangeRequest(@CurrentUser() user: JwtPayload, @Param('requestId') requestId: string) {
        return this.employeeProfileService.cancelMyChangeRequest(user.sub, requestId);
    }


    // ==========================================
    // EMERGENCY CONTACT MANAGEMENT ROUTES
    // ==========================================

    @Get('me/emergency-contacts')
    async getEmergencyContacts(@CurrentUser() user: JwtPayload) {
        return this.employeeProfileService.getEmergencyContacts(user.sub);
    }

    @Post('me/emergency-contacts')
    async addEmergencyContact(@CurrentUser() user: JwtPayload, @Body() dto: AddEmergencyContactDto) {
        return this.employeeProfileService.addEmergencyContact(user.sub, dto);
    }

    @Patch('me/emergency-contacts/:index')
    async updateEmergencyContact(
        @CurrentUser() user: JwtPayload,
        @Param('index') index: number,
        @Body() dto: UpdateEmergencyContactDto
    ) {
        return this.employeeProfileService.updateEmergencyContact(user.sub, index, dto);
    }

    @Delete('me/emergency-contacts/:index')
    async deleteEmergencyContact(@CurrentUser() user: JwtPayload, @Param('index') index: number) {
        return this.employeeProfileService.deleteEmergencyContact(user.sub, index);
    }

    // ==========================================
    // QUALIFICATION MANAGEMENT ROUTES
    // ==========================================

    @Get('me/qualifications')
    async getQualifications(@CurrentUser() user: JwtPayload) {
        return this.employeeProfileService.getQualifications(user.sub);
    }

    @Post('me/qualifications')
    async addQualification(@CurrentUser() user: JwtPayload, @Body() dto: AddQualificationDto) {
        return this.employeeProfileService.addQualification(user.sub, dto);
    }

    @Patch('me/qualifications/:id')
    async updateQualification(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateQualificationDto
    ) {
        return this.employeeProfileService.updateQualification(user.sub, id, dto);
    }

    @Delete('me/qualifications/:id')
    async deleteQualification(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.employeeProfileService.deleteQualification(user.sub, id);
    }

    // ==========================================
    // MANAGER ROUTES (TEAM VIEW)
    // ==========================================

    @Get('team')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getTeamProfiles(@CurrentUser() user: JwtPayload) {
        return this.employeeProfileService.getTeamProfiles(user.sub, user.roles);
    }

    @Get('team/paginated')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getTeamProfilesPaginated(@CurrentUser() user: JwtPayload, @Query() queryDto: PaginationQueryDto) {
        return this.employeeProfileService.getTeamProfilesPaginated(user.sub, queryDto, user.roles);
    }

    // ==========================================
    // HR ADMIN ROUTES
    // ==========================================

    @Get('admin/employees')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getAllEmployees(@Query() queryDto: SearchEmployeesDto) {
        return this.employeeProfileService.getAllEmployees(queryDto);
    }

    @Get('admin/search')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async searchEmployees(@Query() queryDto: SearchEmployeesDto) {
        return this.employeeProfileService.searchEmployees(queryDto);
    }

    @Get('admin/change-requests')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getChangeRequests(
        @Query('status') status?: ProfileChangeStatus,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.employeeProfileService.getChangeRequests(status, page || 1, limit || 20);
    }

    @Get('admin/change-requests/count/pending')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getPendingChangeRequestsCount() {
        const count = await this.employeeProfileService.getPendingChangeRequestsCount();
        return { count };
    }

    @Get('admin/change-requests/:requestId')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getChangeRequestById(@Param('requestId') requestId: string) {
        return this.employeeProfileService.getChangeRequestById(requestId);
    }

    @Patch('admin/change-requests/:requestId/process')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async processChangeRequest(
        @Param('requestId') requestId: string,
        @Body() dto: ProcessChangeRequestDto,
        @CurrentUser() user: JwtPayload
    ) {
        return this.employeeProfileService.processChangeRequest(
            requestId,
            dto.status,
            user.sub,
            dto.rejectionReason,
            dto.proposedChanges
        );
    }

    @Get('admin/stats/by-status')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getEmployeeCountByStatus() {
        return this.employeeProfileService.getEmployeeCountByStatus();
    }

    @Get('admin/stats/by-department')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getEmployeeCountByDepartment() {
        return this.employeeProfileService.getEmployeeCountByDepartment();
    }

    @Get(':id')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getProfile(@Param('id') id: string) {
        return this.employeeProfileService.adminGetProfile(id);
    }

    @Patch(':id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async updateProfile(@Param('id') id: string, @Body() dto: AdminUpdateProfileDto) {
        return this.employeeProfileService.adminUpdateProfile(id, dto);
    }

    @Patch(':id/deactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async deactivateEmployee(@Param('id') id: string) {
        return this.employeeProfileService.adminDeactivateEmployee(id);
    }

    @Patch(':id/role')
    @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async assignRole(@Param('id') id: string, @Body() dto: AdminAssignRoleDto) {
        return this.employeeProfileService.adminAssignRole(id, dto);
    }
}

