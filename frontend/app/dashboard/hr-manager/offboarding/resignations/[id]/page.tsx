'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
  ClearanceChecklist,
} from '@/app/services/offboarding';
import { useAuth } from '@/context/AuthContext';

export default function ResignationDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TerminationRequest | null>(null);
  const [clearance, setClearance] = useState<ClearanceChecklist | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (requestId) {
      fetchData();
    }
  }, [requestId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const requestData = await offboardingService.getTerminationRequestById(requestId);
      setRequest(requestData);

      // Check if status is approved (case-insensitive)
      const status = requestData.status?.toLowerCase();
      if (status === TerminationStatus.APPROVED || status === 'approved') {
        try {
          const clearanceData = await offboardingService.getClearanceChecklistByTerminationId(requestId);
          setClearance(clearanceData);
        } catch {
          // Clearance may not exist yet
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch request data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: TerminationStatus, comments?: string) => {
    if (!request) return;

    try {
      setUpdating(true);
      setError(null);
      await offboardingService.updateTerminationStatus(requestId, {
        status: newStatus,
        hrComments: comments,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateClearance = async () => {
    if (!request) return;

    try {
      setUpdating(true);
      setError(null);
      await offboardingService.createClearanceChecklist({
        terminationId: requestId,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create clearance checklist');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      setUpdating(true);
      await offboardingService.deleteTerminationRequest(requestId);
      router.push('/dashboard/hr-manager/offboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to delete request');
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return 'bg-muted text-muted-foreground border-border';
      case TerminationStatus.UNDER_REVIEW:
        return 'bg-primary/10 text-primary border-primary/20';
      case TerminationStatus.APPROVED:
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      case TerminationStatus.REJECTED:
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Request not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  const isResignation = request.initiator === TerminationInitiation.EMPLOYEE ||
                        request.initiator?.toLowerCase() === 'employee';

  // Normalize status for comparison (DB might return uppercase)
  const normalizedStatus = request.status?.toLowerCase() as TerminationStatus;

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">{isResignation ? 'Resignation' : 'Termination'} Request</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">
            {isResignation ? 'Resignation' : 'Termination'} Request Details
          </h1>
          {(() => {
            const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
            const employeeName = employee
              ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
              : null;
            return employeeName ? (
              <p className="text-muted-foreground mt-1">{employeeName}</p>
            ) : null;
          })()}
        </div>
        <div className="flex gap-3">
          {normalizedStatus === TerminationStatus.PENDING && (
            <button
              onClick={handleDelete}
              disabled={updating}
              className="px-4 py-2 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
            >
              Delete Request
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Request Information</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadge(normalizedStatus)}`}>
                    {normalizedStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                <dd className="mt-1 text-foreground">
                  {isResignation ? 'Employee Resignation' : `${(request.initiator || 'Unknown').toUpperCase()} Initiated Termination`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Submitted Date</dt>
                <dd className="mt-1 text-foreground">{new Date(request.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Effective Date</dt>
                <dd className="mt-1 text-foreground">
                  {request.terminationDate ? new Date(request.terminationDate).toLocaleDateString() : 'Not specified'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Reason</dt>
                <dd className="mt-1 text-foreground">{request.reason}</dd>
              </div>
              {request.employeeComments && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Employee Comments</dt>
                  <dd className="mt-1 text-foreground">{request.employeeComments}</dd>
                </div>
              )}
              {request.hrComments && (
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">HR Comments</dt>
                  <dd className="mt-1 text-foreground">{request.hrComments}</dd>
                </div>
              )}
            </dl>
          </div>

          {request.performanceWarnings && request.performanceWarnings.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-destructive mb-4">Performance Warnings</h2>
              <ul className="space-y-2">
                {request.performanceWarnings.map((warning, index) => (
                  <li key={index} className="text-destructive/80">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {normalizedStatus === TerminationStatus.APPROVED && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Exit Clearance</h2>
              {clearance ? (
                <div>
                  <p className="text-muted-foreground mb-4">
                    Clearance checklist has been created. Track department sign-offs below.
                  </p>
                  <Link
                    href={`/dashboard/hr-manager/offboarding/exit-clearance/${clearance._id}`}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    View Clearance Checklist
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">
                    Create a clearance checklist to track department sign-offs for this employee.
                  </p>
                  <button
                    onClick={handleCreateClearance}
                    disabled={updating}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {updating ? 'Creating...' : 'Create Clearance Checklist'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Actions</h2>
            <div className="space-y-3">
              {normalizedStatus === TerminationStatus.PENDING && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(TerminationStatus.UNDER_REVIEW)}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleStatusUpdate(TerminationStatus.REJECTED, comments);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                </>
              )}
              {normalizedStatus === TerminationStatus.UNDER_REVIEW && (
                <>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter approval comments (optional):');
                      handleStatusUpdate(TerminationStatus.APPROVED, comments || undefined);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50"
                  >
                    Approve Request
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleStatusUpdate(TerminationStatus.REJECTED, comments);
                    }}
                    disabled={updating}
                    className="w-full px-4 py-2 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                </>
              )}
              {normalizedStatus === TerminationStatus.APPROVED && clearance && (
                <Link
                  href={`/dashboard/hr-manager/offboarding/final-settlement/${request._id}`}
                  className="block w-full px-4 py-2 bg-primary text-primary-foreground text-center rounded-md hover:bg-primary/90"
                >
                  Process Final Settlement
                </Link>
              )}
              {(normalizedStatus === TerminationStatus.APPROVED || normalizedStatus === TerminationStatus.REJECTED) && (
                <p className="text-sm text-muted-foreground text-center">
                  This request has been {normalizedStatus}.
                </p>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Workflow Status</h2>
            <div className="space-y-3">
              {[
                { step: 1, label: 'Request Submitted', completed: true },
                { step: 2, label: 'Under Review', completed: normalizedStatus !== TerminationStatus.PENDING },
                { step: 3, label: 'Approved/Rejected', completed: normalizedStatus === TerminationStatus.APPROVED || normalizedStatus === TerminationStatus.REJECTED },
                { step: 4, label: 'Clearance Process', completed: !!clearance },
                { step: 5, label: 'Final Settlement', completed: false },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      item.completed ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.completed ? '✓' : item.step}
                  </div>
                  <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

