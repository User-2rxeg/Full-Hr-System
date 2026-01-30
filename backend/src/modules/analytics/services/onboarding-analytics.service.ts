import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { Onboarding, OnboardingDocument } from '../../recruitment/models/onboarding.schema';
import { Contract, ContractDocument } from '../../recruitment/models/contract.schema';
import { Document as DocModel, DocumentDocument } from '../../recruitment/models/document.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';

// Enums
import { OnboardingTaskStatus } from '../../recruitment/enums/onboarding-task-status.enum';

// ============ INTERFACES ============

export interface OnboardingOverviewMetrics {
    totalOnboardings: number;
    activeOnboardings: number;
    completedThisMonth: number;
    avgCompletionDays: number;
    onTimeCompletionRate: number;
    currentlyOverdue: number;
}

export interface TaskBottleneckAnalysis {
    taskName: string;
    department: string;
    totalOccurrences: number;
    avgCompletionDays: number;
    medianCompletionDays: number;
    overdueCount: number;
    overdueRate: number;
    slaComplianceRate: number;
    isBottleneck: boolean;
}

export interface DepartmentSLAMetrics {
    department: string;
    totalTasks: number;
    completedOnTime: number;
    completedLate: number;
    pending: number;
    overdue: number;
    avgCompletionDays: number;
    slaComplianceRate: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TimeToProductivityMetrics {
    employeeId: string;
    employeeName: string;
    department: string;
    startDate: Date;
    onboardingDays: number;
    tasksCompleted: number;
    totalTasks: number;
    completionRate: number;
    isFullyOnboarded: boolean;
    daysToFullOnboarding: number | null;
}

export interface OnboardingProgressByDepartment {
    department: string;
    totalNewHires: number;
    fullyOnboarded: number;
    inProgress: number;
    avgCompletionRate: number;
    avgDaysToComplete: number;
}

export interface OnboardingTrend {
    period: string;
    newOnboardings: number;
    completedOnboardings: number;
    avgCompletionDays: number;
    overdueRate: number;
}

export interface TaskCompletionTimeline {
    taskName: string;
    department: string;
    expectedDays: number;
    actualAvgDays: number;
    variance: number;
    status: 'ON_TRACK' | 'DELAYED' | 'AT_RISK';
}

export interface OnboardingDashboardSummary {
    overview: OnboardingOverviewMetrics;
    departmentSLA: DepartmentSLAMetrics[];
    taskBottlenecks: TaskBottleneckAnalysis[];
    progressByDepartment: OnboardingProgressByDepartment[];
    recentOnboardings: TimeToProductivityMetrics[];
    trends: OnboardingTrend[];
    taskTimeline: TaskCompletionTimeline[];
}

// ============ SERVICE ============

@Injectable()
export class OnboardingAnalyticsService {
    constructor(
        @InjectModel(Onboarding.name) private onboardingModel: Model<OnboardingDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        @InjectModel(DocModel.name) private documentModel: Model<DocumentDocument>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    ) { }

    /**
     * Get overview metrics for onboarding
     */
    async getOverviewMetrics(): Promise<OnboardingOverviewMetrics> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const allOnboardings = await this.onboardingModel.find().lean();
        const activeOnboardings = allOnboardings.filter(o => !o.completed);
        const completedThisMonth = allOnboardings.filter(o => 
            o.completed && o.completedAt && new Date(o.completedAt) >= monthStart
        );

        // Calculate avg completion days
        const completedWithDates = allOnboardings.filter(o => o.completed && o.completedAt);
        let totalDays = 0;
        let onTimeCount = 0;

        for (const onb of completedWithDates) {
            const createdAt = (onb as any).createdAt;
            if (createdAt && onb.completedAt) {
                const days = this.daysBetween(new Date(createdAt), new Date(onb.completedAt));
                totalDays += days;
                if (days <= 14) onTimeCount++; // Assuming 14 days is the target
            }
        }

        const avgCompletionDays = completedWithDates.length > 0 
            ? totalDays / completedWithDates.length 
            : 0;
        const onTimeCompletionRate = completedWithDates.length > 0
            ? (onTimeCount / completedWithDates.length) * 100
            : 0;

        // Count currently overdue
        let currentlyOverdue = 0;
        for (const onb of activeOnboardings) {
            const hasOverdue = onb.tasks?.some(t => 
                t.status !== OnboardingTaskStatus.COMPLETED && 
                t.deadline && 
                new Date(t.deadline) < now
            );
            if (hasOverdue) currentlyOverdue++;
        }

        return {
            totalOnboardings: allOnboardings.length,
            activeOnboardings: activeOnboardings.length,
            completedThisMonth: completedThisMonth.length,
            avgCompletionDays: Math.round(avgCompletionDays),
            onTimeCompletionRate: Math.round(onTimeCompletionRate),
            currentlyOverdue,
        };
    }

    /**
     * Get task bottleneck analysis
     */
    async getTaskBottleneckAnalysis(): Promise<TaskBottleneckAnalysis[]> {
        const onboardings = await this.onboardingModel.find().lean();
        const now = new Date();

        // Aggregate all tasks across onboardings
        const taskMap = new Map<string, {
            department: string;
            completionDays: number[];
            overdueCount: number;
            totalCount: number;
            pendingCount: number;
        }>();

        for (const onb of onboardings) {
            for (const task of onb.tasks || []) {
                const key = `${task.name}|${task.department}`;
                
                if (!taskMap.has(key)) {
                    taskMap.set(key, {
                        department: task.department || 'Unknown',
                        completionDays: [],
                        overdueCount: 0,
                        totalCount: 0,
                        pendingCount: 0,
                    });
                }

                const data = taskMap.get(key)!;
                data.totalCount++;

                if (task.status === OnboardingTaskStatus.COMPLETED && task.completedAt) {
                    // Find when task was created (use onboarding createdAt as proxy)
                    const startDate = (onb as any).createdAt || now;
                    const days = this.daysBetween(new Date(startDate), new Date(task.completedAt));
                    data.completionDays.push(days);

                    // Check if it was overdue when completed
                    if (task.deadline && new Date(task.completedAt) > new Date(task.deadline)) {
                        data.overdueCount++;
                    }
                } else if (task.status !== OnboardingTaskStatus.COMPLETED) {
                    data.pendingCount++;
                    if (task.deadline && new Date(task.deadline) < now) {
                        data.overdueCount++;
                    }
                }
            }
        }

        const bottlenecks: TaskBottleneckAnalysis[] = [];

        for (const [key, data] of taskMap) {
            const [taskName] = key.split('|');
            const avgDays = data.completionDays.length > 0
                ? data.completionDays.reduce((a, b) => a + b, 0) / data.completionDays.length
                : 0;
            const medianDays = this.calculateMedian(data.completionDays);
            const overdueRate = data.totalCount > 0 
                ? (data.overdueCount / data.totalCount) * 100 
                : 0;
            const slaCompliance = 100 - overdueRate;

            bottlenecks.push({
                taskName,
                department: data.department,
                totalOccurrences: data.totalCount,
                avgCompletionDays: Math.round(avgDays * 10) / 10,
                medianCompletionDays: Math.round(medianDays * 10) / 10,
                overdueCount: data.overdueCount,
                overdueRate: Math.round(overdueRate),
                slaComplianceRate: Math.round(slaCompliance),
                isBottleneck: avgDays > 5 || overdueRate > 25,
            });
        }

        return bottlenecks.sort((a, b) => b.overdueRate - a.overdueRate);
    }

    /**
     * Get department SLA metrics
     */
    async getDepartmentSLAMetrics(): Promise<DepartmentSLAMetrics[]> {
        const onboardings = await this.onboardingModel.find().lean();
        const now = new Date();

        const deptMap = new Map<string, {
            totalTasks: number;
            completedOnTime: number;
            completedLate: number;
            pending: number;
            overdue: number;
            completionDays: number[];
        }>();

        for (const onb of onboardings) {
            for (const task of onb.tasks || []) {
                const dept = task.department || 'Unknown';
                
                if (!deptMap.has(dept)) {
                    deptMap.set(dept, {
                        totalTasks: 0,
                        completedOnTime: 0,
                        completedLate: 0,
                        pending: 0,
                        overdue: 0,
                        completionDays: [],
                    });
                }

                const data = deptMap.get(dept)!;
                data.totalTasks++;

                if (task.status === OnboardingTaskStatus.COMPLETED) {
                    if (task.completedAt && task.deadline) {
                        if (new Date(task.completedAt) <= new Date(task.deadline)) {
                            data.completedOnTime++;
                        } else {
                            data.completedLate++;
                        }
                        const startDate = (onb as any).createdAt || now;
                        const days = this.daysBetween(new Date(startDate), new Date(task.completedAt));
                        data.completionDays.push(days);
                    } else {
                        data.completedOnTime++; // No deadline = on time
                    }
                } else {
                    data.pending++;
                    if (task.deadline && new Date(task.deadline) < now) {
                        data.overdue++;
                    }
                }
            }
        }

        const metrics: DepartmentSLAMetrics[] = [];

        for (const [dept, data] of deptMap) {
            const avgDays = data.completionDays.length > 0
                ? data.completionDays.reduce((a, b) => a + b, 0) / data.completionDays.length
                : 0;
            
            const completedTotal = data.completedOnTime + data.completedLate;
            const slaRate = completedTotal > 0
                ? (data.completedOnTime / completedTotal) * 100
                : 100;

            let grade: 'A' | 'B' | 'C' | 'D' | 'F';
            if (slaRate >= 90) grade = 'A';
            else if (slaRate >= 75) grade = 'B';
            else if (slaRate >= 60) grade = 'C';
            else if (slaRate >= 40) grade = 'D';
            else grade = 'F';

            metrics.push({
                department: dept,
                totalTasks: data.totalTasks,
                completedOnTime: data.completedOnTime,
                completedLate: data.completedLate,
                pending: data.pending,
                overdue: data.overdue,
                avgCompletionDays: Math.round(avgDays * 10) / 10,
                slaComplianceRate: Math.round(slaRate),
                grade,
            });
        }

        return metrics.sort((a, b) => b.slaComplianceRate - a.slaComplianceRate);
    }

    /**
     * Get time-to-productivity metrics for recent hires
     */
    async getTimeToProductivityMetrics(limit: number = 20): Promise<TimeToProductivityMetrics[]> {
        const onboardings = await this.onboardingModel.find()
            .populate('employeeId', 'firstName lastName primaryDepartmentId dateOfHire')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const metrics: TimeToProductivityMetrics[] = [];
        const now = new Date();

        for (const onb of onboardings) {
            const emp = onb.employeeId as any;
            if (!emp) continue;

            const tasks = onb.tasks || [];
            const completedTasks = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED);
            const completionRate = tasks.length > 0 
                ? (completedTasks.length / tasks.length) * 100 
                : 0;

            const startDate = emp.dateOfHire || (onb as any).createdAt;
            const onboardingDays = this.daysBetween(new Date(startDate), now);

            metrics.push({
                employeeId: emp._id?.toString() || '',
                employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                department: emp.primaryDepartmentId?.name || 'Unknown',
                startDate: new Date(startDate),
                onboardingDays,
                tasksCompleted: completedTasks.length,
                totalTasks: tasks.length,
                completionRate: Math.round(completionRate),
                isFullyOnboarded: onb.completed,
                daysToFullOnboarding: onb.completed && onb.completedAt
                    ? this.daysBetween(new Date(startDate), new Date(onb.completedAt))
                    : null,
            });
        }

        return metrics;
    }

    /**
     * Get onboarding progress by department
     */
    async getProgressByDepartment(): Promise<OnboardingProgressByDepartment[]> {
        const onboardings = await this.onboardingModel.find()
            .populate({
                path: 'employeeId',
                populate: { path: 'primaryDepartmentId', select: 'name' }
            })
            .lean();

        const deptMap = new Map<string, {
            total: number;
            completed: number;
            inProgress: number;
            completionRates: number[];
            completionDays: number[];
        }>();

        for (const onb of onboardings) {
            const emp = onb.employeeId as any;
            const dept = emp?.primaryDepartmentId?.name || 'Unknown';

            if (!deptMap.has(dept)) {
                deptMap.set(dept, {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    completionRates: [],
                    completionDays: [],
                });
            }

            const data = deptMap.get(dept)!;
            data.total++;

            const tasks = onb.tasks || [];
            const completedTasks = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED);
            const rate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
            data.completionRates.push(rate);

            if (onb.completed) {
                data.completed++;
                if (onb.completedAt && (onb as any).createdAt) {
                    const days = this.daysBetween(
                        new Date((onb as any).createdAt), 
                        new Date(onb.completedAt)
                    );
                    data.completionDays.push(days);
                }
            } else {
                data.inProgress++;
            }
        }

        const progress: OnboardingProgressByDepartment[] = [];

        for (const [dept, data] of deptMap) {
            const avgRate = data.completionRates.length > 0
                ? data.completionRates.reduce((a, b) => a + b, 0) / data.completionRates.length
                : 0;
            const avgDays = data.completionDays.length > 0
                ? data.completionDays.reduce((a, b) => a + b, 0) / data.completionDays.length
                : 0;

            progress.push({
                department: dept,
                totalNewHires: data.total,
                fullyOnboarded: data.completed,
                inProgress: data.inProgress,
                avgCompletionRate: Math.round(avgRate),
                avgDaysToComplete: Math.round(avgDays),
            });
        }

        return progress.sort((a, b) => b.totalNewHires - a.totalNewHires);
    }

    /**
     * Get onboarding trends over time
     */
    async getOnboardingTrends(months: number = 6): Promise<OnboardingTrend[]> {
        const now = new Date();
        const trends: OnboardingTrend[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const period = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            const newOnboardings = await this.onboardingModel.countDocuments({
                createdAt: { $gte: monthStart, $lte: monthEnd }
            });

            const completedOnboardings = await this.onboardingModel.find({
                completed: true,
                completedAt: { $gte: monthStart, $lte: monthEnd }
            }).lean();

            // Calculate avg completion days
            let totalDays = 0;
            let overdueCount = 0;

            for (const onb of completedOnboardings) {
                if ((onb as any).createdAt && onb.completedAt) {
                    const days = this.daysBetween(
                        new Date((onb as any).createdAt), 
                        new Date(onb.completedAt)
                    );
                    totalDays += days;
                    if (days > 14) overdueCount++; // More than 2 weeks considered overdue
                }
            }

            const avgDays = completedOnboardings.length > 0 
                ? totalDays / completedOnboardings.length 
                : 0;
            const overdueRate = completedOnboardings.length > 0
                ? (overdueCount / completedOnboardings.length) * 100
                : 0;

            trends.push({
                period,
                newOnboardings,
                completedOnboardings: completedOnboardings.length,
                avgCompletionDays: Math.round(avgDays),
                overdueRate: Math.round(overdueRate),
            });
        }

        return trends;
    }

    /**
     * Get task completion timeline analysis
     */
    async getTaskCompletionTimeline(): Promise<TaskCompletionTimeline[]> {
        const onboardings = await this.onboardingModel.find({ completed: true }).lean();
        
        // Standard expected days per department
        const expectedDays: Record<string, number> = {
            'HR': 3,
            'IT': 2,
            'Admin': 2,
            'Finance': 3,
            'Training': 7,
            'Default': 5,
        };

        const taskMap = new Map<string, {
            department: string;
            actualDays: number[];
        }>();

        for (const onb of onboardings) {
            for (const task of onb.tasks || []) {
                if (task.status !== OnboardingTaskStatus.COMPLETED || !task.completedAt) continue;

                const key = `${task.name}|${task.department}`;
                if (!taskMap.has(key)) {
                    taskMap.set(key, {
                        department: task.department || 'Unknown',
                        actualDays: [],
                    });
                }

                const startDate = (onb as any).createdAt;
                if (startDate) {
                    const days = this.daysBetween(new Date(startDate), new Date(task.completedAt));
                    taskMap.get(key)!.actualDays.push(days);
                }
            }
        }

        const timeline: TaskCompletionTimeline[] = [];

        for (const [key, data] of taskMap) {
            const [taskName] = key.split('|');
            const expected = expectedDays[data.department] || expectedDays['Default'];
            const avgActual = data.actualDays.length > 0
                ? data.actualDays.reduce((a, b) => a + b, 0) / data.actualDays.length
                : 0;
            const variance = avgActual - expected;

            let status: 'ON_TRACK' | 'DELAYED' | 'AT_RISK';
            if (variance <= 0) status = 'ON_TRACK';
            else if (variance <= 2) status = 'AT_RISK';
            else status = 'DELAYED';

            timeline.push({
                taskName,
                department: data.department,
                expectedDays: expected,
                actualAvgDays: Math.round(avgActual * 10) / 10,
                variance: Math.round(variance * 10) / 10,
                status,
            });
        }

        return timeline.sort((a, b) => b.variance - a.variance);
    }

    /**
     * Get comprehensive dashboard summary
     */
    async getDashboardSummary(): Promise<OnboardingDashboardSummary> {
        const [overview, departmentSLA, taskBottlenecks, progressByDepartment, recentOnboardings, trends, taskTimeline] = 
            await Promise.all([
                this.getOverviewMetrics(),
                this.getDepartmentSLAMetrics(),
                this.getTaskBottleneckAnalysis(),
                this.getProgressByDepartment(),
                this.getTimeToProductivityMetrics(10),
                this.getOnboardingTrends(6),
                this.getTaskCompletionTimeline(),
            ]);

        return {
            overview,
            departmentSLA,
            taskBottlenecks: taskBottlenecks.filter(t => t.isBottleneck),
            progressByDepartment,
            recentOnboardings,
            trends,
            taskTimeline,
        };
    }

    // ============ HELPER METHODS ============

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
}
