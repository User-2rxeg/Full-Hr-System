'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SystemRole } from '@/types';

interface PortalLayoutProps {
  children: ReactNode;
}

interface NavItemType {
  label: string;
  href: string;
  icon: string;
  roles?: SystemRole[];
  children?: { label: string; href: string; icon: string }[];
}

const PORTAL_NAV_ITEMS: NavItemType[] = [
  {
    label: 'My Profile',
    href: '/portal/my-profile',
    icon: 'user',
    children: [
      { label: 'View Profile', href: '/portal/my-profile', icon: 'user' },
      { label: 'Edit Profile', href: '/portal/my-profile/edit', icon: 'edit' },
      { label: 'Correction Requests', href: '/portal/my-profile/correction-requests', icon: 'file-text' },
    ],
  },
  {
    label: 'My Schedule',
    href: '/portal/my-schedule',
    icon: 'calendar',
  },
  {
    label: 'My Attendance',
    href: '/portal/my-attendance',
    icon: 'clock',
    children: [
      { label: 'Attendance Records', href: '/portal/my-attendance', icon: 'clock' },
      { label: 'Corrections', href: '/portal/my-attendance/corrections', icon: 'edit-3' },
    ],
  },
  {
    label: 'My Leaves',
    href: '/portal/my-leaves',
    icon: 'briefcase',
    children: [
      { label: 'Leave Balance', href: '/portal/my-leaves', icon: 'briefcase' },
      { label: 'Request Leave', href: '/portal/my-leaves/request', icon: 'plus-circle' },
    ],
  },
    {
        label: 'Payroll Tracking',
        href: '/portal/payroll-tracking',
        icon: 'dollar',
        children: [
            { label: 'My Payslips', href: '/portal/payroll-tracking/payslips', icon: 'file-text' },
            { label: 'Salary History', href: '/portal/payroll-tracking/salary-history', icon: 'trending-up' },
            { label: 'Deductions', href: '/portal/payroll-tracking/deductions', icon: 'credit-card' },
            { label: 'Employer Contributions', href: '/portal/payroll-tracking/contributions', icon: 'briefcase' },
            { label: 'Tax Documents', href: '/portal/payroll-tracking/tax-documents', icon: 'folder' },
            { label: 'Claims & Disputes', href: '/portal/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
    },
  {
    label: 'My Performance',
    href: '/portal/my-performance',
    icon: 'trending-up',
  },
  {
    label: 'Organization',
    href: '/portal/my-organization',
    icon: 'building',
  },
  {
    label: 'Notifications',
    href: '/portal/my-notifications',
    icon: 'bell',
  },
  // {
  //   label: 'My Onboarding',
  //   href: '/portal/my-onboarding',
  //   icon: 'clipboard',
  //   children: [
  //     { label: 'Tracker', href: '/portal/my-onboarding', icon: 'clipboard' },
  //     { label: 'Upload Documents', href: '/portal/candidate/document-upload', icon: 'upload' },
  //   ],
  // },
  {
    label: 'Resignation',
    href: '/portal/my-resignation',
    icon: 'log-out',
  },
  {
    label: 'My Termination',
    href: '/portal/my-termination',
    icon: 'log-out',
  },

];

function NavIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = className || 'w-5 h-5';

  const icons: Record<string, React.ReactNode> = {
    user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
    edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
    'file-text': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    'edit-3': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
    'plus-circle': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    'trending-up': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
    dollar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    'credit-card': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
    'log-out': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    folder: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
    'alert-circle': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    'chevron-down': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
    'chevron-right': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
  };

  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name] || <circle cx="12" cy="12" r="10" strokeWidth={2} />}
    </svg>
  );
}

interface NavItemProps {
  item: NavItemType;
  isActive: (href: string) => boolean;
  pathname: string;
}

function NavItem({ item, isActive, pathname }: NavItemProps) {
  const [expanded, setExpanded] = useState(isActive(item.href));
  const hasChildren = item.children && item.children.length > 0;
  const active = isActive(item.href);

  // Don't render if href is empty
  if (!item.href) return null;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`flex-1 flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
        >
          <NavIcon name={item.icon} className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
          <span>{item.label}</span>
        </Link>
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            <NavIcon
              name={expanded ? 'chevron-down' : 'chevron-right'}
              className="w-4 h-4"
            />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
          {item.children?.filter(child => child.href).map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${childActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
              >
                <NavIcon name={child.icon} className={`w-4 h-4 ${childActive ? 'text-primary' : ''}`} />
                <span>{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Block candidates from accessing employee portal
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Candidates should not access employee portal - redirect to their dashboard
    if (user.role === SystemRole.JOB_CANDIDATE) {
      router.push('/dashboard/job-candidate');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Block rendering if not authenticated or is candidate
  if (!isAuthenticated || !user || user.role === SystemRole.JOB_CANDIDATE) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/portal/my-profile') {
      return pathname === href || pathname.startsWith(href + '/');
    }
    return pathname.startsWith(href);
  };

  const getRoleDashboardUrl = () => {
    const defaultDashboard = '/dashboard/department-employee';
    if (!user?.role) return defaultDashboard;

    const roleMap: Record<string, string> = {
      'department employee': '/dashboard/department-employee',
      'department head': '/dashboard/department-head',
      'HR Manager': '/dashboard/hr-manager',
      'HR Employee': '/dashboard/hr-employee',
      'HR Admin': '/dashboard/hr-admin',
      'System Admin': '/dashboard/system-admin',
      'Payroll Specialist': '/dashboard/payroll-specialist',
      'Payroll Manager': '/dashboard/payroll-manager',
      'Recruiter': '/dashboard/recruiter',
      'Finance Staff': '/dashboard/finance-staff',
      'Job Candidate': '/dashboard/job-candidate',
      'Legal & Policy Admin': '/dashboard/legal-policy-admin',
    };
    return roleMap[user.role] || defaultDashboard;
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '??';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <Link href="/" className="flex items-center gap-3" title="Go to Home">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-sm">HR</span>
            </div>
            <div>
              <span className="font-bold text-foreground">Employee Portal</span>
              <p className="text-xs text-muted-foreground">Self-Service</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          >
            <NavIcon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center ring-2 ring-background shadow-md">
              <span className="text-primary-foreground font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role || 'Employee'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {/* Go to Home */}
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors mb-2"
            >
              <NavIcon name="home" className="w-5 h-5" />
              <span>Go to Home</span>
            </Link>
            {/* Back to Dashboard */}
            <Link
              href={getRoleDashboardUrl() || '/dashboard/department-employee'}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors mb-4"
            >
              <NavIcon name="layout-dashboard" className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="pb-2">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Self Service
              </p>
            </div>

            {PORTAL_NAV_ITEMS
              .filter(item => item.href)
              .filter(item => !item.roles || (user && item.roles.includes(user.role as SystemRole)))
              .map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  pathname={pathname}
                />
              ))}
          </div>
        </nav>

        {/* Footer - Logout */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors w-full"
          >
            <NavIcon name="log-out" className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <NavIcon name="menu" className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">HR</span>
            </div>
            <span className="font-semibold text-foreground">Portal</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-semibold">{initials}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

