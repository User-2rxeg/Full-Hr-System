'use client';

import { useState, useEffect } from 'react';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  ClearanceChecklist,
  ClearanceCompletionStatus,
} from '@/app/services/offboarding';
import { useAuth } from '@/app/context/AuthContext';

export default function MyTerminationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [termination, setTermination] = useState<TerminationRequest | null>(null);
  const [clearanceChecklist, setClearanceChecklist] = useState<ClearanceChecklist | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<ClearanceCompletionStatus | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTerminationStatus();
    }
  }, [user?.id]);

  const fetchTerminationStatus = async () => {
    try {
      setLoading(false);

      const employeeId = user?.id;
      if (!employeeId) return;

      // Fetch termination request for this employee
      const requests = await offboardingService.getAllTerminationRequests(employeeId);

      if (requests && requests.length > 0) {
        const latestTermination = requests[0];
        setTermination(latestTermination);

        // If termination is approved, fetch clearance checklist
        if (latestTermination.status === TerminationStatus.APPROVED) {
          try {
            const checklist = await offboardingService.getClearanceChecklistByTerminationId(
              latestTermination._id
            );
            setClearanceChecklist(checklist);

            // Fetch clearance completion status
            const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
            setClearanceStatus(status);
          } catch (err) {
            // Clearance checklist not yet created
          }
        }
      }
    } catch (err) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: TerminationStatus) => {
    switch (status) {
      case TerminationStatus.PENDING:
        return {
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          description: 'Your termination request has been submitted and is awaiting review.',
        };
      case TerminationStatus.UNDER_REVIEW:
        return {
          className: 'bg-blue-50 text-blue-700 border-blue-200',
          description: 'Your termination request is under review by HR.',
        };
      case TerminationStatus.APPROVED:
        return {
          className: 'bg-green-50 text-green-700 border-green-200',
          description: 'Your termination has been approved. Offboarding process is underway.',
        };
      case TerminationStatus.REJECTED:
        return {
          className: 'bg-red-50 text-red-700 border-red-200',
          description: 'Your termination request has been rejected.',
        };
      default:
        return {
          className: 'bg-gray-50 text-gray-700 border-gray-200',
          description: 'Unknown status.',
        };
    }
  };

  const getInitiatorLabel = (initiator: string) => {
    switch (initiator) {
      case 'employee':
        return 'Your Resignation';
      case 'hr':
        return 'HR Initiated Termination';
      case 'manager':
        return 'Manager Initiated Termination';
      default:
        return initiator;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Loading your termination status...</p>
      </div>
    );
  }

  if (!termination) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Termination Status</h1>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          You do not have an active termination or resignation request.
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(termination.status);
  const clearanceProgress =
    clearanceChecklist && clearanceStatus
      ? Math.round(
          ((clearanceChecklist.items.filter((i) => i.status === 'approved').length || 0) /
            (clearanceChecklist.items.length || 1)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Termination Status</h1>
        <p className="text-gray-600 mt-2">OFF-019: Track your termination or resignation request</p>
      </div>

      {/* Main Status Card */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold">{getInitiatorLabel(termination.initiator)}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Submitted on {new Date(termination.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusConfig.className}`}
          >
            {termination.status}
          </span>
        </div>

        <div className="space-y-6">
          {/* Status Description */}
          <div className={`rounded-lg p-4 border ${statusConfig.className}`}>
            {statusConfig.description}
          </div>

          {/* Termination Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Effective Termination Date</p>
              <p className="text-lg font-semibold">
                {termination.terminationDate
                  ? new Date(termination.terminationDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Request Type</p>
              <p className="text-lg font-semibold capitalize">{termination.initiator}</p>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Reason for Termination</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">{termination.reason}</p>
            </div>
          </div>

          {/* Employee Comments */}
          {termination.employeeComments && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Your Comments</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{termination.employeeComments}</p>
              </div>
            </div>
          )}

          {/* HR Comments */}
          {termination.hrComments && (
            <div>
              <p className="text-sm text-gray-500 mb-2">HR Comments</p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-blue-700">{termination.hrComments}</p>
              </div>
            </div>
          )}

          {/* Performance Data */}
          {termination.performanceData && (
            <div className="border-t pt-6">
              <p className="font-semibold mb-4">Performance Data</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Appraisals</p>
                  <p className="text-2xl font-bold">{termination.performanceData.totalAppraisals}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold">
                    {termination.performanceData.averageScore?.toFixed(1) || 'N/A'}%
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Low Score Count</p>
                  <p className="text-2xl font-bold">{termination.performanceData.lowScoreCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clearance Checklist Status (if approved) */}
      {termination.status === TerminationStatus.APPROVED && clearanceStatus && clearanceChecklist && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Offboarding Checklist Progress</h2>
            <p className="text-sm text-gray-600 mt-1">OFF-006: Clearance status across departments</p>
          </div>

          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm text-gray-500">{clearanceProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${clearanceProgress}%` }}
                ></div>
              </div>
            </div>

            {/* Department Sign-offs */}
            <div>
              <p className="font-semibold mb-4">Department Approvals</p>
              <div className="space-y-3">
                {clearanceStatus.pendingDepartments && clearanceStatus.pendingDepartments.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Pending Approvals</p>
                    <ul className="space-y-2">
                      {clearanceStatus.pendingDepartments.map((dept) => (
                        <li key={dept} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                          <span className="text-sm">{dept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-gray-600 mb-2">Completed Approvals</p>
                {clearanceChecklist.items.map((item, idx) =>
                  item.status === 'approved' ? (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <span className="text-sm">{item.department}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {/* Equipment Status */}
            <div className="border-t pt-4">
              <p className="font-semibold mb-4">Equipment Return Status</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Equipment Returned</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      clearanceStatus.allEquipmentReturned
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {clearanceStatus.allEquipmentReturned ? 'Complete' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Access Card Returned</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      clearanceStatus.cardReturned
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {clearanceStatus.cardReturned ? 'Complete' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Final Status */}
            {clearanceStatus.fullyCleared && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 font-semibold">
                ✓ Offboarding checklist is fully complete. Final settlement can now be processed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-6">Request Timeline</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <div className="w-0.5 h-12 bg-gray-200" />
            </div>
            <div>
              <p className="font-semibold text-sm">Request Submitted</p>
              <p className="text-xs text-gray-500">{new Date(termination.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {termination.status !== TerminationStatus.PENDING && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 ${
                    termination.status === TerminationStatus.APPROVED ? 'bg-green-500' : 'bg-orange-500'
                  } rounded-full`}
                />
              </div>
              <div>
                <p className="font-semibold text-sm">Status: {termination.status}</p>
                <p className="text-xs text-gray-500">{new Date(termination.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

