import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { JobRequisition, JobRequisitionDocument } from '../../recruitment/models/job-requisition.schema';
import { Application, ApplicationDocument, ApplicationSource } from '../../recruitment/models/application.schema';
import { ApplicationStatusHistory, ApplicationStatusHistoryDocument } from '../../recruitment/models/application-history.schema';
import { Referral, ReferralDocument } from '../../recruitment/models/referral.schema';
import { Interview, InterviewDocument } from '../../recruitment/models/interview.schema';
import { AssessmentResult, AssessmentResultDocument } from '../../recruitment/models/assessment-result.schema';
import { Offer, OfferDocument } from '../../recruitment/models/offer.schema';
import { Contract, ContractDocument } from '../../recruitment/models/contract.schema';

// Enums
import { ApplicationStage } from '../../recruitment/enums/application-stage.enum';
import { ApplicationStatus } from '../../recruitment/enums/application-status.enum';
import { OfferResponseStatus } from '../../recruitment/enums/offer-response-status.enum';

// ============ INTERFACES ============

export interface FunnelStageMetrics {
    stage: string;
    count: number;
    percentage: number;
    avgDaysInStage: number;
    dropOffRate: number;
}

export interface RecruitmentFunnelAnalytics {
    totalApplications: number;
    stages: FunnelStageMetrics[];
    overallConversionRate: number;
    avgTimeToHire: number;
    medianTimeToHire: number;
}

export interface SourceEffectivenessMetrics {
    source: string;
    totalApplications: number;
    interviewRate: number;
    offerRate: number;
    hireRate: number;
    avgInterviewScore: number;
    qualityScore: number;
    avgTimeToHire: number;
}

export interface TimeToHireBreakdown {
    requisitionId: string;
    requisitionTitle: string;
    department: string;
    daysToFirstApplication: number;
    daysScreeningToInterview: number;
    daysInterviewToOffer: number;
    daysOfferToAcceptance: number;
    totalDaysToHire: number;
    hiredCount: number;
}

export interface InterviewerCalibrationMetrics {
    interviewerId: string;
    interviewerName: string;
    totalInterviews: number;
    avgScore: number;
    scoreStdDev: number;
    recommendationAccuracy: number;
    avgFeedbackTime: number;
    calibrationStatus: 'CALIBRATED' | 'LENIENT' | 'HARSH' | 'INSUFFICIENT_DATA';
}

export interface RequisitionHealthScore {
    requisitionId: string;
    title: string;
    department: string;
    healthScore: number;
    healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    components: {
        applicationVolume: number;
        qualityApplicants: number;
        pipelineVelocity: number;
        interviewScheduleRate: number;
    };
    daysOpen: number;
    isAtRisk: boolean;
    riskFactors: string[];
}

export interface StageBottleneck {
    stage: string;
    avgDaysInStage: number;
    medianDaysInStage: number;
    applicationsStuck: number;
    percentageStuck: number;
    isBottleneck: boolean;
}

export interface RecruitmentTrend {
    period: string;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
    avgTimeToHire: number;
}

export interface RecruitmentDashboardSummary {
    overview: {
        totalOpenRequisitions: number;
        totalApplicationsThisMonth: number;
        totalHiresThisMonth: number;
        avgTimeToHire: number;
        offerAcceptanceRate: number;
    };
    funnel: RecruitmentFunnelAnalytics;
    sourceEffectiveness: SourceEffectivenessMetrics[];
    bottlenecks: StageBottleneck[];
    atRiskRequisitions: RequisitionHealthScore[];
    trends: RecruitmentTrend[];
}

// ============ SERVICE ============

@Injectable()
export class RecruitmentAnalyticsService {
    constructor(
        @InjectModel(JobRequisition.name) private requisitionModel: Model<JobRequisitionDocument>,
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectModel(ApplicationStatusHistory.name) private historyModel: Model<ApplicationStatusHistoryDocument>,
        @InjectModel(Referral.name) private referralModel: Model<ReferralDocument>,
        @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
        @InjectModel(AssessmentResult.name) private assessmentModel: Model<AssessmentResultDocument>,
        @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    ) { }

    /**
     * Get comprehensive recruitment funnel analytics
     */
    async getFunnelAnalytics(startDate?: Date, endDate?: Date): Promise<RecruitmentFunnelAnalytics> {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        const createdAtFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

        const applications = await this.applicationModel.find(createdAtFilter).lean();
        const totalApplications = applications.length;

        if (totalApplications === 0) {
            return {
                totalApplications: 0,
                stages: [],
                overallConversionRate: 0,
                avgTimeToHire: 0,
                medianTimeToHire: 0,
            };
        }

        // Get all stage transitions for timing analysis
        const histories = await this.historyModel.find({
            applicationId: { $in: applications.map(a => a._id) }
        }).lean();

        // Calculate stage metrics
        const stageOrder = Object.values(ApplicationStage);
        const stages: FunnelStageMetrics[] = [];
        
        for (let i = 0; i < stageOrder.length; i++) {
            const stage = stageOrder[i];
            const inStage = applications.filter(a => a.currentStage === stage || 
                this.hasPassedStage(a, stage, histories)).length;
            
            // Calculate avg days in stage from history
            const stageTransitions = histories.filter(h => h.newStage === stage);
            const avgDays = this.calculateAvgDaysInStage(stage, stageTransitions, histories);
            
            const prevCount = i > 0 ? stages[i - 1].count : totalApplications;
            const dropOffRate = prevCount > 0 ? ((prevCount - inStage) / prevCount) * 100 : 0;

            stages.push({
                stage,
                count: inStage,
                percentage: (inStage / totalApplications) * 100,
                avgDaysInStage: avgDays,
                dropOffRate: Math.max(0, dropOffRate),
            });
        }

        // Calculate hired count and conversion rate
        const hiredApps = applications.filter(a => a.status === ApplicationStatus.HIRED);
        const overallConversionRate = (hiredApps.length / totalApplications) * 100;

        // Calculate time-to-hire
        const timesToHire = await this.calculateTimesToHire(hiredApps);
        const avgTimeToHire = timesToHire.length > 0 
            ? timesToHire.reduce((a, b) => a + b, 0) / timesToHire.length 
            : 0;
        const medianTimeToHire = this.calculateMedian(timesToHire);

        return {
            totalApplications,
            stages,
            overallConversionRate,
            avgTimeToHire,
            medianTimeToHire,
        };
    }

    /**
     * Get source effectiveness metrics
     */
    async getSourceEffectiveness(startDate?: Date, endDate?: Date): Promise<SourceEffectivenessMetrics[]> {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        const createdAtFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

        const applications = await this.applicationModel.find(createdAtFilter).lean();
        const interviews = await this.interviewModel.find().lean();
        const offers = await this.offerModel.find().lean();
        const assessments = await this.assessmentModel.find().lean();

        // Group by source
        const sourceGroups = new Map<string, ApplicationDocument[]>();
        for (const app of applications) {
            const source = app.source || ApplicationSource.OTHER;
            if (!sourceGroups.has(source)) {
                sourceGroups.set(source, []);
            }
            sourceGroups.get(source)!.push(app as any);
        }

        const metrics: SourceEffectivenessMetrics[] = [];
        
        for (const [source, apps] of sourceGroups) {
            const appIds = apps.map(a => (a as any)._id.toString());
            
            // Count interviews for these applications
            const sourceInterviews = interviews.filter(i => 
                appIds.includes(i.applicationId?.toString())
            );
            
            // Count offers
            const sourceOffers = offers.filter(o => 
                appIds.includes(o.applicationId?.toString())
            );
            
            // Count hires
            const hires = apps.filter(a => a.status === ApplicationStatus.HIRED);
            
            // Avg interview scores
            const sourceAssessments = assessments.filter(a => {
                const interview = sourceInterviews.find(i => 
                    i._id?.toString() === a.interviewId?.toString()
                );
                return !!interview;
            });
            const avgScore = sourceAssessments.length > 0
                ? sourceAssessments.reduce((sum, a) => sum + (a.score || 0), 0) / sourceAssessments.length
                : 0;

            // Calculate time-to-hire for hired applications
            const timesToHire = await this.calculateTimesToHire(hires);
            const avgTimeToHire = timesToHire.length > 0
                ? timesToHire.reduce((a, b) => a + b, 0) / timesToHire.length
                : 0;

            // Quality score = weighted combination
            const interviewRate = apps.length > 0 ? (sourceInterviews.length / apps.length) * 100 : 0;
            const offerRate = apps.length > 0 ? (sourceOffers.length / apps.length) * 100 : 0;
            const hireRate = apps.length > 0 ? (hires.length / apps.length) * 100 : 0;
            const qualityScore = (hireRate * 0.5) + (avgScore * 0.3) + (offerRate * 0.2);

            metrics.push({
                source,
                totalApplications: apps.length,
                interviewRate,
                offerRate,
                hireRate,
                avgInterviewScore: avgScore,
                qualityScore,
                avgTimeToHire,
            });
        }

        return metrics.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    /**
     * Get time-to-hire breakdown by requisition
     */
    async getTimeToHireBreakdown(limit: number = 20): Promise<TimeToHireBreakdown[]> {
        const requisitions = await this.requisitionModel.find({ publishStatus: { $in: ['published', 'closed'] } })
            .populate('templateId')
            .lean();

        const breakdowns: TimeToHireBreakdown[] = [];

        for (const req of requisitions.slice(0, limit)) {
            const applications = await this.applicationModel.find({ requisitionId: req._id }).lean();
            const hiredApps = applications.filter(a => a.status === ApplicationStatus.HIRED);
            
            if (hiredApps.length === 0 && applications.length === 0) continue;

            // Days to first application
            const firstApp = applications.sort((a, b) => 
                new Date((a as any).createdAt).getTime() - new Date((b as any).createdAt).getTime()
            )[0];
            const daysToFirstApplication = firstApp && req.postingDate
                ? this.daysBetween(new Date(req.postingDate), new Date((firstApp as any).createdAt))
                : 0;

            // Get stage transition timings
            const allHistories = await this.historyModel.find({
                applicationId: { $in: hiredApps.map(a => a._id) }
            }).sort({ createdAt: 1 }).lean();

            let avgScreeningToInterview = 0;
            let avgInterviewToOffer = 0;
            let avgOfferToAcceptance = 0;
            let totalDays = 0;

            if (hiredApps.length > 0) {
                for (const app of hiredApps) {
                    const appHistories = allHistories.filter(h => 
                        h.applicationId.toString() === (app as any)._id.toString()
                    );
                    
                    const screeningTime = this.getStageTransitionTime(appHistories, ApplicationStage.SCREENING, ApplicationStage.DEPARTMENT_INTERVIEW);
                    const interviewTime = this.getStageTransitionTime(appHistories, ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER);
                    
                    // Get offer acceptance time
                    const offer = await this.offerModel.findOne({ applicationId: app._id }).lean();
                    const offerTime = offer?.candidateSignedAt && (offer as any)?.createdAt
                        ? this.daysBetween(new Date((offer as any).createdAt), new Date(offer.candidateSignedAt))
                        : 0;

                    avgScreeningToInterview += screeningTime;
                    avgInterviewToOffer += interviewTime;
                    avgOfferToAcceptance += offerTime;
                    
                    totalDays += screeningTime + interviewTime + offerTime + daysToFirstApplication;
                }

                avgScreeningToInterview /= hiredApps.length;
                avgInterviewToOffer /= hiredApps.length;
                avgOfferToAcceptance /= hiredApps.length;
                totalDays /= hiredApps.length;
            }

            breakdowns.push({
                requisitionId: req.requisitionId,
                requisitionTitle: (req.templateId as any)?.title || 'Unknown',
                department: (req.templateId as any)?.department || 'Unknown',
                daysToFirstApplication,
                daysScreeningToInterview: Math.round(avgScreeningToInterview),
                daysInterviewToOffer: Math.round(avgInterviewToOffer),
                daysOfferToAcceptance: Math.round(avgOfferToAcceptance),
                totalDaysToHire: Math.round(totalDays),
                hiredCount: hiredApps.length,
            });
        }

        return breakdowns.sort((a, b) => b.totalDaysToHire - a.totalDaysToHire);
    }

    /**
     * Get interviewer calibration metrics
     */
    async getInterviewerCalibration(): Promise<InterviewerCalibrationMetrics[]> {
        const interviews = await this.interviewModel.find({ status: 'COMPLETED' })
            .populate('panelMembers', 'firstName lastName')
            .lean();
        const assessments = await this.assessmentModel.find().lean();
        const applications = await this.applicationModel.find().lean();

        // Group assessments by interviewer
        const interviewerScores = new Map<string, { 
            name: string; 
            scores: number[]; 
            recommendations: boolean[];
            actualOutcomes: boolean[];
            feedbackTimes: number[];
        }>();

        for (const interview of interviews) {
            const assessment = assessments.find(a => 
                a.interviewId?.toString() === (interview as any)._id?.toString()
            );
            if (!assessment || assessment.score === undefined) continue;

            const app = applications.find(a => 
                (a as any)._id.toString() === interview.applicationId?.toString()
            );
            const wasHired = app?.status === ApplicationStatus.HIRED;
            const recommended = (assessment.score || 0) >= 3.5;

            // Track each panel member
            for (const member of (interview.panel || [])) {
                const memberId = (member as any)._id?.toString() || member?.toString();
                const memberName = (member as any)?.firstName 
                    ? `${(member as any).firstName} ${(member as any).lastName}`
                    : 'Unknown';

                if (!interviewerScores.has(memberId)) {
                    interviewerScores.set(memberId, {
                        name: memberName,
                        scores: [],
                        recommendations: [],
                        actualOutcomes: [],
                        feedbackTimes: [],
                    });
                }

                const data = interviewerScores.get(memberId)!;
                data.scores.push(assessment.score || 0);
                data.recommendations.push(recommended);
                data.actualOutcomes.push(wasHired);
                
                // Calculate feedback time if available
                if ((assessment as any).createdAt && interview.scheduledDate) {
                    const feedbackTime = this.daysBetween(
                        new Date(interview.scheduledDate), 
                        new Date((assessment as any).createdAt)
                    );
                    data.feedbackTimes.push(feedbackTime);
                }
            }
        }

        // Calculate metrics
        const metrics: InterviewerCalibrationMetrics[] = [];
        const globalAvg = this.calculateGlobalAverageScore(assessments);

        for (const [id, data] of interviewerScores) {
            if (data.scores.length < 3) {
                metrics.push({
                    interviewerId: id,
                    interviewerName: data.name,
                    totalInterviews: data.scores.length,
                    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
                    scoreStdDev: 0,
                    recommendationAccuracy: 0,
                    avgFeedbackTime: 0,
                    calibrationStatus: 'INSUFFICIENT_DATA',
                });
                continue;
            }

            const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            const variance = data.scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / data.scores.length;
            const stdDev = Math.sqrt(variance);

            // Recommendation accuracy
            let correctPredictions = 0;
            for (let i = 0; i < data.recommendations.length; i++) {
                if (data.recommendations[i] === data.actualOutcomes[i]) {
                    correctPredictions++;
                }
            }
            const accuracy = (correctPredictions / data.recommendations.length) * 100;

            const avgFeedbackTime = data.feedbackTimes.length > 0
                ? data.feedbackTimes.reduce((a, b) => a + b, 0) / data.feedbackTimes.length
                : 0;

            // Determine calibration status
            let status: 'CALIBRATED' | 'LENIENT' | 'HARSH' = 'CALIBRATED';
            if (avgScore > globalAvg + 0.5) status = 'LENIENT';
            else if (avgScore < globalAvg - 0.5) status = 'HARSH';

            metrics.push({
                interviewerId: id,
                interviewerName: data.name,
                totalInterviews: data.scores.length,
                avgScore,
                scoreStdDev: stdDev,
                recommendationAccuracy: accuracy,
                avgFeedbackTime,
                calibrationStatus: status,
            });
        }

        return metrics.sort((a, b) => b.totalInterviews - a.totalInterviews);
    }

    /**
     * Get requisition health scores
     */
    async getRequisitionHealthScores(): Promise<RequisitionHealthScore[]> {
        const requisitions = await this.requisitionModel.find({ publishStatus: 'published' })
            .populate('templateId')
            .lean();

        const scores: RequisitionHealthScore[] = [];
        const now = new Date();

        for (const req of requisitions) {
            const applications = await this.applicationModel.find({ requisitionId: req._id }).lean();
            const interviews = await this.interviewModel.find({
                applicationId: { $in: applications.map(a => a._id) }
            }).lean();

            const daysOpen = req.postingDate 
                ? this.daysBetween(new Date(req.postingDate), now)
                : 0;

            // Application volume score (0-100)
            const expectedAppsPerWeek = 5;
            const weeksOpen = Math.max(1, daysOpen / 7);
            const expectedApps = expectedAppsPerWeek * weeksOpen;
            const volumeScore = Math.min(100, (applications.length / expectedApps) * 100);

            // Quality applicants (passed screening)
            const qualityApps = applications.filter(a => 
                a.currentStage !== ApplicationStage.SCREENING || 
                a.status !== ApplicationStatus.REJECTED
            ).length;
            const qualityScore = applications.length > 0 
                ? (qualityApps / applications.length) * 100 
                : 0;

            // Pipeline velocity (applications moving through stages)
            const recentHistory = await this.historyModel.find({
                applicationId: { $in: applications.map(a => a._id) },
                createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
            }).lean();
            const velocityScore = Math.min(100, recentHistory.length * 10);

            // Interview schedule rate
            const interviewScheduleRate = applications.length > 0
                ? (interviews.length / applications.length) * 100
                : 0;

            // Calculate overall health
            const healthScore = Math.round(
                (volumeScore * 0.2) + 
                (qualityScore * 0.3) + 
                (velocityScore * 0.25) + 
                (interviewScheduleRate * 0.25)
            );

            // Determine grade
            let grade: 'A' | 'B' | 'C' | 'D' | 'F';
            if (healthScore >= 80) grade = 'A';
            else if (healthScore >= 65) grade = 'B';
            else if (healthScore >= 50) grade = 'C';
            else if (healthScore >= 35) grade = 'D';
            else grade = 'F';

            // Risk factors
            const riskFactors: string[] = [];
            if (daysOpen > 30 && applications.length < 10) {
                riskFactors.push('Low application volume for time open');
            }
            if (qualityScore < 30) {
                riskFactors.push('Low quality applicant ratio');
            }
            if (velocityScore < 20 && applications.length > 5) {
                riskFactors.push('Pipeline stagnation');
            }
            if (daysOpen > 60) {
                riskFactors.push('Requisition aging (60+ days)');
            }

            scores.push({
                requisitionId: req.requisitionId,
                title: (req.templateId as any)?.title || 'Unknown',
                department: (req.templateId as any)?.department || 'Unknown',
                healthScore,
                healthGrade: grade,
                components: {
                    applicationVolume: Math.round(volumeScore),
                    qualityApplicants: Math.round(qualityScore),
                    pipelineVelocity: Math.round(velocityScore),
                    interviewScheduleRate: Math.round(interviewScheduleRate),
                },
                daysOpen,
                isAtRisk: healthScore < 50 || riskFactors.length > 0,
                riskFactors,
            });
        }

        return scores.sort((a, b) => a.healthScore - b.healthScore);
    }

    /**
     * Get stage bottleneck analysis
     */
    async getBottleneckAnalysis(): Promise<StageBottleneck[]> {
        const applications = await this.applicationModel.find().lean();
        const histories = await this.historyModel.find().sort({ createdAt: 1 }).lean();

        const stageOrder = Object.values(ApplicationStage);
        const bottlenecks: StageBottleneck[] = [];
        const now = new Date();

        for (const stage of stageOrder) {
            const appsInStage = applications.filter(a => a.currentStage === stage);
            
            // Calculate time spent in stage
            const stageTimes: number[] = [];
            for (const app of appsInStage) {
                const enterHistory = histories.find(h => 
                    h.applicationId.toString() === (app as any)._id.toString() &&
                    h.newStage === stage
                );
                if (enterHistory) {
                    const days = this.daysBetween(new Date((enterHistory as any).createdAt), now);
                    stageTimes.push(days);
                }
            }

            const avgDays = stageTimes.length > 0
                ? stageTimes.reduce((a, b) => a + b, 0) / stageTimes.length
                : 0;
            const medianDays = this.calculateMedian(stageTimes);

            // Applications stuck > 7 days
            const stuckApps = stageTimes.filter(t => t > 7).length;
            const percentageStuck = appsInStage.length > 0
                ? (stuckApps / appsInStage.length) * 100
                : 0;

            bottlenecks.push({
                stage,
                avgDaysInStage: Math.round(avgDays * 10) / 10,
                medianDaysInStage: Math.round(medianDays * 10) / 10,
                applicationsStuck: stuckApps,
                percentageStuck: Math.round(percentageStuck),
                isBottleneck: avgDays > 5 || percentageStuck > 30,
            });
        }

        return bottlenecks;
    }

    /**
     * Get recruitment trends over time
     */
    async getRecruitmentTrends(months: number = 6): Promise<RecruitmentTrend[]> {
        const now = new Date();
        const trends: RecruitmentTrend[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const applications = await this.applicationModel.countDocuments({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            const interviews = await this.interviewModel.countDocuments({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            const offers = await this.offerModel.countDocuments({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            const hires = await this.applicationModel.countDocuments({
                status: ApplicationStatus.HIRED,
                updatedAt: { $gte: monthStart, $lte: monthEnd }
            });

            // Calculate avg time to hire for this period
            const hiredApps = await this.applicationModel.find({
                status: ApplicationStatus.HIRED,
                updatedAt: { $gte: monthStart, $lte: monthEnd }
            }).lean();
            const timesToHire = await this.calculateTimesToHire(hiredApps);
            const avgTimeToHire = timesToHire.length > 0
                ? timesToHire.reduce((a, b) => a + b, 0) / timesToHire.length
                : 0;

            trends.push({
                period,
                applications,
                interviews,
                offers,
                hires,
                avgTimeToHire: Math.round(avgTimeToHire),
            });
        }

        return trends;
    }

    /**
     * Get comprehensive dashboard summary
     */
    async getDashboardSummary(): Promise<RecruitmentDashboardSummary> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Overview metrics
        const totalOpenRequisitions = await this.requisitionModel.countDocuments({ publishStatus: 'published' });
        const totalApplicationsThisMonth = await this.applicationModel.countDocuments({
            createdAt: { $gte: monthStart }
        });
        const totalHiresThisMonth = await this.applicationModel.countDocuments({
            status: ApplicationStatus.HIRED,
            updatedAt: { $gte: monthStart }
        });

        // Offer acceptance rate
        const allOffers = await this.offerModel.find().lean();
        const acceptedOffers = allOffers.filter(o => o.applicantResponse === OfferResponseStatus.ACCEPTED);
        const offerAcceptanceRate = allOffers.length > 0
            ? (acceptedOffers.length / allOffers.length) * 100
            : 0;

        // Get all analytics
        const [funnel, sourceEffectiveness, bottlenecks, healthScores, trends] = await Promise.all([
            this.getFunnelAnalytics(),
            this.getSourceEffectiveness(),
            this.getBottleneckAnalysis(),
            this.getRequisitionHealthScores(),
            this.getRecruitmentTrends(6),
        ]);

        const atRiskRequisitions = healthScores.filter(r => r.isAtRisk);

        return {
            overview: {
                totalOpenRequisitions,
                totalApplicationsThisMonth,
                totalHiresThisMonth,
                avgTimeToHire: funnel.avgTimeToHire,
                offerAcceptanceRate: Math.round(offerAcceptanceRate),
            },
            funnel,
            sourceEffectiveness,
            bottlenecks,
            atRiskRequisitions,
            trends,
        };
    }

    // ============ HELPER METHODS ============

    private hasPassedStage(app: any, stage: string, histories: any[]): boolean {
        const appHistories = histories.filter(h => h.applicationId.toString() === app._id.toString());
        return appHistories.some(h => h.newStage === stage);
    }

    private calculateAvgDaysInStage(stage: string, enterTransitions: any[], allHistories: any[]): number {
        if (enterTransitions.length === 0) return 0;

        let totalDays = 0;
        let count = 0;

        for (const enter of enterTransitions) {
            const exit = allHistories.find(h => 
                h.applicationId.toString() === enter.applicationId.toString() &&
                h.oldStage === stage &&
                new Date((h as any).createdAt) > new Date((enter as any).createdAt)
            );

            if (exit) {
                totalDays += this.daysBetween(new Date((enter as any).createdAt), new Date((exit as any).createdAt));
                count++;
            }
        }

        return count > 0 ? totalDays / count : 0;
    }

    private async calculateTimesToHire(hiredApps: any[]): Promise<number[]> {
        const times: number[] = [];

        for (const app of hiredApps) {
            const offer = await this.offerModel.findOne({ applicationId: app._id }).lean();
            if (offer?.candidateSignedAt && app.createdAt) {
                const days = this.daysBetween(new Date(app.createdAt), new Date(offer.candidateSignedAt));
                times.push(days);
            }
        }

        return times;
    }

    private getStageTransitionTime(histories: any[], fromStage: string, toStage: string): number {
        const from = histories.find(h => h.newStage === fromStage);
        const to = histories.find(h => h.newStage === toStage);
        
        if (from && to) {
            return this.daysBetween(new Date((from as any).createdAt), new Date((to as any).createdAt));
        }
        return 0;
    }

    private daysBetween(date1: Date, date2: Date): number {
        const diff = Math.abs(date2.getTime() - date1.getTime());
        return Math.round(diff / (1000 * 60 * 60 * 24));
    }

    private calculateMedian(values: number[]): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private calculateGlobalAverageScore(assessments: any[]): number {
        const scores = assessments
            .map(a => a.feedback?.overallRating)
            .filter(s => s !== undefined && s !== null) as number[];
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3;
    }
}
