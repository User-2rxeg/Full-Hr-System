'use client';

import { useState, useEffect } from 'react';
import { performanceService } from '@/app/services/performance';
import { employeeProfileService } from '@/app/services/employee-profile';

/**
 * Performance Management - HR Employee
 * REQ-PP-05: Assign appraisal forms and templates to employees and managers in bulk
 * REQ-AE-06: Monitor appraisal progress and send reminders for pending forms
 * BR 22, BR 37(a), BR 23, BR 36(b)
 */

interface Assignment {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    primaryDepartmentId?: {
      name: string;
    };
  };
  managerProfileId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'PUBLISHED';
  dueDate?: string;
  createdAt: string;
}

interface Cycle {
  _id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  workEmail: string;
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
  supervisorId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export default function HREmployeePerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk assignment state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    cycleId: '',
    employeeProfileIds: [] as string[],
    dueDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchAssignments();
    }
  }, [selectedCycleId, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch cycles
      const cyclesRes = await performanceService.getCycles();
      const cyclesData = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
      setCycles(cyclesData);

      // Auto-select active cycle
      const activeCycle = cyclesData.find((c: Cycle) => c.status === 'ACTIVE');
      if (activeCycle) {
        setSelectedCycleId(activeCycle._id);
        setBulkFormData(prev => ({ ...prev, cycleId: activeCycle._id }));
      }

      // Fetch employees
      const employeesRes = await employeeProfileService.getAllEmployees();
      const employeesData = employeesRes.data as Employee[] | { data: Employee[] };
      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
      } else if (employeesData && 'data' in employeesData) {
        setEmployees(employeesData.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await performanceService.searchAssignments();
      const data = response.data as Assignment[] | { data: Assignment[] };

      if (Array.isArray(data)) {
        setAssignments(data);
      } else if (data && 'data' in data) {
        setAssignments(data.data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkFormData.cycleId || bulkFormData.employeeProfileIds.length === 0) {
      setError('Please select a cycle and at least one employee');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await performanceService.bulkCreateAssignments({
        cycleId: bulkFormData.cycleId,
        employeeProfileIds: bulkFormData.employeeProfileIds,
        dueDate: bulkFormData.dueDate || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Successfully assigned ${bulkFormData.employeeProfileIds.length} employees`);
      setShowBulkAssign(false);
      setBulkFormData({ cycleId: selectedCycleId, employeeProfileIds: [], dueDate: '' });
      fetchAssignments();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create assignments');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAllEmployees = () => {
    if (bulkFormData.employeeProfileIds.length === employees.length) {
      setBulkFormData(prev => ({ ...prev, employeeProfileIds: [] }));
    } else {
      setBulkFormData(prev => ({ ...prev, employeeProfileIds: employees.map(e => e._id) }));
    }
  };

  const handleToggleEmployee = (employeeId: string) => {
    setBulkFormData(prev => ({
      ...prev,
      employeeProfileIds: prev.employeeProfileIds.includes(employeeId)
        ? prev.employeeProfileIds.filter(id => id !== employeeId)
        : [...prev.employeeProfileIds, employeeId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SUBMITTED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PUBLISHED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const emp = a.employeeProfileId;
    const search = searchQuery.toLowerCase();
    return (
      emp?.firstName?.toLowerCase().includes(search) ||
      emp?.lastName?.toLowerCase().includes(search) ||
      emp?.employeeNumber?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    inProgress: assignments.filter(a => a.status === 'IN_PROGRESS').length,
    submitted: assignments.filter(a => a.status === 'SUBMITTED').length,
    published: assignments.filter(a => a.status === 'PUBLISHED').length,
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Performance Management</h1>
            <p className="text-muted-foreground mt-1">
              Assign appraisals and monitor completion progress (REQ-PP-05, REQ-AE-06)
            </p>
          </div>
          <button
            onClick={() => setShowBulkAssign(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Bulk Assign
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300' },
            { label: 'Pending', value: stats.pending, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
            { label: 'Submitted', value: stats.submitted, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
            { label: 'Published', value: stats.published, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by employee name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="">Select Cycle</option>
              {cycles.map(cycle => (
                <option key={cycle._id} value={cycle._id}>
                  {cycle.name} ({cycle.status})
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        {/* Assignments Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Appraisal Assignments</h3>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="font-medium text-foreground mb-1">No Assignments Found</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedCycleId ? 'No assignments match your filters.' : 'Select a cycle to view assignments.'}
              </p>
              {selectedCycleId && (
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Create Assignments
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Manager</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.employeeProfileId?.employeeNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.employeeProfileId?.primaryDepartmentId?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {assignment.managerProfileId
                          ? `${assignment.managerProfileId.firstName} ${assignment.managerProfileId.lastName}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {assignment.dueDate
                          ? new Date(assignment.dueDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm text-primary hover:text-primary/80 font-medium">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bulk Assign Modal */}
        {showBulkAssign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Bulk Assign Appraisals</h3>
                <button
                  onClick={() => setShowBulkAssign(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Appraisal Cycle</label>
                  <select
                    value={bulkFormData.cycleId}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, cycleId: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="">Select Cycle</option>
                    {cycles.filter(c => c.status === 'ACTIVE' || c.status === 'PLANNED').map(cycle => (
                      <option key={cycle._id} value={cycle._id}>
                        {cycle.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={bulkFormData.dueDate}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">
                      Select Employees ({bulkFormData.employeeProfileIds.length} selected)
                    </label>
                    <button
                      onClick={handleSelectAllEmployees}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      {bulkFormData.employeeProfileIds.length === employees.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                    {employees.map((employee) => (
                      <label
                        key={employee._id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={bulkFormData.employeeProfileIds.includes(employee._id)}
                          onChange={() => handleToggleEmployee(employee._id)}
                          className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employee.employeeNumber} • {employee.primaryDepartmentId?.name || 'No Department'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowBulkAssign(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={isSubmitting || !bulkFormData.cycleId || bulkFormData.employeeProfileIds.length === 0}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : `Assign ${bulkFormData.employeeProfileIds.length} Employees`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

