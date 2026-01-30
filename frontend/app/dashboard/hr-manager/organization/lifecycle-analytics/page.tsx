'use client';

/**
 * Employee Lifecycle Analytics Dashboard
 * 
 * Cross-Module Data Science Features:
 * - Lifecycle Overview (Hire to Exit)
 * - Quality of Hire Metrics
 * - Cohort Retention Analysis
 * - Source to Retention Correlation
 * - Department Lifecycle Health
 * - Pipeline Flow Analysis
 * - Employee Journey Tracking
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
  lifecycleAnalyticsService,
  LifecycleDashboardSummary,
  LifecycleOverview,
  QualityOfHireMetrics,
  CohortAnalysis,
  SourceToRetentionAnalysis,
  DepartmentLifecycleMetrics,
  PipelineFlowAnalysis,
  EmployeeJourneyMetrics,
} from '@/app/services/analytics/lifecycle-analytics';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  UserPlus,
  UserMinus,
  Briefcase,
  Building,
  ArrowRight,
  Target,
  Award,
  Activity,
} from 'lucide-react';

// ==================== HELPER COMPONENTS ====================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    APPLIED: 'bg-gray-100 text-gray-800',
    INTERVIEWING: 'bg-blue-100 text-blue-800',
    OFFERED: 'bg-purple-100 text-purple-800',
    CONTRACTED: 'bg-indigo-100 text-indigo-800',
    ONBOARDING: 'bg-cyan-100 text-cyan-800',
    ACTIVE: 'bg-green-100 text-green-800',
    TERMINATED: 'bg-red-100 text-red-800',
  };
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
}

function ScoreBadge({ score, maxScore = 100 }: { score: number; maxScore?: number }) {
  const percentage = (score / maxScore) * 100;
  let color = 'bg-red-100 text-red-800';
  if (percentage >= 80) color = 'bg-green-100 text-green-800';
  else if (percentage >= 60) color = 'bg-blue-100 text-blue-800';
  else if (percentage >= 40) color = 'bg-yellow-100 text-yellow-800';
  return <Badge className={color}>{score}</Badge>;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, variant }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'stable';
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const variantStyles = {
    default: 'bg-gray-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
    info: 'bg-blue-100',
  };
  const iconStyles = {
    default: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={`p-3 rounded-full ${variantStyles[variant || 'default']}`}>
              <Icon className={`w-5 h-5 ${iconStyles[variant || 'default']}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================

export default function LifecycleAnalyticsPage() {
  const [data, setData] = useState<LifecycleDashboardSummary | null>(null);
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
      const result = await lifecycleAnalyticsService.getDashboardSummary();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      toast.error('Failed to load lifecycle analytics');
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

  const { overview, qualityOfHire, cohortAnalysis, sourceRetention, departmentMetrics, pipelineFlow, recentJourneys } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Lifecycle Analytics</h1>
          <p className="text-muted-foreground">End-to-end employee journey insights</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics - Full Lifecycle */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Open Positions"
          value={overview?.totalOpenPositions || 0}
          icon={Briefcase}
          variant="info"
        />
        <MetricCard
          title="Active Applications"
          value={overview?.totalActiveApplications || 0}
          icon={Users}
        />
        <MetricCard
          title="Pending Offers"
          value={overview?.totalPendingOffers || 0}
          icon={Target}
          variant="warning"
        />
        <MetricCard
          title="Onboarding"
          value={overview?.totalOnboarding || 0}
          icon={UserPlus}
          variant="info"
        />
        <MetricCard
          title="Active Employees"
          value={overview?.totalActiveEmployees || 0}
          icon={Users}
          variant="success"
        />
        <MetricCard
          title="Pending Exits"
          value={overview?.totalPendingTerminations || 0}
          icon={UserMinus}
          variant="danger"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Time to Hire"
          value={`${overview?.avgTimeToHire || 0} days`}
          icon={Clock}
        />
        <MetricCard
          title="Avg Onboarding"
          value={`${overview?.avgOnboardingDays || 0} days`}
          icon={Clock}
        />
        <MetricCard
          title="Retention Rate"
          value={`${overview?.overallRetentionRate || 0}%`}
          icon={TrendingUp}
          variant={overview?.overallRetentionRate && overview.overallRetentionRate >= 80 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Net Growth"
          value={overview?.netGrowth || 0}
          subtitle={`${overview?.monthlyHires || 0} hires, ${overview?.monthlyTerminations || 0} exits`}
          icon={overview?.netGrowth && overview.netGrowth >= 0 ? TrendingUp : TrendingDown}
          variant={overview?.netGrowth && overview.netGrowth >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Pipeline Flow</TabsTrigger>
          <TabsTrigger value="quality">Quality of Hire</TabsTrigger>
          <TabsTrigger value="cohort">Cohort Retention</TabsTrigger>
          <TabsTrigger value="source">Source Analysis</TabsTrigger>
          <TabsTrigger value="departments">Department Health</TabsTrigger>
          <TabsTrigger value="journeys">Employee Journeys</TabsTrigger>
        </TabsList>

        {/* Pipeline Flow */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recruitment Pipeline Flow</CardTitle>
              <CardDescription>Current state of the hiring funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 overflow-x-auto py-4">
                {pipelineFlow?.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center">
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                        index === 0 ? 'bg-blue-500' :
                        index === pipelineFlow.length - 1 ? 'bg-green-500' :
                        'bg-primary'
                      }`}>
                        {stage.currentCount}
                      </div>
                      <span className="mt-2 font-medium text-sm text-center">{stage.stage}</span>
                      <span className="text-xs text-muted-foreground">{stage.avgDaysInStage} days avg</span>
                      {index > 0 && (
                        <span className="text-xs text-muted-foreground mt-1">
                          {stage.dropoffRate}% dropoff
                        </span>
                      )}
                    </div>
                    {index < pipelineFlow.length - 1 && (
                      <ArrowRight className="w-6 h-6 text-muted-foreground mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stage Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Current Count</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">Conversion %</TableHead>
                    <TableHead className="text-right">Dropoff %</TableHead>
                    <TableHead className="text-right">Bottleneck Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineFlow?.map((stage) => (
                    <TableRow key={stage.stage}>
                      <TableCell className="font-medium">{stage.stage}</TableCell>
                      <TableCell className="text-right">{stage.currentCount}</TableCell>
                      <TableCell className="text-right">{stage.avgDaysInStage}</TableCell>
                      <TableCell className="text-right">{stage.conversionToNext}%</TableCell>
                      <TableCell className="text-right">{stage.dropoffRate}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={stage.bottleneckScore > 50 ? 'destructive' : 'secondary'}>
                          {stage.bottleneckScore}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality of Hire */}
        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality of Hire by Cohort</CardTitle>
              <CardDescription>Measuring hiring success over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-right">Hires</TableHead>
                    <TableHead className="text-right">Still Employed</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">Onboarding Days</TableHead>
                    <TableHead className="text-right">Onb. Completion</TableHead>
                    <TableHead className="text-right">Vol. Exits</TableHead>
                    <TableHead className="text-right">Invol. Exits</TableHead>
                    <TableHead>Quality Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityOfHire?.map((cohort) => (
                    <TableRow key={cohort.hiringCohort}>
                      <TableCell className="font-medium">{cohort.hiringCohort}</TableCell>
                      <TableCell className="text-right">{cohort.totalHires}</TableCell>
                      <TableCell className="text-right text-green-600">{cohort.stillEmployed}</TableCell>
                      <TableCell className="text-right">{cohort.retentionRate}%</TableCell>
                      <TableCell className="text-right">{cohort.avgOnboardingDays}</TableCell>
                      <TableCell className="text-right">{cohort.onboardingCompletionRate}%</TableCell>
                      <TableCell className="text-right text-blue-600">{cohort.voluntaryExits}</TableCell>
                      <TableCell className="text-right text-red-600">{cohort.involuntaryExits}</TableCell>
                      <TableCell>
                        <ScoreBadge score={cohort.qualityScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cohort Retention */}
        <TabsContent value="cohort" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Retention Analysis</CardTitle>
              <CardDescription>How long employees stay after hiring</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cohort</TableHead>
                    <TableHead className="text-right">Hired</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Left ≤30d</TableHead>
                    <TableHead className="text-right">Left ≤90d</TableHead>
                    <TableHead className="text-right">Left ≤180d</TableHead>
                    <TableHead className="text-right">Left ≤1yr</TableHead>
                    <TableHead className="text-right">Ret. 30d</TableHead>
                    <TableHead className="text-right">Ret. 90d</TableHead>
                    <TableHead className="text-right">Ret. 1yr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohortAnalysis?.map((cohort) => (
                    <TableRow key={cohort.cohort}>
                      <TableCell className="font-medium">{cohort.cohort}</TableCell>
                      <TableCell className="text-right">{cohort.totalHired}</TableCell>
                      <TableCell className="text-right text-green-600">{cohort.stillActive}</TableCell>
                      <TableCell className="text-right">{cohort.left30Days}</TableCell>
                      <TableCell className="text-right">{cohort.left90Days}</TableCell>
                      <TableCell className="text-right">{cohort.left180Days}</TableCell>
                      <TableCell className="text-right">{cohort.leftYear}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cohort.retentionRate30 >= 95 ? 'default' : 'destructive'}>
                          {cohort.retentionRate30}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cohort.retentionRate90 >= 90 ? 'default' : 'secondary'}>
                          {cohort.retentionRate90}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cohort.retentionRateYear >= 80 ? 'default' : 'secondary'}>
                          {cohort.retentionRateYear}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Analysis */}
        <TabsContent value="source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source to Retention Analysis</CardTitle>
              <CardDescription>Which hiring sources produce the best employees?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sourceRetention?.map((source) => (
                  <div key={source.source} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">{source.source}</h4>
                      </div>
                      <Badge variant={source.retentionRate >= 80 ? 'default' : 'secondary'}>
                        {source.retentionRate}% Retention
                      </Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-xl font-bold">{source.totalHires}</div>
                        <div className="text-xs text-muted-foreground">Total Hires</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{source.stillActive}</div>
                        <div className="text-xs text-muted-foreground">Still Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{source.avgTenureDays}</div>
                        <div className="text-xs text-muted-foreground">Avg Tenure Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{source.avgOnboardingScore}%</div>
                        <div className="text-xs text-muted-foreground">Onb. Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">{source.exitedWithin90Days}</div>
                        <div className="text-xs text-muted-foreground">Early Exits</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{source.early90DayAttrition}%</div>
                        <div className="text-xs text-muted-foreground">90d Attrition</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Health */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Lifecycle Health</CardTitle>
              <CardDescription>End-to-end metrics by department</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Open Pos.</TableHead>
                    <TableHead className="text-right">Hires 90d</TableHead>
                    <TableHead className="text-right">Onboarding</TableHead>
                    <TableHead className="text-right">Onb. Days</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Exits 90d</TableHead>
                    <TableHead className="text-right">Attrition</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentMetrics?.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {dept.department}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{dept.openPositions}</TableCell>
                      <TableCell className="text-right text-green-600">{dept.hiresLast90Days}</TableCell>
                      <TableCell className="text-right">{dept.onboardingInProgress}</TableCell>
                      <TableCell className="text-right">{dept.avgOnboardingDays}</TableCell>
                      <TableCell className="text-right">{dept.activeEmployees}</TableCell>
                      <TableCell className="text-right text-red-600">{dept.terminationsLast90Days}</TableCell>
                      <TableCell className="text-right">{dept.attritionRate}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={dept.healthScore} className="w-12 h-2" />
                          <ScoreBadge score={dept.healthScore} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Journeys */}
        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Employee Journeys</CardTitle>
              <CardDescription>End-to-end tracking of employee lifecycle</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Interviews</TableHead>
                    <TableHead className="text-right">Time to Hire</TableHead>
                    <TableHead className="text-right">Onboarding</TableHead>
                    <TableHead className="text-right">Tenure</TableHead>
                    <TableHead className="text-right">Total Journey</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJourneys?.map((journey) => (
                    <TableRow key={journey.employeeId}>
                      <TableCell className="font-medium">{journey.employeeName}</TableCell>
                      <TableCell>{journey.department}</TableCell>
                      <TableCell>
                        <StatusBadge status={journey.currentStatus} />
                      </TableCell>
                      <TableCell className="text-right">{journey.interviewCount}</TableCell>
                      <TableCell className="text-right">
                        {journey.timeToHireDays !== null ? `${journey.timeToHireDays}d` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {journey.onboardingDays !== null ? `${journey.onboardingDays}d` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {journey.tenureDays !== null ? `${journey.tenureDays}d` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {journey.totalJourneyDays !== null ? `${journey.totalJourneyDays}d` : '-'}
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
