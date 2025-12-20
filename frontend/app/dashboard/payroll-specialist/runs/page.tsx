'use client';

import { SetStateAction, useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { useSearchParams } from 'next/navigation';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Skeleton } from "../../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import {
  Calendar,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  AlertCircle,
  Users,
  DollarSign,
  CalendarDays,
  Building,
  FileText,
  BarChart3,
  PlusCircle,
  ChevronRight,
  Clock,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  User,
  FileSpreadsheet,
  Settings,
  Check,
  X,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";

type Tab = 'runs' | 'create' | 'bonuses' | 'termination' | 'payslips' | 'diagnostics';

// Import the correct service for company-wide settings
import { payrollConfigurationService } from '../../../services/payroll-configuration';

// Helper function to format payrollPeriod object to string
const formatPayrollPeriod = (period: any): string => {
  if (!period) return 'No Period';
  if (typeof period === 'string') return period;
  if (typeof period === 'object') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = period.month !== undefined ? monthNames[period.month] || `Month ${period.month}` : '';
    const year = period.year || '';
    if (month && year) return `${month} ${year}`;
    if (period.startDate && period.endDate) {
      return `${new Date(period.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })} - ${new Date(period.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;
    }
    // Graceful fallback for unknown period formats
    if (period.name) return period.name;
    if (period.label) return period.label;
    return 'Custom Period';
  }
  return String(period);
};

// Helper function for consistent date/time formatting
const formatDateTime = (dateString: string | Date, includeTime: boolean = false): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    if (includeTime) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    const s = status?.toLowerCase();
    if (s === 'approved' || s === 'paid' || s === 'locked' || s === 'frozen') return 'default';
    if (s === 'draft' || s === 'pending' || s === 'pending finance approval' || s === 'under review' || s === 'under_review') return 'secondary';
    if (s === 'rejected') return 'destructive';
    if (s === 'unlocked') return 'outline';
    if  (s === 'pending') return 'secondary';
    if  (s === 'paid') return 'default';
    return 'secondary';
  };

  return (
    <Badge variant={getStatusVariant(status)} className="capitalize">
      {status || 'Unknown'}
    </Badge>
  );
};

export default function PayrollSpecialistRunsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabFromUrl || 'runs');

  // Use companywide currency from CompanyWideSettings API
  const [companyCurrency, setCompanyCurrency] = useState<string>('EGP');
  const [loadingCurrency, setLoadingCurrency] = useState<boolean>(true);
  
  // Helper to format currency with dynamic currency code
  const formatCurrency = (amount: number | undefined | null, currency?: string): string => {
    const curr = currency || companyCurrency || 'EGP';
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${curr} 0`;
    }
    return `${curr} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Fetch company currency on mount from CompanyWideSettings API
  useEffect(() => {
    const fetchCompanyCurrency = async () => {
      try {
        setLoadingCurrency(true);
        const response = await payrollConfigurationService.getCompanyWideSettings() as any;
        
        // Extract currency from the response based on your API structure
        if (response?.data) {
          const settings = response.data;
          // Try different possible property names for currency
          const currency = 
            settings.currency ||
            settings.companyCurrency ||
            settings.defaultCurrency ||
            settings.financialSettings?.currency ||
            'EGP';
          
          setCompanyCurrency(currency);
        } else if (response?.currency) {
          // Direct currency property
          setCompanyCurrency(response.currency);
        }
      } catch (error) {
        console.error('Failed to fetch company currency from CompanyWideSettings:', error);
        // Fallback to EGP if API fails
        setCompanyCurrency('EGP');
      } finally {
        setLoadingCurrency(false);
      }
    };

    fetchCompanyCurrency();
  }, []);

  // Sync tab with URL changes
  useEffect(() => {
    if (tabFromUrl && ['runs', 'create', 'bonuses', 'termination', 'payslips', 'diagnostics'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  // Runs
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Departments for dropdown
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Create form
  const [form, setForm] = useState({
    payrollPeriod: '',
    entityId: '',  // department ID
    entity: '',    // department name (auto-filled)
  });
  
  // Payroll period approval state
  const [showInitiationApproval, setShowInitiationApproval] = useState(false);
  const [isPeriodApproved, setIsPeriodApproved] = useState(false);
  const [periodRejected, setPeriodRejected] = useState(false);
  
  // Bonuses & Termination
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [terminations, setTerminations] = useState<any[]>([]);
  
  // Payslips (REQ-PY-8)
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
    const [payslipDialogLoading, setPayslipDialogLoading] = useState(false);
    const [payslipDialogError, setPayslipDialogError] = useState('');
  const [payslipsRunId, setPayslipsRunId] = useState<string>('');
  
  // Edit mode (REQ-PY-26)
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    payrollPeriod: '',
    entityId: '',
    entity: '',
  });

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<any>(null);
  
  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Theme customizer state
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

  useEffect(() => {
    fetchRuns();
    fetchDepartments();
  }, [statusFilter]);

  const fetchRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const res = await payrollExecutionService.listRuns(params);
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = (res?.data || res) as any;
      const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      // Normalize: map _id to id and include all backend fields
      setRuns(items.map((run: any) => ({
        id: run._id,
        payrollPeriod: run.payrollPeriod,
        entity: run.entity,
        status: run.status,
        employees: run.employees,
        exceptions: run.exceptions,
        totalnetpay: run.totalnetpay,
        totalGrossPay: run.totalGrossPay,
        totalDeductions: run.totalDeductions,
        totalAllowances: run.totalAllowances,
        totalBaseSalary: run.totalBaseSalary,
        totalOvertime: run.totalOvertime,
        totalPenalties: run.totalPenalties,
        totalTaxDeductions: run.totalTaxDeductions,
        totalInsuranceDeductions: run.totalInsuranceDeductions,
        totalTaxes: run.totalTaxes,
        totalInsurance: run.totalInsurance,
        createdAt: run.createdAt,
        processedAt: run.processedAt,
        paymentStatus: run.paymentStatus,
        approvedByManager: run.approvedByManager,
        approvedByManagerAt: run.approvedByManagerAt,
        approvedByFinance: run.approvedByFinance,
        approvedByFinanceAt: run.approvedByFinanceAt,
        frozen: run.frozen,
        frozenAt: run.frozenAt,
        frozenReason: run.frozenReason,
        unfreezeReason: run.unfreezeReason,
        payslipsGenerated: run.payslipsGenerated,
        payslipsGeneratedAt: run.payslipsGeneratedAt,
        irregularitiesCount: run.irregularitiesCount,
        irregularities: run.irregularities,
        employeePayrollDetails: run.employeePayrollDetails,
        managerApprovalDate: run.managerApprovalDate,
        financeApprovalDate: run.financeApprovalDate,
        payrollManagerId: run.payrollManagerId,
        financeStaffId: run.financeStaffId,
        // Spread any other fields for future-proofing
        ...run
      })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await payrollExecutionService.listDepartments();
      if (res?.error) {
        console.error('Failed to load departments:', res.error);
        return;
      }
      const data = res?.data || res;
      setDepartments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load departments:', e?.message);
    }
  };

  const fetchBonuses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listSigningBonuses();
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      setBonuses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bonuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchTerminations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listTerminationBenefits();
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      setTerminations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load termination benefits');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async (runId: string) => {
    if (!runId) {
      setError('Please select a payroll run first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.listPayslipsByRun(runId);
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      const data = res?.data || res;
      const normalizePayslip = (p: any) => {
        const earnings = p.earningsDetails || {};
        const dd = p.deductionsDetails || {};
        // Deductions breakdown
        const deductionItems: any[] = [];
        if (Array.isArray(dd.taxes)) {
          dd.taxes.forEach((tax: any) => {
            deductionItems.push({
              type: 'Tax',
              name: tax.name || tax.ruleName || 'Tax',
              amount: tax.amount || tax.value || 0,
            });
          });
        }
        if (Array.isArray(dd.insurances)) {
          dd.insurances.forEach((ins: any) => {
            deductionItems.push({
              type: 'Insurance',
              name: ins.name || ins.bracketName || 'Insurance',
              amount: ins.amount || ins.value || 0,
            });
          });
        }
        if (dd.penalties) {
          deductionItems.push({
            type: 'Penalty',
            name: dd.penalties.name || 'Penalty',
            amount: dd.penalties.amount || 0,
          });
        }
        let deductions = {
          tax: p.taxAmount ?? dd.taxAmount ?? 0,
          socialSecurity: p.insuranceAmount ?? dd.insuranceAmount ?? 0,
          penalties: p.penaltiesAmount ?? dd.penaltiesAmount ?? 0,
          total: p.totaDeductions ?? dd.total ?? 0,
          items: deductionItems,
        };
        // Add status and employeeName to normalized payslip
        return {
          _id: p._id,
          baseSalary: p.baseSalary ?? earnings.baseSalary ?? 0,
          allowances: Array.isArray(earnings.allowances)
      ? {
          total: earnings.allowances.reduce((sum: any, a: { amount: any }) => sum + (a.amount || 0), 0),
          items: earnings.allowances.map((a: { name: any; type: any; amount: any; description: any; subAllowances: any }) => ({
            name: a.name,
            type: a.type,
            amount: a.amount,
            description: a.description,
            subAllowances: a.subAllowances || [],
          })),
        }
      : { total: 0, items: [] },
    bonuses: Array.isArray(earnings.bonuses)
      ? {
          total: earnings.bonuses.reduce((sum: any, b: { amount: any }) => sum + (b.amount || 0), 0),
          items: earnings.bonuses.map((b: { name: any; type: any; amount: any; description: any; subBonuses: any }) => ({
            name: b.name,
            type: b.type,
            amount: b.amount,
            description: b.description,
            subBonuses: b.subBonuses || [],
          })),
        }
      : { total: 0, items: [] },
    grossPay: p.grossPay ?? p.totalGrossSalary ?? 0,
    netPay: p.netPay ?? 0,
    deductions,
    status:  p.paymentStatus || p.status,
    employeeName: p.employeeName || p.employee,
    paymentStatus : p.paymentStatus || 'pending',
    // Add other fields as needed
  };
      };
      setPayslips(Array.isArray(data) ? data.map(normalizePayslip) : []);
      setPayslipsRunId(runId);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.getEmployeeStatusDiagnostics();
      if (res?.error) {
        setError(res.error);
        return;
      }
      const data = res?.data || res;
      setDiagnostics(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.payrollPeriod || !form.entityId) {
      setError('Payroll period and department are required');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await payrollExecutionService.createInitiation({
        payrollPeriod: form.payrollPeriod,
        entity: form.entity,
        entityId: form.entityId,
      });
      
      if (res?.error) {
        setError(res.error);
        return;
      }
      
      setSuccess('Initiation created successfully!');
      setForm({ payrollPeriod: '', entityId: '', entity: '' });
      fetchRuns();
    } catch (e: any) {
      setError(e?.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveInitiation(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Approved successfully!');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.rejectInitiation(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Rejected successfully!');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (run: any) => {
    setEditForm({
      payrollPeriod: formatPayrollPeriod(run.period || run.payrollPeriod),
      entityId: run.entityId || '',
      entity: run.entity || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditForm({ payrollPeriod: '', entityId: '', entity: '' });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.payrollPeriod || !editForm.entityId) {
      setError('Payroll Period and Department are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const updateData: any = {
        payrollPeriod: editForm.payrollPeriod,
        entity: editForm.entity,
        entityId: editForm.entityId,
      };
      
      const res = await payrollExecutionService.updateInitiation(id, updateData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll initiation updated successfully! You can now resubmit.');
      setEditMode(false);
      fetchRuns();
      setSelectedRun({ ...selectedRun, ...updateData, status: 'draft' });
    } catch (e: any) {
      setError(e?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  // Add currency badge to header
  const CurrencyBadge = () => (
    <Badge variant="outline" className="px-3 py-1">
      <DollarSign className="h-3 w-3 mr-1" />
      {loadingCurrency ? '...' : companyCurrency}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6 relative">
      {/* Theme Customizer Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <ThemeCustomizerTrigger 
          onClick={() => setShowThemeCustomizer(true)}
        />
      </div>
      
      {/* Theme Customizer Modal */}
      {showThemeCustomizer && (
        <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              Payroll Execution Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage payroll runs, bonuses, termination benefits, and view diagnostics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyBadge />
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              {departments.length} Departments
            </Badge>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as Tab)} className="w-full">
          <TabsList className="grid grid-cols-6 w-full mb-8 bg-muted/50 p-1">
            <TabsTrigger value="runs" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); }}>
              <CalendarDays className="h-4 w-4" />
              Payroll Runs
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); }}>
              <PlusCircle className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); fetchBonuses(); }}>
              <Sparkles className="h-4 w-4" />
              Signing Bonuses
            </TabsTrigger>
            <TabsTrigger value="termination" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); fetchTerminations(); }}>
              <User className="h-4 w-4" />
              Termination
            </TabsTrigger>
            <TabsTrigger value="payslips" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); }}>
              <FileText className="h-4 w-4" />
              Payslips
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="flex items-center gap-2" onClick={() => { setError(''); setSuccess(''); fetchDiagnostics(); }}>
              <BarChart3 className="h-4 w-4" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          {/* Payroll Runs Tab */}
          <TabsContent value="runs">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Payroll Runs</CardTitle>
                    <CardDescription>
                      View and manage all payroll runs. Click on a run to view details and take action.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="under review">Under Review</SelectItem>
                          <SelectItem value="pending finance approval">Pending Finance Approval</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="locked">Locked</SelectItem>
                          <SelectItem value="unlocked">Unlocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={fetchRuns} disabled={loading} size="sm">
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading && runs.length === 0 ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : runs.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No payroll runs found</h3>
                    <p className="text-muted-foreground mt-1">Create your first payroll run to get started</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {runs.map((run) => (
                      <Card 
                        key={run._id} 
                        className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${
                          selectedRun?._id === run._id ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                        onClick={() => setSelectedRun(run)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">
                              {formatPayrollPeriod(run.period || run.payrollPeriod)}
                            </CardTitle>
                            <StatusBadge status={run.status} />
                          </div>
                          <CardDescription className="flex items-center gap-2">
                            <Building className="h-3 w-3" />
                            {run.entity || '-'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Employees
                              </span>
                              <span className="font-medium">{run.employees ?? run.employeeCount ?? '-'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Total Net Pay
                              </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(run.totalnetpay ?? run.totalNetPay)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Created
                              </span>
                              <span>{formatDateTime(run.createdAt)}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Button variant="ghost" size="sm" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Run Details Dialog */}
            <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
              <DialogContent className="max-w-2xl">
                {selectedRun && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Payroll Run Details
                      </DialogTitle>
                      <DialogDescription>
                        Period: {formatPayrollPeriod(selectedRun.period || selectedRun.payrollPeriod)}
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Department</Label>
                            <p className="font-medium">{selectedRun.entity || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Status</Label>
                            <div className="mt-1">
                              <StatusBadge status={selectedRun.status} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Employees</Label>
                            <p className="font-medium">{selectedRun.employees ?? selectedRun.employeeCount ?? '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Exceptions</Label>
                            <p className={`font-medium ${(selectedRun.exceptions || 0) > 0 ? 'text-destructive' : ''}`}>
                              {selectedRun.exceptions ?? 0}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Frozen Reason</Label>
                            <p className="font-medium">{selectedRun.frozenReason || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Unfreeze Reason</Label>
                            <p className="font-medium">{selectedRun.unfreezeReason || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Manager Approval Date</Label>
                            <p className="font-medium">{formatDateTime(selectedRun.managerApprovalDate)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Finance Approval Date</Label>
                            <p className="font-medium">{formatDateTime(selectedRun.financeApprovalDate)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Irregularities</Label>
                            <p className="font-medium">{selectedRun.irregularities?.join(', ') || '-'}</p>
                          </div>
                        </div>

                        {/* Financial Summary */}
                        <Separator />
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Financial Summary
                          </h4>
                          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            {selectedRun.totalBaseSalary !== undefined && (
                              <div className="flex justify-between">
                                <span>Base Salaries</span>
                                <span>{formatCurrency(selectedRun.totalBaseSalary, selectedRun.currency)}</span>
                              </div>
                            )}
                            {selectedRun.totalAllowances !== undefined && (
                              <div className="flex justify-between text-green-600">
                                <span>Allowances</span>
                                <span>+{formatCurrency(selectedRun.totalAllowances, selectedRun.currency)}</span>
                              </div>
                            )}
                            {selectedRun.totalGrossPay !== undefined && (
                              <div className="flex justify-between font-medium pt-2 border-t">
                                <span>Gross Pay</span>
                                <span>{formatCurrency(selectedRun.totalGrossPay, selectedRun.currency)}</span>
                              </div>
                            )}
                            {selectedRun.totalDeductions !== undefined && (
                              <div className="flex justify-between text-destructive">
                                <span>Deductions</span>
                                <span>-{formatCurrency(selectedRun.totalDeductions, selectedRun.currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                              <span>Net Pay</span>
                              <span className="text-green-600">
                                {formatCurrency((selectedRun.totalnetpay ?? selectedRun.totalNetPay) || 0, selectedRun.currency)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Irregularities */}
                        {(selectedRun.irregularities && selectedRun.irregularities.length > 0) && (
                          <Alert variant="warning">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Flagged Irregularities</AlertTitle>
                            <AlertDescription>
                              <ul className="list-disc pl-4 mt-1 space-y-1">
                                {selectedRun.irregularities.map((irr: string, idx: number) => (
                                  <li key={idx}>{irr}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Actions */}
                        <Separator />
                        {selectedRun.status === 'draft' && !editMode && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Button onClick={() => handleApprove(selectedRun._id)} disabled={loading}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit for Review
                              </Button>
                              <Button variant="destructive" onClick={() => handleReject(selectedRun._id)} disabled={loading}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => handleStartEdit(selectedRun)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Payroll
                            </Button>
                          </div>
                        )}

                        {/* Edit Form */}
                        {(selectedRun.status === 'rejected' || selectedRun.status === 'draft') && editMode && (
                          <div className="space-y-4 border rounded-lg p-4">
                            <h4 className="font-semibold">Edit Payroll Initiation</h4>
                            <div className="space-y-3">
                              <div>
                                <Label>Payroll Period</Label>
                                <Input
                                  value={editForm.payrollPeriod}
                                  onChange={(e: { target: { value: any; }; }) => setEditForm({ ...editForm, payrollPeriod: e.target.value })}
                                  placeholder="YYYY-MM"
                                />
                              </div>
                              <div>
                                <Label>Department</Label>
                                <Select
                                  value={editForm.entityId}
                                  onValueChange={(value: any) => {
                                    const selectedDept = departments.find((d: any) => d._id === value);
                                    setEditForm({ 
                                      ...editForm, 
                                      entityId: value,
                                      entity: selectedDept?.name || ''
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept: any) => (
                                      <SelectItem key={dept._id} value={dept._id}>
                                        {dept.name} ({dept.activeEmployeeCount || 0} active)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button 
                                onClick={() => handleSaveEdit(selectedRun._id)} 
                                disabled={loading}
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save Changes
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={handleCancelEdit}
                                disabled={loading}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Create Initiation Tab */}
          <TabsContent value="create">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Create Payroll Initiation
                </CardTitle>
                <CardDescription>
                  Create a new payroll run for a specific period and department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payrollPeriod">Payroll Period *</Label>
                    <Input
                      id="payrollPeriod"
                      type="date"
                      value={form.payrollPeriod}
                      onChange={(e: { target: { value: any; }; }) => {
                        setForm({ ...form, payrollPeriod: e.target.value });
                        setIsPeriodApproved(false);
                        setPeriodRejected(false);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department/Company *</Label>
                    <Select
                      value={form.entityId}
                      onValueChange={(value: any) => {
                        const selectedDept = departments.find((d: any) => d._id === value);
                        setForm({ 
                          ...form, 
                          entityId: value,
                          entity: selectedDept?.name || ''
                        });
                        setIsPeriodApproved(false);
                        setPeriodRejected(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept: any) => (
                          <SelectItem key={dept._id} value={dept._id}>
                            {dept.name} ({dept.activeEmployeeCount || 0} active employees)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Employee count and payroll totals will be calculated automatically when processed.
                      All amounts will be displayed in {loadingCurrency ? '...' : companyCurrency} currency.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button 
                  onClick={() => setShowInitiationApproval(true)} 
                  disabled={!form.entityId || !form.payrollPeriod}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review Initiation
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={loading || !form.entityId || !form.payrollPeriod || !isPeriodApproved}
                  className="w-full"
                >
                  {loading ? 'Creating...' : 'Create Payroll Run'}
                </Button>
              </CardFooter>
            </Card>

            {/* Period Approval Dialog */}
            <Dialog open={showInitiationApproval} onOpenChange={setShowInitiationApproval}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Payroll Period Approval</DialogTitle>
                  <DialogDescription>
                    Review and approve the payroll period before creation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div>
                        <Label className="text-muted-foreground">Payroll Period</Label>
                        <p className="font-semibold text-lg">{form.payrollPeriod}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Department</Label>
                        <p className="font-semibold text-lg">{form.entity || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Currency</Label>
                        <p className="font-semibold text-lg">{loadingCurrency ? '...' : companyCurrency}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => { setIsPeriodApproved(true); setPeriodRejected(false); setShowInitiationApproval(false); }}
                      disabled={isPeriodApproved}
                      className="flex-1"
                      variant={isPeriodApproved ? "default" : "outline"}
                    >
                      {isPeriodApproved ? <Check className="h-4 w-4 mr-2" /> : null}
                      {isPeriodApproved ? 'Approved' : 'Approve Period'}
                    </Button>
                    <Button
                      onClick={() => { setPeriodRejected(true); setIsPeriodApproved(false); setShowInitiationApproval(false); }}
                      disabled={periodRejected}
                      variant={periodRejected ? "destructive" : "outline"}
                      className="flex-1"
                    >
                      {periodRejected ? <X className="h-4 w-4 mr-2" /> : null}
                      {periodRejected ? 'Rejected' : 'Reject Period'}
                    </Button>
                  </div>
                  {periodRejected && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please edit the period or department and approve again.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Signing Bonuses Tab */}
          <TabsContent value="bonuses">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Signing Bonuses
                    </CardTitle>
                    <CardDescription>
                      Manage employee signing bonus approvals and rejections
                    </CardDescription>
                  </div>
                  <Button onClick={fetchBonuses} disabled={loading} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : bonuses.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No signing bonuses found</h3>
                    <p className="text-muted-foreground mt-1">All signing bonuses have been processed</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bonuses.map((b) => (
                      <Card key={b._id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base truncate">
                              {b.employeeName || (typeof b.employeeId === 'string' ? `Employee ${b.employeeId.slice(-6)}` : 'Unknown')}
                            </CardTitle>
                            <StatusBadge status={b.status} />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="text-2xl font-bold text-foreground">
                              {formatCurrency(b.givenAmount || b.amount || 0)}
                            </span>
                          </div>
                        </CardContent>
                        {b.status === 'pending' && (
                          <CardFooter className="flex flex-col gap-2 pt-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={async () => {
                                const newAmount = prompt('Enter new amount:', String(b.givenAmount || b.amount || 0));
                                if (newAmount === null) return;
                                const amount = parseFloat(newAmount);
                                if (isNaN(amount) || amount < 0) {
                                  setError('Invalid amount');
                                  return;
                                }
                                try {
                                  const res = await payrollExecutionService.editSigningBonus(b._id, { amount });
                                  if (res?.error) setError(res.error);
                                  else { setSuccess('Bonus amount updated!'); fetchBonuses(); }
                                } catch (e: any) {
                                  setError(e?.message || 'Failed to edit');
                                }
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit Amount
                            </Button>
                            <div className="flex gap-2 w-full">
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    const res = await payrollExecutionService.approveSigningBonus(b._id);
                                    if (res?.error) setError(res.error);
                                    else { setSuccess('Bonus approved!'); fetchBonuses(); }
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed');
                                  }
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="flex-1"
                                onClick={async () => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (!reason) return;
                                  try {
                                    const res = await payrollExecutionService.rejectSigningBonus(b._id, reason);
                                    if (res?.error) setError(res.error);
                                    else { setSuccess('Bonus rejected!'); fetchBonuses(); }
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed');
                                  }
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </CardFooter>
                        )}
                        {b.status === 'rejected' && b.rejectionReason && (
                          <CardFooter className="pt-0">
                            <Alert variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3" />
                              <AlertDescription>{b.rejectionReason}</AlertDescription>
                            </Alert>
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Termination Benefits Tab */}
          <TabsContent value="termination">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Termination Benefits
                    </CardTitle>
                    <CardDescription>
                      Manage termination and resignation benefit approvals
                    </CardDescription>
                  </div>
                  <Button onClick={fetchTerminations} disabled={loading} size="sm">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : terminations.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No termination benefits found</h3>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {terminations.map((t) => (
                      <Card key={t._id}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base truncate">
                              {t.employeeName || (typeof t.employeeId === 'string' ? `Employee ${t.employeeId.slice(-6)}` : 'Unknown')}
                            </CardTitle>
                            <StatusBadge status={t.status} />
                          </div>
                          <CardDescription>
                            {t.benefitType || t.type || 'Termination Benefit'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="text-2xl font-bold text-foreground">
                              {formatCurrency(t.givenAmount || t.amount || 0)}
                            </span>
                          </div>
                        </CardContent>
                        {t.status === 'pending' && (
                          <CardFooter className="flex flex-col gap-2 pt-0">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={async () => {
                                const newAmount = prompt('Enter new amount:', String(t.givenAmount || t.amount || 0));
                                if (newAmount === null) return;
                                const amount = parseFloat(newAmount);
                                if (isNaN(amount) || amount < 0) {
                                  setError('Invalid amount');
                                  return;
                                }
                                try {
                                  const res = await payrollExecutionService.editTerminationBenefit(t._id, { amount });
                                  if (res?.error) setError(res.error);
                                  else { setSuccess('Benefit amount updated!'); fetchTerminations(); }
                                } catch (e: any) {
                                  setError(e?.message || 'Failed to edit');
                                }
                              }}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Edit Amount
                            </Button>
                            <div className="flex gap-2 w-full">
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    const res = await payrollExecutionService.approveTerminationBenefit(t._id);
                                    if (res?.error) setError(res.error);
                                    else { setSuccess('Benefit approved!'); fetchTerminations(); }
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed');
                                  }
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="flex-1"
                                onClick={async () => {
                                  const reason = prompt('Enter rejection reason:');
                                  if (!reason) return;
                                  try {
                                    const res = await payrollExecutionService.rejectTerminationBenefit(t._id, reason);
                                    if (res?.error) setError(res.error);
                                    else { setSuccess('Benefit rejected!'); fetchTerminations(); }
                                  } catch (e: any) {
                                    setError(e?.message || 'Failed');
                                  }
                                }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </CardFooter>
                        )}
                        {t.status === 'rejected' && t.rejectionReason && (
                          <CardFooter className="pt-0">
                            <Alert variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3" />
                              <AlertDescription>{t.rejectionReason}</AlertDescription>
                            </Alert>
                          </CardFooter>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payslips Tab */}
          <TabsContent value="payslips">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payslips
                </CardTitle>
                <CardDescription>
                  View generated payslips for approved/locked payroll runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Label>Select Payroll Run</Label>
                      <Select
                        value={payslipsRunId}
                        onValueChange={(value: SetStateAction<string>) => {
                          setPayslipsRunId(value);
                          if (typeof value === 'string' && value) fetchPayslips(value);
                          else setPayslips([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payroll run" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">-- Select a payroll run --</SelectItem>
                          {runs.filter(r => ['approved', 'locked', 'unlocked'].includes(r.status?.toLowerCase())).map((run) => (
                            <SelectItem key={run._id} value={run._id}>
                              {formatPayrollPeriod(run.period || run.payrollPeriod)} - {run.entity} ({run.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-auto">
                      <Button 
                        onClick={() => payslipsRunId && fetchPayslips(payslipsRunId)} 
                        disabled={loading || !payslipsRunId}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center py-12">
                      <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-full" />
                      <Skeleton className="h-4 w-48 mx-auto" />
                    </div>
                  ) : !payslipsRunId ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground">Select a payroll run</h3>
                      <p className="text-muted-foreground mt-1">Choose a payroll run to view its payslips</p>
                    </div>
                  ) : payslips.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No payslips found</h3>
                      <p className="text-muted-foreground mt-1">No payslips generated for this payroll run</p>
                    </div>
                  ) : (
                    <>
                      <Card className="bg-primary/5">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Total Payslips</div>
                              <div className="text-2xl font-bold mt-2">{payslips.length}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Total Gross</div>
                              <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(payslips.reduce((sum, p) => sum + (p.grossPay || 0), 0))}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Total Deductions</div>
                              <div className="text-2xl font-bold text-destructive">
                                {formatCurrency(payslips.reduce((sum, p) => sum + (p.deductions?.total || 0), 0))}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">Total Net Pay</div>
                              <div className="text-2xl font-bold text-primary">
                                {formatCurrency(payslips.reduce((sum, p) => sum + (p.netPay || 0), 0))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {payslips.map((slip, index) => (
                          <Card 
                            key={index} 
                            className="cursor-pointer hover:shadow-md transition-all"
                            onClick={async () => {
                              setPayslipDialogLoading(true);
                              setPayslipDialogError('');
                              try {
                                const res = await payrollExecutionService.getPayslip(slip.id || slip._id);
                                if (res?.error) {
                                  setPayslipDialogError(res.error);
                                  setSelectedPayslip(null);
                                } else {
                                  setSelectedPayslip(res.data || res);
                                }
                              } catch (e: any) {
                                setPayslipDialogError(e?.message || 'Failed to fetch payslip');
                                setSelectedPayslip(null);
                              } finally {
                                setPayslipDialogLoading(false);
                              }
                            }}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-base">
                                  {slip.employeeName || `Employee ${index + 1}`}
                                </CardTitle>
                                {slip.paymentStatus && (
                                  <Badge variant={slip.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                    {slip.paymentStatus}
                                  </Badge>
                                )}
                              </div>
                              {slip.employeeNumber && (
                                <CardDescription>#{slip.employeeNumber}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Gross Pay</span>
                                  <span className="font-medium">{formatCurrency(slip.grossPay || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Deductions</span>
                                  <span className="text-destructive">-{formatCurrency(slip.deductions?.total || 0)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-semibold">
                                  <span>Net Pay</span>
                                  <span className="text-green-600">{formatCurrency(slip.netPay || 0)}</span>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                              <Button variant="ghost" size="sm" className="w-full">
                                <Eye className="h-3 w-3 mr-2" />
                                View Details
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payslip Details Dialog */}
            <Dialog open={!!selectedPayslip || payslipDialogLoading || !!payslipDialogError} onOpenChange={() => { setSelectedPayslip(null); setPayslipDialogError(''); setPayslipDialogLoading(false); }}>
              <DialogContent className="max-w-3xl">
                {payslipDialogLoading ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Payslip Details</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-12">
                      <Skeleton className="h-12 w-12 mb-4 rounded-full" />
                      <div className="text-lg font-medium">Loading payslip details...</div>
                    </div>
                  </>
                ) : payslipDialogError ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Payslip Details</DialogTitle>
                    </DialogHeader>
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{payslipDialogError}</AlertDescription>
                    </Alert>
                  </>
                ) : selectedPayslip ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Payslip Details
                      </DialogTitle>
                      <DialogDescription>
                        Detailed breakdown of earnings and deductions (All amounts in {companyCurrency})
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                      <div className="space-y-6">
                        {/* Employee Info */}
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-semibold">{selectedPayslip.employeeName || selectedPayslip.employee || 'Unknown Employee'}</h3>
                                {selectedPayslip.employeeNumber && (
                                  <p className="text-muted-foreground">Employee #: {selectedPayslip.employeeNumber}</p>
                                )}
                              </div>
                              <Badge variant="outline">
                                {selectedPayslip.paymentStatus || 'pending'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Earnings */}
                        <Card>
                          <CardHeader className="bg-green-50">
                            <CardTitle className="flex items-center gap-2 text-green-700">
                              <TrendingUp className="h-5 w-5" />
                              Earnings
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span>Base Salary</span>
                                <span className="font-medium">{formatCurrency(selectedPayslip.baseSalary || selectedPayslip.earningsDetails?.baseSalary || 0)}</span>
                              </div>
                              {/* Allowances */}
                              {selectedPayslip.allowances?.total > 0 || (selectedPayslip.earningsDetails?.allowances?.length > 0) ? (
                                <>
                                  <div className="flex justify-between text-green-600">
                                    <span>Allowances</span>
                                    <span>+{formatCurrency(selectedPayslip.allowances?.total || selectedPayslip.earningsDetails?.allowances?.reduce((sum: any, a: any) => sum + (a.amount || 0), 0) || 0)}</span>
                                  </div>
                                  {(selectedPayslip.allowances?.items || selectedPayslip.earningsDetails?.allowances)?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm text-muted-foreground ml-4">
                                      <span>{item.name || 'Allowance'}</span>
                                      <span>+{formatCurrency(item.amount || 0)}</span>
                                    </div>
                                  ))}
                                </>
                              ) : null}
                              {/* Bonuses */}
                              {selectedPayslip.bonuses?.total > 0 || (selectedPayslip.earningsDetails?.bonuses?.length > 0) ? (
                                <>
                                  <div className="flex justify-between text-green-600">
                                    <span>Bonuses</span>
                                    <span>+{formatCurrency(selectedPayslip.bonuses?.total || selectedPayslip.earningsDetails?.bonuses?.reduce((sum: any, b: any) => sum + (b.amount || 0), 0) || 0)}</span>
                                  </div>
                                  {(selectedPayslip.bonuses?.items || selectedPayslip.earningsDetails?.bonuses)?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm text-muted-foreground ml-4">
                                      <span>{item.name || 'Bonus'}</span>
                                      <span>+{formatCurrency(item.amount || 0)}</span>
                                    </div>
                                  ))}
                                </>
                              ) : null}
                              {/* Refunds */}
                              {(selectedPayslip.refunds > 0 || (Array.isArray(selectedPayslip.refunds) && selectedPayslip.refunds.length > 0) || selectedPayslip.earningsDetails?.refunds?.length > 0) && (
                                <div className="flex justify-between text-green-600">
                                  <span>Refunds</span>
                                  <span>+{formatCurrency(typeof selectedPayslip.refunds === 'number' ? selectedPayslip.refunds : (Array.isArray(selectedPayslip.refunds) ? selectedPayslip.refunds.reduce((sum: any, r: any) => sum + (r.amount || 0), 0) : (selectedPayslip.earningsDetails?.refunds?.reduce((sum: any, r: any) => sum + (r.amount || 0), 0) || 0)))}</span>
                                </div>
                              )}
                              <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total Gross Salary</span>
                                <span className="text-green-700">{formatCurrency(selectedPayslip.grossPay || selectedPayslip.totalGrossSalary || 0)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Deductions */}
                        <Card>
                          <CardHeader className="bg-red-50">
                            <CardTitle className="flex items-center gap-2 text-red-700">
                              <TrendingDown className="h-5 w-5" />
                              Deductions
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              {/* Deductions breakdown: show all items */}
                              {selectedPayslip.deductions?.items?.length > 0 || selectedPayslip.deductionsDetails?.taxes?.length > 0 ? (
                                <ul className="list-disc pl-6 space-y-1">
                                  {(selectedPayslip.deductions?.items || selectedPayslip.deductionsDetails?.taxes)?.map((d: any, idx: number) => (
                                    <li key={idx}>
                                      <span className="font-medium">{d.type || d.name}</span>: {d.name || d.type} - {formatCurrency(d.amount)}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              {selectedPayslip.deductions?.tax > 0 || selectedPayslip.deductionsDetails?.taxAmount > 0 ? (
                                <div className="flex justify-between text-red-600">
                                  <span>Income Tax</span>
                                  <span>- {formatCurrency(selectedPayslip.deductions?.tax || selectedPayslip.deductionsDetails?.taxAmount || 0)}</span>
                                </div>
                              ) : null}
                              {selectedPayslip.deductions?.socialSecurity > 0 || selectedPayslip.deductionsDetails?.insuranceAmount > 0 ? (
                                <div className="flex justify-between text-red-600">
                                  <span>Social Security</span>
                                  <span>- {formatCurrency(selectedPayslip.deductions?.socialSecurity || selectedPayslip.deductionsDetails?.insuranceAmount || 0)}</span>
                                </div>
                              ) : null}
                              <Separator />
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total Deductions</span>
                                <span className="text-red-700">- {formatCurrency(selectedPayslip.deductions?.total || selectedPayslip.totaDeductions || selectedPayslip.deductionsDetails?.totalDeductions || 0)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Net Pay */}
                        <Card className="bg-primary/10 border-primary/20">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-semibold">Net Pay</h3>
                                <p className="text-muted-foreground text-sm">Amount after all deductions</p>
                              </div>
                              <div className="text-3xl font-bold text-primary">
                                {formatCurrency(selectedPayslip.netPay || 0)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Diagnostics Tab */}
          <TabsContent value="diagnostics">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Employee Status Diagnostics
                    </CardTitle>
                    <CardDescription>
                      Monitor employee statuses and payroll eligibility
                    </CardDescription>
                  </div>
                  <Button onClick={fetchDiagnostics} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Diagnostics
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : !diagnostics ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No diagnostics data</h3>
                    <p className="text-muted-foreground mt-1">Click "Refresh Diagnostics" to load data</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {diagnostics.activeEmployeesForPayroll === 0 && (
                      <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Warning: No Active Employees</AlertTitle>
                        <AlertDescription>
                          There are no employees with status: 'ACTIVE' in the database. Payroll runs will have 0 employees.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Total Employees</div>
                            <div className="text-3xl font-bold mt-2">{diagnostics.totalEmployees || 0}</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className={diagnostics.activeEmployeesForPayroll > 0 ? 'border-green-200' : 'border-destructive/50'}>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Active (Eligible for Payroll)</div>
                            <div className={`text-3xl font-bold mt-2 ${diagnostics.activeEmployeesForPayroll > 0 ? 'text-green-600' : 'text-destructive'}`}>
                              {diagnostics.activeEmployeesForPayroll || 0}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Status Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Count</TableHead>
                              <TableHead>Payroll Eligible?</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {diagnostics.statusBreakdown?.map((item: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{item.status || 'null'}</TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell>
                                  {['ACTIVE', 'Active', 'active'].includes(item.status) ? (
                                    <Badge variant="default">Yes</Badge>
                                  ) : (
                                    <Badge variant="secondary">No</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {diagnostics.sampleEmployees && diagnostics.sampleEmployees.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Sample Employees (First 10)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Employee #</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {diagnostics.sampleEmployees.map((emp: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell>{emp.name || 'Unknown'}</TableCell>
                                  <TableCell className="font-mono">{emp.employeeNumber || '-'}</TableCell>
                                  <TableCell>
                                    <Badge variant={['ACTIVE', 'Active', 'active'].includes(emp.status) ? 'default' : 'secondary'}>
                                      {emp.status || 'null'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}

                    {diagnostics.note && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>{diagnostics.note}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}