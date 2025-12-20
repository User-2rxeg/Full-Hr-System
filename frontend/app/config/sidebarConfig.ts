// Role-based Sidebar Navigation Configuration
import { SystemRole } from '@/app/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarConfig {
  role: SystemRole;
  title: string;
  sections: NavSection[];
}

// =====================================================
// COMMON SELF-SERVICE SECTION (for all roles)
// =====================================================
const SELF_SERVICE_SECTION: NavSection = {
  title: 'Self-Service',
  items: [
    {
      label: 'Home',
      href: '/',
      icon: 'home',
    },
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
      label: 'My Performance',
      href: '/portal/my-performance',
      icon: 'trending-up',
    },
    {
      label: 'My Payslips',
      href: '/portal/my-payslips',
      icon: 'dollar-sign',
    },
    {
      label: 'My Benefits',
      href: '/portal/my-benefits',
      icon: 'shield',
    },
    {
      label: 'My Expenses',
      href: '/portal/my-expenses',
      icon: 'credit-card',
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
    {
      label: 'My Onboarding',
      href: '/portal/my-onboarding',
      icon: 'clipboard-check',
    },
    {
      label: 'Resignation',
      href: '/portal/my-resignation',
      icon: 'log-out',
    },

  ],
};

// =====================================================
// DEPARTMENT EMPLOYEE - Self-service access
// =====================================================
const DEPARTMENT_EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/department-employee',
        icon: 'home',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/department-employee/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/department-employee/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/department-employee/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/department-employee/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/department-employee/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/department-employee/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/department-employee/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// DEPARTMENT HEAD - Team management
// =====================================================
const DEPARTMENT_HEAD_SECTIONS: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/department-head',
        icon: 'home',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/department-head/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/department-head/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/department-head/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/department-head/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/department-head/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/department-head/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/department-head/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },

    ],
  },
  {
    title: 'Team Management',
    items: [
      {
        label: 'My Team',
        href: '/dashboard/department-head/team-profiles',
        icon: 'users',
      },
      {
        label: 'Team Structure',
        href: '/dashboard/department-head/team-structure',
        icon: 'building',
      },
      {
        label: 'Team Performance',
        href: '/dashboard/department-head/performance',
        icon: 'bar-chart',
      },
    ],
  },
  {
    title: 'Approvals',
    items: [
      {
        label: 'Leave Requests',
        href: '/dashboard/department-head',
        icon: 'calendar-check',
        children: [
          { label: 'Approvals', href: '/dashboard/department-head', icon: 'check-circle' },
          { label: 'Team Balances', href: '/dashboard/department-head/team-balances', icon: 'users' },
        ],
      },
      {
        label: 'Time Approvals',
        href: '/dashboard/department-head/time-management',
        icon: 'clock',
        children: [
          { label: 'Manage Attendance', href: '/dashboard/department-head/time-management/attendance-records', icon: 'clipboard-list' },
        ],
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR MANAGER - Full HR access
// =====================================================
const HR_MANAGER_SECTIONS: NavSection[] = [
  {
    title: 'HR Management',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-manager',
        icon: 'home',
      },
      {
        label: 'Time Management',
        href: '/dashboard/hr-manager/time-management',
        icon: 'clock',
        children: [
          { label: 'Shift Types', href: '/dashboard/hr-manager/time-management/ShiftType', icon: 'clock' },
          { label: 'Lateness', href: '/dashboard/hr-manager/time-management/Lateness', icon: 'clock' },
          { label: 'Schedule Rules', href: '/dashboard/hr-manager/time-management/schedule-rules', icon: 'calendar' },
          { label: 'Configure Rules', href: '/dashboard/hr-manager/time-management/ConfigureRules', icon: 'settings' },
        ],
      },
      {
        label: 'Recruitment',
        href: '/dashboard/hr-manager/recruitment',
        icon: 'user-plus',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/hr-manager/onboarding',
        icon: 'clipboard-check',
        children: [
          { label: 'Dashboard', href: '/dashboard/hr-manager/onboarding', icon: 'layout' },
          { label: 'Checklists', href: '/dashboard/hr-manager/onboarding/checklists', icon: 'check-square' },
          { label: 'Create Employee', href: '/dashboard/hr-manager/onboarding/employee', icon: 'user-plus' },
          { label: 'Payroll Setup', href: '/dashboard/hr-manager/onboarding/payroll', icon: 'dollar-sign' },
        ],
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-manager/performance-templates',
        icon: 'trending-up',
        children: [
          { label: 'Dashboard', href: '/dashboard/hr-manager/performance-dashboard', icon: 'layout' },
          { label: 'Templates', href: '/dashboard/hr-manager/performance-templates', icon: 'file' },
          { label: 'Cycles', href: '/dashboard/hr-manager/performance-cycles', icon: 'calendar' },
          { label: 'Disputes', href: '/dashboard/hr-manager/disputes', icon: 'alert-circle' },
        ],
      },
      {
        label: 'Leaves',
        href: '/dashboard/hr-manager/leaves',
        icon: 'calendar',
      },
      {
        label: 'Offboarding',
        href: '/dashboard/hr-manager/offboarding',
        icon: 'log-out',
      },
      {
        label: 'Insurance Brackets',
        href: '/dashboard/hr-manager/insurance-brackets',
        icon: 'shield',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/hr-manager/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/hr-manager/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/hr-manager/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/hr-manager/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/hr-manager/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/hr-manager/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/hr-manager/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
    ],
  },
  {
    title: 'Team Management',
    items: [
      {
        label: 'My Team',
        href: '/dashboard/department-head/team-profiles',
        icon: 'users',
      },
      {
        label: 'Employee Management',
        href: '/dashboard/hr-admin/employee-management',
        icon: 'users',
      },
      {
        label: 'Team Structure',
        href: '/dashboard/department-head/team-structure',
        icon: 'building',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR EMPLOYEE - HR operations
// =====================================================
const HR_EMPLOYEE_SECTIONS: NavSection[] = [
  {
    title: 'HR Operations',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-employee',
        icon: 'home',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/hr-employee/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/hr-employee/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/hr-employee/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/hr-employee/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/hr-employee/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/hr-employee/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/hr-employee/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-employee/performance',
        icon: 'trending-up',
      },
      {
        label: 'Recruitment',
        href: '/dashboard/hr-employee/recruitment/jobs',
        icon: 'user-plus',
        children: [
          { label: 'Job Publishing', href: '/dashboard/hr-employee/recruitment/jobs', icon: 'briefcase' },
          { label: 'Applications', href: '/dashboard/hr-employee/recruitment/applications', icon: 'inbox' },
          { label: 'Interviews', href: '/dashboard/hr-employee/recruitment/interviews', icon: 'calendar' },
          { label: 'Offers', href: '/dashboard/hr-employee/recruitment/offers', icon: 'file-text' },
        ],
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// HR ADMIN - Full administrative access
// =====================================================
const HR_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'HR Administration',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/hr-admin',
        icon: 'home',
      },
      {
        label: 'Employee Management',
        href: '/dashboard/hr-admin/employee-management',
        icon: 'users',
      },
      {
        label: 'Change Requests',
        href: '/dashboard/hr-admin/change-requests',
        icon: 'edit',
        badge: 'New',
      },
      {
        label: 'Time Management',
        href: '/dashboard/hr-manager/time-management',
        icon: 'clock',
        children: [
          { label: 'Manage Attendance', href: '/dashboard/hr-admin/time-management/attendance-records', icon: 'clipboard-list' },
          { label: 'TimeExceptions', href: '/dashboard/hr-admin/time-management/time-exceptions', icon: 'clipboard-list' },
          { label: 'Holidays', href: '/dashboard/hr-admin/time-management/Holidays', icon: 'clipboard-list' },
          { label: 'Shift Assignments', href: '/dashboard/hr-admin/time-management/ShiftAssignments', icon: 'clipboard-list' },

        ],
      },
      {
        label: 'Role Assignment',
        href: '/dashboard/hr-admin/role-assignment',
        icon: 'shield',
      },
      {
        label: 'Organization',
        href: '/dashboard/hr-manager/organization',
        icon: 'building',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/hr-manager/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Performance',
        href: '/dashboard/hr-manager/performance-templates',
        icon: 'trending-up',
      },
      {
        label: 'Payroll',
        href: '/dashboard/payroll-manager/overview',
        icon: 'dollar-sign',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/hr-admin/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/hr-admin/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/hr-admin/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/hr-admin/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/hr-admin/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/hr-admin/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/hr-admin/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
      {
        label: 'Leaves',
        href: '/dashboard/hr-admin/leaves-config',
        icon: 'calendar',
        children: [
          { label: 'Policies', href: '/dashboard/hr-admin/leaves-config', icon: 'settings' },
          //  {label: 'Leave Types', href: '/dashboard/hr-admin/leaves-config/leave-types', icon: 'list'},
          //{label: 'Manual Adjustments', href: '/dashboard/hr-admin/leaves-config/manual-adjustment', icon: 'edit'},
        ],
      },
      {
        label: 'Offboarding',
        href: '/dashboard/hr-manager/offboarding',
        icon: 'log-out',
      },

    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// SYSTEM ADMIN - System-wide configuration
// =====================================================
const SYSTEM_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'System Administration',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/system-admin',
        icon: 'home',
      },
      {
        label: 'Register Employee',
        href: '/dashboard/system-admin/register-employee',
        icon: 'user-plus',
      },
      {
        label: 'Onboarding',
        href: '/dashboard/system-admin/onboarding',
        icon: 'clipboard-check',
      },
      {
        label: 'Offboarding',
        href: '/dashboard/system-admin/offboarding',
        icon: 'log-out',
      },
      {
        label: 'Organization',
        href: '/dashboard/system-admin/organization-structure',
        icon: 'building',
        children: [
          { label: 'Overview', href: '/dashboard/system-admin/organization-structure', icon: 'eye' },
          { label: 'Org Chart', href: '/dashboard/system-admin/organization-structure/org-chart', icon: 'git-branch' },
          { label: 'Change Requests', href: '/dashboard/system-admin/organization-structure/change-requests', icon: 'git-pull-request' },
        ],
      },
      {
        label: 'Time Management',
        href: '/dashboard/system-admin/time-management',
        icon: 'clock',
        children: [
          { label: 'Shift Types', href: '/dashboard/system-admin/time-management/ShiftType', icon: 'clock' },
          { label: 'Shift Assignments', href: '/dashboard/system-admin/time-management/ShiftAssignments', icon: 'clipboard-list' },
          { label: 'Holidays', href: '/dashboard/system-admin/time-management/Holidays', icon: 'clipboard-list' },
        ],
      },

      {
        label: 'Company Settings',
        href: '/dashboard/system-admin/company-settings',
        icon: 'settings',
      },
      {
        label: 'Data Backup',
        href: '/dashboard/system-admin/data-backup',
        icon: 'database',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/system-admin/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/system-admin/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/system-admin/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/system-admin/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/system-admin/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/system-admin/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/system-admin/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// PAYROLL SPECIALIST - Payroll operations
// =====================================================
const PAYROLL_SPECIALIST_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/payroll-specialist',
    icon: 'home',
  },
  {
    label: 'Configuration',
    href: '/dashboard/payroll-specialist/pay-grades',
    icon: 'settings',
    children: [
      { label: 'Pay Grades', href: '/dashboard/payroll-specialist/pay-grades', icon: 'briefcase' },
      { label: 'Payroll Policies', href: '/dashboard/payroll-specialist/payroll-policies', icon: 'file-text' },
      { label: 'Pay Types', href: '/dashboard/payroll-specialist/pay-types', icon: 'credit-card' },
      { label: 'Allowances', href: '/dashboard/payroll-specialist/allowances', icon: 'dollar-sign' },
      { label: 'Signing Bonuses', href: '/dashboard/payroll-specialist/signing-bonuses', icon: 'dollar-sign' },
      { label: 'Termination Benefits', href: '/dashboard/payroll-specialist/termination-benefits', icon: 'log-out' },
      { label: 'Insurance Brackets', href: '/dashboard/payroll-specialist/insurance-brackets', icon: 'shield' },
    ],
  },
  {
    label: 'Payroll Runs',
    href: '/dashboard/payroll-specialist/runs',
    icon: 'play-circle',
    children: [
      { label: 'All Runs', href: '/dashboard/payroll-specialist/runs', icon: 'file-text' },
      { label: 'Create New Run', href: '/dashboard/payroll-specialist/runs?tab=create', icon: 'plus' },
      { label: 'Signing Bonuses', href: '/dashboard/payroll-specialist/runs?tab=bonuses', icon: 'award' },
      { label: 'Termination Benefits', href: '/dashboard/payroll-specialist/runs?tab=termination', icon: 'package' },
      { label: 'View Payslips', href: '/dashboard/payroll-specialist/runs?tab=payslips', icon: 'file' },
    ],
  },
  {
    label: 'Disputes',
    href: '/dashboard/payroll-specialist/disputes',
    icon: 'alert-circle',
  },
  {
    label: 'Expense Claims',
    href: '/dashboard/payroll-specialist/claims',
    icon: 'credit-card',
  },
  {
    label: 'Departmental Reports',
    href: '/dashboard/payroll-specialist/reports/departmental',
    icon: 'trending-up',
  },
  {
    label: 'Payroll Tracking',
    href: '/dashboard/payroll-specialist/payroll-tracking',
    icon: 'dollar-sign',
    children: [
      { label: 'My Payslips', href: '/dashboard/payroll-specialist/payroll-tracking/payslips', icon: 'file-text' },
      { label: 'Salary History', href: '/dashboard/payroll-specialist/payroll-tracking/salary-history', icon: 'trending-up' },
      { label: 'Deductions', href: '/dashboard/payroll-specialist/payroll-tracking/deductions', icon: 'credit-card' },
      { label: 'Employer Contributions', href: '/dashboard/payroll-specialist/payroll-tracking/contributions', icon: 'briefcase' },
      { label: 'Tax Documents', href: '/dashboard/payroll-specialist/payroll-tracking/tax-documents', icon: 'folder' },
      { label: 'Claims & Disputes', href: '/dashboard/payroll-specialist/payroll-tracking/claims-disputes', icon: 'alert-circle' },
    ],
  },
];

const PAYROLL_SPECIALIST_SECTIONS: NavSection[] = [
  {
    title: 'Payroll Operations',
    items: PAYROLL_SPECIALIST_NAV,
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// PAYROLL MANAGER - Payroll management
// =====================================================
const PAYROLL_MANAGER_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/payroll-manager',
    icon: 'home',
  },
  {
    label: 'Dispute Confirmation',
    href: '/dashboard/payroll-manager/disputes',
    icon: 'alert-circle',
  },
  {
    label: 'Claim Confirmation',
    href: '/dashboard/payroll-manager/claims',
    icon: 'credit-card',
  },
  {
    label: 'Payroll Overview',
    href: '/dashboard/payroll-manager/overview',
    icon: 'dollar-sign',
  },
  {
    label: 'Payroll Runs',
    href: '/dashboard/payroll-manager/runs',
    icon: 'play-circle',
    children: [
      { label: 'All Runs', href: '/dashboard/payroll-manager/runs', icon: 'file-text' },
      { label: 'Pending Approval', href: '/dashboard/payroll-manager/runs?filter=pending', icon: 'clock' },
      { label: 'Approved', href: '/dashboard/payroll-manager/runs?filter=approved', icon: 'check-circle' },
      { label: 'Frozen', href: '/dashboard/payroll-manager/runs?filter=frozen', icon: 'lock' },
    ],
  },
  {
    label: 'Configuration Approval',
    href: '/dashboard/payroll-manager/configuration-approval',
    icon: 'check-circle',
  },
  {
    label: 'Payroll Tracking',
    href: '/dashboard/payroll-manager/payroll-tracking',
    icon: 'dollar-sign',
    children: [
      { label: 'My Payslips', href: '/dashboard/payroll-manager/payroll-tracking/payslips', icon: 'file-text' },
      { label: 'Salary History', href: '/dashboard/payroll-manager/payroll-tracking/salary-history', icon: 'trending-up' },
      { label: 'Deductions', href: '/dashboard/payroll-manager/payroll-tracking/deductions', icon: 'credit-card' },
      { label: 'Employer Contributions', href: '/dashboard/payroll-manager/payroll-tracking/contributions', icon: 'briefcase' },
      { label: 'Tax Documents', href: '/dashboard/payroll-manager/payroll-tracking/tax-documents', icon: 'folder' },
      { label: 'Claims & Disputes', href: '/dashboard/payroll-manager/payroll-tracking/claims-disputes', icon: 'alert-circle' },
    ],
  },
  {
    label: 'My Profile',
    href: '/dashboard/department-employee/employee-profile',
    icon: 'user',
  },
];

const PAYROLL_MANAGER_SECTIONS: NavSection[] = [
  {
    title: 'Payroll Management',
    items: PAYROLL_MANAGER_NAV,
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// RECRUITER - Recruitment operations
// =====================================================
const RECRUITER_SECTIONS: NavSection[] = [
  {
    title: 'Recruitment',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/recruiter',
        icon: 'home',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// FINANCE STAFF - Financial operations
// =====================================================
const FINANCE_STAFF_SECTIONS: NavSection[] = [
  {
    title: 'Finance',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/finance-staff',
        icon: 'home',
      },
      {
        label: 'Payroll Summaries',
        href: '/dashboard/finance-staff/payroll-summaries',
        icon: 'file-text',
      },
      {
        label: 'Tax, Insurance & Benefits',
        href: '/dashboard/finance-staff/tax-insurance-benefits',
        icon: 'shield',
      },
      {
        label: 'Refund Generation',
        href: '/dashboard/finance-staff/refunds',
        icon: 'dollar-sign',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/finance-staff/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/finance-staff/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/finance-staff/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/finance-staff/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/finance-staff/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/finance-staff/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/finance-staff/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
      {
        label: 'Payroll Runs',
        href: '/dashboard/finance-staff/runs',
        icon: 'play-circle',
        children: [
          { label: 'All Runs', href: '/dashboard/finance-staff/runs', icon: 'file-text' },
          { label: 'Pending Approval', href: '/dashboard/finance-staff/runs?filter=pending', icon: 'clock' },
          { label: 'Generate Payslips', href: '/dashboard/finance-staff/runs?filter=approved', icon: 'file' },
        ],
      },
      {
        label: 'Notifications',
        href: '/dashboard/finance-staff/notifications',
        icon: 'bell',
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// JOB CANDIDATE - Limited access (no self-service)
// =====================================================
const JOB_CANDIDATE_SECTIONS: NavSection[] = [
  {
    title: 'Candidate Portal',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/job-candidate',
        icon: 'home',
      },
    ],
  },
];

// =====================================================
// LEGAL & POLICY ADMIN
// =====================================================
const LEGAL_POLICY_ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Legal & Policy',
    items: [
      {
        label: 'Overview',
        href: '/dashboard/legal-policy-admin',
        icon: 'home',
      },

      {
        label: 'Tax Rules',
        href: '/dashboard/legal-policy-admin/tax-rule',
        icon: 'document-text',
      },
      {
        label: 'Payroll Tracking',
        href: '/dashboard/legal-policy-admin/payroll-tracking',
        icon: 'dollar-sign',
        children: [
          { label: 'My Payslips', href: '/dashboard/legal-policy-admin/payroll-tracking/payslips', icon: 'file-text' },
          { label: 'Salary History', href: '/dashboard/legal-policy-admin/payroll-tracking/salary-history', icon: 'trending-up' },
          { label: 'Deductions', href: '/dashboard/legal-policy-admin/payroll-tracking/deductions', icon: 'credit-card' },
          { label: 'Employer Contributions', href: '/dashboard/legal-policy-admin/payroll-tracking/contributions', icon: 'briefcase' },
          { label: 'Tax Documents', href: '/dashboard/legal-policy-admin/payroll-tracking/tax-documents', icon: 'folder' },
          { label: 'Claims & Disputes', href: '/dashboard/legal-policy-admin/payroll-tracking/claims-disputes', icon: 'alert-circle' },
        ],
      },
    ],
  },
  SELF_SERVICE_SECTION,
];

// =====================================================
// SIDEBAR CONFIG MAPPING
// =====================================================
export const SIDEBAR_CONFIG: Record<SystemRole, SidebarConfig> = {
  [SystemRole.DEPARTMENT_EMPLOYEE]: {
    role: SystemRole.DEPARTMENT_EMPLOYEE,
    title: 'Employee Portal',
    sections: DEPARTMENT_EMPLOYEE_SECTIONS,
  },
  [SystemRole.DEPARTMENT_HEAD]: {
    role: SystemRole.DEPARTMENT_HEAD,
    title: 'Team Management',
    sections: DEPARTMENT_HEAD_SECTIONS,
  },
  [SystemRole.HR_MANAGER]: {
    role: SystemRole.HR_MANAGER,
    title: 'HR Management',
    sections: HR_MANAGER_SECTIONS,
  },
  [SystemRole.HR_EMPLOYEE]: {
    role: SystemRole.HR_EMPLOYEE,
    title: 'HR Operations',
    sections: HR_EMPLOYEE_SECTIONS,
  },
  [SystemRole.HR_ADMIN]: {
    role: SystemRole.HR_ADMIN,
    title: 'HR Administration',
    sections: HR_ADMIN_SECTIONS,
  },
  [SystemRole.SYSTEM_ADMIN]: {
    role: SystemRole.SYSTEM_ADMIN,
    title: 'System Administration',
    sections: SYSTEM_ADMIN_SECTIONS,
  },
  [SystemRole.PAYROLL_SPECIALIST]: {
    role: SystemRole.PAYROLL_SPECIALIST,
    title: 'Payroll Operations',
    sections: PAYROLL_SPECIALIST_SECTIONS,
  },
  [SystemRole.PAYROLL_MANAGER]: {
    role: SystemRole.PAYROLL_MANAGER,
    title: 'Payroll Management',
    sections: PAYROLL_MANAGER_SECTIONS,
  },
  [SystemRole.RECRUITER]: {
    role: SystemRole.RECRUITER,
    title: 'Recruitment',
    sections: RECRUITER_SECTIONS,
  },
  [SystemRole.FINANCE_STAFF]: {
    role: SystemRole.FINANCE_STAFF,
    title: 'Finance',
    sections: FINANCE_STAFF_SECTIONS,
  },
  [SystemRole.JOB_CANDIDATE]: {
    role: SystemRole.JOB_CANDIDATE,
    title: 'Candidate Portal',
    sections: JOB_CANDIDATE_SECTIONS,
  },
  [SystemRole.LEGAL_POLICY_ADMIN]: {
    role: SystemRole.LEGAL_POLICY_ADMIN,
    title: 'Legal & Policy',
    sections: LEGAL_POLICY_ADMIN_SECTIONS,
  },
};

// Helper function to get sidebar config for a role
export function getSidebarConfig(role: SystemRole): SidebarConfig {
  return SIDEBAR_CONFIG[role] || SIDEBAR_CONFIG[SystemRole.DEPARTMENT_EMPLOYEE];
}

// Helper function to get default dashboard route for a role
export function getDefaultDashboardRoute(role: SystemRole): string {
  const config = getSidebarConfig(role);
  const firstSection = config.sections[0];
  return firstSection?.items[0]?.href || '/dashboard';
}
