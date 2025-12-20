'use client';

import { useState } from 'react';
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
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { 
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Search,
  Download,
  Users,
  DollarSign,
  FileText,
  Shield,
  Settings,
  Calendar,
  Building,
  Clock,
  ChevronRight
} from "lucide-react";

export default function GeneratePayslipsPage() {
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleGenerate = async () => {
    if (!runId.trim()) {
      setError('Please enter a Payroll Run ID');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await payrollExecutionService.generatePayslips(runId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setStatus('Payslips generated successfully! Employee documents are now available for distribution.');
    } catch (e: any) {
      setError(e?.message || 'Failed to generate payslips. Please check the Run ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchRun = async () => {
    if (!runId.trim()) {
      setError('Please enter a Payroll Run ID');
      return;
    }

    setSearchLoading(true);
    setError(null);
    setRunDetails(null);
    try {
      const res = await payrollExecutionService.getDraft(runId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const details = (res?.data || res) as any;
      setRunDetails(details);
      
      // Check if payslips already exist
      if (details?.payslipsGenerated) {
        setStatus('Payslips already generated for this run');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch run details');
    } finally {
      setSearchLoading(false);
    }
  };

  // Accept currency param, fallback to EGP
  const formatCurrency = (amount: number | undefined, currency: string = 'EGP') => {
    if (amount === undefined || amount === null) return `${currency} 0`;
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not available';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
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

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="hover:text-primary transition-colors">Finance Tools</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Payslip Generation</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Generate Payslips
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and distribute payslips for approved payroll runs
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generation Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Payslip Generation
              </CardTitle>
              <CardDescription>
                Enter a Payroll Run ID to generate employee payslips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Run ID Input */}
                <div className="space-y-3">
                  <Label htmlFor="runId" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Payroll Run ID
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="runId"
                      placeholder="Enter payroll run ID (e.g., PR-2024-03-001)"
                      value={runId}
                      onChange={(e) => {
                        setRunId(e.target.value);
                        setError(null);
                        setStatus(null);
                        setRunDetails(null);
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSearchRun} 
                      disabled={!runId.trim() || searchLoading}
                      variant="outline"
                    >
                      {searchLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status Messages */}
                {status && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">{status}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">{error}</span>
                    </div>
                  </div>
                )}

                {/* Run Details Preview */}
                {runDetails && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-foreground">Run Details Found</h3>
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            {runDetails.status || 'Unknown'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Department</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span>{runDetails.entity || 'Not specified'}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Period</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(runDetails.payrollPeriod)}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Employees</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{runDetails.employees || 0} employees</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Net Pay</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-success">
                                {formatCurrency(runDetails.totalnetpay, runDetails.currency || 'EGP')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {runDetails.payslipsGenerated && (
                          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-warning" />
                              <span className="text-warning text-sm">
                                Payslips already generated for this run
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !runId.trim()}
                className="w-full py-6"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Generating Payslips...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Generate Payslips
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Only approved payroll runs are eligible for payslip generation
              </p>
            </CardFooter>
          </Card>

          {/* Information Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Generation Guidelines
              </CardTitle>
              <CardDescription>
                Important information about payslip generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
                  <div className="p-1 bg-primary/20 rounded">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Approval Required</h4>
                    <p className="text-xs text-muted-foreground">
                      Payroll must be fully approved (Manager → Finance) before payslip generation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-purple-500/10 rounded-lg">
                  <div className="p-1 bg-purple-500/20 rounded">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Document Generation</h4>
                    <p className="text-xs text-muted-foreground">
                      Generates individual PDF payslips for all employees in the selected run
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
                  <div className="p-1 bg-success/20 rounded">
                    <Download className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Distribution</h4>
                    <p className="text-xs text-muted-foreground">
                      Payslips are automatically made available to employees through their portals
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
                  <div className="p-1 bg-warning/20 rounded">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm mb-1">Processing Time</h4>
                    <p className="text-xs text-muted-foreground">
                      Generation typically takes 2-3 minutes depending on employee count
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Verify run status before generation</p>
                <p>• Ensure all exceptions are resolved</p>
                <p>• Notify employees after successful generation</p>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Generation Activity
            </CardTitle>
            <CardDescription>
              Track recent payslip generation operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No recent activity</h3>
              <p className="text-muted-foreground">
                Generate payslips to see activity history here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper Badge component
function Badge({ variant = 'default', className = '', children }: { 
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning'; 
  className?: string;
  children: React.ReactNode;
}) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    success: "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}