'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { 
  AlertCircle, 
  CheckCircle, 
  Lock, 
  FileWarning,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  FileCheck,
  Eye,
  Settings,
  History,
  AlertOctagon,
  BarChart3,
  ShieldCheck,
  Filter,
  ClipboardCheck,
  LockKeyhole
} from "lucide-react";

interface Stats {
  pendingApprovals: number;
  totalPayroll: number;
  exceptions: number;
  frozenRuns: number;
  currency: string;
}

export default function PayrollManagerPage() {
  const [stats, setStats] = useState<Stats>({
    pendingApprovals: 0,
    totalPayroll: 0,
    exceptions: 0,
    frozenRuns: 0,
    currency: '',
  });
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);


  useEffect(() => {
    fetchStatsAndIrregularities();
  }, []);

  // Fetch company currency on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const res = await payrollConfigurationService.getCompanyCurrency();
        const data = (res as any)?.data ?? (res as any);
        const currency = (data && (data.currency ?? '')) || '';
        setStats((prev) => ({ ...prev, currency }));
      } catch (e) {
        // fallback: do not update currency
      }
    };
    fetchCurrency();
  }, []);

  const fetchStatsAndIrregularities = async () => {
    setLoading(true);
    try {
      // Fetch payroll runs stats
      const res = await payrollExecutionService.listRuns({ page: 1, limit: 100 });
      let pending = 0;
      let totalPay = 0;
      let frozen = 0;
      let currency = '';
      if (!res?.error) {
        const data = (res?.data || res) as any;
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');
        pending = items.filter((r: any) => {
          const status = normalizeStatus(r.status);
          return status === 'under_review' || status === 'under review';
        }).length;
        totalPay = items.reduce((sum: number, r: any) => sum + (r.totalnetpay || r.totalNetPay || 0), 0);
        frozen = items.filter((r: any) => {
          const status = (r.status || '').toLowerCase();
          return status === 'locked' || status === 'frozen' || r.frozen === true;
        }).length;
        // Get currency from first run, fallback to empty string
        if (items.length > 0) {
          currency = items[0].currency || '';
        }
      }

      // Fetch irregularities count for exceptions
      let irregularitiesCount = 0;
      if (payrollExecutionService.listIrregularities) {
        try {
          const irrRes = await payrollExecutionService.listIrregularities({ status: 'pending' });
          if (
            irrRes &&
            typeof irrRes === 'object' &&
            irrRes.data &&
            typeof irrRes.data === 'object' &&
            'data' in irrRes.data &&
            Array.isArray((irrRes.data as any).data)
          ) {
            irregularitiesCount = (irrRes.data as any).data.length;
          } else if (irrRes && Array.isArray(irrRes.data)) {
            irregularitiesCount = irrRes.data.length;
          } else {
            irregularitiesCount = 0;
          }
        } catch (e) {
          // ignore, fallback to 0
        }
      }

      setStats((prev) => ({
        pendingApprovals: pending,
        totalPayroll: totalPay,
        exceptions: irregularitiesCount,
        frozenRuns: frozen,
        currency: prev.currency || currency,
      }));
    } catch (e: any) {
      console.error('Failed to fetch stats:', e);
      setStats({
        pendingApprovals: 0,
        totalPayroll: 0,
        exceptions: 0,
        frozenRuns: 0,
        currency: '',
      });
    } finally {
      setLoading(false);
    }
  };

  // Accept currency param, fallback to empty string
  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || stats.currency || '';
    if (!curr) return amount.toLocaleString();
    return `${curr} ${amount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
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
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Payroll Management Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground">
              Monitor, review, and manage payroll execution and compliance
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 border-primary/30">
            <ShieldCheck className="h-3 w-3 mr-2" />
            Manager Access
          </Badge>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pending Approvals Card */}
          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Approvals
                </CardTitle>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <FileCheck className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                    {stats.pendingApprovals}
                  </span>
                  <span className="text-sm text-muted-foreground">payroll runs</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link 
                href="/dashboard/payroll-manager/runs"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Review runs
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          {/* Total Payroll Card */}
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Payroll Value
                </CardTitle>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    {formatCurrency(stats.totalPayroll, stats.currency)}
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Total processed payroll amount
              </div>
            </CardFooter>
          </Card>

          {/* Exceptions Card */}
          <Card className="border-l-4 border-l-rose-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Exceptions
                </CardTitle>
                <div className="p-2 bg-rose-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${stats.exceptions > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                    {stats.exceptions}
                  </span>
                  <span className="text-sm text-muted-foreground">issues</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Link 
                href="/dashboard/payroll-manager/irregularities"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Resolve exceptions
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          {/* Frozen Runs Card */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Frozen Payroll Runs
                </CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <LockKeyhole className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${stats.frozenRuns > 0 ? 'text-blue-600' : 'text-foreground'}`}>
                    {stats.frozenRuns}
                  </span>
                  <span className="text-sm text-muted-foreground">locked runs</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Finalized and secured payroll
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Payroll Management Actions
            </CardTitle>
            <CardDescription>
              Essential controls for payroll oversight and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Approve Payroll */}
              <Link 
                href="/dashboard/payroll-manager/runs"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 p-2 bg-green-50 rounded-lg w-fit">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Approve Payroll</h3>
                  <p className="text-xs text-muted-foreground">
                    Review and approve payroll submissions
                  </p>
                </div>
              </Link>

              {/* Freeze/Unfreeze */}
              <Link 
                href="/dashboard/payroll-manager/runs"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-blue-500/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 p-2 bg-blue-50 rounded-lg w-fit">
                    <Lock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Freeze/Unfreeze</h3>
                  <p className="text-xs text-muted-foreground">
                    Secure finalized payroll data
                  </p>
                </div>
              </Link>

              {/* Irregularities */}
              <Link 
                href="/dashboard/payroll-manager/irregularities"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-amber-500/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 p-2 bg-amber-50 rounded-lg w-fit">
                    <FileWarning className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Irregularities</h3>
                  <p className="text-xs text-muted-foreground">
                    Investigate and resolve issues
                  </p>
                </div>
              </Link>

              {/* All Runs */}
              <Link 
                href="/dashboard/payroll-manager/runs"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-purple-500/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 p-2 bg-purple-50 rounded-lg w-fit">
                    <History className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">All Runs</h3>
                  <p className="text-xs text-muted-foreground">
                    Access complete payroll history
                  </p>
                </div>
              </Link>

              {/* Critical Issues */}
              <Link 
                href="/dashboard/payroll-manager/irregularities"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-rose-500/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-4 p-2 bg-rose-50 rounded-lg w-fit">
                    <AlertOctagon className="h-6 w-6 text-rose-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Critical Issues</h3>
                  <p className="text-xs text-muted-foreground">
                    Address high-priority exceptions
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Responsibilities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Responsibilities */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Manager Responsibilities
              </CardTitle>
              <CardDescription>
                Key oversight functions and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-1 bg-primary/10 rounded">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Payroll Verification</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review payroll drafts and verify employee-by-employee calculations for accuracy
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-1 bg-green-500/10 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Approval Workflow</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Approve payroll runs after resolving all exceptions and discrepancies
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-1 bg-blue-500/10 rounded">
                    <LockKeyhole className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Payroll Security</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Freeze finalized payroll to prevent unauthorized changes and maintain data integrity
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="p-1 bg-amber-500/10 rounded">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Exception Management</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Investigate and resolve escalated irregularities and compliance issues
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Current payroll processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-500/10 rounded">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Active Users</span>
                  </div>
                  <Badge variant="outline" className="border-green-200 text-green-700">
                    Online
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/10 rounded">
                      <Filter className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Processing Queue</span>
                  </div>
                  <Badge variant="outline" className="border-blue-200 text-blue-700">
                    Normal
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-emerald-500/10 rounded">
                      <Eye className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium">Audit Trail</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                    Active
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-purple-500/10 rounded">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Compliance</span>
                  </div>
                  <Badge variant="outline" className="border-purple-200 text-purple-700">
                    Compliant
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={fetchStatsAndIrregularities}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh Dashboard"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}