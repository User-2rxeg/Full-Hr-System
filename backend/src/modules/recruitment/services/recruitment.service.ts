import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { JobTemplate, JobTemplateDocument } from '../models/job-template.schema';
import { JobRequisition, JobRequisitionDocument } from '../models/job-requisition.schema';
import { Application, ApplicationDocument } from '../models/application.schema';
import { ApplicationStatusHistory, ApplicationStatusHistoryDocument } from '../models/application-history.schema';
import { Referral, ReferralDocument } from '../models/referral.schema';
import { Interview, InterviewDocument } from '../models/interview.schema';
import { AssessmentResult, AssessmentResultDocument } from '../models/assessment-result.schema';
import { Offer, OfferDocument } from '../models/offer.schema';
import { Contract, ContractDocument } from '../models/contract.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { Candidate, CandidateDocument } from '../../employee/models/employee/Candidate.Schema';

// DTOs
import { CreateJobTemplateDto, UpdateJobTemplateDto, CreateJobRequisitionDto, PublishJobRequisitionDto, UpdateJobRequisitionDto, CreateApplicationDto, UpdateApplicationStageDto, UpdateApplicationStatusDto, AssignHrDto, CreateReferralDto, ScheduleInterviewDto, UpdateInterviewDto, SubmitFeedbackDto, CreateOfferDto, ApproveOfferDto, CandidateOfferResponseDto, SendNotificationDto, SendRejectionDto, } from '../dto/recruitment';

// Enums
import { ApplicationStage } from '../enums/application-stage.enum';
import { ApplicationStatus } from '../enums/application-status.enum';
import { InterviewStatus } from '../enums/interview-status.enum';
import { OfferFinalStatus } from '../enums/offer-final-status.enum';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';
import { OnboardingService } from './onboarding.service';

@Injectable()
export class RecruitmentService {
    constructor(
        @InjectModel(JobTemplate.name) private jobTemplateModel: Model<JobTemplateDocument>,
        @InjectModel(JobRequisition.name) private jobRequisitionModel: Model<JobRequisitionDocument>,
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectModel(ApplicationStatusHistory.name) private historyModel: Model<ApplicationStatusHistoryDocument>,
        @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
        @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
        @InjectModel(AssessmentResult.name) private assessmentModel: Model<AssessmentResultDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
        private readonly onboardingService: OnboardingService,
    ) { }

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    async createJobTemplate(dto: CreateJobTemplateDto): Promise<JobTemplate> {



        const template = new this.jobTemplateModel(dto);
        return template.save();
    }

    async getAllJobTemplates(): Promise<JobTemplate[]> {
        return this.jobTemplateModel.find().exec();
    }

    async getJobTemplateById(id: string): Promise<JobTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.jobTemplateModel.findById(id).exec();
        if (!template) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return template;
    }

    async updateJobTemplate(id: string, dto: UpdateJobTemplateDto): Promise<JobTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.jobTemplateModel.findByIdAndUpdate(id, dto, { new: true }).exec();
        if (!template) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return template;
    }

    async deleteJobTemplate(id: string): Promise<{ deleted: boolean }> {
        this.validateObjectId(id, 'id');

        const result = await this.jobTemplateModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Job template with ID ${id} not found`);
        }
        return { deleted: true };
    }

    async createJobRequisition(dto: CreateJobRequisitionDto): Promise<JobRequisition> {
        this.validateObjectId(dto.hiringManagerId, 'hiringManagerId');
        if (dto.templateId) {
            this.validateObjectId(dto.templateId, 'templateId');
        }

        const count = await this.jobRequisitionModel.countDocuments();
        const requisitionId = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const requisition = new this.jobRequisitionModel({
            requisitionId,
            templateId: dto.templateId ? new Types.ObjectId(dto.templateId) : undefined,
            openings: dto.openings,
            location: dto.location,
            hiringManagerId: new Types.ObjectId(dto.hiringManagerId),
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            publishStatus: 'draft',
        });

        return requisition.save();
    }

    async getAllJobRequisitions(
        filters?: { status?: string; managerId?: string }
    ): Promise<JobRequisition[]> {
        const query: any = {};
        if (filters?.status) query.publishStatus = filters.status;
        if (filters?.managerId) query.hiringManagerId = new Types.ObjectId(filters.managerId);

        return this.jobRequisitionModel.find(query).exec();
    }

    async getJobRequisitionById(id: string): Promise<JobRequisition> {
        // Try to find by MongoDB _id first, then by requisitionId string
        let requisition: JobRequisitionDocument | null = null;

        // Check if it's a valid MongoDB ObjectId
        if (Types.ObjectId.isValid(id)) {
            requisition = await this.jobRequisitionModel
                .findById(id)
                .populate('templateId')
                .exec();
        }

        // If not found by _id, try requisitionId
        if (!requisition) {
            requisition = await this.jobRequisitionModel
                .findOne({ requisitionId: id })
                .populate('templateId')
                .exec();
        }

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }

        // Transform the result similar to getPublishedJobs
        const template = requisition.templateId as any;
        const job: any = requisition.toObject();

        // Merge template data if available
        if (template) {
            const templateObj = typeof template.toObject === 'function' ? template.toObject() : template;
            job.templateTitle = templateObj.title || templateObj.templateTitle || '';
            job.department = templateObj.department || job.department || '';
            job.description = templateObj.description || job.description || '';
            job.employmentType = templateObj.employmentType || job.employmentType || '';
            job.qualifications = templateObj.qualifications || [];
            job.skills = templateObj.skills || [];
            if (templateObj.salaryRange) {
                job.salaryRange = templateObj.salaryRange;
            }
        }

        // Ensure title field exists
        job.title = job.templateTitle || job.title || 'Untitled Position';

        // Map openings to numberOfOpenings for frontend compatibility
        job.numberOfOpenings = job.openings || job.numberOfOpenings || 0;

        return job;
    }

    async getPublishedJobs(): Promise<any[]> {
        const now = new Date();

        // Find published jobs that are not expired
        const requisitions = await this.jobRequisitionModel
            .find({
                publishStatus: 'published',
                $or: [
                    { expiryDate: { $exists: false } },
                    { expiryDate: null },
                    { expiryDate: { $gt: now } }
                ]
            })
            .populate('templateId')
            .lean()
            .exec();

        console.log(`[getPublishedJobs] Found ${requisitions.length} published requisitions`);

        // Transform and validate the results
        const validJobs = requisitions
            .filter(req => {
                // Must have a valid ID
                if (!req._id && !req.requisitionId) return false;

                // Must have at least one opening
                const openings = req.openings || 0;
                if (openings <= 0) return false;

                // Must have a template with title (template is required for published jobs)
                const template = req.templateId as any;
                const hasTitle = template?.title || template?.templateTitle;

                return !!hasTitle; // Require template with title
            })
            .map(req => {
                const template = req.templateId as any;
                // Since we're using .lean(), req is already a plain object
                const job: any = { ...req };

                // Merge template data if available
                if (template) {
                    const templateObj = template;
                    job.templateTitle = templateObj.title || templateObj.templateTitle || '';
                    job.department = templateObj.department || job.department || '';
                    job.description = templateObj.description || job.description || '';
                    job.employmentType = templateObj.employmentType || job.employmentType || '';
                    job.qualifications = templateObj.qualifications || [];
                    job.skills = templateObj.skills || [];
                    if (templateObj.salaryRange) {
                        job.salaryRange = templateObj.salaryRange;
                    }
                }

                // Ensure title field exists (from template)
                job.title = job.templateTitle || 'Untitled Position';

                // Map openings to numberOfOpenings for frontend compatibility
                job.numberOfOpenings = job.openings || job.numberOfOpenings || 0;

                // Ensure location is set
                job.location = job.location || '';

                // Ensure _id is set (MongoDB ObjectId as string)
                if (req._id) {
                    job._id = typeof req._id === 'object' && req._id.toString ? req._id.toString() : String(req._id);
                }
                if (req.requisitionId) {
                    job.requisitionId = req.requisitionId;
                }

                return job;
            });

        console.log(`[getPublishedJobs] Returning ${validJobs.length} valid jobs after filtering`);
        return validJobs;
    }

    async publishJobRequisition(id: string, dto: PublishJobRequisitionDto): Promise<JobRequisition> {
        const updateData: any = {
            publishStatus: dto.publishStatus,
        };

        if (dto.publishStatus === 'published') {
            updateData.postingDate = dto.postingDate ? new Date(dto.postingDate) : new Date();
        }

        const requisition = await this.jobRequisitionModel.findOneAndUpdate(
            { requisitionId: id },
            updateData,
            { new: true }
        ).exec();

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }

        return requisition;
    }

    async updateJobRequisition(id: string, dto: UpdateJobRequisitionDto): Promise<JobRequisition> {
        const updateData: any = { ...dto };
        if (dto.expiryDate) updateData.expiryDate = new Date(dto.expiryDate);

        const requisition = await this.jobRequisitionModel.findOneAndUpdate(
            { requisitionId: id },
            updateData,
            { new: true }
        ).exec();

        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${id} not found`);
        }
        return requisition;
    }

    async closeJobRequisition(id: string): Promise<JobRequisition> {
        return this.publishJobRequisition(id, { publishStatus: 'closed' });
    }

    async createApplication(dto: CreateApplicationDto): Promise<Application> {
        this.validateObjectId(dto.candidateId, 'candidateId');

        const requisition = await this.jobRequisitionModel.findOne({ requisitionId: dto.requisitionId }).exec();
        if (!requisition) {
            throw new NotFoundException(`Job requisition with ID ${dto.requisitionId} not found`);
        }
        if (requisition.publishStatus !== 'published') {
            throw new BadRequestException('Cannot apply to unpublished job requisition');
        }

        if (requisition.expiryDate && new Date(requisition.expiryDate) < new Date()) {
            throw new BadRequestException('Cannot apply to expired job requisition');
        }

        const existingApp = await this.applicationModel.findOne({
            candidateId: new Types.ObjectId(dto.candidateId),
            requisitionId: requisition._id,
        }).exec();

        if (existingApp) {
            throw new ConflictException('Candidate has already applied for this position');
        }

        if (!dto.dataProcessingConsent) {
            throw new BadRequestException('Data processing consent is required to submit application');
        }

        const application = new this.applicationModel({
            candidateId: new Types.ObjectId(dto.candidateId),
            requisitionId: requisition._id,
            currentStage: ApplicationStage.SCREENING,
            status: ApplicationStatus.SUBMITTED,
        });

        const savedApp = await application.save();

        await this.logStatusChange(savedApp._id.toString(), {
            stage: ApplicationStage.SCREENING,
            status: ApplicationStatus.SUBMITTED,
            changedBy: dto.candidateId || '507f1f77bcf86cd799439000',
        });

        return savedApp;
    }

    async getAllApplications(
        filters?: {
            requisitionId?: string;
            status?: ApplicationStatus;
            stage?: ApplicationStage;
            hrId?: string;
        }
    ): Promise<Application[]> {
        const query: any = {};

        if (filters?.requisitionId) {
            const requisition = await this.jobRequisitionModel
                .findOne({ requisitionId: filters.requisitionId })
                .exec();
            if (!requisition) {
                return [];
            }
            query.requisitionId = requisition._id;
        }

        if (filters?.status) query.status = filters.status;
        if (filters?.stage) query.currentStage = filters.stage;
        if (filters?.hrId) {
            if (Types.ObjectId.isValid(filters.hrId)) {
                query.assignedHr = new Types.ObjectId(filters.hrId);
            } else {
                return [];
            }
        }

        return this.applicationModel.find(query).exec();
    }

    async getApplicationById(id: string): Promise<Application> {
        const application = await this.applicationModel
            .findById(id)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }
        return application;
    }

    async getApplicationsByCandidate(candidateId: string): Promise<Application[]> {
        this.validateObjectId(candidateId, 'candidateId');

        return this.applicationModel
            .find({ candidateId: new Types.ObjectId(candidateId) })
            .exec();
    }

    async assignHrToApplication(applicationId: string, dto: AssignHrDto): Promise<Application> {
        this.validateObjectId(applicationId, 'applicationId');
        this.validateObjectId(dto.hrEmployeeId, 'hrEmployeeId');

        const application = await this.applicationModel.findByIdAndUpdate(
            applicationId,
            { assignedHr: new Types.ObjectId(dto.hrEmployeeId) },
            { new: true },
        ).exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }
        return application;
    }

    async updateApplicationStage(id: string, dto: UpdateApplicationStageDto): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.REJECTED) {
            throw new BadRequestException('Cannot update stage for a rejected application');
        }

        const oldStage = application.currentStage;
        const oldStatus = application.status;

        application.currentStage = dto.stage;
        // Update status based on stage
        if (dto.stage === ApplicationStage.OFFER) {
            application.status = ApplicationStatus.OFFER;
        } else if (application.status === ApplicationStatus.SUBMITTED || application.status === ApplicationStatus.OFFER) {
            // If moving from SUBMITTED or OFFER to an interview stage, set to IN_PROCESS
            application.status = ApplicationStatus.IN_PROCESS;
        }
        // If already IN_PROCESS, HIRED, or REJECTED, keep the current status

        const updated = await application.save();

        await this.logStatusChange(id, {
            stage: dto.stage,
            status: application.status,
            changedBy: dto.changedBy,
            oldStage: oldStage,
            oldStatus: oldStatus,
        });

        return updated;
    }

    async updateApplicationStatus(id: string, dto: UpdateApplicationStatusDto): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.HIRED && dto.status !== ApplicationStatus.HIRED) {
            throw new BadRequestException('Cannot change status of a hired application');
        }

        const oldStage = application.currentStage;
        const oldStatus = application.status;

        application.status = dto.status;
        const updated = await application.save();

        await this.logStatusChange(id, {
            stage: application.currentStage,
            status: dto.status,
            oldStage: oldStage,
            oldStatus: oldStatus,
        });

        return updated;
    }

    async rejectApplication(id: string, reason?: string): Promise<Application> {
        this.validateObjectId(id, 'id');

        const application = await this.applicationModel.findById(id).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${id} not found`);
        }

        if (application.status === ApplicationStatus.HIRED) {
            throw new BadRequestException('Cannot reject an application that has already been hired');
        }

        if (application.status === ApplicationStatus.REJECTED) {
            throw new BadRequestException('Application is already rejected');
        }

        return this.updateApplicationStatus(id, {
            status: ApplicationStatus.REJECTED,
            reason: reason || 'Application rejected',
        });
    }

    async getApplicationHistory(applicationId: string): Promise<ApplicationStatusHistory[]> {
        if (!Types.ObjectId.isValid(applicationId)) {
            throw new BadRequestException(`Invalid application ID format: ${applicationId}`);
        }

        const application = await this.applicationModel.findById(applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }

        return this.historyModel
            .find({ applicationId: new Types.ObjectId(applicationId) })
            .sort({ createdAt: -1 })
            .exec();
    }

    private async logStatusChange(applicationId: string, data: {
        stage: ApplicationStage;
        status: ApplicationStatus;
        changedBy?: string;
        oldStage?: ApplicationStage;
        oldStatus?: ApplicationStatus;
    }): Promise<void> {
        const history = new this.historyModel({
            applicationId: new Types.ObjectId(applicationId),
            oldStage: data.oldStage ? data.oldStage.toString() : null,
            newStage: data.stage.toString(),
            oldStatus: data.oldStatus ? data.oldStatus.toString() : null,
            newStatus: data.status.toString(),
            changedBy: data.changedBy ? new Types.ObjectId(data.changedBy) : new Types.ObjectId('507f1f77bcf86cd799439000'),
        });
        await history.save();
    }

    async getRecruitmentDashboard(): Promise<any> {
        const [
            totalOpenPositions,
            totalApplications,
            applicationsByStage,
            applicationsByStatus,
            recentApplications,
        ] = await Promise.all([
            this.jobRequisitionModel.countDocuments({ publishStatus: 'published' }),
            this.applicationModel.countDocuments(),
            this.applicationModel.aggregate([
                { $group: { _id: '$currentStage', count: { $sum: 1 } } },
            ]),
            this.applicationModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            this.applicationModel
                .find()
                .sort({ createdAt: -1 })
                .limit(10)
                .exec(),
        ]);

        return {
            totalOpenPositions,
            totalApplications,
            applicationsByStage,
            applicationsByStatus,
            recentApplications,
        };
    }

    async getRequisitionProgress(requisitionId: string): Promise<any> {
        const requisition = await this.jobRequisitionModel.findOne({ requisitionId }).exec();
        if (!requisition) {
            throw new NotFoundException(`Requisition not found`);
        }

        const applications = await this.applicationModel.find({
            requisitionId: requisition._id,
        }).exec();

        const stageBreakdown = {
            [ApplicationStage.SCREENING]: 0,
            [ApplicationStage.DEPARTMENT_INTERVIEW]: 0,
            [ApplicationStage.HR_INTERVIEW]: 0,
            [ApplicationStage.OFFER]: 0,
        };

        applications.forEach((app) => {
            stageBreakdown[app.currentStage]++;
        });

        const hiredCount = applications.filter(a => a.status === ApplicationStatus.HIRED).length;
        const progressPercentage = requisition.openings > 0
            ? Math.round((hiredCount / requisition.openings) * 100)
            : 0;

        return {
            requisitionId: requisition.requisitionId,
            openings: requisition.openings,
            hired: hiredCount,
            progressPercentage,
            totalApplications: applications.length,
            stageBreakdown,
        };
    }

    async createReferral(dto: CreateReferralDto): Promise<Referral> {
        this.validateObjectId(dto.candidateId, 'candidateId');
        this.validateObjectId(dto.referringEmployeeId, 'referringEmployeeId');

        const existing = await this.referralModel.findOne({
            candidateId: new Types.ObjectId(dto.candidateId),
        }).exec();

        if (existing) {
            throw new ConflictException('Candidate is already tagged as a referral');
        }

        const referral = new this.referralModel({
            referringEmployeeId: new Types.ObjectId(dto.referringEmployeeId),
            candidateId: new Types.ObjectId(dto.candidateId),
            role: dto.role,
            level: dto.level,
        });

        return referral.save();
    }

    async getReferralByCandidate(candidateId: string): Promise<Referral | null> {
        this.validateObjectId(candidateId, 'candidateId');

        return this.referralModel
            .findOne({ candidateId: new Types.ObjectId(candidateId) })
            .exec();
    }

    async getAllReferrals(): Promise<Referral[]> {
        return this.referralModel.find().exec();
    }

    async isReferral(candidateId: string): Promise<boolean> {
        this.validateObjectId(candidateId, 'candidateId');

        const referral = await this.referralModel.findOne({
            candidateId: new Types.ObjectId(candidateId),
        }).exec();
        return !!referral;
    }

    async scheduleInterview(dto: ScheduleInterviewDto): Promise<Interview> {
        this.validateObjectId(dto.applicationId, 'applicationId');
        dto.panel.forEach((id, index) => this.validateObjectId(id, `panel[${index}]`));

        const application = await this.applicationModel.findById(dto.applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        const invalidStatuses = [ApplicationStatus.REJECTED, ApplicationStatus.HIRED];
        if (invalidStatuses.includes(application.status)) {
            throw new BadRequestException(`Cannot schedule interview for application with status: ${application.status}`);
        }

        const scheduledDate = new Date(dto.scheduledDate);
        if (scheduledDate <= new Date()) {
            throw new BadRequestException('Interview date must be in the future');
        }

        const existingInterview = await this.interviewModel.findOne({
            applicationId: new Types.ObjectId(dto.applicationId),
            stage: dto.stage,
            status: { $ne: InterviewStatus.CANCELLED },
        }).exec();

        if (existingInterview) {
            throw new ConflictException(`An interview for stage ${dto.stage} already exists for this application`);
        }

        const interview = new this.interviewModel({
            applicationId: new Types.ObjectId(dto.applicationId),
            stage: dto.stage,
            scheduledDate: new Date(dto.scheduledDate),
            method: dto.method,
            panel: dto.panel.map(id => new Types.ObjectId(id)),
            videoLink: dto.videoLink,
            status: InterviewStatus.SCHEDULED,
        });

        const saved = await interview.save();

        await this.updateApplicationStage(dto.applicationId, {
            stage: dto.stage,
            notes: `Interview scheduled for ${dto.scheduledDate}`,
        });

        await this.sharedRecruitmentService.sendInterviewNotifications({
            candidateId: application.candidateId.toString(),
            panelMemberIds: dto.panel,
            interviewDate: new Date(dto.scheduledDate),
            interviewMethod: dto.method,
            videoLink: dto.videoLink,
            stage: dto.stage,
        });

        return saved;
    }

    async getInterviewById(id: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel
            .findById(id)
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('panel')
            .exec();

        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        return interview;
    }

    async getAllInterviews(filters?: { applicationId?: string; interviewerId?: string; days?: number }): Promise<Interview[]> {
        const query: any = {};

        if (filters?.applicationId) {
            query.applicationId = new Types.ObjectId(filters.applicationId);
        }

        if (filters?.interviewerId) {
            query.panel = new Types.ObjectId(filters.interviewerId);
        }

        if (filters?.days) {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + filters.days);
            query.scheduledDate = { $gte: now, $lte: futureDate };
        }

        return this.interviewModel
            .find(query)
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('panel', 'firstName lastName email')
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async getInterviewsByApplication(applicationId: string): Promise<Interview[]> {
        this.validateObjectId(applicationId, 'applicationId');

        return this.interviewModel
            .find({ applicationId: new Types.ObjectId(applicationId) })
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('panel', 'firstName lastName email')
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async getInterviewsByPanelist(panelistId: string): Promise<Interview[]> {
        this.validateObjectId(panelistId, 'panelistId');

        return this.interviewModel
            .find({ panel: new Types.ObjectId(panelistId) })
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('panel', 'firstName lastName email')
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async getUpcomingInterviews(days: number = 7): Promise<Interview[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        return this.interviewModel
            .find({
                scheduledDate: { $gte: now, $lte: futureDate },
                status: InterviewStatus.SCHEDULED,
            })
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('panel', 'firstName lastName email')
            .sort({ scheduledDate: 1 })
            .exec();
    }

    async updateInterview(id: string, dto: UpdateInterviewDto): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const existingInterview = await this.interviewModel.findById(id).exec();
        if (!existingInterview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (existingInterview.status === InterviewStatus.COMPLETED) {
            throw new BadRequestException('Cannot update a completed interview');
        }
        if (existingInterview.status === InterviewStatus.CANCELLED) {
            throw new BadRequestException('Cannot update a cancelled interview');
        }

        const updateData: any = { ...dto };
        if (dto.scheduledDate) updateData.scheduledDate = new Date(dto.scheduledDate);
        if (dto.panel) updateData.panel = dto.panel.map(p => new Types.ObjectId(p));

        const interview = await this.interviewModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        return interview;
    }

    async completeInterview(id: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel.findById(id).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (interview.status !== InterviewStatus.SCHEDULED) {
            throw new BadRequestException(`Cannot complete interview with status: ${interview.status}. Only SCHEDULED interviews can be completed.`);
        }

        interview.status = InterviewStatus.COMPLETED;
        return interview.save();
    }

    async cancelInterview(id: string, reason: string): Promise<Interview> {
        this.validateObjectId(id, 'id');

        const interview = await this.interviewModel.findById(id).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${id} not found`);
        }

        if (interview.status !== InterviewStatus.SCHEDULED) {
            throw new BadRequestException(`Cannot cancel interview with status: ${interview.status}. Only SCHEDULED interviews can be cancelled.`);
        }

        interview.status = InterviewStatus.CANCELLED;
        // TODO: add cancellationReason field to schema if needed
        return interview.save();
    }

    async submitFeedback(dto: SubmitFeedbackDto): Promise<AssessmentResult> {
        this.validateObjectId(dto.interviewId, 'interviewId');
        this.validateObjectId(dto.interviewerId, 'interviewerId');

        if (dto.score === undefined || dto.score === null || dto.score < 1 || dto.score > 10 || !Number.isFinite(dto.score)) {
            throw new BadRequestException('Score must be a number between 1 and 10');
        }

        const interview = await this.interviewModel.findById(dto.interviewId).exec();
        if (!interview) {
            throw new NotFoundException(`Interview with ID ${dto.interviewId} not found`);
        }

        if (interview.status === InterviewStatus.CANCELLED) {
            throw new BadRequestException('Cannot submit feedback for a cancelled interview');
        }

        const isInPanel = interview.panel.some(
            panelId => panelId.toString() === dto.interviewerId
        );
        if (!isInPanel) {
            throw new BadRequestException('Only panel members can submit feedback for this interview');
        }

        const existingFeedback = await this.assessmentModel.findOne({
            interviewId: dto.interviewId,
            interviewerId: dto.interviewerId,
        });

        if (existingFeedback) {
            throw new ConflictException('Feedback already submitted by this interviewer');
        }

        const assessment = new this.assessmentModel({
            interviewId: new Types.ObjectId(dto.interviewId),
            interviewerId: new Types.ObjectId(dto.interviewerId),
            score: dto.score,
            comments: dto.comments,
        });

        const saved = await assessment.save();

        await this.interviewModel.findByIdAndUpdate(dto.interviewId, {
            feedbackId: saved._id,
        });

        return saved;
    }

    async getInterviewFeedback(interviewId: string): Promise<AssessmentResult[]> {
        this.validateObjectId(interviewId, 'interviewId');

        return this.assessmentModel
            .find({ interviewId: new Types.ObjectId(interviewId) })
            .exec();
    }

    async getFeedbackByApplication(applicationId: string): Promise<AssessmentResult[]> {
        this.validateObjectId(applicationId, 'applicationId');

        const interviews = await this.interviewModel.find({ applicationId: new Types.ObjectId(applicationId) });
        const interviewIds = interviews.map(i => i._id);

        return this.assessmentModel
            .find({ interviewId: { $in: interviewIds } })
            .populate('interviewId', 'scheduledDate stage status')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getAverageScore(applicationId: string): Promise<number> {
        this.validateObjectId(applicationId, 'applicationId');

        const interviews = await this.interviewModel.find({ applicationId: new Types.ObjectId(applicationId) });
        const interviewIds = interviews.map(i => i._id);

        const feedbacks = await this.assessmentModel.find({
            interviewId: { $in: interviewIds },
        }).exec();

        if (feedbacks.length === 0) return 0;

        const total = feedbacks.reduce((sum, f) => sum + (f.score || 0), 0);
        return Math.round((total / feedbacks.length) * 10) / 10;
    }

    async createOffer(dto: CreateOfferDto): Promise<Offer> {
        this.validateObjectId(dto.applicationId, 'applicationId');
        this.validateObjectId(dto.candidateId, 'candidateId');
        if (dto.hrEmployeeId) {
            this.validateObjectId(dto.hrEmployeeId, 'hrEmployeeId');
        }
        dto.approvers.forEach((a, index) => this.validateObjectId(a.employeeId, `approvers[${index}].employeeId`));

        const deadline = new Date(dto.deadline);
        if (deadline <= new Date()) {
            throw new BadRequestException('Offer deadline must be in the future');
        }

        const application = await this.applicationModel.findById(dto.applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        const existingOffer = await this.offerModel.findOne({
            applicationId: new Types.ObjectId(dto.applicationId),
            finalStatus: { $in: [OfferFinalStatus.PENDING, OfferFinalStatus.APPROVED] },
        }).exec();

        if (existingOffer) {
            throw new ConflictException('An active offer already exists for this application');
        }

        const approvers = dto.approvers.map(a => ({
            employeeId: new Types.ObjectId(a.employeeId),
            role: a.role,
            status: ApprovalStatus.PENDING,
        }));

        const offer = new this.offerModel({
            applicationId: new Types.ObjectId(dto.applicationId),
            candidateId: new Types.ObjectId(dto.candidateId),
            hrEmployeeId: dto.hrEmployeeId ? new Types.ObjectId(dto.hrEmployeeId) : undefined,
            role: dto.role,
            grossSalary: dto.grossSalary,
            signingBonus: dto.signingBonus,
            benefits: dto.benefits,
            insurances: dto.insurances,
            conditions: dto.conditions,
            content: dto.content,
            deadline: new Date(dto.deadline),
            approvers,
            applicantResponse: OfferResponseStatus.PENDING,
            finalStatus: OfferFinalStatus.PENDING,
        });

        const saved = await offer.save();

        await this.updateApplicationStage(dto.applicationId, {
            stage: ApplicationStage.OFFER,
            notes: 'Offer created, pending approvals',
        });

        return saved;
    }

    async getOfferById(id: string): Promise<Offer> {
        this.validateObjectId(id, 'id');

        const offer = await this.offerModel
            .findById(id)
            .populate('applicationId', 'candidateId requisitionId currentStage status')
            .populate('candidateId', 'firstName lastName personalEmail')
            .exec();

        if (!offer) {
            throw new NotFoundException(`Offer with ID ${id} not found`);
        }
        return offer;
    }

    async getOfferByApplication(applicationId: string): Promise<Offer | null> {
        this.validateObjectId(applicationId, 'applicationId');

        return this.offerModel
            .findOne({ applicationId: new Types.ObjectId(applicationId) })
            .populate({
                path: 'applicationId',
                select: 'candidateId requisitionId currentStage status',
                populate: [
                    {
                        path: 'requisitionId',
                        select: 'title templateTitle department location openings templateId',
                        populate: {
                            path: 'templateId',
                            select: 'title templateTitle department description employmentType'
                        }
                    },
                    {
                        path: 'candidateId',
                        select: 'firstName lastName personalEmail'
                    }
                ]
            })
            .populate('candidateId', 'firstName lastName personalEmail')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getAllOffers(filters?: { applicationId?: string; status?: OfferFinalStatus }): Promise<Offer[]> {
        const query: any = {};

        if (filters?.applicationId) {
            query.applicationId = new Types.ObjectId(filters.applicationId);
        }

        if (filters?.status) {
            query.finalStatus = filters.status;
        }

        return this.offerModel
            .find(query)
            .populate({
                path: 'applicationId',
                select: 'candidateId requisitionId currentStage status',
                populate: [
                    {
                        path: 'requisitionId',
                        select: 'title templateTitle department location openings templateId',
                        populate: {
                            path: 'templateId',
                            select: 'title templateTitle department description employmentType'
                        }
                    },
                    {
                        path: 'candidateId',
                        select: 'firstName lastName personalEmail'
                    }
                ]
            })
            .populate('candidateId', 'firstName lastName personalEmail')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getPendingOffers(): Promise<Offer[]> {
        return this.offerModel
            .find({ finalStatus: OfferFinalStatus.PENDING })
            .populate({
                path: 'applicationId',
                select: 'candidateId requisitionId currentStage status',
                populate: [
                    {
                        path: 'requisitionId',
                        select: 'title templateTitle department location openings templateId',
                        populate: {
                            path: 'templateId',
                            select: 'title templateTitle department description employmentType'
                        }
                    },
                    {
                        path: 'candidateId',
                        select: 'firstName lastName personalEmail'
                    }
                ]
            })
            .populate('candidateId', 'firstName lastName personalEmail')
            .sort({ createdAt: -1 })
            .exec();
    }

    async approveOffer(offerId: string, dto: ApproveOfferDto): Promise<Offer> {
        this.validateObjectId(offerId, 'offerId');
        this.validateObjectId(dto.approverId, 'approverId');

        const offer = await this.offerModel.findById(offerId).exec();
        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus === OfferFinalStatus.REJECTED) {
            throw new BadRequestException('Cannot approve a rejected offer');
        }

        const approverIndex = offer.approvers.findIndex(
            a => a.employeeId.toString() === dto.approverId,
        );

        if (approverIndex === -1) {
            throw new BadRequestException('You are not an approver for this offer');
        }

        if (offer.approvers[approverIndex].status !== ApprovalStatus.PENDING) {
            throw new BadRequestException('You have already submitted your approval decision');
        }

        offer.approvers[approverIndex].status = dto.status;
        offer.approvers[approverIndex].actionDate = new Date();
        offer.approvers[approverIndex].comment = dto.comment;

        const allApproved = offer.approvers.every(
            a => a.status === ApprovalStatus.APPROVED,
        );

        const anyRejected = offer.approvers.some(
            a => a.status === ApprovalStatus.REJECTED,
        );

        if (allApproved) {
            offer.finalStatus = OfferFinalStatus.APPROVED;
        } else if (anyRejected) {
            offer.finalStatus = OfferFinalStatus.REJECTED;
        }

        return offer.save();
    }

    async recordCandidateResponse(offerId: string, dto: CandidateOfferResponseDto): Promise<Offer> {
        this.validateObjectId(offerId, 'offerId');

        const offer = await this.offerModel.findById(offerId).exec();
        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus !== OfferFinalStatus.APPROVED) {
            throw new BadRequestException('Offer has not been approved yet');
        }

        if (offer.applicantResponse !== OfferResponseStatus.PENDING) {
            throw new BadRequestException('Candidate has already responded to this offer');
        }

        if (offer.deadline && new Date(offer.deadline) < new Date()) {
            throw new BadRequestException('Offer deadline has passed');
        }

        offer.applicantResponse = dto.response;

        if (dto.response === OfferResponseStatus.ACCEPTED) {
            offer.candidateSignedAt = new Date();

            await this.applicationModel.findByIdAndUpdate(offer.applicationId, {
                status: ApplicationStatus.HIRED,
            });

            await this.createContractFromOffer(offer);
        }

        return offer.save();
    }

    private async createContractFromOffer(offer: OfferDocument): Promise<Contract> {
        const existingContract = await this.contractModel.findOne({ offerId: offer._id }).exec();
        if (existingContract) {
            throw new ConflictException('Contract already exists for this offer');
        }

        const contract = new this.contractModel({
            offerId: offer._id,
            acceptanceDate: new Date(),
            grossSalary: offer.grossSalary,
            signingBonus: offer.signingBonus,
            role: offer.role,
            benefits: offer.benefits,
        });

        return contract.save();
    }

    async triggerPreboarding(applicationId: string): Promise<{ triggered: boolean; message: string; onboardingCreated?: boolean; contractId?: string }> {
        this.validateObjectId(applicationId, 'applicationId');

        const application = await this.applicationModel.findById(applicationId).exec();
        if (!application) {
            throw new NotFoundException(`Application with ID ${applicationId} not found`);
        }

        if (application.status !== ApplicationStatus.HIRED) {
            throw new BadRequestException('Application must be in HIRED status to trigger preboarding');
        }

        // REC-029: Integration with Onboarding module
        // Get the offer and contract for this application
        const offer = await this.offerModel
            .findOne({ applicationId: new Types.ObjectId(applicationId) })
            .sort({ createdAt: -1 })
            .exec();

        if (!offer) {
            throw new NotFoundException(`No offer found for application ${applicationId}`);
        }

        if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
            throw new BadRequestException('Offer must be accepted before triggering preboarding');
        }

        // Get the contract created from this offer
        const contract = await this.contractModel.findOne({ offerId: offer._id }).exec();

        if (!contract) {
            // Contract not created yet - notify candidate about next steps
            await this.sharedRecruitmentService.sendApplicationStatusNotification({
                candidateId: application.candidateId.toString(),
                applicationId: applicationId,
                status: ApplicationStatus.HIRED,
                message: 'Congratulations! Your offer has been accepted. Please wait for the contract to be prepared. You will receive further instructions for pre-boarding tasks.',
            });

            return {
                triggered: true,
                message: 'Pre-boarding notification sent. Contract is pending creation. Candidate will be notified when contract is ready.',
                onboardingCreated: false,
            };
        }

        // Check if contract is fully signed
        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            // Contract exists but not fully signed - notify candidate to complete signing
            await this.sharedRecruitmentService.sendApplicationStatusNotification({
                candidateId: application.candidateId.toString(),
                applicationId: applicationId,
                status: ApplicationStatus.HIRED,
                message: 'Your contract is ready. Please complete the signing process to proceed with onboarding. You will receive access to pre-boarding tasks once the contract is fully signed.',
            });

            return {
                triggered: true,
                message: 'Pre-boarding notification sent. Contract signing is pending. Candidate will be notified to complete signing.',
                onboardingCreated: false,
                contractId: contract._id.toString(),
            };
        }

        // Contract is fully signed - check if employee profile exists
        // Note: Employee profile should be created via ONB-002 (createEmployeeFromContract)
        // For now, we'll notify that onboarding can be created
        // The actual onboarding creation requires employeeId, which comes from employee profile

        try {
            // Try to find employee profile by candidate email
            // First get candidate details
            const candidate = await this.sharedRecruitmentService.validateCandidateExists(application.candidateId.toString());
            const candidateEmail = candidate.personalEmail;

            // Try to find employee by email (employees created from candidates may have same email)
            let employee: EmployeeProfileDocument | null = null;
            if (candidateEmail) {
                employee = await this.employeeProfileModel.findOne({
                    $or: [
                        { personalEmail: candidateEmail },
                        { workEmail: candidateEmail },
                    ],
                }).exec();
            }

            if (employee) {
                // Employee exists - check if onboarding already exists
                const existingOnboarding = await this.onboardingService.getOnboardingByEmployeeId(employee._id.toString()).catch(() => null);

                if (existingOnboarding) {
                    return {
                        triggered: true,
                        message: 'Onboarding checklist already exists for this employee.',
                        onboardingCreated: false,
                        contractId: contract._id.toString(),
                    };
                }

                // Create onboarding checklist automatically
                // This implements REC-029: trigger pre-boarding tasks after offer acceptance
                await this.onboardingService.createOnboarding({
                    employeeId: employee._id.toString(),
                    contractId: contract._id.toString(),
                    tasks: [], // Tasks will be auto-generated per BR 9
                });

                await this.sharedRecruitmentService.sendApplicationStatusNotification({
                    candidateId: application.candidateId.toString(),
                    applicationId: applicationId,
                    status: ApplicationStatus.HIRED,
                    message: 'Your onboarding checklist has been created! Please log in to view and complete your pre-boarding tasks.',
                });

                return {
                    triggered: true,
                    message: 'Pre-boarding tasks triggered successfully. Onboarding checklist created and candidate notified.',
                    onboardingCreated: true,
                    contractId: contract._id.toString(),
                };
            } else {
                // Employee profile doesn't exist yet - notify HR to create it
                await this.sharedRecruitmentService.sendApplicationStatusNotification({
                    candidateId: application.candidateId.toString(),
                    applicationId: applicationId,
                    status: ApplicationStatus.HIRED,
                    message: 'Your contract is fully signed. HR will create your employee profile and onboarding checklist shortly. You will receive access to pre-boarding tasks once your profile is created.',
                });

                return {
                    triggered: true,
                    message: 'Pre-boarding notification sent. Employee profile needs to be created first (ONB-002). HR should create employee profile from signed contract, then onboarding will be available.',
                    onboardingCreated: false,
                    contractId: contract._id.toString(),
                };
            }
        } catch (error) {
            // If employee lookup fails, just notify
            await this.sharedRecruitmentService.sendApplicationStatusNotification({
                candidateId: application.candidateId.toString(),
                applicationId: applicationId,
                status: ApplicationStatus.HIRED,
                message: 'Your contract is fully signed. HR will set up your onboarding tasks shortly.',
            });

            return {
                triggered: true,
                message: 'Pre-boarding notification sent. Employee profile may need to be created first.',
                onboardingCreated: false,
                contractId: contract._id.toString(),
            };
        }
    }

    async sendOfferLetter(offerId: string): Promise<{ sent: boolean; message: string }> {
        const offer = await this.offerModel
            .findById(offerId)
            .exec();

        if (!offer) {
            throw new NotFoundException(`Offer with ID ${offerId} not found`);
        }

        if (offer.finalStatus !== OfferFinalStatus.APPROVED) {
            throw new BadRequestException('Offer must be approved before sending');
        }

        await this.sharedRecruitmentService.sendOfferNotification({
            candidateId: offer.candidateId.toString(),
            offerId: offerId,
            role: offer.role,
            deadline: offer.deadline,
        });

        return {
            sent: true,
            message: 'Offer letter sent successfully to candidate email.',
        };
    }

    async sendStatusUpdateNotification(dto: SendNotificationDto): Promise<{ sent: boolean; message: string }> {
        const application = await this.applicationModel
            .findById(dto.applicationId)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        await this.sharedRecruitmentService.sendApplicationStatusNotification({
            candidateId: application.candidateId.toString(),
            applicationId: dto.applicationId,
            status: application.status,
            message: dto.content,
        });

        return {
            sent: true,
            message: 'Status update notification sent successfully.',
        };
    }

    async sendRejectionNotification(dto: SendRejectionDto): Promise<{ sent: boolean; message: string }> {
        const application = await this.applicationModel
            .findById(dto.applicationId)
            .exec();

        if (!application) {
            throw new NotFoundException(`Application with ID ${dto.applicationId} not found`);
        }

        // Use the short "rejectionReason" for the status
        await this.updateApplicationStatus(dto.applicationId, {
            status: ApplicationStatus.REJECTED,
            reason: dto.rejectionReason || 'Application not selected',
        });

        // Use "message" (or "customMessage") for the email content
        await this.sharedRecruitmentService.sendRejectionNotification({
            candidateId: application.candidateId.toString(),
            applicationId: dto.applicationId,
            rejectionReason: dto.rejectionReason,
            //message: dto.message || dto.customMessage,
        });

        return {
            sent: true,
            message: 'Rejection notification sent successfully.',
        };
    }

    async getCandidateById(id: string): Promise<any> {
        this.validateObjectId(id, 'id');
        return this.sharedRecruitmentService.validateCandidateExists(id);
    }

    async getAllCandidates(): Promise<Candidate[]> {
        return this.candidateModel.find().sort({ createdAt: -1 }).exec();
    }

    async getEmailTemplates(): Promise<any[]> {
        // TODO: Implement email template management
        // This would return available email templates for different notification types

        return [
            {
                id: '1',
                name: 'Standard Rejection',
                type: 'rejection',
                subject: 'Update on your application',
                body: 'Thank you for your interest in {{position}}. After careful consideration...',
            },
            {
                id: '2',
                name: 'Interview Invitation',
                type: 'interview_invitation',
                subject: 'Interview Invitation for {{position}}',
                body: 'We are pleased to invite you for an interview for the {{position}} role...',
            },
            {
                id: '3',
                name: 'Offer Letter',
                type: 'offer',
                subject: 'Job Offer - {{position}}',
                body: 'We are delighted to offer you the position of {{position}}...',
            },
        ];
    }
}