'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  ClearanceCompletionStatus,
} from '@/app/services/offboarding';

export default function FinalSettlementPage() {
  const params = useParams();
  const terminationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TerminationRequest | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (terminationId) {
      fetchData();
    }
  }, [terminationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const requestData = await offboardingService.getTerminationRequestById(terminationId);
      setRequest(requestData);

      if (requestData.status === TerminationStatus.APPROVED) {
        try {
          const checklist = await offboardingService.getClearanceChecklistByTerminationId(terminationId);
          const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
          setClearanceStatus(status);
        } catch {
          // Clearance might not exist
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSettlement = async () => {
    try {
      setTriggering(true);
      setError(null);
      await offboardingService.triggerFinalSettlement({ terminationId });
      setTriggered(true);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger final settlement');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded mt-6"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Termination request not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  const canTriggerSettlement = request.status === TerminationStatus.APPROVED && clearanceStatus?.fullyCleared;

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Final Settlement</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Final Settlement</h1>
          <p className="text-muted-foreground mt-1">Phase 7: Benefits termination and final pay calculation (OFF-013)</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {triggered && (
        <div className="bg-green-100 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400 px-4 py-3 rounded-md">
          Final settlement has been triggered successfully. The payroll team will process the final payment.
        </div>
      )}

      {/* Termination Details */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Termination Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Employee</dt>
            <dd className="mt-1 text-foreground">
              {(() => {
                const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
                return employee
                  ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
                  : 'Employee';
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                request.status === TerminationStatus.APPROVED
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
              }`}>
                {request.status.replace('_', ' ').toUpperCase()}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Termination Date</dt>
            <dd className="mt-1 text-foreground">
              {request.terminationDate ? new Date(request.terminationDate).toLocaleDateString() : 'Not specified'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Reason</dt>
            <dd className="mt-1 text-foreground">{request.reason}</dd>
          </div>
        </dl>
      </div>

      {/* Clearance Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Clearance Status</h2>
        {clearanceStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.allDepartmentsCleared ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {clearanceStatus.allDepartmentsCleared ? 'Cleared' : 'Pending'}
                </p>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.allEquipmentReturned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {clearanceStatus.allEquipmentReturned ? 'Returned' : 'Pending'}
                </p>
                <p className="text-sm text-muted-foreground">Equipment</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.cardReturned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {clearanceStatus.cardReturned ? 'Returned' : 'Pending'}
                </p>
                <p className="text-sm text-muted-foreground">Access Card</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className={`text-lg font-bold ${clearanceStatus.fullyCleared ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {clearanceStatus.fullyCleared ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-muted-foreground">Fully Cleared</p>
              </div>
            </div>

            {!clearanceStatus.fullyCleared && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Note:</strong> Employee must be fully cleared before final settlement can be processed.
                </p>
                {clearanceStatus.pendingDepartments.length > 0 && (
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                    Pending departments: {clearanceStatus.pendingDepartments.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-300">Clearance checklist has not been created yet.</p>
            <Link
              href={`/dashboard/hr-manager/offboarding/resignations/${terminationId}`}
              className="text-primary hover:underline mt-2 inline-block"
            >
              Go to request details to create clearance checklist
            </Link>
          </div>
        )}
      </div>

      {/* Settlement Components */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Settlement Components</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Per BR 11: Leaves balance must be reviewed and settled (unused annuals to be encashed).
          Benefits plans are set to be auto-terminated as of the end of the notice period.
        </p>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <span className="text-foreground">Unused Annual Leave Encashment</span>
            <span className="text-muted-foreground text-sm">Calculated from Leaves Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <span className="text-foreground">Final Salary (Pro-rated)</span>
            <span className="text-muted-foreground text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <span className="text-foreground">Pending Allowances</span>
            <span className="text-muted-foreground text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <span className="text-foreground">Deductions (Loans, Advances)</span>
            <span className="text-muted-foreground text-sm">Calculated from Payroll Module</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <span className="text-foreground">Benefits Termination</span>
            <span className="text-muted-foreground text-sm">Auto-terminated at end of notice period</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Trigger Final Settlement</h2>
        {canTriggerSettlement ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              All clearance requirements have been met. Click the button below to trigger the final settlement process.
              This will notify the payroll team to calculate and process the final payment.
            </p>
            <button
              onClick={handleTriggerSettlement}
              disabled={triggering || triggered}
              className={`px-6 py-3 rounded-md text-primary-foreground font-medium ${
                triggered
                  ? 'bg-green-500 cursor-not-allowed'
                  : triggering
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {triggered ? 'Settlement Triggered' : triggering ? 'Processing...' : 'Trigger Final Settlement'}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">
              Final settlement cannot be triggered until:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2">
              {request.status !== TerminationStatus.APPROVED && (
                <li>Termination request is approved</li>
              )}
              {!clearanceStatus?.fullyCleared && (
                <li>Employee is fully cleared (all departments, equipment, and access card)</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

