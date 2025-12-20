'use client';

import { useState, useEffect } from 'react';
import { claimsService, Claim, ClaimStatus, ClaimFilters } from '@/app/services/claims';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function ClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [filters, setFilters] = useState<ClaimFilters>({
    status: 'all',
    claimType: 'all'
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadClaims();
  }, [user, filters]);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await claimsService.getAllClaims(filters);

      // Handle both backend formats (raw array vs wrapper object)
      const claimsData = Array.isArray(response)
        ? response
        : (response.data || []);

      let processedClaims = claimsData;

      // Client-side filtering to ensure robustness regardless of backend implementation or data mismatches
      if (filters.status && filters.status !== 'all') {
        processedClaims = processedClaims.filter(c => c.status === filters.status);
      }

      if (filters.claimType && filters.claimType !== 'all') {
        // Use loose matching (e.g. "travel" matches "Travel Expense")
        const term = filters.claimType.toLowerCase();
        processedClaims = processedClaims.filter(c =>
          c.claimType && c.claimType.toLowerCase().includes(term)
        );
      }

      if (filters.startDate) {
        // Filter for specific date (if user selected "Date Range" which is currently a single date picker)
        const filterDate = new Date(filters.startDate).toDateString();
        processedClaims = processedClaims.filter(c => {
          if (!c.createdAt) return false;
          return new Date(c.createdAt).toDateString() === filterDate;
        });
      }

      setClaims(processedClaims);
    } catch (error) {
      console.error('Failed to load claims:', error);
      setError('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClaim = async () => {
    if (!selectedClaim) return;

    console.log('Selected claim status:', selectedClaim.status);
    console.log('Expected status:', ClaimStatus.UNDER_REVIEW);

    if (selectedClaim.status !== ClaimStatus.UNDER_REVIEW) {
      setError(`Only claims with "Under Review" status can be acted upon. Current status: ${selectedClaim.status}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Reviewing claim:', selectedClaim._id, 'Action:', reviewAction);
      let response;

      if (reviewAction === 'approve') {
        response = await claimsService.approveClaim(
          selectedClaim._id,
          selectedClaim.amount,
          reviewNotes
        );
      } else {
        response = await claimsService.rejectClaim(
          selectedClaim._id,
          rejectionRemarks
        );
      }

      console.log('Review response:', response);

      // Handle the response which comes wrapped
      const updatedClaim = response.data || response;

      if (updatedClaim) {
        // Update the claim in the list with real-time status update
        setClaims(prev => prev.map(c =>
          c._id === selectedClaim._id ? updatedClaim : c
        ));

        setSuccessMessage(`Claim ${reviewAction === 'approve' ? 'approved and escalated to payroll manager' : 'rejected'} successfully`);
        setShowReviewModal(false);
        setSelectedClaim(null);
        setReviewNotes('');
        setRejectionRemarks('');

        // Reload claims to get fresh data
        await loadClaims();
      }
    } catch (error: any) {
      console.error('Failed to review claim:', error);
      setError(`Failed to ${reviewAction} claim: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (claim: Claim, action: 'approve' | 'reject') => {
    setSelectedClaim(claim);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  // Remove unused getPriorityColor function since Claim schema doesn't have priority

  // Helper to normalize claim types for consistent display and coloring
  const normalizeClaimType = (type: string) => {
    if (!type) return 'N/A';
    const lower = type.toLowerCase();
    if (lower.includes('travel')) return 'travel';
    if (lower.includes('equipment')) return 'equipment';
    if (lower.includes('medical')) return 'medical';
    return type;
  };

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.UNDER_REVIEW: return 'bg-yellow-100 text-yellow-800';
      case 'pending payroll Manager approval' as any: return 'bg-orange-100 text-orange-800';
      case ClaimStatus.APPROVED: return 'bg-green-100 text-green-800';
      case ClaimStatus.REJECTED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClaimTypeColor = (claimType: string) => {
    switch (claimType.toLowerCase()) {
      case 'medical': return 'bg-blue-100 text-blue-800';
      case 'travel': return 'bg-green-100 text-green-800';
      case 'equipment': return 'bg-purple-100 text-purple-800';
      case 'training': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Specialist role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Claims Review and Approval</h1>
          <p className="text-white mt-1">Review and approve/reject employee claims</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.status || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="all">All Status</option>
              <option value="under review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Claim Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.claimType || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, claimType: e.target.value as any }))}
            >
              <option value="all">All Types</option>
              <option value="medical">Medical</option>
              <option value="travel">Travel</option>
              <option value="equipment">Equipment</option>
              <option value="training">Training</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-end mt-4">
          <button
            onClick={loadClaims}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Claims List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Claims</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading claims...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Claim ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Claim Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Approved Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {claims.map((claim) => {
                  const normalizedType = normalizeClaimType(claim.claimType);
                  return (
                    <tr key={claim._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-900">{claim.claimId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {typeof claim.employeeId === 'object' && claim.employeeId
                            ? `${(claim.employeeId as any).firstName || ''} ${(claim.employeeId as any).lastName || ''}`.trim() || (claim.employeeId as any).employeeId || 'N/A'
                            : claim.employeeId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getClaimTypeColor(normalizedType)}`}>
                          {normalizedType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        ${claim.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {claim.approvedAmount ? `$${claim.approvedAmount.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                          {claim.status === ClaimStatus.UNDER_REVIEW && (
                            <>
                              <button
                                onClick={() => openReviewModal(claim, 'approve')}
                                className="text-green-600 hover:text-green-800"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openReviewModal(claim, 'reject')}
                                className="text-red-600 hover:text-red-800"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {claims.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No claims found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Details Modal */}
      {selectedClaim && !showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Expense Claim Details</h3>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Employee ID</label>
                  <p className="text-slate-900">
                    {typeof selectedClaim.employeeId === 'object' && selectedClaim.employeeId
                      ? `${(selectedClaim.employeeId as any).firstName || ''} ${(selectedClaim.employeeId as any).lastName || ''}`.trim() || (selectedClaim.employeeId as any).employeeId || 'N/A'
                      : selectedClaim.employeeId || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Claim Type</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getClaimTypeColor(normalizeClaimType(selectedClaim.claimType))}`}>
                    {normalizeClaimType(selectedClaim.claimType)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Amount</label>
                  <p className="text-lg font-semibold text-slate-900">${selectedClaim.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-900 mt-1">{selectedClaim.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Submitted</label>
                <p className="text-slate-900">{new Date(selectedClaim.createdAt).toLocaleString()}</p>
              </div>
              {selectedClaim.resolutionComment && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Resolution Comment</label>
                  <p className="text-slate-900 mt-1">{selectedClaim.resolutionComment}</p>
                </div>
              )}
              {selectedClaim.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Rejection Reason</label>
                  <p className="text-slate-900 mt-1">{selectedClaim.rejectionReason}</p>
                </div>
              )}
            </div>
            {selectedClaim.status === ClaimStatus.UNDER_REVIEW && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => openReviewModal(selectedClaim, 'reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => openReviewModal(selectedClaim, 'approve')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {reviewAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Claim</label>
                <p className="text-slate-900">{selectedClaim.description}</p>
                <p className="text-sm text-slate-600">{selectedClaim.claimId} • ${selectedClaim.amount.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {reviewAction === 'approve' ? 'Review Notes' : 'Rejection Remarks'}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  rows={3}
                  placeholder={reviewAction === 'approve' ? "Add your review notes..." : "Provide rejection remarks..."}
                  value={reviewAction === 'approve' ? reviewNotes : rejectionRemarks}
                  onChange={(e) => reviewAction === 'approve' ? setReviewNotes(e.target.value) : setRejectionRemarks(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewClaim}
                className={`px-4 py-2 text-white rounded-lg hover:opacity-90 ${reviewAction === 'approve' ? 'bg-green-600' : 'bg-red-600'
                  }`}
              >
                {reviewAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
