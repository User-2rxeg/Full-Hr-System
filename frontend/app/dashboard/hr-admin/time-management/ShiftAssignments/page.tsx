'use client';

import { useState, useEffect } from 'react';
import {
  timeManagementService,
  ShiftAssignment,
  Shift,
  ShiftAssignmentStatus,
  AssignShiftDto,
} from '@/app/services/time-management';
import { employeeProfileService } from '@/app/services/employee-profile';
import { organizationStructureService } from '@/app/services/organization-structure';
import { useAuth } from '@/context/AuthContext';
import { Users, Calendar, Clock, X, Loader2, CheckCircle } from 'lucide-react';

// Employee interface for dropdown
interface EmployeeOption {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
}

// Department interface
interface DepartmentOption {
  _id: string;
  name: string;
  code?: string;
}

// Position interface
interface PositionOption {
  _id: string;
  title: string;
  code?: string;
}

export default function ShiftAssignmentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduleRules, setScheduleRules] = useState<any[]>([]);

  // Employee/Department selection state
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentOption | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

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


  // Fetch all shift assignments and shifts
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assignmentsRes, shiftsRes, rulesRes, employeesRes, deptsRes, positionsRes] = await Promise.all([
        timeManagementService.getAllAssignments(),
        timeManagementService.getShifts(),
        timeManagementService.getScheduleRules(),
        employeeProfileService.getAllEmployees(1, 100) as Promise<any>,
        organizationStructureService.getDepartments().catch(() => ({ data: [] })),
        organizationStructureService.getPositions().catch(() => ({ data: [] })),
      ]);

      // Log for debugging
      console.log('Assignments Response:', assignmentsRes);
      console.log('Shifts Response:', shiftsRes);
      console.log('Schedule Rules Response:', rulesRes);
      console.log('Departments Response:', deptsRes);
      console.log('Positions Response:', positionsRes);

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

      // Extract employees
      const empData = employeesRes?.data?.data || employeesRes?.data || employeesRes || [];
      if (Array.isArray(empData)) {
        setEmployees(empData.map((emp: any) => ({
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeNumber: emp.employeeNumber || ''
        })));
      }

      // Extract departments from organization service
      const deptData = (deptsRes as any)?.data?.data || (deptsRes as any)?.data || deptsRes || [];
      if (Array.isArray(deptData)) {
        setDepartments(deptData.map((dept: any) => ({
          _id: dept._id,
          name: dept.name || dept.departmentName || 'Unknown',
          code: dept.code
        })));
      }

      // Extract positions from organization service
      const posData = (positionsRes as any)?.data?.data || (positionsRes as any)?.data || positionsRes || [];
      if (Array.isArray(posData)) {
        setPositions(posData.map((pos: any) => ({
          _id: pos._id,
          title: pos.title || pos.name || 'Unknown',
          code: pos.code
        })));
      }

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

  useEffect(() => {
    fetchData();
  }, []);


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


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Shift Assignments</h1>
            <p className="text-muted-foreground mt-1">Manage employee shift schedules and assignments</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Calendar className="w-5 h-5" />
            Assign Shift
          </button>
        </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}


      {/* View Type Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {(['employee', 'department', 'position'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              className={`px-6 py-3 font-medium transition border-b-2 -mb-px ${
                viewType === type
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="capitalize">
                {type === 'employee' && 'Employee Assignments'}
                {type === 'department' && 'Department Assignments'}
                {type === 'position' && 'Position Assignments'}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
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
      <div className="flex flex-wrap gap-2">
        {(['ALL', ...Object.values(ShiftAssignmentStatus)] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-4 py-2 font-medium transition ${
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Assignments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading assignments...</span>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  {viewType === 'employee' && 'Employee'}
                  {viewType === 'department' && 'Department'}
                  {viewType === 'position' && 'Position'}
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Shift
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Start Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  End Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No shift assignments found</p>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((assignment, index) => {
                  if (!assignment) return null;
                  return (
                    <tr key={assignment._id || index} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground">
                        {viewType === 'employee' && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                              {employees.find(e => e._id === assignment.employeeId)?.firstName?.[0] || '?'}
                              {employees.find(e => e._id === assignment.employeeId)?.lastName?.[0] || ''}
                            </div>
                            <div>
                              <p className="font-medium">
                                {employees.find(e => e._id === assignment.employeeId)
                                  ? `${employees.find(e => e._id === assignment.employeeId)?.firstName} ${employees.find(e => e._id === assignment.employeeId)?.lastName}`
                                  : 'Unknown Employee'}
                              </p>
                            </div>
                          </div>
                        )}
                        {viewType === 'department' && (departments.find(d => d._id === assignment.departmentId)?.name || assignment.departmentId || 'N/A')}
                        {viewType === 'position' && (assignment.positionId || 'N/A')}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {getShiftName(assignment.shiftId)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.endDate
                          ? new Date(assignment.endDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block rounded-lg px-3 py-1 text-xs font-semibold border ${
                            assignment.status === ShiftAssignmentStatus.APPROVED
                              ? 'bg-success/10 text-success border-success/30'
                              : assignment.status === ShiftAssignmentStatus.PENDING
                                ? 'bg-warning/10 text-warning border-warning/30'
                                : assignment.status === ShiftAssignmentStatus.CANCELLED
                                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                                  : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {assignment.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {assignment.status === ShiftAssignmentStatus.PENDING && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleStatusUpdate(
                                  assignment._id,
                                  ShiftAssignmentStatus.APPROVED
                                )
                              }
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 transition-colors"
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
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors"
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
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {assignment.status === ShiftAssignmentStatus.APPROVED && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExpireAssignment(assignment._id)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition-colors"
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
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Assign Shift</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 border border-destructive/30">
                <ul className="list-disc list-inside text-destructive text-sm">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleAssignShift} className="space-y-4">
              {/* Assignment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                          setSelectedEmployee(null);
                          setSelectedDepartment(null);
                          setFormData({
                            shiftId: formData.shiftId,
                            startDate: formData.startDate,
                            endDate: formData.endDate,
                            status: formData.status,
                          });
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm capitalize font-medium text-foreground">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Selection - Employee */}
              {assignmentType === 'employee' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Employee *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : employeeSearch}
                      onChange={(e) => {
                        setEmployeeSearch(e.target.value);
                        setSelectedEmployee(null);
                        setShowEmployeeDropdown(true);
                      }}
                      onFocus={() => setShowEmployeeDropdown(true)}
                      placeholder="Search employee by name..."
                      className="w-full px-3 py-2 pl-10 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    {selectedEmployee && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployee(null);
                          setEmployeeSearch('');
                          setFormData({ ...formData, employeeId: '' });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {showEmployeeDropdown && !selectedEmployee && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {employees.filter(emp => {
                        const searchLower = employeeSearch.toLowerCase();
                        return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower);
                      }).slice(0, 10).map((emp) => (
                        <button
                          type="button"
                          key={emp._id}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch('');
                            setShowEmployeeDropdown(false);
                            setFormData({ ...formData, employeeId: emp._id });
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <span className="text-sm text-foreground">{emp.firstName} {emp.lastName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Target Selection - Department */}
              {assignmentType === 'department' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Department *
                  </label>
                  <select
                    value={(formData as any).departmentId || ''}
                    onChange={(e) => setFormData({ ...(formData as any), departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Selection - Position */}
              {assignmentType === 'position' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Position *
                  </label>
                  <select
                    value={(formData as any).positionId || ''}
                    onChange={(e) =>
                      setFormData({ ...(formData as any), positionId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Position</option>
                    {positions.map((pos) => (
                      <option key={pos._id} value={pos._id}>
                        {pos.title} {pos.code ? `(${pos.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Shift Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Shift *
                </label>
                <select
                  value={formData.shiftId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, shiftId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Schedule Rule Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Schedule Rule (Optional)
                </label>
                <select
                  value={(formData as any).scheduleRuleId || ''}
                  onChange={(e) =>
                    setFormData({ ...(formData as any), scheduleRuleId: e.target.value || undefined })
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None - Static Assignment</option>
                  {scheduleRules.map((rule: any) => (
                    <option key={rule._id} value={rule._id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Optionally select a schedule rule for rotating shifts
                </p>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={formData.status || ShiftAssignmentStatus.PENDING}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={ShiftAssignmentStatus.PENDING}>Pending</option>
                  <option value={ShiftAssignmentStatus.APPROVED}>Approved</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setValidationErrors([]);
                  }}
                  className="flex-1 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? 'Assigning...' : 'Assign Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

