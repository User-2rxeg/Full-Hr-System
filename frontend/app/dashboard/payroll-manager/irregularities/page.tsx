'use client';

import { useEffect, useState, JSX } from 'react';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { Snackbar } from './snackbar';
import Link from 'next/link';
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
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  Filter,
  Clock,
  User,
  Building,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ShieldAlert,
  Settings,
  RefreshCw,
  Calculator,
  Percent,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";

interface Irregularity {
  _id: string;
  employeeCode: string;
  employeeName: string;
  type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'escalated' | 'resolved' | 'rejected';
  description: string;
  currentValue?: number;
  previousValue?: number;
  previousAverage?: number;
  variancePercentage?: number;
  flaggedAt: string;
  escalatedAt?: string;
  escalationReason?: string;
  resolution?: {
    action: string;
    notes: string;
    resolvedBy: string;
    resolvedAt: string;
  };
  payrollRun?: {
    entity: string;
    period: string;
    status: string;
    runId: string;
  };
}

export default function IrregularitiesPage() {
  const [irregularities, setIrregularities] = useState<Irregularity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'escalated' | 'resolved'>('all');
  const [selectedIrregularity, setSelectedIrregularity] = useState<Irregularity | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    action: 'approved',
    notes: '',
    adjustedValue: '',
  });
  const [stats, setStats] = useState({ total: 0, pending: 0, escalated: 0, resolved: 0 });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({ 
    open: false, 
    message: '' 
  });
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

  useEffect(() => {
    fetchIrregularities();
  }, [filter]);

  interface IrregularityDataResponse {
    data: Irregularity[];
    pending?: number;
    escalated?: number;
    resolved?: number;
    [key: string]: any;
  }

  const fetchIrregularities = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      const res = await payrollExecutionService.listIrregularities(params);
      const isIrregularityArray = (data: any): data is Irregularity[] =>
        Array.isArray(data) && data.every(
          (item) => typeof item === 'object' && item !== null && '_id' in item
        );

      let irregularityData: IrregularityDataResponse;
      if (
        res?.data &&
        typeof res.data === 'object' &&
        'data' in res.data &&
        isIrregularityArray(res.data.data)
      ) {
        irregularityData = res.data as IrregularityDataResponse;
      } else {
        irregularityData = { data: [], pending: 0, escalated: 0, resolved: 0 };
      }
      
      const data = Array.isArray(irregularityData.data) ? irregularityData.data : [];
      setIrregularities(data);
      setStats({
        total: data.length,
        pending: data.filter(i => i.status === 'pending').length,
        escalated: data.filter(i => i.status === 'escalated').length,
        resolved: data.filter(i => i.status === 'resolved').length,
      });
    } catch (err) {
      console.error('Failed to fetch irregularities:', err);
      setSnackbar({ open: true, message: 'Failed to load irregularities', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIrregularity || !resolutionForm.notes.trim()) {
      setSnackbar({ open: true, message: 'Please provide resolution notes', type: 'error' });
      return;
    }

    setResolving(true);
    try {
      const payload: any = {
        action: resolutionForm.action,
        notes: resolutionForm.notes,
      };
      if (resolutionForm.action === 'adjusted' && resolutionForm.adjustedValue) {
        payload.adjustedValue = parseFloat(resolutionForm.adjustedValue);
      }
      await payrollExecutionService.resolveIrregularity(selectedIrregularity._id, payload);
      setSnackbar({ open: true, message: 'Irregularity resolved successfully', type: 'success' });
      setSelectedIrregularity(null);
      setResolutionForm({ action: 'approved', notes: '', adjustedValue: '' });
      fetchIrregularities();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || 'Failed to resolve irregularity', 
        type: 'error' 
      });
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      info: 'default',
      low: 'secondary',
      medium: 'secondary', // changed from 'warning' to 'secondary'
      high: 'destructive',
      critical: 'destructive',
    };
    return (
      <Badge variant={variants[severity] || 'default'} className="capitalize">
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      escalated: 'secondary',
      resolved: 'outline',
      rejected: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      overtime_spike: <TrendingUp className="h-4 w-4" />,
      salary_spike: <DollarSign className="h-4 w-4" />,
      negative_net_pay: <AlertCircle className="h-4 w-4" />,
      commission_spike: <Percent className="h-4 w-4" />,
      new_hire_prorated: <User className="h-4 w-4" />,
      loan_deduction: <Calculator className="h-4 w-4" />,
      penalty_deduction: <ShieldAlert className="h-4 w-4" />,
      absence_deduction: <Calendar className="h-4 w-4" />,
      suspended_employee: <XCircle className="h-4 w-4" />,
      extended_unpaid_leave: <Clock className="h-4 w-4" />,
    };
    return icons[type] || <AlertTriangle className="h-4 w-4" />;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => `EGP ${amount?.toLocaleString() || 0}`;

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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/dashboard/payroll-manager" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Irregularities Management</span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <ShieldAlert className="h-6 w-6 text-amber-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Payroll Irregularities
                </h1>
              </div>
              <p className="text-muted-foreground">
                Monitor, investigate, and resolve flagged payroll compliance issues
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchIrregularities}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Irregularities
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{stats.total}</span>
                  <span className="text-sm text-muted-foreground">issues</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-600">{stats.pending}</span>
                  <span className="text-sm text-muted-foreground">awaiting action</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Escalated Issues
                </CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-600">{stats.escalated}</span>
                  <span className="text-sm text-muted-foreground">escalated</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resolved
                </CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-600">{stats.resolved}</span>
                  <span className="text-sm text-muted-foreground">closed</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Irregularities Management</CardTitle>
                <CardDescription>
                  Review and take action on flagged payroll compliance issues
                </CardDescription>
              </div>
              <Tabs value={filter} onValueChange={(v: any) => setFilter(v as any)} className="w-[400px]">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="escalated" className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Escalated
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Resolved
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : irregularities.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No irregularities found</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'All payroll irregularities have been resolved'
                    : `No ${filter} irregularities at this time`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {irregularities.map((irr) => (
                  <Card 
                    key={irr._id} 
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      selectedIrregularity?._id === irr._id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedIrregularity(irr)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getTypeIcon(irr.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-foreground">
                                {irr.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h3>
                              <div className="flex gap-2">
                                {getSeverityBadge(irr.severity)}
                                {getStatusBadge(irr.status)}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {irr.description}
                            </p>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-foreground">{irr.employeeName}</span>
                                <span className="text-muted-foreground">({irr.employeeCode})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-muted-foreground" />
                                <span>{irr.payrollRun?.entity || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>{formatDate(irr.flaggedAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {irr.currentValue !== undefined && (
                            <div className="text-right">
                              <div className="text-lg font-bold text-foreground">
                                {formatCurrency(irr.currentValue)}
                              </div>
                              {irr.variancePercentage && (
                                <div className={`text-sm ${irr.variancePercentage > 0 ? 'text-rose-600' : 'text-green-600'}`}>
                                  <TrendingUp className="inline h-3 w-3 mr-1" />
                                  {irr.variancePercentage}% variance
                                </div>
                              )}
                            </div>
                          )}
                          <Button variant={irr.status === 'resolved' ? 'ghost' : 'default'} size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {irr.status === 'resolved' ? 'View Details' : 'Resolve'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolution Dialog */}
      {selectedIrregularity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-6 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedIrregularity.status === 'resolved' ? 'Resolution Details' : 'Resolve Irregularity'}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {selectedIrregularity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <button
                onClick={() => setSelectedIrregularity(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Issue Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Issue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Employee Details</h4>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{selectedIrregularity.employeeName}</div>
                            <div className="text-sm text-muted-foreground">{selectedIrregularity.employeeCode}</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Department</h4>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="font-medium">{selectedIrregularity.payrollRun?.entity || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Severity & Status</h4>
                        <div className="flex gap-2">
                          {getSeverityBadge(selectedIrregularity.severity)}
                          {getStatusBadge(selectedIrregularity.status)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Flagged Date</h4>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(selectedIrregularity.flaggedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description & Values */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Issue Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                    <p className="text-foreground">{selectedIrregularity.description}</p>
                  </div>
                  
                  {selectedIrregularity.currentValue !== undefined && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Value</h4>
                        <div className="text-2xl font-bold text-foreground">
                          {formatCurrency(selectedIrregularity.currentValue)}
                        </div>
                      </div>
                      {selectedIrregularity.previousAverage !== undefined && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Historical Average</h4>
                          <div className="text-xl font-semibold text-foreground">
                            {formatCurrency(selectedIrregularity.previousAverage)}
                          </div>
                        </div>
                      )}
                      {selectedIrregularity.variancePercentage !== undefined && (
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Variance</h4>
                          <div className={`text-xl font-semibold ${
                            selectedIrregularity.variancePercentage > 0 ? 'text-rose-600' : 'text-green-600'
                          }`}>
                            {selectedIrregularity.variancePercentage > 0 ? '+' : ''}
                            {selectedIrregularity.variancePercentage}%
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Escalation Info */}
              {selectedIrregularity.escalationReason && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <CardTitle className="text-base text-purple-700">Escalation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-purple-800 mb-2">{selectedIrregularity.escalationReason}</p>
                    {selectedIrregularity.escalatedAt && (
                      <div className="text-sm text-purple-600">
                        Escalated: {formatDate(selectedIrregularity.escalatedAt)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Resolution Section */}
              {selectedIrregularity.status === 'resolved' && selectedIrregularity.resolution ? (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardHeader>
                    <CardTitle className="text-base text-emerald-700">Resolution Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-emerald-600 mb-1">Action Taken</h4>
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 capitalize">
                          {selectedIrregularity.resolution.action}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-emerald-600 mb-1">Resolved By</h4>
                        <div className="font-medium">{selectedIrregularity.resolution.resolvedBy}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-emerald-600 mb-1">Resolution Notes</h4>
                      <p className="text-emerald-800">{selectedIrregularity.resolution.notes}</p>
                    </div>
                    <div className="text-sm text-emerald-600">
                      Resolved: {formatDate(selectedIrregularity.resolution.resolvedAt)}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resolution Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Select Resolution</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { action: 'approved', label: 'Approve', description: 'Accept flagged value', variant: 'default' },
                          { action: 'rejected', label: 'Reject', description: 'Flag for correction', variant: 'destructive' },
                          { action: 'adjusted', label: 'Adjust', description: 'Modify value', variant: 'outline' },
                          { action: 'excluded', label: 'Exclude', description: 'Remove from payroll', variant: 'secondary' },
                        ].map(({ action, label, description, variant }) => (
                          <Button
                            key={action}
                            variant={resolutionForm.action === action ? 'default' : 'outline'}
                            className={`h-auto py-4 px-4 ${
                              resolutionForm.action === action 
                                ? 'border-primary bg-primary/10 text-primary' 
                                : ''
                            }`}
                            onClick={() => setResolutionForm({ ...resolutionForm, action })}
                          >
                            <div className="text-left">
                              <div className="font-medium">{label}</div>
                              <div className="text-xs text-muted-foreground mt-1">{description}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {resolutionForm.action === 'adjusted' && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Adjusted Value (EGP)
                        </label>
                        <input
                          type="number"
                          value={resolutionForm.adjustedValue}
                          onChange={(e) => setResolutionForm({ ...resolutionForm, adjustedValue: e.target.value })}
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                          placeholder="Enter adjusted value"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Resolution Notes <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        value={resolutionForm.notes}
                        onChange={(e) => setResolutionForm({ ...resolutionForm, notes: e.target.value })}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                        rows={4}
                        placeholder="Provide detailed explanation of resolution decision..."
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-3 border-t pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedIrregularity(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResolve}
                      disabled={resolving || !resolutionForm.notes.trim()}
                    >
                      {resolving ? 'Processing...' : 'Submit Resolution'}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}