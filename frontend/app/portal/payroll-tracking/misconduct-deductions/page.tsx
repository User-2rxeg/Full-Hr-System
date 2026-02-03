'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Misconduct/Absenteeism Deductions View - Department Employee
 * REQ-PY-10: As an Employee, I want to see any salary deductions due to misconduct or unapproved absenteeism,
 *           so that I know why part of my salary was reduced.
 * Inputs from Other Sub-Systems: Time Management - Absenteeism records
 */

interface MisconductDeduction {
  payslipId: string;
  payslipPeriod?: string;
  misconductDeductions: number;
  totalPenalties: number;
  details?: {
    type: string;
    description: string;
    amount: number;
    date: string;
    reason?: string;
  }[];
}

interface AttendanceBasedDeduction {
  employeeId: string;
  fullName: string;
  baseSalary: number;
  dailyRate: number;
  dateRange: {
    from: string;
    to: string;
  };
  deductions: Array<{
    date: string;
    type: string;
    description: string;
    hoursDeducted?: number;
    daysDeducted?: number;
    amount: number;
    reason?: string;
  }>;
  totalDeduction: number;
  attendanceRecordsCount?: number;
  shiftAssignmentsCount?: number;
}

export default function MisconductDeductionsPage() {
  const { user } = useAuth();
  const [misconductData, setMisconductData] = useState<MisconductDeduction[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceBasedDeduction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payslip' | 'attendance'>('payslip');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch misconduct deductions from payslips
        const misconductResponse = await payrollTrackingService.getMisconductDeductions(user.id);
        if (misconductResponse?.error) {
          console.warn('Misconduct deductions error:', misconductResponse.error);
        } else {
          const misconduct = misconductResponse?.data || [];
          setMisconductData(Array.isArray(misconduct) ? misconduct : []);
        }

        // Fetch attendance-based deductions (from Time Management)
        const attendanceResponse = await payrollTrackingService.getAttendanceBasedDeductions(user.id);
        if (attendanceResponse?.error) {
          console.warn('Attendance deductions error:', attendanceResponse.error);
        } else {
          const attendance = attendanceResponse?.data;
          if (attendance && typeof attendance === 'object') {
            setAttendanceData(attendance as AttendanceBasedDeduction);
          }
        }
      } catch (err: any) {
        console.error('Failed to load misconduct deductions:', err);
        setError(err.message || 'Failed to load misconduct deductions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

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

  const getTotalMisconduct = () => {
    return misconductData.reduce((sum, item) => sum + (item.totalPenalties || 0), 0);
  };

  const getDeductionTypeIcon = (type?: string) => {
    if (!type) return '⚠️';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('absent') || lowerType.includes('missing')) return '🚫';
    if (lowerType.includes('late') || lowerType.includes('tardiness')) return '⏰';
    if (lowerType.includes('misconduct') || lowerType.includes('violation')) return '❌';
    if (lowerType.includes('unauthorized')) return '🔒';
    return '⚠️';
  };

  const getDeductionTypeColor = (type?: string) => {
    if (!type) return 'bg-red-100 text-red-700';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('absent')) return 'bg-red-100 text-red-700';
    if (lowerType.includes('late')) return 'bg-orange-100 text-orange-700';
    if (lowerType.includes('misconduct')) return 'bg-purple-100 text-purple-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading misconduct deductions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading misconduct deductions</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  const filteredMisconductData = selectedPayslip 
    ? misconductData.filter(item => item.payslipId === selectedPayslip)
    : misconductData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Misconduct & Absenteeism Deductions</h1>
          <p className="text-slate-600 mt-2">
            View salary deductions due to misconduct or unapproved absenteeism
          </p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Misconduct Deductions</h2>
            <p className="text-4xl font-bold mt-2">
              {formatCurrency(getTotalMisconduct() + (attendanceData?.totalDeduction || 0))}
            </p>
            <p className="text-red-100 mt-1">
              From payslips and attendance records
            </p>
          </div>
          <div className="text-6xl">⚠️</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('payslip')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'payslip'
                ? 'border-b-2 border-red-600 text-red-600 bg-red-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Payslip Deductions ({misconductData.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'border-b-2 border-red-600 text-red-600 bg-red-50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Attendance-Based Deductions
            {attendanceData && attendanceData.deductions.length > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                {attendanceData.deductions.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'payslip' ? (
            <>
              {/* Payslip Filter */}
              {misconductData.length > 1 && (
                <div className="mb-6 bg-slate-50 rounded-lg border border-slate-200 p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Filter by Payslip:
                  </label>
                  <select
                    value={selectedPayslip || ''}
                    onChange={(e) => setSelectedPayslip(e.target.value || null)}
                    className="w-full md:w-auto border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="">All Payslips</option>
                    {misconductData.map((item) => (
                      <option key={item.payslipId} value={item.payslipId}>
                        {item.payslipPeriod || `Payslip ${item.payslipId.slice(-8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Misconduct Deductions List */}
              {filteredMisconductData.length === 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-slate-700 font-medium text-lg">No misconduct deductions found</p>
                  <p className="text-slate-500 text-sm mt-2">
                    No salary deductions for misconduct or absenteeism in your payslips
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMisconductData.map((item) => (
                    <div key={item.payslipId} className="bg-white rounded-lg border border-red-200 shadow-sm">
                      <div className="border-b border-red-200 p-4 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {item.payslipPeriod || `Payslip ${item.payslipId.slice(-8)}`}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Misconduct/Absenteeism Deductions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-600">
                              -{formatCurrency(item.totalPenalties)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        {item.details && item.details.length > 0 ? (
                          <div className="space-y-2">
                            {item.details.map((detail, index) => (
                              <div key={index} className="flex items-start justify-between p-3 bg-slate-50 rounded">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{getDeductionTypeIcon(detail.type)}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDeductionTypeColor(detail.type)}`}>
                                      {detail.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-700">{detail.description}</p>
                                  {detail.reason && (
                                    <p className="text-xs text-slate-500 mt-1">Reason: {detail.reason}</p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-1">Date: {formatDate(detail.date)}</p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-bold text-red-600">
                                    -{formatCurrency(detail.amount)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-600 text-sm">
                            Total deduction: {formatCurrency(item.totalPenalties)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Attendance-Based Deductions */}
              {!attendanceData || !attendanceData.deductions || attendanceData.deductions.length === 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-slate-700 font-medium text-lg">No attendance-based deductions</p>
                  <p className="text-slate-500 text-sm mt-2">
                    No deductions from unapproved absences or time management violations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600 font-medium">Base Salary</p>
                        <p className="text-lg font-bold text-blue-900">{formatCurrency(attendanceData.baseSalary)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-medium">Daily Rate</p>
                        <p className="text-lg font-bold text-blue-900">{formatCurrency(attendanceData.dailyRate)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-medium">Date Range</p>
                        <p className="text-sm font-bold text-blue-900">
                          {formatDate(attendanceData.dateRange.from)} - {formatDate(attendanceData.dateRange.to)}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-600 font-medium">Total Deduction</p>
                        <p className="text-lg font-bold text-red-600">
                          -{formatCurrency(attendanceData.totalDeduction)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {attendanceData.deductions.map((deduction, index) => (
                      <div key={index} className="bg-white border border-red-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">{getDeductionTypeIcon(deduction.type)}</span>
                              <h4 className="font-semibold text-slate-900">{deduction.type}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getDeductionTypeColor(deduction.type)}`}>
                                {deduction.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 mb-1">{deduction.description}</p>
                            <div className="flex gap-4 text-xs text-slate-500">
                              <span>Date: {formatDate(deduction.date)}</span>
                              {deduction.daysDeducted && <span>Days: {deduction.daysDeducted}</span>}
                              {deduction.hoursDeducted && <span>Hours: {deduction.hoursDeducted}</span>}
                            </div>
                            {deduction.reason && (
                              <p className="text-xs text-slate-500 mt-1">Reason: {deduction.reason}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-red-600">
                              -{formatCurrency(deduction.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-red-900 mb-2">Understanding Misconduct & Absenteeism Deductions</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Deductions are applied for unapproved absences, tardiness, or policy violations</li>
              <li>These deductions are calculated based on your daily/hourly rate</li>
              <li>Attendance-based deductions integrate with the Time Management system</li>
              <li>If you believe a deduction is incorrect, you can file a dispute</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}