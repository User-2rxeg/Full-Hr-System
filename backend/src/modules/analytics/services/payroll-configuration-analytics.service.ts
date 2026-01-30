import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { allowance } from '../../payroll/payroll-configuration/models/allowance.schema';
import { taxRules } from '../../payroll/payroll-configuration/models/taxRules.schema';
import { insuranceBrackets } from '../../payroll/payroll-configuration/models/insuranceBrackets.schema';
import { payGrade } from '../../payroll/payroll-configuration/models/payGrades.schema';
import { payType } from '../../payroll/payroll-configuration/models/payType.schema';
import { signingBonus } from '../../payroll/payroll-configuration/models/signingBonus.schema';
import { payrollPolicies } from '../../payroll/payroll-configuration/models/payrollPolicies.schema';
import { terminationAndResignationBenefits } from '../../payroll/payroll-configuration/models/terminationAndResignationBenefits';
import { CompanyWideSettings } from '../../payroll/payroll-configuration/models/CompanyWideSettings.schema';
import { ConfigStatus, PolicyType, Applicability } from '../../payroll/payroll-configuration/enums/payroll-configuration-enums';
import { EmployeeProfile } from '../../employee/models/employee/employee-profile.schema';

// ============ INTERFACES ============

export interface ConfigStatusOverview {
    category: string;
    total: number;
    draft: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    pendingActions: number;
    lastUpdated: Date | null;
}

export interface AllowanceAnalysis {
    totalAllowances: number;
    totalValue: number;
    avgAllowanceAmount: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    distribution: { name: string; amount: number; status: string }[];
    topAllowances: { name: string; amount: number }[];
}

export interface TaxRulesAnalysis {
    totalRules: number;
    avgTaxRate: number;
    minRate: number;
    maxRate: number;
    byStatus: { status: string; count: number }[];
    rateDistribution: { name: string; rate: number; status: string; description?: string }[];
    effectiveTaxBurden: number;
}

export interface InsuranceAnalysis {
    totalBrackets: number;
    avgEmployeeRate: number;
    avgEmployerRate: number;
    totalEmployerBurden: number;
    byStatus: { status: string; count: number }[];
    brackets: {
        name: string;
        minSalary: number;
        maxSalary: number;
        employeeRate: number;
        employerRate: number;
        status: string;
    }[];
    coverageGaps: { min: number; max: number }[];
}

export interface PayGradeAnalysis {
    totalGrades: number;
    avgBaseSalary: number;
    avgGrossSalary: number;
    minSalary: number;
    maxSalary: number;
    salarySpread: number;
    byStatus: { status: string; count: number; totalSalary: number }[];
    gradeDistribution: {
        grade: string;
        baseSalary: number;
        grossSalary: number;
        allowanceComponent: number;
        status: string;
    }[];
}

export interface PayTypeAnalysis {
    totalTypes: number;
    byStatus: { status: string; count: number }[];
    types: { type: string; amount: number; status: string }[];
    avgAmount: number;
}

export interface SigningBonusAnalysis {
    totalBonuses: number;
    totalValue: number;
    avgBonusAmount: number;
    minBonus: number;
    maxBonus: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    byPosition: { positionName: string; amount: number; status: string }[];
    topPositions: { positionName: string; amount: number }[];
}

export interface PolicyAnalysis {
    totalPolicies: number;
    byType: { type: string; count: number; avgPercentage: number; avgFixedAmount: number }[];
    byApplicability: { applicability: string; count: number }[];
    byStatus: { status: string; count: number }[];
    policies: {
        policyName: string;
        policyType: string;
        applicability: string;
        percentage: number;
        fixedAmount: number;
        effectiveDate: Date;
        status: string;
    }[];
    upcomingEffective: {
        policyName: string;
        effectiveDate: Date;
        daysUntilEffective: number;
    }[];
}

export interface TerminationBenefitsAnalysis {
    totalBenefits: number;
    totalValue: number;
    avgBenefitAmount: number;
    byStatus: { status: string; count: number; totalValue: number }[];
    benefits: { name: string; amount: number; terms?: string; status: string }[];
}

export interface ApprovalWorkflowMetrics {
    totalConfigurations: number;
    pendingApprovals: number;
    avgApprovalTime: number;
    approvalRateByCategory: {
        category: string;
        approved: number;
        rejected: number;
        pending: number;
        approvalRate: number;
    }[];
    recentApprovals: {
        category: string;
        name: string;
        approvedBy?: string;
        approvedAt?: Date;
    }[];
    recentRejections: {
        category: string;
        name: string;
        rejectedAt?: Date;
    }[];
}

export interface CompanySettingsAnalysis {
    hasSettings: boolean;
    payDate: Date | null;
    timeZone: string | null;
    currency: string;
    lastUpdated: Date | null;
}

export interface ConfigurationHealthScore {
    overallScore: number;
    categories: {
        category: string;
        score: number;
        issues: string[];
        suggestions: string[];
    }[];
    criticalIssues: string[];
    recommendations: string[];
}

export interface ConfigurationDashboardSummary {
    overview: {
        totalConfigurations: number;
        approvedConfigurations: number;
        pendingApprovals: number;
        rejectedConfigurations: number;
        overallApprovalRate: number;
        lastConfigUpdate: Date | null;
    };
    statusOverview: ConfigStatusOverview[];
    allowanceAnalysis: AllowanceAnalysis;
    taxRulesAnalysis: TaxRulesAnalysis;
    insuranceAnalysis: InsuranceAnalysis;
    payGradeAnalysis: PayGradeAnalysis;
    payTypeAnalysis: PayTypeAnalysis;
    signingBonusAnalysis: SigningBonusAnalysis;
    policyAnalysis: PolicyAnalysis;
    terminationBenefits: TerminationBenefitsAnalysis;
    approvalMetrics: ApprovalWorkflowMetrics;
    companySettings: CompanySettingsAnalysis;
    healthScore: ConfigurationHealthScore;
}

@Injectable()
export class PayrollConfigurationAnalyticsService {
    private readonly logger = new Logger(PayrollConfigurationAnalyticsService.name);

    constructor(
        @InjectModel(allowance.name) private allowanceModel: Model<allowance>,
        @InjectModel(taxRules.name) private taxRulesModel: Model<taxRules>,
        @InjectModel(insuranceBrackets.name) private insuranceModel: Model<insuranceBrackets>,
        @InjectModel(payGrade.name) private payGradeModel: Model<payGrade>,
        @InjectModel(payType.name) private payTypeModel: Model<payType>,
        @InjectModel(signingBonus.name) private signingBonusModel: Model<signingBonus>,
        @InjectModel(payrollPolicies.name) private policiesModel: Model<payrollPolicies>,
        @InjectModel(terminationAndResignationBenefits.name) private terminationBenefitsModel: Model<terminationAndResignationBenefits>,
        @InjectModel(CompanyWideSettings.name) private settingsModel: Model<CompanyWideSettings>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfile>,
    ) { }

    // ============ STATUS OVERVIEW ============

    async getConfigStatusOverview(): Promise<ConfigStatusOverview[]> {
        const results: ConfigStatusOverview[] = [];

        // Process each category separately to avoid union type issues
        const categoriesData = await Promise.all([
            this.allowanceModel.find().lean().then(docs => ({ name: 'Allowances', docs })),
            this.taxRulesModel.find().lean().then(docs => ({ name: 'Tax Rules', docs })),
            this.insuranceModel.find().lean().then(docs => ({ name: 'Insurance Brackets', docs })),
            this.payGradeModel.find().lean().then(docs => ({ name: 'Pay Grades', docs })),
            this.payTypeModel.find().lean().then(docs => ({ name: 'Pay Types', docs })),
            this.signingBonusModel.find().lean().then(docs => ({ name: 'Signing Bonuses', docs })),
            this.policiesModel.find().lean().then(docs => ({ name: 'Payroll Policies', docs })),
            this.terminationBenefitsModel.find().lean().then(docs => ({ name: 'Termination Benefits', docs })),
        ]);

        for (const cat of categoriesData) {
            const all = cat.docs as any[];
            const total = all.length;
            const draft = all.filter((d: any) => d.status === ConfigStatus.DRAFT).length;
            const approved = all.filter((d: any) => d.status === ConfigStatus.APPROVED).length;
            const rejected = all.filter((d: any) => d.status === ConfigStatus.REJECTED).length;

            const lastUpdated = all.length > 0
                ? all.reduce((latest: Date | null, item: any) => {
                    const updatedAt = item.updatedAt || item.createdAt;
                    return !latest || updatedAt > latest ? updatedAt : latest;
                }, null as Date | null)
                : null;

            results.push({
                category: cat.name,
                total,
                draft,
                approved,
                rejected,
                approvalRate: total > 0 ? (approved / total) * 100 : 0,
                pendingActions: draft,
                lastUpdated,
            });
        }

        return results;
    }

    // ============ ALLOWANCE ANALYSIS ============

    async getAllowanceAnalysis(): Promise<AllowanceAnalysis> {
        const allowances = await this.allowanceModel.find().lean();

        const byStatus = Object.values(ConfigStatus).map(status => {
            const filtered = allowances.filter(a => a.status === status);
            return {
                status,
                count: filtered.length,
                totalValue: filtered.reduce((sum, a) => sum + a.amount, 0),
            };
        });

        const totalValue = allowances.reduce((sum, a) => sum + a.amount, 0);
        const approvedAllowances = allowances
            .filter(a => a.status === ConfigStatus.APPROVED)
            .sort((a, b) => b.amount - a.amount);

        return {
            totalAllowances: allowances.length,
            totalValue,
            avgAllowanceAmount: allowances.length > 0 ? totalValue / allowances.length : 0,
            byStatus,
            distribution: allowances.map(a => ({
                name: a.name,
                amount: a.amount,
                status: a.status,
            })),
            topAllowances: approvedAllowances.slice(0, 5).map(a => ({
                name: a.name,
                amount: a.amount,
            })),
        };
    }

    // ============ TAX RULES ANALYSIS ============

    async getTaxRulesAnalysis(): Promise<TaxRulesAnalysis> {
        const rules = await this.taxRulesModel.find().lean();

        const rates = rules.map(r => r.rate);
        const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
        const minRate = rates.length > 0 ? Math.min(...rates) : 0;
        const maxRate = rates.length > 0 ? Math.max(...rates) : 0;

        const byStatus = Object.values(ConfigStatus).map(status => ({
            status,
            count: rules.filter(r => r.status === status).length,
        }));

        const approvedRates = rules.filter(r => r.status === ConfigStatus.APPROVED);
        const effectiveTaxBurden = approvedRates.length > 0
            ? approvedRates.reduce((sum, r) => sum + r.rate, 0) / approvedRates.length
            : 0;

        return {
            totalRules: rules.length,
            avgTaxRate: avgRate,
            minRate,
            maxRate,
            byStatus,
            rateDistribution: rules.map(r => ({
                name: r.name,
                rate: r.rate,
                status: r.status,
                description: r.description,
            })),
            effectiveTaxBurden,
        };
    }

    // ============ INSURANCE ANALYSIS ============

    async getInsuranceAnalysis(): Promise<InsuranceAnalysis> {
        const brackets = await this.insuranceModel.find().sort({ minSalary: 1 }).lean();

        const avgEmployeeRate = brackets.length > 0
            ? brackets.reduce((sum, b) => sum + b.employeeRate, 0) / brackets.length
            : 0;
        const avgEmployerRate = brackets.length > 0
            ? brackets.reduce((sum, b) => sum + b.employerRate, 0) / brackets.length
            : 0;

        const byStatus = Object.values(ConfigStatus).map(status => ({
            status,
            count: brackets.filter(b => b.status === status).length,
        }));

        // Detect coverage gaps in salary ranges
        const coverageGaps: { min: number; max: number }[] = [];
        const approvedBrackets = brackets
            .filter(b => b.status === ConfigStatus.APPROVED)
            .sort((a, b) => a.minSalary - b.minSalary);

        for (let i = 0; i < approvedBrackets.length - 1; i++) {
            const current = approvedBrackets[i];
            const next = approvedBrackets[i + 1];
            if (current.maxSalary < next.minSalary - 1) {
                coverageGaps.push({ min: current.maxSalary + 1, max: next.minSalary - 1 });
            }
        }

        // Calculate total employer burden estimate
        const totalEmployerBurden = approvedBrackets.reduce((sum, b) => {
            const avgSalary = (b.minSalary + b.maxSalary) / 2;
            return sum + (avgSalary * b.employerRate / 100);
        }, 0);

        return {
            totalBrackets: brackets.length,
            avgEmployeeRate,
            avgEmployerRate,
            totalEmployerBurden,
            byStatus,
            brackets: brackets.map(b => ({
                name: b.name,
                minSalary: b.minSalary,
                maxSalary: b.maxSalary,
                employeeRate: b.employeeRate,
                employerRate: b.employerRate,
                status: b.status,
            })),
            coverageGaps,
        };
    }

    // ============ PAY GRADE ANALYSIS ============

    async getPayGradeAnalysis(): Promise<PayGradeAnalysis> {
        const grades = await this.payGradeModel.find().lean();

        const baseSalaries = grades.map(g => g.baseSalary);
        const grossSalaries = grades.map(g => g.grossSalary);

        const avgBase = baseSalaries.length > 0 ? baseSalaries.reduce((a, b) => a + b, 0) / baseSalaries.length : 0;
        const avgGross = grossSalaries.length > 0 ? grossSalaries.reduce((a, b) => a + b, 0) / grossSalaries.length : 0;
        const minSalary = baseSalaries.length > 0 ? Math.min(...baseSalaries) : 0;
        const maxSalary = grossSalaries.length > 0 ? Math.max(...grossSalaries) : 0;

        const byStatus = Object.values(ConfigStatus).map(status => {
            const filtered = grades.filter(g => g.status === status);
            return {
                status,
                count: filtered.length,
                totalSalary: filtered.reduce((sum, g) => sum + g.grossSalary, 0),
            };
        });

        return {
            totalGrades: grades.length,
            avgBaseSalary: avgBase,
            avgGrossSalary: avgGross,
            minSalary,
            maxSalary,
            salarySpread: maxSalary - minSalary,
            byStatus,
            gradeDistribution: grades.map(g => ({
                grade: g.grade,
                baseSalary: g.baseSalary,
                grossSalary: g.grossSalary,
                allowanceComponent: g.grossSalary - g.baseSalary,
                status: g.status,
            })),
        };
    }

    // ============ PAY TYPE ANALYSIS ============

    async getPayTypeAnalysis(): Promise<PayTypeAnalysis> {
        const types = await this.payTypeModel.find().lean();

        const byStatus = Object.values(ConfigStatus).map(status => ({
            status,
            count: types.filter(t => t.status === status).length,
        }));

        const avgAmount = types.length > 0
            ? types.reduce((sum, t) => sum + t.amount, 0) / types.length
            : 0;

        return {
            totalTypes: types.length,
            byStatus,
            types: types.map(t => ({
                type: t.type,
                amount: t.amount,
                status: t.status,
            })),
            avgAmount,
        };
    }

    // ============ SIGNING BONUS ANALYSIS ============

    async getSigningBonusAnalysis(): Promise<SigningBonusAnalysis> {
        const bonuses = await this.signingBonusModel.find().lean();

        const totalValue = bonuses.reduce((sum, b) => sum + b.amount, 0);
        const amounts = bonuses.map(b => b.amount);

        const byStatus = Object.values(ConfigStatus).map(status => {
            const filtered = bonuses.filter(b => b.status === status);
            return {
                status,
                count: filtered.length,
                totalValue: filtered.reduce((sum, b) => sum + b.amount, 0),
            };
        });

        const approvedBonuses = bonuses
            .filter(b => b.status === ConfigStatus.APPROVED)
            .sort((a, b) => b.amount - a.amount);

        return {
            totalBonuses: bonuses.length,
            totalValue,
            avgBonusAmount: bonuses.length > 0 ? totalValue / bonuses.length : 0,
            minBonus: amounts.length > 0 ? Math.min(...amounts) : 0,
            maxBonus: amounts.length > 0 ? Math.max(...amounts) : 0,
            byStatus,
            byPosition: bonuses.map(b => ({
                positionName: b.positionName,
                amount: b.amount,
                status: b.status,
            })),
            topPositions: approvedBonuses.slice(0, 5).map(b => ({
                positionName: b.positionName,
                amount: b.amount,
            })),
        };
    }

    // ============ POLICY ANALYSIS ============

    async getPolicyAnalysis(): Promise<PolicyAnalysis> {
        const policies = await this.policiesModel.find().lean();

        const byType = Object.values(PolicyType).map(type => {
            const filtered = policies.filter(p => p.policyType === type);
            return {
                type,
                count: filtered.length,
                avgPercentage: filtered.length > 0
                    ? filtered.reduce((sum, p) => sum + (p.ruleDefinition?.percentage || 0), 0) / filtered.length
                    : 0,
                avgFixedAmount: filtered.length > 0
                    ? filtered.reduce((sum, p) => sum + (p.ruleDefinition?.fixedAmount || 0), 0) / filtered.length
                    : 0,
            };
        });

        const byApplicability = Object.values(Applicability).map(app => ({
            applicability: app,
            count: policies.filter(p => p.applicability === app).length,
        }));

        const byStatus = Object.values(ConfigStatus).map(status => ({
            status,
            count: policies.filter(p => p.status === status).length,
        }));

        const now = new Date();
        const upcomingEffective = policies
            .filter(p => p.effectiveDate > now && p.status === ConfigStatus.APPROVED)
            .map(p => ({
                policyName: p.policyName,
                effectiveDate: p.effectiveDate,
                daysUntilEffective: Math.ceil((p.effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            }))
            .sort((a, b) => a.daysUntilEffective - b.daysUntilEffective);

        return {
            totalPolicies: policies.length,
            byType,
            byApplicability,
            byStatus,
            policies: policies.map(p => ({
                policyName: p.policyName,
                policyType: p.policyType,
                applicability: p.applicability,
                percentage: p.ruleDefinition?.percentage || 0,
                fixedAmount: p.ruleDefinition?.fixedAmount || 0,
                effectiveDate: p.effectiveDate,
                status: p.status,
            })),
            upcomingEffective,
        };
    }

    // ============ TERMINATION BENEFITS ANALYSIS ============

    async getTerminationBenefitsAnalysis(): Promise<TerminationBenefitsAnalysis> {
        const benefits = await this.terminationBenefitsModel.find().lean();

        const totalValue = benefits.reduce((sum, b) => sum + b.amount, 0);

        const byStatus = Object.values(ConfigStatus).map(status => {
            const filtered = benefits.filter(b => b.status === status);
            return {
                status,
                count: filtered.length,
                totalValue: filtered.reduce((sum, b) => sum + b.amount, 0),
            };
        });

        return {
            totalBenefits: benefits.length,
            totalValue,
            avgBenefitAmount: benefits.length > 0 ? totalValue / benefits.length : 0,
            byStatus,
            benefits: benefits.map(b => ({
                name: b.name,
                amount: b.amount,
                terms: b.terms,
                status: b.status,
            })),
        };
    }

    // ============ APPROVAL WORKFLOW METRICS ============

    async getApprovalWorkflowMetrics(): Promise<ApprovalWorkflowMetrics> {
        let totalConfigurations = 0;
        let pendingApprovals = 0;
        const approvalRateByCategory: ApprovalWorkflowMetrics['approvalRateByCategory'] = [];
        const recentApprovals: ApprovalWorkflowMetrics['recentApprovals'] = [];
        const recentRejections: ApprovalWorkflowMetrics['recentRejections'] = [];

        // Process each category separately to avoid union type issues
        const categoriesData = await Promise.all([
            this.allowanceModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Allowances', docs })),
            this.taxRulesModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Tax Rules', docs })),
            this.insuranceModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Insurance Brackets', docs })),
            this.payGradeModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Pay Grades', docs })),
            this.payTypeModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Pay Types', docs })),
            this.signingBonusModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Signing Bonuses', docs })),
            this.policiesModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Payroll Policies', docs })),
            this.terminationBenefitsModel.find().populate('approvedBy', 'fullName').lean().then(docs => ({ name: 'Termination Benefits', docs })),
        ]);

        for (const cat of categoriesData) {
            const all = cat.docs as any[];
            const approved = all.filter((d: any) => d.status === ConfigStatus.APPROVED);
            const rejected = all.filter((d: any) => d.status === ConfigStatus.REJECTED);
            const pending = all.filter((d: any) => d.status === ConfigStatus.DRAFT);

            totalConfigurations += all.length;
            pendingApprovals += pending.length;

            approvalRateByCategory.push({
                category: cat.name,
                approved: approved.length,
                rejected: rejected.length,
                pending: pending.length,
                approvalRate: all.length > 0 ? (approved.length / all.length) * 100 : 0,
            });

            // Get recent approvals
            approved
                .filter((d: any) => d.approvedAt)
                .sort((a: any, b: any) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime())
                .slice(0, 3)
                .forEach((d: any) => {
                    recentApprovals.push({
                        category: cat.name,
                        name: d.name || d.policyName || d.grade || d.type || d.positionName,
                        approvedBy: d.approvedBy?.fullName,
                        approvedAt: d.approvedAt,
                    });
                });

            // Get recent rejections
            rejected
                .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 3)
                .forEach((d: any) => {
                    recentRejections.push({
                        category: cat.name,
                        name: d.name || d.policyName || d.grade || d.type || d.positionName,
                        rejectedAt: d.updatedAt,
                    });
                });
        }

        // Sort and limit recent items
        recentApprovals.sort((a, b) => 
            (b.approvedAt?.getTime() || 0) - (a.approvedAt?.getTime() || 0)
        );
        recentRejections.sort((a, b) => 
            (b.rejectedAt?.getTime() || 0) - (a.rejectedAt?.getTime() || 0)
        );

        return {
            totalConfigurations,
            pendingApprovals,
            avgApprovalTime: 0, // Would need createdAt to approvedAt calculation
            approvalRateByCategory,
            recentApprovals: recentApprovals.slice(0, 10),
            recentRejections: recentRejections.slice(0, 10),
        };
    }

    // ============ COMPANY SETTINGS ANALYSIS ============

    async getCompanySettingsAnalysis(): Promise<CompanySettingsAnalysis> {
        const settings = await this.settingsModel.findOne().lean();

        return {
            hasSettings: !!settings,
            payDate: settings?.payDate || null,
            timeZone: settings?.timeZone || null,
            currency: settings?.currency || 'EGP',
            lastUpdated: (settings as any)?.updatedAt || null,
        };
    }

    // ============ CONFIGURATION HEALTH SCORE ============

    async getConfigurationHealthScore(): Promise<ConfigurationHealthScore> {
        const [
            statusOverview,
            insuranceAnalysis,
            payGradeAnalysis,
            allowanceAnalysis,
            policyAnalysis,
            companySettings,
        ] = await Promise.all([
            this.getConfigStatusOverview(),
            this.getInsuranceAnalysis(),
            this.getPayGradeAnalysis(),
            this.getAllowanceAnalysis(),
            this.getPolicyAnalysis(),
            this.getCompanySettingsAnalysis(),
        ]);

        const categories: ConfigurationHealthScore['categories'] = [];
        const criticalIssues: string[] = [];
        const recommendations: string[] = [];

        // Calculate category scores
        for (const cat of statusOverview) {
            const issues: string[] = [];
            const suggestions: string[] = [];
            let score = 100;

            // Penalize for draft configs
            if (cat.draft > 0) {
                score -= (cat.draft / Math.max(cat.total, 1)) * 30;
                issues.push(`${cat.draft} configurations pending approval`);
                suggestions.push(`Review and approve pending ${cat.category.toLowerCase()}`);
            }

            // Penalize for rejections
            if (cat.rejected > 0) {
                score -= (cat.rejected / Math.max(cat.total, 1)) * 20;
                issues.push(`${cat.rejected} configurations rejected`);
                suggestions.push(`Address rejected ${cat.category.toLowerCase()} and resubmit`);
            }

            // Bonus for high approval rate
            if (cat.approvalRate >= 80) {
                score = Math.min(score + 5, 100);
            }

            // Check for no configurations
            if (cat.total === 0) {
                score = 0;
                criticalIssues.push(`No ${cat.category} configured`);
                suggestions.push(`Configure at least one ${cat.category.toLowerCase()}`);
            }

            categories.push({
                category: cat.category,
                score: Math.max(0, Math.round(score)),
                issues,
                suggestions,
            });
        }

        // Check insurance coverage gaps
        if (insuranceAnalysis.coverageGaps.length > 0) {
            criticalIssues.push(`Insurance coverage gaps detected: ${insuranceAnalysis.coverageGaps.length} gaps`);
            recommendations.push('Review insurance brackets to ensure complete salary range coverage');
        }

        // Check company settings
        if (!companySettings.hasSettings) {
            criticalIssues.push('Company-wide settings not configured');
            recommendations.push('Configure company pay date, timezone, and currency');
        }

        // Check minimum salary compliance
        if (payGradeAnalysis.minSalary < 6000) {
            criticalIssues.push('Some pay grades below minimum wage threshold');
            recommendations.push('Update pay grades to meet minimum wage requirements');
        }

        // Calculate overall score
        const avgScore = categories.length > 0
            ? categories.reduce((sum, c) => sum + c.score, 0) / categories.length
            : 0;
        const overallScore = Math.round(avgScore - (criticalIssues.length * 5));

        return {
            overallScore: Math.max(0, Math.min(100, overallScore)),
            categories,
            criticalIssues,
            recommendations,
        };
    }

    // ============ COMPREHENSIVE DASHBOARD ============

    async getDashboardSummary(): Promise<ConfigurationDashboardSummary> {
        const [
            statusOverview,
            allowanceAnalysis,
            taxRulesAnalysis,
            insuranceAnalysis,
            payGradeAnalysis,
            payTypeAnalysis,
            signingBonusAnalysis,
            policyAnalysis,
            terminationBenefits,
            approvalMetrics,
            companySettings,
            healthScore,
        ] = await Promise.all([
            this.getConfigStatusOverview(),
            this.getAllowanceAnalysis(),
            this.getTaxRulesAnalysis(),
            this.getInsuranceAnalysis(),
            this.getPayGradeAnalysis(),
            this.getPayTypeAnalysis(),
            this.getSigningBonusAnalysis(),
            this.getPolicyAnalysis(),
            this.getTerminationBenefitsAnalysis(),
            this.getApprovalWorkflowMetrics(),
            this.getCompanySettingsAnalysis(),
            this.getConfigurationHealthScore(),
        ]);

        // Calculate overview
        const totalConfigurations = statusOverview.reduce((sum, s) => sum + s.total, 0);
        const approvedConfigurations = statusOverview.reduce((sum, s) => sum + s.approved, 0);
        const pendingApprovals = statusOverview.reduce((sum, s) => sum + s.draft, 0);
        const rejectedConfigurations = statusOverview.reduce((sum, s) => sum + s.rejected, 0);

        const lastConfigUpdate = statusOverview
            .map(s => s.lastUpdated)
            .filter(d => d !== null)
            .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0] || null;

        return {
            overview: {
                totalConfigurations,
                approvedConfigurations,
                pendingApprovals,
                rejectedConfigurations,
                overallApprovalRate: totalConfigurations > 0
                    ? (approvedConfigurations / totalConfigurations) * 100
                    : 0,
                lastConfigUpdate,
            },
            statusOverview,
            allowanceAnalysis,
            taxRulesAnalysis,
            insuranceAnalysis,
            payGradeAnalysis,
            payTypeAnalysis,
            signingBonusAnalysis,
            policyAnalysis,
            terminationBenefits,
            approvalMetrics,
            companySettings,
            healthScore,
        };
    }
}
