'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { offboardingService, PendingAccessRevocation } from '@/app/services/offboarding';

export default function SystemAdminOffboardingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRevocations, setPendingRevocations] = useState<PendingAccessRevocation[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getEmployeesPendingAccessRevocation();
      setPendingRevocations(result || []);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setPendingRevocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (employeeId: string, employeeName: string) => {
    try {
      setProcessing(employeeId);
      setError(null);
      setSuccess(null);

      const result = await offboardingService.revokeSystemAccess({ employeeId });

      setSuccess(`System access revoked for ${employeeName}. ${result.details.systemRolesDisabled} role(s) disabled.`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

  const urgentCount = pendingRevocations.filter(r => r.isUrgent).length;
  const standardCount = pendingRevocations.filter(r => !r.isUrgent).length;

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
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
            <h1 className="text-2xl font-semibold text-foreground">Access Revocation</h1>
            <p className="text-muted-foreground mt-1">
              Revoke system access for terminated employees to maintain security
            </p>
          </div>
          <Link
            href="/dashboard/system-admin/onboarding"
            className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
          >
            Access Provisioning
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
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card p-5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
                <p className="text-3xl font-bold text-foreground mt-1">{pendingRevocations.length}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent</p>
                <p className="text-3xl font-bold text-destructive mt-1">{urgentCount}</p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-card p-5 rounded-lg border border-border sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Standard</p>
                <p className="text-3xl font-bold text-foreground mt-1">{standardCount}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-medium text-destructive">Security Compliance Required</h3>
              <p className="text-sm text-destructive/80 mt-1">
                Access must be revoked immediately upon termination approval. Urgent items indicate termination date has passed or approval is older than 3 days.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Revocations List */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Pending Access Revocations</h2>
          </div>

          <div className="divide-y divide-border">
            {pendingRevocations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">All Clear</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No pending access revocations. All terminated employees have had their access revoked.
                </p>
              </div>
            ) : (
              pendingRevocations.map((item) => (
                <div key={item.employeeId} className="px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.isUrgent
                          ? 'bg-destructive/10'
                          : 'bg-amber-500/10'
                        }`}>
                        {item.isUrgent ? (
                          <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-foreground">{item.employeeName}</h3>
                          <span className="text-xs text-muted-foreground">{item.employeeNumber}</span>
                          {item.isUrgent && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
                              URGENT
                            </span>
                          )}
                        </div>
                        {item.workEmail && (
                          <p className="text-sm text-muted-foreground mt-0.5">{item.workEmail}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {item.terminationReason.length > 60 ? item.terminationReason.slice(0, 60) + '...' : item.terminationReason}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {item.terminationDate && (
                            <span>
                              Last Day: {new Date(item.terminationDate).toLocaleDateString()}
                              {new Date(item.terminationDate) <= new Date() && (
                                <span className="text-destructive ml-1">(PASSED)</span>
                              )}
                            </span>
                          )}
                          <span>Approved {item.daysSinceApproval} day(s) ago</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(item.employeeId, item.employeeName)}
                      disabled={processing === item.employeeId}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors flex-shrink-0 ${item.isUrgent
                          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        } disabled:opacity-50`}
                    >
                      {processing === item.employeeId ? 'Revoking...' : 'Revoke Access'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Access Types */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Access Types Revoked</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'SSO', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { name: 'Internal Systems', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { name: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((item) => (
              <div key={item.name} className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-destructive mt-1">Disabled on revoke</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

