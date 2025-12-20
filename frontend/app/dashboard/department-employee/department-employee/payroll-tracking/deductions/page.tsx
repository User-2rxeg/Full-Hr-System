'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Deductions Page - Department Employee
 * REQ-PY-8: View detailed tax deductions with law/rule applied
 * REQ-PY-9: View insurance deductions (health, pension, unemployment)
 * REQ-PY-10: View salary deductions due to misconduct or unapproved absenteeism
 * REQ-PY-11: View deductions for unpaid leave days
 * BR 5: Identify payroll income taxes' brackets through Local Tax Law
 * BR 6: Support multiple tax components (income tax, exemptions)
 * BR 11: Deduct pay for unpaid leave days based on daily/hourly salary calculations
 */

interface TaxDeduction {
  id: string;
  type: string;
  amount: number;
  percentage?: number;
  taxBracket?: string;
  lawReference?: string;
  description?: string;
}

interface InsuranceDeduction {
  id: string;
  type: string;
  amount: number;
  percentage?: number;
  provider?: string;
  description?: string;
}

interface MisconductDeduction {
  id: string;
  type: string;
  amount: number;
  date: string;
  reason: string;
  description?: string;
}

interface UnpaidLeaveDeduction {
  id: string;
  leaveType: string;
  days: number;
  dailyRate: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
}

interface AttendanceDeduction {
  id: string;
  type: string;
  date: string;
  amount: number;
  hours?: number;
  reason?: string;
}

export default function DeductionsPage() {
  const { user } = useAuth();
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([]);
  const [insuranceDeductions, setInsuranceDeductions] = useState<InsuranceDeduction[]>([]);
  const [misconductDeductions, setMisconductDeductions] = useState<MisconductDeduction[]>([]);
  const [unpaidLeaveDeductions, setUnpaidLeaveDeductions] = useState<UnpaidLeaveDeduction[]>([]);
  const [attendanceDeductions, setAttendanceDeductions] = useState<AttendanceDeduction[]>([]);
  const [unpaidLeaveTotal, setUnpaidLeaveTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tax' | 'insurance' | 'misconduct' | 'unpaid' | 'attendance'>('tax');

  useEffect(() => {
    const fetchDeductions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all types of deductions in parallel
        const [taxRes, insuranceRes, misconductRes, unpaidRes, attendanceRes] = await Promise.all([
          payrollTrackingService.getTaxDeductions(user.id).catch(() => ({ data: [] })),
          payrollTrackingService.getInsuranceDeductions(user.id).catch(() => ({ data: [] })),
          payrollTrackingService.getMisconductDeductions(user.id).catch(() => ({ data: [] })),
          payrollTrackingService.getUnpaidLeaveDeductions(user.id).catch(() => ({ data: null })),
          payrollTrackingService.getAttendanceBasedDeductions(user.id).catch(() => ({ data: null })),
        ]);

        // Process tax deductions - response is array of payslip tax data
        const taxData = taxRes?.data || [];
        const taxList: TaxDeduction[] = [];
        if (Array.isArray(taxData)) {
          taxData.forEach((payslipTax: any) => {
            if (payslipTax.taxDetails && Array.isArray(payslipTax.taxDetails)) {
              payslipTax.taxDetails.forEach((tax: any, idx: number) => {
                taxList.push({
                  id: `${payslipTax.payslipId}-tax-${idx}`,
                  type: tax.ruleName || 'Tax',
                  amount: tax.calculatedAmount || 0,
                  percentage: tax.effectiveRatePct || tax.configuredRatePct,
                  taxBracket: tax.taxBracket,
                  lawReference: tax.lawReference,
                  description: tax.description,
                });
              });
            }
          });
        }
        setTaxDeductions(taxList);

        // Process insurance deductions - response is array of payslip insurance data
        const insuranceData = insuranceRes?.data || [];
        const insuranceList: InsuranceDeduction[] = [];
        if (Array.isArray(insuranceData)) {
          insuranceData.forEach((payslipInsurance: any) => {
            if (payslipInsurance.insuranceDeductions && Array.isArray(payslipInsurance.insuranceDeductions)) {
              payslipInsurance.insuranceDeductions.forEach((insurance: any, idx: number) => {
                insuranceList.push({
                  id: `${payslipInsurance.payslipId}-insurance-${idx}`,
                  type: insurance.name || insurance.type || 'Insurance',
                  amount: insurance.amount || 0,
                  percentage: insurance.rate,
                  provider: insurance.provider,
                  description: insurance.description,
                });
              });
            }
          });
        }
        setInsuranceDeductions(insuranceList);

        // Process misconduct deductions - response is array of payslip misconduct data
        const misconductData = misconductRes?.data || [];
        const misconductList: MisconductDeduction[] = [];
        if (Array.isArray(misconductData)) {
          misconductData.forEach((payslipMisconduct: any, idx: number) => {
            if (payslipMisconduct.totalPenalties > 0) {
              misconductList.push({
                id: `${payslipMisconduct.payslipId}-misconduct-${idx}`,
                type: 'Misconduct/Absenteeism',
                amount: payslipMisconduct.totalPenalties || 0,
                date: payslipMisconduct.payslipPeriod || new Date().toISOString(),
                reason: 'Deduction from payslip',
                description: `Misconduct deduction from ${payslipMisconduct.payslipPeriod || 'payslip'}`,
              });
            }
          });
        }
        setMisconductDeductions(misconductList);

        // Process unpaid leave deductions - response is an object with unpaidLeaveRequests and payslipDeductions
        const unpaidData: any = (unpaidRes as any)?.data;
        const unpaidList: UnpaidLeaveDeduction[] = [];
        let unpaidTotal = 0;
        if (unpaidData && typeof unpaidData === 'object') {
          unpaidTotal = unpaidData.totalDeductionAmount || 0;
          
          // Process unpaid leave requests
          if (unpaidData.unpaidLeaveRequests && Array.isArray(unpaidData.unpaidLeaveRequests)) {
            unpaidData.unpaidLeaveRequests.forEach((request: any, idx: number) => {
              const deductionAmount = (request.days || 0) * (unpaidData.dailyRate || 0);
              unpaidList.push({
                id: `${request.leaveRequestId}-request-${idx}`,
                leaveType: request.leaveTypeName || 'Unpaid Leave',
                days: request.days || 0,
                dailyRate: unpaidData.dailyRate || 0,
                totalAmount: deductionAmount,
                startDate: request.startDate,
                endDate: request.endDate,
              });
            });
          }
          
          // Process payslip deductions
          if (unpaidData.payslipDeductions && Array.isArray(unpaidData.payslipDeductions)) {
            unpaidData.payslipDeductions.forEach((deduction: any, idx: number) => {
              unpaidList.push({
                id: `${deduction.payslipId}-payslip-${idx}`,
                leaveType: deduction.leaveTypeName || 'Unpaid Leave',
                days: deduction.daysDeducted || 0,
                dailyRate: deduction.dailyRate || 0,
                totalAmount: deduction.deductionAmount || 0,
                startDate: deduction.period?.from || '',
                endDate: deduction.period?.to || '',
              });
            });
          }
        }
        setUnpaidLeaveDeductions(unpaidList);
        setUnpaidLeaveTotal(unpaidTotal);

        // Process attendance-based deductions - response is an object with deductions array
        const attendanceData: any = (attendanceRes as any)?.data;
        const attendanceList: AttendanceDeduction[] = [];
        if (attendanceData && typeof attendanceData === 'object') {
          if (attendanceData.deductions && Array.isArray(attendanceData.deductions)) {
            attendanceData.deductions.forEach((deduction: any, idx: number) => {
              attendanceList.push({
                id: `attendance-${idx}`,
                type: deduction.type || 'Attendance Deduction',
                date: deduction.date,
                amount: deduction.amount || 0,
                hours: deduction.hoursDeducted,
                reason: deduction.reason || deduction.description,
              });
            });
          }
        }
        setAttendanceDeductions(attendanceList);
      } catch (err: any) {
        setError(err.message || 'Failed to load deductions');
      } finally {
        setLoading(false);
      }
    };

    fetchDeductions();
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

  const getTotalDeductions = () => {
    const taxTotal = Array.isArray(taxDeductions) ? taxDeductions.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
    const insuranceTotal = Array.isArray(insuranceDeductions) ? insuranceDeductions.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
    const misconductTotal = Array.isArray(misconductDeductions) ? misconductDeductions.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
    const unpaidTotal = Array.isArray(unpaidLeaveDeductions) ? unpaidLeaveDeductions.reduce((sum, d) => sum + (d.totalAmount || 0), 0) : unpaidLeaveTotal;
    const attendanceTotal = Array.isArray(attendanceDeductions) ? attendanceDeductions.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
    return taxTotal + insuranceTotal + misconductTotal + unpaidTotal + attendanceTotal;
  };

  const tabs = [
    { id: 'tax', label: 'Tax Deductions', icon: '', count: taxDeductions.length },
    { id: 'insurance', label: 'Insurance', icon: '', count: insuranceDeductions.length },
    { id: 'misconduct', label: 'Misconduct', icon: '', count: misconductDeductions.length },
    { id: 'unpaid', label: 'Unpaid Leave', icon: '', count: unpaidLeaveDeductions.length },
    { id: 'attendance', label: 'Attendance', icon: '', count: attendanceDeductions.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading deductions information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading deductions</p>
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
          <h1 className="text-3xl font-bold text-slate-900">Deductions</h1>
          <p className="text-slate-600 mt-2">View all deductions from your salary including taxes, insurance, and other items</p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Deductions Overview</h2>
            <p className="text-4xl font-bold mt-2">{formatCurrency(getTotalDeductions())}</p>
            <p className="text-red-100 mt-1">Combined deductions from all categories</p>
          </div>
          <div className="text-6xl"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-red-100 text-xs">Tax</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(taxDeductions.reduce((s, d) => s + d.amount, 0))}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-red-100 text-xs">Insurance</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(insuranceDeductions.reduce((s, d) => s + d.amount, 0))}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-red-100 text-xs">Misconduct</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(misconductDeductions.reduce((s, d) => s + d.amount, 0))}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-red-100 text-xs">Unpaid Leave</p>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(Array.isArray(unpaidLeaveDeductions) ? unpaidLeaveDeductions.reduce((s, d) => s + (d.totalAmount || 0), 0) : unpaidLeaveTotal)}
            </p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-red-100 text-xs">Attendance</p>
            <p className="text-lg font-bold mt-1">{formatCurrency(attendanceDeductions.reduce((s, d) => s + d.amount, 0))}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tax Deductions Tab */}
      {activeTab === 'tax' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tax Deductions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Detailed breakdown of tax deductions including income tax and social contributions.
          </p>
          
          {taxDeductions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No tax deductions recorded
            </div>
          ) : (
            <div className="space-y-4">
              {taxDeductions.map((deduction) => (
                <div key={deduction.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{deduction.type}</h4>
                      {deduction.description && (
                        <p className="text-sm text-slate-600 mt-1">{deduction.description}</p>
                      )}
                      {deduction.taxBracket && (
                        <p className="text-xs text-blue-600 mt-2">
                          Tax Bracket: {deduction.taxBracket}
                        </p>
                      )}
                      {deduction.lawReference && (
                        <p className="text-xs text-amber-600 mt-1">
                          Law Reference: {deduction.lawReference}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(deduction.amount)}</p>
                      {deduction.percentage && (
                        <p className="text-sm text-slate-500">{deduction.percentage}% of taxable income</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Tax Deductions</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(taxDeductions.reduce((s, d) => s + d.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insurance Deductions Tab */}
      {activeTab === 'insurance' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Insurance Deductions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Health, pension, unemployment, and other insurance contributions.
          </p>
          
          {insuranceDeductions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No insurance deductions recorded
            </div>
          ) : (
            <div className="space-y-4">
              {insuranceDeductions.map((deduction) => (
                <div key={deduction.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{deduction.type}</h4>
                      {deduction.provider && (
                        <p className="text-sm text-slate-600 mt-1">Provider: {deduction.provider}</p>
                      )}
                      {deduction.description && (
                        <p className="text-sm text-slate-500 mt-1">{deduction.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(deduction.amount)}</p>
                      {deduction.percentage && (
                        <p className="text-sm text-slate-500">{deduction.percentage}% contribution</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Insurance Deductions</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(insuranceDeductions.reduce((s, d) => s + d.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Misconduct Deductions Tab */}
      {activeTab === 'misconduct' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Misconduct / Absenteeism Deductions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Salary deductions due to misconduct or unapproved absenteeism.
          </p>
          
          {misconductDeductions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No misconduct deductions - Great job!
            </div>
          ) : (
            <div className="space-y-4">
              {misconductDeductions.map((deduction) => (
                <div key={deduction.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{deduction.type}</h4>
                      <p className="text-sm text-slate-600 mt-1">{formatDate(deduction.date)}</p>
                      <p className="text-sm text-red-600 mt-2 font-medium">Reason: {deduction.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(deduction.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Misconduct Deductions</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(misconductDeductions.reduce((s, d) => s + d.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unpaid Leave Tab */}
      {activeTab === 'unpaid' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Unpaid Leave Deductions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Deductions for unpaid leave days based on daily/hourly salary calculations.
          </p>
          
          {unpaidLeaveDeductions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No unpaid leave deductions
            </div>
          ) : (
            <div className="space-y-4">
              {unpaidLeaveDeductions.map((deduction) => (
                <div key={deduction.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{deduction.leaveType}</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatDate(deduction.startDate)} - {formatDate(deduction.endDate)}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-slate-500">{deduction.days} days</span>
                        <span className="text-slate-500">Daily Rate: {formatCurrency(deduction.dailyRate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(deduction.totalAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Unpaid Leave Deductions</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(Array.isArray(unpaidLeaveDeductions) ? unpaidLeaveDeductions.reduce((s, d) => s + (d.totalAmount || 0), 0) : unpaidLeaveTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Deductions Tab */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Attendance-Based Deductions</h3>
          <p className="text-slate-600 text-sm mb-6">
            Deductions based on attendance records such as late arrivals or early departures.
          </p>
          
          {attendanceDeductions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2"></div>
              No attendance-based deductions - Excellent attendance!
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceDeductions.map((deduction) => (
                <div key={deduction.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{deduction.type}</h4>
                      <p className="text-sm text-slate-600 mt-1">{formatDate(deduction.date)}</p>
                      {deduction.hours && (
                        <p className="text-sm text-slate-500 mt-1">{deduction.hours} hours</p>
                      )}
                      {deduction.reason && (
                        <p className="text-sm text-amber-600 mt-1">{deduction.reason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">-{formatCurrency(deduction.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Attendance Deductions</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(attendanceDeductions.reduce((s, d) => s + d.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-amber-900">Have questions about your deductions?</h4>
            <p className="text-sm text-amber-700 mt-1">
              If you believe there&apos;s an error in any deduction, you can file a dispute through the{' '}
              <Link href="/dashboard/department-employee/payroll/claims-disputes" className="underline font-medium">
                Claims & Disputes
              </Link>{' '}
              section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
