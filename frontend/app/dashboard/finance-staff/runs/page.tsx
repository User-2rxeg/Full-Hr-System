'use client';

import { useEffect, useState } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { payrollExecutionService } from '@/app/services/payroll-execution';
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
import { 
  AlertCircle, 
  CheckCircle, 
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Building,
  Clock,
  Shield,
  ChevronRight,
  RefreshCw,
  Settings,
  Eye,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  Banknote,
  Percent,
  Calculator,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from "lucide-react";

interface PayrollRun {
  _id: string;
  payrollPeriod?: string;
  entity?: string;
  status?: string;
  employees?: number;
  exceptions?: number;
  totalnetpay?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalTaxDeductions?: number;
  totalInsuranceDeductions?: number;
  totalTaxes?: number;
  totalInsurance?: number;
  createdAt?: string;
  approvedByManager?: boolean;
  approvedByManagerAt?: string;
  approvedByFinance?: boolean;
  approvedByFinanceAt?: string;
  frozen?: boolean;
  payslipsGenerated?: boolean;
  payslipsGeneratedAt?: string;
  currency?: string;
}

interface Payslip {
  _id?: string;
  employeeId?: string;
  employeeName?: string;
  payrollPeriod?: string;
  basePay?: number;
  grossPay?: number;
  netPay?: number;
  taxDeductions?: number;
  insuranceDeductions?: number;
  allowances?: number;
  overtime?: number;
  penalties?: number;
  createdAt?: string;
}

export default function FinanceStaffRunsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    fetchRuns();
  }, [activeTab]);

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
      const res = await payrollExecutionService.listRuns(params);

      if (res?.error) {
        setError(res.error);
        return;
      }

      const data = (res?.data || res) as any;
      let items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Filter based on active tab
      if (activeTab === 'pending') {
        items = items.filter((r: PayrollRun) =>
          r.status === 'pending finance approval' || (r.approvedByManager && !r.approvedByFinance)
        );
      } else if (activeTab === 'approved') {
        items = items.filter((r: PayrollRun) => r.approvedByFinance || r.status === 'approved');
      }

      setRuns(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load payroll runs');
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
      if (details?.payslips) {
        setPayslips(details.payslips);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load run details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFinance = async (id: string) => {
    if (!confirm('Approve this payroll run for payment? This is the final approval step before payroll can be paid out.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.approveByFinance(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payroll approved successfully. Proceeding to payment processing.');
      fetchRuns();
      setSelectedRun(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to approve payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslips = async (id: string) => {
    if (!confirm('Generate payslips for all employees in this payroll run?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await payrollExecutionService.generatePayslips(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSuccess('Payslips generated successfully. Employees can now access their payslips.');
      fetchRuns();
      if (selectedRun) {
        fetchRunDetails(selectedRun._id);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate payslips');
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

  // Helper to format currency with dynamic currency code
  const formatCurrency = (amount: number | undefined, currency: string = 'EGP') => {
    if (amount === undefined || amount === null) return `${currency} 0`;
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not available';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatPeriod = (period: any): string => {
  if (!period) return 'No Period';
  
  // If it's already a string, try to format it as date
  if (typeof period === 'string') {
    const d = new Date(period);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    return period;
  }
  
  // If it's an object with month/year properties
  if (typeof period === 'object' && period !== null) {
    // Handle { month, year } format
    if (period.month !== undefined && period.year !== undefined) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const month = monthNames[Number(period.month)] || `Month ${period.month}`;
      return `${month} ${period.year}`;
    }
    
    // Handle { startDate, endDate } format
    if (period.startDate && period.endDate) {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return `${start.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })} - ${end.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}`;
      }
    }
    
    // Handle other object formats
    if (period.name) return String(period.name);
    if (period.label) return String(period.label);
    
    // If we have a toString method, use it
    if (typeof period.toString === 'function') {
      return period.toString();
    }
    
    // Fallback: stringify the object
    return 'Custom Period';
  }
  
  // For any other type, convert to string
  return String(period);
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
            <span className="hover:text-primary transition-colors">Finance Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Payroll Approval</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Banknote className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Finance Payroll Review
                </h1>
              </div>
              <p className="text-muted-foreground">
                Final review, approval, and payslip generation for payroll processing
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1 border-primary/30">
              <Shield className="h-3 w-3 mr-2" />
              Finance Access
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

        {/* Finance Dashboard Stats */}
        {activeTab === 'pending' && runs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-warning">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                    <p className="text-2xl font-bold text-warning">{runs.length}</p>
                  </div>
                  <div className="p-2 bg-warning/10 rounded-lg">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold text-foreground">
                      {runs.reduce((sum, r) => sum + (r.employees || 0), 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-destructive">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Exceptions</p>
                    <p className="text-2xl font-bold text-destructive">
                      {runs.reduce((sum, r) => sum + (r.exceptions || 0), 0)}
                    </p>
                  </div>
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-success">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Net Payroll</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(runs.reduce((sum, r) => sum + (r.totalnetpay || 0), 0), runs[0]?.currency)}
                    </p>
                  </div>
                  <div className="p-2 bg-success/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v as any)} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Finance Approval
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved & Ready
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                All Runs
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
                    ) : activeTab === 'approved' ? (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {activeTab === 'pending'
                      ? 'No payroll runs awaiting finance approval'
                      : activeTab === 'approved'
                      ? 'No approved payroll runs'
                      : 'No payroll runs found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'pending'
                      ? 'Payroll runs must be approved by manager first before appearing here'
                      : activeTab === 'approved'
                      ? 'Approve payroll runs to see them listed here'
                      : 'Try adjusting your filters to see more results'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {runs.map((run) => (
                  <Card 
                    key={run._id} 
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => {
                      setSelectedRun(run);
                      fetchRunDetails(run._id);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-foreground">
                            {formatPeriod(run.payrollPeriod)}
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
                          {run.payslipsGenerated && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                              <FileSpreadsheet className="h-3 w-3 mr-1" />
                              Payslips Ready
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
                            <AlertTriangle className="h-3 w-3" />
                            Exceptions
                          </span>
                          <span className={`font-medium ${(run.exceptions || 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {run.exceptions || 0}
                          </span>
                        </div>
                      </div>
                      
                      {/* Financial Summary */}
                      <div className="bg-muted/30 rounded-lg p-3 mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Gross Pay</span>
                          <span className="text-foreground">{formatCurrency(run.totalGrossPay, run.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Taxes</span>
                          <span className="text-destructive">-{formatCurrency(run.totalTaxes || run.totalTaxDeductions, run.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Insurance</span>
                          <span className="text-destructive">-{formatCurrency(run.totalInsurance || run.totalInsuranceDeductions, run.currency)}</span>
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
                        Review Details
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
                  Finance Review
                </h2>
                <p className="text-muted-foreground mt-1">
                  {formatPeriod(selectedRun.payrollPeriod)} • {selectedRun.entity || 'Default Entity'}
                </p>
              </div>
              <button
                onClick={() => { setSelectedRun(null); setRunDetails(null); setPayslips([]); }}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status & Info Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={getStatusColor(selectedRun.status || 'default')} className="text-sm capitalize">
                  {selectedRun.status || 'Unknown'}
                </Badge>
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
                {selectedRun.payslipsGenerated && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                    Payslips Generated
                  </Badge>
                )}
              </div>

              {/* Financial Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
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
                      <div className="text-sm text-muted-foreground">Gross Pay</div>
                      <div className="text-xl font-bold text-foreground">
                        {formatCurrency(selectedRun.totalGrossPay || runDetails?.totalGrossPay, selectedRun.currency || runDetails?.currency)}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Total Deductions</div>
                      <div className="text-xl font-bold text-destructive">
                        -{formatCurrency(selectedRun.totalDeductions || runDetails?.totalDeductions, selectedRun.currency || runDetails?.currency)}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Exceptions</div>
                      <div className={`text-2xl font-bold ${(selectedRun.exceptions || 0) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {selectedRun.exceptions || 0}
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

              {/* Deductions Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-destructive/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <Percent className="h-4 w-4" />
                      Tax Deductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {formatCurrency(
                        selectedRun.totalTaxes || selectedRun.totalTaxDeductions ||
                        runDetails?.totalTaxes || runDetails?.totalTaxDeductions
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                      <Shield className="h-4 w-4" />
                      Social Insurance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(
                        selectedRun.totalInsurance || selectedRun.totalInsuranceDeductions ||
                        runDetails?.totalInsurance || runDetails?.totalInsuranceDeductions
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Other Deductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(
                        (selectedRun.totalDeductions || 0)
                        - (selectedRun.totalTaxes || selectedRun.totalTaxDeductions || 0)
                        - (selectedRun.totalInsurance || selectedRun.totalInsuranceDeductions || 0)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Approval Workflow */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5" />
                    Approval Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.approvedByManager 
                        ? 'bg-success/10 border-success/30' 
                        : 'bg-muted/50 border-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedRun.approvedByManager ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h4 className="font-medium">Manager Approval</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRun.approvedByManager 
                          ? `Approved ${selectedRun.approvedByManagerAt ? formatDate(selectedRun.approvedByManagerAt) : ''}` 
                          : 'Awaiting manager review'}
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
                            ? 'Action required'
                            : 'Requires manager approval first'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center text-muted-foreground">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    
                    <div className={`flex-1 p-4 rounded-lg border-2 ${
                      selectedRun.payslipsGenerated
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-muted/50 border-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedRun.payslipsGenerated ? (
                          <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                        <h4 className="font-medium">Payslip Generation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedRun.payslipsGenerated
                          ? `Generated ${selectedRun.payslipsGeneratedAt ? formatDate(selectedRun.payslipsGeneratedAt) : ''}`
                          : 'Pending generation after approval'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payslips Section */}
              {payslips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Generated Payslips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-muted-foreground">Employee</th>
                            <th className="text-right p-3 text-muted-foreground">Base Pay</th>
                            <th className="text-right p-3 text-muted-foreground">Gross</th>
                            <th className="text-right p-3 text-muted-foreground">Tax</th>
                            <th className="text-right p-3 text-muted-foreground">Insurance</th>
                            <th className="text-right p-3 text-muted-foreground">Net Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payslips.slice(0, 10).map((slip, idx) => (
                            <tr key={slip._id || idx} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <div className="font-medium text-foreground">
                                    {slip.employeeName || slip.employeeId?.toString().slice(-8) || '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="text-right p-3 font-medium">{formatCurrency(slip.basePay)}</td>
                              <td className="text-right p-3 font-medium">{formatCurrency(slip.grossPay)}</td>
                              <td className="text-right p-3 text-destructive">-{formatCurrency(slip.taxDeductions)}</td>
                              <td className="text-right p-3 text-destructive">-{formatCurrency(slip.insuranceDeductions)}</td>
                              <td className="text-right p-3 font-bold text-success">{formatCurrency(slip.netPay)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {payslips.length > 10 && (
                        <div className="text-center p-3 text-sm text-muted-foreground">
                          Showing 10 of {payslips.length} payslips
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exceptions Warning */}
              {(selectedRun.exceptions || 0) > 0 && (
                <Card className="border-destructive/20 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Exceptions Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-destructive font-medium">
                        This payroll run has {selectedRun.exceptions} exception(s) requiring review
                      </div>
                      <p className="text-sm text-destructive/80">
                        Review exceptions carefully before approval. Common issues include negative net pay, 
                        minimum wage violations, missing contract data, and calculation discrepancies.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Run Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Run Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <div className="font-medium">{formatDate(selectedRun.createdAt)}</div>
                    </div>
                    {(selectedRun.approvedByManagerAt) && (
                      <div>
                        <span className="text-muted-foreground">Manager Approved</span>
                        <div className="font-medium text-success">{formatDate(selectedRun.approvedByManagerAt)}</div>
                      </div>
                    )}
                    {(selectedRun.approvedByFinanceAt) && (
                      <div>
                        <span className="text-muted-foreground">Finance Approved</span>
                        <div className="font-medium text-success">{formatDate(selectedRun.approvedByFinanceAt)}</div>
                      </div>
                    )}
                    {(selectedRun.payslipsGeneratedAt) && (
                      <div>
                        <span className="text-muted-foreground">Payslips Generated</span>
                        <div className="font-medium">{formatDate(selectedRun.payslipsGeneratedAt)}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-4">
                {/* Finance Approval */}
                {selectedRun.status === 'pending finance approval' && (
                  <Button 
                    onClick={() => handleApproveFinance(selectedRun._id)}
                    disabled={loading}
                    className="w-full py-6 text-lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Final Finance Approval
                  </Button>
                )}

                {/* Status Messages */}
                {selectedRun.status === 'draft' && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">Draft Status</span>
                    </div>
                    <p className="text-sm text-warning">
                      Awaiting submission from payroll specialist
                    </p>
                  </div>
                )}

                {/* Payslip Generation */}
                {(selectedRun.status === 'approved' || selectedRun.status === 'locked') && !selectedRun.payslipsGenerated && (
                  <Button 
                    onClick={() => handleGeneratePayslips(selectedRun._id)}
                    disabled={loading}
                    variant="outline"
                    className="w-full py-6 text-lg border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Generate & Distribute Payslips
                  </Button>
                )}

                {/* Success Messages */}
                {(selectedRun.status === 'approved' || selectedRun.status === 'locked') && selectedRun.payslipsGenerated && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Processing Complete</span>
                    </div>
                    <p className="text-sm text-success">
                      Payroll approved and payslips distributed to employees
                    </p>
                  </div>
                )}

                {/* Frozen Status */}
                {(selectedRun.status === 'locked' || selectedRun.status === 'frozen') && !selectedRun.payslipsGenerated && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-700">Frozen Payroll</span>
                    </div>
                    <p className="text-sm text-blue-600">
                      Payroll is secured and ready for payslip generation
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}