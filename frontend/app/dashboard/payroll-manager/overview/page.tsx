'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { payrollExecutionService } from '@/app/services/payroll-execution';

interface OverviewStats {
  totalRuns: number;
  pendingApprovals: number;
  approvedRuns: number;
  frozenRuns: number;
  totalPayroll: number;
  totalEmployees: number;
  exceptions: number;
}

export default function PayrollManagerOverviewPage() {
  const [stats, setStats] = useState<OverviewStats>({
    totalRuns: 0,
    pendingApprovals: 0,
    approvedRuns: 0,
    frozenRuns: 0,
    totalPayroll: 0,
    totalEmployees: 0,
    exceptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await payrollExecutionService.listRuns({ page: 1, limit: 1000 });
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      const normalizeStatus = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '_');
      
      const totalRuns = items.length;
      const pendingApprovals = items.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return (status === 'under_review' || status === 'under review') && !r.managerApprovalDate;
      }).length;
      
      const approvedRuns = items.filter((r: any) => {
        const status = normalizeStatus(r.status);
        return status === 'approved' || r.approvedByManager;
      }).length;
      
      const frozenRuns = items.filter((r: any) => {
        return r.frozen || normalizeStatus(r.status) === 'locked' || normalizeStatus(r.status) === 'frozen';
      }).length;
      
      const totalPayroll = items.reduce((sum: number, r: any) => sum + (r.totalnetpay || r.totalNetPay || 0), 0);
      const totalEmployees = items.reduce((sum: number, r: any) => sum + (r.employees || 0), 0);
      const totalExceptions = items.reduce((sum: number, r: any) => sum + (r.exceptions || 0), 0);
      
      setStats({
        totalRuns,
        pendingApprovals,
        approvedRuns,
        frozenRuns,
        totalPayroll,
        totalEmployees,
        exceptions: totalExceptions,
      });
    } catch (e: any) {
      console.error('Failed to fetch overview:', e);
      setError(e?.message || 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `EGP ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payroll Overview</h1>
        <p className="text-slate-600 mt-2">Comprehensive view of all payroll operations and statistics</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          ❌ {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Payroll Runs</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading ? '...' : stats.totalRuns}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Pending Approvals</p>
          <p className={`text-3xl font-bold mt-2 ${stats.pendingApprovals > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.pendingApprovals}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Approved Runs</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? '...' : stats.approvedRuns}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Frozen Runs</p>
          <p className={`text-3xl font-bold mt-2 ${stats.frozenRuns > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.frozenRuns}
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Payroll Amount</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : formatCurrency(stats.totalPayroll)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Employees</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : stats.totalEmployees}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <p className="text-slate-600 text-sm">Total Exceptions</p>
          <p className={`text-2xl font-bold mt-2 ${stats.exceptions > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {loading ? '...' : stats.exceptions}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/dashboard/payroll-manager/runs?filter=pending"
            className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">⏳</div>
            <p className="font-medium text-slate-900">Review Pending</p>
            <p className="text-xs text-slate-500 mt-1">Approve payroll runs</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/runs"
            className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">📋</div>
            <p className="font-medium text-slate-900">All Runs</p>
            <p className="text-xs text-slate-500 mt-1">View all payroll runs</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/disputes"
            className="p-4 border border-slate-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-medium text-slate-900">Disputes</p>
            <p className="text-xs text-slate-500 mt-1">Review disputes</p>
          </Link>
          <Link 
            href="/dashboard/payroll-manager/claims"
            className="p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center block"
          >
            <div className="text-2xl mb-2">💳</div>
            <p className="font-medium text-slate-900">Claims</p>
            <p className="text-xs text-slate-500 mt-1">Review claims</p>
          </Link>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Overview Information</h2>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• This page provides a comprehensive overview of all payroll operations</li>
          <li>• Pending approvals require your immediate attention</li>
          <li>• Frozen runs are locked and cannot be modified</li>
          <li>• Use the quick actions to navigate to specific sections</li>
        </ul>
      </div>
    </div>
  );
}

