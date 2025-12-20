'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  User,
  Building2,
  ArrowRight,
  Briefcase,
} from 'lucide-react';

export default function DepartmentEmployeePage() {
  const { user } = useAuth();

  const quickActions = [
    { 
      label: 'Request Leave', 
      href: '/portal/my-leaves/request',
      icon: <Calendar className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-500',
    },
    { 
      label: 'View Attendance', 
      href: '/portal/my-attendance',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-500',
    },
    { 
      label: 'View Payslip', 
      href: '/portal/my-profile',
      icon: <FileText className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/20',
      iconColor: 'text-emerald-500',
    },
    { 
      label: 'My Performance', 
      href: '/portal/my-performance',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/20',
      iconColor: 'text-amber-500',
    },
  ];

  const modules = [
    {
      title: 'Employee Profile',
      description: 'View and manage your personal information, update contact details, and request corrections.',
      href: '/portal/my-profile',
      icon: <User className="w-6 h-6" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'Organization',
      description: 'View organizational structure, reporting lines, and find colleagues across departments.',
      href: '/portal/my-organization',
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'Performance',
      description: 'Access your appraisal history, view ratings and feedback, and track development goals.',
      href: '/portal/my-performance',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-amber-500/10 to-amber-600/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">
            Employee Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Welcome back, <span className="font-semibold text-foreground">{user?.firstName || 'Employee'}</span>
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/portal/my-profile">
            View Profile
          </Link>
        </Button>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
          <Badge variant="outline" className="text-xs">
            Quick Access
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <GlassCard variant="hover" className="p-6 text-center cursor-pointer group">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 w-fit mx-auto`}>
                  <div className={action.iconColor}>
                    {action.icon}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Modules */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">Employee Services</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {modules.map((module, index) => (
            <Link key={index} href={module.href}>
              <GlassCard variant="hover" className="p-6 cursor-pointer group h-full">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${module.color} shrink-0`}>
                    <div className="text-foreground">
                      {module.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                      {module.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {module.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">Need Assistance?</h3>
            <p className="text-sm text-muted-foreground">Contact HR for any questions or support.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl">
              View FAQ
            </Button>
            <Button className="rounded-xl">
              Contact HR
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
