'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SystemRole } from '@/app/context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: SystemRole[];
  fallbackRoute?: string;
}

// Define role permissions for routes
const ROLE_PERMISSIONS: Record<string, SystemRole[]> = {
  '/dashboard/system-admin': [SystemRole.SYSTEM_ADMIN],
  '/dashboard/hr-admin': [SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  '/dashboard/hr-manager': [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  '/dashboard/hr-employee': [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  '/dashboard/payroll-manager': [SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN],
  '/dashboard/payroll-specialist': [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.SYSTEM_ADMIN],
  '/dashboard/finance-staff': [SystemRole.FINANCE_STAFF, SystemRole.SYSTEM_ADMIN],
  '/dashboard/recruiter': [SystemRole.RECRUITER, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  '/dashboard/department-head': [SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN],
  '/dashboard/legal-policy-admin': [SystemRole.LEGAL_POLICY_ADMIN, SystemRole.SYSTEM_ADMIN],
  '/dashboard/job-candidate': [SystemRole.JOB_CANDIDATE],
  '/dashboard/department-employee': [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ],
};

export default function RoleGuard({
  children,
  allowedRoles,
  fallbackRoute = '/dashboard'
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, getDashboardRoute } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Check role permissions
    let hasAccess = false;

    if (allowedRoles) {
      // Use explicitly provided roles
      hasAccess = allowedRoles.includes(user.role);
    } else {
      // Allow access to own dashboard
      hasAccess = true;
    }

    if (!hasAccess) {
      console.warn(`[RoleGuard] Access denied for role ${user?.role}`);
      router.push(getDashboardRoute());
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, router, fallbackRoute, getDashboardRoute]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export { ROLE_PERMISSIONS };

