'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';

// Map system roles to URL-safe dashboard paths
const ROLE_TO_PATH: Record<string, string> = {
  'department employee': 'department-employee',
  'department head': 'department-head',
  'HR Manager': 'hr-manager',
  'HR Employee': 'hr-employee',
  'Payroll Specialist': 'payroll-specialist',
  'Payroll Manager': 'payroll-manager',
  'System Admin': 'system-admin',
  'Legal & Policy Admin': 'legal-policy-admin',
  'Recruiter': 'recruiter',
  'Finance Staff': 'finance-staff',
  'Job Candidate': 'job-candidate',
  'HR Admin': 'hr-admin',
};

export default function DashboardPage() {
  const { user, getDashboardRoute, isLoading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // Redirect to role-specific dashboard using AuthContext's getDashboardRoute
    if (user?.role) {
      setIsRedirecting(true);
      const dashboardRoute = getDashboardRoute();
      // Add a small delay before redirecting to show loading state
      setTimeout(() => {
        router.push(dashboardRoute);
      }, 300);
    }
  }, [user?.role, isLoading, router, getDashboardRoute]);

  // Show loading state while checking authentication or redirecting
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {isRedirecting ? 'Redirecting to dashboard...' : 'Loading...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRedirecting ? 'Please wait' : 'Please wait while we verify your session'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

