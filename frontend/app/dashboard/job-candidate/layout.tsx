'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SystemRole } from '@/app/types';

export default function JobCandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, getDashboardRoute } = useAuth();
  const router = useRouter();

  const allowedRoles = [SystemRole.JOB_CANDIDATE];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // If user is not a candidate, redirect them to their own dashboard
    if (user && user.role !== SystemRole.JOB_CANDIDATE) {
      router.replace(getDashboardRoute());
      return;
    }
    
    if (!hasAccess) {
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, hasAccess, user, router, getDashboardRoute]);

  if (!isAuthenticated || !hasAccess || user?.role !== SystemRole.JOB_CANDIDATE) {
    return null;
  }

  return <>{children}</>;
}

