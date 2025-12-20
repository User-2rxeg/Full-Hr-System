'use client';

import Link from 'next/link';
import { GlassCard } from '@/app/components/ui/glass-card';
import { Briefcase, Users, Calendar, FileCheck, PlusCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function RecruiterPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="text-muted-foreground mt-2">Recruitment and candidate management</p>
        </div>
        <Link href="/dashboard/department-employee/employee-profile">
          <Button variant="outline">
            My Profile
          </Button>
        </Link>
      </div>

      {/* Quick Stats - These would ideally be real data fetching in the future */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Active Candidates</p>
              <p className="text-3xl font-bold text-foreground mt-2">87</p>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Open Positions</p>
              <p className="text-3xl font-bold text-foreground mt-2">12</p>
            </div>
            <div className="bg-purple-500/10 p-2 rounded-lg text-purple-600">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Scheduled Interviews</p>
              <p className="text-3xl font-bold text-foreground mt-2">14</p>
            </div>
            <div className="bg-orange-500/10 p-2 rounded-lg text-orange-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Offers Pending</p>
              <p className="text-3xl font-bold text-foreground mt-2">3</p>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-600">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/recruiter/recruitment/jobs" className="block">
            <div className="p-6 border border-border/50 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-center cursor-pointer group h-full">
              <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-foreground">Post Job</h3>
              <p className="text-sm text-muted-foreground mt-1">Create new requisition</p>
            </div>
          </Link>

          <Link href="/dashboard/recruiter/recruitment/applications" className="block">
            <div className="p-6 border border-border/50 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center cursor-pointer group h-full">
              <div className="mx-auto bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-foreground">Candidates Pipeline</h3>
              <p className="text-sm text-muted-foreground mt-1">Track and move applications</p>
            </div>
          </Link>

          <Link href="/dashboard/recruiter/recruitment/interviews" className="block">
            <div className="p-6 border border-border/50 rounded-xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-center cursor-pointer group h-full">
              <div className="mx-auto bg-orange-100 dark:bg-orange-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-foreground">Interviews</h3>
              <p className="text-sm text-muted-foreground mt-1">Schedule and feedback</p>
            </div>
          </Link>

          <Link href="/dashboard/hr-manager/recruitment/offers" className="block">
            <div className="p-6 border border-border/50 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center cursor-pointer group h-full">
              <div className="mx-auto bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-foreground">Offers</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage approvals</p>
            </div>
          </Link>

        </div>
      </GlassCard>
    </div>
  );
}
