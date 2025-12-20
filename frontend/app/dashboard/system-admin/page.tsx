'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import {
  Building2,
  UserPlus,
  Users,
  Settings,
  Database,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SystemAdminPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const statCards = [
    {
      label: 'System Uptime',
      value: '99.9%',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'from-green-500/20 to-green-600/20',
      iconColor: 'text-green-500',
    },
    {
      label: 'Active Users',
      value: '-',
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Backup Status',
      value: 'Active',
      icon: <Database className="w-5 h-5" />,
      color: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-500',
    },
    {
      label: 'Alerts',
      value: '0',
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/20',
      iconColor: 'text-amber-500',
    },
  ];

  const quickActions = [
    {
      title: 'Organization',
      description: 'View structure',
      href: '/dashboard/system-admin/organization-structure',
      icon: <Building2 className="w-6 h-6" />,
      color: 'from-blue-500/10 to-blue-600/10',
    },
    {
      title: 'Register Employee',
      description: 'Create employee account',
      href: '/dashboard/system-admin/register-employee',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'from-emerald-500/10 to-emerald-600/10',
    },
    {
      title: 'User Management',
      description: 'Manage users',
      href: '/dashboard/system-admin/users',
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500/10 to-purple-600/10',
    },
    {
      title: 'System Config',
      description: 'System settings',
      href: '/dashboard/system-admin/config',
      icon: <Settings className="w-6 h-6" />,
      color: 'from-amber-500/10 to-amber-600/10',
    },
  ];

  const recentActivity = [
    {
      message: 'System backup completed successfully',
      time: '2 hours ago',
      type: 'success',
    },
    {
      message: 'New department created',
      time: '5 hours ago',
      type: 'info',
    },
    {
      message: 'Position updated',
      time: '1 day ago',
      type: 'info',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          Loading Dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">
            System Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            System-wide configuration and management
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/dashboard/system-admin/register-employee">
            Register Employee
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">System Overview</h2>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <GlassCard key={index} variant="hover" className="p-6 overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} blur-3xl group-hover:blur-2xl transition-all duration-500`} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-background/50 border border-border/50 shadow-sm ${stat.iconColor}`}>
                  {stat.icon}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <GlassCard variant="hover" className="p-5 cursor-pointer group text-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} mb-4 w-fit mx-auto`}>
                  <div className="text-foreground">
                    {action.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Recent System Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="text-sm text-foreground flex-1">{activity.message}</span>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

