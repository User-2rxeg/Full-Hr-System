// Constants for the HR System
import { SystemRole } from '@/app/types';

export const APP_NAME = 'HR System';
export const APP_DESCRIPTION = 'German International University HR Management System';

// ============================================
// DESIGN SYSTEM - SLATE + INDIGO THEME
// ============================================

export const DESIGN_SYSTEM = {
  colors: {
    primary: '#4F46E5',           // indigo-600
    primaryLight: '#E0E7FF',      // indigo-100
    primaryDark: '#4338CA',       // indigo-700

    success: '#059669',           // emerald-600
    successLight: '#D1FAE5',      // emerald-100

    warning: '#D97706',           // amber-600
    warningLight: '#FEF3C7',      // amber-100

    danger: '#DC2626',            // red-600
    dangerLight: '#FEE2E2',       // red-100

    info: '#2563EB',              // blue-600
    infoLight: '#DBEAFE',         // blue-100

    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      600: '#475569',
      700: '#334155',
      900: '#0F172A',
    },
  },
};

export const NAV_LINKS = {
  public: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
  auth: [
    { label: 'Login', href: '/login' },
    { label: 'Register', href: '/register' },
  ],
};

export const DASHBOARD_NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'home',
  },
  {
    label: 'Employee Profile',
    href: '/dashboard/employee',
    icon: 'user',
  },
  {
    label: 'Organization',
    href: '/dashboard/organization',
    icon: 'building',
  },
  {
    label: 'Recruitment',
    href: '/dashboard/recruitment',
    icon: 'users',
  },
  {
    label: 'Onboarding',
    href: '/dashboard/onboarding',
    icon: 'clipboard-check',
  },
  {
    label: 'Time Management',
    href: '/dashboard/time-management',
    icon: 'clock',
  },
  {
    label: 'Leaves',
    href: '/dashboard/leaves',
    icon: 'calendar',
  },
  {
    label: 'Payroll',
    href: '/dashboard/payroll',
    icon: 'dollar-sign',
  },
  {
    label: 'Performance',
    href: '/dashboard/performance',
    icon: 'trending-up',
  },
  {
    label: 'Offboarding',
    href: '/dashboard/offboarding',
    icon: 'log-out',
  },
];

export const MOCK_USER = {
  id: '1',
  firstName: 'Ahmed',
  lastName: 'Hassan',
  email: 'ahmed.hassan@giu.edu.eg',
  role: SystemRole.HR_MANAGER,
  department: 'Human Resources',
  avatar: undefined,
};

export const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'success' as const,
    title: 'Leave Request Approved',
    message: 'Your annual leave request for Dec 20-25 has been approved.',
    read: false,
    createdAt: '2025-12-11T09:00:00Z',
  },
  {
    id: '2',
    type: 'info' as const,
    title: 'Payroll Processing',
    message: 'December payroll is now under review.',
    read: false,
    createdAt: '2025-12-10T14:30:00Z',
  },
  {
    id: '3',
    type: 'warning' as const,
    title: 'Performance Review Due',
    message: 'You have 3 pending performance reviews to complete.',
    read: true,
    createdAt: '2025-12-09T11:00:00Z',
  },
  {
    id: '4',
    type: 'success' as const,
    title: 'New Employee Onboarded',
    message: 'Sarah Ahmed has successfully completed onboarding.',
    read: true,
    createdAt: '2025-12-08T16:00:00Z',
  },
];

export const MOCK_DASHBOARD_STATS = {
  totalEmployees: 248,
  activeLeaves: 12,
  pendingApprovals: 8,
  openPositions: 5,
  pendingPayroll: 3,
  performanceReviews: 15,
};

// ============================================
// ROLE-BASED NAVIGATION MENUS
// ============================================

export const ROLE_NAVIGATION = {
  DEPARTMENT_EMPLOYEE: [
    { label: 'Profile', icon: 'user', route: '/dashboard/department-employee/profile' },
    { label: 'Leaves', icon: 'calendar', route: '/dashboard/department-employee/leaves' },
    { label: 'Payroll', icon: 'dollar-sign', route: '/dashboard/department-employee/payroll' },
    { label: 'Time Management', icon: 'clock', route: '/dashboard/department-employee/time-management' },
    { label: 'Performance', icon: 'star', route: '/dashboard/department-employee/performance' },
    { label: 'Disputes & Claims', icon: 'alert-circle', route: '/dashboard/department-employee/disputes-claims' },
  ],
  DEPARTMENT_HEAD: [
    { label: 'Dashboard', icon: 'home', route: '/dashboard/department-head/dashboard' },
    { label: 'Team', icon: 'users', route: '/dashboard/department-head/team' },
    { label: 'Leaves Approval', icon: 'check-circle', route: '/dashboard/department-head/leaves-approval' },
    { label: 'Performance Reviews', icon: 'trending-up', route: '/dashboard/department-head/performance-reviews' },
    { label: 'Organization', icon: 'building2', route: '/dashboard/department-head/organization' },
  ],
  HR_MANAGER: [
    { label: 'Dashboard', icon: 'home', route: '/dashboard/hr-manager/dashboard' },
    { label: 'Employee Profiles', icon: 'user', route: '/dashboard/hr-manager/employee-profiles' },
    { label: 'Recruitment', icon: 'briefcase', route: '/dashboard/hr-manager/recruitment' },
    { label: 'Onboarding', icon: 'arrow-right', route: '/dashboard/hr-manager/onboarding' },
    { label: 'Offboarding', icon: 'arrow-left', route: '/dashboard/hr-manager/offboarding' },
  ],
  PAYROLL_SPECIALIST: [
    { label: 'Configuration', icon: 'settings', route: '/dashboard/payroll-specialist/configuration' },
    { label: 'Payroll Runs', icon: 'document', route: '/dashboard/payroll-specialist/payroll-runs' },
    { label: 'Reports', icon: 'chart-bar', route: '/dashboard/payroll-specialist/reports' },
  ],
  FINANCE_STAFF: [
    { label: 'Payroll Review', icon: 'check-circle', route: '/dashboard/finance-staff/payroll-review' },
    { label: 'Disbursement', icon: 'send', route: '/dashboard/finance-staff/disbursement' },
    { label: 'Reports', icon: 'chart-bar', route: '/dashboard/finance-staff/reports' },
  ],
  SYSTEM_ADMIN: [
    { label: 'Organization', icon: 'building2', route: '/dashboard/system-admin/organization-structure' },
    { label: 'Users', icon: 'users', route: '/dashboard/system-admin/user-management' },
    { label: 'System Config', icon: 'settings', route: '/dashboard/system-admin/system-config' },
  ],
};

// ============================================
// STATUS COLOR MAPPING
// ============================================

export const STATUS_COLORS = {
  approved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'badge-approved',
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'badge-pending',
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'badge-rejected',
  },
  draft: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    badge: 'badge-draft',
  },
  active: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'badge-active',
  },
  inactive: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    badge: 'badge-inactive',
  },
};

