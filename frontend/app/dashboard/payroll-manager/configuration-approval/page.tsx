'use client';

import { useEffect, useMemo, useState } from "react";
import { payrollConfigurationService } from "@/app/services/payroll-configuration";
import { ConfigStatus } from "@/types/enums";
import { useAuth } from "@/context/AuthContext";
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/components/theme-customizer';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  Search,
  Settings,
  Shield,
  Trash2,
  Users,
  ChevronRight,
  DollarSign,
  Building,
  Calendar,
  RefreshCw,
  XCircle,
  FileSpreadsheet,
  CreditCard,
  Receipt,
  Gift,
  DoorOpen,
  TrendingUp,
  Package,
  Percent,
  Scale,
  Landmark,
  Award
} from "lucide-react";

interface EmployeeRef {
  _id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
}

interface ConfigItem {
  id: string;
  name?: string;
  title?: string;
  grade?: string;
  type?: string;
  policyName?: string;
  description?: string;
  status: ConfigStatus;
  createdAt?: string;
  baseSalary?: number;
  grossSalary?: number;
  amount?: number;
  employeeRate?: number;
  employerRate?: number;
  minSalary?: number;
  maxSalary?: number;
  createdBy?: string | EmployeeRef;
  approvedBy?: string | EmployeeRef;
  approvedAt?: string;
  [key: string]: any;
}

type EditState = {
  id: string;
  [key: string]: any;
} | null;

export default function PayrollSystemConfigurationApprovalPage() {
  const { user } = useAuth();
  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "payGrades");
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [filter, setFilter] = useState<ConfigStatus | "all">("all");
  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<ConfigItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "payGrades", label: "Pay Grades", icon: CreditCard, color: "text-blue-600", bgColor: "bg-blue-100" },
    { id: "payrollPolicies", label: "Payroll Policies", icon: Scale, color: "text-purple-600", bgColor: "bg-purple-100" },
    { id: "payTypes", label: "Pay Types", icon: Receipt, color: "text-green-600", bgColor: "bg-green-100" },
    { id: "allowances", label: "Allowances", icon: Package, color: "text-amber-600", bgColor: "bg-amber-100" },
    { id: "signingBonuses", label: "Signing Bonuses", icon: Gift, color: "text-pink-600", bgColor: "bg-pink-100" },
    { id: "terminationBenefits", label: "Termination Benefits", icon: DoorOpen, color: "text-red-600", bgColor: "bg-red-100" },
    { id: "taxRules", label: "Tax Rules", icon: TrendingUp, color: "text-indigo-600", bgColor: "bg-indigo-100" },
    { id: "insuranceBrackets", label: "Insurance Brackets", icon: Shield, color: "text-cyan-600", bgColor: "bg-cyan-100" },
  ];

  const filtered = useMemo(() => {
    let result = items;
    
    // Apply status filter
    if (filter !== "all") {
      result = result.filter((item) => item.status === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter((item) => {
        const searchText = [
          item.name,
          item.title,
          item.grade,
          item.type,
          item.policyName,
          item.description,
          item.id
        ].filter(Boolean).join(" ").toLowerCase();
        
        return searchText.includes(searchTerm.toLowerCase());
      });
    }
    
    return result;
  }, [items, filter, searchTerm]);

  const normalize = (raw: any, tab: string): ConfigItem => {
    let displayName = "";
    let normalizedItem: any = { ...raw };
    
    switch (tab) {
      case "payGrades":
        displayName = raw.grade || raw.name || "";
        normalizedItem.baseSalary = raw.baseSalary || raw.base_salary || 0;
        normalizedItem.grossSalary = raw.grossSalary || raw.gross_salary || 0;
        break;
      case "payTypes":
        displayName = raw.type || raw.name || "";
        normalizedItem.amount = raw.amount || 0;
        break;
      case "payrollPolicies":
        displayName = raw.policyName || raw.name || "";
        break;
      case "allowances":
      case "signingBonuses":
      case "terminationBenefits":
        displayName = raw.name || "";
        normalizedItem.amount = raw.amount || 0;
        break;
      case "taxRules":
        displayName = raw.name || raw.ruleName || "";
        break;
      case "insuranceBrackets":
        displayName = raw.name || "";
        normalizedItem.minSalary = raw.minSalary || 0;
        normalizedItem.maxSalary = raw.maxSalary || 0;
        normalizedItem.employeeRate = raw.employeeRate || 0;
        normalizedItem.employerRate = raw.employerRate || 0;
        break;
      default:
        displayName = raw.name || raw.title || "";
    }
    
    return {
      id: raw._id || raw.id,
      name: displayName,
      title: displayName,
      grade: raw.grade,
      type: raw.type,
      policyName: raw.policyName,
      description: raw.description,
      status: raw.status || ConfigStatus.DRAFT,
      createdAt: raw.createdAt || raw.created_at,
      baseSalary: normalizedItem.baseSalary,
      grossSalary: normalizedItem.grossSalary,
      amount: normalizedItem.amount,
      minSalary: normalizedItem.minSalary,
      maxSalary: normalizedItem.maxSalary,
      employeeRate: normalizedItem.employeeRate,
      employerRate: normalizedItem.employerRate,
      createdBy: raw.createdBy || raw.createdByEmployeeId,
      approvedBy: raw.approvedBy,
      approvedAt: raw.approvedAt || raw.approved_at,
      ...raw,
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.getPayGrades();
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.getPayrollPolicies();
          break;
        case "payTypes":
          res = await payrollConfigurationService.getPayTypes();
          break;
        case "allowances":
          res = await payrollConfigurationService.getAllowances();
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.getSigningBonuses();
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.getTerminationBenefits();
          break;
        case "taxRules":
          res = await payrollConfigurationService.getTaxRules();
          break;
        case "insuranceBrackets":
          res = await payrollConfigurationService.getInsuranceBrackets();
          break;
        default:
          res = { data: [] };
      }

      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      let rawData: any[] = [];
      
      if (res?.data) {
        const data = res.data as any;
        if (Array.isArray(data)) {
          rawData = data;
        } else if (data.data && Array.isArray(data.data)) {
          rawData = data.data;
        } else if (data.statusCode && data.data && Array.isArray(data.data)) {
          rawData = data.data;
        } else if (typeof data === 'object') {
          const keys = Object.keys(data);
          for (const key of keys) {
            if (Array.isArray(data[key])) {
              rawData = data[key];
              break;
            }
          }
        }
      } else if (Array.isArray(res)) {
        rawData = res;
      }
      
      setItems(Array.isArray(rawData) ? rawData.map(item => normalize(item, activeTab)) : []);
    } catch (e: any) {
      console.error(`Failed to load ${activeTab}:`, e);
      setError(e?.message || `Failed to load ${tabs.find(t => t.id === activeTab)?.label || activeTab}. Please check if the backend is running.`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeTab]);

  const approve = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      const payload = { approvedBy: user.id };
      
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.approvePayGrade(id, payload);
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.approvePayrollPolicy(id, payload);
          break;
        case "payTypes":
          res = await payrollConfigurationService.approvePayType(id, payload);
          break;
        case "allowances":
          res = await payrollConfigurationService.approveAllowance(id, payload);
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.approveSigningBonus(id, payload);
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.approveTerminationBenefit(id, payload);
          break;
        case "taxRules":
          res = await payrollConfigurationService.approveTaxRule(id, payload);
          break;
        case "insuranceBrackets":
          res = await payrollConfigurationService.approveInsuranceBracket(id, payload);
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration approved successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    if (!user?.id) {
      setError("User not authenticated");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      const payload = { approvedBy: user.id };
      
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.rejectPayGrade(id, payload);
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.rejectPayrollPolicy(id, payload);
          break;
        case "payTypes":
          res = await payrollConfigurationService.rejectPayType(id, payload);
          break;
        case "allowances":
          res = await payrollConfigurationService.rejectAllowance(id, payload);
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.rejectSigningBonus(id, payload);
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.rejectTerminationBenefit(id, payload);
          break;
        case "taxRules":
          res = await payrollConfigurationService.rejectTaxRule(id, payload);
          break;
        case "insuranceBrackets":
          res = await payrollConfigurationService.rejectInsuranceBracket(id, payload);
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration rejected");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this configuration?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let res;
      switch (activeTab) {
        case "payGrades":
          res = await payrollConfigurationService.deletePayGrade(id);
          break;
        case "payrollPolicies":
          res = await payrollConfigurationService.deletePayrollPolicy(id);
          break;
        case "payTypes":
          res = await payrollConfigurationService.deletePayType(id);
          break;
        case "allowances":
          res = await payrollConfigurationService.deleteAllowance(id);
          break;
        case "signingBonuses":
          res = await payrollConfigurationService.deleteSigningBonus(id);
          break;
        case "terminationBenefits":
          res = await payrollConfigurationService.deleteTerminationBenefit(id);
          break;
        case "taxRules":
          res = await payrollConfigurationService.deleteTaxRule(id);
          break;
        case "insuranceBrackets":
          res = await payrollConfigurationService.deleteInsuranceBracket(id);
          break;
      }
      
      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }
      
      setSuccess("Configuration deleted successfully");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to delete");
    }
  };

  const viewItem = (item: ConfigItem) => {
    setView(item);
  };

  const closeView = () => setView(null);

  const beginEdit = (item: ConfigItem) => {
    if (item.status !== ConfigStatus.DRAFT) {
      setError("Only DRAFT configurations can be edited.");
      return;
    }

    setEdit(item);
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEdit(null);
    setError(null);
  };

  const saveEdit = async () => {
    if (!edit) return;

    setError(null);
    setSuccess(null);

    try {
      let res;
      let payload: any = {};

      switch (activeTab) {
        case "payGrades":
          payload = {
            grade: edit.grade,
            baseSalary: Number(edit.baseSalary),
            grossSalary: Number(edit.grossSalary),
          };
          res = await payrollConfigurationService.updatePayGrade(edit.id, payload);
          break;
        case "payrollPolicies":
          payload = {
            policyName: edit.policyName || edit.name,
            description: edit.description,
            effectiveDate: edit.effectiveDate,
            applicability: edit.applicability,
          };
          res = await payrollConfigurationService.updatePayrollPolicy(edit.id, payload);
          break;
        case "payTypes":
          const amountNumber = Number(edit.amount);
          if (!Number.isFinite(amountNumber)) {
            throw new Error("Please enter a valid amount for the pay type");
          }

          payload = {
            type: edit.type || edit.name,
            amount: amountNumber,
          };
          res = await payrollConfigurationService.updatePayType(edit.id, payload);
          break;
        case "allowances":
        case "signingBonuses":
        case "terminationBenefits":
          payload = {
            name: edit.name,
            amount: Number(edit.amount),
          };
          if (activeTab === "allowances") {
            res = await payrollConfigurationService.updateAllowance(edit.id, payload);
          } else if (activeTab === "signingBonuses") {
            res = await payrollConfigurationService.updateSigningBonus(edit.id, payload);
          } else {
            res = await payrollConfigurationService.updateTerminationBenefit(edit.id, payload);
          }
          break;
        case "taxRules":
          payload = {
            name: edit.name,
            description: edit.description,
          };
          res = await payrollConfigurationService.updateTaxRule(edit.id, payload);
          break;
        case "insuranceBrackets":
          payload = {
            minSalary: Number(edit.minSalary),
            maxSalary: Number(edit.maxSalary),
            employeeRate: Number(edit.employeeRate),
            employerRate: Number(edit.employerRate),
          };
          res = await payrollConfigurationService.updateInsuranceBracket(edit.id, payload);
          break;
      }

      if ((res as any)?.error) {
        throw new Error((res as any).error);
      }

      setSuccess("Configuration updated successfully");
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update configuration");
    }
  };

  const getStatusBadge = (status: ConfigStatus) => {
    switch (status) {
      case ConfigStatus.APPROVED:
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case ConfigStatus.REJECTED:
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case ConfigStatus.DRAFT:
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            <Edit className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount && amount !== 0) return "-";
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatPercentage = (rate?: number) => {
    if (!rate && rate !== 0) return "-";
    return `${rate.toFixed(2)}%`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format employee display from populated data or raw ID
  const formatEmployee = (employee?: string | EmployeeRef): string => {
    if (!employee) return "-";
    
    // If it's a string (raw ID), return it as is
    if (typeof employee === 'string') {
      return employee;
    }
    
    // If it's a populated object, format with name and employee number
    const name = employee.fullName || 
      (employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}` 
        : employee.firstName || employee.lastName || 'Unknown');
    
    if (employee.employeeNumber) {
      return `${name} (${employee.employeeNumber})`;
    }
    
    return name;
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
            <span className="hover:text-primary transition-colors">Payroll Administration</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Configuration Approval</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Configuration Approval
              </h1>
              <p className="text-muted-foreground">
                Review, approve, reject, and manage all payroll configuration types
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-success font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Main Content - Full Width */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Management
            </CardTitle>
            <CardDescription>
              Manage payroll configurations across all categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-4 gap-3 h-auto p-2">
                {tabs.map((tab) => {
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="py-3 px-4 text-sm font-medium">
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={activeTab} className="space-y-6">
                {/* Edit Form */}
                {edit && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Edit Configuration
                      </CardTitle>
                      <CardDescription>
                        Update configuration details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeTab === "payGrades" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Grade Name</Label>
                            <Input
                              value={edit.grade || ""}
                              onChange={(e) => setEdit({ ...edit, grade: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Base Salary</Label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                type="number"
                                value={edit.baseSalary || ""}
                                onChange={(e) => setEdit({ ...edit, baseSalary: e.target.value })}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Gross Salary</Label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                type="number"
                                value={edit.grossSalary || ""}
                                onChange={(e) => setEdit({ ...edit, grossSalary: e.target.value })}
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "payTypes" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Pay Type</Label>
                            <Input
                              value={edit.type || edit.name || ""}
                              onChange={(e) => setEdit({ ...edit, type: e.target.value, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                type="number"
                                value={edit.amount || ""}
                                onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {["allowances", "signingBonuses", "terminationBenefits"].includes(activeTab) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{activeTab === "allowances" ? "Allowance Name" : 
                                   activeTab === "signingBonuses" ? "Bonus Name" : "Benefit Name"}</Label>
                            <Input
                              value={edit.name || ""}
                              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                type="number"
                                value={edit.amount || ""}
                                onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                                className="pl-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "insuranceBrackets" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Minimum Salary</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                  type="number"
                                  value={edit.minSalary || ""}
                                  onChange={(e) => setEdit({ ...edit, minSalary: e.target.value })}
                                  className="pl-8"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Maximum Salary</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <Input
                                  type="number"
                                  value={edit.maxSalary || ""}
                                  onChange={(e) => setEdit({ ...edit, maxSalary: e.target.value })}
                                  className="pl-8"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Employee Rate (%)</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={edit.employeeRate || ""}
                                  onChange={(e) => setEdit({ ...edit, employeeRate: e.target.value })}
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                  <Percent className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Employer Rate (%)</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={edit.employerRate || ""}
                                  onChange={(e) => setEdit({ ...edit, employerRate: e.target.value })}
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                  <Percent className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button onClick={saveEdit}>
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label?.toLowerCase()}...`}
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                      <SelectTrigger className="w-[130px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value={ConfigStatus.DRAFT}>Draft</SelectItem>
                        <SelectItem value={ConfigStatus.APPROVED}>Approved</SelectItem>
                        <SelectItem value={ConfigStatus.REJECTED}>Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={load}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Configurations Table */}
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">
                          No configurations found
                        </h3>
                        <p className="text-muted-foreground">
                          {searchTerm || filter !== "all" ? "Try adjusting your search or filter" : "No configurations available"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          {activeTab === "payGrades" && (
                            <>
                              <TableHead className="text-right">Base Salary</TableHead>
                              <TableHead className="text-right">Gross Salary</TableHead>
                            </>
                          )}
                          {(activeTab === "payTypes" || 
                            activeTab === "allowances" || 
                            activeTab === "signingBonuses" || 
                            activeTab === "terminationBenefits") && (
                            <TableHead className="text-right">Amount</TableHead>
                          )}
                          {activeTab === "insuranceBrackets" && (
                            <>
                              <TableHead className="text-right">Salary Range</TableHead>
                              <TableHead className="text-right">Employee Rate</TableHead>
                              <TableHead className="text-right">Employer Rate</TableHead>
                            </>
                          )}
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-foreground">
                                  {item.name || item.grade || item.policyName || item.type || "Unnamed"}
                                </div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-1">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            
                            {/* Type-specific columns */}
                            {activeTab === "payGrades" && (
                              <>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.baseSalary)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.grossSalary)}
                                </TableCell>
                              </>
                            )}
                            
                            {(activeTab === "payTypes" || 
                              activeTab === "allowances" || 
                              activeTab === "signingBonuses" || 
                              activeTab === "terminationBenefits") && (
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.amount)}
                              </TableCell>
                            )}
                            
                            {activeTab === "insuranceBrackets" && (
                              <>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.minSalary)} - {formatCurrency(item.maxSalary)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPercentage(item.employeeRate)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatPercentage(item.employerRate)}
                                </TableCell>
                              </>
                            )}
                            
                            <TableCell>
                              {getStatusBadge(item.status)}
                            </TableCell>
                            
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </TableCell>
                            
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => viewItem(item)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {item.status === ConfigStatus.DRAFT && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => beginEdit(item)}
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => approve(item.id)}
                                      title="Approve"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => reject(item.id)}
                                      title="Reject"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteItem(item.id)}
                                  title="Delete"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* View Modal */}
      <Dialog open={!!view} onOpenChange={(open) => !open && closeView()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Configuration Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this configuration
            </DialogDescription>
          </DialogHeader>
          
          {view && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {view.name || view.grade || view.policyName || view.type || 'Unnamed Configuration'}
                  </h3>
                  <p className="text-sm text-muted-foreground">ID: {view.id}</p>
                </div>
                {getStatusBadge(view.status)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Created Date</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatDate(view.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Configuration Type</Label>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {tabs.find(t => t.id === activeTab)?.label}
                    </span>
                  </div>
                </div>

                {view.baseSalary !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Base Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatCurrency(view.baseSalary)}
                      </span>
                    </div>
                  </div>
                )}

                {view.grossSalary !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Gross Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatCurrency(view.grossSalary)}
                      </span>
                    </div>
                  </div>
                )}

                {view.amount !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatCurrency(view.amount)}
                      </span>
                    </div>
                  </div>
                )}

                {view.minSalary !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Minimum Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatCurrency(view.minSalary)}
                      </span>
                    </div>
                  </div>
                )}

                {view.maxSalary !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Maximum Salary</Label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatCurrency(view.maxSalary)}
                      </span>
                    </div>
                  </div>
                )}

                {view.employeeRate !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Employee Rate</Label>
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatPercentage(view.employeeRate)}
                      </span>
                    </div>
                  </div>
                )}

                {view.employerRate !== undefined && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Employer Rate</Label>
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatPercentage(view.employerRate)}
                      </span>
                    </div>
                  </div>
                )}

                {view.createdBy && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Created By</Label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{formatEmployee(view.createdBy)}</span>
                    </div>
                  </div>
                )}

                {view.approvedBy && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {view.status === ConfigStatus.REJECTED ? 'Rejected By' : 'Approved By'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{formatEmployee(view.approvedBy)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {view.description && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {view.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeView}>
              Close
            </Button>
            {view?.status === ConfigStatus.DRAFT && (
              <Button onClick={() => {
                beginEdit(view);
                closeView();
              }}>
                Edit Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}