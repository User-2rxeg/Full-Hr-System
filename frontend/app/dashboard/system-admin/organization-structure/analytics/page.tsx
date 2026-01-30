'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import {
    orgStructureAnalyticsService,
    StructuralHealthScore,
    DepartmentAnalytics,
    PositionRiskAssessment,
    CostCenterSummary,
    ChangeImpactAnalysis
} from '@/app/services/org-structure-analytics';
import RoleGuard from '@/components/RoleGuard';
import { SystemRole } from '@/types';

// Local interface definitions for raw data (for simulator)
interface Department {
    _id: string;
    name: string;
    code: string;
    parentDepartmentId?: { _id: string; name: string } | string;
    headOfDepartmentId?: { _id: string; firstName: string; lastName: string } | string;
    costCenter?: string;
    isActive: boolean;
}

interface Position {
    _id: string;
    title: string;
    code: string;
    departmentId: { _id: string; name: string } | string;
    reportsToPositionId?: { _id: string; title: string } | string;
    isActive: boolean;
}

/**
 * Organization Structure Analytics Dashboard
 * Data Science, Visualization, and Intelligence features
 * REQ-OSM-01, REQ-OSM-02, BR 24, BR 30
 * Now uses backend analytics service for consistency with HR Admin page
 */

export default function StructureAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState<'health' | 'departments' | 'positions' | 'costs' | 'simulation'>('health');

    // Raw data (for simulator dropdowns)
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [assignmentCount, setAssignmentCount] = useState<number>(0);

    // Backend analytics data
    const [healthScore, setHealthScore] = useState<StructuralHealthScore | null>(null);
    const [deptAnalytics, setDeptAnalytics] = useState<DepartmentAnalytics[]>([]);
    const [positionRisks, setPositionRisks] = useState<PositionRiskAssessment[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenterSummary[]>([]);

    // Simulation State
    const [simulationType, setSimulationType] = useState<'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT'>('DEACTIVATE_POSITION');
    const [simulationTarget, setSimulationTarget] = useState<string>('');
    const [simulationResult, setSimulationResult] = useState<ChangeImpactAnalysis | null>(null);
    const [simulationLoading, setSimulationLoading] = useState(false);

    const handleRunSimulation = async (type: 'DEACTIVATE_POSITION' | 'DEACTIVATE_DEPARTMENT', targetId: string) => {
        if (!targetId) return;
        try {
            setSimulationLoading(true);
            const result = await orgStructureAnalyticsService.simulateChangeImpact(type, targetId);
            setSimulationResult(result);
        } catch (err: any) {
            setError(err.message || 'Simulation failed');
        } finally {
            setSimulationLoading(false);
        }
    };

    useEffect(() => {
        fetchAndAnalyze();
    }, []);

    const fetchAndAnalyze = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch raw data for simulator dropdowns + backend analytics
            const [deptRes, posRes, assignRes, healthRes, deptAnalyticsRes, riskRes, costRes] = await Promise.all([
                organizationStructureService.searchDepartments(undefined, undefined, 1, 1000),
                organizationStructureService.searchPositions(undefined, undefined, undefined, 1, 1000),
                organizationStructureService.searchAssignments(undefined, undefined, undefined, undefined, 1, 1000),
                orgStructureAnalyticsService.getStructuralHealth(),
                orgStructureAnalyticsService.getDepartmentAnalytics(),
                orgStructureAnalyticsService.getPositionRiskAssessment(),
                orgStructureAnalyticsService.getCostCenterAnalysis(),
            ]);

            // Extract raw data for simulator dropdowns
            const deptRaw = deptRes.data as any;
            const posRaw = posRes.data as any;
            const assignRaw = assignRes.data as any;
            const depts = deptRaw?.data ?? deptRaw ?? [];
            const poss = posRaw?.data ?? posRaw ?? [];
            const assigns = assignRaw?.data ?? assignRaw ?? [];
            setDepartments(Array.isArray(depts) ? depts : []);
            setPositions(Array.isArray(poss) ? poss : []);
            setAssignmentCount(Array.isArray(assigns) ? assigns.length : 0);

            // Set backend analytics data (these services return data directly)
            if (healthRes) setHealthScore(healthRes);
            if (deptAnalyticsRes) setDeptAnalytics(deptAnalyticsRes);
            if (riskRes) setPositionRisks(riskRes);
            if (costRes) setCostCenters(costRes);

        } catch (err: any) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    // Grade color helpers
    const gradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'text-green-500';
            case 'B': return 'text-blue-500';
            case 'C': return 'text-yellow-500';
            case 'D': return 'text-orange-500';
            case 'F': return 'text-red-500';
            default: return 'text-muted-foreground';
        }
    };

    const riskColor = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            case 'CRITICAL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const insightIcon = (type: string) => {
        switch (type) {
            case 'critical': return '';
            case 'warning': return ;
            case 'opportunity': return ;
            default: return ;
        }
    };

    if (loading) {
        return (
            <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
                <div className="p-6 lg:p-8 bg-background min-h-screen">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 bg-muted rounded w-1/3"></div>
                            <div className="grid grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-32 bg-muted rounded-xl"></div>
                                ))}
                            </div>
                            <div className="h-96 bg-muted rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </RoleGuard>
        );
    }

    return (
        <RoleGuard allowedRoles={[SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN]}>
            <div className="p-6 lg:p-8 bg-background min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard/system-admin/organization-structure"
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Structure Analytics</h1>
                                <p className="text-muted-foreground text-sm">Data-driven insights for organizational health</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchAndAnalyze}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Refresh Analysis
                        </button>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Overall Health Score Card */}
                    {healthScore && (
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Organizational Health Score</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Multi-dimensional structure analysis</p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-5xl font-bold ${gradeColor(healthScore.grade)}`}>
                                        {healthScore.grade}
                                    </div>
                                    <div className="text-2xl font-semibold text-foreground mt-1">{healthScore.overall}/100</div>
                                    <div className={`text-xs mt-1 ${healthScore.trend === 'improving' ? 'text-green-500' :
                                        healthScore.trend === 'declining' ? 'text-red-500' : 'text-muted-foreground'
                                        }`}>
                                        {healthScore.trend === 'improving' ? '↑' : healthScore.trend === 'declining' ? '↓' : '→'} {healthScore.trend}
                                    </div>
                                </div>
                            </div>

                            {/* Dimension Bars */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                {Object.entries(healthScore.dimensions).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="font-medium text-foreground">{value}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${value >= 80 ? 'bg-green-500' :
                                                    value >= 60 ? 'bg-yellow-500' :
                                                        value >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-border pb-2">
                        {[
                            { id: 'health', label: 'Health Insights', icon: '' },
                            { id: 'departments', label: 'Departments', icon: '' },
                            { id: 'positions', label: 'Position Risk', icon: '' },
                            { id: 'costs', label: 'Cost Centers', icon: '' },
                            { id: 'simulation', label: 'Simulator', icon: '' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSection(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === tab.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Health Insights Section */}
                    {activeSection === 'health' && healthScore && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Key Insights */}
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-semibold text-foreground mb-4">Key Insights</h3>
                                <div className="space-y-3">
                                    {healthScore.insights.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">No significant issues detected ✓</p>
                                    ) : (
                                        healthScore.insights.map((insight, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-4 rounded-lg border ${insight.type === 'critical' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                                    insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                                                        insight.type === 'opportunity' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                                                            'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{insightIcon(insight.type)}</span>
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-foreground">{insight.title}</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                                        {insight.recommendation && (
                                                            <p className="text-xs text-primary mt-2">💡 {insight.recommendation}</p>
                                                        )}
                                                    </div>
                                                    {insight.metric !== undefined && (
                                                        <span className="text-lg font-bold text-foreground">{insight.metric}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="space-y-4">
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h3 className="font-semibold text-foreground mb-4">Structure Overview</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{departments.length}</div>
                                            <div className="text-sm text-muted-foreground">Departments</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{positions.length}</div>
                                            <div className="text-sm text-muted-foreground">Positions</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{assignmentCount}</div>
                                            <div className="text-sm text-muted-foreground">Assignments</div>
                                        </div>
                                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                                            <div className="text-3xl font-bold text-foreground">{costCenters.length}</div>
                                            <div className="text-sm text-muted-foreground">Cost Centers</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h3 className="font-semibold text-foreground mb-4">Risk Distribution</h3>
                                    <div className="space-y-2">
                                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(risk => {
                                            const count = positionRisks.filter(p => p.vacancyRisk === risk).length;
                                            const pct = positionRisks.length > 0 ? (count / positionRisks.length) * 100 : 0;
                                            return (
                                                <div key={risk} className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor(risk)}`}>{risk}</span>
                                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div className={`h-full ${riskColor(risk).split(' ')[0]}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments Section */}
                    {activeSection === 'departments' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h3 className="font-semibold text-foreground">Department Analytics</h3>
                                <p className="text-sm text-muted-foreground">Fill rates, health scores, and risk levels by department</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Positions</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Filled</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Vacant</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Frozen</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Fill Rate</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Health</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Risk</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {deptAnalytics.map(dept => (
                                            <tr key={dept.departmentId} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium text-foreground">{dept.departmentName}</td>
                                                <td className="px-4 py-3 text-center text-muted-foreground">{dept.totalPositions}</td>
                                                <td className="px-4 py-3 text-center text-green-600 dark:text-green-400">{dept.filledPositions}</td>
                                                <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">{dept.vacantPositions}</td>
                                                <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400">{dept.frozenPositions}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${dept.fillRate >= 80 ? 'bg-green-500' : dept.fillRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                style={{ width: `${dept.fillRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm">{dept.fillRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium">{dept.healthScore}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColor(dept.riskLevel)}`}>
                                                        {dept.riskLevel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`${dept.headcountTrend === 'growing' ? 'text-green-500' :
                                                        dept.headcountTrend === 'shrinking' ? 'text-red-500' : 'text-muted-foreground'
                                                        }`}>
                                                        {dept.headcountTrend === 'growing' ? '↑' : dept.headcountTrend === 'shrinking' ? '↓' : '→'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {deptAnalytics.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                                    No department data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Position Risk Section */}
                    {activeSection === 'positions' && (
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border">
                                <h3 className="font-semibold text-foreground">Position Risk Assessment</h3>
                                <p className="text-sm text-muted-foreground">Criticality scoring and succession status by position</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Criticality</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Vacancy Risk</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Succession</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Factors</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {positionRisks.slice(0, 20).map(pos => (
                                            <tr key={pos.positionId} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium text-foreground">{pos.positionTitle}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{pos.department}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${pos.criticalityScore >= 80 ? 'bg-red-500' :
                                                                    pos.criticalityScore >= 60 ? 'bg-orange-500' :
                                                                        pos.criticalityScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${pos.criticalityScore}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium">{pos.criticalityScore}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${riskColor(pos.vacancyRisk)}`}>
                                                        {pos.vacancyRisk}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${pos.successionStatus === 'COVERED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        pos.successionStatus === 'AT_RISK' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {pos.successionStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {pos.factors.map((f, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {positionRisks.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                    No position data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {positionRisks.length > 20 && (
                                <div className="p-4 border-t border-border text-center text-sm text-muted-foreground">
                                    Showing top 20 of {positionRisks.length} positions (sorted by criticality)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cost Centers Section */}
                    {activeSection === 'costs' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-border">
                                    <h3 className="font-semibold text-foreground">Cost Center Summary</h3>
                                    <p className="text-sm text-muted-foreground">BR 30: Cost allocation by organizational unit</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Cost Center</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Depts</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Positions</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Headcount</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Utilization</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {costCenters.map(cc => (
                                                <tr key={cc.costCenter} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium text-foreground font-mono">{cc.costCenter}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{cc.departmentCount}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{cc.positionCount}</td>
                                                    <td className="px-4 py-3 text-center font-medium text-foreground">{cc.estimatedHeadcount}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${cc.utilizationRate >= 80 ? 'bg-green-500' : cc.utilizationRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${cc.utilizationRate}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm">{cc.utilizationRate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {costCenters.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                        No cost center data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Cost Center Visualization */}
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h3 className="font-semibold text-foreground mb-4">Position Distribution</h3>
                                <div className="space-y-4">
                                    {costCenters.slice(0, 8).map(cc => {
                                        const maxPositions = Math.max(...costCenters.map(c => c.positionCount), 1);
                                        const widthPct = (cc.positionCount / maxPositions) * 100;
                                        return (
                                            <div key={cc.costCenter} className="space-y-1">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-mono text-foreground">{cc.costCenter}</span>
                                                    <span className="text-muted-foreground">{cc.positionCount} positions</span>
                                                </div>
                                                <div className="h-6 bg-muted rounded overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded flex items-center justify-end pr-2"
                                                        style={{ width: `${Math.max(widthPct, 5)}%` }}
                                                    >
                                                        <span className="text-xs text-primary-foreground font-medium">
                                                            {cc.estimatedHeadcount}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-6 pt-4 border-t border-border">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-foreground">
                                                {costCenters.reduce((sum, cc) => sum + cc.positionCount, 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Total Positions</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-foreground">
                                                {costCenters.reduce((sum, cc) => sum + cc.estimatedHeadcount, 0)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Total Headcount</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Simulation Section */}
                    {activeSection === 'simulation' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Simulator Controls */}
                            <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 h-fit">
                                <h3 className="font-semibold text-foreground mb-4">Structure Simulator</h3>
                                <p className="text-sm text-muted-foreground mb-6">Run "what-if" scenarios to predict impact before making changes.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-2">Action Type</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                                            value={simulationType}
                                            onChange={(e) => {
                                                setSimulationType(e.target.value as any);
                                                setSimulationTarget('');
                                                setSimulationResult(null);
                                            }}
                                        >
                                            <option value="DEACTIVATE_POSITION">Deactivate Position</option>
                                            <option value="DEACTIVATE_DEPARTMENT">Deactivate Department</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-foreground block mb-2">Target Entity</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-input bg-background text-sm"
                                            value={simulationTarget}
                                            onChange={(e) => {
                                                setSimulationTarget(e.target.value);
                                                handleRunSimulation(simulationType, e.target.value);
                                            }}
                                        >
                                            <option value="">Select Target...</option>
                                            {simulationType === 'DEACTIVATE_DEPARTMENT' ? (
                                                departments.map(d => (
                                                    <option key={d._id} value={d._id}>{d.name}</option>
                                                ))
                                            ) : (
                                                positions.map(p => (
                                                    <option key={p._id} value={p._id}>{p.title}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Simulation Results */}
                            <div className="lg:col-span-2">
                                {simulationResult ? (
                                    <div className="bg-card border border-border rounded-xl p-6">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="font-semibold text-foreground">Impact Analysis</h3>
                                                <p className="text-sm text-muted-foreground mt-1">Predicted consequences of this action</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${riskColor(simulationResult.impactLevel)}`}>
                                                {simulationResult.impactLevel} IMPACT
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-foreground">{simulationResult.affectedPositions}</div>
                                                <div className="text-sm text-muted-foreground">Positions Affected</div>
                                            </div>
                                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                <div className="text-2xl font-bold text-foreground">{simulationResult.affectedEmployees}</div>
                                                <div className="text-sm text-muted-foreground">Employees Displaced</div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-medium text-foreground mb-3">Downstream Effects</h4>
                                                <div className="space-y-2">
                                                    {simulationResult.downstreamEffects.map((effect, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                                                            <span className="text-amber-500">⚠️</span>
                                                            {effect}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                <h4 className="text-sm font-medium text-primary mb-1">Recommendation</h4>
                                                <p className="text-sm text-foreground">{simulationResult.recommendation}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-card border border-border rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-3xl">
                                            🧪
                                        </div>
                                        <h3 className="font-medium text-foreground">Ready to Simulate</h3>
                                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                            Select an action and a target entity to see the potential impact on your organization structure.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}
