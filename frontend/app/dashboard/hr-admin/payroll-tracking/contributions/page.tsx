
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Compensation & Benefits Page - Department Employee
 * REQ-PY-5: View compensation for unused or encashed leave days
 * REQ-PY-7: View transportation or commuting compensation
 * REQ-PY-14: View employer contributions (insurance, pension, allowances)
 */

// Backend response types
interface BackendLeaveCompensation {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  unusedLeaveDays: number;
  leaveEntitlements: Array<{
    leaveTypeId: string;
    leaveTypeName: string;
    remaining: number;
    carryForward: number;
  }>;
  encashmentRate: number;
  dailyRate: number;
  totalCompensation: number;
  currency: string;
  lastUpdated: string;
}

interface BackendTransportCompensation {
  transportationAllowance: number;
  createdAt: string;
}

interface BackendEmployerContribution {
  payslipId: string;
  employerContributions: Array<{
    type?: string;
    amount: number;
    description?: string;
  }>;
  totalEmployerContribution: number;
}

// Frontend display types
interface LeaveCompensation {
  id: string;
  leaveType: string;
  unusedDays: number;
  dailyRate: number;
  totalAmount: number;
  encashmentDate?: string;
  status: string;
}

interface TransportationCompensation {
  id: string;
  type: string;
  amount: number;
  frequency: string;
  description?: string;
  effectiveDate: string;
}

interface EmployerContribution {
  id: string;
  type: string;
  amount: number;
  percentage?: number;
  frequency: string;
  provider?: string;
  description?: string;
}

export default function ContributionsPage() {
  const { user } = useAuth();
  const [leaveCompensation, setLeaveCompensation] = useState<LeaveCompensation[]>([]);
  const [transportationCompensation, setTransportationCompensation] = useState<TransportationCompensation[]>([]);
  const [employerContributions, setEmployerContributions] = useState<EmployerContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'employer' | 'leave' | 'transportation'>('employer');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [leaveRes, transportRes, contributionsRes] = await Promise.all([
          payrollTrackingService.getLeaveCompensation(user.id).catch(() => ({ data: null })),
          payrollTrackingService.getTransportationCompensation(user.id).catch(() => ({ data: null })),
          payrollTrackingService.getEmployerContributions(user.id).catch(() => ({ data: [] })),
        ]);

        // Map backend leave compensation to frontend format
        const leaveData = leaveRes?.data as BackendLeaveCompensation | null;
        if (leaveData && leaveData.leaveEntitlements) {
          const mappedLeave: LeaveCompensation[] = leaveData.leaveEntitlements
            .filter(ent => ent.remaining > 0)
            .map((ent, index) => ({
              id: ent.leaveTypeId || `leave-${index}`,
              leaveType: ent.leaveTypeName,
              unusedDays: ent.remaining,
              dailyRate: leaveData.dailyRate,
              totalAmount: ent.remaining * leaveData.dailyRate * (leaveData.encashmentRate / 100),
              encashmentDate: leaveData.lastUpdated,
              status: 'available',
            }));
          setLeaveCompensation(mappedLeave);
        } else {
          setLeaveCompensation([]);
        }

        // Map backend transport compensation to frontend format
        const transportData = transportRes?.data as BackendTransportCompensation | null;
        if (transportData && transportData.transportationAllowance > 0) {
          const mappedTransport: TransportationCompensation[] = [{
            id: 'transport-1',
            type: 'Transportation Allowance',
            amount: transportData.transportationAllowance,
            frequency: 'Monthly',
            description: 'Monthly transportation compensation',
            effectiveDate: transportData.createdAt || new Date().toISOString(),
          }];
          setTransportationCompensation(mappedTransport);
        } else {
          setTransportationCompensation([]);
        }

        // Map backend employer contributions to frontend format
        const contributionsData = contributionsRes?.data as BackendEmployerContribution[] | null;
        if (Array.isArray(contributionsData) && contributionsData.length > 0) {
          const allContributions: EmployerContribution[] = [];
          contributionsData.forEach((payslipContrib) => {
            if (payslipContrib.employerContributions) {
              payslipContrib.employerContributions.forEach((contrib, cIndex) => {
                allContributions.push({
                  id: `${payslipContrib.payslipId}-${cIndex}`,
                  type: contrib.type || 'Benefit',
                  amount: contrib.amount || 0,
                  frequency: 'Monthly',
                  description: contrib.description,
                });
              });
            }
          });
          setEmployerContributions(allContributions);
        } else {
          setEmployerContributions([]);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load compensation data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalEmployerContributions = () => {
    return employerContributions.reduce((sum, c) => sum + c.amount, 0);
  };

  const getTotalLeaveCompensation = () => {
    return leaveCompensation.reduce((sum, c) => sum + c.totalAmount, 0);
  };

  const getTotalTransportation = () => {
    return transportationCompensation.reduce((sum, c) => sum + c.amount, 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Approved</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status || 'N/A'}</span>;
    }
  };

  const getContributionIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('health') || lowerType.includes('medical')) return '';
    if (lowerType.includes('pension') || lowerType.includes('retirement')) return '';
    if (lowerType.includes('insurance')) return '';
    if (lowerType.includes('allowance')) return '';
    if (lowerType.includes('education') || lowerType.includes('training')) return '';
    return '';
  };

  const tabs = [
    { id: 'employer', label: 'Employer Contributions', icon: '', total: getTotalEmployerContributions() },
    { id: 'leave', label: 'Leave Encashment', icon: '', total: getTotalLeaveCompensation() },
    { id: 'transportation', label: 'Transportation', icon: '', total: getTotalTransportation() },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading compensation & benefits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading data</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Compensation & Benefits</h1>
          <p className="text-slate-600 mt-2">View your employer contributions, leave encashment, and transportation compensation</p>
        </div>
          <Link href="/dashboard/department-employee/payroll-tracking">
            <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
              Back to Payroll Tracking
            </button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Benefits Overview</h2>
            <p className="text-4xl font-bold mt-2">
              {formatCurrency(getTotalEmployerContributions() + getTotalLeaveCompensation() + getTotalTransportation())}
            </p>
            <p className="text-purple-100 mt-1">Combined employer contributions and compensations</p>
          </div>
          <div className="text-6xl"></div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-xs">Employer Contributions</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(getTotalEmployerContributions())}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-xs">Leave Encashment</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(getTotalLeaveCompensation())}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-purple-100 text-xs">Transportation</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(getTotalTransportation())}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'employer' | 'leave' | 'transportation')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {formatCurrency(tab.total)}
            </span>
          </button>
        ))}
      </div>

      {/* Employer Contributions Tab */}
      {activeTab === 'employer' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4"> Employer Contributions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Your employer makes these contributions on your behalf for insurance, pension, and other benefits.
          </p>
          
          {employerContributions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No employer contributions recorded
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employerContributions.map((contribution) => (
                <div key={contribution.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-purple-200 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getContributionIcon(contribution.type)}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{contribution.type}</h4>
                      {contribution.provider && (
                        <p className="text-sm text-slate-600">Provider: {contribution.provider}</p>
                      )}
                      {contribution.description && (
                        <p className="text-sm text-slate-500 mt-1">{contribution.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">{contribution.frequency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">+{formatCurrency(contribution.amount)}</p>
                      {contribution.percentage && (
                        <p className="text-sm text-slate-500">{contribution.percentage}%</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {employerContributions.length > 0 && (
            <div className="border-t border-slate-200 pt-4 mt-6">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Total Employer Contributions</span>
                <span className="text-xl font-bold text-green-600">
                  +{formatCurrency(getTotalEmployerContributions())}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Per pay period (typically monthly)</p>
            </div>
          )}
        </div>
      )}

      {/* Leave Encashment Tab */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Leave Encashment</h3>
          <p className="text-slate-600 text-sm mb-6">
            Compensation for unused or encashed leave days converted into monetary value.
          </p>
          
          {leaveCompensation.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No leave encashment records
            </div>
          ) : (
            <div className="space-y-4">
              {leaveCompensation.map((compensation) => (
                <div key={compensation.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{compensation.leaveType}</h4>
                      <div className="flex gap-4 mt-2 text-sm text-slate-600">
                        <span>{compensation.unusedDays} days unused</span>
                          <span>x</span>
                        <span>{formatCurrency(compensation.dailyRate)}/day</span>
                      </div>
                      {compensation.encashmentDate && (
                        <p className="text-xs text-slate-500 mt-2">
                          Encashed on: {formatDate(compensation.encashmentDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">+{formatCurrency(compensation.totalAmount)}</p>
                      {getStatusBadge(compensation.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Leave Encashment</span>
                  <span className="text-xl font-bold text-green-600">
                    +{formatCurrency(getTotalLeaveCompensation())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transportation Tab */}
      {activeTab === 'transportation' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Transportation Compensation</h3>
          <p className="text-slate-600 text-sm mb-6">
            Compensation for transportation or commuting costs covered by your employer.
          </p>
          
          {transportationCompensation.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No transportation compensation records
            </div>
          ) : (
            <div className="space-y-4">
              {transportationCompensation.map((compensation) => (
                <div key={compensation.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{compensation.type}</h4>
                      {compensation.description && (
                        <p className="text-sm text-slate-600 mt-1">{compensation.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-slate-500">
                        <span>{compensation.frequency}</span>
                        <span>Effective: {formatDate(compensation.effectiveDate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">+{formatCurrency(compensation.amount)}</p>
                      <p className="text-xs text-slate-500">per {compensation.frequency?.toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Transportation Compensation</span>
                  <span className="text-xl font-bold text-green-600">
                    +{formatCurrency(getTotalTransportation())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-blue-900">Understanding Your Benefits</h4>
            <p className="text-sm text-blue-700 mt-1">
              Employer contributions are made on top of your salary and are part of your total compensation package.
              These benefits help secure your health, retirement, and daily commute needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
