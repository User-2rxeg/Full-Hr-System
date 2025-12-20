'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { payrollTrackingService, CreateDisputeDto, CreateClaimDto } from '@/app/services/payroll-tracking';

/**
 * Claims & Disputes Page - Department Employee
 * REQ-PY-16: Dispute payroll errors (over-deductions, missing bonuses)
 * REQ-PY-17: Submit expense reimbursement claims
 * REQ-PY-18: Track approval and payment status of claims and disputes
 */

// Response types
interface TrackingData {
  claims: Claim[];
  disputes: Dispute[];
}

interface Dispute {
  id: string;
  _id?: string;
  payslipId: string;
  description: string;
  amount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  reviewNotes?: string;
  resolution?: string;
}

interface Claim {
  id: string;
  _id?: string;
  claimType: string;
  description: string;
  amount: number;
  approvedAmount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  reviewNotes?: string;
}

interface BackendPayslip {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Payslip {
  id: string;
  periodStart: string;
  periodEnd: string;
}

// Map backend payslip to frontend format
function mapPayslipForSelect(backend: BackendPayslip): Payslip {
  const createdDate = backend.createdAt ? new Date(backend.createdAt) : new Date();
  const periodStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1);
  const periodEnd = new Date(createdDate.getFullYear(), createdDate.getMonth() + 1, 0);
  
  return {
    id: backend._id,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export default function ClaimsDisputesPage() {
  const { user } = useAuth();
  // Use user.id directly from AuthContext - this is already the employee profile ID
  const employeeId = user?.id || null;
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'claims'>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  
  // Form states
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Dispute form
  const [disputeForm, setDisputeForm] = useState<CreateDisputeDto>({
    payslipId: '',
    description: '',
    amount: undefined,
  });
  
  // Claim form
  const [claimForm, setClaimForm] = useState<CreateClaimDto>({
    claimType: '',
    description: '',
    amount: 0,
  });

  const claimTypes = [
    'Travel Expense',
    'Equipment Purchase',
    'Training/Education',
    'Medical Expense',
    'Relocation',
    'Work from Home Equipment',
    'Client Entertainment',
    'Other',
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!employeeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tracking data
        const trackingResponse = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
        const trackingData = (trackingResponse?.data || {}) as TrackingData;
        
        setDisputes(trackingData.disputes || []);
        setClaims(trackingData.claims || []);
        
        // Fetch payslips for dispute form
        const payslipsResponse = await payrollTrackingService.getEmployeePayslips(employeeId);
        const backendPayslips = (payslipsResponse?.data || []) as BackendPayslip[];
        setPayslips(backendPayslips.map(mapPayslipForSelect));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !disputeForm.payslipId || !disputeForm.description) {
      alert('Please fill in all required fields.');
      return;
    }
    
    try {
      setSubmitting(true);
      const result = await payrollTrackingService.createDispute(employeeId, disputeForm);
      
      // Check for API errors
      if (result.error) {
        alert('Failed to submit dispute: ' + result.error);
        return;
      }
      
      // Refresh data
      const response = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
      const trackingData = (response?.data || {}) as TrackingData;
      setDisputes(trackingData.disputes || []);
      
      // Reset form
      setDisputeForm({ payslipId: '', description: '', amount: undefined });
      setShowDisputeForm(false);
      alert('Dispute submitted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to submit dispute: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!employeeId) {
      alert('Error: Unable to identify your employee account. Please try refreshing the page.');
      return;
    }
    
    if (!claimForm.claimType) {
      alert('Please select a claim type.');
      return;
    }
    
    if (!claimForm.description) {
      alert('Please enter a description.');
      return;
    }
    
    if (!claimForm.amount || claimForm.amount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Debug log
      console.log('Submitting claim with data:', {
        employeeId,
        claimForm,
      });
      
      const result = await payrollTrackingService.createClaim(employeeId, claimForm);
      
      console.log('Submit claim - result:', result);
      
      // Check for API errors
      if (result.error) {
        console.error('Claim API error:', result.error, 'Status:', result.status);
        alert('Failed to submit claim: ' + result.error);
        return;
      }
      
      // Refresh data
      const response = await payrollTrackingService.trackClaimsAndDisputes(employeeId);
      const trackingData = (response?.data || {}) as TrackingData;
      setClaims(trackingData.claims || []);
      
      // Reset form
      setClaimForm({ claimType: '', description: '', amount: 0 });
      setShowClaimForm(false);
      alert('Claim submitted successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Submit claim error:', err);
      alert('Failed to submit claim: ' + errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPayslipPeriod = (payslip: Payslip) => {
    const start = new Date(payslip.periodStart);
    return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'in_review':
      case 'in-review':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">In Review</span>;
      case 'approved':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>;
      case 'paid':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Paid</span>;
      case 'resolved':
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Resolved</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status || 'Unknown'}</span>;
    }
  };

  const getPendingCount = () => {
    const pendingDisputes = disputes.filter(d => ['pending', 'in_review', 'in-review'].includes(d.status?.toLowerCase())).length;
    const pendingClaims = claims.filter(c => ['pending', 'in_review', 'in-review'].includes(c.status?.toLowerCase())).length;
    return pendingDisputes + pendingClaims;
  };

  const filterByStatus = <T extends { status: string }>(items: T[]): T[] => {
    if (statusFilter === 'all') {
      return items;
    }
    return items.filter(item => {
      const status = item.status?.toLowerCase() || '';
      if (statusFilter === 'approved') {
        return status === 'approved';
      }
      if (statusFilter === 'rejected') {
        return status === 'rejected';
      }
      return true;
    });
  };

  const filteredDisputes = filterByStatus(disputes);
  const filteredClaims = filterByStatus(claims);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading claims and disputes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading data</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Claims & Disputes</h1>
          <p className="text-slate-600 mt-2">Submit expense claims, dispute payroll errors, and track request status</p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Request Tracking</h2>
            <p className="text-orange-100 mt-1">Manage your payroll-related requests</p>
          </div>
          <div className="text-6xl"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-orange-100 text-xs">Total Disputes</p>
            <p className="text-2xl font-bold mt-1">{disputes.length}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-orange-100 text-xs">Total Claims</p>
            <p className="text-2xl font-bold mt-1">{claims.length}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-orange-100 text-xs">Pending Review</p>
            <p className="text-2xl font-bold mt-1">{getPendingCount()}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-orange-100 text-xs">Total Claimed</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(claims.reduce((s, c) => s + c.amount, 0))}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={() => setShowDisputeForm(true)}
          className="px-6 py-3 bg-white border border-slate-200 rounded-lg shadow-sm font-medium flex items-center gap-2 text-slate-900 hover:shadow-md"
        >
          File a Dispute
        </button>
        <button
          onClick={() => setShowClaimForm(true)}
          className="px-6 py-3 bg-white border border-slate-200 rounded-lg shadow-sm font-medium flex items-center gap-2 text-slate-900 hover:shadow-md"
        >
          Submit a Claim
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'overview'
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'disputes'
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Disputes
          {disputes.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'disputes' ? 'bg-orange-200' : 'bg-slate-200'
            }`}>
              {disputes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'claims'
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Claims
          {claims.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'claims' ? 'bg-orange-200' : 'bg-slate-200'
            }`}>
              {claims.length}
            </span>
          )}
        </button>
      </div>

      {/* Status Filter Buttons */}
      {(activeTab === 'disputes' || activeTab === 'claims') && (
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Rejected
          </button>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Disputes */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Recent Disputes</h3>
              <button
                onClick={() => setActiveTab('disputes')}
                className="text-sm text-orange-600 hover:underline"
              >
                View All →
              </button>
            </div>
            
            {disputes.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <div className="text-3xl mb-2"></div>
                <p>No disputes filed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.slice(0, 3).map((dispute) => (
                  <div key={dispute.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900 text-sm line-clamp-1">{dispute.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(dispute.createdAt)}</p>
                      </div>
                      {getStatusBadge(dispute.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Claims */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Recent Claims</h3>
              <button
                onClick={() => setActiveTab('claims')}
                className="text-sm text-orange-600 hover:underline"
              >
                View All →
              </button>
            </div>
            
            {claims.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <div className="text-3xl mb-2"></div>
                <p>No claims submitted</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.slice(0, 3).map((claim) => (
                  <div key={claim.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{claim.claimType}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatCurrency(claim.amount)}</p>
                      </div>
                      {getStatusBadge(claim.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">My Disputes</h3>
            <button
              onClick={() => setShowDisputeForm(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-900 hover:shadow-md"
            >
              + File New Dispute
            </button>
          </div>
          
          {filteredDisputes.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Disputes</h3>
              <p className="text-slate-600">
                {disputes.length === 0 
                  ? "You haven't filed any payroll disputes."
                  : `No disputes found with ${statusFilter === 'all' ? 'any' : statusFilter} status.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Date Filed</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{dispute.description}</p>
                        {dispute.reviewNotes && (
                          <p className="text-xs text-slate-500 mt-1">Note: {dispute.reviewNotes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {dispute.amount ? formatCurrency(dispute.amount) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(dispute.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(dispute.status)}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {dispute.resolution || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Claims Tab */}
      {activeTab === 'claims' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">My Claims</h3>
            <button
              onClick={() => setShowClaimForm(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-900 hover:shadow-md"
            >
              + Submit New Claim
            </button>
          </div>
          
          {filteredClaims.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Claims</h3>
              <p className="text-slate-600">
                {claims.length === 0 
                  ? "You haven't submitted any expense claims."
                  : `No claims found with ${statusFilter === 'all' ? 'any' : statusFilter} status.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Description</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Approved</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">{claim.claimType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700 text-sm">{claim.description}</p>
                        {claim.reviewNotes && (
                          <p className="text-xs text-slate-500 mt-1">Note: {claim.reviewNotes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {formatCurrency(claim.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {claim.approvedAmount !== undefined ? (
                          <span className="text-green-600 font-medium">{formatCurrency(claim.approvedAmount)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(claim.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(claim.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dispute Form Modal */}
      {showDisputeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">File a Payroll Dispute</h3>
                <button
                  onClick={() => setShowDisputeForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitDispute} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Payslip *
                </label>
                <select
                  value={disputeForm.payslipId}
                  onChange={(e) => setDisputeForm({ ...disputeForm, payslipId: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select a payslip</option>
                  {payslips.map((payslip) => (
                    <option key={payslip.id} value={payslip.id}>
                      {formatPayslipPeriod(payslip)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Disputed Amount (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={disputeForm.amount || ''}
                  onChange={(e) => setDisputeForm({ ...disputeForm, amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Enter disputed amount"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Describe the payroll error (e.g., over-deduction, missing bonus, incorrect calculation)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Form Modal */}
      {showClaimForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Submit Expense Claim</h3>
                <button
                  onClick={() => setShowClaimForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Claim Type *
                </label>
                <select
                  value={claimForm.claimType}
                  onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select claim type</option>
                  {claimTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={claimForm.amount || ''}
                  onChange={(e) => setClaimForm({ ...claimForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  placeholder="Enter claim amount"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Describe the expense and provide relevant details (date, purpose, etc.)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Please attach receipts or supporting documents when prompted after submission.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitClaim}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClaimForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-blue-900">Need Help?</h4>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Disputes:</strong> File a dispute if you notice errors in your payslip such as over-deductions, missing bonuses, or incorrect calculations.
              <br />
              <strong>Claims:</strong> Submit expense claims for work-related expenses you&apos;ve incurred that are eligible for reimbursement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}