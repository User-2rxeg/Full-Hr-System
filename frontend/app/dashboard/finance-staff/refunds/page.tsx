'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, RefundGeneration, PayrollCycle, RefundRequest, ApprovedDispute, ApprovedClaim } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function RefundsPage() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundGeneration[]>([]);
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedDisputes, setApprovedDisputes] = useState<ApprovedDispute[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ApprovedClaim[]>([]);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundGeneration | null>(null);
  const [refundType, setRefundType] = useState<'dispute' | 'claim'>('dispute');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundEmployeeId, setRefundEmployeeId] = useState('');
  const [targetPayrollCycle, setTargetPayrollCycle] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  // Helper to safely convert any value to string (NEVER returns objects)
  const safeString = (value: any, defaultValue: string = 'N/A'): string => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value._id) return String(value._id);
      return defaultValue;
    }
    return String(value);
  };

  useEffect(() => {
    if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refundsResponse, cyclesResponse, disputesRes, claimsRes] = await Promise.all([
        financeStaffService.getRefunds(),
        financeStaffService.getPayrollCycles(),
        financeStaffService.getApprovedDisputes(),
        financeStaffService.getApprovedClaims(),
      ]);

      if (refundsResponse.data) setRefunds(refundsResponse.data);
      if (cyclesResponse.data) setPayrollCycles(cyclesResponse.data);
      if (disputesRes.data) setApprovedDisputes(disputesRes.data);
      if (claimsRes.data) setApprovedClaims(claimsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSourceId('');
    setRefundAmount('');
    setRefundDescription('');
    setRefundEmployeeId('');
    setRefundNotes('');
    setRefundType('dispute');
  };

  const handleSourceChange = (id: string) => {
    setSelectedSourceId(id);
    if (!id) {
      setRefundEmployeeId('');
      setRefundDescription('');
      setRefundAmount('');
      return;
    }

    if (refundType === 'dispute') {
      const dispute = approvedDisputes.find(d => d.id === id);
      if (dispute) {
        setRefundEmployeeId(dispute.employeeId);
        setRefundDescription(dispute.description);
        setRefundAmount(dispute.amount.toString());
      }
    } else {
      const claim = approvedClaims.find(c => c.id === id);
      if (claim) {
        setRefundEmployeeId(claim.employeeId);
        setRefundDescription(claim.description);
        setRefundAmount(claim.amount.toString());
      }
    }
  };

  const handleGenerateRefund = async () => {
    const refundRequest = {
      [refundType === 'dispute' ? 'disputeId' : 'claimId']: selectedSourceId,
      refundDetails: {
        description: refundDescription,
        amount: parseFloat(refundAmount)
      },
      employeeId: refundEmployeeId,
      financeStaffId: user?.id || '',
      status: 'pending' as const
    };

    try {
      const response = await financeStaffService.generateRefund(refundRequest, user?.id || '');
      if (response.data) {
        setRefunds(prev => [response.data!, ...prev]);
        setShowGenerateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to generate refund:', error);
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    try {
      const response = await financeStaffService.processRefund(refundId);
      if (response.data) {
        setRefunds(prev => prev.map(r => r._id === refundId ? response.data! : r));
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const handleUpdateRefundStatus = async (refundId: string, status: RefundGeneration['status']) => {
    try {
      const response = await financeStaffService.updateRefundStatus(refundId, status, refundNotes);
      if (response.data) {
        setRefunds(prev => prev.map(r => r._id === refundId ? response.data! : r));
        setSelectedRefund(null);
      }
    } catch (error) {
      console.error('Failed to update refund status:', error);
    }
  };

  if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'dispute' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Refund Generation</h1>
          <p className="text-white mt-1">Generate and manage refunds for approved disputes and claims</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate Refund
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending Refunds</p>
              <p className="text-2xl font-bold text-slate-900">
                {refunds.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Processed Refunds</p>
              <p className="text-2xl font-bold text-slate-900">
                {refunds.filter(r => r.status === 'processed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Paid Refunds</p>
              <p className="text-2xl font-bold text-slate-900">
                {refunds.filter(r => r.status === 'paid').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Refunds List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Refunds</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading refunds...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {refunds.map((refund) => (
                  <tr key={refund._id || `${refund.claimId || refund.disputeId}-${refund.createdAt}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(refund.claimId ? 'claim' : 'dispute')}`}>
                        {refund.claimId ? 'Claim' : refund.disputeId ? 'Dispute' : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{safeString(refund.employeeId, 'Unknown')}</p>
                        <p className="text-xs text-slate-500">{safeString(refund.claimId || refund.disputeId, 'N/A')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {safeString(refund.refundDetails?.description, 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      ${refund.refundDetails?.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {refund.createdAt ? new Date(refund.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {refunds.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No refunds found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Refund Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Refund Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  value={refundType}
                  onChange={(e) => {
                    setRefundType(e.target.value as any);
                    handleSourceChange(''); // Reset on type change
                  }}
                >
                  <option value="dispute">Dispute Refund</option>
                  <option value="claim">Expense Claim Refund</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {refundType === 'dispute' ? 'Approved Dispute' : 'Approved Expense Claim'}
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  value={selectedSourceId}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  required
                >
                  <option value="">Select a {refundType}</option>
                  {refundType === 'dispute'
                    ? approvedDisputes.map(d => (
                      <option key={d.id} value={d.id}>{d.id} - {d.employeeName} (${d.amount})</option>
                    ))
                    : approvedClaims.map(c => (
                      <option key={c.id} value={c.id}>{c.id} - {c.employeeName} (${c.amount})</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg outline-none cursor-not-allowed text-slate-900"
                  value={refundEmployeeId}
                  readOnly
                  placeholder="Fetched automatically"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg outline-none cursor-not-allowed text-slate-900"
                  value={refundDescription}
                  readOnly
                  rows={3}
                  placeholder="Fetched from source"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg outline-none cursor-not-allowed text-slate-900"
                  value={refundAmount ? `$${parseFloat(refundAmount).toLocaleString()}` : ''}
                  readOnly
                  placeholder="$0.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRefund}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Generate Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Details Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Refund Details</h3>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Type</label>
                  <span className={`block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(selectedRefund.claimId ? 'claim' : 'dispute')}`}>
                    {selectedRefund.claimId ? 'Claim' : selectedRefund.disputeId ? 'Dispute' : 'Unknown'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <span className={`block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRefund.status)}`}>
                    {selectedRefund.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Employee ID</label>
                <p className="text-slate-900">{safeString(selectedRefund.employeeId, 'Unknown')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Source</label>
                <p className="text-slate-900">{selectedRefund.claimId ? `Claim: ${safeString(selectedRefund.claimId)}` : selectedRefund.disputeId ? `Dispute: ${safeString(selectedRefund.disputeId)}` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-900">{safeString(selectedRefund.refundDetails?.description, 'No description')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Amount</label>
                  <p className="text-slate-900">${selectedRefund.refundDetails?.amount?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Created</label>
                  <p className="text-slate-900">{selectedRefund.createdAt ? new Date(selectedRefund.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              {selectedRefund.financeStaffId && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Finance Staff ID</label>
                  <p className="text-slate-900">{safeString(selectedRefund.financeStaffId)}</p>
                </div>
              )}
              {selectedRefund.paidInPayrollRunId && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Paid in Payroll Run</label>
                  <p className="text-slate-900">{safeString(selectedRefund.paidInPayrollRunId)}</p>
                </div>
              )}
              {selectedRefund.status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedRefund(null)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
