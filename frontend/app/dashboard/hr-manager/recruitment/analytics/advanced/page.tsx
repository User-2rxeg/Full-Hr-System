'use client';

/**
 * Advanced Recruitment Analytics Dashboard
 * 
 * Data Science Features:
 * - Recruitment Funnel Analysis with conversion rates
 * - Source Effectiveness Metrics
 * - Time-to-Hire Breakdown by Stage
 * - Interviewer Calibration Scores
 * - Requisition Health Scores
 * - Pipeline Bottleneck Analysis
 * - Trend Analysis
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
  recruitmentAnalyticsService,
  RecruitmentDashboardSummary,
  FunnelStageMetrics,
  SourceEffectivenessMetrics,
  TimeToHireBreakdown,
  InterviewerCalibrationMetrics,
  RequisitionHealthScore,
  StageBottleneck,
  RecruitmentTrend,
} from '@/app/services/analytics/recruitment-analytics';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

// ==================== HELPER COMPONENTS ====================

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-accent/10 text-accent-foreground',
    MEDIUM: 'bg-muted text-muted-foreground',
    HIGH: 'bg-primary/10 text-orange-800',
    CRITICAL: 'bg-destructive/10 text-destructive',
  };
  return <Badge className={colors[level] || 'bg-muted text-foreground'}>{level}</Badge>;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'IMPROVING') {
    return <Badge className="bg-accent/10 text-accent-foreground"><TrendingUp className="w-3 h-3 mr-1" />Improving</Badge>;
  }
  if (trend === 'DECLINING') {
    return <Badge className="bg-destructive/10 text-destructive"><TrendingDown className="w-3 h-3 mr-1" />Declining</Badge>;
  }
  return <Badge className="bg-muted text-foreground">Stable</Badge>;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'stable';
}) {
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
            <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-accent/10' : trend === 'down' ? 'bg-destructive/10' : 'bg-muted'}`}>
              <Icon className={`w-5 h-5 ${trend === 'up' ? 'text-accent-foreground' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================

export default function RecruitmentAdvancedAnalyticsPage() {
  const [data, setData] = useState<RecruitmentDashboardSummary | null>(null);
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
      const result = await recruitmentAnalyticsService.getDashboardSummary();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      toast.error('Failed to load recruitment analytics');
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
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
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

  const { funnel, sourceEffectiveness, timeToHire, interviewerCalibration, requisitionHealth, bottlenecks, trends } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Analytics</h1>
          <p className="text-muted-foreground">Advanced insights into your hiring pipeline</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Applications"
          value={funnel?.totalApplications || 0}
          subtitle="In pipeline"
          icon={Users}
        />
        <MetricCard
          title="Total Hires"
          value={funnel?.totalHires || 0}
          subtitle="Completed"
          icon={CheckCircle}
          trend="up"
        />
        <MetricCard
          title="Avg Time to Hire"
          value={`${funnel?.avgTimeToHire || 0} days`}
          subtitle="From application to hire"
          icon={Clock}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${funnel?.overallConversionRate || 0}%`}
          subtitle="Application to hire"
          icon={Target}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Funnel Overview</TabsTrigger>
          <TabsTrigger value="sources">Source Analysis</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="interviewers">Interviewers</TabsTrigger>
          <TabsTrigger value="requisitions">Requisition Health</TabsTrigger>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>

        {/* Funnel Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recruitment Funnel</CardTitle>
              <CardDescription>Conversion rates through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnel?.stages?.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium">{stage.stage}</div>
                    <div className="flex-1">
                      <Progress value={stage.conversionRate} className="h-6" />
                    </div>
                    <div className="w-20 text-right">
                      <span className="font-bold">{stage.count}</span>
                      <span className="text-muted-foreground text-sm ml-1">({stage.conversionRate}%)</span>
                    </div>
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {stage.avgDaysInStage} days avg
                    </div>
                    {index < (funnel?.stages?.length || 0) - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trends Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Hiring Trends</CardTitle>
              <CardDescription>Monthly recruitment activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Interviews</TableHead>
                    <TableHead className="text-right">Offers</TableHead>
                    <TableHead className="text-right">Hires</TableHead>
                    <TableHead className="text-right">Avg Time to Hire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends?.map((trend) => (
                    <TableRow key={trend.period}>
                      <TableCell className="font-medium">{trend.period}</TableCell>
                      <TableCell className="text-right">{trend.applications}</TableCell>
                      <TableCell className="text-right">{trend.interviews}</TableCell>
                      <TableCell className="text-right">{trend.offers}</TableCell>
                      <TableCell className="text-right">{trend.hires}</TableCell>
                      <TableCell className="text-right">{trend.avgTimeToHire} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Analysis */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Effectiveness</CardTitle>
              <CardDescription>Performance metrics by hiring source</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Applications</TableHead>
                    <TableHead className="text-right">Qualified</TableHead>
                    <TableHead className="text-right">Qual. Rate</TableHead>
                    <TableHead className="text-right">Hires</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceEffectiveness?.map((source) => (
                    <TableRow key={source.source}>
                      <TableCell className="font-medium">{source.source}</TableCell>
                      <TableCell className="text-right">{source.totalApplications}</TableCell>
                      <TableCell className="text-right">{source.qualifiedApplications}</TableCell>
                      <TableCell className="text-right">{source.qualificationRate}%</TableCell>
                      <TableCell className="text-right">{source.hires}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={source.conversionToHire > 10 ? 'default' : 'secondary'}>
                          {source.conversionToHire}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{source.avgTimeToHire} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Analysis */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time-to-Hire Breakdown</CardTitle>
              <CardDescription>Average time spent in each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">Median</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeToHire?.map((stage) => (
                    <TableRow key={stage.stage}>
                      <TableCell className="font-medium">{stage.stage}</TableCell>
                      <TableCell className="text-right">{stage.avgDays}</TableCell>
                      <TableCell className="text-right">{stage.medianDays}</TableCell>
                      <TableCell className="text-right">{stage.minDays}</TableCell>
                      <TableCell className="text-right">{stage.maxDays}</TableCell>
                      <TableCell className="text-right">
                        <TrendBadge trend={stage.trend} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interviewer Calibration */}
        <TabsContent value="interviewers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interviewer Performance</CardTitle>
              <CardDescription>Calibration and consistency scores</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interviewer</TableHead>
                    <TableHead className="text-right">Interviews</TableHead>
                    <TableHead className="text-right">Avg Rating</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead className="text-right">Hire Rate</TableHead>
                    <TableHead className="text-right">Consistency</TableHead>
                    <TableHead className="text-right">Calibration Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviewerCalibration?.map((int) => (
                    <TableRow key={int.interviewerId}>
                      <TableCell className="font-medium">{int.interviewerName}</TableCell>
                      <TableCell className="text-right">{int.totalInterviews}</TableCell>
                      <TableCell className="text-right">{int.avgRating.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{int.passRate}%</TableCell>
                      <TableCell className="text-right">{int.hireRate}%</TableCell>
                      <TableCell className="text-right">{int.consistency}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={int.calibrationScore >= 80 ? 'default' : int.calibrationScore >= 60 ? 'secondary' : 'destructive'}>
                          {int.calibrationScore}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requisition Health */}
        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requisition Health Scores</CardTitle>
              <CardDescription>Current status of open positions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Days Open</TableHead>
                    <TableHead className="text-right">Applicants</TableHead>
                    <TableHead className="text-right">Qualified</TableHead>
                    <TableHead className="text-right">Health Score</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitionHealth?.map((req) => (
                    <TableRow key={req.requisitionId}>
                      <TableCell className="font-medium">{req.jobTitle}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell className="text-right">{req.daysOpen}</TableCell>
                      <TableCell className="text-right">{req.applicantCount}</TableCell>
                      <TableCell className="text-right">{req.qualifiedCount}</TableCell>
                      <TableCell className="text-right">
                        <Progress value={req.healthScore} className="w-16 h-2" />
                        <span className="text-xs ml-2">{req.healthScore}</span>
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={req.riskLevel} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottlenecks */}
        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Bottlenecks</CardTitle>
              <CardDescription>Identified slowdowns in the hiring process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bottlenecks?.map((bn) => (
                  <div key={bn.stage} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{bn.stage}</h4>
                      <Badge variant={bn.bottleneckScore > 70 ? 'destructive' : bn.bottleneckScore > 40 ? 'secondary' : 'default'}>
                        Score: {bn.bottleneckScore}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Avg Days Stuck:</span> {bn.avgDaysStuck}
                      </div>
                      <div>
                        <span className="font-medium">Applications Stuck:</span> {bn.applicationsStuck}
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Suggested Action:</span> {bn.suggestedAction}
                    </div>
                  </div>
                ))}
                {(!bottlenecks || bottlenecks.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No significant bottlenecks detected!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
