'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Insurance Deductions View - Department Employee
 * REQ-PY-9: As an Employee, I want to see insurance deductions (health, pension, unemployment, etc.) 
 *          itemized, so that I know what protections are covered by my contributions.
 */

interface InsuranceDeduction {
  _id?: string;
  name: string;
  type?: string;
  amount: number;
  rate?: number;
  description?: string;
  provider?: string;
  coverageType?: string;
  employeeContribution?: number;
  employerContribution?: number;
}

interface InsuranceData {
  payslipId: string;
  payslipPeriod?: string;
  insuranceDeductions: InsuranceDeduction[];
  totalInsurance: number;
}

export default function InsuranceDeductionsPage() {
  const { user } = useAuth();
  const [insuranceData, setInsuranceData] = useState<InsuranceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsuranceDeductions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await payrollTrackingService.getInsuranceDeductions(user.id);
        
        if (response?.error) {
          setError(response.error);
          return;
        }

        const data = response?.data || [];
        setInsuranceData(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Failed to load insurance deductions:', err);
        setError(err.message || 'Failed to load insurance deductions');
      } finally {
        setLoading(false);
      }
    };

    fetchInsuranceDeductions();
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

  const getTotalInsurance = () => {
    return insuranceData.reduce((sum, item) => sum + (item.totalInsurance || 0), 0);
  };

  const getInsuranceTypeIcon = (type?: string) => {
    if (!type) return '🏥';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('health')) return '🏥';
    if (lowerType.includes('pension') || lowerType.includes('retirement')) return '👴';
    if (lowerType.includes('unemployment')) return '💼';
    if (lowerType.includes('disability')) return '♿';
    if (lowerType.includes('life')) return '🛡️';
    return '🏥';
  };

  const getInsuranceTypeColor = (type?: string) => {
    if (!type) return 'bg-blue-100 text-blue-700';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('health')) return 'bg-green-100 text-green-700';
    if (lowerType.includes('pension')) return 'bg-purple-100 text-purple-700';
    if (lowerType.includes('unemployment')) return 'bg-orange-100 text-orange-700';
    return 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading insurance deductions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading insurance deductions</p>
        <p className="text-red-700 text-sm mt-2">{error}</p>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Back to Payroll Tracking
          </button>
        </Link>
      </div>
    );
  }

  const filteredData = selectedPayslip 
    ? insuranceData.filter(item => item.payslipId === selectedPayslip)
    : insuranceData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Insurance Deductions</h1>
          <p className="text-slate-600 mt-2">
            Itemized breakdown of insurance contributions (health, pension, unemployment, etc.)
          </p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Insurance Contributions</h2>
            <p className="text-4xl font-bold mt-2">{formatCurrency(getTotalInsurance())}</p>
            <p className="text-green-100 mt-1">
              Across {insuranceData.length} payslip{insuranceData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-6xl">🏥</div>
        </div>
      </div>

      {/* Payslip Filter */}
      {insuranceData.length > 1 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filter by Payslip:
          </label>
          <select
            value={selectedPayslip || ''}
            onChange={(e) => setSelectedPayslip(e.target.value || null)}
            className="w-full md:w-auto border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
          >
            <option value="">All Payslips</option>
            {insuranceData.map((item) => (
              <option key={item.payslipId} value={item.payslipId}>
                {item.payslipPeriod || `Payslip ${item.payslipId.slice(-8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Insurance Deductions List */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🏥</div>
          <p className="text-slate-700 font-medium text-lg">No insurance deductions found</p>
          <p className="text-slate-500 text-sm mt-2">
            Insurance deductions will appear here once payroll has been processed
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredData.map((item) => (
            <div key={item.payslipId} className="bg-white rounded-lg border border-slate-200 shadow-sm">
              {/* Payslip Header */}
              <div className="border-b border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {item.payslipPeriod || `Payslip ${item.payslipId.slice(-8)}`}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {item.insuranceDeductions.length} insurance type{item.insuranceDeductions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(item.totalInsurance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Insurance Details */}
              <div className="p-6 space-y-4">
                {item.insuranceDeductions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No insurance deductions for this payslip</p>
                  </div>
                ) : (
                  item.insuranceDeductions.map((insurance, index) => (
                    <div key={insurance._id || index} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">{getInsuranceTypeIcon(insurance.type || insurance.name)}</span>
                            <div>
                              <h4 className="font-semibold text-slate-900">{insurance.name}</h4>
                              {insurance.type && (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getInsuranceTypeColor(insurance.type)}`}>
                                  {insurance.type}
                                </span>
                              )}
                            </div>
                          </div>
                          {insurance.description && (
                            <p className="text-sm text-slate-600 mb-2">{insurance.description}</p>
                          )}
                          {insurance.provider && (
                            <p className="text-xs text-slate-500 mb-1">
                              Provider: <span className="font-medium">{insurance.provider}</span>
                            </p>
                          )}
                          {insurance.coverageType && (
                            <p className="text-xs text-slate-500 mb-1">
                              Coverage: <span className="font-medium">{insurance.coverageType}</span>
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-xs">
                            {insurance.employeeContribution !== undefined && (
                              <span className="text-slate-600">
                                Your Contribution: <span className="font-medium">{formatCurrency(insurance.employeeContribution)}</span>
                              </span>
                            )}
                            {insurance.employerContribution !== undefined && (
                              <span className="text-slate-600">
                                Employer Contribution: <span className="font-medium">{formatCurrency(insurance.employerContribution)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-red-600">
                            -{formatCurrency(insurance.amount)}
                          </p>
                          {insurance.rate !== undefined && (
                            <p className="text-sm text-slate-500">
                              Rate: {insurance.rate}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              {item.insuranceDeductions.length > 0 && (
                <div className="border-t border-slate-200 p-4 bg-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total Insurance Deductions</span>
                    <span className="text-xl font-bold text-red-600">
                      -{formatCurrency(item.totalInsurance)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-green-900 mb-2">Understanding Your Insurance Contributions</h4>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Insurance deductions provide you with health, pension, unemployment, and other protections</li>
              <li>Your contributions are matched or supplemented by employer contributions</li>
              <li>These contributions ensure you have coverage when needed</li>
              <li>If you have questions about your coverage, contact HR</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}