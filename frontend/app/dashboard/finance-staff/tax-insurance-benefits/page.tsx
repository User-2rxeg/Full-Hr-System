'use client';

import { useState, useEffect } from 'react';
import {
  financeStaffService,
  TaxReport,
  InsuranceReport,
  BenefitsReport,
  PayslipHistoryReport,
  DepartmentalReport,
} from '@/app/services/finance-staff';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

/* ================= TYPES ================= */

type ReportTab = 'all' | 'tax' | 'insurance' | 'benefits' | 'payslip-history';

type GenerateReportType =
  | 'departmental'
  | 'tax'
  | 'payslip-history'
  | 'insurance'
  | 'benefits';

/* ================= COMPONENT ================= */

export default function TaxInsuranceBenefitsPage() {
  const { user } = useAuth();

  /* ================= STATE ================= */

  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [insuranceReports, setInsuranceReports] = useState<InsuranceReport[]>([]);
  const [benefitsReports, setBenefitsReports] = useState<BenefitsReport[]>([]);
  const [payslipHistoryReports, setPayslipHistoryReports] = useState<PayslipHistoryReport[]>([]);
  const [standardReports, setStandardReports] = useState<(TaxReport | InsuranceReport | BenefitsReport | PayslipHistoryReport | DepartmentalReport)[]>([]);

  const [activeTab, setActiveTab] = useState<ReportTab>('all');
  const [loading, setLoading] = useState(true);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateReportType, setGenerateReportType] =
    useState<GenerateReportType>('departmental');

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [summaryType, setSummaryType] = useState<'yearly' | 'monthly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear());

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<{
    type: 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'departmental';
    report: any;
  } | null>(null);

  const [departments, setDepartments] = useState<{ _id: string; name: string; code?: string }[]>([]);

  /* ================= AUTH ================= */

  if (
    !user?.role ||
    ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(
      user.role as SystemRole
    )
  ) {
    return <p className="text-center text-slate-500">Access denied</p>;
  }

  /* ================= LOAD DATA ================= */

  const fetchDepartments = async () => {
    try {
      const res = await payrollExecutionService.listDepartments();
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setDepartments(
          data.map((d: any) => ({
            _id: d._id?.toString?.() || d._id || '',
            name: d.name || d.departmentName || d.code || 'Unknown',
            code: d.code,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);

      // Helper functions to add reportType
      const transformTaxReport = (report: any) => ({ ...report, reportType: 'tax' });
      const transformInsuranceReport = (report: any) => ({ ...report, reportType: 'insurance' });
      const transformBenefitsReport = (report: any) => ({ ...report, reportType: 'benefits' });

      const [taxRes, insuranceRes, benefitsRes, payslipRes, deptRes] = await Promise.all([
        financeStaffService.getTaxReports(),
        financeStaffService.getInsuranceReports(),
        financeStaffService.getBenefitsReports(),
        financeStaffService.getPayslipHistory(),
        financeStaffService.getDepartmentalReports(),
      ]);

      // Merge with locally saved reports to persist generated ones
      const savedLocalReports = JSON.parse(localStorage.getItem('financeStaffLocalReports') || '[]') as any[];

      // ONLY show user-generated reports from local storage to avoid "ghost" systems reports
      // This fulfills: "ONLY THE USER A PERSON GENERATE THE REPORT"
      setStandardReports(savedLocalReports);

      // Update individual tab states 
      setTaxReports(savedLocalReports.filter((r: any) => (r.reportType === 'tax' || 'totalTaxWithheld' in r)));
      setInsuranceReports(savedLocalReports.filter((r: any) => (r.reportType === 'insurance' || 'totalContributions' in r)));
      setBenefitsReports(savedLocalReports.filter((r: any) => (r.reportType === 'benefits' || 'totalBenefits' in r)));
      setPayslipHistoryReports(savedLocalReports.filter((r: any) => (r.reportType === 'payslip-history' || (r as any).reportType === 'payroll-summary')));
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchDepartments(), loadReports()]);
    };
    loadData();
  }, []);

  // Persist generated reports that are local
  useEffect(() => {
    // Only save if we are not loading (initial fetch is done)
    if (!loading) {
      const localReports = standardReports.filter(r => (r as any).isLocal);
      localStorage.setItem('financeStaffLocalReports', JSON.stringify(localReports));
    }
  }, [standardReports, loading]);

  // Persist generated reports that are local
  useEffect(() => {
    // Only save if we are not loading (initial fetch is done)
    if (!loading) {
      const localReports = standardReports.filter(r => (r as any).isLocal);
      localStorage.setItem('financeStaffLocalReports', JSON.stringify(localReports));
    }
  }, [standardReports, loading]);

  /* ================= GENERATE ================= */

  const handleGenerateReport = async () => {
    setError(null);
    setSuccessMessage(null);

    try {
      // Input validation
      if (generateReportType === 'departmental' && !selectedDepartment) {
        throw new Error('Please select a department');
      }
      if (
        (generateReportType === 'departmental' ||
          generateReportType === 'tax' ||
          generateReportType === 'payslip-history' ||
          generateReportType === 'insurance' ||
          generateReportType === 'benefits') &&
        (!startDate || !endDate)
      ) {
        throw new Error('Please select both start and end dates');
      }

      // Generate report based on type
      switch (generateReportType) {
        case 'departmental': {
          const period = `${startDate}_${endDate}`;
          const reportData = {
            reportType: 'departmental',
            departmentId: selectedDepartment,
            startDate,
            endDate
          };
          const response = await financeStaffService.generateDepartmentalReport(reportData);
          if (response.data) {
            const data = Array.isArray(response.data) ? response.data : [response.data];
            const withIds = data.map((r: any) => ({
              ...r,
              id: r.id || r._id || `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              reportType: 'departmental',
              period, // Add period for display
              startDate,
              endDate,
              generatedAt: r.generatedAt || new Date().toISOString(),
              isLocal: true
            }));
            setStandardReports(prev => {
              const updated = [...withIds, ...prev];
              localStorage.setItem('financeStaffLocalReports', JSON.stringify(updated.filter(r => (r as any).isLocal)));
              return updated;
            });
          }
          break;
        }
        case 'tax': {
          const period = `${startDate}_${endDate}`;
          const taxResponse = await financeStaffService.generateTaxReport(period);
          if (taxResponse.data) {
            const data = Array.isArray(taxResponse.data) ? taxResponse.data : [taxResponse.data];
            const withIds = data.map((r: any) => {
              const newTaxReport = {
                ...r,
                reportType: 'tax',
                period,
                startDate,
                endDate,
                generatedAt: r.generatedAt || new Date().toISOString(),
                isLocal: true
              }; // Add period for display
              delete (newTaxReport as any).departmentId;
              delete (newTaxReport as any).departmentName;
              if (!newTaxReport.id && !newTaxReport._id) {
                newTaxReport.id = `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              }
              return newTaxReport;
            });
            setTaxReports(prev => [...withIds, ...prev]);
            setStandardReports(prev => {
              const updated = [...withIds, ...prev];
              localStorage.setItem('financeStaffLocalReports', JSON.stringify(updated.filter(r => (r as any).isLocal)));
              return updated;
            });
          }
          break;
        }
        case 'payslip-history': {
          const period = `${startDate}_${endDate}`;
          const payslipResponse = await financeStaffService.generatePayslipHistoryReport(period);
          if (payslipResponse.data) {
            const data = Array.isArray(payslipResponse.data) ? payslipResponse.data : [payslipResponse.data];
            const withIds = data.map((r: any) => ({
              ...r,
              id: r.id || r._id || `payslip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              reportType: 'payslip-history',
              period, // Add period for display
              startDate,
              endDate,
              generatedAt: r.generatedAt || new Date().toISOString(),
              isLocal: true
            }));
            setPayslipHistoryReports(prev => [...withIds, ...prev]);
            setStandardReports(prev => {
              const updated = [...withIds, ...prev];
              localStorage.setItem('financeStaffLocalReports', JSON.stringify(updated.filter(r => (r as any).isLocal)));
              return updated;
            });
          }
          break;
        }

        case 'insurance': {
          const period = `${startDate}_${endDate}`;
          const insuranceResponse = await financeStaffService.generateInsuranceReport(period);
          if (insuranceResponse.data) {
            const data = Array.isArray(insuranceResponse.data) ? insuranceResponse.data : [insuranceResponse.data];
            const withIds = data.map((r: any) => {
              const timestamp = r.generatedAt || r.generatedDate || '';
              const idSuffix = timestamp ? `_${new Date(timestamp).getTime()}` : '';
              const uniqueRandom = Math.random().toString(36).substr(2, 9);
              return {
                ...r,
                id: r.id || r._id || `ins_${new Date().getFullYear()}_${r.employeeCount || 0}_${r.totalContributions || 0}${idSuffix}_${uniqueRandom}`,
                reportType: 'insurance',
                period: r.period || period, // Ensure period is set
                startDate: r.startDate || startDate,
                endDate: r.endDate || endDate,
                generatedAt: r.generatedAt || r.generatedDate || new Date().toISOString(),
                isLocal: true
              };
            });
            setInsuranceReports(prev => [...withIds, ...prev]);
            setStandardReports(prev => {
              const updated = [...withIds, ...prev];
              localStorage.setItem('financeStaffLocalReports', JSON.stringify(updated.filter(r => (r as any).isLocal)));
              return updated;
            });
          }
          break;
        }
        case 'benefits': {
          const period = `${startDate}_${endDate}`;
          const benefitsResponse = await financeStaffService.generateBenefitsReport(period);
          if (benefitsResponse.data) {
            const data = Array.isArray(benefitsResponse.data) ? benefitsResponse.data : [benefitsResponse.data];
            const withIds = data.map((r: any) => {
              const timestamp = r.generatedAt || r.generatedDate || '';
              const idSuffix = timestamp ? `_${new Date(timestamp).getTime()}` : '';
              const uniqueRandom = Math.random().toString(36).substr(2, 9);
              return {
                ...r,
                id: r.id || r._id || `ben_${new Date().getFullYear()}_${r.employeeCount || 0}_${r.totalBenefits || 0}${idSuffix}_${uniqueRandom}`,
                reportType: 'benefits',
                period: r.period || period, // Ensure period is set
                startDate: r.startDate || startDate,
                endDate: r.endDate || endDate,
                generatedAt: r.generatedAt || r.generatedDate || new Date().toISOString(),
                isLocal: true
              };
            });
            setBenefitsReports(prev => [...withIds, ...prev]);
            setStandardReports(prev => {
              const updated = [...withIds, ...prev];
              localStorage.setItem('financeStaffLocalReports', JSON.stringify(updated.filter(r => (r as any).isLocal)));
              return updated;
            });
          }
          break;
        }
      }
      setSuccessMessage('Report generated successfully and saved locally');
      setShowGenerateModal(false);
      resetModal();
      // Do not reload reports immediately as backend might not persist them instantly
      // The state is already updated optimally above
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    }
  };

  const handleDeleteReport = async (reportId: string, reportType: 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'departmental') => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      // Remove from state, the useEffect will handle persisting to localStorage
      setStandardReports(prev => prev.filter(r => r.id !== reportId));

      // Also update individual tab states
      setTaxReports(prev => prev.filter(r => r.id !== reportId));
      setInsuranceReports(prev => prev.filter(r => r.id !== reportId));
      setBenefitsReports(prev => prev.filter(r => r.id !== reportId));
      setPayslipHistoryReports(prev => prev.filter(r => r.id !== reportId));

      setSelectedReport(null);
      setSuccessMessage('Report deleted successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete report');
    }
  };

  const handleViewReport = (report: any, type: 'tax' | 'insurance' | 'benefits' | 'payslip-history' | 'departmental') => {
    setSelectedReport({ type, report });
  };

  const handleDownload = async (report: any, type: string) => {
    try {
      const generateCSV = (data: any, reportType: string) => {
        const headers: string[] = ['ID', 'Period', 'Generated At'];
        const values: any[] = [data.id, data.period, data.generatedAt];

        // Add specific headers based on report type
        if (reportType === 'tax') {
          headers.push('Total Tax Withheld', 'Employee Count');
          values.push(data.totalTaxWithheld, data.employeeCount);
        } else if (reportType === 'insurance') {
          headers.push('Total Contributions', 'Employee Count');
          values.push(data.totalContributions, data.employeeCount);
        } else if (reportType === 'benefits') {
          headers.push('Total Benefits', 'Employee Count');
          values.push(data.totalBenefits, data.employeeCount);
        } else if (reportType === 'payslip-history') {
          headers.push('Total Gross Pay', 'Total Net Pay', 'Employee Count');
          values.push(data.totalGrossPay, data.totalNetPay, data.employeeCount);
        } else if (reportType === 'departmental') {
          headers.push('Department', 'Total Gross', 'Total Net', 'Total Taxes');
          values.push(data.departmentName || '-', data.totalGrossPay, data.totalNetPay, data.totalTaxes);
        }

        const csvContent = [
          headers.join(','),
          values.join(',')
        ].join('\n');

        return new Blob([csvContent], { type: 'text/csv' });
      };

      setError(null);
      setSuccessMessage('Preparing download...');

      // Treat all reports as final for download
      const blob = generateCSV(report, type);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filename = `${type}-report-${report.id}.csv`;
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage('Report downloaded successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to generate download');
    }
  };

  const resetModal = () => {
    setSelectedDepartment('');
    setStartDate('');
    setEndDate('');
    setYear(new Date().getFullYear());
    setSummaryType('monthly');
    setGenerateReportType('departmental');
  };

  /* ================= UI ================= */

  // Helper to get entity name for a report
  function getEntity(report: any) {
    return report.entity || report.departmentName || report.department || report.entityName || report.name || '-';
  }

  // Combine all reports into one array for display
  const allReports = standardReports;

  // Filter reports based on active tab
  const filteredReports = standardReports.filter(report => {
    if (activeTab === 'tax') return (report as any).reportType === 'tax' || 'totalTaxWithheld' in report;
    if (activeTab === 'insurance') return (report as any).reportType === 'insurance' || 'totalContributions' in report;
    if (activeTab === 'benefits') return (report as any).reportType === 'benefits' || 'totalBenefits' in report;
    if (activeTab === 'payslip-history') return (report as any).reportType === 'payslip-history' || 'totalPayslips' in report;
    return true; // 'all' (if we added it) or default
  });

  const tabs: { id: ReportTab | 'all'; label: string }[] = [
    { id: 'all' as any, label: 'All Reports' },
    { id: 'tax', label: 'Tax' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'payslip-history', label: 'Payslip History' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>
      {successMessage && <div className="bg-green-100 p-3 rounded-lg text-green-800 mb-4">{successMessage}</div>}
      {error && <div className="bg-red-100 p-3 rounded-lg text-red-800 mb-4">{error}</div>}

      <div className="flex justify-between items-center mb-6">
        <p className="text-white">Generate and manage compliance reports</p>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Generate Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredReports.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white/5 rounded-xl border-2 border-dashed border-white/10 text-white/50">
            No reports found for this category.
          </div>
        ) : (
          filteredReports.map((report, idx) => {
            // Determine report type
            const isTax = 'totalTaxWithheld' in report || (report as any).reportType === 'tax';
            const isInsurance = 'totalContributions' in report || (report as any).reportType === 'insurance';
            const isBenefits = 'totalBenefits' in report || (report as any).reportType === 'benefits';
            const isPayslip = 'totalPayslips' in report || (report as any).reportType === 'payslip-history';
            const isDept = (report as any).reportType === 'departmental' || (!isTax && !isInsurance && !isBenefits && !isPayslip);

            let typeLabel = 'Report';
            let badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';

            if (isTax) {
              typeLabel = 'Tax';
              badgeClass = 'bg-purple-100 text-purple-700 border-purple-200';
            } else if (isInsurance) {
              typeLabel = 'Insurance';
              badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
            } else if (isBenefits) {
              typeLabel = 'Benefits';
              badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
            } else if (isPayslip) {
              typeLabel = 'Payslip';
              badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
            } else if (isDept) {
              typeLabel = 'Departmental';
              badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
            }

            // Format period
            const reportStartDate = (report as any).startDate;
            const reportEndDate = (report as any).endDate;
            // Always prioritize startDate/endDate for the title, fallback to period
            let periodDisplay = (reportStartDate && reportEndDate) ? `${reportStartDate}_${reportEndDate}` : (report.period || '-');

            if (periodDisplay.includes('_')) {
              const [start, end] = periodDisplay.split('_');
              try {
                // Ensure we have valid date strings
                if (start && end) {
                  const startDateObj = new Date(start);
                  const endDateObj = new Date(end);

                  // Format nicely: "MMM D, YYYY - MMM D, YYYY"
                  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
                  periodDisplay = `${startDateObj.toLocaleDateString(undefined, options)} - ${endDateObj.toLocaleDateString(undefined, options)}`;
                }
              } catch {
                // Fallback to basic format if dates invalid
              }
            } else if (reportStartDate && reportEndDate) {
              try {
                const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
                periodDisplay = `${new Date(reportStartDate).toLocaleDateString(undefined, options)} - ${new Date(reportEndDate).toLocaleDateString(undefined, options)}`;
              } catch { }
            }

            // Metrics
            const entityName = getEntity(report);
            const employeeCount = report.employeeCount || (report as any).totalEmployees || 0;
            const amount = 'totalTaxWithheld' in report ? report.totalTaxWithheld
              : 'totalContributions' in report ? report.totalContributions
                : 'totalBenefits' in report ? report.totalBenefits
                  : 'totalGrossPay' in report ? report.totalGrossPay
                    : 0;

            const typeKey = isTax ? 'tax' : isInsurance ? 'insurance' : isBenefits ? 'benefits' : isPayslip ? 'payslip-history' : 'departmental';

            return (
              <div
                key={`${typeKey}-${report.id}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative"
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReport(report.id, typeKey as any);
                  }}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete Report"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3 pr-8">
                    <span className="font-bold text-lg text-slate-900">{periodDisplay}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Entity:</span>
                      <span className="font-medium text-slate-900">{entityName}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Employees:</span>
                      <span className="font-medium text-slate-900">{employeeCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Total Amount:</span>
                      <span className="font-bold text-slate-900">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${badgeClass}`}>
                      {typeLabel}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewReport(report, typeKey as any)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDownload(report, typeKey)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download CSV"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Generate Modal and View Modal remain unchanged */}

      {/* ================= MODAL ================= */}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Generate Report</h3>

            {/* Report Type */}
            <select
              className="w-full border p-2 rounded text-slate-900 bg-white"
              value={generateReportType}
              onChange={(e) =>
                setGenerateReportType(e.target.value as GenerateReportType)
              }
            >
              <option value="departmental">Departmental</option>
              <option value="tax">Tax Report</option>
              <option value="payslip-history">Payslip History</option>
              <option value="insurance">Insurance</option>
              <option value="benefits">Benefits</option>
            </select>

            {/* Departmental */}
            {generateReportType === 'departmental' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  className="w-full border p-2 rounded text-slate-900 bg-white"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Report Types that use Date Range */}
            {(generateReportType === 'tax' ||
              generateReportType === 'departmental' ||
              generateReportType === 'payslip-history' ||
              generateReportType === 'insurance' ||
              generateReportType === 'benefits') && (
                <DateRange
                  startDate={startDate}
                  endDate={endDate}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                />
              )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetModal();
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={
                  (generateReportType === 'departmental' && (!selectedDepartment || !startDate || !endDate)) ||
                  ((generateReportType === 'tax' || generateReportType === 'payslip-history') && (!startDate || !endDate)) ||
                  ((generateReportType === 'insurance' || generateReportType === 'benefits') && !startDate)
                }
                onClick={handleGenerateReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW REPORT MODAL ================= */}

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Report Details</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => handleDeleteReport(selectedReport.report.id, selectedReport.type)}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-base text-slate-900">
                    {(() => {
                      let period = selectedReport.report.period || '-';
                      if (period.includes('_')) {
                        const [start, end] = period.split('_');
                        try {
                          if (start && end) {
                            const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
                            return `${new Date(start).toLocaleDateString(undefined, options)} - ${new Date(end).toLocaleDateString(undefined, options)}`;
                          }
                        } catch { }
                      }
                      return period;
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Employees</label>
                  <p className="text-base text-slate-900">{selectedReport.report.employeeCount || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Generated At</label>
                  <p className="text-base text-slate-900">
                    {(() => {
                      const d = selectedReport.report.generatedAt;
                      if (!d) return 'N/A';
                      const dateObj = new Date(d);
                      return isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleString();
                    })()}
                  </p>
                </div>
              </div>

              {selectedReport.type === 'tax' && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Tax Summary</h4>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Tax Withheld</label>
                    <p className="text-lg font-semibold text-slate-900">${((selectedReport.report as TaxReport).totalTaxWithheld || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {selectedReport.type === 'insurance' && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Insurance Summary</h4>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Contributions</label>
                    <p className="text-lg font-semibold text-slate-900">${((selectedReport.report as InsuranceReport).totalContributions || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {selectedReport.type === 'benefits' && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Benefits Summary</h4>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Benefits</label>
                    <p className="text-lg font-semibold text-slate-900">${((selectedReport.report as BenefitsReport).totalBenefits || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {selectedReport.type === 'payslip-history' && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Payslip Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-500">Total Payslips</label>
                      <p className="text-lg font-semibold text-slate-900">{((selectedReport.report as PayslipHistoryReport).totalPayslips || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Total Gross Pay</label>
                      <p className="text-lg font-semibold text-slate-900">${((selectedReport.report as PayslipHistoryReport).totalGrossPay || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-500">Total Net Pay</label>
                      <p className="text-lg font-semibold text-slate-900">${((selectedReport.report as PayslipHistoryReport).totalNetPay || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPER ================= */

function DateRange({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: {
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
        <input
          type="date"
          className="w-full border p-2 rounded text-slate-900 bg-white"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
        <input
          type="date"
          className="w-full border p-2 rounded text-slate-900 bg-white"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
    </div>
  );
}
