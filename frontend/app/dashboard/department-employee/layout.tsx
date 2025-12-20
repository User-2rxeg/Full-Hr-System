'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SystemRole } from '@/app/types';

export default function DepartmentEmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, getDashboardRoute } = useAuth();
  const router = useRouter();

  const allowedRoles = [
    SystemRole.DEPARTMENT_EMPLOYEE,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.HR_EMPLOYEE,
    SystemRole.HR_MANAGER,
    SystemRole.HR_ADMIN,
    SystemRole.SYSTEM_ADMIN,
  ];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Explicitly block candidates - redirect them to their dashboard
    if (user?.role === SystemRole.JOB_CANDIDATE) {
      router.replace('/dashboard/job-candidate');
      return;
    }
    
    if (!hasAccess) {
      router.replace(getDashboardRoute());
      return;
    }
  }, [isAuthenticated, hasAccess, user, router, getDashboardRoute]);

  if (!isAuthenticated || !hasAccess || user?.role === SystemRole.JOB_CANDIDATE) {
    return null;
  }

  return <>{children}</>;
}

