'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { payrollSpecialistService, DepartmentalReport, ReportFilters, PayrollSummaryReport, type Department } from '@/app/services/payroll-specialist';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

type ReportType = 'summary' | 'tax' | 'payslip';
type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export default function DepartmentalReportsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DepartmentalReport[]>([]);
  const [summaryReports, setSummaryReports] = useState<PayrollSummaryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [departments, setDepartments] = useState<{ _id: string; name: string; code?: string }[]>([]);
  const [allDepartments, setAllDepartments] = useState<{ _id: string; name: string; code?: string }[]>([]);
  const [selectedReport, setSelectedReport] = useState<DepartmentalReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const allowedRoles = [SystemRole.PAYROLL_SPECIALIST, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  // Load reports from localStorage on mount (filter deleted ones)
  useEffect(() => {
    const savedReports = localStorage.getItem('departmentalReports');
    const deletedReports = JSON.parse(localStorage.getItem('deletedDepartmentalReports') || '[]') as string[];
    if (savedReports) {
      try {
        const parsed = JSON.parse(savedReports);
        const filtered = Array.isArray(parsed) ? parsed.filter((r: any) => !deletedReports.includes(r.id)) : parsed;
        setReports(filtered);
      } catch (error) {
        console.error('Failed to load saved reports:', error);
      }
    }
  }, []);

  // Save reports to localStorage whenever they change (excluding deleted ones)
  useEffect(() => {
    const deletedReports = JSON.parse(localStorage.getItem('deletedDepartmentalReports') || '[]') as string[];
    const reportsToSave = reports.filter(r => !deletedReports.includes(r.id));
    if (reportsToSave.length > 0) {
      localStorage.setItem('departmentalReports', JSON.stringify(reportsToSave));
    }
  }, [reports]);

  const [generateForm, setGenerateForm] = useState<{
    departmentId: string;
    period: string;
    reportType: string;
    startDate: string;
    endDate: string;
  }>({ departmentId: '', period: '', reportType: 'departmental', startDate: '', endDate: '' });
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Enhanced form state for new report types
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [currentReport, setCurrentReport] = useState<any>(null);

  // State for payslip summary options
  const [payslipSummaryType, setPayslipSummaryType] = useState<'yearly' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // State for summary card slides (tracks which slide is active for each summary report)
  const [summarySlides, setSummarySlides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) return;

    const authorized = !!hasAccess;
    setIsAuthorized(authorized);

    if (!authorized) {
      router.push('/unauthorized');
      return;
    }

    const loadData = async () => {
      try {
        await Promise.all([fetchDepartments(), loadReports()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  const fetchDepartments = async () => {
    try {
      const res = await payrollExecutionService.listDepartments();
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setAllDepartments(data);
        // Deduplicate departments based on name
        const uniqueDepts = new Map();
        data.forEach((d: any) => {
          const name = d.name || d.departmentName || d.code || 'Unknown';
          if (!uniqueDepts.has(name)) {
            uniqueDepts.set(name, {
              _id: d._id?.toString?.() || d._id || '',
              name: name,
              code: d.code,
            });
          }
        });

        setDepartments(Array.from(uniqueDepts.values()));
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      // Get deleted report IDs from localStorage
      const deletedReportsKey = 'deletedDepartmentalReports';
      const deletedReports = JSON.parse(localStorage.getItem(deletedReportsKey) || '[]') as string[];

      const [deptResponse, summaryResponse] = await Promise.all([
        payrollSpecialistService.getDepartmentalReports(filters),
        payrollSpecialistService.getPayrollSummaryReports(),
      ]);

      // Filter out deleted reports
      if (deptResponse.data) {
        const filteredReports = Array.isArray(deptResponse.data)
          ? deptResponse.data.filter((r: any) => !deletedReports.includes(r.id))
          : deptResponse.data;
        setReports(filteredReports);
      }
      if (summaryResponse.data) setSummaryReports(summaryResponse.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);

      const { reportType, departmentId, startDate, endDate } = generateForm;

      // Build period string for display
      const buildPeriodString = () => {
        if (reportType === 'payslip-summary') {
          if (payslipSummaryType === 'yearly') {
            return `Year ${selectedYear}`;
          } else {
            return startDate ? new Date(startDate + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'Current Month';
          }
        }
        if (startDate && endDate) {
          return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
        }
        return 'All Time';
      };

      let newReport: any = null;

      if (reportType === 'departmental') {
        // Departmental report - requires department selection
        if (!departmentId) {
          throw new Error('Please select a department for departmental reports');
        }

        const department = allDepartments.find(d => d._id === departmentId || d._id?.toString() === departmentId);

        const reportData: any = {
          reportType: reportType,
          departmentId: departmentId,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        };

        try {
          const response = await payrollSpecialistService.generateDepartmentalReport(reportData);
          const responseData: any = response.data || response;

          if (responseData.reports && Array.isArray(responseData.reports) && responseData.reports.length > 0) {
            const processedReports = responseData.reports.map((r: any) => {
              r.reportType = 'departmental';
              if (r.departmentId) {
                const dept = allDepartments.find(d => d._id === r.departmentId || d._id?.toString() === r.departmentId?.toString());
                if (dept) {
                  r.departmentName = dept.name;
                  r.costCenter = dept.code || '';
                }
              }
              return r;
            }).filter((r: any) => r !== null && r.departmentName && r.departmentName !== 'Unknown');

            if (processedReports.length > 0) {
              setReports(prev => [...processedReports, ...prev]);
            }
          } else if (department) {
            newReport = {
              id: `report_${Date.now()}`,
              reportType: 'departmental',
              departmentId: departmentId,
              departmentName: department.name,
              period: buildPeriodString(),
              totalEmployees: responseData.totalEmployees || 0,
              totalGrossPay: responseData.totalGrossPay || 0,
              totalNetPay: responseData.totalNetPay || 0,
              totalDeductions: responseData.totalDeductions || 0,
              totalTaxes: responseData.totalTaxes || 0,
              averageSalary: responseData.averageSalary || 0,
              status: 'draft',
              generatedAt: new Date().toISOString(),
              costCenter: department.code || ''
            };
          }
        } catch (apiError) {
          // Create a placeholder report if API fails
          if (department) {
            newReport = {
              id: `report_${Date.now()}`,
              reportType: 'departmental',
              departmentId: departmentId,
              departmentName: department.name,
              period: buildPeriodString(),
              totalEmployees: 0,
              totalGrossPay: 0,
              totalNetPay: 0,
              totalDeductions: 0,
              totalTaxes: 0,
              averageSalary: 0,
              status: 'draft',
              generatedAt: new Date().toISOString(),
              costCenter: department.code || ''
            };
          }
        }

      } else if (reportType === 'tax') {
        // Tax report - fetches from taxRules schema via compliance report
        if (!startDate || !endDate) {
          throw new Error('Please select start and end dates for tax reports');
        }

        try {
          const response = await payrollSpecialistService.generateTaxReport({
            startDate,
            endDate
          });
          const responseData: any = response.data || response;

          // Response format from /payroll/tracking/reports/compliance?type=tax
          // { reportType, year, generatedDate, totalEmployees, totalTaxCollected, employeeTaxDetails }
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'tax',
            departmentId: '',
            departmentName: 'All Departments',
            period: buildPeriodString(),
            totalEmployees: responseData.totalEmployees || Object.keys(responseData.employeeTaxDetails || {}).length || 0,
            totalGrossPay: 0,
            totalNetPay: responseData.totalTaxCollected || 0,
            totalDeductions: responseData.totalTaxCollected || 0,
            totalTaxes: responseData.totalTaxCollected || 0,
            averageSalary: 0,
            status: 'final',
            generatedAt: responseData.generatedDate || new Date().toISOString(),
            costCenter: ''
          };
        } catch (apiError) {
          console.error('Tax report API error:', apiError);
          // Create placeholder tax report
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'tax',
            departmentId: '',
            departmentName: 'All Departments',
            period: buildPeriodString(),
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            averageSalary: 0,
            status: 'draft',
            generatedAt: new Date().toISOString(),
            costCenter: ''
          };
        }

      } else if (reportType === 'payslip-history') {
        // Payslip History report - fetches from payslip schema
        if (!startDate || !endDate) {
          throw new Error('Please select start and end dates for payslip history reports');
        }

        try {
          const response = await payrollSpecialistService.generatePaySlipHistoryReport({
            startDate,
            endDate
          });
          const responseData: any = response.data || response;

          // Response format from /payroll/tracking/reports/department-payroll
          // { success, data, reports: [...], reportType, generatedDate }
          // Each report contains: totalEmployees, totalGrossPay, totalNetPay, totalDeductions, etc.
          const reportsArray = responseData.reports || [];
          const firstReport = reportsArray[0] || responseData.data || {};

          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'payslip',
            departmentId: firstReport.departmentId || '',
            departmentName: firstReport.departmentName || 'All Departments',
            period: buildPeriodString(),
            totalEmployees: firstReport.totalEmployees || reportsArray.reduce((sum: number, r: any) => sum + (r.totalEmployees || 0), 0) || 0,
            totalGrossPay: firstReport.totalGrossPay || reportsArray.reduce((sum: number, r: any) => sum + (r.totalGrossPay || 0), 0) || 0,
            totalNetPay: firstReport.totalNetPay || reportsArray.reduce((sum: number, r: any) => sum + (r.totalNetPay || 0), 0) || 0,
            totalDeductions: firstReport.totalDeductions || 0,
            totalTaxes: firstReport.totalTaxes || 0,
            averageSalary: firstReport.averageSalary || 0,
            status: 'final',
            generatedAt: responseData.generatedDate || new Date().toISOString(),
            costCenter: ''
          };
        } catch (apiError) {
          console.error('Payslip history report API error:', apiError);
          // Create placeholder payslip report
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'payslip',
            departmentId: '',
            departmentName: 'All Departments',
            period: buildPeriodString(),
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            averageSalary: 0,
            status: 'draft',
            generatedAt: new Date().toISOString(),
            costCenter: ''
          };
        }

      } else if (reportType === 'payslip-summary') {
        // Payslip Summary report - combines tax data + payslip history from both schemas
        const summaryFilters: any = {};
        let yearForTax = new Date().getFullYear();

        if (payslipSummaryType === 'yearly') {
          summaryFilters.startDate = `${selectedYear}-01-01`;
          summaryFilters.endDate = `${selectedYear}-12-31`;
          summaryFilters.periodType = 'yearly';
          yearForTax = selectedYear;
        } else if (startDate) {
          const monthDate = new Date(startDate + '-01');
          const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          summaryFilters.startDate = `${startDate}-01`;
          summaryFilters.endDate = lastDay.toISOString().split('T')[0];
          summaryFilters.periodType = 'monthly';
          yearForTax = monthDate.getFullYear();
        }

        try {
          // Fetch both tax data and payslip summary in parallel
          const [payrollSummaryResponse, taxResponse] = await Promise.all([
            payrollSpecialistService.generateStandardPayrollSummary(summaryFilters),
            payrollSpecialistService.generateTaxReport({ startDate: summaryFilters.startDate, endDate: summaryFilters.endDate })
          ]);

          const payrollData: any = payrollSummaryResponse.data || payrollSummaryResponse;
          const taxData: any = taxResponse.data || taxResponse;

          // Extract payroll summary
          const summary = payrollData.summary || {};

          // Extract tax summary
          const taxSummary = {
            totalTaxCollected: taxData.totalTaxCollected || 0,
            totalTaxEmployees: taxData.totalEmployees || Object.keys(taxData.employeeTaxDetails || {}).length || 0,
            taxYear: taxData.year || yearForTax,
            employeeTaxDetails: taxData.employeeTaxDetails || {}
          };

          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'summary',
            departmentId: '',
            departmentName: 'All Departments',
            period: payrollData.period || buildPeriodString(),
            totalEmployees: summary.totalEmployees || payrollData.totalEmployees || 0,
            totalGrossPay: summary.totalGross || payrollData.totalGrossPay || 0,
            totalNetPay: summary.totalNet || payrollData.totalNetPay || 0,
            totalDeductions: (summary.totalTax || taxSummary.totalTaxCollected || 0) + (summary.totalInsurance || 0) + (summary.totalPenalties || 0),
            totalTaxes: summary.totalTax || taxSummary.totalTaxCollected || 0,
            averageSalary: summary.totalEmployees > 0 ? (summary.totalGross / summary.totalEmployees) : 0,
            status: 'final',
            generatedAt: payrollData.generatedDate || new Date().toISOString(),
            costCenter: '',
            // Extended data for combined view
            summaryData: {
              // Payslip data
              totalPayslips: summary.totalPayslips || 0,
              totalInsurance: summary.totalInsurance || 0,
              totalPenalties: summary.totalPenalties || 0,
              byDepartment: payrollData.byDepartment || {},
              // Tax data
              taxYear: taxSummary.taxYear,
              totalTaxCollected: taxSummary.totalTaxCollected,
              taxEmployeeCount: taxSummary.totalTaxEmployees,
              employeeTaxBreakdown: Object.keys(taxSummary.employeeTaxDetails).length
            }
          };
        } catch (apiError) {
          console.error('Payslip summary report API error:', apiError);
          // Create placeholder summary report
          newReport = {
            id: `report_${Date.now()}`,
            reportType: 'summary',
            departmentId: '',
            departmentName: 'All Departments',
            period: buildPeriodString(),
            totalEmployees: 0,
            totalGrossPay: 0,
            totalNetPay: 0,
            totalDeductions: 0,
            totalTaxes: 0,
            averageSalary: 0,
            status: 'draft',
            generatedAt: new Date().toISOString(),
            costCenter: '',
            summaryData: null
          };
        }
      }

      // Add the new report to the list
      if (newReport) {
        setReports(prev => [newReport, ...prev]);
      }

      setShowGenerateModal(false);
      resetGenerateForm();
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const resetGenerateForm = () => {
    setGenerateForm({
      departmentId: '',
      period: '',
      reportType: 'departmental',
      startDate: '',
      endDate: ''
    });
    setPayslipSummaryType('monthly');
    setSelectedYear(new Date().getFullYear());
  };

  const handleDownloadReport = async (reportId: string, format: 'pdf' | 'excel' = 'pdf') => {
    try {
      const response = await payrollSpecialistService.exportReport(reportId, format);
      if (response.data) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payroll-report-${reportId}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      // Get deleted reports from localStorage
      const deletedReportsKey = 'deletedDepartmentalReports';
      const deletedReports = JSON.parse(localStorage.getItem(deletedReportsKey) || '[]') as string[];

      // Add this report ID to deleted list
      if (!deletedReports.includes(reportId)) {
        deletedReports.push(reportId);
        localStorage.setItem(deletedReportsKey, JSON.stringify(deletedReports));
      }

      // Remove from local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const displayedReports = reports.filter(report => {
    // Filter by Report Type
    if (filters.reportType && report.reportType !== filters.reportType) {
      return false;
    }

    // Filter by Period
    if (filters.period && !report.period?.includes(filters.period)) {
      return false;
    }

    // Filter by Department - only if in departmental mode
    if (filters.reportType === 'departmental' && filters.departmentId) {
      const selectedDept = departments.find(d => d._id === filters.departmentId);
      // Match by name if possible (to catch duplicates), otherwise fallback to ID
      if (selectedDept && report.departmentName) {
        if (report.departmentName !== selectedDept.name) return false;
      } else if (report.departmentId !== filters.departmentId) {
        return false;
      }
    }

    return true;
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Specialist role required.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Payroll Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              value={filters.reportType || 'all'}
              onChange={(e) => {
                const val = e.target.value === 'all' ? undefined : e.target.value;
                setFilters(prev => ({
                  ...prev,
                  reportType: val as ReportFilters['reportType'],
                  departmentId: undefined // Clear department when changing report type
                }));
              }}
            >
              <option value="all">All Types</option>
              <option value="departmental">Departmental</option>
              <option value="tax">Tax</option>
              <option value="payslip">Payslip</option>
              <option value="summary">Summary</option>
            </select>
          </div>
          {filters.reportType === 'departmental' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                value={filters.departmentId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, departmentId: e.target.value }))}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={loadReports}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Generated Reports - Card Grid Layout */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Generated Reports</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 ml-3">Loading reports...</p>
          </div>
        ) : displayedReports.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No reports found</h3>
            <p className="mt-2 text-sm text-slate-500">Get started by generating a new report.</p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedReports.map((report, index: number) => {
              // Determine report type badge styling
              const getTypeBadge = () => {
                const reportType = (report as any).reportType || 'departmental';
                switch (reportType) {
                  case 'tax':
                    return { label: 'Tax', bgColor: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-200' };
                  case 'payslip':
                  case 'payslip-history':
                    return { label: 'Payslip', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200' };
                  case 'summary':
                  case 'payslip-summary':
                    return { label: 'Summary', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' };
                  default:
                    return { label: 'Departmental', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' };
                }
              };

              const typeBadge = getTypeBadge();

              // Format the period/date for display
              const formatPeriod = () => {
                if (report.period) {
                  // Try to parse and format the period nicely
                  try {
                    if (report.period.includes('T')) {
                      return report.period.split('T')[0];
                    }
                    return report.period;
                  } catch {
                    return report.period;
                  }
                }
                return 'N/A';
              };

              // Format created date
              const formatCreatedDate = () => {
                if (report.generatedAt) {
                  try {
                    return new Date(report.generatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                  } catch {
                    return report.generatedAt;
                  }
                }
                return 'N/A';
              };

              const isSummaryReport = (report as any).reportType === 'summary';
              const summaryData = (report as any).summaryData;
              const currentSlide = summarySlides[report.id] || 0;

              return (
                <div
                  key={report.id || index}
                  className={`bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer relative ${isSummaryReport && summaryData ? 'min-h-[280px]' : ''}`}
                  onClick={() => {
                    setSelectedReport(report);
                    setCurrentReport(report);
                  }}
                >
                  {/* Delete Button - Top Right */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this report?')) {
                          // Get deleted reports from localStorage
                          const deletedReportsKey = 'deletedDepartmentalReports';
                          const deletedReports = JSON.parse(localStorage.getItem(deletedReportsKey) || '[]') as string[];

                          // Add this report ID to deleted list
                          if (!deletedReports.includes(report.id)) {
                            deletedReports.push(report.id);
                            localStorage.setItem(deletedReportsKey, JSON.stringify(deletedReports));
                          }

                          // Remove from local state
                          setReports(prev => prev.filter(r => r.id !== report.id));
                        }
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-colors"
                      title="Delete Report"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Period/Title */}
                  <div className="mb-4 pr-20">
                    <h3 className="text-lg font-semibold text-slate-900 leading-tight">
                      {formatPeriod()}
                    </h3>
                  </div>

                  {/* Summary Report with Slides */}
                  {isSummaryReport && summaryData ? (
                    <div className="relative">
                      {/* Slide Navigation Arrows */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummarySlides(prev => ({ ...prev, [report.id]: currentSlide === 0 ? 1 : 0 }));
                        }}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSummarySlides(prev => ({ ...prev, [report.id]: currentSlide === 0 ? 1 : 0 }));
                        }}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Slide Content */}
                      <div className="overflow-hidden">
                        <div className={`transition-all duration-300 ${currentSlide === 0 ? 'opacity-100' : 'opacity-0 absolute'}`}>
                          {currentSlide === 0 && (
                            <div className="space-y-3 px-4">
                              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                                Payslip Data
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Gross Pay:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  ${(report.totalGrossPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Net Pay:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  ${(report.totalNetPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Employees:</span>
                                <span className="text-sm font-medium text-slate-900">{report.totalEmployees || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Insurance:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  ${(summaryData.totalInsurance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className={`transition-all duration-300 ${currentSlide === 1 ? 'opacity-100' : 'opacity-0 absolute'}`}>
                          {currentSlide === 1 && (
                            <div className="space-y-3 px-4">
                              <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                                Tax Data
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Total Tax:</span>
                                <span className="text-sm font-medium text-slate-900">
                                  ${(summaryData.totalTaxCollected || report.totalTaxes || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Tax Year:</span>
                                <span className="text-sm font-medium text-slate-900">{summaryData.taxYear || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Employees Taxed:</span>
                                <span className="text-sm font-medium text-slate-900">{summaryData.taxEmployeeCount || 0}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Total Deductions:</span>
                                <span className="text-sm font-medium text-red-600">
                                  ${(report.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Slide Indicators */}
                      <div className="flex justify-center gap-2 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummarySlides(prev => ({ ...prev, [report.id]: 0 }));
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${currentSlide === 0 ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummarySlides(prev => ({ ...prev, [report.id]: 1 }));
                          }}
                          className={`w-2 h-2 rounded-full transition-colors ${currentSlide === 1 ? 'bg-purple-600' : 'bg-slate-300'}`}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Regular Report Details */
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Entity:</span>
                        <span className="text-sm font-medium text-slate-900 text-right max-w-[60%] truncate">
                          {report.departmentName || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Employees:</span>
                        <span className="text-sm font-medium text-slate-900">
                          {report.totalEmployees || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Total Net Pay:</span>
                        <span className="text-sm font-medium text-slate-900">
                          ${(report.totalNetPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Created:</span>
                        <span className="text-sm font-medium text-slate-900">
                          {formatCreatedDate()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Type Badge - Bottom Left */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeBadge.bgColor} ${typeBadge.textColor}`}>
                      {typeBadge.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        let csvContent = '';

                        // Check if this is a summary report with combined data
                        if (isSummaryReport && summaryData) {
                          // Create comprehensive CSV with all tax + payslip data
                          csvContent = [
                            // Header section
                            ['=== PAYROLL SUMMARY REPORT ==='],
                            ['Report Period', report.period || 'N/A'],
                            ['Department', report.departmentName || 'All Departments'],
                            ['Generated At', report.generatedAt || new Date().toISOString()],
                            [''],
                            // Payslip Data Section
                            ['=== PAYSLIP DATA ==='],
                            ['Total Employees', report.totalEmployees || 0],
                            ['Total Gross Pay', `$${(report.totalGrossPay || 0).toFixed(2)}`],
                            ['Total Net Pay', `$${(report.totalNetPay || 0).toFixed(2)}`],
                            ['Average Salary', `$${(report.averageSalary || 0).toFixed(2)}`],
                            ['Total Payslips', summaryData.totalPayslips || 0],
                            ['Total Insurance', `$${(summaryData.totalInsurance || 0).toFixed(2)}`],
                            ['Total Penalties', `$${(summaryData.totalPenalties || 0).toFixed(2)}`],
                            [''],
                            // Tax Data Section
                            ['=== TAX DATA ==='],
                            ['Tax Year', summaryData.taxYear || 'N/A'],
                            ['Total Tax Collected', `$${(summaryData.totalTaxCollected || report.totalTaxes || 0).toFixed(2)}`],
                            ['Employees Taxed', summaryData.taxEmployeeCount || 0],
                            ['Employee Tax Breakdowns', summaryData.employeeTaxBreakdown || 0],
                            [''],
                            // Combined Totals Section
                            ['=== COMBINED TOTALS ==='],
                            ['Total Deductions (Tax + Insurance + Penalties)', `$${(report.totalDeductions || 0).toFixed(2)}`],
                            ['Effective Tax Rate', report.totalGrossPay > 0 ? `${(((summaryData.totalTaxCollected || report.totalTaxes || 0) / report.totalGrossPay) * 100).toFixed(2)}%` : 'N/A'],
                          ].map(row => row.join(',')).join('\n');
                        } else {
                          // Standard CSV for non-summary reports
                          csvContent = [
                            ['Department', 'Period', 'Employees', 'Gross Pay', 'Net Pay', 'Deductions', 'Taxes'],
                            [report.departmentName, report.period, report.totalEmployees || 0, report.totalGrossPay || 0, report.totalNetPay || 0, report.totalDeductions || 0, report.totalTaxes || 0]
                          ].map(row => row.join(',')).join('\n');
                        }

                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${isSummaryReport ? 'payroll-summary' : 'report'}-${report.period || report.departmentName}-${Date.now()}.csv`;
                        link.click();
                      }}
                      className="text-slate-500 hover:text-slate-700 transition-colors"
                      title="Download CSV"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate Departmental Report</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  value={generateForm.reportType}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, reportType: e.target.value }))}
                >
                  <option value="departmental">Departmental</option>
                  <option value="tax">Tax Report</option>
                  <option value="payslip-history">Payslip History</option>
                  <option value="payslip-summary">Payslip Summary</option>
                </select>
              </div>

              {/* Departmental: Show department dropdown + start date + end date */}
              {generateForm.reportType === 'departmental' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={generateForm.departmentId}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, departmentId: e.target.value }))}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={generateForm.startDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={generateForm.endDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {/* Tax Report / Payslip History: Show only start date + end date */}
              {(generateForm.reportType === 'tax' || generateForm.reportType === 'payslip-history') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={generateForm.startDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={generateForm.endDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {/* Payslip Summary: Show yearly/monthly options */}
              {generateForm.reportType === 'payslip-summary' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Period Type</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                      value={payslipSummaryType}
                      onChange={(e) => setPayslipSummaryType(e.target.value as 'yearly' | 'monthly')}
                    >
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {payslipSummaryType === 'yearly' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        step="1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {payslipSummaryType === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                      <input
                        type="month"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                        value={generateForm.startDate}
                        onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  resetGenerateForm();
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={
                  (generateForm.reportType === 'departmental' && !generateForm.departmentId) ||
                  ((generateForm.reportType === 'tax' || generateForm.reportType === 'payslip-history') && (!generateForm.startDate || !generateForm.endDate)) ||
                  (generateForm.reportType === 'payslip-summary' && payslipSummaryType === 'monthly' && !generateForm.startDate)
                }
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Report Details</h3>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => handleDeleteReport(selectedReport.id)}
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
                <div>
                  <label className="text-sm font-medium text-slate-500">Department</label>
                  <p className="text-base text-slate-900">{selectedReport.departmentName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Period</label>
                  <p className="text-base text-slate-900">{selectedReport.period || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Total Employees</label>
                  <p className="text-base text-slate-900">{selectedReport.totalEmployees || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-500">Status</label>
                  <p className="text-base text-slate-900 capitalize">{selectedReport.status || 'N/A'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Gross Pay</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.totalGrossPay || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Net Pay</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.totalNetPay || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Total Deductions</label>
                    <p className="text-lg font-semibold text-red-600">${(selectedReport.totalDeductions || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-500">Average Salary</label>
                    <p className="text-lg font-semibold text-slate-900">${(selectedReport.averageSalary || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-slate-500">Generated At</label>
                <p className="text-base text-slate-900">{new Date(selectedReport.generatedAt).toLocaleString()}</p>
              </div>
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
