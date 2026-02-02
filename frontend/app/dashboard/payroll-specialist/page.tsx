'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/components/theme-customizer';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  DollarSign,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Settings,
  BarChart3,
  ShieldAlert,
  Play,
  Filter,
  Download,
  Plus
} from "lucide-react";

interface Stats {
  draftRuns: number;
  totalNetPayroll: number;
  processingRuns: number;
  signingBonuses: number;
  currency: string;
}

export default function PayrollSpecialistPage() {
  const [stats, setStats] = useState<Stats>({
    draftRuns: 0,
    totalNetPayroll: 0,
    processingRuns: 0,
    signingBonuses: 0,
    currency: 'EGP',
  });
  const [loading, setLoading] = useState(true);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);

  useEffect(() => {
    fetchStatsAndRuns();
  }, []);

  const fetchStatsAndRuns = async () => {
    setLoading(true);
    try {
      const runsRes = await payrollExecutionService.listRuns({ page: 1, limit: 100 });

      let bonusRes: any = [];
      try {
        bonusRes = await payrollExecutionService.listSigningBonuses('pending');
      } catch (e) {
        console.error('Failed to fetch bonuses:', e);
        bonusRes = [];
      }

      // Extract runs - handle both response formats: {data: []} or direct array
      const runsData = (runsRes?.data || runsRes) as any;
      const runs = Array.isArray(runsData?.data) ? runsData.data : Array.isArray(runsData) ? runsData : [];

      // Extract bonuses - handle both response formats: {data: []} or direct array
      const bonusData = (bonusRes?.data || bonusRes) as any;
      const bonuses = Array.isArray(bonusData) ? bonusData : [];

      console.log('Runs fetched:', runs.length, runs);
      console.log('Bonuses fetched:', bonuses.length, bonuses);

      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');

      const draftRuns = runs.filter((r: any) => normalizeStatus(r.status) === 'draft').length;
      const processingRuns = runs.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'processing' || status === 'draft' || status === 'under_review';
      }).length;
      const totalNetPay = runs.reduce((sum: number, r: any) => sum + (r.totalnetpay || r.totalNetPay || 0), 0);

      setStats({
        draftRuns,
        totalNetPayroll: totalNetPay,
        processingRuns,
        signingBonuses: bonuses.length,
        currency: runs[0]?.currency || 'EGP',
      });

      setRecentRuns(runs.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return { currency: stats.currency, amount: '0.00' };
    return {
      currency: stats.currency,
      amount: amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
    const colors: Record<string, string> = {
      'draft': 'bg-warning/15 text-warning border border-warning/30',
      'under_review': 'bg-info/15 text-info border border-info/30',
      'processing': 'bg-primary/15 text-primary border border-primary/30',
      'pending_finance_approval': 'bg-warning/15 text-warning border border-warning/30',
      'approved': 'bg-success/15 text-success border border-success/30',
      'rejected': 'bg-destructive/15 text-destructive border border-destructive/30',
      'locked': 'bg-muted/50 text-muted-foreground border border-border',
    };
    return colors[normalized] || 'bg-muted/50 text-muted-foreground border border-border';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      {/* Theme Customizer Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger onClick={() => setShowThemeCustomizer(true)} />
      </div>

      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Payroll Specialist Dashboard
              </h1>
            </div>
            <p className="text-muted-foreground">
              Process, validate, and manage payroll runs
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 border-primary/30">
            <ShieldAlert className="h-3 w-3 mr-2" />
            Specialist Access
          </Badge>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Draft Runs Card */}
          <Card className="border-l-4 border-l-warning hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Draft Runs</span>
                <div className="p-1.5 bg-warning/10 rounded-lg">
                  <FileText className="h-4 w-4 text-warning" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.draftRuns}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for processing</p>
            </CardContent>
          </Card>

          {/* Total Net Payroll Card */}
          <Card className="border-l-4 border-l-success hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Net Payroll</span>
                <div className="p-1.5 bg-success/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const formatted = formatCurrency(stats.totalNetPayroll);
                return (
                  <>
                    <div className="text-2xl font-bold text-foreground">{formatted.amount}</div>
                    <p className="text-xs text-muted-foreground mt-1">{formatted.currency}</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Processing Runs Card */}
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Processing</span>
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.processingRuns}</div>
              <p className="text-xs text-muted-foreground mt-1">In active processing</p>
            </CardContent>
          </Card>

          {/* Signing Bonuses Card */}
          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Signing Bonuses</span>
                <div className="p-1.5 bg-accent/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-accent" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.signingBonuses}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common operations for payroll processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/dashboard/payroll-specialist/runs?tab=create">
                <button className="w-full h-24 border border-dashed border-border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group">
                  <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-foreground group-hover:text-primary">Create Run</span>
                </button>
              </Link>

              <Link href="/dashboard/payroll-specialist/runs">
                <button className="w-full h-24 border border-dashed border-border rounded-lg hover:bg-muted/50 hover:border-success/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group">
                  <Filter className="h-5 w-5 text-success group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-foreground group-hover:text-success">View Runs</span>
                </button>
              </Link>

              <Link href="/dashboard/payroll-specialist/reports/departmental">
                <button className="w-full h-24 border border-dashed border-border rounded-lg hover:bg-muted/50 hover:border-info/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group">
                  <Download className="h-5 w-5 text-info group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-foreground group-hover:text-info">Reports</span>
                </button>
              </Link>

              <Link href="/dashboard/payroll-specialist/pay-grades">
                <button className="w-full h-24 border border-dashed border-border rounded-lg hover:bg-muted/50 hover:border-warning/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group">
                  <Settings className="h-5 w-5 text-warning group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-foreground group-hover:text-warning">Config</span>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payroll Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Recent Payroll Runs
              </span>
              <Link href="/dashboard/payroll-specialist/runs">
                <span className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                  View All <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            </CardTitle>
            <CardDescription>Latest payroll runs and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payroll runs found</div>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => {
                  const formattedAmount = formatCurrency(run.totalnetpay || 0);
                  return (
                    <Link key={run._id} href={`/dashboard/payroll-specialist/runs?id=${run._id}`}>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 hover:border-primary/50 transition-all duration-200 group">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {new Date(run.payrollPeriod).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {run.totalEmployees || 0} employees • {formattedAmount.currency} {formattedAmount.amount}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                          {(run.status || 'Unknown').replace(/_/g, ' ')}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
