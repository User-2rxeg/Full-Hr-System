'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';

interface Stats {
  pendingRuns: number;
  totalEmployees: number;
  draftRuns: number;
  totalNetPay: number;
  signingBonusesPending: number;
  terminationBenefitsPending: number;
}

interface RecentRun {
  _id: string;
  payrollPeriod: string;
  status: string;
  entity?: string;
  entityName?: string;
  employees?: number;
  totalEmployees?: number;
  totalnetpay: number;
  createdAt: string;
}

export default function PayrollSpecialistPage() {
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    pendingRuns: 0,
    totalEmployees: 0,
    draftRuns: 0,
    totalNetPay: 0,
    signingBonusesPending: 0,
    terminationBenefitsPending: 0,
  });
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add company currency state
  const [companyCurrency, setCompanyCurrency] = useState<string>('EGP');
  const [loadingCurrency, setLoadingCurrency] = useState<boolean>(true);

  useEffect(() => {
    fetchCompanyCurrency();
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch company currency from CompanyWideSettings API
  const fetchCompanyCurrency = async () => {
    try {
      setLoadingCurrency(true);
      const response = await payrollConfigurationService.getCompanyWideSettings() as any;
      
      // Extract currency from the response based on your API structure
      if (response?.data) {
        const settings = response.data;
        // Try different possible property names for currency
        const currency = 
          settings.currency ||
          settings.companyCurrency ||
          settings.defaultCurrency ||
          settings.financialSettings?.currency ||
          'EGP';
        
        setCompanyCurrency(currency);
      } else if (response?.currency) {
        // Direct currency property
        setCompanyCurrency(response.currency);
      }
    } catch (error) {
      console.error('Failed to fetch company currency from CompanyWideSettings:', error);
      // Fallback to EGP if API fails
      setCompanyCurrency('EGP');
    } finally {
      setLoadingCurrency(false);
    }
  };

  const fetchData = async () => {
    try {
      const [runsRes, signingRes, terminationRes] = await Promise.all([
        payrollExecutionService.listRuns({ page: 1, limit: 100 }),
        payrollExecutionService.listSigningBonuses('pending'),
        payrollExecutionService.listTerminationBenefits('pending'),
      ]);

      const runsData = (runsRes?.data || runsRes) as any;
      const runs = Array.isArray(runsData?.data) ? runsData.data : Array.isArray(runsData) ? runsData : [];

      const signingData = (signingRes?.data || signingRes) as any;
      const signingBonuses = Array.isArray(signingData) ? signingData : [];

      const terminationData = (terminationRes?.data || terminationRes) as any;
      const terminationBenefits = Array.isArray(terminationData) ? terminationData : [];

      // Normalize status for comparison (handle spaces/underscores)
      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');

      const draftRuns = runs.filter((r: any) => normalizeStatus(r.status) === 'draft').length;
      // Pending runs: draft or unlocked (needing specialist attention)
      const pendingRuns = runs.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'draft' || status === 'unlocked';
      }).length;
      const totalEmps = runs.reduce((sum: number, r: any) => sum + (r.employees || r.totalEmployees || 0), 0);
      const totalNet = runs.reduce((sum: number, r: any) => sum + (r.totalnetpay || 0), 0);

      setStats({
        pendingRuns,
        totalEmployees: totalEmps,
        draftRuns,
        totalNetPay: totalNet,
        signingBonusesPending: signingBonuses.length,
        terminationBenefitsPending: terminationBenefits.length,
      });

      setRecentRuns(runs.slice(0, 5));
    } catch (e) {
      console.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Update formatCurrency to use company-wide currency
  const formatCurrency = (amount: number | undefined | null, currency?: string): string => {
    const curr = currency || companyCurrency || 'EGP';
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${curr} 0`;
    }
    return `${curr} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatPeriod = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
      pending_finance_approval: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pending Finance' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      locked: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Locked' },
    };
    const s = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  // Add currency badge component
  const CurrencyBadge = () => (
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {loadingCurrency ? '...' : companyCurrency}
    </div>
  );

  return (
    <div className="relative space-y-6 bg-background min-h-screen">
      {/* Floating Theme Customizer Trigger */}
      <ThemeCustomizerTrigger onClick={() => setThemeCustomizerOpen(true)} />
      <ThemeCustomizer open={themeCustomizerOpen} onOpenChange={setThemeCustomizerOpen} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Specialist Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage payroll processing and configurations 
            <span className="ml-2"><CurrencyBadge /></span>
          </p>
        </div>
        <Link href="/dashboard/payroll-specialist/runs?tab=create">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            + New Payroll Run
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Runs</p>
              <p className={`text-2xl font-bold mt-1 ${stats.pendingRuns > 0 ? 'text-warning' : 'text-card-foreground'}`}> 
                {loading ? '...' : stats.pendingRuns}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Net Payroll</p>
              <p className="text-2xl font-bold text-card-foreground mt-1">
                {loading ? '...' : formatCurrency(stats.totalNetPay)}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Signing Bonuses Pending</p>
              <p className={`text-2xl font-bold mt-1 ${stats.signingBonusesPending > 0 ? 'text-primary' : 'text-card-foreground'}`}> 
                {loading ? '...' : stats.signingBonusesPending}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/payroll-specialist/runs?tab=create">
            <div className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/20 transition-colors text-center cursor-pointer group">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-primary/20 transition-colors">
                <svg className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="font-medium text-primary group-hover:text-primary-foreground text-sm transition-colors">New Payroll</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/runs">
            <div className="p-4 border border-border rounded-lg hover:border-success hover:bg-success/20 transition-colors text-center cursor-pointer group">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-success/20 transition-colors">
                <svg className="w-5 h-5 text-success group-hover:text-success-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-medium text-success group-hover:text-success-foreground text-sm transition-colors">View Runs</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/runs?tab=bonuses">
            <div className="p-4 border border-border rounded-lg hover:border-purple-600 hover:bg-purple-600/20 transition-colors text-center cursor-pointer group">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-purple-600/20 transition-colors">
                <svg className="w-5 h-5 text-purple-600 group-hover:text-purple-50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <p className="font-medium text-purple-700 group-hover:text-purple-50 text-sm transition-colors">Signing Bonuses</p>
            </div>
          </Link>
          <Link href="/dashboard/payroll-specialist/pay-grades">
            <div className="p-4 border border-border rounded-lg hover:border-warning hover:bg-warning/20 transition-colors text-center cursor-pointer group">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-warning/20 transition-colors">
                <svg className="w-5 h-5 text-warning group-hover:text-warning-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-warning group-hover:text-warning-foreground text-sm transition-colors">Configuration</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-card-foreground">Recent Payroll Runs</h2>
          <div className="flex items-center gap-2">
            <CurrencyBadge />
            <Link href="/dashboard/payroll-specialist/runs" className="text-sm text-primary hover:text-primary/80">
              View all →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : recentRuns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No payroll runs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Period</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Employees</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Net Pay</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run._id} className="border-b border-border hover:bg-primary/10 group transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/payroll-specialist/runs?id=${run._id}`} className="text-primary group-hover:text-primary-foreground font-medium transition-colors">
                        {formatPeriod(run.payrollPeriod)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground group-hover:text-foreground transition-colors">{run.entity || run.entityName || 'N/A'}</td>
                    <td className="py-3 px-4 text-muted-foreground group-hover:text-foreground transition-colors">{run.employees || run.totalEmployees || 0}</td>
                    <td className="py-3 px-4 text-card-foreground group-hover:text-foreground font-medium transition-colors">
                      {formatCurrency(run.totalnetpay || 0)}
                    </td>
                    <td className="py-3 px-4 group-hover:text-foreground transition-colors">{getStatusBadge(run.status)}</td>
                    <td className="py-3 px-4 text-muted-foreground group-hover:text-foreground text-sm transition-colors">{formatDate(run.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}