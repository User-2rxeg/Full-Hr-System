'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  ClearanceChecklist,
  ClearanceCompletionStatus,
  ApprovalStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';


export default function ExitClearancePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const checklistId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ClearanceChecklist | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (checklistId) {
      fetchData();
    }
  }, [checklistId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [checklistData, statusData] = await Promise.all([
        offboardingService.getClearanceChecklistById(checklistId),
        offboardingService.getClearanceCompletionStatus(checklistId),
      ]);
      setChecklist(checklistData);
      setCompletionStatus(statusData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clearance data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (department: string, status: ApprovalStatus, comments?: string) => {
    if (!user) return;

    try {
      setUpdating(department);
      setError(null);
      await offboardingService.updateClearanceItem(checklistId, {
        department,
        status,
        comments,
        updatedBy: user.id || 'unknown',
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update clearance item');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateEquipment = async (equipmentName: string, returned: boolean) => {
    try {
      setUpdating(equipmentName);
      setError(null);
      await offboardingService.updateEquipmentItem(checklistId, equipmentName, {
        name: equipmentName,
        returned,
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update equipment status');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateCardReturn = async (returned: boolean) => {
    try {
      setUpdating('card');
      setError(null);
      await offboardingService.updateCardReturn(checklistId, returned);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update card return status');
    } finally {
      setUpdating(null);
    }
  };

  const handleTriggerFinalSettlement = async () => {
    if (!checklist) return;

    // Extract terminationId - handle both populated object and string ID
    const terminationId = typeof checklist.terminationId === 'object'
      ? (checklist.terminationId as any)?._id || (checklist.terminationId as any)?.id
      : checklist.terminationId;

    if (!terminationId) {
      setError('Invalid termination ID');
      return;
    }

    try {
      setError(null);
      await offboardingService.triggerFinalSettlement({
        terminationId: terminationId,
      });
      router.push(`/dashboard/hr-manager/offboarding/final-settlement/${terminationId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger final settlement');
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case ApprovalStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case ApprovalStatus.PENDING:
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
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

  if (!checklist) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Clearance checklist not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Exit Clearance</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Exit Clearance Checklist</h1>
          <p className="text-muted-foreground mt-1">Phase 5: Multi-department sign-off process (OFF-006, OFF-010)</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Completion Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Clearance Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.allDepartmentsCleared ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {completionStatus?.allDepartmentsCleared ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">All Departments Cleared</p>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.allEquipmentReturned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {completionStatus?.allEquipmentReturned ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">All Equipment Returned</p>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.cardReturned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {completionStatus?.cardReturned ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Access Card Returned</p>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className={`text-2xl font-bold ${completionStatus?.fullyCleared ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {completionStatus?.fullyCleared ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Fully Cleared</p>
          </div>
        </div>

        {completionStatus?.pendingDepartments && completionStatus.pendingDepartments.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Pending Departments:</strong> {completionStatus.pendingDepartments.join(', ')}
            </p>
          </div>
        )}

        {completionStatus?.fullyCleared && (
          <div className="mt-4">
            <button
              onClick={handleTriggerFinalSettlement}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Proceed to Final Settlement
            </button>
          </div>
        )}
      </div>

      {/* Department Sign-offs */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Department Sign-offs</h2>
        </div>
        <div className="divide-y divide-border">
          {checklist.items.map((item) => (
            <div key={item.department} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-foreground">{item.department}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(item.status)}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  {item.comments && (
                    <p className="text-sm text-muted-foreground mt-1">Comments: {item.comments}</p>
                  )}
                  {item.updatedAt && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Updated: {new Date(item.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const comments = prompt('Enter approval comments (optional):');
                      handleUpdateDepartment(item.department, ApprovalStatus.APPROVED, comments || undefined);
                    }}
                    disabled={updating === item.department || item.status === ApprovalStatus.APPROVED}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      item.status === ApprovalStatus.APPROVED
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } disabled:opacity-50`}
                  >
                    {updating === item.department ? 'Updating...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Enter rejection reason:');
                      if (comments) handleUpdateDepartment(item.department, ApprovalStatus.REJECTED, comments);
                    }}
                    disabled={updating === item.department || item.status === ApprovalStatus.REJECTED}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      item.status === ApprovalStatus.REJECTED
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 cursor-not-allowed'
                        : 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                    } disabled:opacity-50`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Return */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Equipment Return</h2>
        </div>
        <div className="divide-y divide-border">
          {checklist.equipmentList.length === 0 ? (
            <div className="p-4 text-muted-foreground text-center">No equipment to return</div>
          ) : (
            checklist.equipmentList.map((equipment) => (
              <div key={equipment.name} className="p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-foreground">{equipment.name}</h3>
                  {equipment.condition && (
                    <p className="text-sm text-muted-foreground">Condition: {equipment.condition}</p>
                  )}
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={equipment.returned}
                    onChange={(e) => handleUpdateEquipment(equipment.name, e.target.checked)}
                    disabled={updating === equipment.name}
                    className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                  />
                  <span className={equipment.returned ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                    {equipment.returned ? 'Returned' : 'Not Returned'}
                  </span>
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Access Card */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Access Card</h2>
            <p className="text-sm text-muted-foreground mt-1">Has the employee returned their access card?</p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checklist.cardReturned}
              onChange={(e) => handleUpdateCardReturn(e.target.checked)}
              disabled={updating === 'card'}
              className="w-5 h-5 text-primary border-input rounded focus:ring-ring"
            />
            <span className={checklist.cardReturned ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
              {checklist.cardReturned ? 'Returned' : 'Not Returned'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

