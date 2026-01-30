'use client';

/**
 * Onboarding Analytics Dashboard
 * 
 * Data Science Features:
 * - Overview Metrics with KPIs
 * - Department SLA Compliance Tracking
 * - Task Bottleneck Analysis
 * - Time-to-Productivity Metrics
 * - Progress by Department
 * - Onboarding Trends
 * - Task Completion Timeline
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  onboardingAnalyticsService,
  OnboardingDashboardSummary,
  OnboardingOverviewMetrics,
  DepartmentSLAMetrics,
  TaskBottleneckAnalysis,
  TimeToProductivityMetrics,
  OnboardingProgressByDepartment,
  OnboardingTrend,
  TaskCompletionTimeline,
} from '@/app/services/analytics/onboarding-analytics';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Target,
  Calendar,
  Building,
  Timer,
  AlertCircle,
} from 'lucide-react';

// ==================== HELPER COMPONENTS ====================

function GradeBadge({ grade }: { grade: 'A' | 'B' | 'C' | 'D' | 'F' }) {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-orange-100 text-orange-800',
    F: 'bg-red-100 text-red-800',
  };
  return <Badge className={colors[grade]}>{grade}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ON_TRACK: 'bg-green-100 text-green-800',
    AT_RISK: 'bg-yellow-100 text-yellow-800',
    DELAYED: 'bg-red-100 text-red-800',
  };
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.replace('_', ' ')}</Badge>;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, alert }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-red-200' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : ''}`}>{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={`p-3 rounded-full ${alert ? 'bg-red-100' : trend === 'up' ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Icon className={`w-5 h-5 ${alert ? 'text-red-600' : trend === 'up' ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================

export default function OnboardingAnalyticsPage() {
  const [data, setData] = useState<OnboardingDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingAnalyticsService.getDashboardSummary();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      toast.error('Failed to load onboarding analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>{error || 'Failed to load data'}</span>
            </div>
            <Button onClick={fetchDashboard} className="mt-4" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, departmentSLA, taskBottlenecks, progressByDepartment, recentOnboardings, trends, taskTimeline } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding Analytics</h1>
          <p className="text-muted-foreground">Track new hire integration and task completion</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Onboardings"
          value={overview?.totalOnboardings || 0}
          icon={Users}
        />
        <MetricCard
          title="Active"
          value={overview?.activeOnboardings || 0}
          subtitle="In progress"
          icon={Clock}
        />
        <MetricCard
          title="Completed This Month"
          value={overview?.completedThisMonth || 0}
          icon={CheckCircle}
          trend="up"
        />
        <MetricCard
          title="Avg Completion"
          value={`${overview?.avgCompletionDays || 0} days`}
          icon={Timer}
        />
        <MetricCard
          title="On-Time Rate"
          value={`${overview?.onTimeCompletionRate || 0}%`}
          icon={Target}
          trend={overview?.onTimeCompletionRate && overview.onTimeCompletionRate >= 80 ? 'up' : 'down'}
        />
        <MetricCard
          title="Currently Overdue"
          value={overview?.currentlyOverdue || 0}
          icon={AlertCircle}
          alert={(overview?.currentlyOverdue || 0) > 0}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Department SLA</TabsTrigger>
          <TabsTrigger value="bottlenecks">Task Bottlenecks</TabsTrigger>
          <TabsTrigger value="productivity">Time to Productivity</TabsTrigger>
          <TabsTrigger value="progress">Progress by Dept</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="timeline">Task Timeline</TabsTrigger>
        </TabsList>

        {/* Department SLA */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department SLA Compliance</CardTitle>
              <CardDescription>Task completion performance by department</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Total Tasks</TableHead>
                    <TableHead className="text-right">On Time</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">SLA Rate</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentSLA?.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-right">{dept.totalTasks}</TableCell>
                      <TableCell className="text-right text-green-600">{dept.completedOnTime}</TableCell>
                      <TableCell className="text-right text-yellow-600">{dept.completedLate}</TableCell>
                      <TableCell className="text-right">{dept.pending}</TableCell>
                      <TableCell className="text-right text-red-600">{dept.overdue}</TableCell>
                      <TableCell className="text-right">{dept.avgCompletionDays}</TableCell>
                      <TableCell className="text-right">{dept.slaComplianceRate}%</TableCell>
                      <TableCell>
                        <GradeBadge grade={dept.grade} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Bottlenecks */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Bottleneck Analysis</CardTitle>
              <CardDescription>Tasks causing delays in onboarding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {taskBottlenecks?.filter(t => t.isBottleneck).map((task) => (
                  <div key={`${task.taskName}-${task.department}`} className="border rounded-lg p-4 border-orange-200 bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{task.taskName}</h4>
                        <span className="text-sm text-muted-foreground">{task.department}</span>
                      </div>
                      <Badge variant="destructive">Bottleneck</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Occurrences:</span> {task.totalOccurrences}
                      </div>
                      <div>
                        <span className="font-medium">Avg Days:</span> {task.avgCompletionDays}
                      </div>
                      <div>
                        <span className="font-medium">Overdue:</span> {task.overdueCount} ({task.overdueRate}%)
                      </div>
                      <div>
                        <span className="font-medium">SLA Compliance:</span> {task.slaComplianceRate}%
                      </div>
                    </div>
                  </div>
                ))}
                {(!taskBottlenecks || taskBottlenecks.filter(t => t.isBottleneck).length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No significant bottlenecks detected!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Tasks Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Task Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">Median Days</TableHead>
                    <TableHead className="text-right">Overdue Rate</TableHead>
                    <TableHead className="text-right">SLA %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskBottlenecks?.slice(0, 15).map((task, idx) => (
                    <TableRow key={idx} className={task.isBottleneck ? 'bg-orange-50' : ''}>
                      <TableCell className="font-medium">{task.taskName}</TableCell>
                      <TableCell>{task.department}</TableCell>
                      <TableCell className="text-right">{task.totalOccurrences}</TableCell>
                      <TableCell className="text-right">{task.avgCompletionDays}</TableCell>
                      <TableCell className="text-right">{task.medianCompletionDays}</TableCell>
                      <TableCell className="text-right">{task.overdueRate}%</TableCell>
                      <TableCell className="text-right">{task.slaComplianceRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time to Productivity */}
        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Hire Time-to-Productivity</CardTitle>
              <CardDescription>Onboarding progress for recent hires</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Tasks</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOnboardings?.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{new Date(emp.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{emp.onboardingDays}</TableCell>
                      <TableCell className="text-right">{emp.tasksCompleted}/{emp.totalTasks}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={emp.completionRate} className="w-16 h-2" />
                          <span className="text-sm">{emp.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.isFullyOnboarded ? (
                          <Badge className="bg-green-100 text-green-800">Complete</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress by Department */}
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Progress by Department</CardTitle>
              <CardDescription>New hire integration status across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressByDepartment?.map((dept) => (
                  <div key={dept.department} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-semibold">{dept.department}</h4>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {dept.totalNewHires} total hires
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">{dept.fullyOnboarded}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{dept.inProgress}</div>
                        <div className="text-xs text-muted-foreground">In Progress</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-2xl font-bold">{dept.avgCompletionRate}%</div>
                        <div className="text-xs text-muted-foreground">Avg Completion</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-2xl font-bold">{dept.avgDaysToComplete}</div>
                        <div className="text-xs text-muted-foreground">Avg Days</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Trends</CardTitle>
              <CardDescription>Monthly onboarding activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">New Onboardings</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Avg Completion Days</TableHead>
                    <TableHead className="text-right">Overdue Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends?.map((trend) => (
                    <TableRow key={trend.period}>
                      <TableCell className="font-medium">{trend.period}</TableCell>
                      <TableCell className="text-right">{trend.newOnboardings}</TableCell>
                      <TableCell className="text-right">{trend.completedOnboardings}</TableCell>
                      <TableCell className="text-right">{trend.avgCompletionDays} days</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={trend.overdueRate > 20 ? 'destructive' : 'secondary'}>
                          {trend.overdueRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Task Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion Timeline</CardTitle>
              <CardDescription>Expected vs actual completion times</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Expected Days</TableHead>
                    <TableHead className="text-right">Actual Avg</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskTimeline?.map((task, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{task.taskName}</TableCell>
                      <TableCell>{task.department}</TableCell>
                      <TableCell className="text-right">{task.expectedDays}</TableCell>
                      <TableCell className="text-right">{task.actualAvgDays}</TableCell>
                      <TableCell className="text-right">
                        <span className={task.variance > 0 ? 'text-red-600' : task.variance < 0 ? 'text-green-600' : ''}>
                          {task.variance > 0 ? '+' : ''}{task.variance}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
