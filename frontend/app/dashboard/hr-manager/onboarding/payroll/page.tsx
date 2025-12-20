'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding } from '@/app/services/onboarding';

export default function PayrollSetupListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      // Filter to only show incomplete onboardings (pending payroll setup)
      setOnboardings(Array.isArray(result) ? result.filter(o => !o.completed) : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr-manager/onboarding"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Payroll Setup</h1>
            <p className="text-muted-foreground mt-1">
              Initiate payroll and process signing bonuses for new employees (ONB-018, ONB-019)
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-foreground">
              <p className="font-medium text-primary">Payroll Initiation Process</p>
              <p className="mt-1 opacity-90">
                Select an onboarding record to initiate payroll setup for the new employee. This includes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 opacity-90">
                <li>Creating payroll records based on contract salary</li>
                <li>Processing signing bonuses if applicable</li>
                <li>Setting up compensation details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Onboardings List */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium text-foreground">Active Onboardings</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {onboardings.length} onboarding(s) pending payroll setup
            </p>
          </div>

          {onboardings.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-muted-foreground">No active onboardings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                All onboardings have been completed or there are no new employees to process
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {onboardings.map((onboarding) => {
                const employeeId = typeof onboarding.employeeId === 'object'
                  ? (onboarding.employeeId as any)?._id
                  : onboarding.employeeId;
                const employeeName = typeof onboarding.employeeId === 'object'
                  ? `${(onboarding.employeeId as any)?.firstName || ''} ${(onboarding.employeeId as any)?.lastName || ''}`.trim()
                  : 'Employee';
                const completedTasks = onboarding.tasks?.filter(t =>
                  t.status?.toLowerCase() === 'completed'
                ).length || 0;
                const totalTasks = onboarding.tasks?.length || 0;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <Link
                    key={onboarding._id}
                    href={`/dashboard/hr-manager/onboarding/payroll/${onboarding._id}`}
                    className="block p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">{employeeName || 'New Employee'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Onboarding ID: {onboarding._id}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Tasks: {completedTasks}/{totalTasks} completed
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

