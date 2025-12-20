'use client';

import { useState, useEffect } from 'react';
import { Employee } from './EmployeeTableRow';

interface RoleAssignmentModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeId: string, roles: string[]) => Promise<void>;
}

const AVAILABLE_ROLES = [
  { value: 'department employee', label: 'Department Employee', description: 'Basic employee access' },
  { value: 'department head', label: 'Department Head', description: 'Manage team and approvals' },
  { value: 'HR Employee', label: 'HR Employee', description: 'HR basic operations' },
  { value: 'HR Manager', label: 'HR Manager', description: 'HR management and approvals' },
  { value: 'HR Admin', label: 'HR Admin', description: 'Full HR administration' },
  { value: 'Payroll Specialist', label: 'Payroll Specialist', description: 'Payroll processing' },
  { value: 'Payroll Manager', label: 'Payroll Manager', description: 'Payroll management' },
  { value: 'Finance Staff', label: 'Finance Staff', description: 'Financial operations' },
  { value: 'Recruiter', label: 'Recruiter', description: 'Recruitment management' },
  { value: 'Legal & Policy Admin', label: 'Legal & Policy Admin', description: 'Policy management' },
  { value: 'System Admin', label: 'System Admin', description: 'Full system access' },
];

const ROLE_CATEGORIES = {
  'General': ['department employee', 'department head'],
  'Human Resources': ['HR Employee', 'HR Manager', 'HR Admin'],
  'Finance & Payroll': ['Payroll Specialist', 'Payroll Manager', 'Finance Staff'],
  'Administration': ['Recruiter', 'Legal & Policy Admin', 'System Admin'],
};

export default function RoleAssignmentModal({ employee, isOpen, onClose, onSave }: RoleAssignmentModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setSelectedRoles(employee.roles || []);
      setError(null);
    }
  }, [employee]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleToggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (selectedRoles.length === 0) {
      setError('At least one role must be assigned');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(employee._id, selectedRoles);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !employee) return null;

  const displayName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();

  const getRoleInfo = (roleValue: string) => AVAILABLE_ROLES.find((r) => r.value === roleValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Assign Roles & Permissions</h2>
                <p className="text-white/70 text-sm">{displayName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Currently Assigned */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-2">Currently Assigned</h3>
              <div className="flex flex-wrap gap-2">
                {selectedRoles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No roles assigned</span>
                ) : (
                  selectedRoles.map((role) => {
                    const info = getRoleInfo(role);
                    return (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full"
                      >
                        {info?.label || role}
                        <button
                          type="button"
                          onClick={() => handleToggleRole(role)}
                          className="hover:text-primary/70 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* Role Categories */}
            <div className="space-y-6">
              {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {roles.map((roleValue) => {
                      const roleInfo = getRoleInfo(roleValue);
                      const isSelected = selectedRoles.includes(roleValue);
                      return (
                        <label
                          key={roleValue}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRole(roleValue)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {roleInfo?.label || roleValue}
                            </p>
                            <p className="text-xs text-muted-foreground">{roleInfo?.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Access Control (BR 3j):</strong> Roles determine system access and permissions.</p>
                  <p className="mt-1"><strong>Audit Trail (BR 22):</strong> All role changes are logged with timestamp.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selectedRoles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Roles'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

