'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { offboardingService, TerminationRequest, TerminationStatus } from '@/app/services/offboarding';

type TabType = 'provisioning' | 'revocation';

const ACCESS_TYPES = [
  { id: 'email', name: 'Email', description: 'Corporate email account' },
  { id: 'sso', name: 'SSO', description: 'Single Sign-On access' },
  { id: 'internal_systems', name: 'Internal Systems', description: 'HR, Time Management, etc.' },
  { id: 'payroll', name: 'Payroll', description: 'Payroll system access' },
];

export default function AccessManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('provisioning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'provisioning') {
        const result = await onboardingService.getAllOnboardings();
        const pending = Array.isArray(result)
          ? result.filter(o => !o.completed && hasITPendingTasks(o))
          : [];
        setOnboardings(pending);
      } else {
        const result = await offboardingService.getAllTerminationRequests();
        const approved = Array.isArray(result)
          ? result.filter(r => r.status === TerminationStatus.APPROVED)
          : [];
        setTerminations(approved);
      }
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  };

  const hasITPendingTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.some(t =>
      t.department === 'IT' && t.status !== OnboardingTaskStatus.COMPLETED
    ) || false;
  };

  const handleProvisionAccess = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.provisionSystemAccess({ employeeId });

      const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];
      for (const task of itTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`System access provisioned successfully`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to provision access');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeAccess = async (request: TerminationRequest) => {
    const employeeId = typeof request.employeeId === 'object'
      ? (request.employeeId as any)?._id
      : request.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    try {
      setProcessing(request._id);
      setError(null);
      setSuccess(null);

      await offboardingService.revokeSystemAccess({ employeeId });

      setSuccess(`System access revoked successfully`);
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-12 bg-white rounded-xl shadow-sm"></div>
            <div className="h-64 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">System Access Management</h1>
          <p className="text-gray-500 mt-1">Provision and revoke system access for employees</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('provisioning')}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'provisioning'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Access Provisioning
                {onboardings.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === 'provisioning' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {onboardings.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('revocation')}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'revocation'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                Access Revocation
                {terminations.length > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === 'revocation' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    {terminations.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Info Notice */}
        <div className={`rounded-xl p-4 flex gap-3 ${
          activeTab === 'provisioning' 
            ? 'bg-blue-50 border border-blue-100' 
            : 'bg-red-50 border border-red-100'
        }`}>
          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            activeTab === 'provisioning' ? 'text-blue-600' : 'text-red-600'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className={`font-medium ${activeTab === 'provisioning' ? 'text-blue-900' : 'text-red-900'}`}>
              {activeTab === 'provisioning' ? 'Provisioning Guidelines' : 'Security Requirements'}
            </h3>
            <p className={`text-sm mt-1 ${activeTab === 'provisioning' ? 'text-blue-700' : 'text-red-700'}`}>
              {activeTab === 'provisioning'
                ? 'Provision system access for new employees on or before their start date. This includes email, SSO, and internal system access.'
                : 'Access must be revoked immediately upon termination approval to maintain security compliance. This action cannot be undone.'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              {activeTab === 'provisioning' ? 'Pending Access Provisioning' : 'Pending Access Revocation'}
            </h2>
          </div>

          {activeTab === 'provisioning' ? (
            onboardings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">All Caught Up</p>
                <p className="text-gray-500 mt-1">No pending access provisioning requests</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {onboardings.map((onboarding) => {
                  const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                    ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.firstName || 'Unknown'
                    : onboarding.employeeId;
                  const itTasks = onboarding.tasks?.filter(t => t.department === 'IT') || [];

                  return (
                    <div key={onboarding._id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Employee: {employeeIdDisplay}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                            </p>

                            {/* IT Tasks */}
                            {itTasks.length > 0 && (
                              <div className="mt-3 space-y-1.5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">IT Tasks</p>
                                {itTasks.map((task, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      task.status === OnboardingTaskStatus.COMPLETED 
                                        ? 'bg-green-500' 
                                        : 'bg-amber-500'
                                    }`}></span>
                                    <span className="text-sm text-gray-700">{task.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleProvisionAccess(onboarding)}
                          disabled={processing === onboarding._id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {processing === onboarding._id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Provision Access
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            terminations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium">All Caught Up</p>
                <p className="text-gray-500 mt-1">No pending access revocation requests</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {terminations.map((request) => {
                  const employeeIdDisplay = typeof request.employeeId === 'object'
                    ? (request.employeeId as any)?._id || (request.employeeId as any)?.firstName || 'Unknown'
                    : request.employeeId;
                  const reasonDisplay = typeof request.reason === 'object'
                    ? JSON.stringify(request.reason)
                    : request.reason;

                  return (
                    <div key={request._id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">Employee: {employeeIdDisplay}</h3>
                              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Access Active
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Reason: {reasonDisplay}</p>
                            {request.terminationDate && (
                              <p className="text-sm text-gray-500">
                                Termination Date: {new Date(request.terminationDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeAccess(request)}
                          disabled={processing === request._id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {processing === request._id ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Revoking...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Revoke All Access
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Access Types */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Access Types Managed</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ACCESS_TYPES.map((access) => (
              <div key={access.id} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activeTab === 'provisioning' ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    activeTab === 'provisioning' ? 'text-blue-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{access.name}</p>
                  <p className="text-xs text-gray-500">{access.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

