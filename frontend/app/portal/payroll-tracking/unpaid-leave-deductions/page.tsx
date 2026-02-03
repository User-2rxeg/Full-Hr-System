'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Unpaid Leave Deductions View - Department Employee
 * REQ-PY-11: As an Employee, I want to see deductions for unpaid leave days,
 *           so that I understand how my time off affects my salary.
 * BR 11: The system must deduct pay for unpaid leave days based on daily/hourly salary calculations
 * Inputs from Other Sub-Systems: Leaves - Unpaid leave status
 */

interface UnpaidLeaveRequest {
  leaveRequestId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  days: number;
  hours?: number;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface PayslipDeduction {
  payslipId: string;
  payslipPeriod?: string;
  leaveRequestId: string;
  leaveTypeName: string;
  daysDeducted: number;
  hoursDeducted?: number;
  dailyRate: number;
  hourlyRate?: number;
  deductionAmount: number;
  period: {
    from: string;
    to: string;
  };
}

interface UnpaidLeaveData {
  employeeId: string;
  fullName: string;
  baseSalary: number;
  dailyRate: number;
  hourlyRate?: number;
  unpaidLeaveRequests: UnpaidLeaveRequest[];
  payslipDeductions: PayslipDeduction[];
  totalUnpaidLeaveDays: number;
  totalDeductionAmount: number;
  message?: string;
}

export default function UnpaidLeaveDeductionsPage() {
  const { user } = useAuth();
  const [leaveData, setLeaveData] = useState<UnpaidLeaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'payslips'>('requests');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const options: any = {};
        if (dateRange) {
          options.from = dateRange.from;
          options.to = dateRange.to;
        }
        
        const response = await payrollTrackingService.getUnpaidLeaveDeductions(user.id, options);
        
        if (response?.error) {
          setError(response.error);
          return;
        }

        const data = response?.data;
        if (data && typeof data === 'object') {
          setLeaveData(data as UnpaidLeaveData);
        } else {
          setLeaveData(null);
        }
      } catch (err: any) {
        console.error('Failed to load unpaid leave deductions:', err);
        setError(err.message || 'Failed to load unpaid leave deductions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDateRange = (period: 'currentMonth' | 'lastMonth' | 'last3Months' | 'all') => {
    const now = new Date();
    let from: Date, to: Date;

    switch (period) {
      case 'currentMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        setDateRange(null);
        return;
    }

    setDateRange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading unpaid leave deductions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading unpaid leave deductions</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  if (!leaveData) {
    return (
      <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-12 text-center">
        <div className="text-6xl mb-4"></div>
        <p className="text-slate-700 font-medium text-lg">No unpaid leave data available</p>
        <p className="text-slate-500 text-sm mt-2">
          No unpaid leave deductions found
        </p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
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
          <h1 className="text-3xl font-bold text-slate-900">Unpaid Leave Deductions</h1>
          <p className="text-slate-600 mt-2">
            View deductions for unpaid leave days and understand how time off affects your salary
          </p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Unpaid Leave Deductions</h2>
            <p className="text-4xl font-bold mt-2">
              {formatCurrency(leaveData.totalDeductionAmount || 0)}
            </p>
            <p className="text-orange-100 mt-1">
              {leaveData.totalUnpaidLeaveDays || 0} unpaid leave day{leaveData.totalUnpaidLeaveDays !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-6xl"></div>
        </div>
      </div>

      {/* Rate Information & Date Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-600">Base Salary</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(leaveData.baseSalary)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Daily Rate (BR 11)</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(leaveData.dailyRate)}</p>
            <p className="text-xs text-slate-500">Calculated: Base Salary ÷ 30 days</p>
          </div>
          {leaveData.hourlyRate && (
            <div>
              <p className="text-sm text-slate-600">Hourly Rate (BR 11)</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(leaveData.hourlyRate)}</p>
              <p className="text-xs text-slate-500">Calculated: Daily Rate ÷ 8 hours</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Period:</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => calculateDateRange('currentMonth')}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Current Month
            </button>
            <button
              onClick={() => calculateDateRange('lastMonth')}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Last Month
            </button>
            <button
              onClick={() => calculateDateRange('last3Months')}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setDateRange(null)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              All Time
            </button>
          </div>
          {dateRange && (
            <p className="text-xs text-slate-500 mt-2">
              Showing: {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'requests'
                ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Leave Requests ({leaveData.unpaidLeaveRequests?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'payslips'
                ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Payslip Deductions ({leaveData.payslipDeductions?.length || 0})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'requests' ? (
            <>
              {/* Unpaid Leave Requests */}
              {!leaveData.unpaidLeaveRequests || leaveData.unpaidLeaveRequests.length === 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-slate-700 font-medium text-lg">No unpaid leave requests</p>
                  <p className="text-slate-500 text-sm mt-2">
                    You have no approved unpaid leave requests
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveData.unpaidLeaveRequests.map((request) => {
                    const deductionAmount = request.days * leaveData.dailyRate;
                    return (
                      <div key={request.leaveRequestId} className="bg-white border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl"></span>
                              <div>
                                <h4 className="font-semibold text-slate-900">{request.leaveTypeName}</h4>
                                <span className="text-xs text-slate-500">Code: {request.leaveTypeCode}</span>
                              </div>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                {request.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                              <div>
                                <p className="text-slate-600">Start Date</p>
                                <p className="font-medium text-slate-900">{formatDate(request.startDate)}</p>
                              </div>
                              <div>
                                <p className="text-slate-600">End Date</p>
                                <p className="font-medium text-slate-900">{formatDate(request.endDate)}</p>
                              </div>
                              <div>
                                <p className="text-slate-600">Days</p>
                                <p className="font-medium text-slate-900">{request.days} day{request.days !== 1 ? 's' : ''}</p>
                                {request.hours && (
                                  <p className="text-xs text-slate-500">({request.hours} hours)</p>
                                )}
                              </div>
                              <div>
                                <p className="text-slate-600">Deduction (BR 11)</p>
                                <p className="font-bold text-red-600">
                                  -{formatCurrency(deductionAmount)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {request.days} × {formatCurrency(leaveData.dailyRate)}
                                </p>
                              </div>
                            </div>
                            {request.approvedBy && (
                              <p className="text-xs text-slate-500 mt-2">
                                Approved by: {request.approvedBy} on {formatDate(request.approvedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Payslip Deductions */}
              {!leaveData.payslipDeductions || leaveData.payslipDeductions.length === 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-slate-700 font-medium text-lg">No payslip deductions</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Unpaid leave deductions will appear here once they are applied to payslips
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveData.payslipDeductions.map((deduction, index) => (
                    <div key={index} className="bg-white border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl"></span>
                            <div>
                              <h4 className="font-semibold text-slate-900">
                                {deduction.payslipPeriod || `Payslip ${deduction.payslipId.slice(-8)}`}
                              </h4>
                              <p className="text-sm text-slate-600">{deduction.leaveTypeName}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                            <div>
                              <p className="text-slate-600">Period</p>
                              <p className="font-medium text-slate-900">
                                {formatDate(deduction.period.from)} - {formatDate(deduction.period.to)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600">Days Deducted</p>
                              <p className="font-medium text-slate-900">
                                {deduction.daysDeducted} day{deduction.daysDeducted !== 1 ? 's' : ''}
                                {deduction.hoursDeducted && (
                                  <span className="text-xs text-slate-500"> ({deduction.hoursDeducted} hrs)</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600">Rate Used (BR 11)</p>
                              <p className="font-medium text-slate-900">
                                Daily: {formatCurrency(deduction.dailyRate)}
                                {deduction.hourlyRate && (
                                  <span className="block text-xs">Hourly: {formatCurrency(deduction.hourlyRate)}</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-600">Calculation</p>
                              <p className="font-medium text-slate-900 text-xs">
                                {deduction.daysDeducted} × {formatCurrency(deduction.dailyRate)}
                                {deduction.hoursDeducted && deduction.hourlyRate && (
                                  <span className="block">
                                    + {deduction.hoursDeducted} × {formatCurrency(deduction.hourlyRate)}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-red-600">
                            -{formatCurrency(deduction.deductionAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-orange-900 mb-2">Understanding Unpaid Leave Deductions</h4>
            <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
              <li>Unpaid leave deductions are calculated based on your daily/hourly rate (BR 11)</li>
              <li>Daily rate = Base Salary ÷ 30 days</li>
              <li>Hourly rate = Daily Rate ÷ 8 hours (if applicable)</li>
              <li>Only approved unpaid leave requests result in salary deductions</li>
              <li>These deductions are integrated with the Leaves module</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}