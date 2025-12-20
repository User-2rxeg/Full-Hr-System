'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, SystemRole } from '@/app/context/AuthContext';

// =====================================================
// Types
// =====================================================

/**
 * Recruitment-specific roles for access control
 */
export type RecruitmentRole = 
  | 'HR_MANAGER' 
  | 'HR_EMPLOYEE' 
  | 'RECRUITER'
  | 'CANDIDATE'
  | 'SYSTEM_ADMIN';

interface RoleGuardProps {
  /**
   * Roles that are allowed to access the content
   */
  allowedRoles: RecruitmentRole[];
  /**
   * Content to render if user has access
   */
  children: ReactNode;
  /**
   * Optional fallback UI when access is denied
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;
  /**
   * Show "Access Denied" message instead of hiding content
   * @default false
   */
  showDenied?: boolean;
  /**
   * Redirect to a specific route when access is denied
   * If set, user will be redirected instead of showing fallback
   */
  redirectTo?: string;
  /**
   * Custom access denied title
   */
  deniedTitle?: string;
  /**
   * Custom access denied message
   */
  deniedMessage?: string;
}

// =====================================================
// Role Mapping
// =====================================================

/**
 * Map recruitment roles to system roles
 */
const RECRUITMENT_TO_SYSTEM_ROLE: Record<RecruitmentRole, SystemRole[]> = {
  HR_MANAGER: [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  HR_EMPLOYEE: [SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  RECRUITER: [SystemRole.RECRUITER, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN],
  CANDIDATE: [SystemRole.JOB_CANDIDATE],
  SYSTEM_ADMIN: [SystemRole.SYSTEM_ADMIN],
};

// =====================================================
// Access Denied Component (Enhanced)
// =====================================================

interface AccessDeniedComponentProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showDashboardButton?: boolean;
  onBack?: () => void;
  onDashboard?: () => void;
}

function AccessDeniedComponent({
  title = 'Access Denied',
  message = "You don't have permission to view this content. Please contact your administrator if you believe this is an error.",
  showBackButton = true,
  showDashboardButton = true,
  onBack,
  onDashboard,
}: AccessDeniedComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
        {message}
      </p>
      
      {/* Action Buttons */}
      {(showBackButton || showDashboardButton) && (
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </button>
          )}
          {showDashboardButton && onDashboard && (
            <button
              onClick={onDashboard}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      )}
      
      <p className="text-xs text-slate-400 mt-6">
        If you need access, please contact your system administrator.
      </p>
    </div>
  );
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if a system role matches any of the allowed recruitment roles
 */
function hasAccess(userRole: SystemRole | undefined, allowedRoles: RecruitmentRole[]): boolean {
  if (!userRole) return false;

  // Check if user's system role is allowed for any of the recruitment roles
  return allowedRoles.some((recruitmentRole) => {
    const systemRoles = RECRUITMENT_TO_SYSTEM_ROLE[recruitmentRole];
    return systemRoles.includes(userRole);
  });
}

/**
 * Get the user's recruitment role from their system role
 */
export function getRecruitmentRole(systemRole: SystemRole | undefined): RecruitmentRole | null {
  if (!systemRole) return null;

  if (systemRole === SystemRole.SYSTEM_ADMIN) return 'SYSTEM_ADMIN';
  if (systemRole === SystemRole.HR_ADMIN || systemRole === SystemRole.HR_MANAGER) return 'HR_MANAGER';
  if (systemRole === SystemRole.HR_EMPLOYEE) return 'HR_EMPLOYEE';
  if (systemRole === SystemRole.RECRUITER) return 'RECRUITER';
  if (systemRole === SystemRole.JOB_CANDIDATE) return 'CANDIDATE';

  return null;
}

// =====================================================
// Main RoleGuard Component
// =====================================================

/**
 * Role-based access control component for recruitment features.
 * 
 * Usage:
 * ```tsx
 * <RoleGuard allowedRoles={['HR_MANAGER', 'HR_EMPLOYEE']}>
 *   <SensitiveContent />
 * </RoleGuard>
 * 
 * // With fallback
 * <RoleGuard 
 *   allowedRoles={['HR_MANAGER']} 
 *   fallback={<ViewOnlyContent />}
 * >
 *   <EditableContent />
 * </RoleGuard>
 * 
 * // Show access denied message
 * <RoleGuard allowedRoles={['HR_MANAGER']} showDenied>
 *   <AdminOnlyContent />
 * </RoleGuard>
 * 
 * // Redirect on access denied
 * <RoleGuard allowedRoles={['HR_MANAGER']} redirectTo="/dashboard">
 *   <AdminOnlyContent />
 * </RoleGuard>
 * ```
 */
export default function RecruitmentRoleGuard({
  allowedRoles,
  children,
  fallback,
  showDenied = false,
  redirectTo,
  deniedTitle,
  deniedMessage,
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, getDashboardRoute } = useAuth();
  const router = useRouter();

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    if (showDenied) {
      return (
        <AccessDeniedComponent 
          title={deniedTitle}
          message={deniedMessage || 'Please log in to access this content.'}
          showBackButton={true}
          showDashboardButton={false}
          onBack={() => router.back()}
        />
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  // Check access
  const userHasAccess = hasAccess(user.role, allowedRoles);

  if (!userHasAccess) {
    if (redirectTo) {
      router.push(redirectTo);
      return null;
    }
    if (showDenied) {
      return (
        <AccessDeniedComponent 
          title={deniedTitle}
          message={deniedMessage}
          showBackButton={true}
          showDashboardButton={true}
          onBack={() => router.back()}
          onDashboard={() => router.push(getDashboardRoute())}
        />
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  // User has access, render children
  return <>{children}</>;
}

// =====================================================
// Utility Components
// =====================================================

/**
 * Show content only to HR roles (Manager + Employee)
 */
export function HROnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RecruitmentRoleGuard allowedRoles={['HR_MANAGER', 'HR_EMPLOYEE']} fallback={fallback}>
      {children}
    </RecruitmentRoleGuard>
  );
}

/**
 * Show content only to HR Manager
 */
export function HRManagerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RecruitmentRoleGuard allowedRoles={['HR_MANAGER']} fallback={fallback}>
      {children}
    </RecruitmentRoleGuard>
  );
}

/**
 * Show content only to Recruiters (includes HR roles)
 */
export function RecruiterOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RecruitmentRoleGuard allowedRoles={['RECRUITER', 'HR_EMPLOYEE', 'HR_MANAGER']} fallback={fallback}>
      {children}
    </RecruitmentRoleGuard>
  );
}

/**
 * Show content only to Candidates
 */
export function CandidateOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RecruitmentRoleGuard allowedRoles={['CANDIDATE']} fallback={fallback}>
      {children}
    </RecruitmentRoleGuard>
  );
}

/**
 * Hide content from candidates (show to all internal roles)
 */
export function InternalOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RecruitmentRoleGuard 
      allowedRoles={['HR_MANAGER', 'HR_EMPLOYEE', 'RECRUITER', 'SYSTEM_ADMIN']} 
      fallback={fallback}
    >
      {children}
    </RecruitmentRoleGuard>
  );
}

// =====================================================
// Hook for Role Checks
// =====================================================

/**
 * Hook to check role-based permissions in recruitment context
 */
export function useRecruitmentRole() {
  const { user, isAuthenticated } = useAuth();

  const recruitmentRole = getRecruitmentRole(user?.role);

  const can = {
    // Job Management
    createJob: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    editJob: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    publishJob: ['HR_EMPLOYEE', 'HR_MANAGER'].includes(recruitmentRole || ''),
    deleteJob: recruitmentRole === 'HR_MANAGER',
    
    // Applications
    viewAllApplications: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    viewOwnApplications: recruitmentRole === 'CANDIDATE',
    updateApplicationStage: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    
    // Interviews
    scheduleInterview: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    submitFeedback: ['HR_EMPLOYEE', 'RECRUITER', 'HR_MANAGER'].includes(recruitmentRole || ''),
    
    // Offers
    createOffer: ['HR_EMPLOYEE', 'HR_MANAGER'].includes(recruitmentRole || ''),
    approveOffer: recruitmentRole === 'HR_MANAGER',
    respondToOffer: recruitmentRole === 'CANDIDATE',
    
    // Analytics
    viewAnalytics: recruitmentRole === 'HR_MANAGER',
    
    // Admin
    configureSettings: recruitmentRole === 'SYSTEM_ADMIN',
  };

  return {
    role: recruitmentRole,
    systemRole: user?.role,
    isAuthenticated,
    can,
    hasRole: (roles: RecruitmentRole[]) => roles.includes(recruitmentRole || '' as RecruitmentRole),
  };
}
