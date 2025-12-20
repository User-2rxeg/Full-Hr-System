
import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpStatus,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { RecruitmentService } from '../services/recruitment.service';
import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
import { Roles } from '../../auth/decorators/roles-decorator';
import { Public } from '../../auth/decorators/public-decorator';
import { CurrentUser } from '../../auth/decorators/current-user';
import type { JwtPayload } from '../../auth/token/jwt-payload';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

// DTOs
import {
    CreateJobTemplateDto,
    UpdateJobTemplateDto,
    CreateJobRequisitionDto,
    PublishJobRequisitionDto,
    UpdateJobRequisitionDto,
    CreateApplicationDto,
    UpdateApplicationStageDto,
    UpdateApplicationStatusDto,
    AssignHrDto,
    CreateReferralDto,
    ScheduleInterviewDto,
    UpdateInterviewDto,
    CancelInterviewDto,
    SubmitFeedbackDto,
    CreateOfferDto,
    ApproveOfferDto,
    CandidateOfferResponseDto,
    SendNotificationDto,
    SendRejectionDto,
} from '../dto/recruitment';

// Enums
import { ApplicationStage } from '../enums/application-stage.enum';
import { ApplicationStatus } from '../enums/application-status.enum';
import { OfferFinalStatus } from '../enums/offer-final-status.enum';

@ApiTags('Recruitment')
@ApiBearerAuth('access-token')
@Controller('recruitment')
// @UseGuards(AuthenticationGuard, AuthorizationGuard) // COMMENTED FOR TESTING
export class RecruitmentController {
    constructor(private readonly recruitmentService: RecruitmentService) { }

    // ============================================================
    // REC-003: Job Template Endpoints
    // Define standardized job description templates
    // ============================================================

    @Post('job-templates')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-003: Create a standardized job description template' })
    @ApiResponse({ status: 201, description: 'Job template created successfully' })
    async createJobTemplate(@Body() dto: CreateJobTemplateDto) {
        return this.recruitmentService.createJobTemplate(dto);
    }

    @Get('job-templates')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-003: Get all job templates' })
    @ApiResponse({ status: 200, description: 'List of all job templates' })
    async getAllJobTemplates() {
        return this.recruitmentService.getAllJobTemplates();
    }

    @Get('job-templates/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-003: Get job template by ID' })
    @ApiParam({ name: 'id', description: 'Job template ID' })
    @ApiResponse({ status: 200, description: 'Job template details' })
    @ApiResponse({ status: 404, description: 'Job template not found' })
    async getJobTemplateById(@Param('id') id: string) {
        return this.recruitmentService.getJobTemplateById(id);
    }

    @Put('job-templates/:id')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-003: Update job template' })
    @ApiParam({ name: 'id', description: 'Job template ID' })
    @ApiResponse({ status: 200, description: 'Job template updated' })
    async updateJobTemplate(@Param('id') id: string, @Body() dto: UpdateJobTemplateDto) {
        return this.recruitmentService.updateJobTemplate(id, dto);
    }

    @Delete('job-templates/:id')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'REC-003: Delete job template' })
    @ApiParam({ name: 'id', description: 'Job template ID' })
    @ApiResponse({ status: 200, description: 'Job template deleted' })
    async deleteJobTemplate(@Param('id') id: string) {
        return this.recruitmentService.deleteJobTemplate(id);
    }

    // ============================================================
    // REC-004 & REC-023: Job Requisition Endpoints
    // Create job openings and publish to careers page
    // ============================================================

    @Post('job-requisitions')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-004: Create a new job requisition' })
    @ApiResponse({ status: 201, description: 'Job requisition created successfully' })
    async createJobRequisition(@Body() dto: CreateJobRequisitionDto) {
        return this.recruitmentService.createJobRequisition(dto);
    }

    @Get('job-requisitions')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-004: Get all job requisitions' })
    @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'closed'] })
    @ApiQuery({ name: 'managerId', required: false, description: 'Filter by hiring manager' })
    @ApiResponse({ status: 200, description: 'List of job requisitions' })
    async getAllJobRequisitions(
        @Query('status') status?: string,
        @Query('managerId') managerId?: string,
    ) {
        return this.recruitmentService.getAllJobRequisitions({ status, managerId });
    }

    @Get('job-requisitions/published')
    @Public()
    @ApiOperation({ summary: 'REC-023: Get published jobs for careers page' })
    @ApiResponse({ status: 200, description: 'List of published job openings' })
    async getPublishedJobs() {
        return this.recruitmentService.getPublishedJobs();
    }

    @Get('job-requisitions/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-004: Get job requisition by ID' })
    @ApiParam({ name: 'id', description: 'Job requisition ID' })
    @ApiResponse({ status: 200, description: 'Job requisition details' })
    async getJobRequisitionById(@Param('id') id: string) {
        return this.recruitmentService.getJobRequisitionById(id);
    }

    @Get('job-requisitions/:id/progress')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-009: Get recruitment progress for a requisition' })
    @ApiParam({ name: 'id', description: 'Job requisition ID' })
    @ApiResponse({ status: 200, description: 'Recruitment progress data' })
    async getRequisitionProgress(@Param('id') id: string) {
        return this.recruitmentService.getRequisitionProgress(id);
    }

    @Put('job-requisitions/:id')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-004: Update job requisition' })
    @ApiParam({ name: 'id', description: 'Job requisition ID' })
    @ApiResponse({ status: 200, description: 'Job requisition updated' })
    async updateJobRequisition(@Param('id') id: string, @Body() dto: UpdateJobRequisitionDto) {
        return this.recruitmentService.updateJobRequisition(id, dto);
    }

    @Patch('job-requisitions/:id/publish')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-023: Publish or unpublish job requisition' })
    @ApiParam({ name: 'id', description: 'Job requisition ID' })
    @ApiResponse({ status: 200, description: 'Job requisition publish status updated' })
    async publishJobRequisition(@Param('id') id: string, @Body() dto: PublishJobRequisitionDto) {
        return this.recruitmentService.publishJobRequisition(id, dto);
    }

    @Patch('job-requisitions/:id/close')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_EMPLOYEE, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-004: Close a job requisition (REC-023: Unpublish)' })
    @ApiParam({ name: 'id', description: 'Job requisition ID' })
    @ApiResponse({ status: 200, description: 'Job requisition closed' })
    async closeJobRequisition(@Param('id') id: string) {
        return this.recruitmentService.closeJobRequisition(id);
    }

    // ============================================================
    // REC-007 & REC-028: Application Endpoints
    // Candidate applies for positions with GDPR consent
    // ============================================================

    @Post('applications')
    @Public()
    @ApiOperation({ summary: 'REC-007 & REC-028: Submit a new job application with consent' })
    @ApiResponse({ status: 201, description: 'Application submitted successfully' })
    @ApiResponse({ status: 400, description: 'Invalid application or missing consent' })
    @ApiResponse({ status: 409, description: 'Duplicate application' })
    async createApplication(@Body() dto: CreateApplicationDto) {
        return this.recruitmentService.createApplication(dto);
    }

    @Get('applications')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-008: Get all applications with filters' })
    @ApiQuery({ name: 'requisitionId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
    @ApiQuery({ name: 'stage', required: false, enum: ApplicationStage })
    @ApiQuery({ name: 'hrId', required: false, description: 'Filter by assigned HR' })
    @ApiResponse({ status: 200, description: 'List of applications' })
    async getAllApplications(
        @Query('requisitionId') requisitionId?: string,
        @Query('status') status?: ApplicationStatus,
        @Query('stage') stage?: ApplicationStage,
        @Query('hrId') hrId?: string,
    ) {
        return this.recruitmentService.getAllApplications({ requisitionId, status, stage, hrId });
    }

    @Get('applications/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-008: Get application by ID' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Application details' })
    async getApplicationById(@Param('id') id: string) {
        return this.recruitmentService.getApplicationById(id);
    }

    @Get('applications/:id/history')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-017: Get application status history' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Application status change history' })
    async getApplicationHistory(@Param('id') id: string) {
        return this.recruitmentService.getApplicationHistory(id);
    }


    @Get('candidates')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-017: Get all candidates' })
    @ApiResponse({ status: 200, description: 'List of all candidates' })
    async getAllCandidates() {
        return this.recruitmentService.getAllCandidates();
    }

    @Get('candidates/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.JOB_CANDIDATE)
    @ApiOperation({ summary: 'REC-017: Get candidate by ID' })
    @ApiParam({ name: 'id', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Candidate details' })
    async getCandidateById(@Param('id') id: string) {
        return this.recruitmentService.getCandidateById(id);
    }

    @Get('candidates/:candidateId/applications')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.JOB_CANDIDATE)
    @ApiOperation({ summary: 'REC-017: Get all applications by candidate' })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Candidate applications list' })
    async getApplicationsByCandidate(@Param('candidateId') candidateId: string) {
        return this.recruitmentService.getApplicationsByCandidate(candidateId);
    }

    @Patch('applications/:id/assign-hr')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-008: Assign HR employee to application' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'HR assigned successfully' })
    async assignHrToApplication(@Param('id') id: string, @Body() dto: AssignHrDto) {
        return this.recruitmentService.assignHrToApplication(id, dto);
    }

    @Patch('applications/:id/stage')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-008: Update application stage' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Application stage updated' })
    async updateApplicationStage(@Param('id') id: string, @Body() dto: UpdateApplicationStageDto) {
        return this.recruitmentService.updateApplicationStage(id, dto);
    }

    @Patch('applications/:id/status')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-008: Update application status' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Application status updated' })
    async updateApplicationStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
        return this.recruitmentService.updateApplicationStatus(id, dto);
    }

    @Patch('applications/:id/reject')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-022: Reject application' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Application rejected' })
    async rejectApplication(
        @Param('id') id: string,
        @Body('reason') reason?: string,
    ) {
        return this.recruitmentService.rejectApplication(id, reason);
    }


    // ============================================================
    // REC-009: Dashboard & Analytics
    // Monitor recruitment progress across all open positions
    // ============================================================

    @Get('dashboard')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-009: Get recruitment dashboard data' })
    @ApiResponse({ status: 200, description: 'Recruitment dashboard metrics' })
    async getRecruitmentDashboard() {
        return this.recruitmentService.getRecruitmentDashboard();
    }

    // ============================================================
    // REC-030: Referral Endpoints
    // Tag candidates as referrals for preferential filtering
    // ============================================================

    @Post('referrals')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-030: Create employee referral' })
    @ApiResponse({ status: 201, description: 'Referral created successfully' })
    @ApiResponse({ status: 409, description: 'Candidate already referred' })
    async createReferral(@Body() dto: CreateReferralDto) {
        return this.recruitmentService.createReferral(dto);
    }

    @Get('referrals')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-030: Get all referrals' })
    @ApiResponse({ status: 200, description: 'List of all referrals' })
    async getAllReferrals() {
        return this.recruitmentService.getAllReferrals();
    }

    @Get('referrals/candidate/:candidateId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-030: Get referral by candidate ID' })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Referral details' })
    async getReferralByCandidate(@Param('candidateId') candidateId: string) {
        return this.recruitmentService.getReferralByCandidate(candidateId);
    }

    @Get('referrals/check/:candidateId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-030: Check if candidate is a referral' })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Referral status' })
    async isReferral(@Param('candidateId') candidateId: string) {
        const isReferral = await this.recruitmentService.isReferral(candidateId);
        return { isReferral };
    }

    // ============================================================
    // REC-010 & REC-021: Interview Endpoints
    // Schedule interviews and coordinate panels
    // ============================================================

    @Post('interviews')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-010: Schedule a new interview' })
    @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
    async scheduleInterview(@Body() dto: ScheduleInterviewDto) {
        return this.recruitmentService.scheduleInterview(dto);
    }

    @Get('interviews')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-010: Get all interviews with filters' })
    @ApiQuery({ name: 'applicationId', required: false, description: 'Filter by application ID' })
    @ApiQuery({ name: 'interviewerId', required: false, description: 'Filter by interviewer/panelist ID' })
    @ApiQuery({ name: 'days', required: false, description: 'Number of days ahead for upcoming interviews' })
    @ApiResponse({ status: 200, description: 'List of interviews' })
    async getInterviews(
        @Query('applicationId') applicationId?: string,
        @Query('interviewerId') interviewerId?: string,
        @Query('days') days?: number,
    ) {
        return this.recruitmentService.getAllInterviews({ applicationId, interviewerId, days });
    }

    @Get('interviews/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({ summary: 'REC-010: Get interview by ID' })
    @ApiParam({ name: 'id', description: 'Interview ID' })
    @ApiResponse({ status: 200, description: 'Interview details' })
    async getInterviewById(@Param('id') id: string) {
        return this.recruitmentService.getInterviewById(id);
    }

    @Get('interviews/application/:applicationId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-010: Get interviews for an application' })
    @ApiParam({ name: 'applicationId', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'List of interviews for application' })
    async getInterviewsByApplication(@Param('applicationId') applicationId: string) {
        return this.recruitmentService.getInterviewsByApplication(applicationId);
    }

    @Get('interviews/panelist/:panelistId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({ summary: 'REC-021: Get interviews for a panelist' })
    @ApiParam({ name: 'panelistId', description: 'Panelist/User ID' })
    @ApiResponse({ status: 200, description: 'List of interviews for panelist' })
    async getInterviewsByPanelist(@Param('panelistId') panelistId: string) {
        return this.recruitmentService.getInterviewsByPanelist(panelistId);
    }

    @Put('interviews/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-010: Update interview details' })
    @ApiParam({ name: 'id', description: 'Interview ID' })
    @ApiResponse({ status: 200, description: 'Interview updated' })
    async updateInterview(@Param('id') id: string, @Body() dto: UpdateInterviewDto) {
        return this.recruitmentService.updateInterview(id, dto);
    }

    @Patch('interviews/:id/complete')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-010: Mark interview as completed' })
    @ApiParam({ name: 'id', description: 'Interview ID' })
    @ApiResponse({ status: 200, description: 'Interview marked as completed' })
    async completeInterview(@Param('id') id: string) {
        return this.recruitmentService.completeInterview(id);
    }

    @Patch('interviews/:id/cancel')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-010: Cancel an interview' })
    @ApiParam({ name: 'id', description: 'Interview ID' })
    @ApiResponse({ status: 200, description: 'Interview cancelled' })
    async cancelInterview(@Param('id') id: string, @Body() dto: CancelInterviewDto) {
        return this.recruitmentService.cancelInterview(id, dto.reason);
    }

    // ============================================================
    // REC-011 & REC-020: Feedback & Assessment Endpoints
    // Submit interview feedback and scoring
    // ============================================================

    @Post('feedback')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.DEPARTMENT_HEAD, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({ summary: 'REC-011: Submit interview feedback and scores' })
    @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
    async submitFeedback(@Body() dto: SubmitFeedbackDto) {
        return this.recruitmentService.submitFeedback(dto);
    }

    @Get('feedback/interview/:interviewId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-011: Get feedback for an interview' })
    @ApiParam({ name: 'interviewId', description: 'Interview ID' })
    @ApiResponse({ status: 200, description: 'Interview feedback list' })
    async getFeedbackByInterview(@Param('interviewId') interviewId: string) {
        return this.recruitmentService.getInterviewFeedback(interviewId);
    }

    @Get('feedback/application/:applicationId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-020: Get all feedback for an application' })
    @ApiParam({ name: 'applicationId', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'All feedback for application' })
    async getFeedbackByApplication(@Param('applicationId') applicationId: string) {
        return this.recruitmentService.getFeedbackByApplication(applicationId);
    }

    @Get('feedback/application/:applicationId/average-score')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-020: Get average score for an application' })
    @ApiParam({ name: 'applicationId', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Average assessment score' })
    async getAverageScore(@Param('applicationId') applicationId: string) {
        const averageScore = await this.recruitmentService.getAverageScore(applicationId);
        return { averageScore };
    }

    // ============================================================
    // REC-014 & REC-018: Offer Endpoints
    // Create, approve, and manage job offers
    // ============================================================

    @Post('offers')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-014: Create a new job offer' })
    @ApiResponse({ status: 201, description: 'Offer created successfully' })
    @ApiResponse({ status: 409, description: 'Active offer already exists' })
    async createOffer(@Body() dto: CreateOfferDto) {
        return this.recruitmentService.createOffer(dto);
    }

    @Get('offers')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-014: Get all offers with filters' })
    @ApiQuery({ name: 'applicationId', required: false, description: 'Filter by application ID' })
    @ApiQuery({ name: 'status', required: false, enum: OfferFinalStatus, description: 'Filter by offer status' })
    @ApiResponse({ status: 200, description: 'List of offers' })
    async getOffers(
        @Query('applicationId') applicationId?: string,
        @Query('status') status?: OfferFinalStatus,
    ) {
        return this.recruitmentService.getAllOffers({ applicationId, status });
    }

    @Get('offers/:id')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-014: Get offer by ID' })
    @ApiParam({ name: 'id', description: 'Offer ID' })
    @ApiResponse({ status: 200, description: 'Offer details' })
    async getOfferById(@Param('id') id: string) {
        return this.recruitmentService.getOfferById(id);
    }

    @Get('offers/application/:applicationId')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-014: Get offer for an application' })
    @ApiParam({ name: 'applicationId', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Offer for application' })
    async getOfferByApplication(@Param('applicationId') applicationId: string) {
        return this.recruitmentService.getOfferByApplication(applicationId);
    }

    @Patch('offers/:id/approve')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({ summary: 'REC-014: Approve or reject an offer' })
    @ApiParam({ name: 'id', description: 'Offer ID' })
    @ApiResponse({ status: 200, description: 'Offer approval status updated' })
    async approveOffer(@Param('id') id: string, @Body() dto: ApproveOfferDto) {
        return this.recruitmentService.approveOffer(id, dto);
    }

    @Patch('offers/:id/candidate-response')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER, SystemRole.JOB_CANDIDATE)
    @ApiOperation({ summary: 'REC-018: Record candidate response to offer' })
    @ApiParam({ name: 'id', description: 'Offer ID' })
    @ApiResponse({ status: 200, description: 'Candidate response recorded' })
    async recordCandidateResponse(@Param('id') id: string, @Body() dto: CandidateOfferResponseDto) {
        return this.recruitmentService.recordCandidateResponse(id, dto);
    }

    @Post('offers/:id/send')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-018: Send offer letter electronically to candidate' })
    @ApiParam({ name: 'id', description: 'Offer ID' })
    @ApiResponse({ status: 200, description: 'Offer letter sent successfully' })
    @ApiResponse({ status: 404, description: 'Offer not found' })
    async sendOfferLetter(@Param('id') id: string) {
        return this.recruitmentService.sendOfferLetter(id);
    }

    // ============================================================
    // REC-017 & REC-022: Notification Endpoints
    // Send status updates and rejection notifications
    // ============================================================

    @Post('notifications/status-update')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-017: Send status update notification to candidate' })
    @ApiResponse({ status: 200, description: 'Status update notification sent' })
    @ApiResponse({ status: 400, description: 'Invalid notification data' })
    async sendStatusUpdateNotification(@Body() dto: SendNotificationDto) {
        return this.recruitmentService.sendStatusUpdateNotification(dto);
    }

    @Post('notifications/rejection')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-022: Send automated rejection notification' })
    @ApiResponse({ status: 200, description: 'Rejection notification sent successfully' })
    @ApiResponse({ status: 400, description: 'Invalid rejection data' })
    async sendRejectionNotification(@Body() dto: SendRejectionDto) {
        return this.recruitmentService.sendRejectionNotification(dto);
    }

    @Get('notifications/templates')//@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-022: Get available email templates' })
    @ApiResponse({ status: 200, description: 'List of email templates' })
    async getEmailTemplates() {
        return this.recruitmentService.getEmailTemplates();
    }

    // ============================================================
    // REC-029: Pre-boarding Trigger
    // Trigger pre-boarding tasks after offer acceptance
    // ============================================================

    @Post('applications/:id/trigger-preboarding')//@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.RECRUITER)
    @ApiOperation({ summary: 'REC-029: Trigger pre-boarding after offer acceptance' })
    @ApiParam({ name: 'id', description: 'Application ID' })
    @ApiResponse({ status: 200, description: 'Pre-boarding triggered' })
    async triggerPreboarding(@Param('id') id: string) {
        return this.recruitmentService.triggerPreboarding(id);
    }
}
