'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
} from '@/app/services/offboarding';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileX,
  AlertTriangle,
  LogOut,
  UserMinus,
  ClipboardCheck,
  DollarSign,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  ShieldCheck,
  Settings,
  ChevronRight
} from 'lucide-react';

export default function OffboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<TerminationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TerminationStatus>('all');
  const [filterType, setFilterType] = useState<'all' | 'resignations' | 'terminations'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getAllTerminationRequests();
      setRequests(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('Failed to fetch offboarding data:', err);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setRequests([]);
      } else {
        setError(err.message || 'Failed to fetch offboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizeValue = (val: string) => val?.toLowerCase?.() || val;

  const filteredRequests = requests.filter((request) => {
    const requestStatus = normalizeValue(request.status);
    const requestInitiator = normalizeValue(request.initiator);

    if (filterStatus !== 'all' && requestStatus !== normalizeValue(filterStatus)) return false;
    if (filterType === 'resignations' && requestInitiator !== normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    if (filterType === 'terminations' && requestInitiator === normalizeValue(TerminationInitiation.EMPLOYEE)) return false;
    return true;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.PENDING)).length,
    underReview: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.UNDER_REVIEW)).length,
    approved: requests.filter((r) => normalizeValue(r.status) === normalizeValue(TerminationStatus.APPROVED)).length,
    resignations: requests.filter((r) => normalizeValue(r.initiator) === normalizeValue(TerminationInitiation.EMPLOYEE)).length,
    terminations: requests.filter((r) => normalizeValue(r.initiator) !== normalizeValue(TerminationInitiation.EMPLOYEE)).length,
  };

  const getInitiatorLabel = (initiator: TerminationInitiation) => {
    switch (initiator) {
      case TerminationInitiation.EMPLOYEE:
        return 'Resignation';
      case TerminationInitiation.HR:
        return 'HR Initiated';
      case TerminationInitiation.MANAGER:
        return 'Manager Initiated';
      default:
        return initiator;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-l-4 border-l-muted">
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserMinus className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Offboarding Management
              </h1>
            </div>
            <p className="text-muted-foreground">
              Ensure graceful exits and complete compliance for every separation
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard/hr-manager/offboarding/termination-reviews">
              <UserMinus className="h-4 w-4" />
              Initiate Termination
            </Link>
          </Button>
        </div>

        {error && (
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-destructive font-medium">{error}</span>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Separations
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileX className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.total}
                </span>
                <span className="text-sm text-muted-foreground">cases</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Lifetime volume
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Action Required
                </CardTitle>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${(stats.pending + stats.underReview) > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.pending + stats.underReview}
                </span>
                <span className="text-sm text-muted-foreground">pending</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Link
                href="/dashboard/hr-manager/offboarding/termination-reviews"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Review now
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Voluntary Exits
                </CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <LogOut className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.resignations}
                </span>
                <span className="text-sm text-muted-foreground">resignations</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Link
                href="/dashboard/hr-manager/offboarding/resignations"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                View resignations
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-muted-foreground/50 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Involuntary Exits
                </CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <UserMinus className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.terminations}
                </span>
                <span className="text-sm text-muted-foreground">terminations</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Employer initiated
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Offboarding Management
            </CardTitle>
            <CardDescription>
              Essential offboarding tools and compliance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/dashboard/hr-manager/offboarding/resignations"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <LogOut className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Resignations</h3>
                  <p className="text-xs text-muted-foreground">Voluntary separation desk</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/offboarding/termination-reviews"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Reviews</h3>
                  <p className="text-xs text-muted-foreground">Termination audit trail</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/offboarding/checklist"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Clearance</h3>
                  <p className="text-xs text-muted-foreground">Departmental sign-offs</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/offboarding/final-settlement"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Settlement</h3>
                  <p className="text-xs text-muted-foreground">Financial closure</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="resignations">Resignations Only</SelectItem>
                  <SelectItem value="terminations">Terminations Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={TerminationStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={TerminationStatus.UNDER_REVIEW}>Under Review</SelectItem>
                  <SelectItem value={TerminationStatus.APPROVED}>Approved</SelectItem>
                  <SelectItem value={TerminationStatus.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search termination requests..."
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Termination Requests List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-16 pb-16 text-center">
                <UserMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No termination requests found
                </h3>
                <p className="text-muted-foreground mb-6">
                  No active separation cases match your current filters
                </p>
                <Button variant="outline" onClick={() => { setFilterType('all'); setFilterStatus('all'); }}>
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const employee = typeof request.employeeId === 'object' ? request.employeeId as any : null;
              const employeeName = employee
                ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
                : 'Employee';
              const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;

              return (
                <Card key={request._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${isResignation ? 'bg-accent/10' : 'bg-muted'}`}>
                            {isResignation ? (
                              <LogOut className="h-5 w-5 text-accent-foreground" />
                            ) : (
                              <UserMinus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                              >
                                {employeeName}
                              </Link>
                              <StatusBadge status={request.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                {isResignation ? <LogOut className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
                                {getInitiatorLabel(request.initiator)}
                              </div>
                              <div className="flex items-center gap-1">
                                <FileX className="h-3 w-3" />
                                {request.reason}
                              </div>
                              {request.terminationDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Last day: {new Date(request.terminationDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
