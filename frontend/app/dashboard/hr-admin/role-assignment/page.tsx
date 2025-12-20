'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import { RoleAssignmentModal, Employee } from '@/app/components/hr-admin';

const ROLE_INFO = [
  { value: 'department employee', label: 'Department Employee', color: 'bg-muted-foreground', description: 'Basic employee access', count: 0 },
  { value: 'department head', label: 'Department Head', color: 'bg-blue-500', description: 'Team management', count: 0 },
  { value: 'HR Employee', label: 'HR Employee', color: 'bg-green-500', description: 'HR operations', count: 0 },
  { value: 'HR Manager', label: 'HR Manager', color: 'bg-emerald-500', description: 'HR management', count: 0 },
  { value: 'HR Admin', label: 'HR Admin', color: 'bg-teal-500', description: 'Full HR access', count: 0 },
  { value: 'Payroll Specialist', label: 'Payroll Specialist', color: 'bg-amber-500', description: 'Payroll processing', count: 0 },
  { value: 'Payroll Manager', label: 'Payroll Manager', color: 'bg-orange-500', description: 'Payroll management', count: 0 },
  { value: 'Finance Staff', label: 'Finance Staff', color: 'bg-yellow-500', description: 'Financial operations', count: 0 },
  { value: 'Recruiter', label: 'Recruiter', color: 'bg-purple-500', description: 'Recruitment', count: 0 },
  { value: 'Legal & Policy Admin', label: 'Legal & Policy Admin', color: 'bg-pink-500', description: 'Policy management', count: 0 },
  { value: 'System Admin', label: 'System Admin', color: 'bg-destructive', description: 'Full system access', count: 0 },
];

export default function RoleAssignmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [roleStats, setRoleStats] = useState<typeof ROLE_INFO>([...ROLE_INFO]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await employeeProfileService.getAllEmployees(1, 100);

        if (response.error) throw new Error(response.error);

        const data = response.data as any;
        const empList = Array.isArray(data) ? data : data?.data || [];
        setEmployees(empList);

        // Calculate role stats
        const stats = [...ROLE_INFO];
        empList.forEach((emp: Employee) => {
          emp.roles?.forEach((role) => {
            const stat = stats.find((s) => s.value === role);
            if (stat) stat.count++;
          });
        });
        setRoleStats(stats);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = !searchQuery ||
      emp.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.workEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = !selectedRole || emp.roles?.includes(selectedRole);

    return matchesSearch && matchesRole;
  });

  // Handle role save
  const handleRoleSave = async (employeeId: string, roles: string[]) => {
    const response = await employeeProfileService.assignRole(employeeId, { roles });
    if (response.error) throw new Error(response.error);

    setSuccess('Roles updated successfully');
    setTimeout(() => setSuccess(null), 3000);

    // Update local state
    setEmployees((prev) =>
      prev.map((emp) => (emp._id === employeeId ? { ...emp, roles } : emp))
    );

    // Recalculate stats
    const updatedEmployees = employees.map((emp) =>
      emp._id === employeeId ? { ...emp, roles } : emp
    );
    const stats = [...ROLE_INFO];
    updatedEmployees.forEach((emp) => {
      emp.roles?.forEach((role) => {
        const stat = stats.find((s) => s.value === role);
        if (stat) stat.count++;
      });
    });
    setRoleStats(stats);
  };

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Role Assignment</h1>
            </div>
            <p className="text-muted-foreground">
              Assign roles and access permissions to employees (US-E7-05)
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

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Role Statistics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Role Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <button
              onClick={() => setSelectedRole(null)}
              className={`p-3 rounded-lg border text-left transition-all ${!selectedRole
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/30 border-border hover:border-primary/50'
                }`}
            >
              <p className="text-2xl font-bold text-foreground">{employees.length}</p>
              <p className="text-xs text-muted-foreground">All Employees</p>
            </button>
            {roleStats.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(selectedRole === role.value ? null : role.value)}
                className={`p-3 rounded-lg border text-left transition-all ${selectedRole === role.value
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/30 border-border hover:border-primary/50'
                  }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${role.color}`} />
                  <p className="text-xl font-bold text-foreground">{role.count}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate" title={role.label}>{role.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search employees by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedRole ? `Showing employees with "${selectedRole}" role` : 'Showing all employees'} • {filteredEmployees.length} result{filteredEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Employee List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Employees Found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => {
              const displayName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
              const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();

              return (
                <div
                  key={employee._id}
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
                      <p className="text-sm text-muted-foreground truncate">{employee.employeeNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.primaryPositionId?.title || 'No Position'}
                      </p>
                    </div>
                  </div>

                  {/* Current Roles */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Current Roles</p>
                    <div className="flex flex-wrap gap-1">
                      {employee.roles && employee.roles.length > 0 ? (
                        employee.roles.map((role) => {
                          const roleInfo = roleStats.find((r) => r.value === role);
                          return (
                            <span
                              key={role}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${roleInfo?.color || 'bg-gray-400'}`} />
                              {roleInfo?.label || role}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No roles assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedEmployee(employee)}
                    className="w-full px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Manage Roles
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Access Control Notice */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-foreground">Access Control (BR 3j, BR 20a)</h4>
            <p className="text-sm text-muted-foreground mt-0.5">
              Roles determine system access permissions. Only authorized roles can create or modify employee data.
              Employee status controls overall system access - terminated or suspended employees are blocked.
            </p>
          </div>
        </div>

        {/* Role Assignment Modal */}
        <RoleAssignmentModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onSave={handleRoleSave}
        />
      </div>
    </div>
  );
}

