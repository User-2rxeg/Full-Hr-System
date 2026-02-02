'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { onboardingService, Onboarding, OnboardingTaskStatus } from '@/app/services/onboarding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Input } from '@/components/ui/input';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  DollarSign,
  Bell,
  Search,
  Filter,
  ArrowRight,
  Activity,
  UserPlus,
  Settings,
  ChevronRight,
  BarChart3
} from 'lucide-react';

export default function OnboardingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getAllOnboardings();
      setOnboardings(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setOnboardings([]);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOnboardings = onboardings.filter((onboarding) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'completed') return onboarding.completed;
    if (filterStatus === 'in_progress') return !onboarding.completed;
    return true;
  });

  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter((o) => !o.completed).length,
    completed: onboardings.filter((o) => o.completed).length,
    pendingTasks: onboardings.reduce(
      (acc, o) => acc + (o.tasks?.filter((t) => t.status === OnboardingTaskStatus.PENDING).length || 0),
      0
    ),
  };

  const calculateProgress = (tasks: Onboarding['tasks']) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getEmployeeDisplayName = (emp: any) => {
    if (!emp) return 'Employee';
    if (typeof emp === 'string') return `Employee ${emp.slice(-6)}`; // Show last 6 chars if not populated
    return `${emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee'}${emp.employeeNumber ? ` (${emp.employeeNumber})` : ''}`;
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
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Onboarding Management
              </h1>
            </div>
            <p className="text-muted-foreground">
              Orchestrate seamless onboarding experiences for new team members
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/dashboard/hr-manager/onboarding/employee">
              <UserPlus className="h-4 w-4" />
              New Onboarding
            </Link>
          </Button>
        </div>

        {error && (
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-destructive" />
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
                  Active Onboardings
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.total}
                </span>
                <span className="text-sm text-muted-foreground">employees</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Total new hires
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Activity className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.inProgress}
                </span>
                <span className="text-sm text-muted-foreground">active</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Action required
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-muted-foreground/50 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {stats.completed}
                </span>
                <span className="text-sm text-muted-foreground">done</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <div className="text-xs text-muted-foreground">
                Fully integrated
              </div>
            </CardFooter>
          </Card>

          <Card className="border-l-4 border-l-destructive hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Tasks
                </CardTitle>
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Bell className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${stats.pendingTasks > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {stats.pendingTasks}
                </span>
                <span className="text-sm text-muted-foreground">tasks</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Link
                href="/dashboard/hr-manager/onboarding/checklists"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                View tasks
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Onboarding Management
            </CardTitle>
            <CardDescription>
              Essential onboarding tools and resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/dashboard/hr-manager/onboarding/checklists"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Checklists</h3>
                  <p className="text-xs text-muted-foreground">Standardized workflows</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/onboarding/employee"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Auto-Create</h3>
                  <p className="text-xs text-muted-foreground">From signed offers</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/onboarding/payroll"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Payroll Sync</h3>
                  <p className="text-xs text-muted-foreground">Financial readiness</p>
                </div>
              </Link>

              <Link
                href="/dashboard/hr-manager/onboarding/analytics"
                className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Insights and metrics</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, role, or department..."
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredOnboardings.length === 0 ? (
            <Card>
              <CardContent className="pt-16 pb-16 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No onboarding processes found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Get started by creating a new onboarding process
                </p>
                <Button asChild>
                  <Link href="/dashboard/hr-manager/onboarding/employee">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Onboarding
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredOnboardings.map((onboarding) => {
              const progress = calculateProgress(onboarding.tasks);
              const employeeName = getEmployeeDisplayName(onboarding.employeeId);

              return (
                <Card key={onboarding._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${onboarding.completed ? 'bg-accent/10' : 'bg-muted'}`}>
                            {onboarding.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
                            ) : (
                              <UserPlus className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Link
                                href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`}
                                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                              >
                                {employeeName}
                              </Link>
                              {progress >= 100 ? (
                                <Badge variant="outline" className="text-accent-foreground border-accent/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-primary border-primary/30">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Started {new Date(onboarding.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckSquare className="h-3 w-3" />
                                {onboarding.tasks?.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length || 0} / {onboarding.tasks?.length || 0} tasks completed
                              </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Progress</span>
                                <span className="text-xs font-bold text-foreground">{progress}%</span>
                              </div>
                              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    progress >= 100 ? 'bg-accent' :
                                    progress >= 50 ? 'bg-primary' :
                                    'bg-muted-foreground'
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
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
                          <Link href={`/dashboard/hr-manager/onboarding/checklists/${onboarding._id}`}>
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
