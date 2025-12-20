'use client';

import { useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import Link from 'next/link';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../.././components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { 
  AlertCircle, 
  CheckCircle, 
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Building,
  Clock,
  Shield,
  ChevronRight,
  RefreshCw,
  Settings,
  Eye,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  Banknote,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Check,
  ArrowRight,
  Percent,
  Calculator,
  FileCheck,
  Lock,
  Unlock
} from "lucide-react";

interface Stats {
  pendingApprovals: number;
  totalPayroll: number;
  payslipsReady: number;
  fullyApproved: number;
  totalRuns: number;
}

interface RecentRun {
  _id: string;
  entity?: string;
  payrollPeriod?: any;
  status?: string;
  totalnetpay?: number;
  totalNetPay?: number;
  approvedByManager?: boolean;
  approvedByFinance?: boolean;
  payslipsGenerated?: boolean;
  createdAt?: string;
}

export default function FinanceStaffPage() {
  const [stats, setStats] = useState<Stats>({
    pendingApprovals: 0,
    totalPayroll: 0,
    payslipsReady: 0,
    fullyApproved: 0,
    totalRuns: 0,
  });
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

  useEffect(() => {
    // Load cached data first
    const cachedStats = localStorage.getItem('finance_staff_stats');
    const cachedRuns = localStorage.getItem('finance_staff_recent_runs');

    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {
        console.error('Failed to parse cached stats', e);
      }
    }

    if (cachedRuns) {
      try {
        setRecentRuns(JSON.parse(cachedRuns));
      } catch (e) {
        console.error('Failed to parse cached runs', e);
      }
    }

    if (cachedStats || cachedRuns) {
      setLoading(false);
    }

    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listRuns({ page: 1, limit: 100 });

      if (res?.error) {
        setError(res.error);
        return;
      }

      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');

      const pendingFinance = items.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'pending_finance_approval' || status === 'approved';
      });
      const pending = pendingFinance.length;

      const totalPay = pendingFinance.reduce((sum: number, r: any) =>
        sum + (r.totalnetpay || r.totalNetPay || 0), 0);

      const lockedRuns = items.filter((r: any) => normalizeStatus(r.status) === 'locked');
      const fullyApprovedCount = lockedRuns.length;

      const withPayslips = lockedRuns.length;

      const newStats = {
        pendingApprovals: pending,
        totalPayroll: totalPay,
        payslipsReady: withPayslips,
        fullyApproved: fullyApprovedCount,
        totalRuns: items.length,
      };

      setStats(newStats);
      localStorage.setItem('finance_staff_stats', JSON.stringify(newStats));

      const sorted = [...items].sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      const newRecentRuns = sorted.slice(0, 5);
      setRecentRuns(newRecentRuns);
      localStorage.setItem('finance_staff_recent_runs', JSON.stringify(newRecentRuns));

    } catch (e: any) {
      console.error('Failed to fetch stats:', e);
      // Only show error if we don't have cached data, or maybe show ephemeral?
      // For now, setting error is fine, UI handles it.
      if (!stats.totalRuns) {
        setError(e?.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Accept currency param, fallback to EGP
  const formatCurrency = (amount: number, currency: string = 'EGP') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatPeriod = (period: any): string => {
    if (!period) return 'No Period';
    if (typeof period === 'string') {
      const d = new Date(period);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
      return period;
    }
    if (typeof period === 'object') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = period.month !== undefined ? monthNames[period.month] || `M${period.month}` : '';
      const year = period.year || '';
      if (month && year) return `${month} ${year}`;
      if (period.startDate) {
        const d = new Date(period.startDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
      }
    }
    return 'No Period';
  };

  const getStatusBadge = (run: RecentRun) => {
    const status = (run.status || '').toLowerCase().replace(/\s+/g, '_');
    if (status === 'locked') {
      return (
        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending Manager
      </Badge>
    );
  };

  const getPayslipStatus = (run: RecentRun) => {
    const status = (run.status || '').toLowerCase().replace(/\s+/g, '_');
    const hasPayslips = status === 'locked';
    return hasPayslips ? (
      <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
        <FileSpreadsheet className="h-3 w-3 mr-1" />
        Generated
      </Badge>
    ) : (
      <Badge variant="outline" className="border-muted text-muted-foreground">
        Pending
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6 relative">
      {/* Theme Customizer Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger 
          onClick={() => setShowThemeCustomizer(true)}
        />
      </div>
      
      {/* Theme Customizer Modal */}
      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="hover:text-primary transition-colors">Finance Department</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Dashboard</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Banknote className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Finance Payroll Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground">
                Final approval, financial review, and payslip generation for payroll processing
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 border-primary/30">
              <Shield className="h-3 w-3 mr-2" />
              Finance Access
            </Badge>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          </div>
        )}

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Pending Approvals */}
          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Finance Approval
                </CardTitle>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${stats.pendingApprovals > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {stats.pendingApprovals}
                  </span>
                  <span className="text-sm text-muted-foreground">runs</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link 
                href="/dashboard/finance-staff/runs"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Review runs
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          {/* Pending Total */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Total Value
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {formatCurrency(stats.totalPayroll)}
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Total payroll value awaiting approval
              </div>
            </CardFooter>
          </Card>

          {/* Payslips Generated */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Payslips Generated
                </CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-600">{stats.payslipsReady}</span>
                  <span className="text-sm text-muted-foreground">batches</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Ready for distribution
              </div>
            </CardFooter>
          </Card>

          {/* Fully Approved */}
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fully Approved
                </CardTitle>
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-success">{stats.fullyApproved}</span>
                  <span className="text-sm text-muted-foreground">runs</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Finalized payroll
              </div>
            </CardFooter>
          </Card>

          {/* Total Runs */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Payroll Runs
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Receipt className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">{stats.totalRuns}</span>
                  <span className="text-sm text-muted-foreground">total</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                All-time payroll runs
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Payroll Activity
                </CardTitle>
                <CardDescription>
                  Latest payroll runs requiring attention or recently processed
                </CardDescription>
              </div>
              <Link href="/dashboard/finance-staff/runs">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Receipt className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No recent activity</h3>
                <p className="text-muted-foreground">
                  No payroll runs have been processed recently
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <div 
                    key={run._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-foreground">
                            {run.entity || 'Default Entity'}
                          </h4>
                          {getStatusBadge(run)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatPeriod(run.payrollPeriod)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(run.totalnetpay || run.totalNetPay || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getPayslipStatus(run)}
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Essential finance department operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link 
                  href="/dashboard/finance-staff/runs"
                  className="group flex items-center gap-4 p-4 border rounded-lg hover:border-success/50 hover:bg-success/5 transition-all"
                >
                  <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground group-hover:text-success">Approve Payroll</h4>
                    <p className="text-sm text-muted-foreground">Final approval step before payment</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-success" />
                </Link>

                <Link 
                  href="/dashboard/finance-staff/runs"
                  className="group flex items-center gap-4 p-4 border rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
                >
                  <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20">
                    <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground group-hover:text-purple-600">Generate Payslips</h4>
                    <p className="text-sm text-muted-foreground">Create employee payslip documents</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-purple-600" />
                </Link>

                <Link 
                  href="/dashboard/finance-staff/runs"
                  className="group flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground group-hover:text-primary">Financial Review</h4>
                    <p className="text-sm text-muted-foreground">Gross-to-net breakdown analysis</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary" />
                </Link>

                <Link 
                  href="/dashboard/finance-staff/runs"
                  className="group flex items-center gap-4 p-4 border rounded-lg hover:border-warning/50 hover:bg-warning/5 transition-all"
                >
                  <div className="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20">
                    <FileText className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground group-hover:text-warning">All Runs</h4>
                    <p className="text-sm text-muted-foreground">Complete payroll history and reports</p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-warning" />
                </Link>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={fetchStats}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh Dashboard'}
              </Button>
            </CardFooter>
          </Card>

          {/* Responsibilities & Workflow */}
          <div className="space-y-6 lg:col-span-2">
            {/* Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Finance Department Responsibilities
                </CardTitle>
                <CardDescription>
                  Key oversight functions for payroll processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                    <div className="p-1 bg-success/20 rounded">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Final Payroll Approval</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Provide final approval of payroll after manager review and validation
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                    <div className="p-1 bg-purple-500/20 rounded">
                      <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Payslip Generation</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate and distribute payslips automatically after final approval
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                    <div className="p-1 bg-primary/20 rounded">
                      <Calculator className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Financial Validation</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Review gross-to-net breakdown and verify all tax and insurance deductions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
                    <div className="p-1 bg-warning/20 rounded">
                      <Percent className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Compliance Verification</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Verify tax calculations and insurance deductions are compliant with regulations
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Workflow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5" />
                  Payroll Approval Workflow
                </CardTitle>
                <CardDescription>
                  Complete workflow from creation to distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">Specialist</span>
                    <span className="text-xs text-muted-foreground">Creates payroll</span>
                  </div>
                  
                  <ChevronRight className="h-6 w-6 text-muted-foreground mx-4" />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-2">
                      <span className="font-bold text-warning">2</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">Manager</span>
                    <span className="text-xs text-muted-foreground">Reviews & approves</span>
                  </div>
                  
                  <ChevronRight className="h-6 w-6 text-muted-foreground mx-4" />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-2 ring-2 ring-success/30">
                      <span className="font-bold text-success">3</span>
                    </div>
                    <span className="text-sm font-medium text-success">Finance</span>
                    <span className="text-xs text-success font-medium">Final approval</span>
                  </div>
                  
                  <ChevronRight className="h-6 w-6 text-muted-foreground mx-4" />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-2">
                      <span className="font-bold text-purple-600">4</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">Payslips</span>
                    <span className="text-xs text-muted-foreground">Generation & distribution</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}