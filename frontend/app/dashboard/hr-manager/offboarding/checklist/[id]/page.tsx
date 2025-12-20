'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  offboardingService,
  ClearanceChecklist,
  ClearanceCompletionStatus,
  ApprovalStatus,
} from '@/app/services/offboarding';

export default function OffboardingChecklistPage() {
  const params = useParams();
  const checklistId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ClearanceChecklist | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ClearanceCompletionStatus | null>(null);

  useEffect(() => {
    if (checklistId) {
      fetchChecklist();
    }
  }, [checklistId]);

  const fetchChecklist = async () => {
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
      setError(err.message || 'Failed to fetch checklist');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract ID from potentially populated object
  const getTerminationId = () => {
    if (!checklist?.terminationId) return '';
    return typeof checklist.terminationId === 'object'
      ? (checklist.terminationId as any)?._id || (checklist.terminationId as any)?.id || ''
      : checklist.terminationId;
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case ApprovalStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case ApprovalStatus.PENDING:
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Checklist not found
        </div>
        <Link href="/dashboard/hr-manager/offboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Offboarding Dashboard
        </Link>
      </div>
    );
  }

  const completedDepartments = checklist.items.filter((item) => item.status === ApprovalStatus.APPROVED).length;
  const totalDepartments = checklist.items.length;
  const completionPercentage = totalDepartments > 0 ? Math.round((completedDepartments / totalDepartments) * 100) : 0;

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Exit Checklist</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Exit Checklist</h1>
          <p className="text-muted-foreground mt-1">Track asset return and department clearance sign-offs</p>
        </div>
        {completionStatus?.fullyCleared && (
          <Link
            href={`/dashboard/hr-manager/offboarding/final-settlement/${getTerminationId()}`}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Proceed to Final Settlement
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Department Clearance</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{completedDepartments} / {totalDepartments}</p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Equipment Returned</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">
            {checklist.equipmentList.filter((e) => e.returned).length} / {checklist.equipmentList.length}
          </p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Access Card</p>
          <p className={`text-2xl font-semibold mt-1 ${checklist.cardReturned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {checklist.cardReturned ? 'Returned' : 'Pending'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-foreground">Overall Progress</h2>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            completionStatus?.fullyCleared ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
          }`}>
            {completionStatus?.fullyCleared ? 'Fully Cleared' : 'In Progress'}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${completionStatus?.fullyCleared ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{completionPercentage}% complete</p>
      </div>

      {/* Department Sign-offs */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Department Sign-offs</h2>
        </div>
        <div className="divide-y divide-border">
          {checklist.items.map((item) => (
            <div key={item.department} className="p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium text-foreground">{item.department}</h3>
                {item.comments && (
                  <p className="text-sm text-muted-foreground mt-1">{item.comments}</p>
                )}
                {item.updatedAt && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Updated: {new Date(item.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(item.status)}`}>
                {item.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment List */}
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
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  equipment.returned ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                }`}>
                  {equipment.returned ? 'Returned' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Access Card Status */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Access Card</h2>
            <p className="text-sm text-muted-foreground mt-1">Employee access card return status</p>
          </div>
          <span className={`px-4 py-2 text-sm font-medium rounded-full ${
            checklist.cardReturned ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
          }`}>
            {checklist.cardReturned ? 'Returned' : 'Not Returned'}
          </span>
        </div>
      </div>

      {/* Pending Items Warning */}
      {completionStatus && !completionStatus.fullyCleared && (
        <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30 p-4 rounded-lg">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-300">Pending Items</h3>
          {completionStatus.pendingDepartments.length > 0 && (
            <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
              Pending Departments: {completionStatus.pendingDepartments.join(', ')}
            </p>
          )}
          {completionStatus.pendingEquipment.length > 0 && (
            <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">
              Pending Equipment: {completionStatus.pendingEquipment.join(', ')}
            </p>
          )}
          {!completionStatus.cardReturned && (
            <p className="text-sm text-yellow-800 dark:text-yellow-400 mt-1">Access card has not been returned</p>
          )}
        </div>
      )}
    </div>
  );
}

