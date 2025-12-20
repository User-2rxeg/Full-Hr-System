'use client';

import { useState } from 'react';
import { StatusBadge } from '@/app/components/ui/status-badge';

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  employeeNumber: string;
  workEmail: string;
  mobilePhone?: string;
  status: string;
  dateOfHire: string;
  profilePictureUrl?: string;
  nationalId?: string;
  contractType?: string;
  roles?: string[];
  primaryPositionId?: {
    _id: string;
    title: string;
  };
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
}

interface EmployeeTableRowProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  onAssignRole: (employee: Employee) => void;
  onViewHistory: (employee: Employee) => void;
}

// Status dot colors that match the StatusBadge semantic colors
const STATUS_DOT_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  INACTIVE: 'bg-gray-500',
  ON_LEAVE: 'bg-amber-500',
  SUSPENDED: 'bg-red-500',
  RETIRED: 'bg-purple-500',
  PROBATION: 'bg-blue-500',
  TERMINATED: 'bg-slate-500',
};

export default function EmployeeTableRow({ employee, onEdit, onDeactivate, onAssignRole, onViewHistory }: EmployeeTableRowProps) {
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const displayName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
  const statusDotColor = STATUS_DOT_COLORS[employee.status] || STATUS_DOT_COLORS.ACTIVE;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const isDeactivatable = !['TERMINATED', 'INACTIVE'].includes(employee.status);

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors group">
      {/* Employee Info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {employee.profilePictureUrl && !imageError ? (
              <img
                src={employee.profilePictureUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center ring-2 ring-background">
                <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${statusDotColor}`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{employee.workEmail}</p>
          </div>
        </div>
      </td>

      {/* Employee ID */}
      <td className="px-4 py-3">
        <span className="text-sm font-mono text-foreground">{employee.employeeNumber}</span>
      </td>

      {/* Position & Department */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {employee.primaryPositionId?.title || 'Unassigned'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {employee.primaryDepartmentId?.name || 'No Department'}
          </p>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge
          status={employee.status}
          label={formatStatus(employee.status)}
          showDot
        />
      </td>

      {/* Date of Hire */}
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{formatDate(employee.dateOfHire)}</span>
      </td>

      {/* Contract Type */}
      <td className="px-4 py-3">
        <span className="text-sm text-foreground">
          {employee.contractType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
        </span>
      </td>

      {/* Roles */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {employee.roles?.slice(0, 2).map((role, idx) => (
            <span key={idx} className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              {role}
            </span>
          ))}
          {employee.roles && employee.roles.length > 2 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
              +{employee.roles.length - 2}
            </span>
          )}
          {(!employee.roles || employee.roles.length === 0) && (
            <span className="text-xs text-muted-foreground">No roles</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 py-1 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => { onEdit(employee); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <button
                  onClick={() => { onAssignRole(employee); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Assign Roles
                </button>
                <button
                  onClick={() => { onViewHistory(employee); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View History
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { onDeactivate(employee); setShowActions(false); }}
                  disabled={!isDeactivatable}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${isDeactivatable
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'text-muted-foreground cursor-not-allowed'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {isDeactivatable ? 'Deactivate' : 'Already Inactive'}
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
