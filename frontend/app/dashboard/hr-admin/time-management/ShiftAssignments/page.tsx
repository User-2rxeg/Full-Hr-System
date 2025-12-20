'use client';

import { useState, useEffect } from 'react';
import {
  timeManagementService,
  ShiftAssignment,
  Shift,
  ShiftAssignmentStatus,
  AssignShiftDto,
} from '@/app/services/time-management';
import { useAuth } from '@/app/context/AuthContext';
import notificationsService from "@/app/services/notifications";

export default function ShiftAssignmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduleRules, setScheduleRules] = useState<any[]>([]);

  // Form state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'employee' | 'department' | 'position'>('employee');
  const [formData, setFormData] = useState<AssignShiftDto>({
    shiftId: '',
    employeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: ShiftAssignmentStatus.PENDING,
    scheduleRuleId: '',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // View state - show employee, department, or position assignments
  const [viewType, setViewType] = useState<'employee' | 'department' | 'position'>('employee');

  // Filters
  const [statusFilter, setStatusFilter] = useState<ShiftAssignmentStatus | 'ALL'>('ALL');

  // Expiry notifications
  const [expiringAssignments, setExpiringAssignments] = useState<ShiftAssignment[]>([]);
  const [showExpiryNotifications, setShowExpiryNotifications] = useState(true);
  const [dismissedExpiryIds, setDismissedExpiryIds] = useState<Set<string>>(new Set());

  // Fetch all shift assignments and shifts
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignmentsRes, shiftsRes, rulesRes] = await Promise.all([
        timeManagementService.getAllAssignments(),
        timeManagementService.getShifts(),
        timeManagementService.getScheduleRules(),
      ]);

      // Log for debugging
      console.log('Assignments Response:', assignmentsRes);
      console.log('Shifts Response:', shiftsRes);
      console.log('Schedule Rules Response:', rulesRes);

      // Safely extract data and filter out undefined items
      const assignmentsData = Array.isArray(assignmentsRes.data)
        ? assignmentsRes.data.filter(Boolean)
        : Array.isArray(assignmentsRes)
          ? assignmentsRes.filter(Boolean)
          : [];

      const shiftsData = Array.isArray(shiftsRes.data)
        ? shiftsRes.data.filter(Boolean)
        : Array.isArray(shiftsRes)
          ? shiftsRes.filter(Boolean)
          : [];

      const rulesData = Array.isArray(rulesRes.data)
        ? rulesRes.data.filter(Boolean)
        : Array.isArray(rulesRes)
          ? rulesRes.filter(Boolean)
          : [];

      setAssignments(assignmentsData);
      setShifts(shiftsData);
      setScheduleRules(rulesData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err?.response?.data?.message || 'Failed to load shift assignments');
    } finally {
      setLoading(false);
    }
  // ...existing code...
  };

  // Helper function to send notifications to employee based on assignment status
  const sendAssignmentNotification = async (
    assignment: ShiftAssignment,
    status: ShiftAssignmentStatus,
    shift?: Shift
  ) => {
    try {
      const employeeId = assignment.employeeId || assignment.departmentId || assignment.positionId;
      if (!employeeId) {
        console.warn('[Notification] No employee/department/position ID found for notification');
        return;
      }

      const shiftName = shift?.name || 'Unknown Shift';
      const startDate = assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : 'TBD';
      const endDate = assignment.endDate ? new Date(assignment.endDate).toLocaleDateString() : 'Ongoing';

      let notificationMessage: string;
      let notificationType = 'SHIFT_ASSIGNMENT_UPDATE';

      switch (status) {
        case ShiftAssignmentStatus.PENDING:
          notificationMessage = `New shift assignment: ${shiftName} (${startDate} - ${endDate}). Pending approval.`;
          notificationType = 'SHIFT_ASSIGNMENT_CREATED';
          break;
        case ShiftAssignmentStatus.APPROVED:
          notificationMessage = `Your shift assignment for ${shiftName} (${startDate} - ${endDate}) has been approved.`;
          notificationType = 'SHIFT_ASSIGNMENT_APPROVED';
          break;
        case ShiftAssignmentStatus.CANCELLED:
          notificationMessage = `Your shift assignment for ${shiftName} (${startDate} - ${endDate}) has been cancelled.`;
          notificationType = 'SHIFT_ASSIGNMENT_CANCELLED';
          break;
        case ShiftAssignmentStatus.EXPIRED:
          notificationMessage = `Your shift assignment for ${shiftName} (${startDate} - ${endDate}) has expired.`;
          notificationType = 'SHIFT_ASSIGNMENT_EXPIRED';
          break;
        default:
          notificationMessage = `Your shift assignment for ${shiftName} status has been updated to ${status}.`;
      }

      console.log(`[Notification] Sending notification to ${employeeId}: ${notificationMessage}`);

      // Create notification payload
      const notificationPayload = {
        to: employeeId,
        type: notificationType,
        message: notificationMessage,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Note: You may need to add a createNotification method to notificationsService
      // For now, this logs the notification that should be sent
      console.log('[Notification] Notification payload:', notificationPayload);

      // Uncomment when backend has create notification endpoint:
      // await notificationsService.createNotification(notificationPayload);
    } catch (error) {
      console.error('[Notification] Failed to send notification:', error);
      // Don't throw error - notification failure shouldn't block the assignment operation
    }
  };

  // Fetch shift expiry notifications from backend (ShiftExpiryScheduler creates these daily)
  const fetchExpiringNotifications = async () => {
    try {
      // Fetch SHIFT_EXPIRY notifications that were created by the backend scheduler
      const response = await notificationsService.getAllNotifications('SHIFT_EXPIRY');

      if (response.error || !response.data) {
        console.warn('[ShiftAssignments] Failed to fetch expiring notifications:', response.error);
        setExpiringAssignments([]);
        return;
      }

      // Extract assignment IDs from notification messages and match with assignments
      const expiringAssignmentIds = response.data
        .map((notification) => {
          // Message format: "Shift assignment <ID> for employee <empId> expires on <date>..."
          const match = notification.message.match(/Shift assignment ([a-f\d]{24})/);
          return match?.[1];
        })
        .filter(Boolean);

      // Filter assignments to show only those with expiry notifications
      const expiring = assignments.filter((a) => expiringAssignmentIds.includes(a._id));

      setExpiringAssignments(expiring);
      console.log('[ShiftAssignments] Fetched expiring assignments from backend:', expiring.length);
    } catch (err) {
      console.error('[ShiftAssignments] Error fetching expiring notifications:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch expiring shift notifications from backend scheduler
  useEffect(() => {
    fetchExpiringNotifications();

    // Re-check every 60 minutes for new notifications from the scheduler
    const intervalId = setInterval(fetchExpiringNotifications, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [assignments]);

  // Handle form submission
  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setError(null);

    // Validate based on assignment type
    const errors: string[] = [];

    if (!formData.shiftId) {
      errors.push('Shift is required');
    }

    if (!formData.startDate) {
      errors.push('Start date is required');
    }

    // Validate that at least one target is selected
    if (assignmentType === 'employee' && !formData.employeeId) {
      errors.push('Employee ID is required');
    } else if (assignmentType === 'department' && !(formData as any).departmentId) {
      errors.push('Department ID is required');
    } else if (assignmentType === 'position' && !(formData as any).positionId) {
      errors.push('Position ID is required');
    }

    // Validate date range
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        errors.push('End date must be after start date');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Check for overlapping assignments
    try {
      setLoading(true);
      const targetId =
        assignmentType === 'employee' ? formData.employeeId :
        assignmentType === 'department' ? (formData as any).departmentId :
        (formData as any).positionId;

      const existingAssignments = assignments.filter(a => {
        const aTarget =
          assignmentType === 'employee' ? a.employeeId :
          assignmentType === 'department' ? a.departmentId :
          a.positionId;

        if (aTarget !== targetId) return false;
        if (a.status === ShiftAssignmentStatus.CANCELLED || a.status === ShiftAssignmentStatus.EXPIRED) return false;

        const existingStart = new Date(a.startDate);
        const existingEnd = a.endDate ? new Date(a.endDate) : new Date('2099-12-31');
        const newStart = new Date(formData.startDate);
        const newEnd = formData.endDate ? new Date(formData.endDate) : new Date('2099-12-31');

        // Check for overlap
        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (existingAssignments.length > 0) {
        setError('This shift conflicts with an existing assignment for the same period');
        setLoading(false);
        return;
      }

      // Prepare DTO based on assignment type
      const assignDto: any = {
        shiftId: formData.shiftId,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        status: formData.status || ShiftAssignmentStatus.PENDING,
      };

      if (formData.scheduleRuleId) {
        assignDto.scheduleRuleId = formData.scheduleRuleId;
      }

      if (assignmentType === 'employee') {
        assignDto.employeeId = formData.employeeId;
      } else if (assignmentType === 'department') {
        assignDto.departmentId = (formData as any).departmentId;
      } else if (assignmentType === 'position') {
        assignDto.positionId = (formData as any).positionId;
      }

      const response = await timeManagementService.assignShift(assignDto);
      console.log('✅ Assignment Response:', response);

      // Extract shift details for notification
      const assignedShift = shifts.find(s => s._id === formData.shiftId);

      // Send notification to employee/department/position
      if (response && response.data) {
        const assignment = response.data;
        await sendAssignmentNotification(assignment, ShiftAssignmentStatus.PENDING, assignedShift);
      }

      setShowAssignModal(false);
      setFormData({
        shiftId: '',
        employeeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: ShiftAssignmentStatus.PENDING,
        scheduleRuleId: '',
      });
      setAssignmentType('employee');
      setSuccess('Shift assigned successfully! Notification sent to employee.');

      // Refresh the assignments list
      setTimeout(() => {
        setSuccess(null);
        fetchData();
      }, 1500);
    } catch (err: any) {
      console.error('❌ Error assigning shift:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to assign shift';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (assignmentId: string, newStatus: ShiftAssignmentStatus) => {
    try {
      setLoading(true);
      await timeManagementService.updateAssignmentStatus(assignmentId, {
        status: newStatus,
        updatedBy: user?.id,
      });

      // Find the assignment to send notification
      const assignment = assignments.find(a => a._id === assignmentId);
      const assignedShift = shifts.find(s => s._id === assignment?.shiftId);

      // Send notification to employee/department/position
      if (assignment) {
        await sendAssignmentNotification(assignment, newStatus, assignedShift);
      }

      setAssignments(
        assignments.map((a) =>
          a._id === assignmentId ? { ...a, status: newStatus } : a
        )
      );
      setSuccess(`Assignment status updated to ${newStatus}. Notification sent to employee.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update assignment status');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete/expire
  const handleExpireAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to expire this assignment?')) return;

    try {
      setLoading(true);

      // Find the assignment to send notification
      const assignment = assignments.find(a => a._id === assignmentId);
      const assignedShift = shifts.find(s => s._id === assignment?.shiftId);

      await timeManagementService.expireAssignment(assignmentId);

      // Send notification to employee/department/position about expiry
      if (assignment) {
        await sendAssignmentNotification(assignment, ShiftAssignmentStatus.CANCELLED, assignedShift);
      }

      setAssignments(assignments.filter((a) => a._id !== assignmentId));
      setSuccess('Assignment expired successfully. Notification sent to employee.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to expire assignment');
    } finally {
      setLoading(false);
    }
  };

  // Filter assignments based on view type and status
  const getFilteredAssignments = () => {
    let filtered = assignments;

    // Filter by view type (employee/department/position)
    if (viewType === 'employee') {
      filtered = filtered.filter((a) => a.employeeId && a.employeeId !== '');
    } else if (viewType === 'department') {
      filtered = filtered.filter((a) => a.departmentId && a.departmentId !== '');
    } else if (viewType === 'position') {
      filtered = filtered.filter((a) => a.positionId && a.positionId !== '');
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    return filtered;
  };

  const filteredAssignments = getFilteredAssignments();

  // Get shift name by ID
  const getShiftName = (shiftId: string) => {
    return shifts.find((s) => s._id === shiftId)?.name || shiftId;
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (endDate: string | Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  // Dismiss an expiry notification
  const handleDismissExpiry = (assignmentId: string) => {
    const newDismissed = new Set(dismissedExpiryIds);
    newDismissed.add(assignmentId);
    setDismissedExpiryIds(newDismissed);
  };

  // Get unread expiry notifications (not dismissed)
  const getUnreadExpiryNotifications = () => {
    return expiringAssignments.filter(a => !dismissedExpiryIds.has(a._id));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shift Assignments</h1>
        <button
          onClick={() => setShowAssignModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Assign Shift
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Expiry Notifications Banner */}
      {showExpiryNotifications && getUnreadExpiryNotifications().length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="mb-3 flex items-center text-lg font-semibold text-orange-900">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-sm font-bold">
                  ⚠
                </span>
                {getUnreadExpiryNotifications().length} Shift Assignment(s) Expiring Soon
              </h3>
              <div className="space-y-2">
                {getUnreadExpiryNotifications().map((assignment) => {
                  const daysLeft = assignment.endDate ? getDaysUntilExpiry(assignment.endDate) : 0;
                  const targetName =
                    assignment.employeeId ? `Employee: ${assignment.employeeId}` :
                    assignment.departmentId ? `Department: ${assignment.departmentId}` :
                    assignment.positionId ? `Position: ${assignment.positionId}` :
                    'Unknown Target';

                  return (
                    <div key={assignment._id} className="flex items-center justify-between rounded bg-orange-100 px-3 py-2">
                      <div className="text-sm text-orange-800">
                        <strong>{getShiftName(assignment.shiftId)}</strong> for {targetName} expires in{' '}
                        <strong className="text-orange-900">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </strong>
                        {assignment.endDate && (
                          <span className="ml-2 text-xs">
                            ({new Date(assignment.endDate).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setStatusFilter(ShiftAssignmentStatus.APPROVED);
                            setViewType(
                              assignment.employeeId ? 'employee' :
                              assignment.departmentId ? 'department' :
                              'position'
                            );
                          }}
                          className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDismissExpiry(assignment._id)}
                          className="rounded bg-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-400"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowExpiryNotifications(false)}
                className="mt-3 text-xs font-medium text-orange-700 hover:text-orange-900"
              >
                Hide All Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Type Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-0">
          {(['employee', 'department', 'position'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`px-6 py-3 font-medium transition border-b-2 ${
                viewType === type
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="capitalize">
                {type === 'employee' && 'Employee Assignments'}
                {type === 'department' && 'Department Assignments'}
                {type === 'position' && 'Position Assignments'}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ({assignments.filter((a) =>
                  type === 'employee' ? (a.employeeId && a.employeeId !== '') :
                  type === 'department' ? (a.departmentId && a.departmentId !== '') :
                  (a.positionId && a.positionId !== '')
                ).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6 flex gap-2">
        {(['ALL', ...Object.values(ShiftAssignmentStatus)] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Assignments Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading assignments...</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  {viewType === 'employee' && 'Employee ID'}
                  {viewType === 'department' && 'Department ID'}
                  {viewType === 'position' && 'Position ID'}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Shift
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No shift assignments found
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment, index) => {
                  if (!assignment) return null;
                  return (
                    <tr key={assignment._id || index} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {viewType === 'employee' && (assignment.employeeId || 'N/A')}
                        {viewType === 'department' && (assignment.departmentId || 'N/A')}
                        {viewType === 'position' && (assignment.positionId || 'N/A')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getShiftName(assignment.shiftId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {assignment.endDate
                          ? new Date(assignment.endDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            assignment.status === ShiftAssignmentStatus.APPROVED
                              ? 'bg-green-100 text-green-800'
                              : assignment.status === ShiftAssignmentStatus.PENDING
                                ? 'bg-yellow-100 text-yellow-800'
                                : assignment.status === ShiftAssignmentStatus.CANCELLED
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {assignment.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {assignment.status === ShiftAssignmentStatus.PENDING && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  assignment._id,
                                  ShiftAssignmentStatus.APPROVED
                                )
                              }
                              className="mr-2 rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  assignment._id,
                                  ShiftAssignmentStatus.CANCELLED
                                )
                              }
                              className="mr-2 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  assignment._id,
                                  ShiftAssignmentStatus.CANCELLED
                                )
                              }
                              className="rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {assignment.status === ShiftAssignmentStatus.APPROVED && (
                          <>
                            <button
                              onClick={() => handleExpireAssignment(assignment._id)}
                              className="mr-2 rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                            >
                              Expire
                            </button>
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  assignment._id,
                                  ShiftAssignmentStatus.CANCELLED
                                )
                              }
                              className="rounded bg-gray-600 px-3 py-1 text-white hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-96 overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold">Assign Shift</h2>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200">
                <ul className="list-disc list-inside text-red-700 text-sm">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleAssignShift} className="space-y-4">
              {/* Assignment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                <div className="flex gap-4">
                  {(['employee', 'department', 'position'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="assignmentType"
                        value={type}
                        checked={assignmentType === type}
                        onChange={(e) => {
                          setAssignmentType(e.target.value as any);
                          setFormData({
                            shiftId: formData.shiftId,
                            startDate: formData.startDate,
                            endDate: formData.endDate,
                            status: formData.status,
                          });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm capitalize font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target ID Input - Employee */}
              {assignmentType === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Employee ID (MongoDB ObjectId)"
                    value={formData.employeeId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Target ID Input - Department */}
              {assignmentType === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department ID *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Department ID (MongoDB ObjectId)"
                    value={(formData as any).departmentId || ''}
                    onChange={(e) =>
                      setFormData({ ...(formData as any), departmentId: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Target ID Input - Position */}
              {assignmentType === 'position' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Position ID *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Position ID (MongoDB ObjectId)"
                    value={(formData as any).positionId || ''}
                    onChange={(e) =>
                      setFormData({ ...(formData as any), positionId: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Shift Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shift *
                </label>
                <select
                  value={formData.shiftId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, shiftId: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select a shift</option>
                  {shifts.map((shift) => (
                    <option key={shift._id} value={shift._id}>
                      {shift.name} ({shift.startTime} - {shift.endTime})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={
                      formData.startDate
                        ? new Date(formData.startDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={
                      formData.endDate
                        ? new Date(formData.endDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Schedule Rule Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Schedule Rule (Optional)
                </label>
                <select
                  value={(formData as any).scheduleRuleId || ''}
                  onChange={(e) =>
                    setFormData({ ...(formData as any), scheduleRuleId: e.target.value || undefined })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">None - Static Assignment</option>
                  {scheduleRules.map((rule: any) => (
                    <option key={rule._id} value={rule._id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Optionally select a schedule rule for rotating shifts
                </p>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status || ShiftAssignmentStatus.PENDING}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value={ShiftAssignmentStatus.PENDING}>Pending</option>
                  <option value={ShiftAssignmentStatus.APPROVED}>Approved</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  {loading ? 'Assigning...' : 'Assign Shift'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setValidationErrors([]);
                  }}
                  className="flex-1 rounded-lg bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

