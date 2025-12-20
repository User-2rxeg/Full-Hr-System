'use client';

import { useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { useSearchParams } from 'next/navigation';
import { payrollExecutionService } from '@/app/services/payroll-execution';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { 
  AlertCircle, 
  CheckCircle, 
  Lock, 
  Unlock,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CalendarDays,
  Building,
  FileText,
  Clock,
  Shield,
  AlertTriangle,
  ChevronRight,
  Filter,
  Settings,
  Search,
  BarChart3,
  Receipt,
  User,
  AlertOctagon
} from "lucide-react";

// Helper function to format payrollPeriod object to string
const formatPayrollPeriod = (period: any): string => {
  if (!period) return 'No Period';
  if (typeof period === 'string') {
    const d = new Date(period);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    return period;
  }
  if (typeof period === 'object') {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = period.month !== undefined ? monthNames[period.month] || `Month ${period.month}` : '';
    const year = period.year || '';
    if (month && year) return `${month} ${year}`;
    if (period.startDate && period.endDate) {
      return `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`;
    }
    return 'No Period';
  }
  return String(period);
};

interface PayrollRun {
  _id: string;
  runId?: string;
  payrollPeriod?: string;
  entity?: string;
  status?: string;
  employees?: number;
  exceptions?: number;
  totalnetpay?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalAllowances?: number;
  totalBaseSalary?: number;
  totalOvertime?: number;
  totalPenalties?: number;
  totalTaxDeductions?: number;
  totalInsuranceDeductions?: number;
  irregularitiesCount?: number;
  irregularities?: string[];
  createdAt?: string;
  processedAt?: string;
  paymentStatus?: string;
  approvedByManager?: boolean;
  approvedByManagerAt?: string;
  approvedByFinance?: boolean;
  approvedByFinanceAt?: string;
  frozen?: boolean;
  frozenAt?: string;
  frozenReason?: string;
  unfreezeReason?: string;
  employeePayrollDetails?: EmployeePayrollDetail[];
  managerApprovalDate?: string;
  financeApprovalDate?: string;
  payrollManagerId?: string;
  financeStaffId?: string;
  currency?: string;
}

interface EmployeePayrollDetail {
  _id?: string;
  employeeId?: string;
  employeeName?: string;
  basePay?: number;
  grossPay?: number;
  netPay?: number;
  taxDeductions?: number;
  insuranceDeductions?: number;
  otherDeductions?: number;
  allowances?: number;
  overtime?: number;
  penalties?: number;
  refunds?: number;
  signingBonus?: number;
  terminationBenefit?: number;
  status?: string;
  exceptions?: string[];
  currency?: string;
}

export default function PayrollManagerRunsPage() {
  const searchParams = useSearchParams();
  const filterFromUrl = searchParams.get('filter');
  
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeePayrollDetail[]>([]);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  
  // Map URL filter to tab
  const getInitialTab = (): 'pending' | 'all' | 'frozen' | 'approved' => {
    if (filterFromUrl === 'pending') return 'pending';
    if (filterFromUrl === 'frozen') return 'frozen';
    if (filterFromUrl === 'approved') return 'approved' as any;
    return 'all';
  };
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'frozen'>(getInitialTab() as 'pending' | 'all' | 'frozen');

  // Sync tab with URL changes
  useEffect(() => {
    if (filterFromUrl) {
      if (filterFromUrl === 'pending') setActiveTab('pending');
      else if (filterFromUrl === 'frozen') setActiveTab('frozen');
      else setActiveTab('all');
    }
  }, [filterFromUrl]);

  useEffect(() => {
    fetchRuns();
  }, [statusFilter, activeTab]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchRuns = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: 1, limit: 100 };
      if (statusFilter) params.status = statusFilter;
      
      const res = await payrollExecutionService.listRuns(params);
      
      if (res?.error) {
        setError(res.error || 'Failed to connect to server.');
        setRuns([]);
        return;
      }
      
      const data = (res?.data || res) as any;
      let items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      
      // Filter based on active tab
      if (activeTab === 'pending') {
        items = items.filter((r: PayrollRun) => {
          const status = (r.status || '').toLowerCase();
          return (status === 'under review' || status === 'under_review') && !r.managerApprovalDate;
        });
      } else if (activeTab === 'frozen') {
        items = items.filter((r: PayrollRun) => {
          const status = (r.status || '').toLowerCase();
          return r.frozen || status === 'locked' || status === 'frozen';
        });
      }
      
      setRuns(items);
    } catch (e: any) {
      console.error('Failed to load runs:', e);
      setError(e?.message || 'Failed to load payroll runs.');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await payrollExecutionService.getDraft(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const details = (res?.data || res) as any;
      setRunDetails(details);
      if (details?.employeePayrollDetails) {
        setEmployeeDetails(details.employeePayrollDetails);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this payroll run? This indicates your review is complete and the run can proceed to finance approval.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveByManager(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run approved successfully. Proceeding to finance approval.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve payroll run');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async (id: string) => {
    const reason = prompt('Enter reason for freezing this payroll:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.freeze(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run has been frozen. No further changes can be made until unfrozen.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to freeze payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreeze = async (id: string) => {
    const reason = prompt('Enter reason for unfreezing this payroll:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.unfreeze(id, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll run has been unfrozen. Changes can now be made.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to unfreeze payroll');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): "secondary" | "destructive" | "default" | "outline" => {
    const s = status?.toLowerCase();
    if (s === 'approved' || s === 'paid') return 'default';
    if (s === 'draft') return 'secondary';
    if (s === 'pending' || s === 'pending finance approval' || s === 'under review' || s === 'under_review') return 'outline';
    if (s === 'rejected') return 'destructive';
    if (s === 'locked' || s === 'frozen') return 'default';
    if (s === 'unlocked') return 'outline';
    return 'secondary';
  };

  // Use companywide currency
  const [companyCurrency, setCompanyCurrency] = useState<string>('');
  useEffect(() => {
    payrollConfigurationService.getCompanyCurrency().then((res: any) => {
      setCompanyCurrency(res?.data?.currency || res?.currency || '');
    }).catch(() => {
      setCompanyCurrency('');
    });
  }, []);
  const formatCurrency = (amount: number | undefined, currency?: string) => {
    const curr = currency || companyCurrency || '';
    if (amount === undefined || amount === null) return `${curr} 0`;
    return `${curr} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not available';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-6 relative">
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

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="hover:text-primary transition-colors">Manager Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Payroll Review</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Payroll Review & Approval
                </h1>
              </div>
              <p className="text-muted-foreground">
                Review payroll runs, approve submissions, and manage freeze/unfreeze operations
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 border-primary/30">
              <Shield className="h-3 w-3 mr-2" />
              Manager Access
            </Badge>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-destructive/70 hover:text-destructive">
              ×
            </button>
          </div>
        )}
        {success && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-success">{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-success/70 hover:text-success">
              ×
            </button>
          </div>
        )}

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v as any)} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Review
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                All Runs
              </TabsTrigger>
              <TabsTrigger value="frozen" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Frozen Runs
              </TabsTrigger>
            </TabsList>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRuns}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Additional Filter for All Runs */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filter by Status</span>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="under review">Under Review</SelectItem>
                      <SelectItem value="pending finance approval">Pending Finance Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="locked">Locked</SelectItem>
                      <SelectItem value="unlocked">Unlocked</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Runs Grid */}
          <TabsContent value={activeTab} className="mt-0">
            {loading && runs.length === 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-6 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : runs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    {activeTab === 'pending' ? (
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    ) : activeTab === 'frozen' ? (
                      <Unlock className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {activeTab === 'pending' 
                      ? 'No payroll runs awaiting review' 
                      : activeTab === 'frozen'
                      ? 'No frozen payroll runs'
                      : 'No payroll runs found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'pending' 
                      ? 'All payroll runs have been reviewed and approved'
                      : activeTab === 'frozen'
                      ? 'All payroll runs are currently unlocked for editing'
                      : 'Try adjusting your filters to see more results'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {runs.map((run) => (
                  <Card 
                    key={run._id} 
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedRun?._id === run._id ? 'ring-2 ring-primary' : ''
                    } ${run.frozen ? 'border-blue-300' : ''}`}
                    onClick={() => {
                      setSelectedRun(run);
                      fetchRunDetails(run._id);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-foreground">
                            {formatPayrollPeriod(run.payrollPeriod)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Building className="h-3 w-3" />
                            {run.entity || 'Default Entity'}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant={getStatusColor(run.status || '')} className="capitalize">
                            {run.status || 'Unknown'}
                          </Badge>
                          {run.frozen && (
                            <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                              <Lock className="h-3 w-3 mr-1" />
                              Frozen
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Employees
                          </span>
                          <span className="font-medium text-foreground">{run.employees || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <AlertOctagon className="h-3 w-3" />
                            Exceptions
                          </span>
                          <span className={`font-medium ${(run.exceptions || 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {run.exceptions || 0}
                          </span>
                        </div>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">Total Net Pay</span>
                          <span className="text-lg font-bold text-success">
                            {formatCurrency(run.totalnetpay, run.currency)}
                          </span>
                        </div>
                        {/* Approval Status */}
                        <div className="flex gap-2 mt-2">
                          <Badge variant={run.approvedByManager ? 'default' : 'outline'} className="text-xs">
                            {run.approvedByManager ? 'Manager ✓' : 'Manager ○'}
                          </Badge>
                          <Badge variant={run.approvedByFinance ? 'default' : 'outline'} className="text-xs">
                            {run.approvedByFinance ? 'Finance ✓' : 'Finance ○'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="ghost" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Run Details Dialog */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Payroll Run Review
                </h2>
                <p className="text-muted-foreground mt-1">
                  {formatPayrollPeriod(selectedRun.payrollPeriod)} • {selectedRun.entity || 'Default Entity'}
                </p>
              </div>
              <button
                onClick={() => { setSelectedRun(null); setRunDetails(null); setEmployeeDetails([]); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status & Info Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getStatusColor(selectedRun.status || '')} className="text-sm capitalize">
                  {selectedRun.status || 'Unknown'}
                </Badge>
                {selectedRun.frozen && (
                  <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">
                    <Lock className="h-3 w-3 mr-1" />
                    Frozen
                  </Badge>
                )}
                {selectedRun.approvedByManager && (
                  <Badge variant="default">
                    <Shield className="h-3 w-3 mr-1" />
                    Manager Approved
                  </Badge>
                )}
                {selectedRun.approvedByFinance && (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Finance Approved
                  </Badge>
                )}
              </div>

              {/* Financial Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Employees</div>
                      <div className="text-2xl font-bold text-foreground">{selectedRun.employees || 0}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Exceptions</div>
                      <div className={`text-2xl font-bold ${(selectedRun.exceptions || 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {selectedRun.exceptions || 0}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Gross Pay</div>
                      <div className="text-xl font-bold text-foreground">
                        {formatCurrency(selectedRun.totalGrossPay || runDetails?.totalGrossPay, selectedRun.currency || runDetails?.currency)}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Deductions</div>
                      <div className="text-xl font-bold text-destructive">
                        -{formatCurrency(selectedRun.totalDeductions || runDetails?.totalDeductions, selectedRun.currency || runDetails?.currency)}
                      </div>
                    </div>
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <div className="text-sm text-success">Net Pay</div>
                      <div className="text-2xl font-bold text-success">
                        {formatCurrency(selectedRun.totalnetpay, selectedRun.currency)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Earnings Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedRun.totalBaseSalary !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Base Salaries</span>
                        <span className="font-medium">EGP {selectedRun.totalBaseSalary?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalAllowances !== undefined && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-muted-foreground">Allowances</span>
                        <span className="font-medium">+EGP {selectedRun.totalAllowances?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalOvertime !== undefined && selectedRun.totalOvertime > 0 && (
                      <div className="flex justify-between items-center text-blue-600">
                        <span className="text-muted-foreground">Overtime</span>
                        <span className="font-medium">+EGP {selectedRun.totalOvertime?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Deductions Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedRun.totalTaxDeductions !== undefined && (
                      <div className="flex justify-between items-center text-destructive">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">-EGP {selectedRun.totalTaxDeductions?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalInsuranceDeductions !== undefined && (
                      <div className="flex justify-between items-center text-destructive">
                        <span className="text-muted-foreground">Insurance</span>
                        <span className="font-medium">-EGP {selectedRun.totalInsuranceDeductions?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                    {selectedRun.totalPenalties !== undefined && selectedRun.totalPenalties > 0 && (
                      <div className="flex justify-between items-center text-destructive">
                        <span className="text-muted-foreground">Penalties</span>
                        <span className="font-medium">-EGP {selectedRun.totalPenalties?.toLocaleString() || '0'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Irregularities Section */}
              {(selectedRun.irregularities && selectedRun.irregularities.length > 0) && (
                <Card className="border-warning/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-5 w-5" />
                      Flagged Irregularities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedRun.irregularities.map((irr, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                          <span className="text-warning text-sm">{irr}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Freeze/Unfreeze Information */}
              {selectedRun.frozen && selectedRun.frozenReason && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Lock className="h-5 w-5" />
                      Frozen Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-blue-800 mb-2">{selectedRun.frozenReason}</p>
                    {selectedRun.frozenAt && (
                      <div className="text-sm text-blue-600">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Frozen: {formatDate(selectedRun.frozenAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Approval Workflow */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Approval Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.approvedByManager 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-warning/10 border-warning/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedRun.approvedByManager ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-warning" />
                        )}
                        <h4 className="font-medium">Manager Approval</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRun.approvedByManager 
                          ? `Approved ${selectedRun.approvedByManagerAt ? formatDate(selectedRun.approvedByManagerAt) : ''}` 
                          : 'Awaiting review and approval'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center text-muted-foreground">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.approvedByFinance 
                        ? 'bg-success/10 border-success/30' 
                        : selectedRun.approvedByManager 
                          ? 'bg-warning/10 border-warning/30'
                          : 'bg-muted/50 border-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedRun.approvedByFinance ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : selectedRun.approvedByManager ? (
                          <Clock className="h-5 w-5 text-warning" />
                        ) : (
                          <Settings className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h4 className="font-medium">Finance Approval</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRun.approvedByFinance 
                          ? `Approved ${selectedRun.approvedByFinanceAt ? formatDate(selectedRun.approvedByFinanceAt) : ''}`
                          : selectedRun.approvedByManager
                            ? 'Pending finance review'
                            : 'Requires manager approval first'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Details */}
              {employeeDetails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Employee Payroll Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-muted-foreground">Employee</th>
                            <th className="text-right p-3 text-muted-foreground">Gross</th>
                            <th className="text-right p-3 text-muted-foreground">Deductions</th>
                            <th className="text-right p-3 text-muted-foreground">Net</th>
                            <th className="text-center p-3 text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeDetails.slice(0, 10).map((emp, idx) => (
                            <tr key={emp._id || idx} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium text-foreground">
                                      {emp.employeeName || emp.employeeId?.toString().slice(-8) || '-'}
                                    </div>
                                    {emp.exceptions && emp.exceptions.length > 0 && (
                                      <div className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {emp.exceptions.length} exception(s)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-right p-3 font-medium">{formatCurrency(emp.grossPay, emp.currency)}</td>
                              <td className="text-right p-3 text-destructive">
                                -{formatCurrency((emp.taxDeductions || 0) + (emp.insuranceDeductions || 0) + (emp.otherDeductions || 0), emp.currency)}
                              </td>
                              <td className="text-right p-3 font-bold text-success">{formatCurrency(emp.netPay, emp.currency)}</td>
                              <td className="text-center p-3">
                                <Badge variant="outline" className="capitalize">
                                  {emp.status || '-'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {employeeDetails.length > 10 && (
                        <div className="text-center p-3 text-sm text-muted-foreground">
                          Showing 10 of {employeeDetails.length} employees
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Run Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Run Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {(runDetails?.runId || selectedRun.runId) && (
                      <div>
                        <span className="text-sm text-muted-foreground">Run ID</span>
                        <div className="font-mono text-sm text-foreground">{runDetails?.runId || selectedRun.runId}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Created</span>
                      <div className="text-foreground">{formatDate(runDetails?.createdAt || selectedRun.createdAt)}</div>
                    </div>
                    {runDetails?.processedAt && (
                      <div>
                        <span className="text-sm text-muted-foreground">Processed</span>
                        <div className="text-foreground">{formatDate(runDetails.processedAt)}</div>
                      </div>
                    )}
                    {runDetails?.paymentStatus && (
                      <div>
                        <span className="text-sm text-muted-foreground">Payment Status</span>
                        <div className="text-foreground capitalize">{runDetails.paymentStatus}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-4">
                {/* Manager Approval */}
                {(selectedRun.status === 'under review' || selectedRun.status === 'under_review') && !selectedRun.managerApprovalDate && (
                  <Button 
                    onClick={() => handleApprove(selectedRun._id)}
                    disabled={loading}
                    className="w-full py-6 text-lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve Payroll Run
                  </Button>
                )}

                {/* Status Information */}
                {selectedRun.status === 'draft' && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">Draft Status</span>
                    </div>
                    <p className="text-sm text-warning">
                      Awaiting submission from payroll specialist for review
                    </p>
                  </div>
                )}
                {selectedRun.status === 'pending finance approval' && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Manager Approved</span>
                    </div>
                    <p className="text-sm text-success">
                      Awaiting finance department approval
                    </p>
                  </div>
                )}

                {/* Freeze/Unfreeze Actions */}
                {(selectedRun.status === 'approved' || selectedRun.status === 'locked' || selectedRun.status === 'unlocked') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Security Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedRun.status === 'unlocked' && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Unlock className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-purple-700">Unlocked for Corrections</span>
                          </div>
                          <p className="text-sm text-purple-600">
                            This payroll run is unlocked. The Payroll Specialist can make edits and resubmit for the full approval cycle.
                          </p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        {selectedRun.status === 'approved' || selectedRun.status === 'unlocked' ? (
                          <Button 
                            onClick={() => handleFreeze(selectedRun._id)}
                            disabled={loading}
                            variant="default"
                            className="flex-1 py-4"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            {selectedRun.status === 'unlocked' ? 'Re-Freeze Payroll' : 'Freeze Payroll'}
                          </Button>
                        ) : selectedRun.status === 'locked' ? (
                          <Button 
                            onClick={() => handleUnfreeze(selectedRun._id)}
                            disabled={loading}
                            variant="outline"
                            className="flex-1 py-4"
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Unfreeze for Corrections
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}