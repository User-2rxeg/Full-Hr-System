'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { organizationStructureService } from '@/app/services/organization-structure';
import { StatusBadge } from '@/app/components/ui/status-badge';

/**
 * Change Requests Management - System Admin
 * REQ-OSM-04: Review and approve manager requests for changes
 * REQ-OSM-11: Notify managers and relevant stakeholders when a structural change occurs
 * BR 22: Changes must retain version history and audit logs
 */

interface ChangeRequest {
  _id: string;
  requestNumber: string;
  requestType: 'NEW_DEPARTMENT' | 'UPDATE_DEPARTMENT' | 'NEW_POSITION' | 'UPDATE_POSITION' | 'CLOSE_POSITION';
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELED' | 'IMPLEMENTED';
  description: string;
  justification?: string;
  requestedByEmployeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  targetDepartmentId?: { _id: string; name: string };
  targetPositionId?: { _id: string; title: string };
  proposedChanges?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const requestTypeLabels: Record<string, string> = {
  NEW_DEPARTMENT: 'New Department',
  UPDATE_DEPARTMENT: 'Update Department',
  NEW_POSITION: 'New Position',
  UPDATE_POSITION: 'Update Position',
  CLOSE_POSITION: 'Close Position',
};

// Helper to check if status is actionable (case-insensitive)
const isActionableStatus = (status: string): boolean => {
  const normalizedStatus = status?.toUpperCase();
  return normalizedStatus === 'SUBMITTED' || normalizedStatus === 'UNDER_REVIEW' || normalizedStatus === 'PENDING';
};

export default function ChangeRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionComment, setDecisionComment] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationStructureService.searchChangeRequests(
        filterStatus || undefined
      );

      if (res.data) {
        const data = res.data as any;
        setRequests(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      await organizationStructureService.submitApprovalDecision(selectedRequest._id, {
        decision: 'APPROVED',
        comments: decisionComment || undefined,
      });

      setSuccess('Request approved successfully');
      setSelectedRequest(null);
      setDecisionComment('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!decisionComment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await organizationStructureService.submitApprovalDecision(selectedRequest._id, {
        decision: 'REJECTED',
        comments: decisionComment,
      });

      setSuccess('Request rejected');
      setSelectedRequest(null);
      setDecisionComment('');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/system-admin/organization-structure"
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
              <p className="text-muted-foreground text-sm mt-1">
                REQ-OSM-04: Review and approve structural change requests
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELED">Canceled</option>
              <option value="IMPLEMENTED">Implemented</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="float-right">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess(null)} className="float-right">&times;</button>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-medium text-foreground">No Change Requests</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {filterStatus === 'SUBMITTED' || filterStatus === 'UNDER_REVIEW' ? 'No pending requests to review' : 'No requests found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Request</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Requested By</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((request) => (
                    <tr key={request._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{request.requestNumber}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">{request.description}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {requestTypeLabels[request.requestType] || request.requestType}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {request.requestedByEmployeeId
                          ? `${request.requestedByEmployeeId.firstName} ${request.requestedByEmployeeId.lastName}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {request.targetPositionId?.title || request.targetDepartmentId?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          {isActionableStatus(request.status) ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Review Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {isActionableStatus(selectedRequest.status) ? 'Review Request' : 'Request Details'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setDecisionComment('');
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Request Number</label>
                    <p className="font-medium text-foreground">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Type</label>
                    <p className="font-medium text-foreground">
                      {requestTypeLabels[selectedRequest.requestType]}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Status</label>
                    <p className="mt-1">
                      <StatusBadge status={selectedRequest.status} size="lg" />
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Requested By</label>
                    <p className="font-medium text-foreground">
                      {selectedRequest.requestedByEmployeeId
                        ? `${selectedRequest.requestedByEmployeeId.firstName} ${selectedRequest.requestedByEmployeeId.lastName}`
                        : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Description</label>
                  <p className="text-foreground mt-1">{selectedRequest.description}</p>
                </div>

                {selectedRequest.justification && (
                  <div>
                    <label className="text-sm text-muted-foreground">Justification</label>
                    <p className="text-foreground mt-1">{selectedRequest.justification}</p>
                  </div>
                )}

                {selectedRequest.proposedChanges && Object.keys(selectedRequest.proposedChanges).length > 0 && (
                  <div>
                    <label className="text-sm text-muted-foreground">Proposed Changes</label>
                    <div className="mt-2 bg-muted/50 rounded-lg p-4">
                      <pre className="text-sm text-foreground overflow-x-auto">
                        {JSON.stringify(selectedRequest.proposedChanges, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {isActionableStatus(selectedRequest.status) && (
                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">
                      Decision Comment (Required for rejection)
                    </label>
                    <textarea
                      value={decisionComment}
                      onChange={(e) => setDecisionComment(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                      placeholder="Add your comments..."
                    />
                  </div>
                )}
              </div>

              {isActionableStatus(selectedRequest.status) && (
                <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

