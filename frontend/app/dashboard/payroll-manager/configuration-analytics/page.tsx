'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
    Loader2, Settings, AlertTriangle, CheckCircle, XCircle, Clock,
    DollarSign, Percent, Shield, Briefcase, FileText, Gift, Users,
    TrendingUp, BarChart3, PieChart, Activity, Heart, Target, Zap,
    ArrowUp, ArrowDown, Minus, AlertCircle, Building2
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, RadarChart, Radar, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis, ComposedChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';
import { 
    payrollConfigAnalyticsService, 
    ConfigurationDashboardSummary,
} from "@/app/services/analytics";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const STATUS_COLORS = {
    draft: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        draft: 'bg-amber-100 text-amber-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };
    return (
        <Badge className={colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
            {status}
        </Badge>
    );
}

function HealthScoreGauge({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getLabel = () => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Needs Attention';
        return 'Critical';
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className={`text-5xl font-bold ${getColor()}`}>{score}</div>
            <div className="text-sm text-muted-foreground mt-1">{getLabel()}</div>
            <Progress value={score} className="mt-3 w-full" />
        </div>
    );
}

export default function PayrollConfigurationAnalytics() {
    const [data, setData] = useState<ConfigurationDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashboardData = await payrollConfigAnalyticsService.getDashboardSummary();
                setData(dashboardData);
            } catch (error) {
                console.error('Failed to load configuration analytics:', error);
                toast.error("Failed to load configuration analytics");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No configuration data available</p>
            </div>
        );
    }

    const { 
        overview, 
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
        healthScore 
    } = data;

    // Prepare chart data
    const statusChartData = statusOverview.map(s => ({
        name: s.category.split(' ')[0],
        draft: s.draft,
        approved: s.approved,
        rejected: s.rejected,
    }));

    const approvalRateData = approvalMetrics.approvalRateByCategory.map(c => ({
        category: c.category.split(' ')[0],
        rate: c.approvalRate,
        fullMark: 100,
    }));

    const policyTypeData = policyAnalysis.byType.filter(t => t.count > 0).map(t => ({
        name: t.type,
        value: t.count,
    }));

    const gradeDistributionData = payGradeAnalysis.gradeDistribution.map(g => ({
        name: g.grade,
        base: g.baseSalary,
        allowance: g.allowanceComponent,
        gross: g.grossSalary,
    }));

    const insuranceBracketData = insuranceAnalysis.brackets.map(b => ({
        name: b.name,
        employee: b.employeeRate,
        employer: b.employerRate,
        minSalary: b.minSalary,
        maxSalary: b.maxSalary,
    }));

    const healthCategoryData = healthScore.categories.map(c => ({
        category: c.category.split(' ')[0],
        score: c.score,
        fullMark: 100,
    }));

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Payroll Configuration Analytics</h1>
                    <p className="text-muted-foreground mt-1">
                        Comprehensive analysis of your payroll configuration settings
                    </p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    <Activity className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Configurations</p>
                                <p className="text-3xl font-bold">{overview.totalConfigurations}</p>
                            </div>
                            <Settings className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Approved</p>
                                <p className="text-3xl font-bold text-green-600">{overview.approvedConfigurations}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Approval</p>
                                <p className="text-3xl font-bold text-amber-600">{overview.pendingApprovals}</p>
                            </div>
                            <Clock className="h-8 w-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Rejected</p>
                                <p className="text-3xl font-bold text-red-600">{overview.rejectedConfigurations}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Approval Rate</p>
                                <p className="text-3xl font-bold text-blue-600">{overview.overallApprovalRate.toFixed(1)}%</p>
                            </div>
                            <Target className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="compensation">Compensation</TabsTrigger>
                    <TabsTrigger value="deductions">Deductions</TabsTrigger>
                    <TabsTrigger value="policies">Policies</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow</TabsTrigger>
                    <TabsTrigger value="health">Health Score</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Status by Category Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-blue-500" />
                                    Configuration Status by Category
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={statusChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="approved" stackId="a" fill={STATUS_COLORS.approved} name="Approved" />
                                        <Bar dataKey="draft" stackId="a" fill={STATUS_COLORS.draft} name="Draft" />
                                        <Bar dataKey="rejected" stackId="a" fill={STATUS_COLORS.rejected} name="Rejected" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Approval Rate Radar */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-green-500" />
                                    Approval Rate by Category
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={approvalRateData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                        <Radar name="Approval Rate" dataKey="rate" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Summary Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration Categories Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px]">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3">Category</th>
                                            <th className="text-center py-2 px-3">Total</th>
                                            <th className="text-center py-2 px-3">Approved</th>
                                            <th className="text-center py-2 px-3">Draft</th>
                                            <th className="text-center py-2 px-3">Rejected</th>
                                            <th className="text-center py-2 px-3">Approval Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statusOverview.map((cat, idx) => (
                                            <tr key={idx} className="border-b hover:bg-muted/50">
                                                <td className="py-2 px-3 font-medium">{cat.category}</td>
                                                <td className="text-center py-2 px-3">{cat.total}</td>
                                                <td className="text-center py-2 px-3">
                                                    <Badge variant="outline" className="bg-green-50 text-green-700">{cat.approved}</Badge>
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700">{cat.draft}</Badge>
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    <Badge variant="outline" className="bg-red-50 text-red-700">{cat.rejected}</Badge>
                                                </td>
                                                <td className="text-center py-2 px-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Progress value={cat.approvalRate} className="w-20 h-2" />
                                                        <span className="text-sm">{cat.approvalRate.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Company Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-purple-500" />
                                Company-Wide Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <Badge className={companySettings.hasSettings ? 'bg-green-100 text-green-800 w-fit mt-1' : 'bg-red-100 text-red-800 w-fit mt-1'}>
                                        {companySettings.hasSettings ? 'Configured' : 'Not Configured'}
                                    </Badge>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Currency</span>
                                    <span className="font-semibold">{companySettings.currency}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Time Zone</span>
                                    <span className="font-semibold">{companySettings.timeZone || 'Not Set'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground">Pay Date</span>
                                    <span className="font-semibold">
                                        {companySettings.payDate 
                                            ? new Date(companySettings.payDate).toLocaleDateString() 
                                            : 'Not Set'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Compensation Tab */}
                <TabsContent value="compensation" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Pay Grade Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                    Pay Grade Salary Distribution
                                </CardTitle>
                                <CardDescription>
                                    Base salary vs allowance components by grade
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <ComposedChart data={gradeDistributionData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                        <Legend />
                                        <Bar dataKey="base" stackId="a" fill="#3b82f6" name="Base Salary" />
                                        <Bar dataKey="allowance" stackId="a" fill="#10b981" name="Allowance" />
                                        <Line type="monotone" dataKey="gross" stroke="#f59e0b" strokeWidth={2} name="Gross" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Pay Grade Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-blue-500" />
                                    Pay Grade Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-blue-600">Total Grades</p>
                                        <p className="text-2xl font-bold">{payGradeAnalysis.totalGrades}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm text-green-600">Avg Gross Salary</p>
                                        <p className="text-2xl font-bold">{formatCurrency(payGradeAnalysis.avgGrossSalary)}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        <p className="text-sm text-amber-600">Min Salary</p>
                                        <p className="text-2xl font-bold">{formatCurrency(payGradeAnalysis.minSalary)}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <p className="text-sm text-purple-600">Max Salary</p>
                                        <p className="text-2xl font-bold">{formatCurrency(payGradeAnalysis.maxSalary)}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Salary Spread</p>
                                    <p className="text-xl font-semibold">{formatCurrency(payGradeAnalysis.salarySpread)}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Allowances */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-pink-500" />
                                    Allowances Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{allowanceAnalysis.totalAllowances}</p>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{formatCurrency(allowanceAnalysis.totalValue)}</p>
                                        <p className="text-xs text-muted-foreground">Total Value</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{formatCurrency(allowanceAnalysis.avgAllowanceAmount)}</p>
                                        <p className="text-xs text-muted-foreground">Average</p>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm font-medium mb-2">Top Allowances</p>
                                    <ScrollArea className="h-[120px]">
                                        {allowanceAnalysis.topAllowances.map((a, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b">
                                                <span>{a.name}</span>
                                                <Badge variant="outline">{formatCurrency(a.amount)}</Badge>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Signing Bonuses */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Signing Bonuses Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{signingBonusAnalysis.totalBonuses}</p>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{formatCurrency(signingBonusAnalysis.totalValue)}</p>
                                        <p className="text-xs text-muted-foreground">Total Value</p>
                                    </div>
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                        <p className="text-2xl font-bold">{formatCurrency(signingBonusAnalysis.avgBonusAmount)}</p>
                                        <p className="text-xs text-muted-foreground">Average</p>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm font-medium mb-2">Top Positions</p>
                                    <ScrollArea className="h-[120px]">
                                        {signingBonusAnalysis.topPositions.map((b, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b">
                                                <span>{b.positionName}</span>
                                                <Badge variant="outline">{formatCurrency(b.amount)}</Badge>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pay Types */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                Pay Types Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-4">
                                <Badge variant="outline" className="text-lg px-4 py-2">
                                    {payTypeAnalysis.totalTypes} Types Configured
                                </Badge>
                                <Badge variant="outline" className="text-lg px-4 py-2">
                                    Avg: {formatCurrency(payTypeAnalysis.avgAmount)}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {payTypeAnalysis.types.map((t, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium">{t.type}</span>
                                            <StatusBadge status={t.status} />
                                        </div>
                                        <p className="text-lg font-bold">{formatCurrency(t.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Deductions Tab */}
                <TabsContent value="deductions" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Tax Rules */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="h-5 w-5 text-red-500" />
                                    Tax Rules Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50 p-4 rounded-lg">
                                        <p className="text-sm text-red-600">Total Rules</p>
                                        <p className="text-2xl font-bold">{taxRulesAnalysis.totalRules}</p>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-blue-600">Avg Tax Rate</p>
                                        <p className="text-2xl font-bold">{taxRulesAnalysis.avgTaxRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm text-green-600">Min Rate</p>
                                        <p className="text-2xl font-bold">{taxRulesAnalysis.minRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        <p className="text-sm text-amber-600">Max Rate</p>
                                        <p className="text-2xl font-bold">{taxRulesAnalysis.maxRate.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm font-medium mb-2">Effective Tax Burden</p>
                                    <div className="flex items-center gap-2">
                                        <Progress value={taxRulesAnalysis.effectiveTaxBurden} className="flex-1" />
                                        <span className="font-bold">{taxRulesAnalysis.effectiveTaxBurden.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <ScrollArea className="h-[150px]">
                                    {taxRulesAnalysis.rateDistribution.map((r, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-2 border-b">
                                            <div>
                                                <span className="font-medium">{r.name}</span>
                                                {r.description && (
                                                    <p className="text-xs text-muted-foreground">{r.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{r.rate}%</Badge>
                                                <StatusBadge status={r.status} />
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Insurance Brackets */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-blue-500" />
                                    Insurance Brackets Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-blue-600">Total Brackets</p>
                                        <p className="text-2xl font-bold">{insuranceAnalysis.totalBrackets}</p>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <p className="text-sm text-purple-600">Avg Employee Rate</p>
                                        <p className="text-2xl font-bold">{insuranceAnalysis.avgEmployeeRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <p className="text-sm text-green-600">Avg Employer Rate</p>
                                        <p className="text-2xl font-bold">{insuranceAnalysis.avgEmployerRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        <p className="text-sm text-amber-600">Coverage Gaps</p>
                                        <p className="text-2xl font-bold">{insuranceAnalysis.coverageGaps.length}</p>
                                    </div>
                                </div>
                                {insuranceAnalysis.coverageGaps.length > 0 && (
                                    <div className="bg-red-50 p-3 rounded-lg">
                                        <p className="text-sm font-medium text-red-800 mb-2">⚠️ Coverage Gaps Detected</p>
                                        {insuranceAnalysis.coverageGaps.map((gap, idx) => (
                                            <p key={idx} className="text-xs text-red-600">
                                                Gap: {formatCurrency(gap.min)} - {formatCurrency(gap.max)}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Insurance Bracket Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Insurance Rate Comparison</CardTitle>
                            <CardDescription>Employee vs Employer contribution rates by bracket</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={insuranceBracketData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis unit="%" />
                                    <Tooltip formatter={(value) => `${value}%`} />
                                    <Legend />
                                    <Bar dataKey="employee" fill="#8b5cf6" name="Employee Rate" />
                                    <Bar dataKey="employer" fill="#10b981" name="Employer Rate" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Termination Benefits */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="h-5 w-5 text-rose-500" />
                                Termination & Resignation Benefits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-2xl font-bold">{terminationBenefits.totalBenefits}</p>
                                    <p className="text-xs text-muted-foreground">Total Benefits</p>
                                </div>
                                <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-2xl font-bold">{formatCurrency(terminationBenefits.totalValue)}</p>
                                    <p className="text-xs text-muted-foreground">Total Value</p>
                                </div>
                                <div className="text-center p-3 bg-muted rounded-lg">
                                    <p className="text-2xl font-bold">{formatCurrency(terminationBenefits.avgBenefitAmount)}</p>
                                    <p className="text-xs text-muted-foreground">Average</p>
                                </div>
                            </div>
                            <ScrollArea className="h-[150px]">
                                {terminationBenefits.benefits.map((b, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b">
                                        <div>
                                            <span className="font-medium">{b.name}</span>
                                            {b.terms && <p className="text-xs text-muted-foreground">{b.terms}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{formatCurrency(b.amount)}</Badge>
                                            <StatusBadge status={b.status} />
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Policies Tab */}
                <TabsContent value="policies" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Policy Type Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-purple-500" />
                                    Policies by Type
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {policyTypeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <RechartsPie>
                                            <Pie
                                                data={policyTypeData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`}
                                            >
                                                {policyTypeData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </RechartsPie>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                        No policies configured
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Policy Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy Configuration Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <p className="text-sm text-purple-600">Total Policies</p>
                                        <p className="text-2xl font-bold">{policyAnalysis.totalPolicies}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        <p className="text-sm text-amber-600">Upcoming Effective</p>
                                        <p className="text-2xl font-bold">{policyAnalysis.upcomingEffective.length}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-sm font-medium mb-2">By Applicability</p>
                                    <div className="space-y-2">
                                        {policyAnalysis.byApplicability.filter(a => a.count > 0).map((a, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-sm">{a.applicability}</span>
                                                <Badge variant="outline">{a.count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {policyAnalysis.upcomingEffective.length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm font-medium mb-2">🗓️ Upcoming Effective Dates</p>
                                            <ScrollArea className="h-[100px]">
                                                {policyAnalysis.upcomingEffective.map((p, idx) => (
                                                    <div key={idx} className="flex justify-between items-center py-2 border-b">
                                                        <span className="text-sm">{p.policyName}</span>
                                                        <Badge variant="outline">
                                                            In {p.daysUntilEffective} days
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Policy Details Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>All Policies</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[300px]">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3">Policy Name</th>
                                            <th className="text-center py-2 px-3">Type</th>
                                            <th className="text-center py-2 px-3">Applicability</th>
                                            <th className="text-center py-2 px-3">Percentage</th>
                                            <th className="text-center py-2 px-3">Fixed Amount</th>
                                            <th className="text-center py-2 px-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {policyAnalysis.policies.map((p, idx) => (
                                            <tr key={idx} className="border-b hover:bg-muted/50">
                                                <td className="py-2 px-3 font-medium">{p.policyName}</td>
                                                <td className="text-center py-2 px-3">
                                                    <Badge variant="secondary">{p.policyType}</Badge>
                                                </td>
                                                <td className="text-center py-2 px-3 text-sm">{p.applicability}</td>
                                                <td className="text-center py-2 px-3">{p.percentage}%</td>
                                                <td className="text-center py-2 px-3">{formatCurrency(p.fixedAmount)}</td>
                                                <td className="text-center py-2 px-3">
                                                    <StatusBadge status={p.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Workflow Tab */}
                <TabsContent value="workflow" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Approval Metrics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-500" />
                                    Approval Workflow Metrics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <p className="text-sm text-blue-600">Total Configurations</p>
                                        <p className="text-2xl font-bold">{approvalMetrics.totalConfigurations}</p>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        <p className="text-sm text-amber-600">Pending Approvals</p>
                                        <p className="text-2xl font-bold">{approvalMetrics.pendingApprovals}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-2">Approval Rate by Category</p>
                                    <ScrollArea className="h-[200px]">
                                        {approvalMetrics.approvalRateByCategory.map((c, idx) => (
                                            <div key={idx} className="py-2 border-b">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium">{c.category}</span>
                                                    <span className="text-sm">{c.approvalRate.toFixed(0)}%</span>
                                                </div>
                                                <Progress value={c.approvalRate} className="h-2" />
                                                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                                    <span className="text-green-600">✓ {c.approved}</span>
                                                    <span className="text-amber-600">◷ {c.pending}</span>
                                                    <span className="text-red-600">✗ {c.rejected}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-green-500" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="approvals">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="approvals">Approvals</TabsTrigger>
                                        <TabsTrigger value="rejections">Rejections</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="approvals">
                                        <ScrollArea className="h-[250px]">
                                            {approvalMetrics.recentApprovals.length > 0 ? (
                                                approvalMetrics.recentApprovals.map((a, idx) => (
                                                    <div key={idx} className="flex justify-between items-start py-2 border-b">
                                                        <div>
                                                            <p className="font-medium">{a.name}</p>
                                                            <p className="text-xs text-muted-foreground">{a.category}</p>
                                                            {a.approvedBy && (
                                                                <p className="text-xs text-green-600">By: {a.approvedBy}</p>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                                            {a.approvedAt 
                                                                ? new Date(a.approvedAt).toLocaleDateString() 
                                                                : 'Approved'}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">No recent approvals</p>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>
                                    <TabsContent value="rejections">
                                        <ScrollArea className="h-[250px]">
                                            {approvalMetrics.recentRejections.length > 0 ? (
                                                approvalMetrics.recentRejections.map((r, idx) => (
                                                    <div key={idx} className="flex justify-between items-start py-2 border-b">
                                                        <div>
                                                            <p className="font-medium">{r.name}</p>
                                                            <p className="text-xs text-muted-foreground">{r.category}</p>
                                                        </div>
                                                        <Badge variant="outline" className="bg-red-50 text-red-700">
                                                            {r.rejectedAt 
                                                                ? new Date(r.rejectedAt).toLocaleDateString() 
                                                                : 'Rejected'}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-muted-foreground py-8">No recent rejections</p>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Health Score Tab */}
                <TabsContent value="health" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Overall Health Score */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Heart className="h-5 w-5 text-red-500" />
                                    Configuration Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <HealthScoreGauge score={healthScore.overallScore} />
                            </CardContent>
                        </Card>

                        {/* Category Health Radar */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Health by Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={healthCategoryData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                        <Radar name="Health Score" dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Critical Issues & Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    Critical Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {healthScore.criticalIssues.length > 0 ? (
                                    <ScrollArea className="h-[200px]">
                                        {healthScore.criticalIssues.map((issue, idx) => (
                                            <div key={idx} className="flex items-start gap-2 py-2 border-b">
                                                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{issue}</span>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                ) : (
                                    <div className="flex items-center justify-center h-[200px] text-green-600">
                                        <CheckCircle className="h-8 w-8 mr-2" />
                                        No critical issues found
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-500" />
                                    Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {healthScore.recommendations.length > 0 ? (
                                    <ScrollArea className="h-[200px]">
                                        {healthScore.recommendations.map((rec, idx) => (
                                            <div key={idx} className="flex items-start gap-2 py-2 border-b">
                                                <Zap className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{rec}</span>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                ) : (
                                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                                        No recommendations at this time
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Category Health Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {healthScore.categories.map((cat, idx) => (
                                    <div key={idx} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">{cat.category}</span>
                                            <Badge 
                                                variant="outline" 
                                                className={
                                                    cat.score >= 80 ? 'bg-green-50 text-green-700' :
                                                    cat.score >= 60 ? 'bg-amber-50 text-amber-700' :
                                                    'bg-red-50 text-red-700'
                                                }
                                            >
                                                {cat.score}%
                                            </Badge>
                                        </div>
                                        <Progress value={cat.score} className="h-2 mb-2" />
                                        {cat.issues.length > 0 && (
                                            <div className="mt-2">
                                                {cat.issues.slice(0, 2).map((issue, i) => (
                                                    <p key={i} className="text-xs text-muted-foreground">• {issue}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
