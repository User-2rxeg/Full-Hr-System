'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, PendingProvisioning } from '@/app/services/onboarding';

export default function SystemAdminOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingProvisioning, setPendingProvisioning] = useState<PendingProvisioning[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getEmployeesPendingProvisioning();
      // Ensure result is always an array
      const data = Array.isArray(result) ? result : ((result as any)?.data || []);
      setPendingProvisioning(data);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setPendingProvisioning([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionAccess = async (item: PendingProvisioning) => {
    try {
      setProcessing(item.employeeId);
      setError(null);
      setSuccess(null);

      await onboardingService.provisionSystemAccess({
        employeeId: item.employeeId,
      });

      setSuccess(`System access provisioned successfully for ${item.employeeName}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleScheduleRevocation = async (item: PendingProvisioning) => {
    const revocationDate = prompt('Enter scheduled revocation date (YYYY-MM-DD):');
    if (!revocationDate) return;

    try {
      setProcessing(item.employeeId);
      setError(null);

      await onboardingService.scheduleAccessRevocation({
        employeeId: item.employeeId,
        revocationDate,
      });

      setSuccess(`Access revocation scheduled for ${item.employeeName} on ${revocationDate}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to schedule revocation');
    } finally {
      setProcessing(null);
    }
  };

  const urgentCount = Array.isArray(pendingProvisioning) ? pendingProvisioning.filter(p => p.isUrgent).length : 0;
  const standardCount = Array.isArray(pendingProvisioning) ? pendingProvisioning.filter(p => !p.isUrgent).length : 0;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-card rounded-lg border border-border"></div>
              <div className="h-24 bg-card rounded-lg border border-border"></div>
              <div className="h-24 bg-card rounded-lg border border-border"></div>
            </div>
            <div className="h-96 bg-card rounded-lg border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Access Provisioning</h1>
            <p className="text-muted-foreground mt-1">
              Provision system access for new hires (email, SSO, internal systems)
            </p>
          </div>
          <Link
            href="/dashboard/system-admin/offboarding"
            className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
          >
            Access Revocation
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-3xl font-bold text-foreground mt-1">{pendingProvisioning.length}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent (Starting Soon)</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{urgentCount}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Standard</p>
                <p className="text-3xl font-bold text-foreground mt-1">{standardCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300">Access Provisioning Process</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                When you provision access, the following will be set up: Email account, SSO/Single Sign-On,
                Internal systems access, and Payroll system access. IT tasks in the onboarding checklist will be
                automatically marked as completed.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Provisioning List */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">New Hires Pending Access Provisioning</h2>
          </div>

          <div className="divide-y divide-border">
            {pendingProvisioning.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">All Caught Up</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No new hires pending access provisioning.
                </p>
              </div>
            ) : (
              pendingProvisioning.map((item) => (
                <div key={item.employeeId} className="px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.isUrgent
                          ? 'bg-amber-100 dark:bg-amber-900/20'
                          : 'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        {item.isUrgent ? (
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-foreground">{item.employeeName}</h3>
                          <span className="text-xs text-muted-foreground">{item.employeeNumber}</span>
                          {item.isUrgent && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              URGENT
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {item.department && <span>{item.department}</span>}
                          {item.position && <span>{item.position}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {item.startDate && (
                            <span>
                              Start: {new Date(item.startDate).toLocaleDateString()}
                              {item.daysUntilStart <= 0 ? (
                                <span className="text-amber-600 ml-1">(TODAY or PASSED)</span>
                              ) : item.daysUntilStart <= 3 ? (
                                <span className="text-amber-600 ml-1">({item.daysUntilStart} day(s))</span>
                              ) : (
                                <span className="ml-1">({item.daysUntilStart} days)</span>
                              )}
                            </span>
                          )}
                          <span>
                            IT Tasks: {item.itTasksStatus.completed}/{item.itTasksStatus.total}
                          </span>
                        </div>
                        {item.itTasksStatus.pending.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Pending: {item.itTasksStatus.pending.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 lg:flex-shrink-0">
                      <button
                        onClick={() => handleProvisionAccess(item)}
                        disabled={processing === item.employeeId}
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {processing === item.employeeId ? 'Provisioning...' : 'Provision Access'}
                      </button>
                      <button
                        onClick={() => handleScheduleRevocation(item)}
                        disabled={processing === item.employeeId}
                        className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        Schedule Revocation
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Access Types */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Access Types Provisioned</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'blue' },
              { name: 'SSO', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'green' },
              { name: 'Internal Systems', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', color: 'purple' },
              { name: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'amber' },
            ].map((item) => (
              <div key={item.name} className={`p-4 bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-lg text-center`}>
                <div className={`w-10 h-10 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <svg className={`w-5 h-5 text-${item.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                <p className={`text-xs text-${item.color}-600 mt-1`}>Auto-provisioned</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

