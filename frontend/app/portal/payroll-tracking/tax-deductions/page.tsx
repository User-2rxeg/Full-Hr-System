'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { payrollTrackingService } from '@/app/services/payroll-tracking';

/**
 * Tax Deductions View - Department Employee
 * REQ-PY-8: As an Employee, I want to see detailed tax deductions (income tax, social contributions, etc.) 
 *          along with the law or rule applied, so that I understand how my taxable salary is calculated.
 * BR 5: The system must identify the payroll income taxes' brackets enforced through Local Tax Law
 * BR 6: The system must support multiple tax components (e.g. income tax, exemptions)
 */

interface TaxComponent {
  type: string;
  name: string;
  description: string;
  rate: number;
  amount: number;
  minAmount?: number;
  maxAmount?: number;
}

interface TaxDetail {
  ruleName: string;
  description: string;
  configuredRatePct: number | null;
  calculatedAmount: number;
  taxableBase: number;
  effectiveRatePct: number | null;
  taxBracket?: string;
  lawReference?: string;
  taxComponents?: TaxComponent[];
  taxRuleId?: string;
  approvedAt?: string | null;
}

interface TaxDeductionData {
  payslipId: string;
  payslipPeriod?: string;
  totalTax: number;
  taxableBase: number;
  taxDetails: TaxDetail[];
  summary?: {
    totalTaxComponents: number;
    averageTaxRate: number;
  };
}

export default function TaxDeductionsPage() {
  const { user } = useAuth();
  const [taxData, setTaxData] = useState<TaxDeductionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaxDeductions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await payrollTrackingService.getTaxDeductions(user.id);
        
        if (response?.error) {
          setError(response.error);
          return;
        }

        const data = response?.data || [];
        setTaxData(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Failed to load tax deductions:', err);
        setError(err.message || 'Failed to load tax deductions');
      } finally {
        setLoading(false);
      }
    };

    fetchTaxDeductions();
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

  const getTotalTax = () => {
    return taxData.reduce((sum, item) => sum + (item.totalTax || 0), 0);
  };

  const getTaxBracketColor = (bracket?: string) => {
    if (!bracket) return 'bg-slate-100 text-slate-700';
    if (bracket.includes('High')) return 'bg-purple-100 text-purple-700';
    if (bracket.includes('Medium')) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tax deductions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-medium">Error loading tax deductions</p>
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
    ? taxData.filter(item => item.payslipId === selectedPayslip)
    : taxData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tax Deductions</h1>
          <p className="text-slate-600 mt-2">
            Detailed breakdown of tax deductions including income tax and social contributions with law references
          </p>
        </div>
        <Link href="/dashboard/department-employee/payroll-tracking">
          <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
            ← Back to Payroll Tracking
          </button>
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Total Tax Deductions</h2>
            <p className="text-4xl font-bold mt-2">{formatCurrency(getTotalTax())}</p>
            <p className="text-blue-100 mt-1">
              Across {taxData.length} payslip{taxData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-6xl">🏛️</div>
        </div>
      </div>

      {/* Payslip Filter */}
      {taxData.length > 1 && (
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
            {taxData.map((item) => (
              <option key={item.payslipId} value={item.payslipId}>
                {item.payslipPeriod || `Payslip ${item.payslipId.slice(-8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tax Deductions List */}
      {filteredData.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
          <div className="text-6xl mb-4"></div>
          <p className="text-slate-700 font-medium text-lg">No tax deductions found</p>
          <p className="text-slate-500 text-sm mt-2">
            Tax deductions will appear here once payroll has been processed
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
                      Taxable Base: {formatCurrency(item.taxableBase)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(item.totalTax)}
                    </p>
                    {item.summary && (
                      <p className="text-sm text-slate-500">
                        Avg Rate: {item.summary.averageTaxRate.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Details */}
              <div className="p-6 space-y-4">
                {item.taxDetails.map((tax, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{tax.ruleName}</h4>
                          {tax.taxBracket && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTaxBracketColor(tax.taxBracket)}`}>
                              {tax.taxBracket}
                            </span>
                          )}
                        </div>
                        {tax.description && (
                          <p className="text-sm text-slate-600 mb-2">{tax.description}</p>
                        )}
                        {tax.lawReference && (
                          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <span>📜</span>
                            <span>Law Reference: {tax.lawReference}</span>
                          </p>
                        )}
                        {tax.approvedAt && (
                          <p className="text-xs text-slate-500 mt-1">
                            Approved: {formatDate(tax.approvedAt)}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-red-600">
                          -{formatCurrency(tax.calculatedAmount)}
                        </p>
                        {tax.configuredRatePct !== null && (
                          <p className="text-sm text-slate-500">
                            Rate: {tax.configuredRatePct}%
                          </p>
                        )}
                        {tax.effectiveRatePct !== null && (
                          <p className="text-xs text-slate-400">
                            Effective: {tax.effectiveRatePct.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tax Components Breakdown (BR 6: Multiple tax components) */}
                    {tax.taxComponents && tax.taxComponents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-2">
                          Tax Components Breakdown:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {tax.taxComponents.map((component, compIndex) => (
                            <div key={compIndex} className="bg-slate-50 rounded p-2 text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-slate-900">{component.name}</p>
                                  <p className="text-slate-600">{component.description}</p>
                                  <p className="text-slate-500 mt-1">
                                    Type: {component.type.replace(/_/g, ' ')}
                                  </p>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="font-semibold text-red-600">
                                    {formatCurrency(component.amount)}
                                  </p>
                                  <p className="text-slate-500">{component.rate}%</p>
                                </div>
                              </div>
                              {(component.minAmount || component.maxAmount) && (
                                <p className="text-slate-400 mt-1 text-xs">
                                  Limits: {component.minAmount ? `Min: ${formatCurrency(component.minAmount)}` : ''}
                                  {component.minAmount && component.maxAmount ? ' | ' : ''}
                                  {component.maxAmount ? `Max: ${formatCurrency(component.maxAmount)}` : ''}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl"></span>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Understanding Your Tax Deductions</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Tax brackets are determined by your taxable income (BR 5)</li>
              <li>Multiple tax components (income tax, exemptions, surcharges) are calculated separately (BR 6)</li>
              <li>Law references indicate which tax regulations apply to your deductions</li>
              <li>If you have questions or believe there&apos;s an error, you can file a dispute</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}