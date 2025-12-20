import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { Onboarding, OnboardingDocument } from '../models/onboarding.schema';
import { Contract, ContractDocument } from '../models/contract.schema';
import { Document, DocumentDocument } from '../models/document.schema';
import { Offer, OfferDocument } from '../models/offer.schema';

// Payroll Models
import { employeeSigningBonus, employeeSigningBonusDocument } from '../../payroll/payroll-execution/models/EmployeeSigningBonus.schema';
import { signingBonus, signingBonusDocument } from '../../payroll/payroll-configuration/models/signingBonus.schema';
import { employeePayrollDetails, employeePayrollDetailsDocument } from '../../payroll/payroll-execution/models/employeePayrollDetails.schema';
import { payrollRuns, payrollRunsDocument } from '../../payroll/payroll-execution/models/payrollRuns.schema';
import { BonusStatus, BankStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';
import { ConfigStatus } from '../../payroll/payroll-configuration/enums/payroll-configuration-enums';

// Payroll Service
import { PayrollExecutionService } from '../../payroll/payroll-execution/services/payroll-execution.service';

// DTOs
import {CreateOnboardingDto, CreateOnboardingTaskDto, UpdateTaskStatusDto, UploadDocumentDto, ReserveEquipmentDto, ProvisionAccessDto, TriggerPayrollInitiationDto, ScheduleAccessRevocationDto, CancelOnboardingDto,} from '../dto/onboarding';

// Enums
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';
import { DocumentType } from '../enums/document-type.enum';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    // Required document types for onboarding process
    private readonly REQUIRED_ONBOARDING_DOCUMENTS: DocumentType[] = [
        DocumentType.CONTRACT,
        DocumentType.ID,
    ];

    constructor(
        @InjectModel(Onboarding.name) private onboardingModel: Model<OnboardingDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(Document.name) private documentModel: Model<DocumentDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        // Payroll Models
        @InjectModel(employeeSigningBonus.name) private employeeSigningBonusModel: Model<employeeSigningBonusDocument>,
        @InjectModel(signingBonus.name) private signingBonusModel: Model<signingBonusDocument>,
        @InjectModel(employeePayrollDetails.name) private employeePayrollDetailsModel: Model<employeePayrollDetailsDocument>,
        @InjectModel(payrollRuns.name) private payrollRunsModel: Model<payrollRunsDocument>,
        // Services
        @Inject(forwardRef(() => PayrollExecutionService)) private readonly payrollExecutionService: PayrollExecutionService,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    /**
     * Normalize task status to handle case-insensitive comparison
     * DB might store 'COMPLETED', 'Completed', or 'completed'
     */
    private normalizeTaskStatus(status: string | undefined): OnboardingTaskStatus {
        if (!status) return OnboardingTaskStatus.PENDING;
        const lower = status.toLowerCase();
        if (lower === 'completed' || lower === 'complete') return OnboardingTaskStatus.COMPLETED;
        if (lower === 'in_progress' || lower === 'inprogress' || lower === 'in-progress') return OnboardingTaskStatus.IN_PROGRESS;
        return OnboardingTaskStatus.PENDING;
    }

    /**
     * Check if task status equals a given status (case-insensitive)
     */
    private isTaskStatus(taskStatus: string | undefined, targetStatus: OnboardingTaskStatus): boolean {
        return this.normalizeTaskStatus(taskStatus) === targetStatus;
    }

    /**
     * Normalize all task statuses in an onboarding document before saving.
     * This fixes the issue where existing DB data has uppercase values
     * but schema expects lowercase enum values.
     */
    private normalizeAllTaskStatuses(onboarding: OnboardingDocument): void {
        if (onboarding.tasks && Array.isArray(onboarding.tasks)) {
            for (let i = 0; i < onboarding.tasks.length; i++) {
                if (onboarding.tasks[i].status) {
                    onboarding.tasks[i].status = this.normalizeTaskStatus(onboarding.tasks[i].status);
                }
            }
        }
    }

    // ============================================================
    // CANDIDATE DOCUMENT UPLOAD - Initiate Onboarding Process
    // User Story: As a Candidate, I want to upload signed contract and candidate
    // required forms and templates to initiate the onboarding process.
    // ============================================================

    /**
     * Get required document templates and checklist for candidates
     * Returns list of required documents and their upload status
     * Contract upload is only allowed after offer is accepted
     */
    async getRequiredDocumentTemplates(candidateId: string): Promise<{
        candidateId: string;
        offerStatus: {
            hasOffer: boolean;
            isAccepted: boolean;
            offerId?: string;
        };
        contractStatus: {
            hasContract: boolean;
            isSigned: boolean;
            contractId?: string;
            employeeSignedAt?: Date;
            employerSignedAt?: Date;
        };
        requiredDocuments: {
            type: DocumentType;
            name: string;
            description: string;
            isRequired: boolean;
            isUploaded: boolean;
            canUpload: boolean;
            uploadBlockedReason?: string;
            uploadedDocument?: {
                id: string;
                filePath: string;
                uploadedAt: Date;
            };
        }[];
        summary: {
            totalRequired: number;
            totalUploaded: number;
            progressPercentage: number;
        };
        allRequiredUploaded: boolean;
        canInitiateOnboarding: boolean;
    }> {
        this.validateObjectId(candidateId, 'candidateId');

        // Validate candidate exists
        await this.sharedRecruitmentService.validateCandidateExists(candidateId);

        // Get offer and contract status
        const offer = await this.offerModel.findOne({
            candidateId: new Types.ObjectId(candidateId),
        }).sort({ createdAt: -1 }).exec();

        let contract: ContractDocument | null = null;
        if (offer) {
            contract = await this.contractModel.findOne({
                offerId: offer._id,
            }).exec();
        }

        const offerStatus = {
            hasOffer: !!offer,
            isAccepted: offer?.applicantResponse === OfferResponseStatus.ACCEPTED,
            offerId: offer?._id.toString(),
        };

        const contractStatus = {
            hasContract: !!contract,
            isSigned: !!(contract?.employeeSignedAt && contract?.employerSignedAt),
            contractId: contract?._id.toString(),
            employeeSignedAt: contract?.employeeSignedAt,
            employerSignedAt: contract?.employerSignedAt,
        };

        // Get already uploaded documents by this candidate
        const uploadedDocs = await this.documentModel
            .find({ ownerId: new Types.ObjectId(candidateId) })
            .exec();

        const uploadedTypesMap = new Map<string, DocumentDocument>();
        uploadedDocs.forEach(doc => uploadedTypesMap.set(doc.type, doc));

        // Define required document templates with descriptions
        // Contract upload requires accepted offer
        const documentTemplates = [
            {
                type: DocumentType.CONTRACT,
                name: 'Signed Employment Contract',
                description: 'Upload the signed employment contract document',
                isRequired: true,
                requiresAcceptedOffer: true,
            },
            {
                type: DocumentType.ID,
                name: 'Government-Issued ID',
                description: 'Upload a valid government-issued identification (passport, national ID, or driver\'s license)',
                isRequired: true,
                requiresAcceptedOffer: false,
            },
            {
                type: DocumentType.CERTIFICATE,
                name: 'Certifications & Qualifications',
                description: 'Upload any relevant professional certifications or educational documents',
                isRequired: false,
                requiresAcceptedOffer: false,
            },
            {
                type: DocumentType.CV,
                name: 'Updated CV/Resume',
                description: 'Upload your most recent CV or resume if not already on file',
                isRequired: false,
                requiresAcceptedOffer: false,
            },
        ];

        const requiredDocuments = documentTemplates.map(template => {
            const uploadedDoc = uploadedTypesMap.get(template.type);

            // Determine if upload is allowed
            let canUpload = true;
            let uploadBlockedReason: string | undefined;

            if (template.requiresAcceptedOffer && !offerStatus.isAccepted) {
                canUpload = false;
                uploadBlockedReason = 'Offer must be accepted before uploading contract';
            }

            return {
                type: template.type,
                name: template.name,
                description: template.description,
                isRequired: template.isRequired,
                isUploaded: !!uploadedDoc,
                canUpload,
                uploadBlockedReason,
                uploadedDocument: uploadedDoc ? {
                    id: uploadedDoc._id.toString(),
                    filePath: uploadedDoc.filePath,
                    uploadedAt: uploadedDoc.uploadedAt,
                } : undefined,
            };
        });

        // Calculate summary
        const requiredDocs = requiredDocuments.filter(d => d.isRequired);
        const uploadedRequiredDocs = requiredDocs.filter(d => d.isUploaded);

        const summary = {
            totalRequired: requiredDocs.length,
            totalUploaded: uploadedRequiredDocs.length,
            progressPercentage: requiredDocs.length > 0
                ? Math.round((uploadedRequiredDocs.length / requiredDocs.length) * 100)
                : 0,
        };

        const allRequiredUploaded = this.REQUIRED_ONBOARDING_DOCUMENTS.every(
            type => uploadedTypesMap.has(type)
        );

        return {
            candidateId,
            offerStatus,
            contractStatus,
            requiredDocuments,
            summary,
            allRequiredUploaded,
            canInitiateOnboarding: allRequiredUploaded && contractStatus.isSigned,
        };
    }

    /**
     * Check if candidate has a fully signed contract
     */
    private async checkCandidateHasSignedContract(candidateId: string): Promise<boolean> {
        // Find offer for this candidate
        const offer = await this.offerModel.findOne({
            candidateId: new Types.ObjectId(candidateId),
        }).exec();

        if (!offer) {
            return false;
        }

        // Find contract for this offer
        const contract = await this.contractModel.findOne({
            offerId: offer._id,
        }).exec();

        if (!contract) {
            return false;
        }

        // Contract must be signed by both parties
        return !!(contract.employeeSignedAt && contract.employerSignedAt);
    }

    /**
     * Upload or replace document by candidate
     * Candidates can replace existing documents of the same type
     * Contract upload requires accepted offer
     */
    async uploadCandidateDocument(dto: UploadDocumentDto): Promise<{
        document: Document;
        message: string;
        isReplacement: boolean;
        documentStatus: {
            type: DocumentType;
            isRequired: boolean;
            uploadedAt: Date;
        };
        onboardingReadiness: {
            allRequiredUploaded: boolean;
            missingDocuments: DocumentType[];
            canInitiateOnboarding: boolean;
        };
    }> {
        this.validateObjectId(dto.ownerId, 'ownerId');

        // Validate that owner is a candidate
        const candidate = await this.sharedRecruitmentService.validateCandidateExists(dto.ownerId);
        const candidateName = candidate.fullName || `${candidate.firstName} ${candidate.lastName}`;

        // For CONTRACT document type, validate offer is accepted first
        if (dto.type === DocumentType.CONTRACT) {
            const offer = await this.offerModel.findOne({
                candidateId: new Types.ObjectId(dto.ownerId),
            }).sort({ createdAt: -1 }).exec();

            if (!offer) {
                throw new BadRequestException('No offer found for this candidate. Cannot upload contract document.');
            }

            if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
                throw new BadRequestException(
                    'Offer must be accepted before uploading contract document. ' +
                    `Current offer status: ${offer.applicantResponse || 'pending'}`
                );
            }
        }

        // Check if document of same type already exists for this candidate
        const existingDoc = await this.documentModel.findOne({
            ownerId: new Types.ObjectId(dto.ownerId),
            type: dto.type,
        }).exec();

        let savedDoc: DocumentDocument;
        let isReplacement = false;

        if (existingDoc) {
            // Replace existing document
            existingDoc.filePath = dto.filePath;
            existingDoc.uploadedAt = new Date();
            savedDoc = await existingDoc.save();
            isReplacement = true;

            this.logger.log(`Candidate ${dto.ownerId} replaced ${dto.type} document`);
        } else {
            // Create new document record
            const document = new this.documentModel({
                ownerId: new Types.ObjectId(dto.ownerId),
                type: dto.type,
                filePath: dto.filePath,
                uploadedAt: new Date(),
            });
            savedDoc = await document.save();

            this.logger.log(`Candidate ${dto.ownerId} uploaded new ${dto.type} document`);
        }

        // Notify HR of document upload
        await this.sharedRecruitmentService.notifyDocumentUploaded({
            ownerId: dto.ownerId,
            ownerName: candidateName,
            documentType: dto.type,
        });

        // Check onboarding readiness after upload
        const uploadedDocs = await this.documentModel
            .find({ ownerId: new Types.ObjectId(dto.ownerId) })
            .exec();

        const uploadedTypes = new Set(uploadedDocs.map(d => d.type));
        const missingDocuments = this.REQUIRED_ONBOARDING_DOCUMENTS.filter(
            type => !uploadedTypes.has(type)
        );

        const hasSignedContract = await this.checkCandidateHasSignedContract(dto.ownerId);
        const allRequiredUploaded = missingDocuments.length === 0;

        // If all required documents uploaded and contract is signed, notify HR
        if (allRequiredUploaded && hasSignedContract) {
            await this.notifyOnboardingReadyToInitiate(dto.ownerId, candidateName);
        }

        return {
            document: savedDoc,
            message: isReplacement
                ? `${dto.type} document replaced successfully`
                : `${dto.type} document uploaded successfully`,
            isReplacement,
            documentStatus: {
                type: dto.type,
                isRequired: this.REQUIRED_ONBOARDING_DOCUMENTS.includes(dto.type),
                uploadedAt: savedDoc.uploadedAt,
            },
            onboardingReadiness: {
                allRequiredUploaded,
                missingDocuments,
                canInitiateOnboarding: allRequiredUploaded && hasSignedContract,
            },
        };
    }

    /**
     * Notify HR that candidate has completed all required document uploads
     */
    private async notifyOnboardingReadyToInitiate(candidateId: string, candidateName: string): Promise<void> {
        try {
            await this.sharedRecruitmentService.notifyHRUsers(
                'ONBOARDING_READY_TO_INITIATE',
                `Candidate ${candidateName} has uploaded all required documents and is ready for onboarding initiation.`,
            );

            this.logger.log(`Onboarding ready notification sent for candidate ${candidateId}`);
        } catch (error) {
            this.logger.warn(`Failed to send onboarding ready notification: ${error.message}`);
        }
    }

    /**
     * Get document upload progress for a candidate
     */
    async getCandidateDocumentProgress(candidateId: string): Promise<{
        candidateId: string;
        totalRequired: number;
        totalUploaded: number;
        progressPercentage: number;
        uploadedDocuments: {
            id: string;
            type: DocumentType;
            filePath: string;
            uploadedAt: Date;
        }[];
        missingRequired: DocumentType[];
        isComplete: boolean;
    }> {
        this.validateObjectId(candidateId, 'candidateId');

        await this.sharedRecruitmentService.validateCandidateExists(candidateId);

        const uploadedDocs = await this.documentModel
            .find({ ownerId: new Types.ObjectId(candidateId) })
            .sort({ uploadedAt: -1 })
            .exec();

        const uploadedTypes = new Set(uploadedDocs.map(d => d.type));
        const missingRequired = this.REQUIRED_ONBOARDING_DOCUMENTS.filter(
            type => !uploadedTypes.has(type)
        );

        const requiredUploaded = this.REQUIRED_ONBOARDING_DOCUMENTS.filter(
            type => uploadedTypes.has(type)
        ).length;

        const totalRequired = this.REQUIRED_ONBOARDING_DOCUMENTS.length;
        const progressPercentage = Math.round((requiredUploaded / totalRequired) * 100);

        return {
            candidateId,
            totalRequired,
            totalUploaded: uploadedDocs.length,
            progressPercentage,
            uploadedDocuments: uploadedDocs.map(doc => ({
                id: doc._id.toString(),
                type: doc.type,
                filePath: doc.filePath,
                uploadedAt: doc.uploadedAt,
            })),
            missingRequired,
            isComplete: missingRequired.length === 0,
        };
    }

    /**
     * Validate candidate can initiate onboarding (all documents uploaded, contract signed)
     */
    async validateOnboardingEligibility(candidateId: string): Promise<{
        isEligible: boolean;
        candidateId: string;
        contractId?: string;
        reasons: string[];
        missingDocuments: DocumentType[];
    }> {
        this.validateObjectId(candidateId, 'candidateId');

        const reasons: string[] = [];
        let contractId: string | undefined;

        // Check candidate exists
        try {
            await this.sharedRecruitmentService.validateCandidateExists(candidateId);
        } catch (error) {
            return {
                isEligible: false,
                candidateId,
                reasons: ['Candidate not found'],
                missingDocuments: [],
            };
        }

        // Check for signed contract
        const offer = await this.offerModel.findOne({
            candidateId: new Types.ObjectId(candidateId),
        }).exec();

        if (!offer) {
            reasons.push('No offer found for this candidate');
        } else {
            const contract = await this.contractModel.findOne({
                offerId: offer._id,
            }).exec();

            if (!contract) {
                reasons.push('No contract found for this candidate');
            } else {
                contractId = contract._id.toString();

                if (!contract.employeeSignedAt) {
                    reasons.push('Contract has not been signed by the candidate');
                }
                if (!contract.employerSignedAt) {
                    reasons.push('Contract has not been signed by the employer');
                }
            }
        }

        // Check document uploads
        const uploadedDocs = await this.documentModel
            .find({ ownerId: new Types.ObjectId(candidateId) })
            .exec();

        const uploadedTypes = new Set(uploadedDocs.map(d => d.type));
        const missingDocuments = this.REQUIRED_ONBOARDING_DOCUMENTS.filter(
            type => !uploadedTypes.has(type)
        );

        if (missingDocuments.length > 0) {
            reasons.push(`Missing required documents: ${missingDocuments.join(', ')}`);
        }

        return {
            isEligible: reasons.length === 0,
            candidateId,
            contractId,
            reasons,
            missingDocuments,
        };
    }

    /**
     * Delete a candidate's uploaded document (allows re-upload)
     */
    async deleteCandidateDocument(candidateId: string, documentId: string): Promise<{
        success: boolean;
        message: string;
        deletedDocumentType: DocumentType;
    }> {
        this.validateObjectId(candidateId, 'candidateId');
        this.validateObjectId(documentId, 'documentId');

        await this.sharedRecruitmentService.validateCandidateExists(candidateId);

        const document = await this.documentModel.findOne({
            _id: new Types.ObjectId(documentId),
            ownerId: new Types.ObjectId(candidateId),
        }).exec();

        if (!document) {
            throw new NotFoundException('Document not found or does not belong to this candidate');
        }

        const documentType = document.type;
        await this.documentModel.findByIdAndDelete(documentId).exec();

        this.logger.log(`Candidate ${candidateId} deleted ${documentType} document`);

        return {
            success: true,
            message: `${documentType} document deleted successfully`,
            deletedDocumentType: documentType,
        };
    }

    async createOnboarding(dto: CreateOnboardingDto): Promise<Onboarding> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed (by both employee and employer) before creating onboarding');
        }

        const existingByEmployee = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(dto.employeeId) })
            .exec();

        if (existingByEmployee) {
            throw new ConflictException('Onboarding checklist already exists for this employee');
        }

        const existingByContract = await this.onboardingModel
            .findOne({ contractId: new Types.ObjectId(dto.contractId) })
            .exec();

        if (existingByContract) {
            throw new ConflictException('Onboarding checklist already exists for this contract');
        }

        // Allow empty tasks array - BR 9 tasks will be auto-generated
        const tasks = (dto.tasks || []).map(task => ({
            name: task.name,
            department: task.department,
            status: OnboardingTaskStatus.PENDING,
            deadline: task.deadline ? new Date(task.deadline) : undefined,
            documentId: task.documentId ? new Types.ObjectId(task.documentId) : undefined,
            notes: task.notes || '',
        }));

        // BR 9(a): Auto onboarding tasks are generated for HR (payroll & benefits' creation)
        const hrPayrollTaskExists = tasks.some(t =>
            t.department === 'HR' && (t.name.toLowerCase().includes('payroll') || t.name.toLowerCase().includes('benefits'))
        );
        if (!hrPayrollTaskExists) {
            tasks.push({
                name: 'Payroll & Benefits Setup',
                department: 'HR',
                status: OnboardingTaskStatus.PENDING,
                deadline: undefined,
                documentId: undefined,
                notes: 'Auto-generated task for HR payroll & benefits creation (BR 9a)',
            });
        }

        // BR 9(b): Auto onboarding tasks are generated for IT (allocation of email, laptop, system access)
        const itTaskExists = tasks.some(t => t.department === 'IT' || t.name.toLowerCase().includes('system access'));
        if (!itTaskExists) {
            tasks.push({
                name: 'Provision System Access (Email, SSO, Internal Systems)',
                department: 'IT',
                status: OnboardingTaskStatus.PENDING,
                deadline: undefined,
                documentId: undefined,
                notes: 'Auto-generated task for IT provisioning (BR 9b)',
            });
        }

        // BR 9(c): Auto onboarding tasks are generated for Admin (allocation and assignment of workspace, ID badge)
        const adminTaskExists = tasks.some(t => t.department === 'Admin' || t.department === 'Facilities' || t.name.toLowerCase().includes('equipment'));
        if (!adminTaskExists) {
            tasks.push({
                name: 'Reserve Equipment & Workspace',
                department: 'Admin',
                status: OnboardingTaskStatus.PENDING,
                deadline: undefined,
                documentId: undefined,
                notes: 'Auto-generated task for Facilities/Admin (BR 9c)',
            });
        }

        const onboarding = new this.onboardingModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            contractId: new Types.ObjectId(dto.contractId),
            tasks,
            completed: false,
        });

        const savedOnboarding = await onboarding.save();

        // ONB-018 & ONB-019: Automatically handle payroll initiation and signing bonuses
        // BR 9(a): Auto onboarding tasks are generated for HR (payroll & benefits' creation)
        let payrollInitiated = false;
        let signingBonusProcessed = false;

        try {
            this.logger.log(`Auto-triggering payroll initiation for contract ${dto.contractId}`);
            await this.triggerPayrollInitiation({ contractId: dto.contractId });
            payrollInitiated = true;
        } catch (error) {
            this.logger.warn(`Auto-payroll initiation failed: ${error.message}`);
        }

        try {
            this.logger.log(`Auto-processing signing bonus for contract ${dto.contractId}`);
            await this.processSigningBonus(dto.contractId);
            signingBonusProcessed = true;
        } catch (error) {
            this.logger.warn(`Auto-signing bonus processing failed: ${error.message}`);
        }

        // If payroll was initiated, mark HR Payroll task as completed
        if (payrollInitiated) {
            const hrPayrollTaskIndex = savedOnboarding.tasks.findIndex(
                t => t.department === 'HR' && (t.name.toLowerCase().includes('payroll') || t.name.toLowerCase().includes('benefits'))
            );
            if (hrPayrollTaskIndex !== -1) {
                savedOnboarding.tasks[hrPayrollTaskIndex].status = OnboardingTaskStatus.COMPLETED;
                savedOnboarding.tasks[hrPayrollTaskIndex].completedAt = new Date();
                savedOnboarding.tasks[hrPayrollTaskIndex].notes =
                    `${savedOnboarding.tasks[hrPayrollTaskIndex].notes || ''} | Auto-completed: Payroll initiated${signingBonusProcessed ? ', Signing bonus processed' : ''}`.trim();
                this.normalizeAllTaskStatuses(savedOnboarding);
                await savedOnboarding.save();
            }
        }

        // Notify new hire that their onboarding checklist is ready
        try {
            await this.sharedRecruitmentService.createNotification(
                dto.employeeId,
                'ONBOARDING_CHECKLIST_CREATED',
                `Your onboarding checklist has been created with ${savedOnboarding.tasks.length} tasks. Please login to view and complete your tasks.`,
            );
        } catch (error) {
            this.logger.warn(`Failed to notify new hire about onboarding: ${error.message}`);
        }

        return savedOnboarding;
    }

    /**
     * ONB-002: Get signed contracts pending employee creation
     * Returns contracts that are fully signed but don't have an onboarding record yet
     */
    async getSignedContractsForOnboarding(): Promise<{
        _id: string;
        candidateId: string;
        candidateName: string;
        candidateEmail: string;
        jobTitle: string;
        departmentId?: string;
        departmentName: string;
        positionId?: string;
        positionTitle: string;
        contractSignedDate?: Date;
        startDate?: Date;
        salary: number;
        signingBonus?: number;
        benefits?: string[];
        hasOnboarding: boolean;
    }[]> {
        // Get all contracts that are fully signed
        const contracts = await this.contractModel
            .find({
                employeeSignedAt: { $exists: true, $ne: null },
                employerSignedAt: { $exists: true, $ne: null },
            })
            .populate('offerId')
            .populate('documentId')
            .exec();

        // Get all existing onboarding records to check which contracts already have onboarding
        const existingOnboardings = await this.onboardingModel.find().exec();
        const contractIdsWithOnboarding = new Set(
            existingOnboardings.map(o => o.contractId.toString())
        );

        // Filter to only contracts without onboarding and build response
        const pendingContracts: {
            _id: string;
            candidateId: string;
            candidateName: string;
            candidateEmail: string;
            jobTitle: string;
            departmentId?: string;
            departmentName: string;
            positionId?: string;
            positionTitle: string;
            contractSignedDate?: Date;
            startDate?: Date;
            salary: number;
            signingBonus?: number;
            benefits?: string[];
            hasOnboarding: boolean;
        }[] = [];

        for (const contract of contracts) {
            const hasOnboarding = contractIdsWithOnboarding.has(contract._id.toString());

            // Skip if already has onboarding
            if (hasOnboarding) continue;

            // Get offer details
            const offer = await this.offerModel.findById(contract.offerId).exec();
            if (!offer) continue;

            // Get candidate details using shared service
            let candidate: any;
            try {
                candidate = await this.sharedRecruitmentService.validateCandidateExists(offer.candidateId.toString());
            } catch {
                continue; // Skip if candidate not found
            }

            // Check if candidate is already hired
            if (candidate.status === 'HIRED') continue;

            pendingContracts.push({
                _id: contract._id.toString(),
                candidateId: offer.candidateId.toString(),
                candidateName: candidate.fullName || `${candidate.firstName} ${candidate.lastName}`,
                candidateEmail: candidate.personalEmail || '',
                jobTitle: contract.role || offer.role || '',
                departmentId: candidate.departmentId?.toString(),
                departmentName: '', // Would need department lookup
                positionId: candidate.positionId?.toString(),
                positionTitle: contract.role || '',
                contractSignedDate: contract.employeeSignedAt,
                startDate: contract.acceptanceDate,
                salary: contract.grossSalary,
                signingBonus: contract.signingBonus,
                benefits: contract.benefits,
                hasOnboarding: false,
            });
        }

        return pendingContracts;
    }

    async getContractDetails(contractId: string): Promise<Contract> {
        const contract = await this.contractModel
            .findById(contractId)
            .populate('offerId')
            .populate('documentId')
            .exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed before creating employee profile');
        }

        return contract;
    }

    async createEmployeeFromContract(contractId: string): Promise<{
        employee: any;
        temporaryPassword: string;
        contract: Contract;
    }> {
        const contract = await this.contractModel
            .findById(contractId)
            .populate('offerId')
            .exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.employeeSignedAt || !contract.employerSignedAt) {
            throw new BadRequestException('Contract must be fully signed before creating employee profile');
        }

        const offer = await this.offerModel.findById(contract.offerId).exec();
        if (!offer) {
            throw new NotFoundException('Associated offer not found');
        }

        const { employee, temporaryPassword } = await this.sharedRecruitmentService.createEmployeeFromContract({
            candidateId: offer.candidateId.toString(),
            role: contract.role,
            grossSalary: contract.grossSalary,
            signingBonus: contract.signingBonus,
            benefits: contract.benefits,
            acceptanceDate: contract.acceptanceDate,
        });

        return { employee, temporaryPassword, contract };
    }

    async getOnboardingByEmployeeId(employeeId: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .populate('contractId')
            .populate('tasks.documentId')
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        return onboarding;
    }

    async getAllOnboardings(): Promise<Onboarding[]> {
        return this.onboardingModel
            .find()
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getOnboardingById(id: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel
            .findById(id)
            .populate('contractId')
            .populate('tasks.documentId')
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${id} not found`);
        }

        return onboarding;
    }

    async updateTaskStatus(
        onboardingId: string,
        taskName: string,
        dto: UpdateTaskStatusDto,
    ): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed && !this.isTaskStatus(dto.status, OnboardingTaskStatus.COMPLETED)) {
            throw new BadRequestException('Cannot modify tasks on a completed onboarding checklist');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found in onboarding checklist`);
        }

        onboarding.tasks[taskIndex].status = dto.status;
        if (dto.completedAt) {
            onboarding.tasks[taskIndex].completedAt = new Date(dto.completedAt);
        }

        // Normalize all task statuses before saving (fix uppercase values from DB)
        this.normalizeAllTaskStatuses(onboarding);

        const allCompleted = onboarding.tasks.every(t => this.isTaskStatus(t.status, OnboardingTaskStatus.COMPLETED));
        if (allCompleted) {
            onboarding.completed = true;
            onboarding.completedAt = new Date();
        }

        return onboarding.save();
    }

    async addTask(onboardingId: string, dto: CreateOnboardingTaskDto): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot add tasks to a completed onboarding checklist');
        }

        const existingTask = onboarding.tasks.find(t => t.name === dto.name);
        if (existingTask) {
            throw new ConflictException(`Task with name "${dto.name}" already exists in this onboarding checklist`);
        }

        onboarding.tasks.push({
            name: dto.name,
            department: dto.department,
            status: OnboardingTaskStatus.PENDING,
            deadline: dto.deadline ? new Date(dto.deadline) : undefined,
            documentId: dto.documentId ? new Types.ObjectId(dto.documentId) : undefined,
            notes: dto.notes || '',
        });

        // Normalize all task statuses before saving (fix uppercase values from DB)
        this.normalizeAllTaskStatuses(onboarding);

        return onboarding.save();
    }

    /**
     * ONB-001 (BR 8): Update an existing task in the onboarding checklist
     * Allows HR Manager to customize checklist by modifying task details
     */
    async updateTask(
        onboardingId: string,
        taskName: string,
        updateData: {
            name?: string;
            department?: string;
            deadline?: string;
            notes?: string;
        },
    ): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot modify tasks on a completed onboarding checklist');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found in onboarding checklist`);
        }

        // Check if new name conflicts with existing task
        if (updateData.name && updateData.name !== taskName) {
            const existingTask = onboarding.tasks.find(t => t.name === updateData.name);
            if (existingTask) {
                throw new ConflictException(`Task with name "${updateData.name}" already exists`);
            }
            onboarding.tasks[taskIndex].name = updateData.name;
        }

        if (updateData.department) {
            onboarding.tasks[taskIndex].department = updateData.department;
        }

        if (updateData.deadline) {
            onboarding.tasks[taskIndex].deadline = new Date(updateData.deadline);
        }

        if (updateData.notes !== undefined) {
            onboarding.tasks[taskIndex].notes = updateData.notes;
        }

        // Normalize all task statuses before saving (fix uppercase values from DB)
        this.normalizeAllTaskStatuses(onboarding);

        return onboarding.save();
    }

    /**
     * ONB-001 (BR 8): Delete a task from the onboarding checklist
     * Allows HR Manager to customize checklist by removing unnecessary tasks
     */
    async deleteTask(onboardingId: string, taskName: string): Promise<Onboarding> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot delete tasks from a completed onboarding checklist');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found in onboarding checklist`);
        }

        // Don't allow deletion of completed tasks
        if (this.isTaskStatus(onboarding.tasks[taskIndex].status, OnboardingTaskStatus.COMPLETED)) {
            throw new BadRequestException('Cannot delete a completed task');
        }

        onboarding.tasks.splice(taskIndex, 1);

        // Normalize all task statuses before saving (fix uppercase values from DB)
        this.normalizeAllTaskStatuses(onboarding);

        return onboarding.save();
    }

    // ============================================================
    // ONB-004: View Onboarding Steps (Tracker)
    // BR 11(a, b): Onboarding workflow with department-specific tasks
    // ============================================================

    /**
     * ONB-004: Get onboarding tracker view for new hire
     * Groups tasks by status and department for easy tracking
     */
    async getOnboardingTracker(employeeId: string): Promise<{
        employeeId: string;
        onboardingId: string;
        isComplete: boolean;
        completedAt?: Date;
        summary: {
            totalTasks: number;
            completedTasks: number;
            inProgressTasks: number;
            pendingTasks: number;
            overdueTasks: number;
            progressPercentage: number;
        };
        tasksByStatus: {
            completed: any[];
            inProgress: any[];
            pending: any[];
            overdue: any[];
        };
        tasksByDepartment: {
            [department: string]: {
                total: number;
                completed: number;
                tasks: any[];
            };
        };
        nextTask?: {
            name: string;
            department: string;
            deadline?: Date;
            notes?: string;
        };
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .populate('tasks.documentId')
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        const now = new Date();
        const tasks = onboarding.tasks;

        // Categorize tasks by status
        const completed = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED);
        const inProgress = tasks.filter(t => t.status === OnboardingTaskStatus.IN_PROGRESS);
        const pendingAll = tasks.filter(t => t.status === OnboardingTaskStatus.PENDING);
        const overdue = pendingAll.filter(t => t.deadline && new Date(t.deadline) < now);
        const pending = pendingAll.filter(t => !t.deadline || new Date(t.deadline) >= now);

        // Group tasks by department
        const tasksByDepartment: { [dept: string]: { total: number; completed: number; tasks: any[] } } = {};
        for (const task of tasks) {
            const dept = task.department || 'General';
            if (!tasksByDepartment[dept]) {
                tasksByDepartment[dept] = { total: 0, completed: 0, tasks: [] };
            }
            tasksByDepartment[dept].total++;
            if (task.status === OnboardingTaskStatus.COMPLETED) {
                tasksByDepartment[dept].completed++;
            }
            tasksByDepartment[dept].tasks.push(task);
        }

        // Determine next task to complete (prioritize overdue, then by deadline)
        const incompleteTasks = [...overdue, ...inProgress, ...pending];
        incompleteTasks.sort((a, b) => {
            if (a.deadline && b.deadline) {
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });

        const nextTask = incompleteTasks[0] ? {
            name: incompleteTasks[0].name,
            department: incompleteTasks[0].department,
            deadline: incompleteTasks[0].deadline,
            notes: incompleteTasks[0].notes,
        } : undefined;

        return {
            employeeId,
            onboardingId: onboarding._id.toString(),
            isComplete: onboarding.completed,
            completedAt: onboarding.completedAt,
            summary: {
                totalTasks: tasks.length,
                completedTasks: completed.length,
                inProgressTasks: inProgress.length,
                pendingTasks: pending.length,
                overdueTasks: overdue.length,
                progressPercentage: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
            },
            tasksByStatus: {
                completed,
                inProgress,
                pending,
                overdue,
            },
            tasksByDepartment,
            nextTask,
        };
    }

    /**
     * ONB-004: New hire marks task as started (in_progress)
     */
    async startTask(employeeId: string, taskName: string): Promise<Onboarding> {
        this.validateObjectId(employeeId, 'employeeId');

        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Onboarding is already completed');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);
        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found`);
        }

        if (this.isTaskStatus(onboarding.tasks[taskIndex].status, OnboardingTaskStatus.COMPLETED)) {
            throw new BadRequestException('Task is already completed');
        }

        // Normalize all task statuses to fix uppercase values from DB
        this.normalizeAllTaskStatuses(onboarding);

        onboarding.tasks[taskIndex].status = OnboardingTaskStatus.IN_PROGRESS;

        return onboarding.save();
    }

    /**
     * ONB-004: New hire marks task as completed
     */
    async completeTask(employeeId: string, taskName: string, documentId?: string): Promise<Onboarding> {
        this.validateObjectId(employeeId, 'employeeId');

        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Onboarding is already completed');
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);
        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found`);
        }

        if (this.isTaskStatus(onboarding.tasks[taskIndex].status, OnboardingTaskStatus.COMPLETED)) {
            throw new BadRequestException('Task is already completed');
        }

        // Normalize all task statuses to fix uppercase values from DB
        this.normalizeAllTaskStatuses(onboarding);

        onboarding.tasks[taskIndex].status = OnboardingTaskStatus.COMPLETED;
        onboarding.tasks[taskIndex].completedAt = new Date();

        if (documentId) {
            this.validateObjectId(documentId, 'documentId');
            onboarding.tasks[taskIndex].documentId = new Types.ObjectId(documentId);
        }

        // Check if all tasks are completed
        const allCompleted = onboarding.tasks.every(t => this.isTaskStatus(t.status, OnboardingTaskStatus.COMPLETED));
        if (allCompleted) {
            onboarding.completed = true;
            onboarding.completedAt = new Date();

            // Notify HR that onboarding is complete
            await this.sharedRecruitmentService.notifyHRUsers(
                'ONBOARDING_COMPLETED',
                `Employee ${employeeId} has completed all onboarding tasks.`,
            );
        }

        return onboarding.save();
    }

    // ============================================================
    // ONB-005: Reminders and Notifications
    // BR 12: Send reminders and track delivery status
    // ============================================================

    /**
     * ONB-005: Get pending tasks without auto-sending reminders
     * Use sendTaskReminders() separately for controlled reminder sending
     */
    async getPendingTasksWithoutReminders(employeeId: string): Promise<{
        employeeId: string;
        pendingTasks: any[];
        inProgressTasks: any[];
        overdueTasks: any[];
        upcomingDeadlines: any[];
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const pendingTasks = onboarding.tasks.filter(
            t => t.status === OnboardingTaskStatus.PENDING
        );

        const inProgressTasks = onboarding.tasks.filter(
            t => t.status === OnboardingTaskStatus.IN_PROGRESS
        );

        const overdueTasks = [...pendingTasks, ...inProgressTasks].filter(
            t => t.deadline && new Date(t.deadline) < now
        );

        // Tasks with deadline within next 3 days
        const upcomingDeadlines = [...pendingTasks, ...inProgressTasks].filter(
            t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= threeDaysFromNow
        );

        return {
            employeeId,
            pendingTasks,
            inProgressTasks,
            overdueTasks,
            upcomingDeadlines,
        };
    }

    /**
     * ONB-005: Send reminders for specific employee's pending tasks
     * This is a controlled method - call it when you want to send reminders
     */
    async sendTaskReminders(employeeId: string): Promise<{
        employeeId: string;
        remindersSent: number;
        overdueRemindersSent: number;
        tasks: { taskName: string; isOverdue: boolean; reminderSent: boolean }[];
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const { pendingTasks, inProgressTasks, overdueTasks } = await this.getPendingTasksWithoutReminders(employeeId);

        const allIncompleteTasks = [...pendingTasks, ...inProgressTasks];
        const results: { taskName: string; isOverdue: boolean; reminderSent: boolean }[] = [];
        let remindersSent = 0;
        let overdueRemindersSent = 0;

        for (const task of allIncompleteTasks) {
            const isOverdue = overdueTasks.some(t => t.name === task.name);

            try {
                await this.sharedRecruitmentService.sendOnboardingTaskReminder({
                    employeeId,
                    taskName: task.name,
                    deadline: task.deadline,
                    isOverdue,
                });

                results.push({ taskName: task.name, isOverdue, reminderSent: true });
                remindersSent++;
                if (isOverdue) overdueRemindersSent++;
            } catch (error) {
                this.logger.warn(`Failed to send reminder for task ${task.name}: ${error.message}`);
                results.push({ taskName: task.name, isOverdue, reminderSent: false });
            }
        }

        return {
            employeeId,
            remindersSent,
            overdueRemindersSent,
            tasks: results,
        };
    }

    /**
     * ONB-005: Send reminders for all employees with pending/overdue tasks
     * Useful for scheduled batch reminders
     */
    async sendBatchReminders(): Promise<{
        totalEmployees: number;
        totalRemindersSent: number;
        results: { employeeId: string; remindersSent: number }[];
    }> {
        const onboardings = await this.onboardingModel
            .find({ completed: false })
            .exec();

        const results: { employeeId: string; remindersSent: number }[] = [];
        let totalRemindersSent = 0;

        for (const onboarding of onboardings) {
            try {
                const result = await this.sendTaskReminders(onboarding.employeeId.toString());
                results.push({
                    employeeId: onboarding.employeeId.toString(),
                    remindersSent: result.remindersSent,
                });
                totalRemindersSent += result.remindersSent;
            } catch (error) {
                this.logger.warn(`Failed to send reminders for employee ${onboarding.employeeId}: ${error.message}`);
                results.push({
                    employeeId: onboarding.employeeId.toString(),
                    remindersSent: 0,
                });
            }
        }

        return {
            totalEmployees: onboardings.length,
            totalRemindersSent,
            results,
        };
    }

    // ============================================================
    // ONB-007: Document Upload & Verification
    // BR 7: Documents must be collected and verified by HR before first working day
    // ============================================================

    /**
     * ONB-007: Upload document for new hire with task linking
     */
    async uploadNewHireDocument(
        employeeId: string,
        dto: UploadDocumentDto,
        taskName?: string,
    ): Promise<{
        document: Document;
        linkedToTask: boolean;
        taskName?: string;
        verificationStatus: string;
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        // Validate employee exists
        await this.sharedRecruitmentService.validateEmployeeExists(employeeId);

        // Set owner to employee
        dto.ownerId = employeeId;

        // Upload document
        const document = await this.uploadDocument(dto);

        let linkedToTask = false;

        // If taskName provided, link document to task
        if (taskName) {
            const onboarding = await this.onboardingModel
                .findOne({ employeeId: new Types.ObjectId(employeeId) })
                .exec();

            if (onboarding) {
                const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);
                if (taskIndex !== -1) {
                    onboarding.tasks[taskIndex].documentId = new Types.ObjectId((document as any)._id);
                    this.normalizeAllTaskStatuses(onboarding);
                    await onboarding.save();
                    linkedToTask = true;
                }
            }
        }

        // Notify HR for verification
        await this.sharedRecruitmentService.notifyHRUsers(
            'DOCUMENT_PENDING_VERIFICATION',
            `New hire document uploaded: ${dto.type}. Please verify before employee's first working day.`,
        );

        return {
            document,
            linkedToTask,
            taskName: linkedToTask ? taskName : undefined,
            verificationStatus: 'pending_verification',
        };
    }

    /**
     * ONB-007: Get all documents for new hire with verification status
     */
    async getNewHireDocuments(employeeId: string): Promise<{
        employeeId: string;
        documents: {
            id: string;
            type: DocumentType;
            filePath: string;
            uploadedAt: Date;
            linkedToTask?: string;
        }[];
        requiredDocuments: {
            type: DocumentType;
            isUploaded: boolean;
        }[];
        allRequiredUploaded: boolean;
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        await this.sharedRecruitmentService.validateEmployeeExists(employeeId);

        const documents = await this.documentModel
            .find({ ownerId: new Types.ObjectId(employeeId) })
            .sort({ uploadedAt: -1 })
            .exec();

        // Check onboarding tasks for linked documents
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        const documentTaskMap = new Map<string, string>();
        if (onboarding) {
            for (const task of onboarding.tasks) {
                if (task.documentId) {
                    documentTaskMap.set(task.documentId.toString(), task.name);
                }
            }
        }

        const uploadedTypes = new Set(documents.map(d => d.type));
        const requiredDocuments = this.REQUIRED_ONBOARDING_DOCUMENTS.map(type => ({
            type,
            isUploaded: uploadedTypes.has(type),
        }));

        return {
            employeeId,
            documents: documents.map(doc => ({
                id: doc._id.toString(),
                type: doc.type,
                filePath: doc.filePath,
                uploadedAt: doc.uploadedAt,
                linkedToTask: documentTaskMap.get(doc._id.toString()),
            })),
            requiredDocuments,
            allRequiredUploaded: this.REQUIRED_ONBOARDING_DOCUMENTS.every(type => uploadedTypes.has(type)),
        };
    }

    async getPendingTasks(employeeId: string): Promise<{
        employeeId: string;
        pendingTasks: any[];
        overdueTasks: any[];
    }> {
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(employeeId) })
            .exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding not found for employee ${employeeId}`);
        }

        const now = new Date();
        const pendingTasks = onboarding.tasks.filter(
            t => t.status === OnboardingTaskStatus.PENDING || t.status === OnboardingTaskStatus.IN_PROGRESS
        );

        const overdueTasks = pendingTasks.filter(t => t.deadline && new Date(t.deadline) < now);

        for (const task of pendingTasks) {
            const isOverdue = task.deadline && new Date(task.deadline) < now;
            await this.sharedRecruitmentService.sendOnboardingTaskReminder({
                employeeId,
                taskName: task.name,
                deadline: task.deadline,
                isOverdue,
            });
        }

        return { employeeId, pendingTasks, overdueTasks };
    }

    async uploadDocument(dto: UploadDocumentDto): Promise<Document> {
        // Try to validate as employee first, then as candidate
        let isCandidate = false;
        try {
            await this.sharedRecruitmentService.validateEmployeeExists(dto.ownerId);
        } catch {
            await this.sharedRecruitmentService.validateCandidateExists(dto.ownerId);
            isCandidate = true;
        }

        // For candidates uploading CONTRACT document, validate offer is accepted
        if (isCandidate && dto.type === DocumentType.CONTRACT) {
            const offer = await this.offerModel.findOne({
                candidateId: new Types.ObjectId(dto.ownerId),
            }).sort({ createdAt: -1 }).exec();

            if (!offer) {
                throw new BadRequestException('No offer found for this candidate. Cannot upload contract document.');
            }

            if (offer.applicantResponse !== OfferResponseStatus.ACCEPTED) {
                throw new BadRequestException(
                    'Offer must be accepted before uploading contract document. ' +
                    `Current offer status: ${offer.applicantResponse || 'pending'}`
                );
            }
        }

        const document = new this.documentModel({
            ownerId: new Types.ObjectId(dto.ownerId),
            type: dto.type,
            filePath: dto.filePath,
            uploadedAt: new Date(),
        });

        const savedDoc = await document.save();

        await this.sharedRecruitmentService.notifyDocumentUploaded({
            ownerId: dto.ownerId,
            ownerName: dto.ownerId,
            documentType: dto.type,
        });

        return savedDoc;
    }

    async getDocumentsByOwner(ownerId: string): Promise<Document[]> {
        return this.documentModel
            .find({ ownerId: new Types.ObjectId(ownerId) })
            .sort({ uploadedAt: -1 })
            .exec();
    }

    async linkDocumentToTask(onboardingId: string, taskName: string, documentId: string): Promise<Onboarding> {
        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        const taskIndex = onboarding.tasks.findIndex(t => t.name === taskName);

        if (taskIndex === -1) {
            throw new NotFoundException(`Task "${taskName}" not found`);
        }

        onboarding.tasks[taskIndex].documentId = new Types.ObjectId(documentId);

        // Normalize all task statuses before saving (fix uppercase values from DB)
        this.normalizeAllTaskStatuses(onboarding);

        return onboarding.save();
    }

    // ============================================================
    // ONB-009: Provision System Access
    // BR 9(b): Auto IT tasks for email, laptop, system access
    // ============================================================

    /**
     * ONB-009: Provision system access for new hire
     * System Admin provisions payroll, email, SSO, and internal systems
     * Also updates the IT provisioning task in onboarding checklist
     */
    async provisionSystemAccess(dto: ProvisionAccessDto): Promise<{
        success: boolean;
        employeeId: string;
        provisioning: {
            email: boolean;
            sso: boolean;
            internalSystems: boolean;
            payrollAccess: boolean;
        };
        onboardingTaskUpdated: boolean;
        message: string;
        provisionedAt: Date;
    }> {
        this.validateObjectId(dto.employeeId, 'employeeId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // Find onboarding to update IT task
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(dto.employeeId) })
            .exec();

        let onboardingTaskUpdated = false;

        if (onboarding && !onboarding.completed) {
            // Find and update IT provisioning task
            const itTaskIndex = onboarding.tasks.findIndex(
                t => t.department === 'IT' ||
                     t.name.toLowerCase().includes('system access') ||
                     t.name.toLowerCase().includes('provision')
            );

            if (itTaskIndex !== -1 && onboarding.tasks[itTaskIndex].status !== OnboardingTaskStatus.COMPLETED) {
                onboarding.tasks[itTaskIndex].status = OnboardingTaskStatus.COMPLETED;
                onboarding.tasks[itTaskIndex].completedAt = new Date();
                onboarding.tasks[itTaskIndex].notes =
                    `${onboarding.tasks[itTaskIndex].notes || ''} | Provisioned by System Admin on ${new Date().toISOString()}`.trim();

                // Normalize all task statuses before saving (fix uppercase values from DB)
                this.normalizeAllTaskStatuses(onboarding);
                await onboarding.save();
                onboardingTaskUpdated = true;

                // Check if all tasks completed (use isTaskStatus for case-insensitive comparison)
                const allCompleted = onboarding.tasks.every(t => this.isTaskStatus(t.status, OnboardingTaskStatus.COMPLETED));
                if (allCompleted) {
                    onboarding.completed = true;
                    onboarding.completedAt = new Date();
                    await onboarding.save();
                }
            }
        }

        // Notify employee and relevant parties
        await this.sharedRecruitmentService.notifySystemAccessProvisioned({
            employeeId: dto.employeeId,
            employeeName,
            workEmail: employee.workEmail || '',
        });

        // Notify the employee directly
        await this.sharedRecruitmentService.createNotification(
            dto.employeeId,
            'SYSTEM_ACCESS_READY',
            `Your system access has been provisioned. Email: ${employee.workEmail}. SSO and internal systems are now active.`,
        );

        return {
            success: true,
            employeeId: dto.employeeId,
            provisioning: {
                email: true,
                sso: true,
                internalSystems: true,
                payrollAccess: true,
            },
            onboardingTaskUpdated,
            message: `System access provisioned for ${employeeName}. Email, SSO, and internal systems enabled.`,
            provisionedAt: new Date(),
        };
    }

    // ============================================================
    // ONB-012: Reserve Equipment and Resources
    // BR 9(c): Auto Admin tasks for workspace, ID badge
    // ============================================================

    /**
     * ONB-012: Get list of employees pending equipment reservation
     * Useful for HR Employee to see who needs resources reserved
     */
    async getEmployeesPendingEquipment(): Promise<{
        total: number;
        employees: {
            employeeId: string;
            employeeName: string;
            workEmail?: string;
            onboardingId: string;
            startDate?: Date;
            adminTaskStatus: string;
            adminTaskName?: string;
        }[];
    }> {
        // Find all incomplete onboardings
        const onboardings = await this.onboardingModel
            .find({ completed: false })
            .exec();

        const employees: {
            employeeId: string;
            employeeName: string;
            workEmail?: string;
            onboardingId: string;
            startDate?: Date;
            adminTaskStatus: string;
            adminTaskName?: string;
        }[] = [];

        for (const onboarding of onboardings) {
            // Find Admin/Equipment task
            const adminTask = onboarding.tasks.find(
                t => t.department === 'Admin' ||
                     t.department === 'Facilities' ||
                     t.name.toLowerCase().includes('equipment') ||
                     t.name.toLowerCase().includes('workspace')
            );

            // Only include if Admin task exists and is not completed
            if (adminTask && adminTask.status !== OnboardingTaskStatus.COMPLETED) {
                try {
                    const employee = await this.sharedRecruitmentService.validateEmployeeExists(
                        onboarding.employeeId.toString()
                    );

                    // Get contract for start date
                    const contract = await this.contractModel.findById(onboarding.contractId).exec();

                    employees.push({
                        employeeId: onboarding.employeeId.toString(),
                        employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                        workEmail: employee.workEmail,
                        onboardingId: onboarding._id.toString(),
                        startDate: contract?.acceptanceDate,
                        adminTaskStatus: adminTask.status,
                        adminTaskName: adminTask.name,
                    });
                } catch (error) {
                    this.logger.warn(`Failed to get employee details for ${onboarding.employeeId}: ${error.message}`);
                }
            }
        }

        // Sort by start date (earliest first)
        employees.sort((a, b) => {
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        return {
            total: employees.length,
            employees,
        };
    }

    /**
     * ONB-012: Reserve equipment and resources for new hire
     * Also updates the Admin/Equipment task in onboarding checklist
     */
    async reserveEquipment(dto: ReserveEquipmentDto): Promise<{
        success: boolean;
        employeeId: string;
        reservedItems: {
            equipment?: string[];
            deskNumber?: string;
            accessCardNumber?: string;
        };
        onboardingTaskUpdated: boolean;
        message: string;
    }> {
        this.validateObjectId(dto.employeeId, 'employeeId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // Find onboarding to update Admin task
        const onboarding = await this.onboardingModel
            .findOne({ employeeId: new Types.ObjectId(dto.employeeId) })
            .exec();

        let onboardingTaskUpdated = false;

        if (onboarding && !onboarding.completed) {
            // Find and update Admin/Equipment task
            const adminTaskIndex = onboarding.tasks.findIndex(
                t => t.department === 'Admin' ||
                     t.department === 'Facilities' ||
                     t.name.toLowerCase().includes('equipment') ||
                     t.name.toLowerCase().includes('workspace')
            );

            // Normalize all task statuses before any comparison or update
            this.normalizeAllTaskStatuses(onboarding);

            if (adminTaskIndex !== -1 && !this.isTaskStatus(onboarding.tasks[adminTaskIndex].status, OnboardingTaskStatus.COMPLETED)) {
                onboarding.tasks[adminTaskIndex].status = OnboardingTaskStatus.COMPLETED;
                onboarding.tasks[adminTaskIndex].completedAt = new Date();

                const reservedDetails: string[] = [];
                if (dto.equipment?.length) reservedDetails.push(`Equipment: ${dto.equipment.join(', ')}`);
                if (dto.deskNumber) reservedDetails.push(`Desk: ${dto.deskNumber}`);
                if (dto.accessCardNumber) reservedDetails.push(`Access Card: ${dto.accessCardNumber}`);

                onboarding.tasks[adminTaskIndex].notes =
                    `${onboarding.tasks[adminTaskIndex].notes || ''} | Reserved: ${reservedDetails.join('; ')}`.trim();

                await onboarding.save();
                onboardingTaskUpdated = true;

                // Check if all tasks completed
                const allCompleted = onboarding.tasks.every(t => this.isTaskStatus(t.status, OnboardingTaskStatus.COMPLETED));
                if (allCompleted) {
                    onboarding.completed = true;
                    onboarding.completedAt = new Date();
                    await onboarding.save();
                }
            }
        }

        await this.sharedRecruitmentService.notifyEquipmentReserved({
            employeeId: dto.employeeId,
            employeeName,
            equipment: dto.equipment,
            deskNumber: dto.deskNumber,
            accessCardNumber: dto.accessCardNumber,
        });

        return {
            success: true,
            employeeId: dto.employeeId,
            reservedItems: {
                equipment: dto.equipment,
                deskNumber: dto.deskNumber,
                accessCardNumber: dto.accessCardNumber,
            },
            onboardingTaskUpdated,
            message: 'Equipment and resources reserved successfully. All items will be ready on Day 1.',
        };
    }

    // ============================================================
    // ONB-013: Schedule Access Revocation
    // BR 9(b): IT allocation automated, BR 20: Support onboarding cancellation
    // ============================================================

    /**
     * ONB-013: Schedule automated access provisioning and revocation
     * Provisioning on start date, revocation on exit date or termination
     * Links to Offboarding (OFF-007) for security control
     */
    async scheduleAccessRevocation(dto: ScheduleAccessRevocationDto): Promise<{
        success: boolean;
        employeeId: string;
        scheduling: {
            revocationDate?: string;
            autoRevokeOnTermination: boolean;
        };
        message: string;
    }> {
        this.validateObjectId(dto.employeeId, 'employeeId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // Notify IT about scheduled revocation
        await this.sharedRecruitmentService.notifyAccessRevocationScheduled({
            employeeId: dto.employeeId,
            employeeName,
            revocationDate: dto.revocationDate || 'On termination',
        });

        // Notify the employee
        const revocationMessage = dto.revocationDate
            ? `Your system access is scheduled for revocation on ${dto.revocationDate}.`
            : 'Your system access will be revoked upon termination/exit.';

        await this.sharedRecruitmentService.createNotification(
            dto.employeeId,
            'ACCESS_REVOCATION_SCHEDULED',
            revocationMessage,
        );

        return {
            success: true,
            employeeId: dto.employeeId,
            scheduling: {
                revocationDate: dto.revocationDate,
                autoRevokeOnTermination: !dto.revocationDate, // If no date specified, auto-revoke on termination
            },
            message: dto.revocationDate
                ? `Access revocation scheduled for ${dto.revocationDate}. Will be auto-executed.`
                : 'Access revocation scheduled for termination. Will be auto-executed on employee exit.',
        };
    }

    /**
     * REQ-PY-23: Trigger payroll initiation for new hire
     * Creates employee payroll details entry with pro-rated salary
     */
    async triggerPayrollInitiation(dto: TriggerPayrollInitiationDto): Promise<{
        success: boolean;
        contractId: string;
        message: string;
        triggeredAt: Date;
        payrollDetails?: {
            employeeId: string;
            baseSalary: number;
            proRatedSalary: number;
            startDate: Date;
            payrollRunId?: string;
        };
    }> {
        const contract = await this.contractModel.findById(dto.contractId).exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        // Find the onboarding record to get the employeeId
        const onboarding = await this.onboardingModel.findOne({
            contractId: new Types.ObjectId(dto.contractId)
        }).exec();

        if (!onboarding) {
            throw new BadRequestException('No onboarding record found for this contract. Please create onboarding first.');
        }

        const employeeId = onboarding.employeeId.toString();

        // Calculate pro-rated salary for current pay cycle
        const startDate = contract.acceptanceDate || new Date();
        const currentMonth = new Date();
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const startDay = new Date(startDate).getDate();
        const remainingDays = Math.max(1, daysInMonth - startDay + 1);
        const dailyRate = contract.grossSalary / daysInMonth;
        const proRatedSalary = Math.round(dailyRate * remainingDays * 100) / 100;

        let payrollRunId: string | undefined;

        try {
            // Find current active payroll run (draft or pending)
            const activePayrollRun = await this.payrollRunsModel.findOne({
                status: { $in: ['draft', 'under review', 'pending finance approval'] }
            }).sort({ payrollPeriod: -1 }).exec();

            if (activePayrollRun) {
                // Check if employee already has payroll details for this run
                const existingDetails = await this.employeePayrollDetailsModel.findOne({
                    employeeId: new Types.ObjectId(employeeId),
                    payrollRunId: activePayrollRun._id
                }).exec();

                if (!existingDetails) {
                    // Create employee payroll details entry
                    await this.employeePayrollDetailsModel.create({
                        employeeId: new Types.ObjectId(employeeId),
                        baseSalary: contract.grossSalary,
                        allowances: 0,
                        deductions: 0,
                        netSalary: proRatedSalary,
                        netPay: proRatedSalary,
                        bankStatus: BankStatus.MISSING,
                        exceptions: 'New hire - pro-rated salary for partial month',
                        bonus: 0,
                        benefit: 0,
                        payrollRunId: activePayrollRun._id
                    });

                    this.logger.log(`Payroll details created for employee ${employeeId} in run ${activePayrollRun.runId}`);
                } else {
                    this.logger.log(`Payroll details already exist for employee ${employeeId}`);
                }

                payrollRunId = activePayrollRun._id.toString();
            } else {
                this.logger.warn(`No active payroll run found. Employee ${employeeId} will be added to next cycle.`);
            }
        } catch (err) {
            this.logger.error(`Failed to create payroll details: ${err.message}`);
            throw new BadRequestException(`Failed to create payroll details: ${err.message}`);
        }

        return {
            success: true,
            contractId: dto.contractId,
            message: payrollRunId
                ? 'Payroll initiation triggered successfully. Employee added to current payroll cycle.'
                : 'Payroll initiation triggered. Employee will be added to next payroll cycle.',
            triggeredAt: new Date(),
            payrollDetails: {
                employeeId,
                baseSalary: contract.grossSalary,
                proRatedSalary,
                startDate: new Date(startDate),
                payrollRunId
            }
        };
    }

    /**
     * REQ-PY-27: Process signing bonus for new hire
     * BR 28: Signing bonus disbursed only once
     */
    async processSigningBonus(contractId: string): Promise<{
        success: boolean;
        contractId: string;
        bonusAmount: number;
        message: string;
        bonusDetails?: {
            bonusRecordId: string;
            employeeId: string;
            signingBonusConfigId: string;
            scheduledPaymentDate?: Date;
            status: string;
        };
    }> {
        const contract = await this.contractModel.findById(contractId).exec();

        if (!contract) {
            throw new NotFoundException(`Contract with ID ${contractId} not found`);
        }

        if (!contract.signingBonus || contract.signingBonus === 0) {
            throw new BadRequestException('No signing bonus specified in contract');
        }

        // Find the onboarding record to get the employeeId
        const onboarding = await this.onboardingModel.findOne({
            contractId: new Types.ObjectId(contractId)
        }).exec();

        if (!onboarding) {
            throw new BadRequestException('No onboarding record found for this contract. Please create onboarding first.');
        }

        const employeeId = onboarding.employeeId.toString();

        // BR 28: Check if signing bonus already exists for this employee (disbursed only once)
        const existingBonus = await this.employeeSigningBonusModel.findOne({
            employeeId: new Types.ObjectId(employeeId)
        }).exec();

        if (existingBonus) {
            return {
                success: true,
                contractId,
                bonusAmount: existingBonus.givenAmount,
                message: 'Signing bonus already processed for this employee (BR 28: disbursed only once).',
                bonusDetails: {
                    bonusRecordId: existingBonus._id.toString(),
                    employeeId,
                    signingBonusConfigId: existingBonus.signingBonusId?.toString() || '',
                    scheduledPaymentDate: existingBonus.paymentDate,
                    status: existingBonus.status
                }
            };
        }

        // Find or create signing bonus configuration based on role/position
        let signingBonusConfig = await this.signingBonusModel.findOne({
            positionName: contract.role || 'Unknown',
            amount: contract.signingBonus
        }).exec();

        if (!signingBonusConfig) {
            // Create new signing bonus configuration
            signingBonusConfig = await this.signingBonusModel.create({
                positionName: contract.role || 'Unknown',
                amount: contract.signingBonus,
                status: ConfigStatus.APPROVED
            });
            this.logger.log(`Created signing bonus config for position ${contract.role}: ${contract.signingBonus}`);
        }

        // Schedule payment for first paycheck (first of next month)
        const paymentDate = new Date();
        paymentDate.setMonth(paymentDate.getMonth() + 1);
        paymentDate.setDate(1);

        // Create employee signing bonus record
        const bonusRecord = await this.employeeSigningBonusModel.create({
            employeeId: new Types.ObjectId(employeeId),
            signingBonusId: signingBonusConfig._id,
            givenAmount: contract.signingBonus,
            paymentDate: paymentDate,
            status: BonusStatus.PENDING
        });

        this.logger.log(`Signing bonus record created for employee ${employeeId}: ${contract.signingBonus}`);

        return {
            success: true,
            contractId,
            bonusAmount: contract.signingBonus,
            message: `Signing bonus of ${contract.signingBonus} scheduled for processing.`,
            bonusDetails: {
                bonusRecordId: bonusRecord._id.toString(),
                employeeId,
                signingBonusConfigId: signingBonusConfig._id.toString(),
                scheduledPaymentDate: paymentDate,
                status: BonusStatus.PENDING
            }
        };
    }

    // ============================================================
    // BR 20: Onboarding Cancellation / No-Show
    // System allows onboarding cancellation/termination in case of no-show
    // ============================================================

    /**
     * Cancel onboarding and terminate employee profile (No-Show)
     * BR 20: Triggers immediate access revocation and profile deactivation
     * Also cleans up payroll details and signing bonus records
     */
    async cancelOnboarding(onboardingId: string, dto: CancelOnboardingDto): Promise<{
        success: boolean;
        onboardingId: string;
        employeeId: string;
        accessRevoked: boolean;
        profileDeactivated: boolean;
        payrollCleanedUp: boolean;
        message: string;
        cancelledAt: Date;
    }> {
        this.validateObjectId(onboardingId, 'onboardingId');

        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        if (onboarding.completed) {
            throw new BadRequestException('Cannot cancel completed onboarding. Use offboarding process instead.');
        }

        const employeeId = onboarding.employeeId.toString();
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // BR 20: Immediately revoke all system access
        await this.sharedRecruitmentService.notifyITAdmins(
            'IMMEDIATE_ACCESS_REVOCATION',
            `URGENT: Revoke all system access for ${employeeName} (${employee.workEmail || employeeId}). ` +
            `Reason: Onboarding cancelled - ${dto.reason}`,
        );

        // Clean up payroll records created during onboarding
        let payrollCleanedUp = false;
        try {
            // Remove employee payroll details (if any)
            const deletedPayroll = await this.employeePayrollDetailsModel.deleteMany({
                employeeId: new Types.ObjectId(employeeId)
            }).exec();

            // Remove employee signing bonus records (if any)
            const deletedBonus = await this.employeeSigningBonusModel.deleteMany({
                employeeId: new Types.ObjectId(employeeId)
            }).exec();

            if (deletedPayroll.deletedCount > 0 || deletedBonus.deletedCount > 0) {
                payrollCleanedUp = true;
                this.logger.log(`Cleaned up payroll records for cancelled employee ${employeeId}: ${deletedPayroll.deletedCount} payroll details, ${deletedBonus.deletedCount} signing bonuses`);
            }
        } catch (error) {
            this.logger.warn(`Failed to clean up payroll records for employee ${employeeId}: ${error.message}`);
        }

        // Deactivate employee profile
        await this.sharedRecruitmentService.deactivateEmployee(employeeId, dto.reason);

        // Notify HR about cancellation
        await this.sharedRecruitmentService.notifyOnboardingCancelled({
            employeeId,
            employeeName,
            reason: dto.reason,
        });

        // Delete onboarding record
        await this.onboardingModel.findByIdAndDelete(onboardingId).exec();

        this.logger.log(`Onboarding cancelled for employee ${employeeId}: ${dto.reason}`);

        return {
            success: true,
            onboardingId,
            employeeId,
            accessRevoked: true,
            profileDeactivated: true,
            payrollCleanedUp,
            message: `Onboarding cancelled due to: ${dto.reason}. Employee profile terminated and all access revoked.`,
            cancelledAt: new Date(),
        };
    }

    /**
     * Get list of employees pending access provisioning
     * Useful for System Admin to see who needs access setup
     */
    async getEmployeesPendingProvisioning(): Promise<{
        total: number;
        employees: {
            employeeId: string;
            employeeName: string;
            workEmail?: string;
            onboardingId: string;
            startDate?: Date;
            itTaskStatus: string;
        }[];
    }> {
        // Find all incomplete onboardings
        const onboardings = await this.onboardingModel
            .find({ completed: false })
            .exec();

        const employees: {
            employeeId: string;
            employeeName: string;
            workEmail?: string;
            onboardingId: string;
            startDate?: Date;
            itTaskStatus: string;
        }[] = [];

        for (const onboarding of onboardings) {
            // Find IT task
            const itTask = onboarding.tasks.find(
                t => t.department === 'IT' ||
                     t.name.toLowerCase().includes('system access') ||
                     t.name.toLowerCase().includes('provision')
            );

            // Only include if IT task exists and is not completed
            if (itTask && itTask.status !== OnboardingTaskStatus.COMPLETED) {
                try {
                    const employee = await this.sharedRecruitmentService.validateEmployeeExists(
                        onboarding.employeeId.toString()
                    );

                    // Get contract for start date
                    const contract = await this.contractModel.findById(onboarding.contractId).exec();

                    employees.push({
                        employeeId: onboarding.employeeId.toString(),
                        employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                        workEmail: employee.workEmail,
                        onboardingId: onboarding._id.toString(),
                        startDate: contract?.acceptanceDate,
                        itTaskStatus: itTask.status,
                    });
                } catch (error) {
                    this.logger.warn(`Failed to get employee details for ${onboarding.employeeId}: ${error.message}`);
                }
            }
        }

        // Sort by start date (earliest first)
        employees.sort((a, b) => {
            if (!a.startDate) return 1;
            if (!b.startDate) return -1;
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        });

        return {
            total: employees.length,
            employees,
        };
    }

    async getOnboardingProgress(onboardingId: string): Promise<{
        onboardingId: string;
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        inProgressTasks: number;
        progressPercentage: number;
        isComplete: boolean;
    }> {
        const onboarding = await this.onboardingModel.findById(onboardingId).exec();

        if (!onboarding) {
            throw new NotFoundException(`Onboarding with ID ${onboardingId} not found`);
        }

        const totalTasks = onboarding.tasks.length;
        const completedTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
        const pendingTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.PENDING).length;
        const inProgressTasks = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.IN_PROGRESS).length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            onboardingId,
            totalTasks,
            completedTasks,
            pendingTasks,
            inProgressTasks,
            progressPercentage,
            isComplete: onboarding.completed,
        };
    }
}

