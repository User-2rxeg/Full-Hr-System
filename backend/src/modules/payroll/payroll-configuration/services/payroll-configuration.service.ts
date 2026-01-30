import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { EmployeeProfile } from '../../../employee/models/employee/employee-profile.schema';
import { taxRules, taxRulesDocument } from '../models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsDocument } from '../models/insuranceBrackets.schema';
import { ConfigStatus } from '../enums/payroll-configuration-enums';
import { ApproveInsuranceDto } from '../dto/approve-insurance.dto';
import { ApproveTaxRuleDto } from '../dto/approve-tax-rule.dto';
import { CreateInsuranceDto } from '../dto/create-insurance.dto';
import { UpdateInsuranceDto } from '../dto/update-insurance.dto';
import { UpdateTaxRuleDto } from '../dto/update-tax-rule.dto';
import { CreateTaxRuleDto } from '../dto/create-tax-rule.dto';
import { allowance, allowanceDocument } from '../models/allowance.schema';
import { payType, payTypeDocument } from '../models/payType.schema';
import { payGrade } from '../models/payGrades.schema';
import { payrollPolicies, payrollPoliciesDocument } from '../models/payrollPolicies.schema';
import { signingBonus, signingBonusDocument } from '../models/signingBonus.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from '../models/terminationAndResignationBenefits';
import { CompanyWideSettings } from '../models/CompanyWideSettings.schema';
import { UpdateCompanyWideSettingsDto } from '../dto/update-company-settings.dto';
import { ApproveConfigDto } from '../dto/approve-config.dto';
import { UpdateAllowanceDto } from '../dto/update-allowance.dto';
import { CreateSigningBonusDto } from '../dto/create-signing-bonus.dto';
import { QuerySigningBonusDto } from '../dto/query-signing-bonus.dto';
import { CreatePayrollPolicyDto } from '../dto/create-payroll-policy.dto';
import { QueryPayrollPolicyDto } from '../dto/query-payroll-policy.dto';
import { CreatePayTypeDto } from '../dto/create-pay-type.dto';
import { QueryPayTypeDto } from '../dto/query-pay-type.dto';
import { CreateAllowanceDto } from '../dto/create-allowance.dto';
import { QueryAllowanceDto } from '../dto/query-allowance.dto';
import { CreateTerminationBenefitDto } from '../dto/create-termination-benefit.dto';
import { QueryTerminationBenefitDto } from '../dto/query-termination-benefit.dto';
import { UpdatePayrollPolicyDto } from "../dto/update-payroll-policy.dto";
import { UpdatePayTypeDto } from "../dto/update-pay-type.dto";
import { UpdateSigningBonusDto } from "../dto/update-signing-bonus.dto";
import { UpdateTerminationBenefitDto } from "../dto/update-termination-benefit.dto";
import { CreatePayGradeDto } from "../dto/create-paygrade.dto";
import { UpdatePayGradeDto } from "../dto/update-paygrade.dto";

@Injectable()
export class PayrollConfigurationService {
    constructor(
        @InjectModel(taxRules.name) private taxRulesModel: Model<taxRulesDocument>,
        @InjectModel(insuranceBrackets.name) private insuranceModel: Model<insuranceBracketsDocument>,
        @InjectModel(allowance.name) private allowanceModel: Model<allowanceDocument>,
        @InjectModel(payType.name) private payTypeModel: Model<payTypeDocument>,
        @InjectModel(payGrade.name) private payGradeModel: Model<payGrade>,
        @InjectModel(payrollPolicies.name) private payrollPolicyModel: Model<payrollPoliciesDocument>,
        @InjectModel(signingBonus.name) private signingBonusModel: Model<signingBonusDocument>,
        @InjectModel(terminationAndResignationBenefits.name) private terminationBenefitsModel: Model<terminationAndResignationBenefitsDocument>,
        @InjectModel(CompanyWideSettings.name) private companySettingsModel: Model<CompanyWideSettings>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    ) { }

    // Ephemeral status for company-wide settings (no schema changes)
    private companySettingsStatus: 'DRAFT' | 'APPROVED' | 'REJECTED' = 'DRAFT';

    // ========== HELPER METHODS ==========
    private async validateApprover(approverId: string, creatorId?: Types.ObjectId | string): Promise<void> {
        if (!approverId || approverId.trim() === '') {
            throw new BadRequestException('approvedBy is required');
        }

        if (!Types.ObjectId.isValid(approverId)) {
            throw new BadRequestException('approvedBy must be a valid MongoDB ObjectId');
        }

        // Validate approver exists (skip strict status check - allows all employee statuses)
        const approver = await this.employeeModel.findById(approverId).exec();
        if (!approver) {
            throw new BadRequestException('Approver employee not found');
        }

        // Prevent self-approval
        if (creatorId && creatorId.toString() === approverId) {
            throw new ForbiddenException(
                'Self-approval not allowed. Configuration must be approved by a different manager.'
            );
        }
    }

    // ========== LAMA'S TAX RULES METHODS ==========
    async createTaxRule(dto: CreateTaxRuleDto) {
        const exists = await this.taxRulesModel.findOne({
            name: { $regex: new RegExp(`^${dto.name}$`, 'i') }
        }).exec();
        if (exists) throw new BadRequestException(`Tax rule '${dto.name}' already exists`);

        const taxRule = new this.taxRulesModel({
            name: dto.name,
            description: dto.description,
            rate: dto.rate,
            createdBy: dto.createdByEmployeeId,
            status: ConfigStatus.DRAFT
        });

        return await taxRule.save();
    }


    async getTaxRules() {
        return await this.taxRulesModel.find().populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').sort({ createdAt: -1 }).exec();
    }

    async getTaxRuleById(id) {
        const taxRule = await this.taxRulesModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!taxRule) throw new NotFoundException(`Tax rule with ID ${id} not found`);
        return taxRule;
    }

    async approveTaxRule(id: string, dto: ApproveTaxRuleDto) {
        const taxRule = await this.taxRulesModel.findById(id).exec();

        if (!taxRule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (taxRule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT tax rules can be approved');
        }

        await this.validateApprover(dto.approvedBy, taxRule.createdBy);

        taxRule.approvedBy = new Types.ObjectId(dto.approvedBy);
        taxRule.status = ConfigStatus.APPROVED;
        taxRule.approvedAt = new Date();

        return await taxRule.save();
    }

    // Check this method in payroll-configuration.service.ts
    async updateLegalRule(id: string, dto: UpdateTaxRuleDto) {
        const rule = await this.taxRulesModel.findById(id).exec();
        if (!rule) throw new NotFoundException('Tax rule not found');
        if (rule.status !== ConfigStatus.DRAFT)
            throw new ForbiddenException('Only DRAFT rules can be edited');

        // Check what happens with taxComponents here
        return await this.taxRulesModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true } // ensure validators run
        );
    }


    async deleteTaxRule(id: string) {
        const rule = await this.taxRulesModel.findById(id).exec();
        if (!rule) throw new NotFoundException(`Tax rule with ID ${id} not found`);

        await this.taxRulesModel.findByIdAndDelete(id).exec();
        return { message: `Tax rule '${rule.name}' successfully deleted` };
    }

    async rejectTaxRule(id: string, dto: ApproveTaxRuleDto) {
        const taxRule = await this.taxRulesModel.findById(id).exec();

        if (!taxRule) {
            throw new NotFoundException('Tax rule not found');
        }

        if (taxRule.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT tax rules can be rejected');
        }

        await this.validateApprover(dto.approvedBy, taxRule.createdBy);

        taxRule.approvedBy = new Types.ObjectId(dto.approvedBy);
        taxRule.status = ConfigStatus.REJECTED;
        taxRule.approvedAt = new Date();

        return await taxRule.save();
    }

    // ========== LAMA'S INSURANCE BRACKETS METHODS ==========
    async createInsuranceBracket(dto: CreateInsuranceDto) {
        // Case-insensitive duplicate name check
        const exists = await this.insuranceModel.findOne({
            name: { $regex: new RegExp(`^${dto.name}$`, 'i') }
        }).exec();

        if (exists) {
            throw new BadRequestException(
                `Insurance bracket '${dto.name}' already exists`
            );
        }

        // Validate salary range
        if (dto.minSalary >= dto.maxSalary) {
            throw new BadRequestException(
                'minSalary must be less than maxSalary'
            );
        }

        // Create bracket data
        const bracketData: any = {
            name: dto.name,
            minSalary: dto.minSalary,
            maxSalary: dto.maxSalary,
            employeeRate: dto.employeeRate,
            employerRate: dto.employerRate,
            status: ConfigStatus.DRAFT,
        };

        // Add createdBy if provided
        if (dto.createdByEmployeeId) {
            bracketData.createdBy = new mongoose.Types.ObjectId(dto.createdByEmployeeId);
        }

        const bracket = new this.insuranceModel(bracketData);
        return await bracket.save();
    }
    async getInsuranceBrackets() {
        return await this.insuranceModel.find().populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').sort({ createdAt: -1 }).exec();
    }

    async getInsuranceBracketById(id) {
        const bracket = await this.insuranceModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!bracket) throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
        return bracket;
    }

    async updateInsuranceBracket(id: string, dto: UpdateInsuranceDto) {
        const bracket = await this.insuranceModel.findById(id).exec();
        if (!bracket) throw new NotFoundException('Insurance bracket not found');

        if (bracket.status !== ConfigStatus.DRAFT)
            throw new ForbiddenException('Only DRAFT brackets can be edited');

        // Validate salary range if both are being updated
        if (dto.minSalary !== undefined && dto.maxSalary !== undefined) {
            if (dto.minSalary >= dto.maxSalary) {
                throw new BadRequestException('minSalary must be less than maxSalary');
            }
        } else if (dto.minSalary !== undefined && dto.minSalary >= bracket.maxSalary) {
            throw new BadRequestException('minSalary must be less than current maxSalary');
        } else if (dto.maxSalary !== undefined && dto.maxSalary <= bracket.minSalary) {
            throw new BadRequestException('maxSalary must be greater than current minSalary');
        }

        // Update the bracket
        return await this.insuranceModel.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true }
        );
    }

    async approveInsuranceBracket(id: string, dto: ApproveInsuranceDto) {
        const bracket = await this.insuranceModel.findById(id).exec();

        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT brackets can be approved');
        }

        await this.validateApprover(dto.approvedBy, bracket.createdBy);

        bracket.approvedBy = new Types.ObjectId(dto.approvedBy);
        bracket.status = ConfigStatus.APPROVED;
        bracket.approvedAt = new Date();

        return await bracket.save();
    }

    async deleteInsuranceBracket(id: string) {
        const bracket = await this.insuranceModel.findById(id).exec();
        if (!bracket) throw new NotFoundException(`Insurance bracket with ID ${id} not found`);
        if (bracket.status !== ConfigStatus.DRAFT)
            throw new ForbiddenException('Only DRAFT brackets can be deleted');

        await this.insuranceModel.findByIdAndDelete(id).exec();
        return { message: `Insurance bracket '${bracket.name}' successfully deleted` };
    }

    async rejectInsuranceBracket(id: string, dto: ApproveInsuranceDto) {
        const bracket = await this.insuranceModel.findById(id).exec();

        if (!bracket) {
            throw new NotFoundException('Insurance bracket not found');
        }

        if (bracket.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT brackets can be rejected');
        }

        await this.validateApprover(dto.approvedBy, bracket.createdBy);

        bracket.approvedBy = new Types.ObjectId(dto.approvedBy);
        bracket.status = ConfigStatus.REJECTED;
        bracket.approvedAt = new Date();

        return await bracket.save();
    }

    // ========== DAREEN'S PAYROLL POLICIES METHODS ==========
    async create(createDto: CreatePayrollPolicyDto): Promise<payrollPolicies> {
        const policyData = {
            policyName: createDto.policyName,
            policyType: createDto.policyType,
            description: createDto.description,
            effectiveDate: new Date(createDto.effectiveDate),
            ruleDefinition: createDto.ruleDefinition,
            applicability: createDto.applicability,
            status: ConfigStatus.DRAFT,
            createdBy: createDto.createdByEmployeeId
                ? new mongoose.Types.ObjectId(createDto.createdByEmployeeId)
                : undefined,
        };
        const newPolicy = new this.payrollPolicyModel(policyData);
        return await newPolicy.save();
    }

    async findAll(queryDto: QueryPayrollPolicyDto): Promise<{
        data: payrollPolicies[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 10, search, ...filters } = queryDto;
        const query: any = {};

        if (filters.policyType) query.policyType = filters.policyType;
        if (filters.status) query.status = filters.status;
        if (filters.applicability) query.applicability = filters.applicability;
        if (filters.createdByEmployeeId) query.createdBy = filters.createdByEmployeeId;

        if (search) {
            query.$or = [
                { policyName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.payrollPolicyModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec(),
            this.payrollPolicyModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<payrollPolicies> {
        const policy = await this.payrollPolicyModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!policy) {
            throw new NotFoundException(`Payroll policy with ID ${id} not found`);
        }
        return policy;
    }

    async update(id: string, updateDto: UpdatePayrollPolicyDto): Promise<payrollPolicies> {
        const policy = await this.findOne(id);

        if (policy.status !== ConfigStatus.DRAFT) {
            throw new ForbiddenException(
                `Cannot update policy with status '${policy.status}'. Only DRAFT policies can be edited.`
            );
        }

        const updateData: any = { ...updateDto };
        if (updateDto.effectiveDate) {
            updateData.effectiveDate = new Date(updateDto.effectiveDate);
        }

        const updatedPolicy = await this.payrollPolicyModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .exec();
        return updatedPolicy as payrollPolicies;
    }

    async remove(id: string): Promise<{ message: string }> {
        const policy = await this.findOne(id);

        await this.payrollPolicyModel.findByIdAndDelete(id).exec();
        return { message: `Payroll policy '${policy.policyName}' has been successfully deleted` };
    }

    async approve(id: string, approvedBy: string): Promise<payrollPolicies> {
        const policy = await this.findOne(id);

        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot approve policy with status '${policy.status}'. Only DRAFT policies can be approved.`
            );
        }

        await this.validateApprover(approvedBy, policy.createdBy);

        const approvedPolicy = await this.payrollPolicyModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.APPROVED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return approvedPolicy as payrollPolicies;
    }

    async reject(id: string, approvedBy: string): Promise<payrollPolicies> {
        const policy = await this.findOne(id);

        if (policy.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot reject policy with status '${policy.status}'. Only DRAFT policies can be rejected.`
            );
        }

        await this.validateApprover(approvedBy, policy.createdBy);

        const rejectedPolicy = await this.payrollPolicyModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.REJECTED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return rejectedPolicy as payrollPolicies;
    }

    // ========== DAREEN'S PAY TYPES METHODS ==========
    async createPayType(createDto: CreatePayTypeDto): Promise<payType> {
        const existingPayType = await this.payTypeModel.findOne({
            type: createDto.type
        }).exec();

        if (existingPayType) {
            throw new BadRequestException(`Pay type '${createDto.type}' already exists`);
        }

        const newPayType = new this.payTypeModel({
            type: createDto.type,
            amount: createDto.amount,
            createdBy: createDto.createdByEmployeeId,
            status: ConfigStatus.DRAFT,
        });

        return await newPayType.save();
    }

    async findAllPayTypes(queryDto: QueryPayTypeDto): Promise<{
        data: payType[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 10, search, status, createdByEmployeeId } = queryDto;
        const query: any = {};

        if (status) query.status = status;
        if (createdByEmployeeId) query.createdBy = createdByEmployeeId;

        if (search) {
            query.$or = [
                { type: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.payTypeModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec(),
            this.payTypeModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOnePayType(id: string): Promise<payType> {
        const payType = await this.payTypeModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!payType) {
            throw new NotFoundException(`Pay type with ID ${id} not found`);
        }
        return payType;
    }

    async updatePayType(id: string, updateDto: UpdatePayTypeDto): Promise<payType> {
        const payType = await this.findOnePayType(id);

        if (payType.status !== ConfigStatus.DRAFT) {
            throw new ForbiddenException(
                `Cannot update pay type with status '${payType.status}'. Only DRAFT pay types can be edited.`
            );
        }

        if (updateDto.type && updateDto.type !== payType.type) {
            const existing = await this.payTypeModel.findOne({ type: updateDto.type }).exec();
            if (existing) {
                throw new BadRequestException(`Pay type '${updateDto.type}' already exists`);
            }
        }

        const updatedPayType = await this.payTypeModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();
        return updatedPayType as payType;
    }

    async removePayType(id: string): Promise<{ message: string }> {
        const payType = await this.findOnePayType(id);

        await this.payTypeModel.findByIdAndDelete(id).exec();
        return { message: `Pay type '${payType.type}' has been successfully deleted` };
    }

    async approvePayType(id: string, approvedBy: string): Promise<payType> {
        const payType = await this.findOnePayType(id);

        if (payType.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot approve pay type with status '${payType.status}'. Only DRAFT pay types can be approved.`
            );
        }

        await this.validateApprover(approvedBy, payType.createdBy);

        const approvedPayType = await this.payTypeModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.APPROVED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return approvedPayType as payType;
    }

    async rejectPayType(id: string, approvedBy: string): Promise<payType> {
        const payType = await this.findOnePayType(id);

        if (payType.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot reject pay type with status '${payType.status}'. Only DRAFT pay types can be rejected.`
            );
        }

        await this.validateApprover(approvedBy, payType.createdBy);

        const rejectedPayType = await this.payTypeModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.REJECTED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return rejectedPayType as payType;
    }

    // ========== DAREEN'S ALLOWANCE METHODS ==========
    async createAllowance(createDto: CreateAllowanceDto): Promise<allowance> {
        const existingAllowance = await this.allowanceModel.findOne({
            name: { $regex: new RegExp(`^${createDto.name}$`, 'i') }
        }).exec();

        if (existingAllowance) {
            throw new BadRequestException(`Allowance '${createDto.name}' already exists`);
        }

        const allowanceData = {
            name: createDto.name,
            amount: createDto.amount,
            status: ConfigStatus.DRAFT,
            ...(createDto.createdByEmployeeId && {
                createdBy: new mongoose.Types.ObjectId(createDto.createdByEmployeeId)
            })
        };
        const newAllowance = new this.allowanceModel(allowanceData);

        return await newAllowance.save();
    }

    async findAllAllowances(queryDto: QueryAllowanceDto): Promise<{
        data: allowance[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 10, search, status, createdByEmployeeId } = queryDto;
        const query: any = {};

        if (status) query.status = status;
        if (createdByEmployeeId) query.createdBy = createdByEmployeeId;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.allowanceModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec(),
            this.allowanceModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOneAllowance(id: string): Promise<allowance> {
        const allowance = await this.allowanceModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!allowance) {
            throw new NotFoundException(`Allowance with ID ${id} not found`);
        }
        return allowance;
    }

    async updateAllowance(id: string, updateDto: UpdateAllowanceDto): Promise<allowance> {
        const allowance = await this.findOneAllowance(id);

        if (allowance.status !== ConfigStatus.DRAFT) {
            throw new ForbiddenException(
                `Cannot update allowance with status '${allowance.status}'. Only DRAFT allowances can be edited.`
            );
        }

        const updatedAllowance = await this.allowanceModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();
        return updatedAllowance as allowance;
    }

    async removeAllowance(id: string): Promise<{ message: string }> {
        const allowance = await this.findOneAllowance(id);

        await this.allowanceModel.findByIdAndDelete(id).exec();
        return { message: `Allowance '${allowance.name}' has been successfully deleted` };
    }

    async approveAllowance(id: string, approvedBy: string): Promise<allowance> {
        const allowance = await this.findOneAllowance(id);

        if (allowance.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot approve allowance with status '${allowance.status}'. Only DRAFT allowances can be approved.`
            );
        }

        await this.validateApprover(approvedBy, allowance.createdBy);

        const approvedAllowance = await this.allowanceModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.APPROVED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return approvedAllowance as allowance;
    }

    async rejectAllowance(id: string, approvedBy: string): Promise<allowance> {
        const allowance = await this.findOneAllowance(id);

        if (allowance.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot reject allowance with status '${allowance.status}'. Only DRAFT allowances can be rejected.`
            );
        }

        await this.validateApprover(approvedBy, allowance.createdBy);

        const rejectedAllowance = await this.allowanceModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.REJECTED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return rejectedAllowance as allowance;
    }

    // ========== DAREEN'S SIGNING BONUS METHODS ==========
    async createSigningBonus(createDto: CreateSigningBonusDto): Promise<signingBonus> {
        const existingSigningBonus = await this.signingBonusModel.findOne({
            positionName: { $regex: new RegExp(`^${createDto.positionName}$`, 'i') }
        }).exec();

        if (existingSigningBonus) {
            throw new BadRequestException(`Signing bonus for position '${createDto.positionName}' already exists`);
        }

        const signingBonusData = {
            positionName: createDto.positionName,
            amount: createDto.amount,
            status: ConfigStatus.DRAFT,
            ...(createDto.createdByEmployeeId && {
                createdBy: new mongoose.Types.ObjectId(createDto.createdByEmployeeId)
            })
        };
        const newSigningBonus = new this.signingBonusModel(signingBonusData);

        return await newSigningBonus.save();
    }

    async findAllSigningBonuses(queryDto: QuerySigningBonusDto): Promise<{
        data: signingBonus[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 10, search, status, createdByEmployeeId } = queryDto;
        const query: any = {};

        if (status) query.status = status;
        if (createdByEmployeeId) query.createdBy = createdByEmployeeId;

        if (search) {
            query.$or = [
                { positionName: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.signingBonusModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec(),
            this.signingBonusModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOneSigningBonus(id: string): Promise<signingBonus> {
        const signingBonus = await this.signingBonusModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!signingBonus) {
            throw new NotFoundException(`Signing bonus with ID ${id} not found`);
        }
        return signingBonus;
    }

    async updateSigningBonus(id: string, updateDto: UpdateSigningBonusDto): Promise<signingBonus> {
        const signingBonus = await this.findOneSigningBonus(id);

        if (signingBonus.status !== ConfigStatus.DRAFT) {
            throw new ForbiddenException(
                `Cannot update signing bonus with status '${signingBonus.status}'. Only DRAFT signing bonuses can be edited.`
            );
        }

        if (updateDto.positionName && updateDto.positionName !== signingBonus.positionName) {
            const existing = await this.signingBonusModel.findOne({
                positionName: { $regex: new RegExp(`^${updateDto.positionName}$`, 'i') }
            }).exec();
            if (existing) {
                throw new BadRequestException(`Signing bonus for position '${updateDto.positionName}' already exists`);
            }
        }

        const updatedSigningBonus = await this.signingBonusModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();
        return updatedSigningBonus as signingBonus;
    }

    async removeSigningBonus(id: string): Promise<{ message: string }> {
        const signingBonus = await this.findOneSigningBonus(id);

        await this.signingBonusModel.findByIdAndDelete(id).exec();
        return { message: `Signing bonus for position '${signingBonus.positionName}' has been successfully deleted` };
    }

    async approveSigningBonus(id: string, approvedBy: string): Promise<signingBonus> {
        const signingBonus = await this.findOneSigningBonus(id);

        if (signingBonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot approve signing bonus with status '${signingBonus.status}'. Only DRAFT signing bonuses can be approved.`
            );
        }

        await this.validateApprover(approvedBy, signingBonus.createdBy);

        const approvedSigningBonus = await this.signingBonusModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.APPROVED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return approvedSigningBonus as signingBonus;
    }

    async rejectSigningBonus(id: string, approvedBy: string): Promise<signingBonus> {
        const signingBonus = await this.findOneSigningBonus(id);

        if (signingBonus.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot reject signing bonus with status '${signingBonus.status}'. Only DRAFT signing bonuses can be rejected.`
            );
        }

        await this.validateApprover(approvedBy, signingBonus.createdBy);

        const rejectedSigningBonus = await this.signingBonusModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.REJECTED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return rejectedSigningBonus as signingBonus;
    }

    // ========== DAREEN'S TERMINATION & RESIGNATION BENEFITS METHODS ==========
    async createTerminationBenefit(createDto: CreateTerminationBenefitDto): Promise<terminationAndResignationBenefits> {
        const existingBenefit = await this.terminationBenefitsModel.findOne({
            name: { $regex: new RegExp(`^${createDto.name}$`, 'i') }
        }).exec();

        if (existingBenefit) {
            throw new BadRequestException(`Termination benefit '${createDto.name}' already exists`);
        }

        const benefitData = {
            name: createDto.name,
            amount: createDto.amount,
            terms: createDto.terms,
            status: ConfigStatus.DRAFT,
            ...(createDto.createdByEmployeeId && {
                createdBy: new mongoose.Types.ObjectId(createDto.createdByEmployeeId)
            })
        };
        const newBenefit = new this.terminationBenefitsModel(benefitData);

        return await newBenefit.save();
    }

    async findAllTerminationBenefits(queryDto: QueryTerminationBenefitDto): Promise<{
        data: terminationAndResignationBenefits[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { page = 1, limit = 10, search, status, createdByEmployeeId } = queryDto;
        const query: any = {};

        if (status) query.status = status;
        if (createdByEmployeeId) query.createdBy = createdByEmployeeId;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { terms: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.terminationBenefitsModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec(),
            this.terminationBenefitsModel.countDocuments(query).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOneTerminationBenefit(id: string): Promise<terminationAndResignationBenefits> {
        const benefit = await this.terminationBenefitsModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!benefit) {
            throw new NotFoundException(`Termination benefit with ID ${id} not found`);
        }
        return benefit;
    }

    async updateTerminationBenefit(id: string, updateDto: UpdateTerminationBenefitDto): Promise<terminationAndResignationBenefits> {
        const benefit = await this.findOneTerminationBenefit(id);

        if (benefit.status !== ConfigStatus.DRAFT) {
            throw new ForbiddenException(
                `Cannot update termination benefit with status '${benefit.status}'. ` +
                `Manual adjustments require specialist approval (BR27). ` +
                `Please contact a payroll specialist.`
            );
        }

        if (updateDto.name && updateDto.name !== benefit.name) {
            const existing = await this.terminationBenefitsModel.findOne({
                name: updateDto.name
            }).exec();
            if (existing) {
                throw new BadRequestException(`Termination benefit '${updateDto.name}' already exists`);
            }
        }

        const updatedBenefit = await this.terminationBenefitsModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();

        if (updateDto.amount !== undefined && updateDto.amount !== benefit.amount) {
            console.log(`[BR27] Manual adjustment: Benefit "${benefit.name}" amount changed from ${benefit.amount} to ${updateDto.amount}`);
        }

        return updatedBenefit as terminationAndResignationBenefits;
    }

    async removeTerminationBenefit(id: string): Promise<{ message: string }> {
        const benefit = await this.findOneTerminationBenefit(id);

        await this.terminationBenefitsModel.findByIdAndDelete(id).exec();
        return { message: `Termination benefit '${benefit.name}' has been successfully deleted` };
    }

    async approveTerminationBenefit(id: string, approvedBy: string): Promise<terminationAndResignationBenefits> {
        const benefit = await this.findOneTerminationBenefit(id);

        if (benefit.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot approve termination benefit with status '${benefit.status}'. Only DRAFT benefits can be approved.`
            );
        }

        await this.validateApprover(approvedBy, benefit.createdBy);

        console.log(`[BR26] HR Clearance: ${approvedBy} approved termination benefit ${benefit.name}`);

        const approvedBenefit = await this.terminationBenefitsModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.APPROVED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();

        console.log(`[AUDIT] Termination benefit "${benefit.name}" approved by HR: ${approvedBy}`);

        return approvedBenefit as terminationAndResignationBenefits;
    }

    async rejectTerminationBenefit(id: string, approvedBy: string): Promise<terminationAndResignationBenefits> {
        const benefit = await this.findOneTerminationBenefit(id);

        if (benefit.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                `Cannot reject termination benefit with status '${benefit.status}'. Only DRAFT benefits can be rejected.`
            );
        }

        await this.validateApprover(approvedBy, benefit.createdBy);

        const rejectedBenefit = await this.terminationBenefitsModel
            .findByIdAndUpdate(
                id,
                {
                    status: ConfigStatus.REJECTED,
                    approvedBy,
                    approvedAt: new Date(),
                },
                { new: true }
            )
            .exec();
        return rejectedBenefit as terminationAndResignationBenefits;
    }

    // ========== MANOS' PAY GRADE METHODS (Keeping only unique methods) ==========
    async createPayGrade(createDto: CreatePayGradeDto) {
        if (createDto.grossSalary < createDto.baseSalary) {
            throw new BadRequestException(
                'Gross salary must be greater than or equal to base salary (Gross = Base + Allowances)',
            );
        }

        const existingPayGrade = await this.payGradeModel
            .findOne({ grade: { $regex: new RegExp(`^${createDto.grade}$`, 'i') } })
            .exec();

        if (existingPayGrade) {
            throw new BadRequestException(
                `Pay grade with name "${createDto.grade}" already exists`,
            );
        }

        const payGrade = new this.payGradeModel({
            grade: createDto.grade,
            baseSalary: createDto.baseSalary,
            grossSalary: createDto.grossSalary,
            createdBy: new Types.ObjectId(createDto.createdByEmployeeId),
            status: ConfigStatus.DRAFT,
        });

        return await payGrade.save();
    }

    async findAllPayGrades(status?: ConfigStatus) {
        const query = status ? { status } : {};
        return await this.payGradeModel.find(query).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
    }

    async findOnePayGrade(id: string) {
        const payGrade = await this.payGradeModel.findById(id).populate('createdBy', 'firstName lastName employeeNumber fullName').populate('approvedBy', 'firstName lastName employeeNumber fullName').exec();
        if (!payGrade) {
            throw new NotFoundException(`Pay grade with ID ${id} not found`);
        }
        return payGrade;
    }

    async updatePayGrade(id: string, updateDto: UpdatePayGradeDto) {
        const payGrade = await this.findOnePayGrade(id);

        if (payGrade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException(
                'Only DRAFT configurations can be edited',
            );
        }

        const newBaseSalary = updateDto.baseSalary !== undefined ? updateDto.baseSalary : payGrade.baseSalary;
        const newGrossSalary = updateDto.grossSalary !== undefined ? updateDto.grossSalary : payGrade.grossSalary;

        if (newGrossSalary < newBaseSalary) {
            throw new BadRequestException(
                'Gross salary must be greater than or equal to base salary (Gross = Base + Allowances)',
            );
        }

        if (updateDto.grade !== undefined) {
            const existingPayGrade = await this.payGradeModel
                .findOne({ grade: updateDto.grade, _id: { $ne: id } })
                .exec();

            if (existingPayGrade) {
                throw new BadRequestException(
                    `Pay grade with name "${updateDto.grade}" already exists`,
                );
            }
            payGrade.grade = updateDto.grade;
        }
        if (updateDto.baseSalary !== undefined) {
            payGrade.baseSalary = updateDto.baseSalary;
        }
        if (updateDto.grossSalary !== undefined) {
            payGrade.grossSalary = updateDto.grossSalary;
        }

        return await payGrade.save();
    }

    async deletePayGrade(id: string) {
        const payGrade = await this.findOnePayGrade(id);
        await this.payGradeModel.findByIdAndDelete(id).exec();
        return {
            message: 'Pay grade deleted successfully',
            deletedId: id,
        };
    }

    // ========== MANOS' COMPANY WIDE SETTINGS METHODS ==========
    async getCompanyWideSettings() {
        let settings = await this.companySettingsModel.findOne().exec();
        if (!settings) {
            settings = new this.companySettingsModel({
                payDate: new Date(),
                timeZone: 'Africa/Cairo',
                currency: 'EGP',
            });
            await settings.save();
        }
        // Return settings with ephemeral status
        return { ...settings.toObject(), status: this.companySettingsStatus };
    }

    async updateCompanyWideSettings(updateDto: UpdateCompanyWideSettingsDto) {
        let settings = await this.companySettingsModel.findOne().exec();
        if (!settings) {
            settings = new this.companySettingsModel({
                ...updateDto,
                currency: updateDto.currency || 'EGP',
            });
        } else {
            Object.assign(settings, updateDto);
        }
        const saved = await settings.save();
        return { ...saved.toObject(), status: this.companySettingsStatus };
    }

    // New method to get only the currency
    async getCompanyCurrency() {
        let settings = await this.companySettingsModel.findOne().exec();
        if (!settings) {
            settings = new this.companySettingsModel({
                payDate: new Date(),
                timeZone: 'Africa/Cairo',
                currency: 'EGP',
            });
            await settings.save();
        }
        return { currency: settings.currency || 'EGP' };
    }

    async approveCompanyWideSettings() {
        const settings = await this.companySettingsModel.findOne().exec();
        if (!settings) {
            throw new NotFoundException('Company-wide settings not found');
        }
        if (this.companySettingsStatus !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT settings can be approved');
        }
        this.companySettingsStatus = 'APPROVED';
        return { ...settings.toObject(), status: this.companySettingsStatus };
    }

    async rejectCompanyWideSettings() {
        const settings = await this.companySettingsModel.findOne().exec();
        if (!settings) {
            throw new NotFoundException('Company-wide settings not found');
        }
        if (this.companySettingsStatus !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT settings can be rejected');
        }
        this.companySettingsStatus = 'REJECTED';
        return { ...settings.toObject(), status: this.companySettingsStatus };
    }



    // ========== LAMA'S HELPER METHOD ==========
    calculateContributions(bracket: insuranceBrackets, salary: number) {
        // Ensure inclusive check
        const isValid = salary >= bracket.minSalary && salary <= bracket.maxSalary;

        const employeeContribution = (salary * bracket.employeeRate) / 100;
        const employerContribution = (salary * bracket.employerRate) / 100;
        const totalContribution = employeeContribution + employerContribution;

        return {
            employeeContribution,
            employerContribution,
            totalContribution,
            isValid,
        };
    }


    // ========== DAREEN'S CALCULATION METHOD ==========
    /**
     * Calculate termination entitlements based on approved benefits
     * Business Rules Applied:
     * - BR29: Termination benefits calculated based on reason (resignation vs termination)
     * - BR56: All calculations use approved benefit configurations only
     *
     * Calculation Formulas:
     * - Gratuity: Last Salary × 0.5 × Years of Service
     * - Severance: Last Salary × Years of Service (max 12 months)
     * - All Other Benefits: Base Amount × Years of Service
     *
     * Note: Actual unused leave days should be fetched from Leave Management module separately.
     * This calculator uses configured benefit amounts only.
     *
     * @param employeeData.benefitIds - Optional array of benefit IDs to include. If empty/undefined, all approved benefits are used.
     */
    async calculateTerminationEntitlements(employeeData: any): Promise<any> {
        const { employeeId, lastSalary, yearsOfService = 1, reason = 'resignation', benefitIds } = employeeData;

        // BR56: Only use APPROVED benefits for calculations
        // If specific benefitIds provided, filter by those IDs as well
        let query: any = { status: ConfigStatus.APPROVED };
        if (benefitIds && Array.isArray(benefitIds) && benefitIds.length > 0) {
            query._id = { $in: benefitIds.map((id: string) => new Types.ObjectId(id)) };
        }

        const approvedBenefits = await this.terminationBenefitsModel
            .find(query)
            .exec();

        const calculations: any[] = [];
        let totalEntitlement = 0;

        for (const benefit of approvedBenefits) {
            let calculatedAmount = 0;
            let formula = '';
            const benefitNameLower = benefit.name.toLowerCase();

            if (benefitNameLower.includes('gratuity')) {
                // Gratuity: Half month salary per year of service
                calculatedAmount = lastSalary * 0.5 * yearsOfService;
                formula = `Last Salary (${lastSalary}) × 0.5 × Years of Service (${yearsOfService})`;
            } else if (benefitNameLower.includes('severance')) {
                // Severance: One month salary per year, capped at 12 months
                const months = Math.min(yearsOfService, 12);
                calculatedAmount = lastSalary * months;
                formula = `Last Salary (${lastSalary}) × ${months} months (Years: ${yearsOfService}, max 12)`;
            } else {
                // All other benefits (including leave encashment): Base Amount × Years of Service
                calculatedAmount = benefit.amount * yearsOfService;
                formula = `Base Amount (${benefit.amount}) × Years of Service (${yearsOfService})`;
            }

            // BR29: Apply reason-specific entitlement rules
            let reasonNote = '';
            if (reason === 'termination' && benefitNameLower.includes('severance')) {
                // Terminated employees get higher severance (1.5x)
                calculatedAmount *= 1.5;
                reasonNote = ' (Termination multiplier: 1.5x)';
                formula += reasonNote;
            }

            calculations.push({
                benefitName: benefit.name,
                baseAmount: benefit.amount,
                calculatedAmount: Math.round(calculatedAmount * 100) / 100,
                formula,
                reasonSpecific: reason === 'resignation' ? 'Resignation Entitlement' : 'Termination Entitlement'
            });

            totalEntitlement += calculatedAmount;
        }

        return {
            employeeId,
            reason,
            lastSalary,
            yearsOfService,
            calculations,
            totalEntitlement: Math.round(totalEntitlement * 100) / 100,
            calculationDate: new Date(),
            businessRulesApplied: [
                'BR29: Reason-based entitlement calculation (termination gets 1.5x severance)',
                'BR56: Only APPROVED benefits are included in calculations'
            ]
        };
    }

    async approvePayGrade(id: string, approveDto: ApproveConfigDto) {
        const payGrade = await this.findOnePayGrade(id);
        if (payGrade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT configurations can be approved');
        }

        await this.validateApprover(approveDto.approvedBy, payGrade.createdBy);

        payGrade.status = ConfigStatus.APPROVED;
        payGrade.approvedBy = new Types.ObjectId(approveDto.approvedBy);
        payGrade.approvedAt = new Date();
        return await payGrade.save();
    }


    async rejectPayGrade(id: string, approveDto: ApproveConfigDto) {
        const payGrade = await this.findOnePayGrade(id);
        if (payGrade.status !== ConfigStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT configurations can be rejected');
        }

        await this.validateApprover(approveDto.approvedBy, payGrade.createdBy);

        payGrade.status = ConfigStatus.REJECTED;
        payGrade.approvedBy = new Types.ObjectId(approveDto.approvedBy);
        payGrade.approvedAt = new Date();
        return await payGrade.save();
    }
}
