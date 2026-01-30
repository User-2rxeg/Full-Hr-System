import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Recruitment Models
import { Application, ApplicationDocument } from '../../recruitment/models/application.schema';
import { JobRequisition, JobRequisitionDocument } from '../../recruitment/models/job-requisition.schema';
import { Offer, OfferDocument } from '../../recruitment/models/offer.schema';
import { Contract, ContractDocument } from '../../recruitment/models/contract.schema';
import { Onboarding, OnboardingDocument } from '../../recruitment/models/onboarding.schema';
import { TerminationRequest, TerminationRequestDocument } from '../../recruitment/models/termination-request.schema';
import { Interview, InterviewDocument } from '../../recruitment/models/interview.schema';

// Employee Models
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';

// Enums
import { ApplicationStatus } from '../../recruitment/enums/application-status.enum';
import { OfferFinalStatus } from '../../recruitment/enums/offer-final-status.enum';
import { OnboardingTaskStatus } from '../../recruitment/enums/onboarding-task-status.enum';
import { TerminationStatus } from '../../recruitment/enums/termination-status.enum';
import { TerminationInitiation } from '../../recruitment/enums/termination-initiation.enum';
import { EmployeeStatus } from '../../employee/enums/employee-profile.enums';

// ============ INTERFACES ============

export interface QualityOfHireMetrics {
    hiringCohort: string;
    totalHires: number;
    stillEmployed: number;
    retentionRate: number;
    avgOnboardingDays: number;
    onboardingCompletionRate: number;
    voluntaryExits: number;
    involuntaryExits: number;
    avgTenureDays: number;
    qualityScore: number; // 0-100 composite score
}

export interface CohortAnalysis {
    cohort: string;
    hireMonth: string;
    totalHired: number;
    stillActive: number;
    left30Days: number;
    left90Days: number;
    left180Days: number;
    leftYear: number;
    retentionRate30: number;
    retentionRate90: number;
    retentionRate180: number;
    retentionRateYear: number;
}

export interface EmployeeJourneyMetrics {
    employeeId: string;
    employeeName: string;
    department: string;
    applicationDate: Date | null;
    interviewCount: number;
    offerDate: Date | null;
    contractDate: Date | null;
    startDate: Date | null;
    onboardingCompletionDate: Date | null;
    terminationDate: Date | null;
    currentStatus: 'APPLIED' | 'INTERVIEWING' | 'OFFERED' | 'CONTRACTED' | 'ONBOARDING' | 'ACTIVE' | 'TERMINATED';
    timeToHireDays: number | null;
    onboardingDays: number | null;
    tenureDays: number | null;
    totalJourneyDays: number | null;
}

export interface SourceToRetentionAnalysis {
    source: string;
    totalHires: number;
    stillActive: number;
    retentionRate: number;
    avgTenureDays: number;
    avgOnboardingScore: number;
    exitedWithin90Days: number;
    early90DayAttrition: number;
}

export interface HiringChannelROI {
    source: string;
    applicationsReceived: number;
    hiresMade: number;
    conversionRate: number;
    avgTimeToHire: number;
    retentionRate1Year: number;
    costPerHire: number; // Estimated
    qualityScore: number;
    roiScore: number; // Composite
}

export interface DepartmentLifecycleMetrics {
    department: string;
    openPositions: number;
    applicationsLast30Days: number;
    hiresLast90Days: number;
    avgTimeToFill: number;
    onboardingInProgress: number;
    avgOnboardingDays: number;
    activeEmployees: number;
    terminationsLast90Days: number;
    attritionRate: number;
    healthScore: number;
}

export interface PipelineFlowAnalysis {
    stage: string;
    currentCount: number;
    avgDaysInStage: number;
    conversionToNext: number;
    dropoffRate: number;
    bottleneckScore: number;
}

export interface LifecycleOverview {
    totalOpenPositions: number;
    totalActiveApplications: number;
    totalPendingOffers: number;
    totalOnboarding: number;
    totalActiveEmployees: number;
    totalPendingTerminations: number;
    avgTimeToHire: number;
    avgOnboardingDays: number;
    overallRetentionRate: number;
    monthlyHires: number;
    monthlyTerminations: number;
    netGrowth: number;
}

export interface LifecycleDashboardSummary {
    overview: LifecycleOverview;
    qualityOfHire: QualityOfHireMetrics[];
    cohortAnalysis: CohortAnalysis[];
    sourceRetention: SourceToRetentionAnalysis[];
    departmentMetrics: DepartmentLifecycleMetrics[];
    pipelineFlow: PipelineFlowAnalysis[];
    recentJourneys: EmployeeJourneyMetrics[];
}

// ============ SERVICE ============

@Injectable()
export class LifecycleAnalyticsService {
    constructor(
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectModel(JobRequisition.name) private requisitionModel: Model<JobRequisitionDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(Onboarding.name) private onboardingModel: Model<OnboardingDocument>,
        @InjectModel(TerminationRequest.name) private terminationModel: Model<TerminationRequestDocument>,
        @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    ) { }

    /**
     * Get lifecycle overview metrics
     */
    async getLifecycleOverview(): Promise<LifecycleOverview> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const [openPositions, activeApplications, pendingOffers, onboardings, employees, terminations] = await Promise.all([
            this.requisitionModel.countDocuments({ status: 'open' }),
            this.applicationModel.countDocuments({
                status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.IN_PROCESS] }
            }),
            this.offerModel.countDocuments({ finalStatus: OfferFinalStatus.PENDING }),
            this.onboardingModel.countDocuments({ completed: false }),
            this.employeeModel.countDocuments({ status: EmployeeStatus.ACTIVE }),
            this.terminationModel.countDocuments({
                status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] }
            }),
        ]);

        // Monthly stats
        const monthlyHires = await this.contractModel.countDocuments({
            createdAt: { $gte: monthStart }
        });

        const monthlyTerminations = await this.terminationModel.countDocuments({
            status: TerminationStatus.APPROVED,
            terminationDate: { $gte: monthStart }
        });

        // Calculate averages
        const completedOnboardings = await this.onboardingModel.find({ completed: true }).lean();
        let totalOnboardingDays = 0;
        for (const onb of completedOnboardings) {
            if ((onb as any).createdAt && onb.completedAt) {
                totalOnboardingDays += this.daysBetween(new Date((onb as any).createdAt), new Date(onb.completedAt));
            }
        }
        const avgOnboardingDays = completedOnboardings.length > 0 ? totalOnboardingDays / completedOnboardings.length : 0;

        // Calculate retention rate
        const hiredLast365 = await this.contractModel.countDocuments({
            createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
        });
        const terminatedLast365 = await this.terminationModel.countDocuments({
            status: TerminationStatus.APPROVED,
            terminationDate: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
        });
        const retentionRate = hiredLast365 > 0 ? Math.round(((hiredLast365 - terminatedLast365) / hiredLast365) * 100) : 100;

        // Avg time to hire (using accepted offers)
        const acceptedOffers = await this.offerModel.find({ 
            finalStatus: OfferFinalStatus.APPROVED 
        }).populate('applicationId').lean();
        
        let totalTimeToHire = 0;
        let hireCount = 0;
        for (const offer of acceptedOffers) {
            const app = offer.applicationId as any;
            if (app?.createdAt && (offer as any).createdAt) {
                totalTimeToHire += this.daysBetween(new Date(app.createdAt), new Date((offer as any).createdAt));
                hireCount++;
            }
        }
        const avgTimeToHire = hireCount > 0 ? Math.round(totalTimeToHire / hireCount) : 0;

        return {
            totalOpenPositions: openPositions,
            totalActiveApplications: activeApplications,
            totalPendingOffers: pendingOffers,
            totalOnboarding: onboardings,
            totalActiveEmployees: employees,
            totalPendingTerminations: terminations,
            avgTimeToHire,
            avgOnboardingDays: Math.round(avgOnboardingDays),
            overallRetentionRate: retentionRate,
            monthlyHires,
            monthlyTerminations,
            netGrowth: monthlyHires - monthlyTerminations,
        };
    }

    /**
     * Get quality of hire metrics by cohort
     */
    async getQualityOfHireMetrics(months: number = 6): Promise<QualityOfHireMetrics[]> {
        const now = new Date();
        const metrics: QualityOfHireMetrics[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const cohort = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            // Get contracts created in this month (hires)
            const contracts = await this.contractModel.find({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            }).lean();

            // Get onboarding records to find employee IDs for these contracts
            const contractIds = contracts.map(c => c._id);
            const onboardingsForContracts = await this.onboardingModel.find({
                contractId: { $in: contractIds }
            }).lean();
            
            const employeeIds = onboardingsForContracts.map(o => o.employeeId).filter(Boolean);
            
            // Get onboarding data
            const onboardings = await this.onboardingModel.find({
                employeeId: { $in: employeeIds }
            }).lean();

            // Get termination data
            const terminations = await this.terminationModel.find({
                employeeId: { $in: employeeIds },
                status: TerminationStatus.APPROVED
            }).lean();

            // Check current employee status
            const activeEmployees = await this.employeeModel.countDocuments({
                _id: { $in: employeeIds },
                status: EmployeeStatus.ACTIVE
            });

            // Calculate metrics
            let totalOnboardingDays = 0;
            let completedOnboarding = 0;
            for (const onb of onboardings) {
                if (onb.completed && (onb as any).createdAt && onb.completedAt) {
                    totalOnboardingDays += this.daysBetween(new Date((onb as any).createdAt), new Date(onb.completedAt));
                    completedOnboarding++;
                }
            }

            const voluntaryExits = terminations.filter(t => t.initiator === TerminationInitiation.EMPLOYEE).length;
            const involuntaryExits = terminations.length - voluntaryExits;

            // Calculate avg tenure for those who left
            let totalTenure = 0;
            let tenureCount = 0;
            for (const term of terminations) {
                const onb = onboardingsForContracts.find(o => o.employeeId?.toString() === term.employeeId?.toString());
                const contract = onb ? contracts.find(c => c._id.toString() === onb.contractId?.toString()) : null;
                if (contract && term.terminationDate) {
                    totalTenure += this.daysBetween(new Date((contract as any).createdAt), new Date(term.terminationDate));
                    tenureCount++;
                }
            }

            const retentionRate = contracts.length > 0 ? (activeEmployees / contracts.length) * 100 : 100;
            const onboardingCompletion = onboardings.length > 0 ? (completedOnboarding / onboardings.length) * 100 : 0;
            
            // Quality score: weighted average of retention, onboarding completion, and voluntary exit rate
            const voluntaryExitPenalty = contracts.length > 0 ? (voluntaryExits / contracts.length) * 30 : 0;
            const qualityScore = Math.max(0, Math.min(100, 
                (retentionRate * 0.5) + 
                (onboardingCompletion * 0.3) + 
                (20 - voluntaryExitPenalty)
            ));

            metrics.push({
                hiringCohort: cohort,
                totalHires: contracts.length,
                stillEmployed: activeEmployees,
                retentionRate: Math.round(retentionRate),
                avgOnboardingDays: completedOnboarding > 0 ? Math.round(totalOnboardingDays / completedOnboarding) : 0,
                onboardingCompletionRate: Math.round(onboardingCompletion),
                voluntaryExits,
                involuntaryExits,
                avgTenureDays: tenureCount > 0 ? Math.round(totalTenure / tenureCount) : 0,
                qualityScore: Math.round(qualityScore),
            });
        }

        return metrics;
    }

    /**
     * Get cohort retention analysis
     */
    async getCohortAnalysis(months: number = 12): Promise<CohortAnalysis[]> {
        const now = new Date();
        const cohorts: CohortAnalysis[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const cohort = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            // Get employees hired in this month
            const employees = await this.employeeModel.find({
                dateOfHire: { $gte: monthStart, $lte: monthEnd }
            }).lean();

            const employeeIds = employees.map(e => e._id);

            // Get terminations for these employees
            const terminations = await this.terminationModel.find({
                employeeId: { $in: employeeIds },
                status: TerminationStatus.APPROVED
            }).lean();

            // Calculate retention at different intervals
            const terminationDates = new Map<string, Date>();
            for (const term of terminations) {
                if (term.terminationDate) {
                    terminationDates.set(term.employeeId.toString(), new Date(term.terminationDate));
                }
            }

            let left30 = 0, left90 = 0, left180 = 0, leftYear = 0;

            for (const emp of employees) {
                const hireDate = new Date(emp.dateOfHire!);
                const termDate = terminationDates.get(emp._id.toString());
                
                if (termDate) {
                    const daysToExit = this.daysBetween(hireDate, termDate);
                    if (daysToExit <= 30) left30++;
                    if (daysToExit <= 90) left90++;
                    if (daysToExit <= 180) left180++;
                    if (daysToExit <= 365) leftYear++;
                }
            }

            const totalHired = employees.length || 1;
            const stillActive = totalHired - terminations.length;

            cohorts.push({
                cohort,
                hireMonth: cohort,
                totalHired: employees.length,
                stillActive,
                left30Days: left30,
                left90Days: left90,
                left180Days: left180,
                leftYear: leftYear,
                retentionRate30: Math.round(((totalHired - left30) / totalHired) * 100),
                retentionRate90: Math.round(((totalHired - left90) / totalHired) * 100),
                retentionRate180: Math.round(((totalHired - left180) / totalHired) * 100),
                retentionRateYear: Math.round(((totalHired - leftYear) / totalHired) * 100),
            });
        }

        return cohorts;
    }

    /**
     * Get source to retention analysis
     */
    async getSourceToRetentionAnalysis(): Promise<SourceToRetentionAnalysis[]> {
        // Get all applications that resulted in hires
        const hiredApplications = await this.applicationModel.find({
            status: ApplicationStatus.HIRED
        }).lean();

        // For each hired application, find the employee through offer→contract→onboarding chain
        const sourceMap = new Map<string, {
            hires: any[];
            employeeIds: Types.ObjectId[];
        }>();

        for (const app of hiredApplications) {
            const source = app.source || 'Unknown';
            
            if (!sourceMap.has(source)) {
                sourceMap.set(source, { hires: [], employeeIds: [] });
            }

            // Find offer for this application
            const offer = await this.offerModel.findOne({ applicationId: app._id }).lean();
            if (!offer) continue;

            // Find contract for this offer
            const contract = await this.contractModel.findOne({ offerId: offer._id }).lean();
            if (!contract) continue;

            // Find onboarding to get employee ID
            const onboarding = await this.onboardingModel.findOne({ contractId: contract._id }).lean();
            if (!onboarding) continue;

            const data = sourceMap.get(source)!;
            data.hires.push(app);
            data.employeeIds.push(onboarding.employeeId);
        }

        const analysis: SourceToRetentionAnalysis[] = [];

        for (const [source, data] of sourceMap) {
            // Get active employees from this source
            const activeCount = await this.employeeModel.countDocuments({
                _id: { $in: data.employeeIds },
                status: EmployeeStatus.ACTIVE
            });

            // Get terminations
            const terminations = await this.terminationModel.find({
                employeeId: { $in: data.employeeIds },
                status: TerminationStatus.APPROVED
            }).lean();

            // Calculate avg tenure
            let totalTenure = 0;
            let tenureCount = 0;
            const days90Ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            let exitedWithin90 = 0;

            for (const term of terminations) {
                const emp = await this.employeeModel.findById(term.employeeId).lean();
                if (emp?.dateOfHire && term.terminationDate) {
                    const tenure = this.daysBetween(new Date(emp.dateOfHire), new Date(term.terminationDate));
                    totalTenure += tenure;
                    tenureCount++;
                    if (tenure <= 90) exitedWithin90++;
                }
            }

            // Get onboarding scores
            const onboardings = await this.onboardingModel.find({
                employeeId: { $in: data.employeeIds }
            }).lean();

            let totalOnboardingScore = 0;
            let onbCount = 0;
            for (const onb of onboardings) {
                const tasks = onb.tasks || [];
                const completed = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
                const score = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
                totalOnboardingScore += score;
                onbCount++;
            }

            const totalHires = data.hires.length || 1;

            analysis.push({
                source,
                totalHires: data.hires.length,
                stillActive: activeCount,
                retentionRate: Math.round((activeCount / totalHires) * 100),
                avgTenureDays: tenureCount > 0 ? Math.round(totalTenure / tenureCount) : 0,
                avgOnboardingScore: onbCount > 0 ? Math.round(totalOnboardingScore / onbCount) : 0,
                exitedWithin90Days: exitedWithin90,
                early90DayAttrition: Math.round((exitedWithin90 / totalHires) * 100),
            });
        }

        return analysis.sort((a, b) => b.totalHires - a.totalHires);
    }

    /**
     * Get department lifecycle metrics
     */
    async getDepartmentLifecycleMetrics(): Promise<DepartmentLifecycleMetrics[]> {
        const now = new Date();
        const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Get all departments from employees
        const employees = await this.employeeModel.find({ status: EmployeeStatus.ACTIVE })
            .populate('primaryDepartmentId', 'name')
            .lean();

        const deptMap = new Map<string, {
            activeCount: number;
        }>();

        for (const emp of employees) {
            const dept = (emp as any).primaryDepartmentId?.name || 'Unknown';
            if (!deptMap.has(dept)) {
                deptMap.set(dept, { activeCount: 0 });
            }
            deptMap.get(dept)!.activeCount++;
        }

        const metrics: DepartmentLifecycleMetrics[] = [];

        for (const [dept, data] of deptMap) {
            // Get requisitions for this department
            const openPositions = await this.requisitionModel.countDocuments({
                status: 'open',
                department: dept
            });

            // Get applications last 30 days
            const applications = await this.applicationModel.countDocuments({
                createdAt: { $gte: days30Ago },
                // Would need to join with requisition for department
            });

            // Get hires last 90 days (contracts)
            const recentContracts = await this.contractModel.find({
                createdAt: { $gte: days90Ago }
            }).lean();

            // Get onboardings for these contracts to find employees
            const recentContractIds = recentContracts.map(c => c._id);
            const recentOnboardings = await this.onboardingModel.find({
                contractId: { $in: recentContractIds }
            }).populate({
                path: 'employeeId',
                populate: { path: 'primaryDepartmentId', select: 'name' }
            }).lean();

            const deptHires = recentOnboardings.filter(o => (o.employeeId as any)?.primaryDepartmentId?.name === dept).length;

            // Get onboarding in progress
            const onboardingInProgress = await this.onboardingModel.find({ completed: false })
                .populate({
                    path: 'employeeId',
                    populate: { path: 'primaryDepartmentId', select: 'name' }
                }).lean();

            const deptOnboarding = onboardingInProgress.filter(o => (o.employeeId as any)?.primaryDepartmentId?.name === dept);

            // Get completed onboardings for avg days
            const completedOnboardings = await this.onboardingModel.find({ completed: true })
                .populate({
                    path: 'employeeId',
                    populate: { path: 'primaryDepartmentId', select: 'name' }
                }).lean();

            const deptCompletedOnb = completedOnboardings.filter(o => (o.employeeId as any)?.primaryDepartmentId?.name === dept);
            let totalOnbDays = 0;
            for (const onb of deptCompletedOnb) {
                if ((onb as any).createdAt && onb.completedAt) {
                    totalOnbDays += this.daysBetween(new Date((onb as any).createdAt), new Date(onb.completedAt));
                }
            }
            const avgOnbDays = deptCompletedOnb.length > 0 ? totalOnbDays / deptCompletedOnb.length : 0;

            // Get terminations last 90 days
            const terminations = await this.terminationModel.find({
                status: TerminationStatus.APPROVED,
                terminationDate: { $gte: days90Ago }
            }).populate({
                path: 'employeeId',
                populate: { path: 'primaryDepartmentId', select: 'name' }
            }).lean();

            const deptTerminations = terminations.filter(t => (t.employeeId as any)?.primaryDepartmentId?.name === dept).length;
            const attritionRate = data.activeCount > 0 
                ? (deptTerminations / (data.activeCount + deptTerminations)) * 100 
                : 0;

            // Health score
            const healthScore = this.calculateDepartmentHealthScore(
                openPositions,
                deptHires,
                avgOnbDays,
                attritionRate
            );

            metrics.push({
                department: dept,
                openPositions,
                applicationsLast30Days: applications, // Simplified
                hiresLast90Days: deptHires,
                avgTimeToFill: 0, // Would need more data
                onboardingInProgress: deptOnboarding.length,
                avgOnboardingDays: Math.round(avgOnbDays),
                activeEmployees: data.activeCount,
                terminationsLast90Days: deptTerminations,
                attritionRate: Math.round(attritionRate),
                healthScore,
            });
        }

        return metrics.sort((a, b) => b.activeEmployees - a.activeEmployees);
    }

    /**
     * Get pipeline flow analysis
     */
    async getPipelineFlowAnalysis(): Promise<PipelineFlowAnalysis[]> {
        // Define pipeline stages based on actual ApplicationStatus enum
        const stages = [
            { stage: 'Applied', statusFilter: ApplicationStatus.SUBMITTED },
            { stage: 'In Process', statusFilter: ApplicationStatus.IN_PROCESS },
            { stage: 'Offered', statusFilter: ApplicationStatus.OFFER },
            { stage: 'Hired', statusFilter: ApplicationStatus.HIRED },
            { stage: 'Rejected', statusFilter: ApplicationStatus.REJECTED },
        ];

        const flow: PipelineFlowAnalysis[] = [];
        let previousCount = 0;

        for (let i = 0; i < stages.length; i++) {
            const { stage, statusFilter } = stages[i];
            
            const count = await this.applicationModel.countDocuments({ status: statusFilter });
            
            // Calculate conversion rate
            const conversionToNext = i < stages.length - 1
                ? (count > 0 ? Math.round((previousCount / count) * 100) : 0)
                : 0;
            
            const dropoffRate = previousCount > 0
                ? Math.round(((previousCount - count) / previousCount) * 100)
                : 0;

            // Calculate avg days in stage (simplified - would need stage timestamps)
            const avgDays = 3 * (i + 1); // Placeholder

            // Bottleneck score: higher when dropoff is high and count is low
            const bottleneckScore = Math.round((dropoffRate * 0.7) + (100 - conversionToNext) * 0.3);

            flow.push({
                stage,
                currentCount: count,
                avgDaysInStage: avgDays,
                conversionToNext: i === 0 ? 100 : conversionToNext,
                dropoffRate: i === 0 ? 0 : dropoffRate,
                bottleneckScore,
            });

            previousCount = count;
        }

        return flow;
    }

    /**
     * Get recent employee journeys
     */
    async getRecentEmployeeJourneys(limit: number = 20): Promise<EmployeeJourneyMetrics[]> {
        const employees = await this.employeeModel.find()
            .populate('primaryDepartmentId', 'name')
            .sort({ dateOfHire: -1 })
            .limit(limit)
            .lean();

        const journeys: EmployeeJourneyMetrics[] = [];

        for (const emp of employees) {
            // Find onboarding first (since we need it to find contract)
            const onboarding = await this.onboardingModel.findOne({ employeeId: emp._id }).lean();

            // Find contract via onboarding
            const contract = onboarding 
                ? await this.contractModel.findById(onboarding.contractId).lean()
                : null;

            // Find offer from contract
            const offer = contract
                ? await this.offerModel.findById(contract.offerId).lean()
                : null;

            // Find application from offer
            const application = offer
                ? await this.applicationModel.findById(offer.applicationId).lean()
                : null;

            // Count interviews
            const interviewCount = application
                ? await this.interviewModel.countDocuments({ applicationId: application._id })
                : 0;

            // Find termination
            const termination = await this.terminationModel.findOne({
                employeeId: emp._id,
                status: TerminationStatus.APPROVED
            }).lean();

            // Determine status
            let currentStatus: EmployeeJourneyMetrics['currentStatus'] = 'ACTIVE';
            if (termination) currentStatus = 'TERMINATED';
            else if (!onboarding?.completed) currentStatus = 'ONBOARDING';
            else if (!contract) currentStatus = 'CONTRACTED';
            else if (!offer) currentStatus = 'OFFERED';
            else if (!application) currentStatus = 'APPLIED';
            
            if (emp.status === EmployeeStatus.ACTIVE && onboarding?.completed) currentStatus = 'ACTIVE';

            // Calculate times - use createdAt from Application since appliedAt doesn't exist
            const applicationDate = application ? new Date((application as any).createdAt) : null;
            const offerDate = offer ? new Date((offer as any).createdAt) : null;
            const contractDate = contract ? new Date((contract as any).createdAt) : null;
            const startDate = emp.dateOfHire ? new Date(emp.dateOfHire) : null;
            const onboardingCompletionDate = onboarding?.completedAt ? new Date(onboarding.completedAt) : null;
            const terminationDate = termination?.terminationDate ? new Date(termination.terminationDate) : null;

            const timeToHireDays = applicationDate && startDate
                ? this.daysBetween(applicationDate, startDate)
                : null;

            const onboardingDays = startDate && onboardingCompletionDate
                ? this.daysBetween(startDate, onboardingCompletionDate)
                : null;

            const tenureDays = startDate && terminationDate
                ? this.daysBetween(startDate, terminationDate)
                : startDate
                    ? this.daysBetween(startDate, new Date())
                    : null;

            const totalJourneyDays = applicationDate
                ? this.daysBetween(applicationDate, terminationDate || new Date())
                : null;

            journeys.push({
                employeeId: emp._id.toString(),
                employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                department: (emp as any).primaryDepartmentId?.name || 'Unknown',
                applicationDate,
                interviewCount,
                offerDate,
                contractDate,
                startDate,
                onboardingCompletionDate,
                terminationDate,
                currentStatus,
                timeToHireDays,
                onboardingDays,
                tenureDays,
                totalJourneyDays,
            });
        }

        return journeys;
    }

    /**
     * Get comprehensive dashboard summary
     */
    async getDashboardSummary(): Promise<LifecycleDashboardSummary> {
        const [overview, qualityOfHire, cohortAnalysis, sourceRetention, departmentMetrics, pipelineFlow, recentJourneys] =
            await Promise.all([
                this.getLifecycleOverview(),
                this.getQualityOfHireMetrics(6),
                this.getCohortAnalysis(12),
                this.getSourceToRetentionAnalysis(),
                this.getDepartmentLifecycleMetrics(),
                this.getPipelineFlowAnalysis(),
                this.getRecentEmployeeJourneys(10),
            ]);

        return {
            overview,
            qualityOfHire,
            cohortAnalysis,
            sourceRetention,
            departmentMetrics,
            pipelineFlow,
            recentJourneys,
        };
    }

    // ============ HELPER METHODS ============

    private daysBetween(date1: Date, date2: Date): number {
        const diff = Math.abs(date2.getTime() - date1.getTime());
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }

    private calculateDepartmentHealthScore(
        openPositions: number,
        hires: number,
        avgOnboardingDays: number,
        attritionRate: number
    ): number {
        // Lower is better for: open positions, onboarding days, attrition
        // Higher is better for: hires
        
        let score = 100;
        
        // Penalize high open positions
        score -= Math.min(20, openPositions * 2);
        
        // Reward hires
        score += Math.min(20, hires * 5);
        
        // Penalize long onboarding
        if (avgOnboardingDays > 14) {
            score -= Math.min(15, (avgOnboardingDays - 14) * 0.5);
        }
        
        // Penalize high attrition
        score -= attritionRate * 0.5;

        return Math.max(0, Math.min(100, Math.round(score)));
    }
}
