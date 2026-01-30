import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../../organization-structure/models/department.schema';
import { Position, PositionDocument } from '../../organization-structure/models/position.schema';
import { PositionAssignment, PositionAssignmentDocument } from '../../organization-structure/models/position-assignment.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeStatus } from '../../employee/enums/employee-profile.enums';

// ============ INTERFACES ============

export interface StructuralHealthScore {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend?: 'improving' | 'stable' | 'declining';
    dimensions: {
        fillRate: number;
        spanOfControl: number;
        hierarchyBalance: number;
        successionReadiness: number;
    };
    insights: HealthInsight[];
}

export interface HealthInsight {
    type: 'critical' | 'warning' | 'opportunity' | 'info';
    title: string;
    description: string;
    metric?: string;
    recommendation?: string;
}

export interface DepartmentAnalytics {
    departmentId: string;
    departmentName: string;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    frozenPositions?: number;
    fillRate: number;
    healthScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    headcount: number;
    avgTenure: number;
    headcountTrend?: 'growing' | 'stable' | 'shrinking';
}

export interface PositionRiskAssessment {
    positionId: string;
    positionTitle: string;
    department: string;
    departmentId: string;
    criticalityScore: number;
    vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    successionStatus: 'COVERED' | 'AT_RISK' | 'NO_PLAN';
    factors: string[];
    currentHolder?: {
        employeeId: string;
        name: string;
        tenure: number;
    };
}

export interface CostCenterSummary {
    costCenter: string;
    departmentCount: number;
    positionCount: number;
    estimatedHeadcount: number;
    utilizationRate: number;
}

export interface ChangeImpactAnalysis {
    actionType: string;
    targetId: string;
    targetName: string;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedPositions: number;
    affectedEmployees: number;
    downstreamEffects: string[];
    recommendation: string;
}

export interface SpanOfControlMetric {
    positionId: string;
    positionTitle: string;
    department: string;
    directReports: number;
    idealSpan: number;
    status: 'OPTIMAL' | 'UNDERSTAFFED' | 'OVERSTAFFED';
}

export interface VacancyForecast {
    positionId: string;
    positionTitle: string;
    department: string;
    likelihood: number;
    timeframe: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    factors: string[];
}

// ============ SERVICE ============

@Injectable()
export class OrgStructureAnalyticsService {
    constructor(
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
        @InjectModel(PositionAssignment.name) private assignmentModel: Model<PositionAssignmentDocument>,
        @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    ) { }

    /**
     * Get filter for active assignments (no endDate or endDate in future)
     * PositionAssignment doesn't have isActive field - use endDate to determine active status
     */
    private getActiveAssignmentFilter(additionalFilters: Record<string, any> = {}): Record<string, any> {
        const now = new Date();
        return {
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gt: now } }
            ],
            ...additionalFilters
        };
    }

    /**
     * Calculate overall structural health score
     */
    async getStructuralHealth(): Promise<StructuralHealthScore> {
        const [departments, positions, assignments, employees] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
            this.employeeModel.find({ status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } }).lean(),
        ]);

        const totalPositions = positions.length;
        const filledPositions = assignments.length;
        const fillRate = totalPositions > 0 ? Math.round((filledPositions / totalPositions) * 100) : 0;

        // Calculate span of control metrics
        const managementPositions = positions.filter(p => 
            (p.title?.toLowerCase().includes('manager') || 
             p.title?.toLowerCase().includes('director') ||
             p.title?.toLowerCase().includes('head') ||
             p.title?.toLowerCase().includes('lead')) && 
            p.reportsToPositionId
        );
        
        let avgSpan = 0;
        if (managementPositions.length > 0) {
            const spans = managementPositions.map(mp => {
                const directReports = positions.filter(p => 
                    p.reportsToPositionId?.toString() === mp._id.toString()
                ).length;
                return directReports;
            });
            avgSpan = spans.reduce((a, b) => a + b, 0) / spans.length;
        }
        const spanScore = avgSpan >= 3 && avgSpan <= 8 ? 100 : Math.max(0, 100 - Math.abs(avgSpan - 5.5) * 15);

        // Hierarchy balance (check for orphan positions, missing links)
        const positionsWithReports = positions.filter(p => p.reportsToPositionId).length;
        const hierarchyScore = totalPositions > 0 
            ? Math.round((positionsWithReports / Math.max(totalPositions - 1, 1)) * 100)
            : 100;

        // Succession readiness (simplified - based on critical position coverage)
        const criticalPositions = positions.filter(p => 
            p.title?.toLowerCase().includes('director') ||
            p.title?.toLowerCase().includes('head') ||
            p.title?.toLowerCase().includes('chief')
        );
        const coveredCritical = criticalPositions.filter(cp =>
            assignments.some(a => a.positionId?.toString() === cp._id.toString())
        ).length;
        const successionScore = criticalPositions.length > 0
            ? Math.round((coveredCritical / criticalPositions.length) * 100)
            : 100;

        // Calculate overall score
        const overall = Math.round(
            (fillRate * 0.35) + 
            (spanScore * 0.25) + 
            (hierarchyScore * 0.20) + 
            (successionScore * 0.20)
        );

        // Determine grade
        let grade: 'A' | 'B' | 'C' | 'D' | 'F';
        if (overall >= 90) grade = 'A';
        else if (overall >= 80) grade = 'B';
        else if (overall >= 70) grade = 'C';
        else if (overall >= 60) grade = 'D';
        else grade = 'F';

        // Generate insights
        const insights: HealthInsight[] = [];
        
        if (fillRate < 80) {
            insights.push({
                type: fillRate < 60 ? 'critical' : 'warning',
                title: 'Low Position Fill Rate',
                description: `Only ${fillRate}% of positions are filled. Consider prioritizing recruitment.`,
                metric: `${totalPositions - filledPositions} vacant positions`,
            });
        }

        if (avgSpan > 10) {
            insights.push({
                type: 'warning',
                title: 'High Span of Control',
                description: `Average manager oversees ${avgSpan.toFixed(1)} direct reports. Consider restructuring.`,
            });
        } else if (avgSpan < 3 && managementPositions.length > 0) {
            insights.push({
                type: 'info',
                title: 'Low Span of Control',
                description: `Average span of ${avgSpan.toFixed(1)} may indicate over-layering.`,
            });
        }

        if (successionScore < 70) {
            insights.push({
                type: 'warning',
                title: 'Succession Risk',
                description: `${100 - successionScore}% of critical positions lack succession coverage.`,
            });
        }

        if (fillRate >= 90 && overall >= 80) {
            insights.push({
                type: 'opportunity',
                title: 'Strong Organizational Health',
                description: 'Structure is well-maintained with good fill rates.',
            });
        }

        return {
            overall,
            grade,
            dimensions: {
                fillRate,
                spanOfControl: Math.round(spanScore),
                hierarchyBalance: hierarchyScore,
                successionReadiness: successionScore,
            },
            insights,
        };
    }

    /**
     * Get department-level analytics
     */
    async getDepartmentAnalytics(): Promise<DepartmentAnalytics[]> {
        const [departments, positions, assignments, employees] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).populate('employeeProfileId').lean(),
            this.employeeModel.find({ 
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } 
            }).lean(),
        ]);

        const now = new Date();

        return departments.map(dept => {
            const deptPositions = positions.filter(p => 
                p.departmentId?.toString() === dept._id.toString()
            );
            const deptAssignments = assignments.filter(a =>
                deptPositions.some(p => p._id.toString() === a.positionId?.toString())
            );
            const deptEmployees = employees.filter(e =>
                e.primaryDepartmentId?.toString() === dept._id.toString()
            );

            const totalPositions = deptPositions.length;
            const filledPositions = deptAssignments.length;
            const vacantPositions = totalPositions - filledPositions;
            const fillRate = totalPositions > 0 ? Math.round((filledPositions / totalPositions) * 100) : 0;

            // Calculate average tenure
            let avgTenure = 0;
            if (deptEmployees.length > 0) {
                const tenures = deptEmployees.map(e => {
                    const hireDate = e.dateOfHire ? new Date(e.dateOfHire) : now;
                    return (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                });
                avgTenure = Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10;
            }

            // Calculate health score
            const healthScore = Math.round(
                (fillRate * 0.5) + 
                (Math.min(avgTenure * 10, 50))
            );

            // Determine risk level
            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
            if (fillRate >= 85 && healthScore >= 70) riskLevel = 'LOW';
            else if (fillRate >= 70 && healthScore >= 50) riskLevel = 'MEDIUM';
            else if (fillRate >= 50) riskLevel = 'HIGH';
            else riskLevel = 'CRITICAL';

            return {
                departmentId: dept._id.toString(),
                departmentName: dept.name,
                totalPositions,
                filledPositions,
                vacantPositions,
                fillRate,
                healthScore,
                riskLevel,
                headcount: deptEmployees.length,
                avgTenure,
            };
        }).sort((a, b) => a.healthScore - b.healthScore); // Sort by health (worst first)
    }

    /**
     * Assess position-level risk
     */
    async getPositionRiskAssessment(): Promise<PositionRiskAssessment[]> {
        const [departments, positions, assignments, employees] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
            this.employeeModel.find({ 
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } 
            }).lean(),
        ]);

        const now = new Date();
        const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

        return positions.map(pos => {
            const assignment = assignments.find(a => a.positionId?.toString() === pos._id.toString());
            const employee = assignment 
                ? employees.find(e => e._id.toString() === assignment.employeeProfileId?.toString())
                : null;

            // Calculate criticality score (0-100)
            let criticalityScore = 50; // Base score
            
            // Title-based criticality
            const title = pos.title?.toLowerCase() || '';
            if (title.includes('chief') || title.includes('ceo') || title.includes('cfo') || title.includes('cto')) {
                criticalityScore += 40;
            } else if (title.includes('director') || title.includes('vp')) {
                criticalityScore += 30;
            } else if (title.includes('head') || title.includes('manager')) {
                criticalityScore += 20;
            } else if (title.includes('lead') || title.includes('senior')) {
                criticalityScore += 10;
            }

            // Has direct reports?
            const directReports = positions.filter(p => p.reportsToPositionId?.toString() === pos._id.toString()).length;
            criticalityScore += Math.min(directReports * 3, 15);

            criticalityScore = Math.min(criticalityScore, 100);

            // Vacancy risk
            const factors: string[] = [];
            let vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

            if (!assignment) {
                vacancyRisk = 'CRITICAL';
                factors.push('Position is currently vacant');
            } else if (employee) {
                const tenure = employee.dateOfHire 
                    ? (now.getTime() - new Date(employee.dateOfHire).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
                    : 0;

                if (tenure > 15) {
                    vacancyRisk = 'HIGH';
                    factors.push('Long tenure employee (retirement risk)');
                } else if (tenure < 0.5) {
                    factors.push('New employee (still onboarding)');
                    vacancyRisk = vacancyRisk === 'LOW' ? 'MEDIUM' : vacancyRisk;
                }

                if (criticalityScore > 70 && directReports > 5) {
                    factors.push('High-impact leadership position');
                    vacancyRisk = vacancyRisk === 'LOW' ? 'MEDIUM' : vacancyRisk;
                }
            }

            // Succession status
            let successionStatus: 'COVERED' | 'AT_RISK' | 'NO_PLAN' = 'NO_PLAN';
            if (directReports > 0) {
                // Simplified: assume positions with filled reports have some succession coverage
                const filledReports = directReports; // Would need more data for accuracy
                if (filledReports >= 2) successionStatus = 'COVERED';
                else if (filledReports === 1) successionStatus = 'AT_RISK';
            } else if (!assignment) {
                successionStatus = 'NO_PLAN';
            } else {
                successionStatus = 'AT_RISK'; // No direct reports, single point of failure
            }

            return {
                positionId: pos._id.toString(),
                positionTitle: pos.title,
                department: deptMap.get(pos.departmentId?.toString()) || 'Unknown',
                departmentId: pos.departmentId?.toString() || '',
                criticalityScore,
                vacancyRisk,
                successionStatus,
                factors,
                currentHolder: employee ? {
                    employeeId: employee._id.toString(),
                    name: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                    tenure: employee.dateOfHire 
                        ? Math.round((now.getTime() - new Date(employee.dateOfHire).getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10
                        : 0,
                } : undefined,
            };
        }).sort((a, b) => b.criticalityScore - a.criticalityScore); // Sort by criticality
    }

    /**
     * Get cost center analysis
     */
    async getCostCenterAnalysis(): Promise<CostCenterSummary[]> {
        const [departments, positions, assignments] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
        ]);

        // Group by cost center
        const costCenterMap = new Map<string, { depts: Set<string>; positions: number; filled: number }>();

        departments.forEach(dept => {
            const cc = dept.costCenter || 'UNASSIGNED';
            if (!costCenterMap.has(cc)) {
                costCenterMap.set(cc, { depts: new Set(), positions: 0, filled: 0 });
            }
            costCenterMap.get(cc)!.depts.add(dept._id.toString());
        });

        positions.forEach(pos => {
            const dept = departments.find(d => d._id.toString() === pos.departmentId?.toString());
            const cc = dept?.costCenter || 'UNASSIGNED';
            if (costCenterMap.has(cc)) {
                costCenterMap.get(cc)!.positions++;
                if (assignments.some(a => a.positionId?.toString() === pos._id.toString())) {
                    costCenterMap.get(cc)!.filled++;
                }
            }
        });

        return Array.from(costCenterMap.entries()).map(([costCenter, data]) => ({
            costCenter,
            departmentCount: data.depts.size,
            positionCount: data.positions,
            estimatedHeadcount: data.filled,
            utilizationRate: data.positions > 0 ? Math.round((data.filled / data.positions) * 100) : 0,
        })).sort((a, b) => b.positionCount - a.positionCount);
    }

    /**
     * Simulate change impact
     */
    async simulateChangeImpact(
        actionType: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT',
        targetId: string
    ): Promise<ChangeImpactAnalysis> {
        const [departments, positions, assignments] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
        ]);

        let targetName = '';
        let affectedPositions = 0;
        let affectedEmployees = 0;
        const downstreamEffects: string[] = [];

        if (actionType === 'DEACTIVATE_DEPARTMENT') {
            const dept = departments.find(d => d._id.toString() === targetId);
            if (!dept) {
                return {
                    actionType,
                    targetId,
                    targetName: 'Unknown',
                    impactLevel: 'LOW',
                    affectedPositions: 0,
                    affectedEmployees: 0,
                    downstreamEffects: ['Department not found'],
                    recommendation: 'Verify the department ID and try again.',
                };
            }

            targetName = dept.name;
            const deptPositions = positions.filter(p => p.departmentId?.toString() === targetId);
            affectedPositions = deptPositions.length;
            affectedEmployees = assignments.filter(a =>
                deptPositions.some(p => p._id.toString() === a.positionId?.toString())
            ).length;

            // Check for child departments (departments don't have parent in this schema, so skip)
            // const childDepts = departments.filter(d => d.parentDepartmentId?.toString() === targetId);
            // if (childDepts.length > 0) {
            //     downstreamEffects.push(`${childDepts.length} child department(s) will become orphaned`);
            // }

            if (affectedEmployees > 0) {
                downstreamEffects.push(`${affectedEmployees} employee(s) will need reassignment`);
            }

            if (affectedPositions > 10) {
                downstreamEffects.push('Large-scale restructuring required');
            }
        } else {
            // DEACTIVATE_POSITION
            const pos = positions.find(p => p._id.toString() === targetId);
            if (!pos) {
                return {
                    actionType,
                    targetId,
                    targetName: 'Unknown',
                    impactLevel: 'LOW',
                    affectedPositions: 0,
                    affectedEmployees: 0,
                    downstreamEffects: ['Position not found'],
                    recommendation: 'Verify the position ID and try again.',
                };
            }

            targetName = pos.title;
            affectedPositions = 1;

            // Check if position is filled
            const assignment = assignments.find(a => a.positionId?.toString() === targetId);
            if (assignment) {
                affectedEmployees = 1;
                downstreamEffects.push('Current employee will need reassignment');
            }

            // Check for reporting positions
            const reportingPositions = positions.filter(p => p.reportsToPositionId?.toString() === targetId);
            if (reportingPositions.length > 0) {
                affectedPositions += reportingPositions.length;
                downstreamEffects.push(`${reportingPositions.length} position(s) report to this position`);
                downstreamEffects.push('Reporting structure will need to be updated');
            }
        }

        // Determine impact level
        let impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (affectedEmployees > 20 || affectedPositions > 30) {
            impactLevel = 'CRITICAL';
        } else if (affectedEmployees > 10 || affectedPositions > 15) {
            impactLevel = 'HIGH';
        } else if (affectedEmployees > 3 || affectedPositions > 5) {
            impactLevel = 'MEDIUM';
        } else {
            impactLevel = 'LOW';
        }

        // Generate recommendation
        let recommendation = '';
        if (impactLevel === 'CRITICAL') {
            recommendation = 'This change has significant organizational impact. Recommend phased approach with HR leadership approval. Develop comprehensive transition plan before proceeding.';
        } else if (impactLevel === 'HIGH') {
            recommendation = 'Consider the downstream effects carefully. Ensure affected employees have clear transition paths. Communicate changes well in advance.';
        } else if (impactLevel === 'MEDIUM') {
            recommendation = 'Moderate impact expected. Ensure proper handover of responsibilities and update reporting structures accordingly.';
        } else {
            recommendation = 'Low impact change. Proceed with standard change management procedures.';
        }

        return {
            actionType,
            targetId,
            targetName,
            impactLevel,
            affectedPositions,
            affectedEmployees,
            downstreamEffects,
            recommendation,
        };
    }

    /**
     * Get span of control metrics
     */
    async getSpanOfControlMetrics(): Promise<SpanOfControlMetric[]> {
        const [departments, positions, assignments] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
        ]);

        const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));
        const IDEAL_SPAN = 6;

        // Find positions that have direct reports
        const managementPositions = positions.filter(pos => {
            const directReports = positions.filter(p => p.reportsToPositionId?.toString() === pos._id.toString());
            return directReports.length > 0;
        });

        return managementPositions.map(pos => {
            const directReports = positions.filter(p => p.reportsToPositionId?.toString() === pos._id.toString()).length;
            
            let status: 'OPTIMAL' | 'UNDERSTAFFED' | 'OVERSTAFFED';
            if (directReports >= 3 && directReports <= 8) {
                status = 'OPTIMAL';
            } else if (directReports < 3) {
                status = 'UNDERSTAFFED';
            } else {
                status = 'OVERSTAFFED';
            }

            return {
                positionId: pos._id.toString(),
                positionTitle: pos.title,
                department: deptMap.get(pos.departmentId?.toString()) || 'Unknown',
                directReports,
                idealSpan: IDEAL_SPAN,
                status,
            };
        }).sort((a, b) => b.directReports - a.directReports);
    }

    /**
     * Get vacancy forecasts
     */
    async getVacancyForecasts(): Promise<VacancyForecast[]> {
        const [departments, positions, assignments, employees] = await Promise.all([
            this.departmentModel.find({ isActive: true }).lean(),
            this.positionModel.find({ isActive: true }).lean(),
            this.assignmentModel.find(this.getActiveAssignmentFilter()).lean(),
            this.employeeModel.find({ 
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } 
            }).lean(),
        ]);

        const now = new Date();
        const deptMap = new Map(departments.map(d => [d._id.toString(), d.name]));

        // Only analyze filled positions
        const filledPositions = positions.filter(pos =>
            assignments.some(a => a.positionId?.toString() === pos._id.toString())
        );

        return filledPositions.map(pos => {
            const assignment = assignments.find(a => a.positionId?.toString() === pos._id.toString());
            const employee = assignment 
                ? employees.find(e => e._id.toString() === assignment.employeeProfileId?.toString())
                : null;

            const factors: string[] = [];
            let likelihood = 0.1; // Base likelihood

            if (employee) {
                const tenure = employee.dateOfHire 
                    ? (now.getTime() - new Date(employee.dateOfHire).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
                    : 0;

                // Long tenure = retirement risk
                if (tenure > 20) {
                    likelihood += 0.4;
                    factors.push('Very long tenure (retirement likely)');
                } else if (tenure > 15) {
                    likelihood += 0.25;
                    factors.push('Long tenure (potential retirement)');
                } else if (tenure > 10) {
                    likelihood += 0.1;
                    factors.push('Extended tenure');
                }

                // Short tenure = flight risk
                if (tenure < 1) {
                    likelihood += 0.15;
                    factors.push('New employee (adjustment period)');
                } else if (tenure >= 2 && tenure <= 4) {
                    likelihood += 0.1;
                    factors.push('Common turnover window (2-4 years)');
                }
            }

            // Critical positions have higher visibility
            const title = pos.title?.toLowerCase() || '';
            if (title.includes('chief') || title.includes('director')) {
                likelihood += 0.05;
                factors.push('Executive-level position');
            }

            likelihood = Math.min(likelihood, 0.95);

            // Determine timeframe and risk level
            let timeframe = '12+ months';
            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

            if (likelihood > 0.6) {
                timeframe = '0-3 months';
                riskLevel = 'CRITICAL';
            } else if (likelihood > 0.4) {
                timeframe = '3-6 months';
                riskLevel = 'HIGH';
            } else if (likelihood > 0.25) {
                timeframe = '6-12 months';
                riskLevel = 'MEDIUM';
            }

            return {
                positionId: pos._id.toString(),
                positionTitle: pos.title,
                department: deptMap.get(pos.departmentId?.toString()) || 'Unknown',
                likelihood: Math.round(likelihood * 100) / 100,
                timeframe,
                riskLevel,
                factors,
            };
        }).filter(f => f.factors.length > 0).sort((a, b) => b.likelihood - a.likelihood);
    }

    /**
     * Get organization summary stats
     */
    async getOrgSummaryStats() {
        const now = new Date();
        const [departments, positions, assignments, employees] = await Promise.all([
            this.departmentModel.countDocuments({ isActive: true }),
            this.positionModel.countDocuments({ isActive: true }),
            this.assignmentModel.countDocuments({
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gt: now } }
                ]
            }),
            this.employeeModel.countDocuments({ 
                status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] } 
            }),
        ]);

        // Get unique cost centers
        const costCenters = await this.departmentModel.distinct('costCenter', { isActive: true });

        return {
            totalDepartments: departments,
            totalPositions: positions,
            filledPositions: assignments,
            vacantPositions: positions - assignments,
            fillRate: positions > 0 ? Math.round((assignments / positions) * 100) : 0,
            totalEmployees: employees,
            costCenterCount: costCenters.filter(cc => cc).length,
        };
    }

    // ============ TEAM-SPECIFIC METHODS (FOR DEPARTMENT HEADS) ============

    /**
     * Get team structure metrics for a department head's team
     */
    async getTeamStructureMetrics(departmentId: string) {
        const department = await this.departmentModel.findById(departmentId).lean();
        if (!department) {
            return null;
        }

        // Get positions in this department
        const positions = await this.positionModel.find({ 
            departmentId: new Types.ObjectId(departmentId), 
            isActive: true 
        }).lean();

        // Get assignments for these positions
        const positionIds = positions.map(p => p._id);
        const assignments = await this.assignmentModel.find(this.getActiveAssignmentFilter({
            positionId: { $in: positionIds }
        })).populate('employeeProfileId').lean();

        // Get employee profiles
        const employeeIds = assignments
            .map(a => (a.employeeProfileId as any)?._id)
            .filter(Boolean);
        const employees = await this.employeeModel.find({
            _id: { $in: employeeIds },
            status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE, EmployeeStatus.PROBATION] },
        }).lean();

        // Calculate span of control
        const managerPositions = positions.filter(p =>
            p.title?.toLowerCase().includes('manager') ||
            p.title?.toLowerCase().includes('lead') ||
            p.title?.toLowerCase().includes('supervisor')
        );

        const spans = managerPositions.map(mp => {
            const directReports = positions.filter(p =>
                p.reportsToPositionId?.toString() === mp._id.toString()
            ).length;
            return directReports;
        });

        const avgSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;
        const minSpan = spans.length > 0 ? Math.min(...spans) : 0;
        const maxSpan = spans.length > 0 ? Math.max(...spans) : 0;
        const medianSpan = spans.length > 0 ? spans.sort((a, b) => a - b)[Math.floor(spans.length / 2)] : 0;

        // Calculate depth
        const depths: number[] = [];
        const calculateDepth = (posId: string, depth: number) => {
            depths.push(depth);
            const children = positions.filter(p => p.reportsToPositionId?.toString() === posId);
            children.forEach(c => calculateDepth(c._id.toString(), depth + 1));
        };
        
        const rootPositions = positions.filter(p => !p.reportsToPositionId || 
            !positions.some(pp => pp._id.toString() === p.reportsToPositionId?.toString())
        );
        rootPositions.forEach(rp => calculateDepth(rp._id.toString(), 1));

        const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
        const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

        // Calculate tenure distribution
        const now = new Date();
        const tenures = employees.map(e => {
            const hireDateVal = e.dateOfHire ? new Date(e.dateOfHire) : now;
            return (now.getTime() - hireDateVal.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        });
        const avgTenure = tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;

        // Identify issues
        const issues: string[] = [];
        if (avgSpan > 10) issues.push('High span of control - managers may be overburdened');
        if (avgSpan < 3 && managerPositions.length > 0) issues.push('Low span of control - potential management overhead');
        if (maxDepth > 5) issues.push('Deep hierarchy - communication may be slowed');
        if (positions.length - assignments.length > 2) issues.push(`${positions.length - assignments.length} vacant positions need attention`);

        return {
            departmentId,
            departmentName: department.name,
            metrics: {
                spanOfControl: {
                    avg: Math.round(avgSpan * 10) / 10,
                    min: minSpan,
                    max: maxSpan,
                    median: medianSpan,
                },
                depth: {
                    avg: Math.round(avgDepth * 10) / 10,
                    max: maxDepth,
                },
                headcount: employees.length,
                totalPositions: positions.length,
                filledPositions: assignments.length,
                vacantPositions: positions.length - assignments.length,
                fillRate: positions.length > 0 ? Math.round((assignments.length / positions.length) * 100) : 0,
                avgTenure: Math.round(avgTenure * 10) / 10,
                issues,
            },
        };
    }

    /**
     * Get team members for network/org chart visualization
     */
    async getTeamOrgChartData(departmentId: string) {
        const department = await this.departmentModel.findById(departmentId).lean();
        if (!department) {
            return [];
        }

        // Get positions in this department
        const positions = await this.positionModel.find({
            departmentId: new Types.ObjectId(departmentId),
            isActive: true,
        }).lean();

        // Get assignments for these positions
        const positionIds = positions.map(p => p._id);
        const assignments = await this.assignmentModel.find(this.getActiveAssignmentFilter({
            positionId: { $in: positionIds }
        })).populate('employeeProfileId').lean();

        // Build employee nodes
        const positionMap = new Map(positions.map(p => [p._id.toString(), p]));
        
        const nodes = assignments.map(a => {
            const emp = a.employeeProfileId as any;
            const pos = positionMap.get(a.positionId?.toString());
            
            if (!emp) return null;

            // Find manager by looking at position's reportsToPositionId
            let managerId: string | null = null;
            if (pos?.reportsToPositionId) {
                const managerAssignment = assignments.find(ma =>
                    ma.positionId?.toString() === pos.reportsToPositionId?.toString()
                );
                if (managerAssignment) {
                    managerId = (managerAssignment.employeeProfileId as any)?._id?.toString() || null;
                }
            }

            return {
                id: emp._id.toString(),
                name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                position: pos?.title || 'Unknown Position',
                department: department.name,
                managerId,
                imageUrl: emp.profilePicture || null,
            };
        }).filter(Boolean);

        return nodes;
    }

    /**
     * Get vacancy forecasts for a specific department
     */
    async getTeamVacancyForecasts(departmentId: string) {
        const allForecasts = await this.getVacancyForecasts();
        return allForecasts.filter(f => {
            // Match by department ID in the forecast
            const deptAnalytics = this.getDepartmentAnalytics();
            return f.department === departmentId;
        });
    }
}
