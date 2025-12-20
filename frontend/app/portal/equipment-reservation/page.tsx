'use client';

import { useState, useEffect } from 'react';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';

const EQUIPMENT_TYPES = [
  { id: 'laptop', name: 'Laptop', description: 'Standard work laptop' },
  { id: 'monitor', name: 'Monitor', description: 'External display' },
  { id: 'keyboard', name: 'Keyboard', description: 'Wired or wireless keyboard' },
  { id: 'mouse', name: 'Mouse', description: 'Wired or wireless mouse' },
  { id: 'headset', name: 'Headset', description: 'Communication headset' },
  { id: 'phone', name: 'Desk Phone', description: 'IP desk phone' },
  { id: 'access_card', name: 'Access Card', description: 'Building access card' },
  { id: 'desk', name: 'Desk/Workspace', description: 'Assigned workspace' },
];

export default function EquipmentReservationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, string[]>>({});
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed' | 'all'>('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (!err.message?.includes('404')) {
        setError(err.message || 'Failed to fetch data');
      }
      setOnboardings([]);
    } finally {
      setLoading(false);
    }
  };

  const getAdminTasks = (onboarding: Onboarding) => {
    return onboarding.tasks?.filter(t =>
      t.department === 'Admin' || t.department === 'Facilities' || t.name.toLowerCase().includes('equipment')
    ) || [];
  };

  const hasAdminPendingTasks = (onboarding: Onboarding) => {
    return getAdminTasks(onboarding).some(t => t.status !== OnboardingTaskStatus.COMPLETED);
  };

  const filteredOnboardings = onboardings.filter(o => {
    if (filterStatus === 'pending') return !o.completed && hasAdminPendingTasks(o);
    if (filterStatus === 'completed') return o.completed || !hasAdminPendingTasks(o);
    return true;
  });

  const handleEquipmentToggle = (onboardingId: string, equipmentId: string) => {
    setSelectedEquipment(prev => {
      const current = prev[onboardingId] || [];
      if (current.includes(equipmentId)) {
        return { ...prev, [onboardingId]: current.filter(e => e !== equipmentId) };
      }
      return { ...prev, [onboardingId]: [...current, equipmentId] };
    });
  };

  const handleReserveEquipment = async (onboarding: Onboarding) => {
    const employeeId = typeof onboarding.employeeId === 'object'
      ? (onboarding.employeeId as any)?._id
      : onboarding.employeeId;

    if (!employeeId) {
      setError('Unable to determine employee ID');
      return;
    }

    const equipment = selectedEquipment[onboarding._id] || [];
    if (equipment.length === 0) {
      setError('Please select at least one equipment item');
      return;
    }

    try {
      setProcessing(onboarding._id);
      setError(null);
      setSuccess(null);

      await onboardingService.reserveEquipment({
        employeeId,
        equipment,
      });

      const adminTasks = getAdminTasks(onboarding);
      for (const task of adminTasks) {
        if (task.status !== OnboardingTaskStatus.COMPLETED) {
          await onboardingService.updateTaskStatus(onboarding._id, task.name, {
            status: OnboardingTaskStatus.COMPLETED,
            completedAt: new Date().toISOString(),
          });
        }
      }

      setSuccess(`Equipment reserved successfully`);
      setSelectedEquipment(prev => ({ ...prev, [onboarding._id]: [] }));
      setTimeout(() => setSuccess(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reserve equipment');
    } finally {
      setProcessing(null);
    }
  };

  const stats = {
    total: onboardings.length,
    pendingAdmin: onboardings.filter(o => !o.completed && hasAdminPendingTasks(o)).length,
    completedAdmin: onboardings.filter(o => o.completed || !hasAdminPendingTasks(o)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-white rounded-xl shadow-sm"></div>
              <div className="h-24 bg-white rounded-xl shadow-sm"></div>
              <div className="h-24 bg-white rounded-xl shadow-sm"></div>
            </div>
            <div className="h-96 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Equipment Reservation</h1>
          <p className="text-gray-500 mt-1">Reserve equipment, desk and access cards for new hires</p>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Onboardings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Equipment</p>
                <p className="text-2xl font-semibold text-amber-600">{stats.pendingAdmin}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-green-600">{stats.completedAdmin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex gap-3">
          <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-purple-900">Equipment Reservation Guidelines</h3>
            <p className="text-sm text-purple-700 mt-1">
              Ensure all equipment is reserved and ready before the employee's first day. Standard equipment includes laptop, monitor, and access card.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'pending', label: 'Pending', count: stats.pendingAdmin, color: 'amber' },
            { key: 'completed', label: 'Completed', count: stats.completedAdmin, color: 'green' },
            { key: 'all', label: 'All', count: stats.total, color: 'gray' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === tab.key
                  ? tab.color === 'amber' 
                    ? 'bg-amber-600 text-white' 
                    : tab.color === 'green'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                filterStatus === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Onboarding List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Equipment Assignments</h2>
          </div>

          {filteredOnboardings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-500">No onboardings found matching the selected filter</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOnboardings.map((onboarding) => {
                const employeeIdDisplay = typeof onboarding.employeeId === 'object'
                  ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.firstName || 'Unknown'
                  : onboarding.employeeId;
                const hasPending = hasAdminPendingTasks(onboarding);
                const selected = selectedEquipment[onboarding._id] || [];

                return (
                  <div key={onboarding._id} className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Employee: {employeeIdDisplay}</h3>
                            <p className="text-sm text-gray-500">
                              Started: {new Date(onboarding.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        hasPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {hasPending ? 'pending' : 'complete'}
                      </span>
                    </div>

                    {hasPending && (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {EQUIPMENT_TYPES.map((eq) => (
                            <button
                              key={eq.id}
                              onClick={() => handleEquipmentToggle(onboarding._id, eq.id)}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                selected.includes(eq.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  selected.includes(eq.id) 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-gray-300'
                                }`}>
                                  {selected.includes(eq.id) && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{eq.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {selected.length} item{selected.length !== 1 ? 's' : ''} selected
                          </p>
                          <button
                            onClick={() => handleReserveEquipment(onboarding)}
                            disabled={processing === onboarding._id || selected.length === 0}
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
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Reserve Equipment
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Equipment Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Equipment Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {EQUIPMENT_TYPES.map((eq) => (
              <div key={eq.id} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{eq.name}</p>
                  <p className="text-xs text-gray-500">{eq.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

