import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';

import { NotificationLog, NotificationLogDocument } from '../../time-management/models/notification-log.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { Candidate, CandidateDocument } from '../../employee/models/employee/Candidate.Schema';
import { AppraisalRecord, AppraisalRecordDocument } from '../../employee/models/performance/appraisal-record.schema';
import { EmployeeStatus, CandidateStatus, SystemRole } from '../../employee/enums/employee-profile.enums';
import { AppraisalRecordStatus } from '../../employee/enums/performance.enums';
import { EmployeeAuthService } from '../../auth/services/employee-auth.service';

@Injectable()
export class SharedRecruitmentService {
    private readonly logger = new Logger(SharedRecruitmentService.name);

    constructor(
        @InjectModel(NotificationLog.name) private notificationModel: Model<NotificationLogDocument>,
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeSystemRole.name) private systemRoleModel: Model<EmployeeSystemRoleDocument>,
        @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
        @InjectModel(AppraisalRecord.name) private appraisalRecordModel: Model<AppraisalRecordDocument>,
        @InjectConnection() private readonly connection: Connection,
        @Inject(forwardRef(() => EmployeeAuthService)) private readonly employeeAuthService: EmployeeAuthService,
    ) { }

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    async createNotification(
        to: Types.ObjectId | string,
        type: string,
        message: string,
    ): Promise<NotificationLog> {
        const toId = typeof to === 'string' ? new Types.ObjectId(to) : to;

        const notification = new this.notificationModel({
            to: toId,
            type,
            message,
        });

        return notification.save();
    }

    async notifyMultipleUsers(
        userIds: (Types.ObjectId | string)[],
        type: string,
        message: string,
    ): Promise<NotificationLog[]> {
        const notifications: NotificationLog[] = [];

        for (const userId of userIds) {
            try {
                const notification = await this.createNotification(userId, type, message);
                notifications.push(notification);
            } catch (error) {
                this.logger.warn(`Failed to create notification for user ${userId}`, error);
            }
        }

        return notifications;
    }

    async notifyHRUsers(type: string, message: string): Promise<NotificationLog[]> {
        const hrUsers = await this.findUsersByRoles([
            SystemRole.HR_MANAGER,
            SystemRole.HR_ADMIN,
            SystemRole.HR_EMPLOYEE,
        ]);

        return this.notifyMultipleUsers(
            hrUsers.map(u => u.employeeProfileId),
            type,
            message,
        );
    }

    async notifyITAdmins(type: string, message: string): Promise<NotificationLog[]> {
        const itAdmins = await this.findUsersByRoles([SystemRole.SYSTEM_ADMIN]);

        return this.notifyMultipleUsers(
            itAdmins.map(u => u.employeeProfileId),
            type,
            message,
        );
    }

    async notifyDepartmentHeads(type: string, message: string): Promise<NotificationLog[]> {
        const departmentHeads = await this.findUsersByRoles([SystemRole.DEPARTMENT_HEAD]);

        return this.notifyMultipleUsers(
            departmentHeads.map(u => u.employeeProfileId),
            type,
            message,
        );
    }

    async notifyFinanceStaff(type: string, message: string): Promise<NotificationLog[]> {
        const financeStaff = await this.findUsersByRoles([
            SystemRole.FINANCE_STAFF,
            SystemRole.PAYROLL_MANAGER,
        ]);

        return this.notifyMultipleUsers(
            financeStaff.map(u => u.employeeProfileId),
            type,
            message,
        );
    }

    private async findUsersByRoles(roles: SystemRole[]): Promise<any[]> {
        try {
            const systemRoles = await this.systemRoleModel.find({
                roles: { $in: roles },
                isActive: true,
            }).exec();

            if (!systemRoles.length) return [];

            const employeeIds = systemRoles.map(r => r.employeeProfileId);

            const employees = await this.employeeProfileModel.find({
                _id: { $in: employeeIds },
                status: { $ne: EmployeeStatus.TERMINATED },
            }).select('_id workEmail firstName lastName').exec();

            return systemRoles
                .map(role => {
                    const emp = employees.find(e => e._id.toString() === role.employeeProfileId?.toString());
                    if (!emp) return null;
                    return {
                        employeeProfileId: role.employeeProfileId,
                        roles: role.roles,
                        workEmail: emp.workEmail,
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                    };
                })
                .filter(Boolean);
        } catch (error) {
            this.logger.error('Failed to find users by roles', error);
            return [];
        }
    }

    async validateEmployeeExists(employeeId: string): Promise<EmployeeProfileDocument> {
        this.validateObjectId(employeeId, 'employeeId');

        const employee = await this.employeeProfileModel.findById(employeeId).exec();
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${employeeId} not found`);
        }

        return employee;
    }

    async validateCandidateExists(candidateId: string): Promise<CandidateDocument> {
        this.validateObjectId(candidateId, 'candidateId');

        const candidate = await this.candidateModel.findById(candidateId).exec();
        if (!candidate) {
            throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
        }

        return candidate;
    }

    async getEmployeePerformanceHistory(employeeId: string): Promise<{
        hasPublishedAppraisals: boolean;
        totalAppraisals: number;
        latestAppraisal: any | null;
        lowScoreAppraisals: any[];
        averageScore: number | null;
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const records = await this.appraisalRecordModel.find({
            employeeProfileId: new Types.ObjectId(employeeId),
            status: { $in: [AppraisalRecordStatus.HR_PUBLISHED, AppraisalRecordStatus.ARCHIVED] },
        })
            .populate('cycleId', 'name cycleType startDate endDate')
            .populate('templateId', 'name templateType')
            .sort({ hrPublishedAt: -1 })
            .lean()
            .exec();

        if (records.length === 0) {
            return {
                hasPublishedAppraisals: false,
                totalAppraisals: 0,
                latestAppraisal: null,
                lowScoreAppraisals: [],
                averageScore: null,
            };
        }

        const LOW_SCORE_THRESHOLD = 50;
        const lowScoreAppraisals = records.filter(r => r.totalScore !== undefined && r.totalScore < LOW_SCORE_THRESHOLD);

        const scoresWithValue = records.filter(r => r.totalScore !== undefined && r.totalScore !== null);
        const averageScore = scoresWithValue.length > 0
            ? scoresWithValue.reduce((sum, r) => sum + (r.totalScore || 0), 0) / scoresWithValue.length
            : null;

        return {
            hasPublishedAppraisals: true,
            totalAppraisals: records.length,
            latestAppraisal: records[0],
            lowScoreAppraisals,
            averageScore,
        };
    }

    async validateTerminationJustification(employeeId: string, initiator: string): Promise<{
        isJustified: boolean;
        performanceData: any;
        warnings: string[];
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const warnings: string[] = [];
        const performanceData = await this.getEmployeePerformanceHistory(employeeId);

        // Check if this is an employer-initiated termination (HR or Manager)
        // For employer-initiated terminations, validate against performance data
        const isEmployerInitiated = initiator === 'hr' || initiator === 'manager';

        if (isEmployerInitiated) {
            if (!performanceData.hasPublishedAppraisals) {
                warnings.push('No published performance appraisals found for this employee. Consider documenting performance issues before termination.');
            }

            if (performanceData.lowScoreAppraisals.length === 0 && performanceData.hasPublishedAppraisals) {
                warnings.push('Employee has no low-score appraisals on record. Ensure termination follows due process.');
            }

            if (performanceData.averageScore !== null && performanceData.averageScore >= 70) {
                warnings.push(`Employee average performance score is ${performanceData.averageScore.toFixed(1)}%, which is above threshold. Ensure termination is properly documented.`);
            }
        }

        return {
            isJustified: initiator === 'employee' || performanceData.lowScoreAppraisals.length > 0,
            performanceData,
            warnings,
        };
    }

    private determineSystemRole(jobTitle: string): SystemRole {
        const title = jobTitle.toLowerCase();
        if (title.includes('hr manager')) return SystemRole.HR_MANAGER;
        if (title.includes('hr admin')) return SystemRole.HR_ADMIN;
        if (title.includes('hr employee') || title.includes('human resources')) return SystemRole.HR_EMPLOYEE;
        if (title.includes('payroll manager')) return SystemRole.PAYROLL_MANAGER;
        if (title.includes('payroll')) return SystemRole.PAYROLL_SPECIALIST;
        if (title.includes('recruiter') || title.includes('talent acquisition')) return SystemRole.RECRUITER;
        if (title.includes('system admin') || title.includes('it admin')) return SystemRole.SYSTEM_ADMIN;
        if (title.includes('legal')) return SystemRole.LEGAL_POLICY_ADMIN;
        if (title.includes('finance')) return SystemRole.FINANCE_STAFF;
        if (title.includes('head') || title.includes('director')) return SystemRole.DEPARTMENT_HEAD;

        return SystemRole.DEPARTMENT_EMPLOYEE;
    }

    async createEmployeeFromContract(contractData: {
        candidateId: string;
        role: string;
        grossSalary: number;
        signingBonus?: number;
        benefits?: string[];
        acceptanceDate: Date;
        departmentId?: string;
        positionId?: string;
    }): Promise<{ employee: EmployeeProfile; temporaryPassword: string }> {
        const candidate = await this.validateCandidateExists(contractData.candidateId);

        if (candidate.status === CandidateStatus.HIRED) {
            throw new BadRequestException('Candidate has already been hired');
        }

        if (candidate.status === CandidateStatus.REJECTED || candidate.status === CandidateStatus.WITHDRAWN) {
            throw new BadRequestException(`Cannot create employee from candidate with status: ${candidate.status}`);
        }

        const existingEmployeeByNationalId = await this.employeeProfileModel.findOne({
            nationalId: candidate.nationalId,
        }).exec();

        if (existingEmployeeByNationalId) {
            throw new BadRequestException('An employee profile already exists with this national ID');
        }

        if (candidate.personalEmail) {
            const existingEmployeeByEmail = await this.employeeProfileModel.findOne({
                $or: [
                    { personalEmail: candidate.personalEmail },
                    { workEmail: candidate.personalEmail }
                ]
            }).exec();

            if (existingEmployeeByEmail) {
                throw new BadRequestException('An employee profile already exists with this email');
            }
        }

        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await this.employeeAuthService.hashPassword(temporaryPassword);

        const employeeNumber = await this.generateEmployeeNumber();
        const workEmail = await this.generateUniqueWorkEmail(candidate.firstName, candidate.lastName);

        const employee = new this.employeeProfileModel({
            firstName: candidate.firstName,
            middleName: candidate.middleName,
            lastName: candidate.lastName,
            fullName: candidate.fullName || `${candidate.firstName} ${candidate.middleName || ''} ${candidate.lastName}`.trim().replace(/\s+/g, ' '),
            nationalId: candidate.nationalId,
            gender: candidate.gender,
            maritalStatus: candidate.maritalStatus,
            dateOfBirth: candidate.dateOfBirth,
            personalEmail: candidate.personalEmail,
            mobilePhone: candidate.mobilePhone,
            homePhone: candidate.homePhone,
            address: candidate.address,
            profilePictureUrl: candidate.profilePictureUrl,
            employeeNumber,
            workEmail,
            password: hashedPassword,
            dateOfHire: contractData.acceptanceDate,
            contractStartDate: contractData.acceptanceDate,
            status: EmployeeStatus.PROBATION,
            statusEffectiveFrom: new Date(),
            primaryDepartmentId: contractData.departmentId ? new Types.ObjectId(contractData.departmentId) : candidate.departmentId,
            primaryPositionId: contractData.positionId ? new Types.ObjectId(contractData.positionId) : candidate.positionId,
        });

        const savedEmployee = await employee.save();

        const assignedRole = this.determineSystemRole(contractData.role);

        await this.systemRoleModel.create({
            employeeProfileId: savedEmployee._id,
            roles: [assignedRole],
            permissions: [],
            isActive: true,
        });

        await this.updateCandidateStatus(contractData.candidateId, CandidateStatus.HIRED);

        await this.createNotification(
            savedEmployee._id,
            'EMPLOYEE_PROFILE_CREATED',
            `Welcome! Your employee profile has been created. Your work email is ${workEmail}. Please change your password upon first login.`,
        );

        await this.notifyHRUsers(
            'NEW_EMPLOYEE_CREATED',
            `New employee ${savedEmployee.fullName} (${employeeNumber}) has been created from contract acceptance.`,
        );

        return { employee: savedEmployee, temporaryPassword };
    }

    async updateCandidateStatus(candidateId: string, status: CandidateStatus): Promise<Candidate> {
        this.validateObjectId(candidateId, 'candidateId');

        const candidate = await this.candidateModel.findByIdAndUpdate(
            candidateId,
            { status },
            { new: true },
        ).exec();

        if (!candidate) {
            throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
        }

        return candidate;
    }

    async deactivateEmployee(employeeId: string, reason?: string): Promise<EmployeeProfileDocument> {
        const employee = await this.validateEmployeeExists(employeeId);

        if (employee.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Employee is already terminated');
        }

        employee.status = EmployeeStatus.TERMINATED;
        employee.statusEffectiveFrom = new Date();

        const savedEmployee = await employee.save();

        await this.systemRoleModel.updateMany(
            { employeeProfileId: new Types.ObjectId(employeeId) },
            { isActive: false },
        );

        await this.notifyHRUsers(
            'EMPLOYEE_DEACTIVATED',
            `Employee ${employee.fullName} (${employee.employeeNumber}) has been deactivated. Reason: ${reason || 'Not specified'}`,
        );

        await this.notifyITAdmins(
            'ACCESS_REVOCATION_REQUIRED',
            `Employee ${employee.fullName} (${employee.employeeNumber}) has been terminated. Please revoke all system access.`,
        );

        return savedEmployee;
    }

    async sendInterviewNotifications(data: {
        candidateId: string;
        panelMemberIds: string[];
        interviewDate: Date;
        interviewMethod: string;
        videoLink?: string;
        stage: string;
    }): Promise<{ candidateNotified: boolean; panelNotified: number }> {
        const candidate = await this.validateCandidateExists(data.candidateId);

        const dateStr = data.interviewDate.toISOString().slice(0, 16).replace('T', ' ');

        await this.createNotification(
            data.candidateId,
            'INTERVIEW_SCHEDULED',
            `Your ${data.stage} interview has been scheduled for ${dateStr}. Method: ${data.interviewMethod}. ${data.videoLink ? `Join link: ${data.videoLink}` : ''}`,
        );

        let panelNotified = 0;
        for (const panelId of data.panelMemberIds) {
            try {
                await this.createNotification(
                    panelId,
                    'INTERVIEW_PANEL_ASSIGNMENT',
                    `You have been assigned as a panel member for ${data.stage} interview with candidate ${candidate.fullName} on ${dateStr}.`,
                );
                panelNotified++;
            } catch (error) {
                this.logger.warn(`Failed to notify panel member ${panelId}`, error);
            }
        }

        return { candidateNotified: true, panelNotified };
    }

    async sendApplicationStatusNotification(data: {
        candidateId: string;
        applicationId: string;
        status: string;
        message?: string;
    }): Promise<NotificationLog> {
        return this.createNotification(
            data.candidateId,
            'APPLICATION_STATUS_UPDATE',
            data.message || `Your application status has been updated to: ${data.status}`,
        );
    }

    async sendRejectionNotification(data: {
        candidateId: string;
        applicationId: string;
        rejectionReason?: string;
        message?: string;
    }): Promise<NotificationLog> {
        return this.createNotification(
            data.candidateId,
            'APPLICATION_REJECTED',
            data.message || data.rejectionReason || 'Thank you for your interest. After careful consideration, we have decided to move forward with other candidates.',
        );
    }

    async sendOfferNotification(data: {
        candidateId: string;
        offerId: string;
        role: string;
        deadline: Date;
    }): Promise<NotificationLog> {
        const deadlineStr = data.deadline.toISOString().slice(0, 10);

        return this.createNotification(
            data.candidateId,
            'OFFER_SENT',
            `Congratulations! You have received a job offer for the position of ${data.role}. Please respond by ${deadlineStr}.`,
        );
    }

    async sendOnboardingTaskReminder(data: {
        employeeId: string;
        taskName: string;
        deadline?: Date;
        isOverdue?: boolean;
    }): Promise<NotificationLog> {
        const type = data.isOverdue ? 'ONBOARDING_TASK_OVERDUE' : 'ONBOARDING_TASK_REMINDER';
        const deadlineStr = data.deadline ? ` (Due: ${data.deadline.toISOString().slice(0, 10)})` : '';

        return this.createNotification(
            data.employeeId,
            type,
            `${data.isOverdue ? 'OVERDUE: ' : ''}Please complete your onboarding task: ${data.taskName}${deadlineStr}`,
        );
    }

    async notifySystemAccessProvisioned(data: {
        employeeId: string;
        employeeName: string;
        workEmail: string;
    }): Promise<{ employeeNotified: boolean; itNotified: boolean; hrNotified: boolean }> {
        await this.createNotification(
            data.employeeId,
            'SYSTEM_ACCESS_PROVISIONED',
            `Your system access has been provisioned. Work email: ${data.workEmail}. Please contact IT if you have any issues.`,
        );

        await this.notifyITAdmins(
            'SYSTEM_ACCESS_PROVISIONED',
            `System access has been provisioned for new employee: ${data.employeeName} (${data.workEmail}).`,
        );

        await this.notifyHRUsers(
            'SYSTEM_ACCESS_PROVISIONED',
            `System access provisioned for ${data.employeeName}. Onboarding IT task complete.`,
        );

        return { employeeNotified: true, itNotified: true, hrNotified: true };
    }

    async notifyEquipmentReserved(data: {
        employeeId: string;
        employeeName: string;
        equipment?: string[];
        deskNumber?: string;
        accessCardNumber?: string;
    }): Promise<{ employeeNotified: boolean; adminNotified: boolean }> {
        const items: string[] = [];
        if (data.equipment?.length) items.push(`Equipment: ${data.equipment.join(', ')}`);
        if (data.deskNumber) items.push(`Desk: ${data.deskNumber}`);
        if (data.accessCardNumber) items.push(`Access Card: ${data.accessCardNumber}`);

        await this.createNotification(
            data.employeeId,
            'EQUIPMENT_RESERVED',
            `Your equipment and workspace have been reserved: ${items.join('; ')}. They will be ready on your first day.`,
        );

        await this.notifyHRUsers(
            'EQUIPMENT_RESERVED',
            `Equipment reserved for ${data.employeeName}: ${items.join('; ')}`,
        );

        return { employeeNotified: true, adminNotified: true };
    }

    async notifyAccessRevocationScheduled(data: {
        employeeId: string;
        employeeName: string;
        revocationDate: string;
    }): Promise<{ itNotified: boolean; hrNotified: boolean }> {
        await this.notifyITAdmins(
            'ACCESS_REVOCATION_SCHEDULED',
            `Access revocation scheduled for ${data.employeeName} on ${data.revocationDate}. Please ensure all systems are revoked by this date.`,
        );

        await this.notifyHRUsers(
            'ACCESS_REVOCATION_SCHEDULED',
            `Access revocation scheduled for ${data.employeeName} on ${data.revocationDate}.`,
        );

        return { itNotified: true, hrNotified: true };
    }

    async notifyTerminationApproved(data: {
        employeeId: string;
        employeeName: string;
        terminationDate?: Date;
        initiator: string;
    }): Promise<{ employeeNotified: boolean; hrNotified: boolean; itNotified: boolean }> {
        const dateStr = data.terminationDate ? data.terminationDate.toISOString().slice(0, 10) : 'TBD';

        await this.createNotification(
            data.employeeId,
            'TERMINATION_APPROVED',
            `Your ${data.initiator === 'EMPLOYEE' ? 'resignation' : 'termination'} request has been approved. Last working day: ${dateStr}.`,
        );

        await this.notifyHRUsers(
            'TERMINATION_APPROVED',
            `${data.initiator === 'EMPLOYEE' ? 'Resignation' : 'Termination'} approved for ${data.employeeName}. Last working day: ${dateStr}. Please initiate clearance process.`,
        );

        await this.notifyITAdmins(
            'TERMINATION_APPROVED',
            `${data.employeeName} termination approved. Last working day: ${dateStr}. Please prepare for access revocation.`,
        );

        return { employeeNotified: true, hrNotified: true, itNotified: true };
    }

    async notifyClearanceComplete(data: {
        employeeId: string;
        employeeName: string;
        terminationId: string;
    }): Promise<{ hrNotified: boolean }> {
        await this.notifyHRUsers(
            'CLEARANCE_COMPLETE',
            `Clearance process complete for ${data.employeeName}. All departments cleared. Final settlement can now be processed.`,
        );

        return { hrNotified: true };
    }

    async notifyFinalSettlementTriggered(data: {
        employeeId: string;
        employeeName: string;
        terminationId: string;
    }): Promise<{ employeeNotified: boolean; hrNotified: boolean }> {
        await this.createNotification(
            data.employeeId,
            'FINAL_SETTLEMENT_TRIGGERED',
            `Your final settlement has been initiated. You will receive details about your final pay calculation shortly.`,
        );

        await this.notifyHRUsers(
            'FINAL_SETTLEMENT_TRIGGERED',
            `Final settlement triggered for ${data.employeeName}. Please review and process final pay calculation.`,
        );

        return { employeeNotified: true, hrNotified: true };
    }

    async notifyOnboardingCancelled(data: {
        employeeId?: string;
        employeeName: string;
        reason: string;
    }): Promise<{ itNotified: boolean; hrNotified: boolean }> {
        await this.notifyITAdmins(
            'ONBOARDING_CANCELLED',
            `Onboarding cancelled for ${data.employeeName}. Reason: ${data.reason}. Please revoke any provisioned access.`,
        );

        await this.notifyHRUsers(
            'ONBOARDING_CANCELLED',
            `Onboarding cancelled for ${data.employeeName}. Reason: ${data.reason}. Profile will be deactivated.`,
        );

        return { itNotified: true, hrNotified: true };
    }

    async notifyDocumentUploaded(data: {
        ownerId: string;
        ownerName: string;
        documentType: string;
    }): Promise<{ hrNotified: boolean }> {
        await this.notifyHRUsers(
            'DOCUMENT_UPLOADED',
            `${data.ownerName} has uploaded a new document: ${data.documentType}. Please verify the document.`,
        );

        return { hrNotified: true };
    }

    private generateTemporaryPassword(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    private async generateEmployeeNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.employeeProfileModel.countDocuments();
        return `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    private async generateUniqueWorkEmail(firstName: string, lastName: string): Promise<string> {
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
        let baseEmail = `${cleanFirst}.${cleanLast}@company.com`;

        const existingEmail = await this.employeeProfileModel.findOne({ workEmail: baseEmail }).exec();
        if (!existingEmail) {
            return baseEmail;
        }

        let counter = 1;
        while (true) {
            const numberedEmail = `${cleanFirst}.${cleanLast}${counter}@company.com`;
            const exists = await this.employeeProfileModel.findOne({ workEmail: numberedEmail }).exec();
            if (!exists) {
                return numberedEmail;
            }
            counter++;
            if (counter > 100) {
                throw new BadRequestException('Unable to generate unique work email');
            }
        }
    }
}

