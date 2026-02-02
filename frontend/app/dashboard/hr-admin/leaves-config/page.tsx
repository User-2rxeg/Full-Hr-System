'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { leavesService } from '@/app/services/leaves';
import { organizationStructureService } from '@/app/services/organization-structure';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Users, X, Search } from 'lucide-react';

type TabType =
  | 'categories'
  | 'types'
  | 'policies'
  | 'eligibility'
  | 'calendar'
  | 'accruals'
  | 'entitlements'
  | 'manual-adjustment'
  | 'reset'
  | 'access-control';

interface LeaveCategory {
  _id: string;
  name: string;
  description?: string;
}

interface LeaveType {
  _id: string;
  id?: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType?: 'medical' | 'document' | 'other';
  minTenureMonths?: number;
  maxDurationDays?: number;

  // backend may store eligibility object (because you PATCH {eligibility: body})
  eligibility?: {
    minTenureMonths?: number;
    positionsAllowed?: string[];
    contractTypesAllowed?: string[];
    employmentTypes?: string[];
  };
}

interface LeavePolicy {
  _id: string;
  leaveTypeId: string | { _id?: string; name?: string; code?: string } | any; // Can be string ID or populated object from backend
  accrualMethod: 'monthly' | 'yearly' | 'per-term';
  monthlyRate?: number;
  yearlyRate?: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  expiryAfterMonths?: number;
  roundingRule: 'none' | 'round' | 'round_up' | 'round_down';
  minNoticeDays: number;
  maxConsecutiveDays?: number;
}

interface Entitlement {
  _id?: string;
  employeeId: string;
  leaveTypeId: string;
  yearlyEntitlement?: number;
  accruedActual?: number;
  accruedRounded?: number;
  carryForward?: number;
  taken?: number;
  pending?: number;
  remaining?: number;
  lastAccrualDate?: string;
}

type AdjustmentType = 'add' | 'deduct' | 'encashment'; // remove 'encashment' if backend doesn't support it

type AppRole = 'HR_ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE';

// Employee interface for dropdown selection
interface EmployeeOption {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  fullName?: string;
}

export default function HRAdminLeavesConfigPage() {
  const { user } = useAuth();

  // --------------------------
  // Employee selection state (for dropdowns)
  // --------------------------
  const [allEmployees, setAllEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // For entitlements tab
  const [selectedEntEmployee, setSelectedEntEmployee] = useState<EmployeeOption | null>(null);
  const [entEmployeeSearch, setEntEmployeeSearch] = useState('');
  const [showEntEmployeeDropdown, setShowEntEmployeeDropdown] = useState(false);

  // For manual adjustment tab
  const [selectedAdjEmployee, setSelectedAdjEmployee] = useState<EmployeeOption | null>(null);
  const [adjEmployeeSearch, setAdjEmployeeSearch] = useState('');
  const [showAdjEmployeeDropdown, setShowAdjEmployeeDropdown] = useState(false);

  // For adjustment history
  const [selectedHistEmployee, setSelectedHistEmployee] = useState<EmployeeOption | null>(null);
  const [histEmployeeSearch, setHistEmployeeSearch] = useState('');
  const [showHistEmployeeDropdown, setShowHistEmployeeDropdown] = useState(false);

  // For recalculate single employee
  const [selectedRecalcEmployee, setSelectedRecalcEmployee] = useState<EmployeeOption | null>(null);
  const [recalcEmployeeSearch, setRecalcEmployeeSearch] = useState('');
  const [showRecalcEmployeeDropdown, setShowRecalcEmployeeDropdown] = useState(false);

  // --------------------------
  // helpers
  // --------------------------
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const getActorId = () => {
    // adapt if your auth user shape differs
    return (user as unknown as { _id?: string; id?: string })?._id || (user as unknown as { _id?: string; id?: string })?.id || '';
  };

  const getTypeName = (leaveType: LeaveType | string | null | undefined): string => {
    if (!leaveType) return 'Unknown';

    // لو backend رجّع object populated
    if (typeof leaveType === 'object') {
      const name = leaveType.name ?? '';
      const code = leaveType.code ?? '';
      const id = leaveType._id || (leaveType as unknown as Record<string, unknown>).id;
      return name ? `${name}${code ? ` (${code})` : ''}` : (String(id) ?? 'Unknown');
    }

    // لو string id
    const t = types.find((x) => x._id === leaveType);
    return t ? `${t.name} (${t.code})` : String(leaveType);
  };

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    const response = (err as unknown as Record<string, unknown>)?.response as Record<string, unknown> | undefined;
    return (response?.data as Record<string, unknown>)?.message as string || err.message || 'An error occurred';
  }
  return 'An error occurred';
};

  // --------------------------
  // Categories
  // --------------------------
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // --------------------------
  // Types
  // --------------------------
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    description: '',
    paid: true,
    deductible: true,
    requiresAttachment: false,
    attachmentType: 'medical' as 'medical' | 'document' | 'other',
    minTenureMonths: undefined as number | undefined,
    maxDurationDays: undefined as number | undefined,
  });
  const [editingType, setEditingType] = useState<string | null>(null);

  // --------------------------
  // Special Absence/Mission Types Configuration (REQ-011)
  // --------------------------
  const [showSpecialAbsenceModal, setShowSpecialAbsenceModal] = useState(false);
  const [specialAbsenceTypeId, setSpecialAbsenceTypeId] = useState<string | null>(null);
  const [specialAbsenceConfig, setSpecialAbsenceConfig] = useState<{
    isSpecialAbsence?: boolean;
    isMissionType?: boolean;
    trackSickLeaveCycle?: boolean;
    sickLeaveMaxDays?: number;
    sickLeaveCycleYears?: number;
    trackMaternityCount?: boolean;
    maxMaternityCount?: number;
    requiresSpecialApproval?: boolean;
    specialRules?: Record<string, any>;
  }>({
    trackSickLeaveCycle: false,
    sickLeaveMaxDays: 360,
    sickLeaveCycleYears: 3,
    trackMaternityCount: false,
    requiresSpecialApproval: false,
  });

  // --------------------------
  // Policies
  // --------------------------
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [policyForm, setPolicyForm] = useState({
    leaveTypeId: '',
    accrualMethod: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    monthlyRate: undefined as number | undefined,
    yearlyRate: undefined as number | undefined,
    carryForwardAllowed: false,
    maxCarryForward: undefined as number | undefined,
    expiryAfterMonths: undefined as number | undefined,
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
    minNoticeDays: 0,
    maxConsecutiveDays: undefined as number | undefined,
  });
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);

  // --------------------------
  // Approval Workflow Configuration (REQ-009)
  // --------------------------
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowPolicyId, setWorkflowPolicyId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{ _id: string; title: string; code: string }>>([]);
  const [workflowConfig, setWorkflowConfig] = useState<{
    defaultWorkflow: Array<{ role: string; order: number; positionId?: string; positionCode?: string }>;
    positionWorkflows: Array<{
      positionId: string;
      positionCode?: string;
      workflow: Array<{ role: string; order: number; positionId?: string; positionCode?: string }>;
    }>;
  }>({
    defaultWorkflow: [{ role: 'manager', order: 1 }, { role: 'hr', order: 2 }],
    positionWorkflows: [],
  });

  // --------------------------
  // Eligibility
  // --------------------------
  const [selectedTypeForEligibility, setSelectedTypeForEligibility] = useState<string>('');
  const [eligibilityForm, setEligibilityForm] = useState({
    minTenureMonths: undefined as number | undefined,
    positionsAllowed: [] as string[],
    contractTypesAllowed: [] as string[],
    employmentTypes: [] as string[],
  });

  // --------------------------
  // Calendar
  // --------------------------
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<{
    holidays: string[];
    blockedPeriods: Array<{ from: string; to: string; reason: string }>;
  } | null>(null);

  const [holidayForm, setHolidayForm] = useState({ date: '', reason: '' });
  const [blockedPeriodForm, setBlockedPeriodForm] = useState({ from: '', to: '', reason: '' });

  // --------------------------
  // Accruals + carry-forward + recalc
  // --------------------------
  const [accrualForm, setAccrualForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    method: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
  });

  const [carryForwardForm, setCarryForwardForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    capDays: undefined as number | undefined,
    expiryMonths: undefined as number | undefined,
  });

  const [recalcEmployeeId, setRecalcEmployeeId] = useState('');

  // --------------------------
  // Entitlements (assign + list + summary)
  // --------------------------
  const [entForm, setEntForm] = useState({
    employeeIds: '', // supports single or group
    leaveTypeId: '',
    yearlyEntitlement: '',
  });
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [entSummary, setEntSummary] = useState<{ summary?: Record<string, unknown>; data?: Entitlement[] } | null>(null);

  // --------------------------
  // Manual adjustments (REQ-013)
  // --------------------------
  const [adjForm, setAdjForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    adjustmentType: 'add' as AdjustmentType,
    amount: '',
    reason: '',
    hrUserId: '',
  });

  interface AdjustmentHistory {
    _id?: string;
    id?: string;
    employeeId?: string;
    leaveTypeId?: string;
    leaveType?: string;
    adjustmentType?: string;
    type?: string;
    amount?: number;
    days?: number;
    reason?: string;
    appliedAt?: string;
    createdAt?: string;
    date?: string;
  }

  const [adjHistory, setAdjHistory] = useState<AdjustmentHistory[]>([]);
  const [adjHistoryFilter, setAdjHistoryFilter] = useState({
    employeeId: '',
    leaveTypeId: '',
  });

  const [adjPreviewEntitlements, setAdjPreviewEntitlements] = useState<Entitlement[]>([]);

  // --------------------------
  // Reset leave year
  // --------------------------
  const [resetForm, setResetForm] = useState<{
    strategy: 'hireDate' | 'calendarYear' | 'custom';
    referenceDate?: string;
    dryRun: boolean;
  }>({
    strategy: 'calendarYear',
    dryRun: true, // SAFE by default
  });

  // --------------------------
  // Access control (Roles UI)
  // --------------------------
  const [roleQuery, setRoleQuery] = useState('');
  interface RoleUser {
    _id?: string;
    id?: string;
    name?: string;
    fullName?: string;
    fullname?: string;
    email?: string;
    employeeNumber?: string;
    role?: AppRole;
  }
  const [roleUser, setRoleUser] = useState<RoleUser | null>(null);
  const [newRole, setNewRole] = useState<AppRole>('EMPLOYEE');

  // ==========================================================
  // Fetchers
  // ==========================================================
  const fetchCategories = useCallback(async () => {
    try {
      const response = await leavesService.getAllCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCategories([]);
    }
  }, []);

const fetchTypes = useCallback(async () => {
  try {
    const response = await leavesService.getLeaveTypes();
    const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
    interface RawLeaveType extends Omit<LeaveType, '_id'> {
      id?: string;
    }
    const normalized: LeaveType[] = (raw as RawLeaveType[]).map((t: RawLeaveType) => ({
      ...t,
      _id: (t as unknown as Record<string, unknown>)._id as string || t.id || '',
    } as LeaveType));
    setTypes(normalized);
  } catch {
    setTypes([]);
  }
}, []);


  const fetchPolicies = useCallback(async () => {
    try {
      const response = await leavesService.getPolicies();
      setPolicies(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPolicies([]);
    }
  }, []);

  const fetchCalendar = useCallback(async (year: number) => {
    try {
      const response = await leavesService.getCalendar(year);
      const data = response.data as {
        holidays?: Date[] | string[];
        blockedPeriods?: Array<{ from: Date | string; to: Date | string; reason?: string }>;
      };

      setCalendar({
        holidays:
          data?.holidays?.map((d) => {
            const date = typeof d === 'string' ? new Date(d) : d;
            return date.toISOString().split('T')[0];
          }) || [],
        blockedPeriods:
          data?.blockedPeriods?.map((bp) => ({
            from: typeof bp.from === 'string' ? bp.from : bp.from.toISOString().split('T')[0],
            to: typeof bp.to === 'string' ? bp.to : bp.to.toISOString().split('T')[0],
            reason: bp.reason || '',
          })) || [],
      });
    } catch {
      setCalendar({ holidays: [], blockedPeriods: [] });
    }
  }, []);

  const fetchEligibilityForType = useCallback(async (typeId: string) => {
    if (!typeId) return;
    try {
      const res = await leavesService.getLeaveType(typeId);
      const t = res.data as LeaveType;
      const e = t?.eligibility || {};
      setEligibilityForm({
        minTenureMonths: e.minTenureMonths,
        positionsAllowed: e.positionsAllowed || [],
        contractTypesAllowed: e.contractTypesAllowed || [],
        employmentTypes: e.employmentTypes || [],
      });
    } catch {
      // keep user edits if fetch fails
    }
  }, []);

  // ==========================================================
  // Effects
  // ==========================================================
  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchTypes();
  }, [user, fetchCategories, fetchTypes]);

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'policies') fetchPolicies();
    if (activeTab === 'calendar') fetchCalendar(selectedYear);
    if (activeTab === 'eligibility' && selectedTypeForEligibility) fetchEligibilityForType(selectedTypeForEligibility);
  }, [user, activeTab, selectedYear, selectedTypeForEligibility, fetchPolicies, fetchCalendar, fetchEligibilityForType]);

  useEffect(() => {
    // auto-fill hrUserId for adjustments when user is available
    const actorId = getActorId();
    if (actorId && !adjForm.hrUserId) {
      setAdjForm((p) => ({ ...p, hrUserId: actorId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // auto-load balances preview in REQ-013 tab
  const fetchAdjPreviewEntitlements = useCallback(async (employeeId: string) => {
    const empId = employeeId.trim();
    if (!empId) {
      setAdjPreviewEntitlements([]);
      return;
    }
    try {
      const res = await leavesService.getEntitlements(empId);
      setAdjPreviewEntitlements(Array.isArray(res.data) ? (res.data as Entitlement[]) : []);
    } catch {
      setAdjPreviewEntitlements([]);
    }
  }, []);

  // Fetch all employees for dropdowns
  const fetchAllEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileService.getAllEmployees(1, 100) as any;
      const data = response?.data?.data || response?.data || response || [];

      if (Array.isArray(data)) {
        setAllEmployees(data.map((emp: any) => ({
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeNumber: emp.employeeNumber || '',
          fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
        })));
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Filter employees based on search
  const filterEmployees = (search: string) => {
    const searchLower = search.toLowerCase();
    return allEmployees.filter(emp => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      return fullName.includes(searchLower) ||
             emp.employeeNumber?.toLowerCase().includes(searchLower) ||
             emp._id.toLowerCase().includes(searchLower);
    });
  };

  useEffect(() => {
    if (activeTab !== 'manual-adjustment') return;
    if (!selectedAdjEmployee) {
      setAdjPreviewEntitlements([]);
      return;
    }
    fetchAdjPreviewEntitlements(selectedAdjEmployee._id);
  }, [activeTab, selectedAdjEmployee, fetchAdjPreviewEntitlements]);

  // Load employees when entering relevant tabs
  useEffect(() => {
    if (['entitlements', 'manual-adjustment', 'accruals'].includes(activeTab) && allEmployees.length === 0) {
      fetchAllEmployees();
    }
  }, [activeTab, allEmployees.length, fetchAllEmployees]);

  // ==========================================================
  // Category handlers
  // ==========================================================
  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.createCategory(categoryForm);
      setSuccess('Category created ✅');
      setCategoryForm({ name: '', description: '' });
      await fetchCategories();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      setLoading(true);
      clearMessages();
      await leavesService.updateCategory(id, categoryForm);
      setSuccess('Category updated ✅');
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      await fetchCategories();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      setLoading(true);
      clearMessages();
      await leavesService.deleteCategory(id);
      setSuccess('Category deleted ✅');
      await fetchCategories();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Type handlers
  // ==========================================================
  const resetTypeForm = () => {
    setTypeForm({
      code: '',
      name: '',
      categoryId: '',
      description: '',
      paid: true,
      deductible: true,
      requiresAttachment: false,
      attachmentType: 'medical',
      minTenureMonths: undefined,
      maxDurationDays: undefined,
    });
  };

  const handleCreateType = async () => {
    if (!typeForm.code.trim() || !typeForm.name.trim() || !typeForm.categoryId) {
      setError('Code, name, and category are required');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.createLeaveType(typeForm);
      setSuccess('Leave type created ✅');
      resetTypeForm();
      await fetchTypes();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to create leave type');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateType = async (id: string) => {
    try {
      setLoading(true);
      clearMessages();
      await leavesService.updateLeaveType(id, typeForm);
      setSuccess('Leave type updated ✅');
      setEditingType(null);
      resetTypeForm();
      await fetchTypes();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to update leave type');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Delete this leave type?')) return;
    try {
      setLoading(true);
      clearMessages();
      await leavesService.deleteLeaveType(id);
      setSuccess('Leave type deleted ✅');
      await fetchTypes();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to delete leave type');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Policy handlers
  // ==========================================================
  const resetPolicyForm = () => {
    setPolicyForm({
      leaveTypeId: '',
      accrualMethod: 'monthly',
      monthlyRate: undefined,
      yearlyRate: undefined,
      carryForwardAllowed: false,
      maxCarryForward: undefined,
      expiryAfterMonths: undefined,
      roundingRule: 'round',
      minNoticeDays: 0,
      maxConsecutiveDays: undefined,
    });
  };

  const handleCreatePolicy = async () => {
    if (!policyForm.leaveTypeId) {
      setError('Leave type is required');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.createPolicy(policyForm);
      setSuccess('Policy created ✅');
      resetPolicyForm();
      await fetchPolicies();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async (id: string) => {
    try {
      setLoading(true);
      clearMessages();
      await leavesService.updatePolicy(id, policyForm);
      setSuccess('Policy updated ✅');
      setEditingPolicy(null);
      resetPolicyForm();
      await fetchPolicies();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Delete this policy?')) return;
    try {
      setLoading(true);
      clearMessages();
      await leavesService.deletePolicy(id);
      setSuccess('Policy deleted ✅');
      await fetchPolicies();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to delete policy');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Workflow Configuration Handlers (REQ-009)
  // ==========================================================
  const openWorkflowModal = async (policyId: string) => {
    try {
      setLoading(true);
      setWorkflowPolicyId(policyId);
      
      // Fetch positions
      const positionsRes = await leavesService.getPositionsForWorkflow();
      if (positionsRes.data && Array.isArray(positionsRes.data)) {
        setPositions(positionsRes.data);
      }
      
      // Fetch existing workflow config
      const workflowRes = await leavesService.getApprovalWorkflow(policyId);
      if (workflowRes.data) {
        const config = workflowRes.data;
        setWorkflowConfig({
          defaultWorkflow: config.defaultWorkflow || [{ role: 'manager', order: 1 }, { role: 'hr', order: 2 }],
          positionWorkflows: config.positionWorkflows || [],
        });
      }
      
      setShowWorkflowModal(true);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to load workflow configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!workflowPolicyId) return;
    
    try {
      setLoading(true);
      clearMessages();
      await leavesService.configureApprovalWorkflow(workflowPolicyId, workflowConfig);
      setSuccess('Approval workflow configured ✅');
      setShowWorkflowModal(false);
      setWorkflowPolicyId(null);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to save workflow configuration');
    } finally {
      setLoading(false);
    }
  };

  const addWorkflowStep = (isDefault: boolean, positionIndex?: number) => {
    const newStep = { role: 'manager', order: 1 };
    if (isDefault) {
      const maxOrder = workflowConfig.defaultWorkflow.length > 0
        ? Math.max(...workflowConfig.defaultWorkflow.map(s => s.order))
        : 0;
      newStep.order = maxOrder + 1;
      setWorkflowConfig({
        ...workflowConfig,
        defaultWorkflow: [...workflowConfig.defaultWorkflow, newStep],
      });
    } else if (positionIndex !== undefined) {
      const pw = workflowConfig.positionWorkflows[positionIndex];
      const maxOrder = pw.workflow.length > 0
        ? Math.max(...pw.workflow.map(s => s.order))
        : 0;
      newStep.order = maxOrder + 1;
      const updated = [...workflowConfig.positionWorkflows];
      updated[positionIndex] = {
        ...updated[positionIndex],
        workflow: [...updated[positionIndex].workflow, { ...newStep, order: maxOrder + 1 }],
      };
      setWorkflowConfig({ ...workflowConfig, positionWorkflows: updated });
    }
  };

  const removeWorkflowStep = (isDefault: boolean, stepIndex: number, positionIndex?: number) => {
    if (isDefault) {
      setWorkflowConfig({
        ...workflowConfig,
        defaultWorkflow: workflowConfig.defaultWorkflow.filter((_, i) => i !== stepIndex),
      });
    } else if (positionIndex !== undefined) {
      const updated = [...workflowConfig.positionWorkflows];
      updated[positionIndex] = {
        ...updated[positionIndex],
        workflow: updated[positionIndex].workflow.filter((_, i) => i !== stepIndex),
      };
      setWorkflowConfig({ ...workflowConfig, positionWorkflows: updated });
    }
  };

  const addPositionWorkflow = () => {
    setWorkflowConfig({
      ...workflowConfig,
      positionWorkflows: [
        ...workflowConfig.positionWorkflows,
        { positionId: '', workflow: [{ role: 'manager', order: 1 }] },
      ],
    });
  };

  const removePositionWorkflow = (index: number) => {
    setWorkflowConfig({
      ...workflowConfig,
      positionWorkflows: workflowConfig.positionWorkflows.filter((_, i) => i !== index),
    });
  };

  // ==========================================================
  // Special Absence/Mission Types Handlers (REQ-011)
  // ==========================================================
  const openSpecialAbsenceModal = async (typeId: string) => {
    try {
      setLoading(true);
      setSpecialAbsenceTypeId(typeId);
      
      // Fetch existing config
      const configRes = await leavesService.getSpecialAbsenceConfig(typeId);
      if (configRes.data) {
        setSpecialAbsenceConfig({
          isSpecialAbsence: configRes.data.isSpecialAbsence || false,
          isMissionType: configRes.data.isMissionType || false,
          trackSickLeaveCycle: configRes.data.trackSickLeaveCycle || false,
          sickLeaveMaxDays: configRes.data.sickLeaveMaxDays || 360,
          sickLeaveCycleYears: configRes.data.sickLeaveCycleYears || 3,
          trackMaternityCount: configRes.data.trackMaternityCount || false,
          maxMaternityCount: configRes.data.maxMaternityCount,
          requiresSpecialApproval: configRes.data.requiresSpecialApproval || false,
          specialRules: configRes.data.specialRules || {},
        });
      } else {
        // Reset to defaults
        setSpecialAbsenceConfig({
          trackSickLeaveCycle: false,
          sickLeaveMaxDays: 360,
          sickLeaveCycleYears: 3,
          trackMaternityCount: false,
          requiresSpecialApproval: false,
        });
      }
      
      setShowSpecialAbsenceModal(true);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to load special absence configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSpecialAbsenceConfig = async () => {
    if (!specialAbsenceTypeId) return;
    
    try {
      setLoading(true);
      clearMessages();
      await leavesService.configureSpecialAbsenceType(specialAbsenceTypeId, specialAbsenceConfig);
      setSuccess('Special absence configuration saved ✅');
      setShowSpecialAbsenceModal(false);
      setSpecialAbsenceTypeId(null);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to save special absence configuration');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Eligibility handler
  // ==========================================================
  const handleSaveEligibility = async () => {
    if (!selectedTypeForEligibility) {
      setError('Please select a leave type');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.setEligibility(selectedTypeForEligibility, eligibilityForm);
      setSuccess('Eligibility saved ✅');
      await fetchTypes(); // keep UI in sync
      await fetchEligibilityForType(selectedTypeForEligibility); // reload from backend to verify persistence
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to save eligibility');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Calendar handlers
  // ==========================================================
  const handleAddHoliday = async () => {
    if (!holidayForm.date) {
      setError('Date is required');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.addHoliday({
        year: selectedYear,
        date: holidayForm.date,
        reason: holidayForm.reason,
      });
      setSuccess('Holiday added ✅');
      setHolidayForm({ date: '', reason: '' });
      await fetchCalendar(selectedYear);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHoliday = async (date: string) => {
    if (!confirm(`Remove holiday ${date}?`)) return;
    try {
      setLoading(true);
      clearMessages();
      await leavesService.removeHoliday(selectedYear, { date });
      setSuccess('Holiday removed ✅');
      await fetchCalendar(selectedYear);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to remove holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlockedPeriod = async () => {
    if (!blockedPeriodForm.from || !blockedPeriodForm.to || !blockedPeriodForm.reason) {
      setError('From date, to date, and reason are required');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.addBlockedPeriod({
        year: selectedYear,
        from: blockedPeriodForm.from,
        to: blockedPeriodForm.to,
        reason: blockedPeriodForm.reason,
      });
      setSuccess('Blocked period added ✅');
      setBlockedPeriodForm({ from: '', to: '', reason: '' });
      await fetchCalendar(selectedYear);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to add blocked period');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBlockedPeriod = async (from: string, to: string) => {
    if (!confirm(`Remove blocked period ${from} → ${to}?`)) return;
    try {
      setLoading(true);
      clearMessages();
      await leavesService.removeBlockedPeriod(selectedYear, { from, to });
      setSuccess('Blocked period removed ✅');
      await fetchCalendar(selectedYear);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to remove blocked period');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Accrual handlers
  // ==========================================================
  const handleRunAccrual = async () => {
    try {
      setLoading(true);
      clearMessages();
      const response = await leavesService.runAccrual(accrualForm);
      const result = response.data as { processed?: number } | undefined;
      setSuccess(`Accrual done ✅ Processed: ${result?.processed ?? 0}`);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to run accrual');
    } finally {
      setLoading(false);
    }
  };

  const handleCarryForward = async () => {
    try {
      setLoading(true);
      clearMessages();
      const response = await leavesService.carryForward(carryForwardForm);
      const result = response.data as { processed?: number } | undefined;
      setSuccess(`Carry forward done ✅ Processed: ${result?.processed ?? 0}`);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to run carry forward');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalcEmployee = async () => {
    if (!selectedRecalcEmployee) {
      setError('Please select an employee for recalculation');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      await leavesService.recalcEmployee(selectedRecalcEmployee._id);
      setSuccess('Employee recalculation done ✅');
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to recalculate employee');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Entitlements handlers
  // ==========================================================
  const parseEmployeeIds = (raw: string) => {
    return raw
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const loadEntitlements = async () => {
    if (!selectedEntEmployee) {
      setError('Please select an employee to load entitlements');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const res = await leavesService.getEntitlements(selectedEntEmployee._id);
      setEntitlements(Array.isArray(res.data) ? (res.data as Entitlement[]) : []);
      setSuccess('Entitlements loaded ✅');
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to load entitlements');
      setEntitlements([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEntitlementSummary = async () => {
    if (!selectedEntEmployee) {
      setError('Please select an employee to load summary');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const res = await leavesService.getEntitlementSummary(selectedEntEmployee._id);
      setEntSummary(res.data);
      setSuccess('Entitlement summary loaded ✅');
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to load entitlement summary');
      setEntSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEntitlement = async () => {
    if (!selectedEntEmployee) {
      setError('Please select an employee');
      return;
    }
    if (!entForm.leaveTypeId || !entForm.yearlyEntitlement) {
      setError('Leave Type and Yearly Entitlement are required');
      return;
    }

    const value = Number(entForm.yearlyEntitlement);
    if (Number.isNaN(value) || value < 0) {
      setError('Yearly Entitlement must be a valid number >= 0');
      return;
    }

    try {
      setLoading(true);
      clearMessages();

      await leavesService.assignEntitlement({
        employeeId: selectedEntEmployee._id,
        leaveTypeId: entForm.leaveTypeId,
        yearlyEntitlement: value,
      });

      setSuccess('Entitlement assigned ✅');
      await loadEntitlements();
      await loadEntitlementSummary();
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to assign entitlement');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Manual adjustments handlers (REQ-013)
  // ==========================================================
  const loadAdjustmentHistory = async () => {
    if (!selectedHistEmployee) {
      setError('Please select an employee to load adjustment history');
      return;
    }

    try {
      setLoading(true);
      clearMessages();
      const res = await leavesService.getAdjustmentHistory(selectedHistEmployee._id, adjHistoryFilter.leaveTypeId || undefined);
      setAdjHistory(Array.isArray(res.data) ? res.data : []);
      setSuccess('Adjustment history loaded ✅');
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to load adjustment history');
      setAdjHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!selectedAdjEmployee) {
      setError('Please select an employee');
      return;
    }
    const employeeId = selectedAdjEmployee._id;
    const hrUserId = (adjForm.hrUserId || getActorId()).trim();
    const leaveTypeId = adjForm.leaveTypeId;
    const amount = Number(adjForm.amount);

    if (!leaveTypeId || !adjForm.reason.trim() || !hrUserId) {
      setError('Leave Type and Reason are required');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Amount must be a number > 0');
      return;
    }

    // optional safety: prevent negative balances on deduct
    const current = adjPreviewEntitlements.find((x) => x.leaveTypeId === leaveTypeId);
    const currentRemaining = current?.remaining ?? 0;
    const isDeductLike = adjForm.adjustmentType === 'deduct';
    if (isDeductLike && current && currentRemaining - amount < 0) {
      setError('This deduction would make the balance negative. Reduce amount.');
      return;
    }

    try {
      setLoading(true);
      clearMessages();

      await leavesService.createAdjustment({
        employeeId,
        leaveTypeId,
        adjustmentType: adjForm.adjustmentType,
        amount,
        reason: adjForm.reason,
        hrUserId,
      });

      setSuccess('Adjustment created ✅');

      // refresh preview balances
      await fetchAdjPreviewEntitlements(employeeId);

      // reset form (keep employee id to speed up multiple adjustments)
      setAdjForm({
        employeeId,
        leaveTypeId: '',
        adjustmentType: 'add',
        amount: '',
        reason: '',
        hrUserId,
      });

      // auto set history filter to same employee and refresh (nice UX)
      setAdjHistoryFilter((p) => ({ ...p, employeeId }));
      try {
        await loadAdjustmentHistory();
      } catch {
        // ignore
      }
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to create adjustment');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
// Reset handler (SAFE)
// ==========================================================
const handleResetLeaveYear = async () => {
  try {
    setLoading(true);
    clearMessages();

    // build payload safely
    const basePayload: {
      strategy: "hireDate" | "calendarYear" | "custom";
      referenceDate?: string;
      dryRun: boolean;
    } = {
      strategy: resetForm.strategy,
      dryRun: true,
      ...(resetForm.strategy === "custom" && resetForm.referenceDate
        ? { referenceDate: resetForm.referenceDate }
        : {}),
    };

    // 1) preview first (dryRun = true)
    const previewRes = await leavesService.resetLeaveYear(basePayload);
    const preview = previewRes.data;

    setSuccess(`Preview ✅ processed: ${preview.processed}. Check preview section below.`);

    // 2) confirm before applying
    const ok = confirm(
      `Apply Reset Leave Year for ${preview.processed} entitlements? This will modify Mongo.`
    );
    if (!ok) return;

    // 3) apply (dryRun = false)
    const applyRes = await leavesService.resetLeaveYear({
      ...basePayload,
      dryRun: false,
    });

    setSuccess(`Applied ✅ processed: ${applyRes.data.processed}`);
  } catch (err: Error | unknown) {
    setError(
      getErrorMessage(err) || "Failed to reset leave year"
    );
  } finally {
    setLoading(false);
  }
};


  // ==========================================================
  // Access control handlers (Roles UI)
  // ==========================================================
  const handleFindUser = async () => {
    const q = roleQuery.trim();
    if (!q) {
      setError('Enter user id or email');
      return;
    }
    try {
      setLoading(true);
      clearMessages();
      const res = await leavesService.getUserByIdOrEmail(q);
      setRoleUser(res.data);
      // Map backend SystemRole to AppRole
      const backendRole = res.data?.role || '';
      const mappedRole = backendRole === 'HR Admin' ? 'HR_ADMIN' :
                        backendRole === 'HR Manager' ? 'HR_MANAGER' :
                        backendRole === 'department head' ? 'MANAGER' :
                        'EMPLOYEE';
      setNewRole(mappedRole as AppRole);
      setSuccess('User loaded ✅');
    } catch (err: Error | unknown) {
      setRoleUser(null);
      setError(getErrorMessage(err) || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async () => {
    if (!roleUser?._id) {
      setError('Load a user first');
      return;
    }
    try {
      setLoading(true);
      clearMessages();
      // Map AppRole back to SystemRole for backend
      const backendRole = newRole === 'HR_ADMIN' ? 'HR Admin' :
                         newRole === 'HR_MANAGER' ? 'HR Manager' :
                         newRole === 'MANAGER' ? 'department head' :
                         'department employee';
      await leavesService.updateUserRole(roleUser._id, { role: backendRole, actorId: getActorId() });
      setSuccess('Role updated ✅');
      const res = await leavesService.getUserByIdOrEmail(roleUser._id);
      setRoleUser(res.data);
      // Update newRole to match the response
      const mappedRole = res.data?.role === 'HR Admin' ? 'HR_ADMIN' :
                        res.data?.role === 'HR Manager' ? 'HR_MANAGER' :
                        res.data?.role === 'department head' ? 'MANAGER' :
                        'EMPLOYEE';
      setNewRole(mappedRole as AppRole);
    } catch (err: Error | unknown) {
      setError(getErrorMessage(err) || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // Tabs config
  // ==========================================================
  const tabs: Array<{ id: TabType; label: string }> = [
    { id: 'categories', label: 'Leave Categories' },
    { id: 'types', label: 'Leave Types' },
    { id: 'policies', label: 'Leave Policies' },
    { id: 'eligibility', label: 'Eligibility Rules' },
    { id: 'calendar', label: 'Calendar & Holidays' },
    { id: 'accruals', label: 'Accruals / Carry Forward / Recalc' },
    { id: 'entitlements', label: 'Entitlements' },
    { id: 'manual-adjustment', label: 'Manual Adjust Balances' },
    { id: 'reset', label: 'Leave Year Reset' },
    { id: 'access-control', label: 'Access Control (Roles)' },
  ];

  // helpers for REQ-013 preview
  const currentAdjEnt = adjPreviewEntitlements.find((x) => x.leaveTypeId === adjForm.leaveTypeId);
  const currentAdjRemaining = currentAdjEnt?.remaining ?? null;
  const parsedAdjAmount = adjForm.amount ? Number(adjForm.amount) : null;

  let afterAdjRemaining: number | null = null;
  if (currentAdjRemaining !== null && parsedAdjAmount !== null && !Number.isNaN(parsedAdjAmount)) {
    if (adjForm.adjustmentType === 'add') afterAdjRemaining = currentAdjRemaining + parsedAdjAmount;
    if (adjForm.adjustmentType === 'deduct') afterAdjRemaining = currentAdjRemaining - parsedAdjAmount;
    if (adjForm.adjustmentType === 'encashment') afterAdjRemaining = currentAdjRemaining - parsedAdjAmount; // treat like deduct in preview
  }

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div className="space-y-6 bg-background">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground">Leave Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure categories, types, policies, eligibility, calendars, accrual rules, entitlements, and manual
          adjustments.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-success/10 dark:bg-success/20 border border-success/20 text-success px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                clearMessages();
              }}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ========================= */}
      {/* Categories Tab */}
      {/* ========================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Paid Leave, Unpaid Leave"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={editingCategory ? () => handleUpdateCategory(editingCategory) : handleCreateCategory}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>

                {editingCategory && (
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', description: '' });
                      clearMessages();
                    }}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Existing Categories</h2>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat._id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                  <div>
                    <p className="font-medium text-foreground">{cat.name}</p>
                    {cat.description && <p className="text-sm text-muted-foreground">{cat.description}</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(cat._id);
                        setCategoryForm({ name: cat.name, description: cat.description || '' });
                        clearMessages();
                      }}
                      className="px-3 py-1 text-sm bg-primary/10 dark:bg-primary/20 text-primary rounded hover:bg-primary/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="px-3 py-1 text-sm bg-destructive/10 dark:bg-destructive/20 text-destructive rounded hover:bg-destructive/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No categories found. Create one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Types Tab */}
      {/* ========================= */}
      {activeTab === 'types' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingType ? 'Edit Leave Type' : 'Create New Leave Type'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Code *</label>
                <input
                  type="text"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., ANNUAL, SICK, MISSION"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Annual Leave"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
                <select
                  value={typeForm.categoryId}
                  onChange={(e) => setTypeForm({ ...typeForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <input
                  type="text"
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Optional description / special rules note"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Duration (Days)</label>
                <input
                  type="number"
                  value={typeForm.maxDurationDays ?? ''}
                  onChange={(e) =>
                    setTypeForm({
                      ...typeForm,
                      maxDurationDays: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Min Tenure (Months)</label>
                <input
                  type="number"
                  value={typeForm.minTenureMonths ?? ''}
                  onChange={(e) =>
                    setTypeForm({
                      ...typeForm,
                      minTenureMonths: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 6"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="paid"
                  checked={typeForm.paid}
                  onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.checked })}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="paid" className="text-sm text-foreground">
                  Paid Leave
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deductible"
                  checked={typeForm.deductible}
                  onChange={(e) => setTypeForm({ ...typeForm, deductible: e.target.checked })}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="deductible" className="text-sm text-foreground">
                  Deductible from Balance
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresAttachment"
                  checked={typeForm.requiresAttachment}
                  onChange={(e) => setTypeForm({ ...typeForm, requiresAttachment: e.target.checked })}
                  className="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                />
                <label htmlFor="requiresAttachment" className="text-sm text-foreground">
                  Requires Attachment
                </label>
              </div>

              {typeForm.requiresAttachment && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Attachment Type</label>
                  <select
                    value={typeForm.attachmentType}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, attachmentType: e.target.value as 'medical' | 'document' | 'other' })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="medical">Medical</option>
                    <option value="document">Document</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={editingType ? () => handleUpdateType(editingType) : handleCreateType}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : editingType ? 'Update' : 'Create'}
              </button>

              {editingType && (
                <button
                  onClick={() => {
                    setEditingType(null);
                    resetTypeForm();
                    clearMessages();
                  }}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Tip: For special absence/mission types (bereavement, mission, jury duty), create a type here and define rules
              via Policy + Eligibility + Attachment flags.
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Existing Leave Types</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>

                <tbody className="bg-card divide-y divide-border">
                  {types.map((t) => {
                    const category = categories.find((c) => c._id === t.categoryId);
                    return (
                      <tr key={t._id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">{t.code}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {t.name}
                          {category && <span className="text-muted-foreground ml-2">({category.name})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{t.paid ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingType(t._id);
                                setTypeForm({
                                  code: t.code,
                                  name: t.name,
                                  categoryId: t.categoryId,
                                  description: t.description || '',
                                  paid: t.paid,
                                  deductible: t.deductible,
                                  requiresAttachment: t.requiresAttachment,
                                  attachmentType: t.attachmentType || 'medical',
                                  minTenureMonths: t.minTenureMonths,
                                  maxDurationDays: t.maxDurationDays,
                                });
                                clearMessages();
                              }}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => openSpecialAbsenceModal(t._id)}
                              className="text-warning hover:text-warning/80 transition-colors"
                            >
                              Special Rules
                            </button>

                            <button onClick={() => handleDeleteType(t._id)} className="text-destructive hover:text-destructive/80 transition-colors">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {types.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No leave types found. Create one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Policies Tab */}
      {/* ========================= */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type *</label>
                <select
                  value={policyForm.leaveTypeId}
                  onChange={(e) => setPolicyForm({ ...policyForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select leave type</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Accrual Method *</label>
                <select
                  value={policyForm.accrualMethod}
                  onChange={(e) =>
                    setPolicyForm({ ...policyForm, accrualMethod: e.target.value as 'monthly' | 'yearly' | 'per-term' })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="per-term">Per Term</option>
                </select>
              </div>

              {policyForm.accrualMethod === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Monthly Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={policyForm.monthlyRate ?? ''}
                    onChange={(e) =>
                      setPolicyForm({
                        ...policyForm,
                        monthlyRate: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="e.g., 1.67"
                  />
                </div>
              )}

              {policyForm.accrualMethod === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Yearly Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={policyForm.yearlyRate ?? ''}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, yearlyRate: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="e.g., 20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rounding Rule</label>
                <select
                  value={policyForm.roundingRule}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down',
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="none">None</option>
                  <option value="round">Round</option>
                  <option value="round_up">Round Up</option>
                  <option value="round_down">Round Down</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Min Notice Days</label>
                <input
                  type="number"
                  value={policyForm.minNoticeDays}
                  onChange={(e) => setPolicyForm({ ...policyForm, minNoticeDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Consecutive Days</label>
                <input
                  type="number"
                  value={policyForm.maxConsecutiveDays ?? ''}
                  onChange={(e) =>
                    setPolicyForm({
                      ...policyForm,
                      maxConsecutiveDays: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 30"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="carryForward"
                  checked={policyForm.carryForwardAllowed}
                  onChange={(e) => setPolicyForm({ ...policyForm, carryForwardAllowed: e.target.checked })}
                  className="h-4 w-4 text-primary border-border rounded"
                />
                <label htmlFor="carryForward" className="text-sm text-foreground">
                  Allow Carry Forward
                </label>
              </div>

              {policyForm.carryForwardAllowed && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Max Carry Forward (Days)</label>
                    <input
                      type="number"
                      value={policyForm.maxCarryForward ?? ''}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          maxCarryForward: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Expiry After (Months)</label>
                    <input
                      type="number"
                      value={policyForm.expiryAfterMonths ?? ''}
                      onChange={(e) =>
                        setPolicyForm({
                          ...policyForm,
                          expiryAfterMonths: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      placeholder="e.g., 12"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={editingPolicy ? () => handleUpdatePolicy(editingPolicy) : handleCreatePolicy}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
              </button>

              {editingPolicy && (
                <button
                  onClick={() => {
                    setEditingPolicy(null);
                    resetPolicyForm();
                    clearMessages();
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Approval workflow is enforced (employee submits → manager approve/reject → HR finalize).
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Existing Policies</h2>

            <div className="space-y-2">
              {policies.map((p) => {
                // Handle leaveTypeId - backend populates it as { _id, name, code } or returns as string
                let leaveTypeName: string = 'Unknown Type';
                
                if (typeof p.leaveTypeId === 'string') {
                  // If it's a string ID, find in types array
                  const t = types.find((x: LeaveType) => {
                    const typeId = (x._id || x.id)?.toString();
                    return typeId === p.leaveTypeId;
                  });
                  leaveTypeName = t?.name || getTypeName(p.leaveTypeId) || 'Unknown Type';
                } else if (p.leaveTypeId && typeof p.leaveTypeId === 'object') {
                  // Backend returns populated leaveTypeId object with name and code
                  const ltObj = p.leaveTypeId as any;
                  const name = ltObj.name || '';
                  const code = ltObj.code || '';
                  leaveTypeName = name ? (code ? `${name} (${code})` : name) : 'Unknown Type';
                }
                
                // Extract leaveTypeId string for form editing
                const leaveTypeIdString = typeof p.leaveTypeId === 'string' 
                  ? p.leaveTypeId 
                  : (p.leaveTypeId as any)?._id?.toString() || (p.leaveTypeId as any)?.id?.toString() || '';
                
                return (
                  <div key={p._id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{leaveTypeName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Accrual: {p.accrualMethod} | Notice: {p.minNoticeDays} days | Carry Forward:{' '}
                          {p.carryForwardAllowed ? `Yes (max ${p.maxCarryForward ?? 0})` : 'No'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPolicy(p._id);
                            setPolicyForm({
                              leaveTypeId: leaveTypeIdString,
                              accrualMethod: p.accrualMethod,
                              monthlyRate: p.monthlyRate,
                              yearlyRate: p.yearlyRate,
                              carryForwardAllowed: p.carryForwardAllowed,
                              maxCarryForward: p.maxCarryForward,
                              expiryAfterMonths: p.expiryAfterMonths,
                              roundingRule: p.roundingRule,
                              minNoticeDays: p.minNoticeDays,
                              maxConsecutiveDays: p.maxConsecutiveDays,
                            });
                            clearMessages();
                          }}
                          className="px-3 py-1 text-sm bg-primary/10 dark:bg-primary/20 text-primary rounded hover:bg-primary/20"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => openWorkflowModal(p._id)}
                          className="px-3 py-1 text-sm bg-primary/10 dark:bg-primary/20 text-primary rounded hover:bg-primary/20"
                        >
                          Configure Workflow
                        </button>
                        <button
                          onClick={() => handleDeletePolicy(p._id)}
                          className="px-3 py-1 text-sm bg-destructive/10 dark:bg-destructive/20 text-destructive rounded hover:bg-destructive/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {policies.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No policies found. Create one above.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Workflow Configuration Modal (REQ-009) */}
      {/* ========================= */}
      {showWorkflowModal && workflowPolicyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Configure Approval Workflow</h2>
                <button
                  onClick={() => {
                    setShowWorkflowModal(false);
                    setWorkflowPolicyId(null);
                    setWorkflowConfig({
                      defaultWorkflow: [{ role: 'manager', order: 1 }, { role: 'hr', order: 2 }],
                      positionWorkflows: [],
                    });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Default Workflow */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Default Workflow</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This workflow applies to all positions unless a position-specific workflow is defined.
                  </p>
                  <div className="space-y-2">
                    {workflowConfig.defaultWorkflow.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium text-foreground w-8">Step {step.order}</span>
                        <select
                          value={step.role}
                          onChange={(e) => {
                            const updated = [...workflowConfig.defaultWorkflow];
                            updated[index] = { ...updated[index], role: e.target.value };
                            setWorkflowConfig({ ...workflowConfig, defaultWorkflow: updated });
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        >
                          <option value="manager">Manager</option>
                          <option value="hr">HR</option>
                          <option value="director">Director</option>
                          <option value="ceo">CEO</option>
                        </select>
                        <button
                          onClick={() => removeWorkflowStep(true, index)}
                          className="px-3 py-2 text-sm bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addWorkflowStep(true)}
                      className="w-full px-4 py-2 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20"
                    >
                      + Add Step
                    </button>
                  </div>
                </div>

                {/* Position-Specific Workflows */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-foreground">Position-Specific Workflows</h3>
                    <button
                      onClick={addPositionWorkflow}
                      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      + Add Position Workflow
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Define custom approval workflows for specific positions (e.g., Manager → HR → Director).
                  </p>
                  <div className="space-y-4">
                    {workflowConfig.positionWorkflows.map((pw, pwIndex) => (
                      <div key={pwIndex} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <select
                            value={pw.positionId}
                            onChange={(e) => {
                              const position = positions.find(p => p._id === e.target.value);
                              const updated = [...workflowConfig.positionWorkflows];
                              updated[pwIndex] = {
                                ...updated[pwIndex],
                                positionId: e.target.value,
                                positionCode: position?.code,
                              };
                              setWorkflowConfig({ ...workflowConfig, positionWorkflows: updated });
                            }}
                            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="">Select Position</option>
                            {positions.map((pos) => (
                              <option key={pos._id} value={pos._id}>
                                {pos.title} ({pos.code})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removePositionWorkflow(pwIndex)}
                            className="ml-2 px-3 py-2 text-sm bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-2">
                          {pw.workflow.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                              <span className="text-sm font-medium text-foreground w-8">Step {step.order}</span>
                              <select
                                value={step.role}
                                onChange={(e) => {
                                  const updated = [...workflowConfig.positionWorkflows];
                                  updated[pwIndex].workflow[stepIndex] = {
                                    ...updated[pwIndex].workflow[stepIndex],
                                    role: e.target.value,
                                  };
                                  setWorkflowConfig({ ...workflowConfig, positionWorkflows: updated });
                                }}
                                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                              >
                                <option value="manager">Manager</option>
                                <option value="hr">HR</option>
                                <option value="director">Director</option>
                                <option value="ceo">CEO</option>
                              </select>
                              <button
                                onClick={() => removeWorkflowStep(false, stepIndex, pwIndex)}
                                className="px-3 py-2 text-sm bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addWorkflowStep(false, pwIndex)}
                            className="w-full px-4 py-2 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20"
                          >
                            + Add Step
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={handleSaveWorkflow}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Workflow'}
                </button>
                <button
                  onClick={() => {
                    setShowWorkflowModal(false);
                    setWorkflowPolicyId(null);
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Special Absence/Mission Types Configuration Modal (REQ-011) */}
      {/* ========================= */}
      {showSpecialAbsenceModal && specialAbsenceTypeId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Configure Special Absence/Mission Rules</h2>
                <button
                  onClick={() => {
                    setShowSpecialAbsenceModal(false);
                    setSpecialAbsenceTypeId(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Flags */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Type Classification</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isSpecialAbsence"
                        checked={specialAbsenceConfig.isSpecialAbsence || false}
                        onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, isSpecialAbsence: e.target.checked })}
                        className="h-4 w-4 text-primary border-border rounded"
                      />
                      <label htmlFor="isSpecialAbsence" className="text-sm text-foreground">
                        Special Absence Type (e.g., bereavement, jury duty, Hajj, exams, marriage)
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isMissionType"
                        checked={specialAbsenceConfig.isMissionType || false}
                        onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, isMissionType: e.target.checked })}
                        className="h-4 w-4 text-primary border-border rounded"
                      />
                      <label htmlFor="isMissionType" className="text-sm text-foreground">
                        Mission Type
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requiresSpecialApproval"
                        checked={specialAbsenceConfig.requiresSpecialApproval || false}
                        onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, requiresSpecialApproval: e.target.checked })}
                        className="h-4 w-4 text-primary border-border rounded"
                      />
                      <label htmlFor="requiresSpecialApproval" className="text-sm text-foreground">
                        Requires Special Approval
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sick Leave Cycle Tracking */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Sick Leave 3-Year Cycle Tracking</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="trackSickLeaveCycle"
                        checked={specialAbsenceConfig.trackSickLeaveCycle || false}
                        onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, trackSickLeaveCycle: e.target.checked })}
                        className="h-4 w-4 text-primary border-border rounded"
                      />
                      <label htmlFor="trackSickLeaveCycle" className="text-sm text-foreground">
                        Track cumulatively over cycle (max 360 days per 3-year cycle)
                      </label>
                    </div>

                    {specialAbsenceConfig.trackSickLeaveCycle && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Cycle Period (Years)</label>
                          <input
                            type="number"
                            value={specialAbsenceConfig.sickLeaveCycleYears || 3}
                            onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, sickLeaveCycleYears: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                            min="1"
                            max="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Maximum Days in Cycle</label>
                          <input
                            type="number"
                            value={specialAbsenceConfig.sickLeaveMaxDays || 360}
                            onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, sickLeaveMaxDays: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                            min="1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Default: 360 days (national labor law)</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Maternity Leave Tracking */}
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Maternity Leave Count Tracking</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="trackMaternityCount"
                        checked={specialAbsenceConfig.trackMaternityCount || false}
                        onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, trackMaternityCount: e.target.checked })}
                        className="h-4 w-4 text-primary border-border rounded"
                      />
                      <label htmlFor="trackMaternityCount" className="text-sm text-foreground">
                        Track number of times employee has taken maternity leave
                      </label>
                    </div>

                    {specialAbsenceConfig.trackMaternityCount && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Maximum Allowed Count (Optional)</label>
                        <input
                          type="number"
                          value={specialAbsenceConfig.maxMaternityCount ?? ''}
                          onChange={(e) => setSpecialAbsenceConfig({ ...specialAbsenceConfig, maxMaternityCount: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          placeholder="Leave empty for unlimited"
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Leave empty to track without limit</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={handleSaveSpecialAbsenceConfig}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  onClick={() => {
                    setShowSpecialAbsenceModal(false);
                    setSpecialAbsenceTypeId(null);
                  }}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Eligibility Tab */}
      {/* ========================= */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Set Eligibility Rules</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type *</label>
                <select
                  value={selectedTypeForEligibility}
                  onChange={(e) => {
                    setSelectedTypeForEligibility(e.target.value);
                    clearMessages();
                    if (e.target.value) fetchEligibilityForType(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select leave type</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Minimum Tenure (Months)</label>
                <input
                  type="number"
                  value={eligibilityForm.minTenureMonths ?? ''}
                  onChange={(e) =>
                    setEligibilityForm({
                      ...eligibilityForm,
                      minTenureMonths: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Positions Allowed (comma-separated)</label>
                <input
                  type="text"
                  value={eligibilityForm.positionsAllowed.join(', ')}
                  onChange={(e) =>
                    setEligibilityForm({
                      ...eligibilityForm,
                      positionsAllowed: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Intern, Junior, Senior, Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contract Types Allowed (comma-separated)
                </label>
                <input
                  type="text"
                  value={eligibilityForm.contractTypesAllowed.join(', ')}
                  onChange={(e) =>
                    setEligibilityForm({
                      ...eligibilityForm,
                      contractTypesAllowed: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Full-time, Part-time, Contract"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Employment Types Allowed (comma-separated)
                </label>
                <input
                  type="text"
                  value={eligibilityForm.employmentTypes.join(', ')}
                  onChange={(e) =>
                    setEligibilityForm({
                      ...eligibilityForm,
                      employmentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Permanent, Temporary"
                />
              </div>

              <button
                onClick={handleSaveEligibility}
                disabled={loading || !selectedTypeForEligibility}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Eligibility Rules'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Calendar Tab */}
      {/* ========================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center gap-4 mb-2">
              <label className="block text-sm font-medium text-foreground">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => {
                  const year = Number(e.target.value);
                  setSelectedYear(year);
                  fetchCalendar(year);
                }}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Holiday</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date *</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                <input
                  type="text"
                  value={holidayForm.reason}
                  onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., New Year"
                />
              </div>
            </div>

            <button
              onClick={handleAddHoliday}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Holiday'}
            </button>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add Blocked Period</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">From Date *</label>
                <input
                  type="date"
                  value={blockedPeriodForm.from}
                  onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, from: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">To Date *</label>
                <input
                  type="date"
                  value={blockedPeriodForm.to}
                  onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, to: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                <input
                  type="text"
                  value={blockedPeriodForm.reason}
                  onChange={(e) => setBlockedPeriodForm({ ...blockedPeriodForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., Company Closure"
                />
              </div>
            </div>

            <button
              onClick={handleAddBlockedPeriod}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Blocked Period'}
            </button>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Holidays & Blocked Periods</h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Holidays</h3>
                {calendar && calendar.holidays.length > 0 ? (
                  <div className="space-y-2">
                    {calendar.holidays.map((date) => (
                      <div key={date} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <span>{date}</span>
                        <button
                          onClick={() => handleRemoveHoliday(date)}
                          className="text-destructive hover:text-destructive/80"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No holidays for this year.</p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Blocked Periods</h3>
                {calendar && calendar.blockedPeriods.length > 0 ? (
                  <div className="space-y-2">
                    {calendar.blockedPeriods.map((bp, idx) => (
                      <div
                        key={`${bp.from}-${bp.to}-${idx}`}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                      >
                        <span>
                          {bp.from} → {bp.to} — {bp.reason}
                        </span>
                        <button
                          onClick={() => handleRemoveBlockedPeriod(bp.from, bp.to)}
                          className="text-destructive hover:text-destructive/80"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No blocked periods for this year.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Accruals Tab */}
      {/* ========================= */}
      {activeTab === 'accruals' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Run Accrual</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reference Date</label>
                <input
                  type="date"
                  value={accrualForm.referenceDate}
                  onChange={(e) => setAccrualForm({ ...accrualForm, referenceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Accrual Method</label>
                <select
                  value={accrualForm.method}
                  onChange={(e) => setAccrualForm({ ...accrualForm, method: e.target.value as 'monthly' | 'yearly' | 'per-term' })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="per-term">Per Term</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rounding Rule</label>
                <select
                  value={accrualForm.roundingRule}
                  onChange={(e) => setAccrualForm({ ...accrualForm, roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down' })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="none">None</option>
                  <option value="round">Round</option>
                  <option value="round_up">Round Up</option>
                  <option value="round_down">Round Down</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunAccrual}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Accrual'}
            </button>

          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Carry Forward</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reference Date</label>
                <input
                  type="date"
                  value={carryForwardForm.referenceDate}
                  onChange={(e) => setCarryForwardForm({ ...carryForwardForm, referenceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Cap Days (optional)</label>
                <input
                  type="number"
                  value={carryForwardForm.capDays ?? ''}
                  onChange={(e) =>
                    setCarryForwardForm({
                      ...carryForwardForm,
                      capDays: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Expiry Months (optional)</label>
                <input
                  type="number"
                  value={carryForwardForm.expiryMonths ?? ''}
                  onChange={(e) =>
                    setCarryForwardForm({
                      ...carryForwardForm,
                      expiryMonths: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 12"
                />
              </div>
            </div>

            <button
              onClick={handleCarryForward}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Running...' : 'Run Carry Forward'}
            </button>

          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recalculate Single Employee</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">Employee *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedRecalcEmployee ? `${selectedRecalcEmployee.firstName} ${selectedRecalcEmployee.lastName}` : recalcEmployeeSearch}
                    onChange={(e) => {
                      setRecalcEmployeeSearch(e.target.value);
                      setSelectedRecalcEmployee(null);
                      setShowRecalcEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowRecalcEmployeeDropdown(true)}
                    placeholder="Search employee..."
                    className="w-full px-3 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {selectedRecalcEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecalcEmployee(null);
                        setRecalcEmployeeSearch('');
                        setRecalcEmployeeId('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showRecalcEmployeeDropdown && !selectedRecalcEmployee && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : filterEmployees(recalcEmployeeSearch).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No employees found</div>
                    ) : (
                      filterEmployees(recalcEmployeeSearch).slice(0, 10).map((emp) => (
                        <button
                          type="button"
                          key={emp._id}
                          onClick={() => {
                            setSelectedRecalcEmployee(emp);
                            setRecalcEmployeeSearch('');
                            setShowRecalcEmployeeDropdown(false);
                            setRecalcEmployeeId(emp._id);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <span className="text-sm text-foreground">{emp.firstName} {emp.lastName}</span>
                            {emp.employeeNumber && <span className="text-xs text-muted-foreground ml-2">#{emp.employeeNumber}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleRecalcEmployee}
                disabled={loading || !selectedRecalcEmployee}
                className="px-4 py-2 bg-foreground text-primary-foreground rounded-lg hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Recalculate'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Entitlements Tab */}
      {/* ========================= */}
      {activeTab === 'entitlements' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Entitlements</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 relative">
                <label className="block text-sm font-medium text-foreground mb-1">Employee *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedEntEmployee ? `${selectedEntEmployee.firstName} ${selectedEntEmployee.lastName}` : entEmployeeSearch}
                    onChange={(e) => {
                      setEntEmployeeSearch(e.target.value);
                      setSelectedEntEmployee(null);
                      setShowEntEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowEntEmployeeDropdown(true)}
                    placeholder="Search employee..."
                    className="w-full px-3 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {selectedEntEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEntEmployee(null);
                        setEntEmployeeSearch('');
                        setEntForm({ ...entForm, employeeIds: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showEntEmployeeDropdown && !selectedEntEmployee && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : filterEmployees(entEmployeeSearch).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No employees found</div>
                    ) : (
                      filterEmployees(entEmployeeSearch).slice(0, 10).map((emp) => (
                        <button
                          type="button"
                          key={emp._id}
                          onClick={() => {
                            setSelectedEntEmployee(emp);
                            setEntEmployeeSearch('');
                            setShowEntEmployeeDropdown(false);
                            setEntForm({ ...entForm, employeeIds: emp._id });
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <span className="text-sm text-foreground">{emp.firstName} {emp.lastName}</span>
                            {emp.employeeNumber && <span className="text-xs text-muted-foreground ml-2">#{emp.employeeNumber}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Select an employee to load/update entitlements.
                </p>
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type *</label>
                <select
                  value={entForm.leaveTypeId}
                  onChange={(e) => setEntForm({ ...entForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select leave type</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1">Yearly Entitlement (days) *</label>
                <input
                  type="number"
                  min="0"
                  value={entForm.yearlyEntitlement}
                  onChange={(e) => setEntForm({ ...entForm, yearlyEntitlement: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 21"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={loadEntitlements}
                disabled={loading}
                className="px-4 py-2 bg-foreground text-primary-foreground rounded-lg hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Entitlements (single)'}
              </button>

              <button
                onClick={loadEntitlementSummary}
                disabled={loading}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Summary (single)'}
              </button>

              <button
                onClick={handleAssignEntitlement}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Assign / Update (single or group)'}
              </button>
            </div>

          </div>

          {entSummary && (
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Entitlement Summary</h3>
              <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-auto">
                {JSON.stringify(entSummary, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Current Entitlements ({entitlements.length})</h3>

            {entitlements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No entitlements loaded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Yearly</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Accrued</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Taken</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Pending</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {entitlements.map((e, idx) => (
                      <tr key={e._id ?? `${e.leaveTypeId}-${idx}`}>
                        <td className="px-4 py-3 text-sm text-foreground">{String(getTypeName(e.leaveTypeId))}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{e.yearlyEntitlement ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {(e.accruedRounded ?? e.accruedActual) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{e.taken ?? '-'}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{e.pending ?? '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{e.remaining ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* Manual Adjustments Tab */}
      {/* ========================= */}
      {activeTab === 'manual-adjustment' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Manual Adjust Balances</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create an adjustment record + update entitlement balance (audit trail via backend).
            </p>

            {/* Preview balances */}
            {adjPreviewEntitlements.length > 0 && (
              <div className="mb-4 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary mb-2">Current Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {adjPreviewEntitlements.map((e, idx) => (
                    <div key={e._id ?? `${e.leaveTypeId}-${idx}`} className="text-xs">
                      <div className="flex justify-between">
                        <span className="text-primary font-medium">{String(getTypeName(e.leaveTypeId))}</span>
                        <span className="text-primary/80">Remaining: {(e.remaining ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">Employee *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedAdjEmployee ? `${selectedAdjEmployee.firstName} ${selectedAdjEmployee.lastName}` : adjEmployeeSearch}
                    onChange={(e) => {
                      setAdjEmployeeSearch(e.target.value);
                      setSelectedAdjEmployee(null);
                      setShowAdjEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowAdjEmployeeDropdown(true)}
                    placeholder="Search employee..."
                    className="w-full px-3 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {selectedAdjEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAdjEmployee(null);
                        setAdjEmployeeSearch('');
                        setAdjForm({ ...adjForm, employeeId: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showAdjEmployeeDropdown && !selectedAdjEmployee && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : filterEmployees(adjEmployeeSearch).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No employees found</div>
                    ) : (
                      filterEmployees(adjEmployeeSearch).slice(0, 10).map((emp) => (
                        <button
                          type="button"
                          key={emp._id}
                          onClick={() => {
                            setSelectedAdjEmployee(emp);
                            setAdjEmployeeSearch('');
                            setShowAdjEmployeeDropdown(false);
                            setAdjForm({ ...adjForm, employeeId: emp._id });
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <span className="text-sm text-foreground">{emp.firstName} {emp.lastName}</span>
                            {emp.employeeNumber && <span className="text-xs text-muted-foreground ml-2">#{emp.employeeNumber}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Balances auto-load when you select an employee.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type *</label>
                <select
                  value={adjForm.leaveTypeId}
                  onChange={(e) => setAdjForm({ ...adjForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">Select leave type</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Adjustment Type *</label>
                <select
                  value={adjForm.adjustmentType}
                  onChange={(e) => setAdjForm({ ...adjForm, adjustmentType: e.target.value as AdjustmentType })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="add">Add Days</option>
                  <option value="deduct">Deduct Days</option>
                  <option value="encashment">Encashment</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Remove “Encashment” if backend enum doesn’t support it.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (days) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={adjForm.amount}
                  onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="Correction / One-time grant / carry-over fix"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-foreground mb-1">HR User ID (auto) *</label>
                <input
                  type="text"
                  value={adjForm.hrUserId || getActorId()}
                  readOnly
                  className="w-full px-3 py-2 border border-border bg-muted/50 rounded-lg"
                />
              </div>
            </div>

            {/* Preview after */}
            {adjForm.employeeId && adjForm.leaveTypeId && adjForm.amount && currentAdjRemaining !== null && (
              <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Current Remaining</p>
                  <p className="text-2xl font-bold text-foreground">{Number(currentAdjRemaining).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">After</p>
                  <p
                    className={`text-2xl font-bold ${
                      afterAdjRemaining !== null && afterAdjRemaining >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {afterAdjRemaining === null ? '-' : afterAdjRemaining.toFixed(2)}
                  </p>
                  {afterAdjRemaining !== null && afterAdjRemaining < 0 && (
                    <p className="text-xs text-destructive mt-1">⚠ likely rejected if backend blocks negative balance</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateAdjustment}
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Create Adjustment'}
            </button>

          </div>

          {/* History */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Adjustment History</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">Employee *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedHistEmployee ? `${selectedHistEmployee.firstName} ${selectedHistEmployee.lastName}` : histEmployeeSearch}
                    onChange={(e) => {
                      setHistEmployeeSearch(e.target.value);
                      setSelectedHistEmployee(null);
                      setShowHistEmployeeDropdown(true);
                    }}
                    onFocus={() => setShowHistEmployeeDropdown(true)}
                    placeholder="Search employee..."
                    className="w-full px-3 py-2 pl-10 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  />
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  {selectedHistEmployee && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistEmployee(null);
                        setHistEmployeeSearch('');
                        setAdjHistoryFilter({ ...adjHistoryFilter, employeeId: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {showHistEmployeeDropdown && !selectedHistEmployee && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {loadingEmployees ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : filterEmployees(histEmployeeSearch).length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">No employees found</div>
                    ) : (
                      filterEmployees(histEmployeeSearch).slice(0, 10).map((emp) => (
                        <button
                          type="button"
                          key={emp._id}
                          onClick={() => {
                            setSelectedHistEmployee(emp);
                            setHistEmployeeSearch('');
                            setShowHistEmployeeDropdown(false);
                            setAdjHistoryFilter({ ...adjHistoryFilter, employeeId: emp._id });
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-b-0"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div>
                            <span className="text-sm text-foreground">{emp.firstName} {emp.lastName}</span>
                            {emp.employeeNumber && <span className="text-xs text-muted-foreground ml-2">#{emp.employeeNumber}</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type (optional)</label>
                <select
                  value={adjHistoryFilter.leaveTypeId}
                  onChange={(e) => setAdjHistoryFilter({ ...adjHistoryFilter, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                >
                  <option value="">All</option>
                  {types.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={loadAdjustmentHistory}
                disabled={loading}
                className="px-4 py-2 bg-foreground text-primary-foreground rounded-lg hover:bg-foreground/90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load History'}
              </button>
            </div>

            <div className="mt-4">
              {adjHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history loaded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Leave Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {adjHistory.map((h, idx) => (
                        <tr key={h._id ?? idx}>
                          <td className="px-4 py-3 text-sm">{(h.createdAt || h.date || '').toString().slice(0, 10) || '-'}</td>
                          <td className="px-4 py-3 text-sm">{String(getTypeName(h.leaveTypeId || h.leaveType || ''))}</td>
                          <td className="px-4 py-3 text-sm">{h.adjustmentType || h.type || '-'}</td>
                          <td className="px-4 py-3 text-sm">{h.amount ?? h.days ?? '-'}</td>
                          <td className="px-4 py-3 text-sm">{h.reason ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

   {/* ========================= */}
{/* Reset Tab */}
{/* ========================= */}
{activeTab === "reset" && (
  <div className="space-y-6">
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Reset Leave Year
      </h2>

      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Warning:</strong> This action resets balances based on
            strategy. This cannot be undone.
          </p>
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Reset Strategy *
          </label>
          <select
            value={resetForm.strategy}
            onChange={(e) => {
              const strategy = e.target.value as "hireDate" | "calendarYear" | "custom";

              // لو مش custom امسح referenceDate عشان مايبعتش حاجة غلط
              setResetForm((prev) => ({
                ...prev,
                strategy,
                referenceDate: strategy === "custom" ? (prev.referenceDate ?? new Date().toISOString().slice(0, 10)) : undefined,
              }));
            }}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="hireDate">By First Vacation Date</option>
            <option value="calendarYear">Calendar Year (Jan 1)</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {/* Custom date */}
        {resetForm.strategy === "custom" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Reference Date *
            </label>
            <input
              type="date"
              value={resetForm.referenceDate ?? ""}
              onChange={(e) =>
                setResetForm((prev) => ({ ...prev, referenceDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {!resetForm.referenceDate && (
              <p className="text-xs text-destructive mt-1">
                Reference date is required for Custom strategy.
              </p>
            )}
          </div>
        )}

        {/* Dry run toggle */}
        <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Dry Run (Preview)</p>
            <p className="text-xs text-muted-foreground">
              Preview changes without updating MongoDB
            </p>
          </div>

          <button
            type="button"
            onClick={() => setResetForm((prev) => ({ ...prev, dryRun: !prev.dryRun }))}
            className={`px-3 py-1 rounded-full text-sm border ${
              resetForm.dryRun
                ? "bg-success/10 dark:bg-success/20 border-success/30 text-success"
                : "bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-destructive"
            }`}
          >
            {resetForm.dryRun ? "ON" : "OFF"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleResetLeaveYear}
            disabled={
              loading ||
              (resetForm.strategy === "custom" && !resetForm.referenceDate)
            }
            className="px-4 py-2 bg-destructive text-primary-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : resetForm.dryRun
              ? "Preview Reset"
              : "Apply Reset"}
          </button>
        </div>

      </div>
    </div>
  </div>
)}


      {/* ========================= */}
      {/* Access Control Tab (Roles UI) */}
      {/* ========================= */}
      {activeTab === 'access-control' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Access Control (Roles & Permissions)</h2>
            <p className="text-sm text-muted-foreground mb-4">Search a user and update their role from the UI.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Find user (id or email)</label>
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  placeholder="e.g., 64f0... or user@email.com"
                />
              </div>

              <button
                onClick={handleFindUser}
                disabled={loading}
                className="px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Load User'}
              </button>
            </div>

            {roleUser && (
              <div className="mt-4 border border-border rounded-lg p-4 bg-card">
                <div className="text-sm text-foreground space-y-1">
                  <div>
                    <span className="font-medium">Name:</span> {roleUser.fullName || roleUser.fullname || roleUser.name || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {roleUser.email || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Employee Code:</span> <span className="font-mono text-muted-foreground">{roleUser.employeeNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Current Role:</span> {roleUser.role || '-'}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">New Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as AppRole)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      <option value="HR_ADMIN">HR_ADMIN</option>
                      <option value="HR_MANAGER">HR_MANAGER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>

                  <button
                    onClick={handleUpdateUserRole}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Saving...' : 'Update Role'}
                  </button>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Backend guards still enforce permissions. This UI only updates the stored role for the user.
                </p>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              Service methods:
              <span className="font-mono text-foreground"> leavesService.getUserByIdOrEmail(q) </span> and{' '}
              <span className="font-mono text-foreground"> leavesService.updateUserRole(userId, payload)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * leavesService methods expected by this page:
 * - getAllCategories(), createCategory(), updateCategory(id, payload), deleteCategory(id)
 * - getLeaveTypes(), getLeaveType(id), createLeaveType(payload), updateLeaveType(id, payload), deleteLeaveType(id)
 * - getPolicies(), createPolicy(payload), updatePolicy(id, payload), deletePolicy(id)
 * - setEligibility(typeId, payload)  => PATCH /leaves/types/:id/eligibility
 * - getCalendar(year), addHoliday(payload), addBlockedPeriod(payload)
 * - removeHoliday(year, {date})      => DELETE /leaves/calendar/:year/holidays   (body)
 * - removeBlockedPeriod(year,{from,to}) => DELETE /leaves/calendar/:year/blocked-periods (body)
 * - runAccrual(payload), carryForward(payload), recalcEmployee(employeeId), resetLeaveYear(payload)
 * - getEntitlements(employeeId), assignEntitlement(payload), getEntitlementSummary(employeeId)
 * - createAdjustment(payload), getAdjustmentHistory(employeeId, leaveTypeId?)
 *
 * + NEW for Roles UI:
 * - getUserByIdOrEmail(q)
 * - updateUserRole(userId, { role, actorId? })
 */
