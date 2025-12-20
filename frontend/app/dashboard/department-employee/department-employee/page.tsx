'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';

export default function DepartmentEmployeePage() {
  const { user } = useAuth();

  const quickActions = [
    { label: 'Request Leave', href: '/dashboard/department-employee/leaves' },
    { label: 'Log Time', href: '/dashboard/department-employee/time-management' },
    { label: 'View Payslip', href: '/dashboard/department-employee/payroll' },
    { label: 'My Performance', href: '/dashboard/department-employee/performance' },
  ];

  const modules = [
    {
      title: 'Employee Profile',
      description: 'View and manage your personal information, update contact details, and request corrections.',
      href: '/dashboard/department-employee/employee-profile',
      features: ['View profile', 'Update contact info', 'Request corrections', 'Upload documents'],
    },
    {
      title: 'Organization',
      description: 'View organizational structure, reporting lines, and find colleagues across departments.',
      href: '/dashboard/department-employee/organization',
      features: ['View org chart', 'See reporting lines', 'Explore departments', 'Find colleagues'],
    },
    {
      title: 'Performance',
      description: 'Access your appraisal history, view ratings and feedback, and track development goals.',
      href: '/dashboard/department-employee/performance',
      features: ['View appraisals', 'See feedback', 'Track goals', 'Raise concerns'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Employee Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.firstName || 'Employee'}</p>
          </div>
          <Link href="/shadcn-dashboard-landing-template/nextjs-version/employee-profile">
            <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              View Profile
            </button>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <div className="bg-card border border-border rounded-lg p-4 text-center hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Modules */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Employee Services</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link key={index} href={module.href}>
              <div className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{module.title}</h3>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                <ul className="space-y-1">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground/80 flex items-center gap-2">
                      <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-muted/30 border border-border rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Need Assistance?</h3>
            <p className="text-sm text-muted-foreground mt-1">Contact HR for any questions or support.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent transition-colors">
              View FAQ
            </button>
            <button className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">
              Contact HR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

