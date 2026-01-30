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
    Loader2, TrendingUp, TrendingDown, Activity, Ghost, AlertTriangle, 
    BrainCircuit, DollarSign, Users, Building2, PieChart, BarChart3,
    ShieldCheck, FileWarning, ArrowUp, ArrowDown, Minus, CheckCircle,
    XCircle, Clock, AlertCircle, Target, Zap
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend,
    ComposedChart
} from 'recharts';
import { toast } from 'sonner';
import { 
    payrollAnalyticsService, 
    PayrollDashboardSummary,
    PayrollAnomaly,
    PayrollCostTrend,
    DepartmentCostBreakdown,
    DeductionsBreakdown,
    SalaryDistribution,
    ClaimsDisputesMetrics,
    PayrollComplianceMetrics,
    PayrollForecast,
    ExecutionMetrics
} from "@/app/services/analytics";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function TrendIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
    if (value > 0) {
        return <span className="text-green-500 flex items-center gap-1 text-sm"><ArrowUp className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
    } else if (value < 0) {
        return <span className="text-red-500 flex items-center gap-1 text-sm"><ArrowDown className="h-3 w-3" />{Math.abs(value).toFixed(1)}{suffix}</span>;
    }
    return <span className="text-muted-foreground flex items-center gap-1 text-sm"><Minus className="h-3 w-3" />0{suffix}</span>;
}

export default function PayrollAdvancedAnalytics() {
    const [data, setData] = useState<PayrollDashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashboardData = await payrollAnalyticsService.getDashboardSummary();
                setData(dashboardData);
            } catch (error) {
                console.error('Failed to load payroll analytics:', error);
                toast.error("Failed to load payroll analytics");
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
                <p className="text-muted-foreground">No payroll data available</p>
            </div>
        );
    }

    const { overview, trends, departmentBreakdown, deductions, salaryDistribution, claimsDisputes, compliance, forecast, anomalies, executionMetrics } = data;

    // Prepare chart data for salary distribution
    const salaryChartData = salaryDistribution.map(s => ({
        name: s.bracket,
        employees: s.employeeCount,
        payout: s.totalPayout
    }));

    // Prepare deductions pie chart data
    const deductionsPieData = deductions.map((d, i) => ({
        name: d.category,
        value: d.totalAmount,
        color: COLORS[i % COLORS.length]
    }));

    // Prepare department bar chart data
    const deptChartData = departmentBreakdown.slice(0, 8).map(d => ({
        name: d.departmentName.length > 15 ? d.departmentName.substring(0, 12) + '...' : d.departmentName,
        fullName: d.departmentName,
        net: d.totalNet,
        employees: d.employeeCount,
        avg: d.avgSalary
    }));

    return (
        <div className="space-y-6 p-6 bg-background min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <BrainCircuit className="h-8 w-8" />
                        PAYROLL INTELLIGENCE CENTER
                    </h1>
                    <p className="text-muted-foreground mt-1">Advanced Analytics & Data Science Insights</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="py-1 px-3">
                        {overview.currentPeriod}
                    </Badge>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        <Zap className="h-3 w-3 mr-1" /> LIVE
                    </Badge>
                </div>
            </div>

            {/* KPI Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Payroll</p>
                                <p className="text-2xl font-bold">{formatCurrency(overview.totalPayrollCost)}</p>
                            </div>
                            <DollarSign className="h-5 w-5 text-blue-500" />
                        </div>
                        {trends.length > 1 && (
                            <TrendIndicator value={trends[trends.length - 1]?.changeFromPrevious || 0} />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">Employees</p>
                                <p className="text-2xl font-bold">{overview.totalEmployees}</p>
                            </div>
                            <Users className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">Avg: {formatCurrency(overview.avgSalary)}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deductions</p>
                                <p className="text-2xl font-bold">{formatCurrency(overview.totalDeductions)}</p>
                            </div>
                            <BarChart3 className="h-5 w-5 text-orange-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">{deductions.length} categories</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                                <p className="text-2xl font-bold">{overview.pendingApprovals}</p>
                            </div>
                            <Clock className="h-5 w-5 text-purple-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">{overview.exceptionsCount} exceptions</p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${
                    compliance.status === 'COMPLIANT' ? 'border-l-green-500' : 
                    compliance.status === 'AT_RISK' ? 'border-l-yellow-500' : 'border-l-red-500'
                }`}>
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-muted-foreground">Compliance Score</p>
                                <p className="text-2xl font-bold">{compliance.complianceScore}%</p>
                            </div>
                            <ShieldCheck className={`h-5 w-5 ${
                                compliance.status === 'COMPLIANT' ? 'text-green-500' : 
                                compliance.status === 'AT_RISK' ? 'text-yellow-500' : 'text-red-500'
                            }`} />
                        </div>
                        <Badge variant={
                            compliance.status === 'COMPLIANT' ? 'default' : 
                            compliance.status === 'AT_RISK' ? 'secondary' : 'destructive'
                        } className="mt-1">
                            {compliance.status.replace('_', ' ')}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="trends" className="space-y-4">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="trends">Cost Trends</TabsTrigger>
                    <TabsTrigger value="departments">Departments</TabsTrigger>
                    <TabsTrigger value="deductions">Deductions</TabsTrigger>
                    <TabsTrigger value="distribution">Salary Distribution</TabsTrigger>
                    <TabsTrigger value="claims">Claims & Disputes</TabsTrigger>
                    <TabsTrigger value="forecast">Forecast</TabsTrigger>
                </TabsList>

                {/* Cost Trends Tab */}
                <TabsContent value="trends" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Payroll Cost Trend
                                </CardTitle>
                                <CardDescription>Monthly payroll costs over time</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={trends}>
                                        <defs>
                                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                        <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
                                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                        <Tooltip 
                                            formatter={(value) => formatCurrency(value as number)}
                                            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="totalNet" name="Net Pay" stroke="#3b82f6" fill="url(#colorNet)" strokeWidth={2} />
                                        <Line type="monotone" dataKey="totalGross" name="Gross Pay" stroke="#10b981" strokeWidth={2} dot={false} />
                                        <Bar dataKey="employeeCount" name="Employees" fill="#f59e0b" opacity={0.6} yAxisId="right" />
                                        <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Anomaly Radar */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Anomaly Radar
                                </CardTitle>
                                <CardDescription>Detected irregularities</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[300px]">
                                    {anomalies.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                                            <CheckCircle className="h-12 w-12 mb-2 text-green-500 opacity-50" />
                                            <p>No anomalies detected</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/50">
                                            {anomalies.map((anomaly, i) => (
                                                <div key={i} className="p-4 hover:bg-muted/20 transition-colors">
                                                    <div className="flex items-start justify-between mb-1">
                                                        <Badge variant={anomaly.severity === 'HIGH' ? 'destructive' : 'secondary'} className="text-[10px]">
                                                            {anomaly.type.replace(/_/g, ' ')}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {anomaly.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm mt-2">{anomaly.description}</p>
                                                    {anomaly.employeeName && (
                                                        <p className="text-xs text-muted-foreground mt-1">{anomaly.employeeName}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Departments Tab */}
                <TabsContent value="departments" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Department Cost Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptChartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={12} />
                                        <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                                        <Tooltip 
                                            formatter={(value, name) => [formatCurrency(value as number), name === 'net' ? 'Net Pay' : 'Avg Salary']}
                                            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="net" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Net Pay" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Department Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-3">
                                        {departmentBreakdown.map((dept, i) => (
                                            <div key={i} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium">{dept.departmentName}</p>
                                                        <p className="text-sm text-muted-foreground">{dept.employeeCount} employees</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold">{formatCurrency(dept.totalNet)}</p>
                                                        <TrendIndicator value={dept.changePercentage} />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Avg: {formatCurrency(dept.avgSalary)}</span>
                                                    <span>{dept.percentageOfTotal.toFixed(1)}% of total</span>
                                                </div>
                                                <Progress value={dept.percentageOfTotal} className="h-1 mt-2" />
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Deductions Tab */}
                <TabsContent value="deductions" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Deductions Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={deductionsPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            labelLine={true}
                                        >
                                            {deductionsPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Deduction Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[350px]">
                                    <div className="space-y-4">
                                        {deductions.map((ded, i) => (
                                            <div key={i} className="p-3 border rounded-lg">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                        <span className="font-medium">{ded.category}</span>
                                                    </div>
                                                    <span className="font-bold">{formatCurrency(ded.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                                    <span>{ded.employeesAffected} employees affected</span>
                                                    <span>Avg: {formatCurrency(ded.avgPerEmployee)}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {ded.items.slice(0, 3).map((item, j) => (
                                                        <div key={j} className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">{item.name}</span>
                                                            <span>{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Salary Distribution Tab */}
                <TabsContent value="distribution" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Salary Distribution by Bracket
                            </CardTitle>
                            <CardDescription>Employee count and total payout per salary range</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salaryChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={11} />
                                    <YAxis yAxisId="left" tickFormatter={(v) => `${v}`} fontSize={12} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} fontSize={12} />
                                    <Tooltip 
                                        formatter={(value, name) => [
                                            name === 'employees' ? value : formatCurrency(value as number), 
                                            name === 'employees' ? 'Employees' : 'Total Payout'
                                        ]}
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="employees" fill="#3b82f6" name="Employees" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="payout" fill="#10b981" name="Total Payout" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Claims & Disputes Tab */}
                <TabsContent value="claims" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground">Claims Submitted</p>
                                <p className="text-2xl font-bold">{claimsDisputes.claimsSubmitted}</p>
                                <p className="text-sm text-green-500">{claimsDisputes.claimsApproved} approved</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground">Total Claims Amount</p>
                                <p className="text-2xl font-bold">{formatCurrency(claimsDisputes.totalClaimsAmount)}</p>
                                <p className="text-sm text-muted-foreground">Avg: {formatCurrency(claimsDisputes.avgClaimAmount)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground">Disputes</p>
                                <p className="text-2xl font-bold">{claimsDisputes.disputesSubmitted}</p>
                                <p className="text-sm text-green-500">{claimsDisputes.disputesResolved} resolved</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-4">
                                <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                                <p className="text-2xl font-bold">{claimsDisputes.avgResolutionDays.toFixed(1)} days</p>
                                <p className="text-sm text-muted-foreground">{claimsDisputes.disputesPending} pending</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Compliance Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                Compliance Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-3xl font-bold mb-1">{compliance.totalEmployees}</p>
                                    <p className="text-sm text-muted-foreground">Total Employees</p>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-3xl font-bold mb-1 text-yellow-500">{compliance.employeesWithExceptions}</p>
                                    <p className="text-sm text-muted-foreground">With Exceptions</p>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-3xl font-bold mb-1 text-orange-500">{compliance.missingBankAccounts}</p>
                                    <p className="text-sm text-muted-foreground">Missing Bank</p>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-3xl font-bold mb-1 text-red-500">{compliance.negativeNetPay}</p>
                                    <p className="text-sm text-muted-foreground">Negative Pay</p>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <p className="text-3xl font-bold mb-1 text-purple-500">{compliance.salaryBelowMinimum}</p>
                                    <p className="text-sm text-muted-foreground">Below Minimum</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Forecast Tab */}
                <TabsContent value="forecast" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="border-2 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5" />
                                    Next Period Forecast
                                </CardTitle>
                                <CardDescription>{forecast.period}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="text-center py-4">
                                        <p className="text-sm text-muted-foreground mb-1">Predicted Total Payroll</p>
                                        <p className="text-4xl font-black text-primary">{formatCurrency(forecast.predictedTotal)}</p>
                                        <div className="flex items-center justify-center gap-2 mt-2">
                                            <Badge variant="outline">
                                                Confidence: {forecast.confidence}%
                                            </Badge>
                                        </div>
                                    </div>
                                    
                                    <Separator />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Predicted Gross</p>
                                            <p className="text-xl font-bold">{formatCurrency(forecast.predictedGross)}</p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Predicted Deductions</p>
                                            <p className="text-xl font-bold">{formatCurrency(forecast.predictedDeductions)}</p>
                                        </div>
                                    </div>

                                    {forecast.factors.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium mb-2">Contributing Factors:</p>
                                            <div className="space-y-1">
                                                {forecast.factors.map((factor, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Activity className="h-3 w-3" />
                                                        {factor}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Execution Metrics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Execution Performance
                                </CardTitle>
                                <CardDescription>Payroll run processing metrics</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={executionMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="period" fontSize={11} />
                                        <YAxis fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="runsApproved" name="Approved" fill="#10b981" stackId="runs" />
                                        <Bar dataKey="runsRejected" name="Rejected" fill="#ef4444" stackId="runs" />
                                        <Bar dataKey="exceptionsRaised" name="Exceptions" fill="#f59e0b" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
