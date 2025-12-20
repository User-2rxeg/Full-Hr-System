'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import {
  EmployeeTableRow,
  EditEmployeeModal,
  RoleAssignmentModal,
  DeactivateEmployeeModal,
  Employee,
} from '@/app/components/hr-admin';

export default function EmployeeManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [roleEmployee, setRoleEmployee] = useState<Employee | null>(null);
  const [deactivateEmployee, setDeactivateEmployee] = useState<Employee | null>(null);

  // Stats
  const [stats, setStats] = useState<Record<string, number>>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when status filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        // Pass status filter to backend (server-side filtering)
        const status = statusFilter !== 'all' ? statusFilter : undefined;

        let response;
        if (debouncedSearch) {
          // Pass status to search as well for combined filtering
          response = await employeeProfileService.searchEmployees(debouncedSearch, page, limit, status);
        } else {
          response = await employeeProfileService.getAllEmployees(page, limit, status);
        }

        if (response.error) {
          throw new Error(response.error);
        }

        // Handle response format
        const data = response.data as any;
        if (Array.isArray(data)) {
          setEmployees(data);
          setTotalCount(data.length);
        } else if (data && Array.isArray(data.data)) {
          setEmployees(data.data);
          setTotalCount(data.total || data.data.length);
        } else {
          setEmployees([]);
          setTotalCount(0);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [page, limit, debouncedSearch, statusFilter]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await employeeProfileService.getEmployeeCountByStatus();
        if (response.data) {
          setStats(response.data as Record<string, number>);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [employees]); // Refresh stats when employees change (e.g., after deactivation)

  // Handlers
  const handleEditSave = async (employeeId: string, data: any) => {
    const response = await employeeProfileService.updateEmployeeProfile(employeeId, data);
    if (response.error) throw new Error(response.error);

    setSuccess('Employee profile updated successfully');
    setTimeout(() => setSuccess(null), 3000);

    // Refresh list
    setEmployees((prev) =>
      prev.map((emp) => (emp._id === employeeId ? { ...emp, ...data } : emp))
    );
  };

  const handleRoleSave = async (employeeId: string, roles: string[]) => {
    const response = await employeeProfileService.assignRole(employeeId, { roles });
    if (response.error) throw new Error(response.error);

    setSuccess('Roles assigned successfully');
    setTimeout(() => setSuccess(null), 3000);

    setEmployees((prev) =>
      prev.map((emp) => (emp._id === employeeId ? { ...emp, roles } : emp))
    );
  };

  const handleDeactivateConfirm = async (employeeId: string, reason: string) => {
    const response = await employeeProfileService.deactivateEmployee(employeeId, { reason });
    if (response.error) throw new Error(response.error);

    setSuccess('Employee deactivated successfully');
    setTimeout(() => setSuccess(null), 3000);

    setEmployees((prev) =>
      prev.map((emp) => (emp._id === employeeId ? { ...emp, status: 'TERMINATED' } : emp))
    );
  };

  const handleViewHistory = (employee: Employee) => {
    // TODO: Implement history view
    console.log('View history for:', employee._id);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Employee Management</h1>
            </div>
            <p className="text-muted-foreground">
              Manage employee profiles, roles, and access permissions (BR 20a)
            </p>
          </div>
          <Link
            href="/dashboard/hr-admin"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Employees', value: totalCount, color: 'blue' },
            { label: 'Active', value: stats['ACTIVE'] || 0, color: 'green' },
            { label: 'On Leave', value: stats['ON_LEAVE'] || 0, color: 'amber' },
            { label: 'Probation', value: stats['PROBATION'] || 0, color: 'purple' },
            { label: 'Terminated', value: stats['TERMINATED'] || 0, color: 'red' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, employee ID, email, or national ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="PROBATION">Probation</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            Showing {employees.length} of {totalCount} employees
            {totalCount > limit && ` (Page ${page} of ${totalPages})`}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hire Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="animate-pulse flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/4"></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-foreground">No employees found</p>
                      <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <EmployeeTableRow
                      key={employee._id}
                      employee={employee}
                      onEdit={setEditEmployee}
                      onAssignRole={setRoleEmployee}
                      onDeactivate={setDeactivateEmployee}
                      onViewHistory={handleViewHistory}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail Notice */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-foreground">Audit Trail Active (BR 22)</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              All profile edits, role changes, and deactivations are logged with timestamp and user information for compliance.
            </p>
          </div>
        </div>

        {/* Modals */}
        <EditEmployeeModal
          employee={editEmployee}
          isOpen={!!editEmployee}
          onClose={() => setEditEmployee(null)}
          onSave={handleEditSave}
        />

        <RoleAssignmentModal
          employee={roleEmployee}
          isOpen={!!roleEmployee}
          onClose={() => setRoleEmployee(null)}
          onSave={handleRoleSave}
        />

        <DeactivateEmployeeModal
          employee={deactivateEmployee}
          isOpen={!!deactivateEmployee}
          onClose={() => setDeactivateEmployee(null)}
          onConfirm={handleDeactivateConfirm}
        />
      </div>
    </div>
  );
}

