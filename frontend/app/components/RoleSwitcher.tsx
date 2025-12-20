'use client';

import { useState } from 'react';
import { SystemRole } from '@/app/types';

interface RoleSwitcherProps {
  currentRole: SystemRole;
  onRoleChange: (role: SystemRole) => void;
}

const ROLE_OPTIONS = [
  { value: SystemRole.DEPARTMENT_EMPLOYEE, label: 'Department Employee', color: 'bg-slate-500' },
  { value: SystemRole.DEPARTMENT_HEAD, label: 'Department Head', color: 'bg-indigo-500' },
  { value: SystemRole.HR_EMPLOYEE, label: 'HR Employee', color: 'bg-cyan-500' },
  { value: SystemRole.HR_MANAGER, label: 'HR Manager', color: 'bg-teal-500' },
  { value: SystemRole.HR_ADMIN, label: 'HR Admin', color: 'bg-blue-500' },
  { value: SystemRole.SYSTEM_ADMIN, label: 'System Admin', color: 'bg-violet-500' },
  { value: SystemRole.PAYROLL_SPECIALIST, label: 'Payroll Specialist', color: 'bg-amber-500' },
  { value: SystemRole.PAYROLL_MANAGER, label: 'Payroll Manager', color: 'bg-orange-500' },
  { value: SystemRole.RECRUITER, label: 'Recruiter', color: 'bg-pink-500' },
  { value: SystemRole.FINANCE_STAFF, label: 'Finance Staff', color: 'bg-emerald-500' },
  { value: SystemRole.JOB_CANDIDATE, label: 'Job Candidate', color: 'bg-gray-500' },
  { value: SystemRole.LEGAL_POLICY_ADMIN, label: 'Legal & Policy Admin', color: 'bg-red-500' },
];

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentRoleOption = ROLE_OPTIONS.find(r => r.value === currentRole);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
      >
        <div className={`w-3 h-3 rounded-full ${currentRoleOption?.color || 'bg-slate-500'}`} />
        <span className="text-sm font-medium text-slate-700">
          {currentRoleOption?.label || 'Select Role'}
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-2 max-h-96 overflow-y-auto">
            <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Switch Role (Dev Mode)</p>
            {ROLE_OPTIONS.map(role => (
              <button
                key={role.value}
                onClick={() => {
                  onRoleChange(role.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  currentRole === role.value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${role.color}`} />
                <span>{role.label}</span>
                {currentRole === role.value && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

