'use client';

/**
 * Offboarding Analytics Dashboard
 * 
 * Data Science Features:
 * - Overview Metrics (Voluntary vs Involuntary)
 * - Clearance Efficiency by Department
 * - Attrition Pattern Analysis
 * - Exit Reason Analysis
 * - Tenure at Exit Metrics
 * - Termination Trends
 * - Equipment Return Tracking
 * - Department Attrition Risk
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
  offboardingAnalyticsService,
  OffboardingDashboardSummary,
  OffboardingOverviewMetrics,
  ClearanceEfficiencyMetrics,
  AttritionPatternAnalysis,
  ExitReasonAnalysis,
  TenureAtExitMetrics,
  TerminationTrend,
  EquipmentReturnMetrics,
  DepartmentAttritionRisk,
} from '@/app/services/analytics/offboarding-analytics';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  UserMinus,
  Building,
  Package,
  AlertCircle,
  Briefcase,
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

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };
  return <Badge className={colors[level] || 'bg-gray-100 text-gray-800'}>{level}</Badge>;
}

function MetricCard({ title, value, subtitle, icon: Icon, variant }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-gray-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
  };
  const iconStyles = {
    default: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
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

export default function OffboardingAnalyticsPage() {
  const [data, setData] = useState<OffboardingDashboardSummary | null>(null);
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
      const result = await offboardingAnalyticsService.getDashboardSummary();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      toast.error('Failed to load offboarding analytics');
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

  const { overview, clearanceEfficiency, attritionPatterns, exitReasons, tenureMetrics, trends, equipmentTracking, departmentRisk } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Offboarding Analytics</h1>
          <p className="text-muted-foreground">Attrition analysis and exit insights</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <MetricCard
          title="Total Terminations"
          value={overview?.totalTerminations || 0}
          icon={UserMinus}
        />
        <MetricCard
          title="Pending Review"
          value={overview?.pendingReview || 0}
          icon={Clock}
          variant="warning"
        />
        <MetricCard
          title="In Progress"
          value={overview?.inProgress || 0}
          icon={Users}
        />
        <MetricCard
          title="Completed This Month"
          value={overview?.completedThisMonth || 0}
          icon={CheckCircle}
          variant="success"
        />
        <MetricCard
          title="Avg Clearance"
          value={`${overview?.avgClearanceDays || 0} days`}
          icon={Clock}
        />
        <MetricCard
          title="Voluntary Rate"
          value={`${overview?.voluntaryRate || 0}%`}
          subtitle="Resignations"
          icon={TrendingUp}
        />
        <MetricCard
          title="Involuntary Rate"
          value={`${overview?.involuntaryRate || 0}%`}
          subtitle="Terminations"
          icon={TrendingDown}
          variant="danger"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Clearance Efficiency</TabsTrigger>
          <TabsTrigger value="attrition">Attrition Patterns</TabsTrigger>
          <TabsTrigger value="reasons">Exit Reasons</TabsTrigger>
          <TabsTrigger value="tenure">Tenure Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="risk">Dept Risk</TabsTrigger>
        </TabsList>

        {/* Clearance Efficiency */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clearance Efficiency by Department</CardTitle>
              <CardDescription>Processing times and compliance rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">On-Time Rate</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clearanceEfficiency?.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-right">{dept.totalProcessed}</TableCell>
                      <TableCell className="text-right">{dept.avgProcessingDays}</TableCell>
                      <TableCell className="text-right">{dept.onTimeRate}%</TableCell>
                      <TableCell className="text-right">{dept.pendingCount}</TableCell>
                      <TableCell className="text-right text-red-600">{dept.overdueCount}</TableCell>
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

        {/* Attrition Patterns */}
        <TabsContent value="attrition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attrition Patterns</CardTitle>
              <CardDescription>Exit analysis by month</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Exits</TableHead>
                    <TableHead className="text-right">Voluntary</TableHead>
                    <TableHead className="text-right">Involuntary</TableHead>
                    <TableHead className="text-right">Voluntary Rate</TableHead>
                    <TableHead>Top Departments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attritionPatterns?.map((pattern) => (
                    <TableRow key={pattern.period}>
                      <TableCell className="font-medium">{pattern.period}</TableCell>
                      <TableCell className="text-right">{pattern.totalExits}</TableCell>
                      <TableCell className="text-right text-blue-600">{pattern.voluntary}</TableCell>
                      <TableCell className="text-right text-red-600">{pattern.involuntary}</TableCell>
                      <TableCell className="text-right">{pattern.voluntaryRate}%</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pattern.byDepartment?.slice(0, 3).map((d) => (
                            <Badge key={d.department} variant="outline" className="text-xs">
                              {d.department}: {d.count}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exit Reasons */}
        <TabsContent value="reasons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exit Reason Analysis</CardTitle>
              <CardDescription>Why employees are leaving</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exitReasons?.map((reason) => (
                  <div key={reason.reason} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-semibold">{reason.reason}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">{reason.count}</span>
                        <Badge>{reason.percentage}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${reason.percentage}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="text-center">
                        <span className="font-medium text-blue-600">{reason.byInitiator.employee}</span>
                        <span className="block text-xs">Employee-Initiated</span>
                      </div>
                      <div className="text-center">
                        <span className="font-medium text-purple-600">{reason.byInitiator.hr}</span>
                        <span className="block text-xs">HR-Initiated</span>
                      </div>
                      <div className="text-center">
                        <span className="font-medium text-orange-600">{reason.byInitiator.manager}</span>
                        <span className="block text-xs">Manager-Initiated</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenure Analysis */}
        <TabsContent value="tenure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenure at Exit</CardTitle>
              <CardDescription>How long employees stayed before leaving</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenure Range</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                    <TableHead className="text-right">Avg Tenure Days</TableHead>
                    <TableHead className="text-right">Voluntary %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenureMetrics?.map((metric) => (
                    <TableRow key={metric.range}>
                      <TableCell className="font-medium">{metric.range}</TableCell>
                      <TableCell className="text-right">{metric.count}</TableCell>
                      <TableCell className="text-right">{metric.percentage}%</TableCell>
                      <TableCell className="text-right">{metric.avgTenureDays}</TableCell>
                      <TableCell className="text-right">{metric.voluntaryPercentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Visual representation */}
          <Card>
            <CardHeader>
              <CardTitle>Tenure Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenureMetrics?.map((metric) => (
                  <div key={metric.range} className="flex items-center gap-4">
                    <div className="w-32 text-sm">{metric.range}</div>
                    <div className="flex-1">
                      <Progress value={metric.percentage} className="h-6" />
                    </div>
                    <div className="w-20 text-right text-sm">{metric.count} ({metric.percentage}%)</div>
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
              <CardTitle>Termination Trends</CardTitle>
              <CardDescription>Monthly termination activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Voluntary</TableHead>
                    <TableHead className="text-right">Involuntary</TableHead>
                    <TableHead className="text-right">Approval Rate</TableHead>
                    <TableHead className="text-right">Avg Processing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends?.map((trend) => (
                    <TableRow key={trend.period}>
                      <TableCell className="font-medium">{trend.period}</TableCell>
                      <TableCell className="text-right">{trend.total}</TableCell>
                      <TableCell className="text-right text-blue-600">{trend.voluntary}</TableCell>
                      <TableCell className="text-right text-red-600">{trend.involuntary}</TableCell>
                      <TableCell className="text-right">{trend.approvalRate}%</TableCell>
                      <TableCell className="text-right">{trend.avgProcessingDays} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tracking */}
        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Return Tracking</CardTitle>
              <CardDescription>Company asset recovery status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Type</TableHead>
                    <TableHead className="text-right">Total Tracked</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Return Rate</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipmentTracking?.map((eq) => (
                    <TableRow key={eq.equipmentType}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          {eq.equipmentType}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{eq.totalTracked}</TableCell>
                      <TableCell className="text-right text-green-600">{eq.returned}</TableCell>
                      <TableCell className="text-right text-yellow-600">{eq.pending}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={eq.returnRate >= 90 ? 'default' : eq.returnRate >= 70 ? 'secondary' : 'destructive'}>
                          {eq.returnRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{eq.avgReturnDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Risk */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Attrition Risk</CardTitle>
              <CardDescription>Identify departments at risk of high turnover</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentRisk?.map((dept) => (
                  <div key={dept.department} className={`border rounded-lg p-4 ${
                    dept.riskLevel === 'CRITICAL' ? 'border-red-300 bg-red-50' :
                    dept.riskLevel === 'HIGH' ? 'border-orange-300 bg-orange-50' :
                    dept.riskLevel === 'MEDIUM' ? 'border-yellow-300 bg-yellow-50' :
                    ''
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-muted-foreground" />
                        <h4 className="font-semibold">{dept.department}</h4>
                      </div>
                      <RiskBadge level={dept.riskLevel} />
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-sm mb-3">
                      <div className="text-center">
                        <div className="text-xl font-bold">{dept.totalEmployees}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">{dept.exitedLast90Days}</div>
                        <div className="text-xs text-muted-foreground">Exited 90d</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">{dept.exitedLast180Days}</div>
                        <div className="text-xs text-muted-foreground">Exited 180d</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{dept.attritionRate90Days}%</div>
                        <div className="text-xs text-muted-foreground">Rate 90d</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{dept.attritionRate180Days}%</div>
                        <div className="text-xs text-muted-foreground">Rate 180d</div>
                      </div>
                    </div>
                    {dept.topExitReasons.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-sm font-medium">Top Reasons: </span>
                        <div className="flex gap-1 mt-1">
                          {dept.topExitReasons.map((reason, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{reason}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
