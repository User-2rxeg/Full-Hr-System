'use client';

import { useState, useEffect } from 'react';
import { payrollSpecialistService, PayrollDispute, DisputeFilters } from '@/app/services/payroll-specialist';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<PayrollDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<PayrollDispute | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [filters, setFilters] = useState<DisputeFilters>({
    status: 'all'
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedRoles = [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadDisputes();
  }, [user, filters]);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await payrollSpecialistService.getAllDisputes(filters);
      console.log('Disputes response:', response);

      // Determine the array source based on response structure
      const disputesList = Array.isArray(response)
        ? response
        : (Array.isArray(response.data) ? response.data : []);

      // Map backend data to frontend format
      if (disputesList) {
        const mappedDisputes: PayrollDispute[] = disputesList.map((dispute: any) => {
          // Safe mapping with error handling per item
          try {
            console.log('Mapping dispute:', dispute.disputeId, 'Status:', dispute.status);

            // Extract payslipId - could be:
            // 1. A populated object with _id and payrollRunId
            // 2. A raw ObjectId string
            // 3. An ObjectId object with toString()
            // 4. null if population failed (referenced document doesn't exist)
            // Robust extraction for Payslip ID and Pay Period
            let payslipIdForDisplay = 'N/A';
            let payPeriodForDisplay = 'N/A';

            // Check the raw payslipId field from the dispute
            const payslipData = dispute.payslipId ?? dispute.paySlipId ?? null;

            console.log(`[DEBUG] Dispute ${dispute.disputeId} - payslipId raw:`, dispute.payslipId, 'type:', typeof dispute.payslipId);

            if (payslipData !== null && payslipData !== undefined) {
              if (typeof payslipData === 'object') {
                // Populated object - extract _id
                // Mongoose populated objects have _id as the document's ObjectId
                const rawId = payslipData._id ?? payslipData.id ?? payslipData.$oid ?? null;
                if (rawId) {
                  payslipIdForDisplay = typeof rawId === 'string' ? rawId : (rawId.toString ? rawId.toString() : String(rawId));
                } else {
                  // If no _id found in object, try to stringify the whole object's toString
                  const objStr = payslipData.toString ? payslipData.toString() : null;
                  if (objStr && objStr !== '[object Object]' && objStr.length === 24) {
                    // Looks like a MongoDB ObjectId string
                    payslipIdForDisplay = objStr;
                  }
                }

                if (payslipIdForDisplay === '[object Object]') payslipIdForDisplay = 'N/A';

                // Try to get payPeriod from multiple possible sources
                console.log(`[DEBUG] ${dispute.disputeId} payslipData keys:`, Object.keys(payslipData));

                if (payslipData.payPeriod) {
                  payPeriodForDisplay = payslipData.payPeriod;
                } else if (payslipData.payrollRunId) {
                  const payrollRun = payslipData.payrollRunId;
                  console.log(`[DEBUG] ${dispute.disputeId} payrollRunId:`, payrollRun, 'type:', typeof payrollRun);
                  if (typeof payrollRun === 'object' && payrollRun !== null) {
                    const periodDate = payrollRun.payrollPeriod ? new Date(payrollRun.payrollPeriod) : null;
                    if (periodDate && !isNaN(periodDate.getTime())) {
                      payPeriodForDisplay = periodDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                    } else if (payrollRun.runId) {
                      payPeriodForDisplay = payrollRun.runId;
                    } else if (payrollRun.startDate || payrollRun.endDate) {
                      const startDate = payrollRun.startDate ? new Date(payrollRun.startDate) : null;
                      if (startDate && !isNaN(startDate.getTime())) {
                        payPeriodForDisplay = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                      }
                    }
                  } else if (typeof payrollRun === 'string') {
                    // payrollRunId not populated, just an ObjectId string
                    payPeriodForDisplay = 'N/A';
                  }
                } else if (payslipData.periodStart || payslipData.periodEnd) {
                  // Try payslip's own period fields
                  const periodDate = payslipData.periodStart ? new Date(payslipData.periodStart) :
                    payslipData.periodEnd ? new Date(payslipData.periodEnd) : null;
                  if (periodDate && !isNaN(periodDate.getTime())) {
                    payPeriodForDisplay = periodDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  }
                } else if (payslipData.startDate || payslipData.endDate) {
                  // Fallback to startDate/endDate
                  const periodDate = payslipData.startDate ? new Date(payslipData.startDate) :
                    payslipData.endDate ? new Date(payslipData.endDate) : null;
                  if (periodDate && !isNaN(periodDate.getTime())) {
                    payPeriodForDisplay = periodDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  }
                }
              } else if (typeof payslipData === 'string') {
                // Raw ObjectId string (not populated)
                payslipIdForDisplay = payslipData;
              }
            }
            console.log(`[Dispute Mapping] ${dispute.disputeId} -> Payslip: ${payslipIdForDisplay}, PayPeriod: ${payPeriodForDisplay}`);

            return {
              id: dispute._id,
              disputeId: dispute.disputeId,
              employeeId: dispute.employeeId?._id || dispute.employeeId,
              employeeName: dispute.employeeId?.firstName && dispute.employeeId?.lastName
                ? `${dispute.employeeId.firstName} ${dispute.employeeId.lastName}`
                : 'Unknown',
              employeeNumber: dispute.employeeId?.employeeId || 'N/A',
              description: dispute.description,
              payslipId: payslipIdForDisplay,
              payPeriod: payPeriodForDisplay,
              status: dispute.status,
              submittedAt: dispute.createdAt,
              reviewedAt: dispute.updatedAt,
              notes: dispute.resolutionComment,
              rejectionRemarks: dispute.rejectionReason,
              refundId: dispute.refundId?.toString() || dispute.refundId || 'N/A',
              refundStatus: dispute.refundStatus || 'N/A',
            } as PayrollDispute;
          } catch (err) {
            console.error('Error mapping individual dispute:', err, dispute);
            return null; // Will filter these out
          }
        }).filter(Boolean) as PayrollDispute[]; // Filter out failed mappings

        console.log('Mapped disputes count:', mappedDisputes.length);

        // Filter by period if needed (Client-side filtering as requested)
        let finalDisputes = mappedDisputes;
        if (filters.period) {
          const [yearStr, monthStr] = filters.period.split('-');
          const filterYear = parseInt(yearStr);
          const filterMonth = parseInt(monthStr); // 1-12

          finalDisputes = finalDisputes.filter(d => {
            if (!d.submittedAt) return false;
            const date = new Date(d.submittedAt);
            return date.getFullYear() === filterYear && (date.getMonth() + 1) === filterMonth;
          });
        }

        // Show all disputes to specialists (including escalated for visibility)
        setDisputes(finalDisputes);
      }
    } catch (error) {
      console.error('Failed to load disputes:', error);
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDispute = async () => {
    if (!selectedDispute) return;
    if (!isUnderReview(selectedDispute.status)) {
      setError('Only disputes with "Under Review" status can be acted upon');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Reviewing dispute:', selectedDispute.id, 'Action:', reviewAction);
      let response;

      if (reviewAction === 'approve') {
        response = await payrollSpecialistService.approveDispute(
          selectedDispute.id,
          false,
          reviewNotes
        );
      } else {
        response = await payrollSpecialistService.rejectDispute(
          selectedDispute.id,
          rejectionRemarks
        );
      }

      console.log('Review response:', response);
      const updatedDispute = response.data || response;
      console.log('Updated dispute status:', updatedDispute?.status);

      if (updatedDispute) {
        setSuccessMessage(`Dispute ${reviewAction === 'approve' ? 'approved and escalated to payroll manager' : 'rejected'} successfully`);
        setShowReviewModal(false);
        setSelectedDispute(null);
        setReviewNotes('');
        setRejectionRemarks('');

        // Reload disputes to get fresh data
        await loadDisputes();
      }
    } catch (error) {
      console.error('Failed to review dispute:', error);
      setError(`Failed to ${reviewAction} dispute`);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (dispute: PayrollDispute, action: 'approve' | 'reject') => {
    setSelectedDispute(dispute);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const getStatusColor = (status: PayrollDispute['status']) => {
    switch (status) {
      case 'under review': return 'bg-blue-100 text-blue-800';
      case 'pending payroll Manager approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isUnderReview = (status?: string) => {
    if (!status) return false;
    // Normalize status: lowercase, trim, replace underscores with spaces
    // This handles variations like 'UNDER_REVIEW', 'under_review', 'Under Review '
    const normalized = status.toLowerCase().trim().replace(/_/g, ' ');
    return normalized === 'under review';
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
          <h1 className="text-2xl font-bold text-white">Dispute Review and Approval</h1>
          <p className="text-white mt-1">Review and approve/reject payroll disputes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.status || 'all'}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, status: e.target.value as DisputeFilters['status'] }))}
            >
              <option value="all">All Status</option>
              <option value="under review">Under Review</option>
              <option value="pending payroll Manager approval">Pending Manager Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payroll Period</label>
            <input
              type="month"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.period || ''}
              onChange={(e) => setFilters((prev: DisputeFilters) => ({ ...prev, period: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex items-end mt-4">
          <button
            onClick={loadDisputes}
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

      {/* Disputes List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Disputes</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading disputes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dispute ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pay Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-900">{dispute.disputeId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{dispute.employeeName}</div>
                        <div className="text-xs text-slate-500">{dispute.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[300px]">
                      <span className="text-sm text-slate-600">{dispute.description}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {dispute.payPeriod || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dispute.status)}`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(dispute.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedDispute(dispute)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                        {isUnderReview(dispute.status) && (
                          <>
                            <button
                              onClick={() => openReviewModal(dispute, 'approve')}
                              className="text-green-600 hover:text-green-800"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(dispute, 'reject')}
                              className="text-red-600 hover:text-red-800"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disputes.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No disputes found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispute Details Modal */}
      {selectedDispute && !showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Dispute Details</h3>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-500">Dispute ID</label>
                  <p className="text-slate-900 font-medium">{selectedDispute.disputeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedDispute.status)}`}>
                    {selectedDispute.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Employee</label>
                  <p className="text-slate-900">{selectedDispute.employeeName}</p>
                  <p className="text-sm text-slate-600">{selectedDispute.employeeNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Employee ID</label>
                  <p className="text-slate-900 text-sm font-mono">{selectedDispute.employeeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Pay Period</label>
                  <p className="text-slate-900">{selectedDispute.payPeriod || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Payslip ID</label>
                  <p className="text-slate-900 text-sm font-mono bg-slate-50 px-2 py-1 rounded inline-block mt-1">{selectedDispute.payslipId || 'N/A'}</p>
                </div>
                {(selectedDispute.refundId || selectedDispute.refundStatus) && selectedDispute.refundId !== 'N/A' && (
                  <>
                    <div className="col-span-2 mt-2 pt-2 border-t">
                      <h4 className="font-semibold text-slate-900">Refund Information</h4>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Refund ID</label>
                      <p className="text-slate-900 text-sm font-mono bg-slate-50 px-2 py-1 rounded inline-block mt-1">{selectedDispute.refundId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Refund Status</label>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          {selectedDispute.refundStatus}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Description</label>
                <p className="text-slate-900 mt-1">{selectedDispute.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Submitted</label>
                <p className="text-slate-900">{new Date(selectedDispute.submittedAt).toLocaleString()}</p>
              </div>
              {selectedDispute.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Resolution Comment</label>
                  <p className="text-slate-900 mt-1">{selectedDispute.notes}</p>
                </div>
              )}
              {selectedDispute.status === 'rejected' && selectedDispute.rejectionRemarks && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Rejection Reason</label>
                  <p className="text-red-600 mt-1">{selectedDispute.rejectionRemarks}</p>
                </div>
              )}
            </div>
            {isUnderReview(selectedDispute.status) && (
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => openReviewModal(selectedDispute, 'reject')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => openReviewModal(selectedDispute, 'approve')}
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
      {showReviewModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {reviewAction === 'approve' ? 'Approve Dispute' : 'Reject Dispute'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Dispute</label>
                <p className="text-slate-900">{selectedDispute.description}</p>
                <p className="text-sm text-slate-600">{selectedDispute.employeeName}</p>
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
                onClick={handleReviewDispute}
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