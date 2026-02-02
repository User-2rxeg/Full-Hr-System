'use client';

import { useState, useEffect, useCallback } from 'react';
import { leavesService } from '@/app/services/leaves';
import { employeeProfileService } from '@/app/services/employee-profile';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/app/services/api';
import type { LeaveBalanceSummary } from '@/types/leaves';

interface LeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  leaveTypeId: string;
  dates: {
    from: string | Date;
    to: string | Date;
  };
  durationDays: number;
  justification?: string;
  status: string;
  approvalFlow?: Array<{
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
  }>;
  employeeName?: string;
  leaveTypeName?: string;
  createdAt?: string;
  attachmentId?: string;
}

interface LeaveType {
  _id?: string;
  id?: string;
  name: string;
  code: string;
}

interface AccrualResult {
  ok: boolean;
  message?: string;
  processed: number;
  created?: number;
  totalEntitlements?: number;
  referenceDate: string;
  method: string;
  roundingRule: string;
}

export default function HRManagerLeavesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'entitlements' | 'adjustments' | 'accruals'>('requests');

  // Requests state
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Medical document verification modal state
  const [showMedicalVerificationModal, setShowMedicalVerificationModal] = useState(false);
  const [medicalModalMode, setMedicalModalMode] = useState<'view' | 'verify'>('view'); // 'view' or 'verify'
  const [selectedMedicalAttachment, setSelectedMedicalAttachment] = useState<{
    attachmentId: string;
    requestId: string;
    employeeName?: string;
    leaveTypeName?: string;
    dates?: { from: string; to: string };
  } | null>(null);
  const [medicalAttachmentData, setMedicalAttachmentData] = useState<{
    originalName?: string;
    filePath?: string;
    fileType?: string;
    size?: number;
  } | null>(null);
  const [verifyingMedical, setVerifyingMedical] = useState(false);

  // Entitlements state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeBalances, setEmployeeBalances] = useState<LeaveBalanceSummary[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    yearlyEntitlement: 0,
  });

  // Adjustment state
  const [adjustmentForm, setAdjustmentForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    type: 'add' as 'add' | 'deduct',
    days: 0,
    reason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  // Accrual state
  const [accrualForm, setAccrualForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    method: 'monthly' as 'monthly' | 'yearly' | 'per-term',
    roundingRule: 'round' as 'none' | 'round' | 'round_up' | 'round_down',
  });
  const [carryForwardForm, setCarryForwardForm] = useState({
    referenceDate: new Date().toISOString().split('T')[0],
    useDefaultRules: true,
    annualCap: 10,
    annualExpiryMonths: 6,
    sickCanCarry: false,
    personalCap: 5,
    personalExpiryMonths: 3,
  });
  const [accrualRunning, setAccrualRunning] = useState(false);
  const [lastAccrualResult, setLastAccrualResult] = useState<AccrualResult | null>(null);
  const [carryForwardPreview, setCarryForwardPreview] = useState<{
    summary?: {
      byLeaveType?: Array<{ leaveTypeId: string; leaveTypeName: string; totalCarried: number; totalExpired: number; employeesAffected: number }>;
      employeesProcessed?: number;
      totalCarriedForward?: number;
      totalExpired?: number;
    };
    details: Array<{ employeeId: string; leaveTypeName: string; previousRemaining: number; cappedAmount: number; carriedForward: number; expired: number; expiryDate?: string }>;
    employeesProcessed?: number;
    totalCarriedForward?: number;
    totalExpired?: number;
  } | null>(null);
  const [carryForwardReport, setCarryForwardReport] = useState<{
    summary?: { totalEmployees?: number; totalCarryForward?: number; byLeaveType?: Array<{ leaveTypeId: string; leaveTypeName: string; totalCarryForward: number; employeesWithCarryForward: number }> };
    report: Array<{ employeeId: string; leaveTypeName: string; yearlyEntitlement: number; carryForward: number; taken: number; remaining: number; carryForwardExpiry?: string }>;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [recalcEmployeeId, setRecalcEmployeeId] = useState('');

  // Override state
  const [overrideForm, setOverrideForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    carryForwardDays: 0,
    expiryDate: '',
    reason: '',
  });
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Accrual Suspension state
  const [suspensionForm, setSuspensionForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    suspensionType: 'unpaid' as 'unpaid' | 'long_absence',
    fromDate: '',
    toDate: '',
    adjustmentDays: 0,
    reason: '',
  });
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionPreview, setSuspensionPreview] = useState<{
    workingDays: number;
    totalDays: number;
    prorateRatio: number;
    adjustedAccrual: number;
    originalAccrual: number;
  } | null>(null);
  const [employeeSuspensions, setEmployeeSuspensions] = useState<Array<{
    employeeId: string;
    leaveTypeId: string;
    leaveTypeName: string;
    suspensionType: string;
    fromDate: string;
    toDate: string;
    adjustmentDays: number;
    reason: string;
    appliedAt: string;
  }>>([]);

  // Payroll Sync state
  const [payrollSyncForm, setPayrollSyncForm] = useState({
    employeeId: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    baseSalary: 5000,
    workDaysInMonth: 22,
  });
  const [showPayrollSyncModal, setShowPayrollSyncModal] = useState(false);
  const [payrollSyncResult, setPayrollSyncResult] = useState<{
    ok: boolean;
    employeeId: string;
    payrollPeriod: string;
    unpaidLeaveDeduction: {
      totalDays: number;
      deductionAmount: number;
      formula: string;
      leaves: Array<{
        requestId: string;
        from: string;
        to: string;
        days: number;
      }>;
    };
    balanceSummary: {
      annual: { entitled: number; taken: number; remaining: number };
      sick: { entitled: number; taken: number; remaining: number };
    };
    syncedAt: string;
    error?: string;
  } | null>(null);
  const [payrollSyncHistory, setPayrollSyncHistory] = useState<Array<{
    employeeId: string;
    payrollPeriod: string;
    deductionAmount: number;
    totalDays: number;
    syncedAt: string;
  }>>([]);
  const [payrollSyncLoading, setPayrollSyncLoading] = useState(false);

  // Finalization Modal state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeRequest, setFinalizeRequest] = useState<LeaveRequest | null>(null);
  const [finalizeDecision, setFinalizeDecision] = useState<'approve' | 'reject'>('approve');
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [finalizeOptions, setFinalizeOptions] = useState({
    syncPayroll: true,
    baseSalary: 5000,
    workDaysInMonth: 22,
    rejectReason: '',
    isOverride: false,
    overrideReason: '',
  });
  const [finalizeResult, setFinalizeResult] = useState<{
    ok: boolean;
    message: string;
    payrollImpact?: {
      isUnpaidLeave: boolean;
      deductionAmount: number;
      dailyRate: number;
      daysDeducted: number;
      formula: string;
    };
    balanceUpdate?: {
      leaveTypeName: string;
      previousBalance: number;
      newBalance: number;
      daysDeducted: number;
    };
  } | null>(null);

  const fetchLeaveTypes = async () => {
    try {
      const response = await leavesService.getLeaveTypes();
      console.log('Leave types response:', response);
      if (Array.isArray(response.data)) {
        setLeaveTypes(response.data);
        console.log('Leave types set:', response.data);
      }
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeProfileService.getAllEmployees(1, 100) as any;

      let employeesList: any[] = [];
      if (Array.isArray(response)) {
        employeesList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        employeesList = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        employeesList = response.data.data;
      } else if (response?.data?.employees && Array.isArray(response.data.employees)) {
        employeesList = response.data.employees;
      }

      setEmployees(employeesList);
      console.log('Employees fetched:', employeesList.length);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const getEmployeeDisplayName = (emp: any): string => {
    if (!emp) return 'Unknown Employee';
    if (typeof emp === 'string') return `Employee ${emp.slice(-6)}`;
    return `${emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee'}${emp.employeeNumber ? ` (${emp.employeeNumber})` : ''}`;
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.getAllRequests({
        page: currentPage,
        limit: 20,
        status: filterStatus === 'all' ? undefined : filterStatus,
      });

      if (response.data) {
        const data = response.data as { data?: LeaveRequest[]; meta?: { total: number; page: number; pages: number } };
        setRequests(Array.isArray(data.data) ? data.data : []);
        if (data.meta) {
          setTotalPages(data.meta.pages || 1);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave requests';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus]);

  // Enrich requests with leave type names when leaveTypes are loaded
  useEffect(() => {
    if (requests.length > 0 && leaveTypes.length > 0) {
      // Check if any request needs enrichment
      const needsEnrichment = requests.some((req) =>
        !req.leaveTypeName && req.leaveTypeId
      );

      if (needsEnrichment) {
        const enrichedRequests = requests.map((req) => {
          if (!req.leaveTypeName && req.leaveTypeId) {
            const leaveType = leaveTypes.find((lt) =>
              (lt._id && lt._id === req.leaveTypeId) || (lt.id && lt.id === req.leaveTypeId)
            );
            if (leaveType) {
              return { ...req, leaveTypeName: leaveType.name };
            }
          }
          return req;
        });

        setRequests(enrichedRequests);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveTypes]); // Only depend on leaveTypes, not requests

  useEffect(() => {
    if (!user) return;
    fetchLeaveTypes();
    fetchEmployees(); // Fetch employees on mount
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [user, activeTab, fetchRequests]);

  const fetchEmployeeBalances = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const response = await leavesService.getBalance(employeeId);
      if (Array.isArray(response.data)) {
        // Enrich with leave type names
        const enriched = response.data.map((bal: LeaveBalanceSummary & { yearlyEntitlement?: number }) => {
          const leaveType = leaveTypes.find((lt) =>
            (lt._id && lt._id === bal.leaveTypeId) || (lt.id && lt.id === bal.leaveTypeId)
          );
          return {
            ...bal,
            leaveTypeName: leaveType?.name || bal.leaveTypeName || '',
            leaveTypeCode: leaveType?.code || bal.leaveTypeCode || '',
            entitled: bal.yearlyEntitlement ?? bal.entitled ?? 0,
          };
        });
        setEmployeeBalances(enriched);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employee balances';
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  // Open finalization modal
  const openFinalizeModal = (request: LeaveRequest, decision: 'approve' | 'reject') => {
    // Enrich request with leave type name if missing
    const enrichedRequest = { ...request };

    if (!enrichedRequest.leaveTypeName && enrichedRequest.leaveTypeId) {
      // Find in cached leave types
      const leaveType = leaveTypes.find((lt) =>
        (lt._id && lt._id === enrichedRequest.leaveTypeId) || (lt.id && lt.id === enrichedRequest.leaveTypeId)
      );

      if (leaveType) {
        enrichedRequest.leaveTypeName = leaveType.name;
      }
    }

    setFinalizeRequest(enrichedRequest);
    setFinalizeDecision(decision);
    setFinalizeResult(null);
    setFinalizeOptions({
      syncPayroll: true,
      baseSalary: 5000,
      workDaysInMonth: 22,
      rejectReason: '',
      isOverride: false,
      overrideReason: '',
    });
    setShowFinalizeModal(true);
  };

  // Handle HR Finalization with payroll sync
  const handleHRFinalizeWithSync = async () => {
    if (!user || !finalizeRequest) return;

    if (finalizeDecision === 'reject' && !finalizeOptions.rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setFinalizeLoading(true);
      setError(null);

      // Validate request has required data
      const requestId = finalizeRequest._id || finalizeRequest.id;
      if (!requestId) {
        setError('Invalid request ID');
        setFinalizeLoading(false);
        return;
      }

      console.log('[HR Finalize] Request ID:', requestId, 'User ID:', user.id, 'Decision:', finalizeDecision);

      // Use the simple hrFinalize API with allowNegative=true to bypass balance checks
      const overrideReason = finalizeOptions.isOverride ? finalizeOptions.overrideReason : undefined;
      const rejectReason = finalizeDecision === 'reject' ? finalizeOptions.rejectReason : undefined;
      const reason = overrideReason || rejectReason;

      const response = await leavesService.hrFinalize(
        requestId,
        user.id,
        finalizeDecision,
        true, // allowNegative
        reason,
        finalizeOptions.isOverride // isOverride flag
      );

      console.log('[HR Finalize] Response:', response);

      if (response.error) {
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'Failed to finalize request';
        console.error('[HR Finalize] Error:', errorMessage);
        setError(errorMessage);
        setFinalizeLoading(false);
        return;
      }

      if (!response.data) {
        console.error('[HR Finalize] No response data');
        setError('No response data from server');
        setFinalizeLoading(false);
        return;
      }

      // Calculate payroll impact for display
      const durationDays = finalizeRequest.durationDays || 0;
      const leaveTypeName = finalizeRequest.leaveTypeName || 'Leave';
      const isUnpaidLeave = leaveTypeName.toLowerCase().includes('unpaid');

      // Check if this was a finalization of an already-approved request
      const wasAlreadyApproved = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';

      let payrollImpact = null;
      if (finalizeDecision === 'approve' && isUnpaidLeave && finalizeOptions.syncPayroll && durationDays > 0) {
        const dailyRate = finalizeOptions.baseSalary / finalizeOptions.workDaysInMonth;
        const deductionAmount = dailyRate * durationDays;
        payrollImpact = {
          deductionAmount: Math.round(deductionAmount * 100) / 100,
          dailyRate: Math.round(dailyRate * 100) / 100,
          daysDeducted: durationDays,
        };
      }

      const actionMessage = wasAlreadyApproved
        ? (finalizeDecision === 'approve'
          ? `Leave request finalized successfully! Employee records updated and payroll adjusted. ${durationDays} day(s) of ${leaveTypeName} processed.`
          : 'Leave request rejected and entitlement reversed.')
        : (finalizeDecision === 'approve'
          ? `Leave request approved successfully! ${durationDays} day(s) of ${leaveTypeName} deducted from balance.`
          : 'Leave request rejected.');

      setFinalizeResult({
        ok: true,
        message: actionMessage,
        payrollImpact: payrollImpact ? {
          isUnpaidLeave: true,
          ...payrollImpact,
          formula: `(${finalizeOptions.baseSalary} / ${finalizeOptions.workDaysInMonth}) × ${durationDays}`,
        } : undefined,
        balanceUpdate: finalizeDecision === 'approve' ? {
          leaveTypeName,
          previousBalance: 0,
          newBalance: 0,
          daysDeducted: durationDays,
        } : undefined,
      });

      setSuccessMessage(
        wasAlreadyApproved && finalizeDecision === 'approve'
          ? 'Leave request finalized successfully! Employee records and payroll have been updated.'
          : finalizeDecision === 'approve'
            ? 'Leave request approved successfully!'
            : 'Leave request rejected.'
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // Close modal after success
      setTimeout(() => {
        setShowFinalizeModal(false);
        setFinalizeRequest(null);
        setFinalizeResult(null);
      }, 2000);

      await fetchRequests();
    } catch (err) {
      console.error('[HR Finalize] Caught error:', err);
      const message = err instanceof Error ? err.message : 'Failed to finalize request';
      setError(message);
      setFinalizeLoading(false);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleHRFinalize = (id: string, decision: 'approve' | 'reject') => {
    if (!user) return;

    // Find the request and open modal - check both _id and id
    const request = requests.find(r => r._id === id || r.id === id);
    console.log('handleHRFinalize called with id:', id, 'found request:', request);

    if (request) {
      openFinalizeModal(request, decision);
    } else {
      console.error('Request not found for id:', id);
      setError('Request not found');
    }
  };

  // Bulk processing handler (REQ-027)
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (!user || selectedRequests.size === 0) return;

    if (!confirm(`Are you sure you want to ${action} ${selectedRequests.size} leave request(s)?`)) {
      return;
    }

    try {
      setBulkProcessing(true);
      setError(null);

      const requestIds = Array.from(selectedRequests);
      const response = await leavesService.bulkProcessRequests(requestIds, action, user.id);

      if (response.error) {
        setError(response.error.message || `Failed to ${action} requests`);
      } else {
        setSuccessMessage(`Successfully ${action}d ${response.data?.processed || requestIds.length} request(s)`);
        setTimeout(() => setSuccessMessage(null), 5000);
        setSelectedRequests(new Set());
        await fetchRequests();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} requests`;
      setError(message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Open medical document view/verification modal (REQ-028)
  const handleOpenMedicalViewModal = async (request: LeaveRequest, mode: 'view' | 'verify' = 'view') => {
    if (!request.attachmentId) {
      setError('No attachment found for this request');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch attachment details
      const attachmentResponse = await leavesService.getAttachment(request.attachmentId);

      if (attachmentResponse.error) {
        setError(attachmentResponse.error || 'Failed to load attachment');
        return;
      }

      const attachmentData = attachmentResponse.data || null;

      // Backend provided a static URL - merge it into attachment data
      const staticUrl = (attachmentData as Record<string, unknown>).staticUrl as string | undefined;
      if (staticUrl && attachmentData) {
        // Robust replacement of the origin part
        attachmentData.filePath = staticUrl.replace(/^http?:\/\/[^/]+/, '');
      }

      setMedicalAttachmentData(attachmentData);
      setSelectedMedicalAttachment({
        attachmentId: request.attachmentId,
        requestId: request._id || '',
        employeeName: request.employeeName,
        leaveTypeName: request.leaveTypeName,
        dates: {
          from: typeof request.dates?.from === 'string' ? request.dates.from : (request.dates?.from instanceof Date ? request.dates.from.toISOString() : ''),
          to: typeof request.dates?.to === 'string' ? request.dates.to : (request.dates?.to instanceof Date ? request.dates.to.toISOString() : ''),
        },
      });
      setMedicalModalMode(mode);
      setShowMedicalVerificationModal(true);

      // Log for debugging
      if (attachmentData?.filePath) {
        console.log('[Medical Document] File path:', attachmentData.filePath);
        if (typeof attachmentData === 'object' && 'staticUrl' in attachmentData) {
          console.log('[Medical Document] Static URL:', (attachmentData as Record<string, unknown>).staticUrl);
        }
      }
    } catch (err) {
      console.error('[Medical Document] Error loading attachment:', err);
      const message = err instanceof Error ? err.message : 'Failed to load attachment';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Medical document verification handler (REQ-028)
  const handleVerifyMedicalDocument = async () => {
    if (!selectedMedicalAttachment?.attachmentId || !user) {
      setError('No attachment ID or user provided');
      return;
    }

    try {
      setVerifyingMedical(true);
      setError(null);
      console.log('[Verify Medical] Verifying attachment:', selectedMedicalAttachment.attachmentId, 'for request:', selectedMedicalAttachment.requestId);

      const response = await leavesService.validateMedicalAttachment(selectedMedicalAttachment.attachmentId, user.id);

      if (response.error) {
        console.error('[Verify Medical] Error response:', response.error);
        setError(response.error || 'Failed to verify medical document');
      } else {
        console.log('[Verify Medical] Success:', response.data);
        setSuccessMessage('Medical document verified successfully and recorded in audit trail');
        setTimeout(() => setSuccessMessage(null), 5000);

        // Close modal and refresh requests
        setShowMedicalVerificationModal(false);
        setSelectedMedicalAttachment(null);
        setMedicalAttachmentData(null);
        await fetchRequests();
      }
    } catch (err) {
      console.error('[Verify Medical] Exception:', err);
      const message = err instanceof Error ? err.message : 'Failed to verify medical document';
      setError(message);
    } finally {
      setVerifyingMedical(false);
    }
  };

  const handleAssignEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.employeeId || !assignForm.leaveTypeId || assignForm.yearlyEntitlement <= 0) {
      setError('Please fill all fields with valid values');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await leavesService.assignEntitlement({
        employeeId: assignForm.employeeId,
        leaveTypeId: assignForm.leaveTypeId,
        yearlyEntitlement: assignForm.yearlyEntitlement,
      });
      setAssignForm({ employeeId: '', leaveTypeId: '', yearlyEntitlement: 0 });
      if (assignForm.employeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
      setSuccessMessage(`Entitlement assigned successfully! The employee has been notified.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign entitlement';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.employeeId || !adjustmentForm.leaveTypeId || adjustmentForm.days <= 0 || !adjustmentForm.reason) {
      setError('Please fill all fields with valid values');
      return;
    }

    try {
      setLoading(true);
      await leavesService.createAdjustment({
        employeeId: adjustmentForm.employeeId,
        leaveTypeId: adjustmentForm.leaveTypeId,
        adjustmentType: adjustmentForm.type,
        amount: adjustmentForm.days,
        reason: adjustmentForm.reason,
        hrUserId: user?.id || '',
      });
      setError(null);
      setAdjustmentForm({
        employeeId: '',
        leaveTypeId: '',
        type: 'add',
        days: 0,
        reason: '',
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      if (adjustmentForm.employeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
      setSuccessMessage('Balance adjustment created successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create adjustment';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Run accrual for all employees
  const handleRunAccrual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('This will run accrual calculation for all employees. Continue?')) return;

    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.runAccrual({
        referenceDate: accrualForm.referenceDate,
        method: accrualForm.method,
        roundingRule: accrualForm.roundingRule,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      const result = response.data as AccrualResult;
      setLastAccrualResult(result);

      if (result.ok) {
        const created = result.created || 0;
        const processed = result.processed || 0;
        setSuccessMessage(
          `Accrual completed! Created ${created} new entitlements, processed ${processed} accruals.`
        );
      } else {
        setError(result.message || 'Accrual failed');
      }
      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run accrual';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Build leave type rules from form
  const buildLeaveTypeRules = () => {
    if (carryForwardForm.useDefaultRules) return undefined;

    return {
      annual: {
        cap: carryForwardForm.annualCap,
        expiryMonths: carryForwardForm.annualExpiryMonths,
        canCarryForward: carryForwardForm.annualCap > 0
      },
      sick: {
        cap: 0,
        expiryMonths: 0,
        canCarryForward: carryForwardForm.sickCanCarry
      },
      personal: {
        cap: carryForwardForm.personalCap,
        expiryMonths: carryForwardForm.personalExpiryMonths,
        canCarryForward: carryForwardForm.personalCap > 0
      },
    };
  };

  // Preview carry-forward changes
  const handlePreviewCarryForward = async () => {
    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.previewCarryForward({
        referenceDate: carryForwardForm.referenceDate,
        leaveTypeRules: buildLeaveTypeRules(),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setCarryForwardPreview(response.data);
      setShowPreviewModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to preview carry-forward';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Run carry forward for all employees
  const handleCarryForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('This will process year-end carry-forward for all employees. This action cannot be undone. Continue?')) return;

    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.carryForward({
        referenceDate: carryForwardForm.referenceDate,
        leaveTypeRules: buildLeaveTypeRules(),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      interface CarryForwardResult {
        ok?: boolean;
        processed?: number;
        totalCarriedForward?: number;
        totalExpired?: number;
      }

      const result = response.data as CarryForwardResult;
      if (result.ok) {
        setSuccessMessage(
          `Year-end carry-forward completed! ${result.processed} entitlements processed. ` +
          `${result.totalCarriedForward} days carried forward, ${result.totalExpired} days expired.`
        );
      }
      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run carry-forward';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Fetch carry-forward report
  const handleFetchReport = async () => {
    try {
      setAccrualRunning(true);
      setError(null);
      const response = await leavesService.getCarryForwardReport();

      if (response.error) {
        setError(response.error);
        return;
      }

      setCarryForwardReport(response.data);
      setShowReportModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch report';
      setError(message);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Override carry-forward for specific employee
  const handleOverrideCarryForward = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Override form submitted:', overrideForm);

    if (!overrideForm.employeeId || !overrideForm.leaveTypeId || !overrideForm.reason) {
      setError('Please fill all required fields (Employee ID, Leave Type, and Reason are required)');
      return;
    }

    try {
      setAccrualRunning(true);
      setError(null);

      console.log('Calling overrideCarryForward API with:', {
        employeeId: overrideForm.employeeId,
        leaveTypeId: overrideForm.leaveTypeId,
        carryForwardDays: overrideForm.carryForwardDays,
        expiryDate: overrideForm.expiryDate || undefined,
        reason: overrideForm.reason,
      });

      const response = await leavesService.overrideCarryForward({
        employeeId: overrideForm.employeeId,
        leaveTypeId: overrideForm.leaveTypeId,
        carryForwardDays: overrideForm.carryForwardDays,
        expiryDate: overrideForm.expiryDate || undefined,
        reason: overrideForm.reason,
      });

      console.log('Override response:', response);

      if (response.error) {
        setError(`Override failed: ${response.error}`);
        return;
      }

      interface OverrideResult {
        ok?: boolean;
        previousCarryForward?: number;
        newCarryForward?: number;
        newRemaining?: number;
      }

      if (response.data && (response.data as unknown as OverrideResult).ok) {
        const result = response.data as unknown as OverrideResult;
        setSuccessMessage(
          `Carry-forward override applied! Changed from ${result.previousCarryForward} to ${result.newCarryForward} days. ` +
          `New remaining balance: ${result.newRemaining} days.`
        );
        setTimeout(() => setSuccessMessage(null), 8000);
        setShowOverrideModal(false);
        setOverrideForm({
          employeeId: '',
          leaveTypeId: '',
          carryForwardDays: 0,
          expiryDate: '',
          reason: '',
        });
      } else {
        setError('Override failed: Unexpected response from server');
      }
    } catch (err) {
      console.error('Override error:', err);
      const message = err instanceof Error ? err.message : 'Failed to override carry-forward';
      setError(`Override failed: ${message}`);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Recalculate single employee's balances
  const handleRecalcEmployee = async () => {
    if (!recalcEmployeeId.trim()) {
      setError('Please enter an employee ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await leavesService.recalcEmployee(recalcEmployeeId);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage(`Employee ${recalcEmployeeId} balances recalculated successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      setRecalcEmployeeId('');

      // If we were viewing this employee's balances, refresh them
      if (recalcEmployeeId === selectedEmployeeId) {
        await fetchEmployeeBalances(selectedEmployeeId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate employee balances';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Initialize default entitlements for an employee (for personal leave fix)
  const handleInitializeEntitlements = async (employeeId: string) => {
    if (!employeeId.trim()) {
      setError('Please enter an employee ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Calling getBalance will trigger the backend to auto-create entitlements if they don't exist
      const response = await leavesService.getBalance(employeeId);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccessMessage(`Entitlements initialized for employee ${employeeId}!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh the displayed balances
      if (employeeId === selectedEmployeeId) {
        setEmployeeBalances(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize entitlements';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate working days between two dates (excluding weekends)
  const countWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Preview suspension adjustment calculation
  const handlePreviewSuspension = () => {
    if (!suspensionForm.fromDate || !suspensionForm.toDate) {
      setError('Please select both from and to dates');
      return;
    }

    const fromDate = new Date(suspensionForm.fromDate);
    const toDate = new Date(suspensionForm.toDate);

    if (fromDate > toDate) {
      setError('From date cannot be after to date');
      return;
    }

    const totalDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const workingDays = countWorkingDays(fromDate, toDate);

    // Calculate the month's working days for proration
    const monthStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const monthEnd = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);
    const monthWorkingDays = countWorkingDays(monthStart, monthEnd);

    // Calculate prorate ratio (days worked / total working days in month)
    const prorateRatio = Math.max(0, (monthWorkingDays - workingDays) / monthWorkingDays);

    // Assume 21 days annual entitlement, monthly accrual = 21/12 = 1.75
    const monthlyAccrual = 21 / 12;
    const adjustedAccrual = monthlyAccrual * prorateRatio;
    const adjustmentDays = monthlyAccrual - adjustedAccrual;

    setSuspensionPreview({
      workingDays,
      totalDays,
      prorateRatio,
      adjustedAccrual: Math.round(adjustedAccrual * 100) / 100,
      originalAccrual: Math.round(monthlyAccrual * 100) / 100,
    });

    // Auto-set the adjustment days
    setSuspensionForm(prev => ({
      ...prev,
      adjustmentDays: Math.round(adjustmentDays * 100) / 100,
    }));
  };

  // Apply suspension adjustment using the existing createAdjustment endpoint
  const handleApplySuspension = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!suspensionForm.employeeId || !suspensionForm.leaveTypeId || !suspensionForm.reason) {
      setError('Please fill all required fields');
      return;
    }

    if (suspensionForm.adjustmentDays <= 0) {
      setError('Adjustment days must be greater than 0');
      return;
    }

    try {
      setAccrualRunning(true);
      setError(null);

      // Use the existing createAdjustment API to deduct the accrual
      const response = await leavesService.createAdjustment({
        employeeId: suspensionForm.employeeId,
        leaveTypeId: suspensionForm.leaveTypeId,
        adjustmentType: 'deduct',
        amount: suspensionForm.adjustmentDays,
        reason: `Accrual suspension (${suspensionForm.suspensionType === 'unpaid' ? 'Unpaid Leave' : 'Long Absence'}): ${suspensionForm.reason} | Period: ${suspensionForm.fromDate} to ${suspensionForm.toDate}`,
        hrUserId: user?.id || '',
      });

      if (response.error) {
        setError(`Failed to apply suspension: ${response.error}`);
        return;
      }

      // Store the suspension record locally
      const newSuspension = {
        employeeId: suspensionForm.employeeId,
        leaveTypeId: suspensionForm.leaveTypeId,
        leaveTypeName: leaveTypes.find(lt => (lt._id || lt.id) === suspensionForm.leaveTypeId)?.name || '',
        suspensionType: suspensionForm.suspensionType,
        fromDate: suspensionForm.fromDate,
        toDate: suspensionForm.toDate,
        adjustmentDays: suspensionForm.adjustmentDays,
        reason: suspensionForm.reason,
        appliedAt: new Date().toISOString(),
      };

      setEmployeeSuspensions(prev => [newSuspension, ...prev]);

      setSuccessMessage(
        `Accrual suspension applied! Deducted ${suspensionForm.adjustmentDays} days from employee's balance ` +
        `for ${suspensionForm.suspensionType === 'unpaid' ? 'unpaid leave' : 'long absence'} ` +
        `from ${suspensionForm.fromDate} to ${suspensionForm.toDate}.`
      );
      setTimeout(() => setSuccessMessage(null), 8000);

      // Reset form
      setShowSuspensionModal(false);
      setSuspensionForm({
        employeeId: '',
        leaveTypeId: '',
        suspensionType: 'unpaid',
        fromDate: '',
        toDate: '',
        adjustmentDays: 0,
        reason: '',
      });
      setSuspensionPreview(null);

    } catch (err) {
      console.error('Suspension error:', err);
      const message = err instanceof Error ? err.message : 'Failed to apply suspension';
      setError(`Suspension failed: ${message}`);
    } finally {
      setAccrualRunning(false);
    }
  };

  // Check employee's unpaid leaves and long absences
  const checkEmployeeAbsences = async (employeeId: string) => {
    if (!employeeId) return;

    try {
      setLoading(true);
      const response = await leavesService.getMyRequests(employeeId, {
        status: 'APPROVED',
      });

      if (response.error || !Array.isArray(response.data)) {
        return;
      }

      // Filter for unpaid leaves and long absences (> 30 days)
      interface AbsenceRecord {
        leaveTypeName?: string;
        durationDays?: number;
        dates?: { from?: string | Date; to?: string | Date };
      }

      const absences = (response.data as AbsenceRecord[]).filter((leave: AbsenceRecord) => {
        const leaveTypeName = (leave.leaveTypeName || '').toLowerCase();
        const isUnpaid = leaveTypeName.includes('unpaid');
        const totalDays = leave.durationDays || 0;
        const isLongAbsence = totalDays >= 30;
        return isUnpaid || isLongAbsence;
      });

      if (absences.length > 0) {
        // Auto-populate the first absence found
        const firstAbsence = absences[0];
        setSuspensionForm(prev => ({
          ...prev,
          employeeId,
          fromDate: firstAbsence.dates?.from ? new Date(firstAbsence.dates.from).toISOString().split('T')[0] : '',
          toDate: firstAbsence.dates?.to ? new Date(firstAbsence.dates.to).toISOString().split('T')[0] : '',
          suspensionType: (firstAbsence.leaveTypeName || '').toLowerCase().includes('unpaid') ? 'unpaid' : 'long_absence',
        }));
      }
    } catch (err) {
      console.error('Failed to check absences:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PAYROLL SYNC HANDLERS
  // ============================================

  // Generate payroll sync for a single employee
  const handleGeneratePayrollSync = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payrollSyncForm.employeeId) {
      setError('Please enter an employee ID');
      return;
    }

    if (payrollSyncForm.baseSalary <= 0) {
      setError('Please enter a valid base salary');
      return;
    }

    try {
      setPayrollSyncLoading(true);
      setError(null);

      const result = await leavesService.generatePayrollSyncData(
        payrollSyncForm.employeeId,
        {
          year: payrollSyncForm.year,
          month: payrollSyncForm.month,
          baseSalary: payrollSyncForm.baseSalary,
          workDaysInMonth: payrollSyncForm.workDaysInMonth,
        }
      );

      setPayrollSyncResult(result);

      if (result.ok) {
        // Add to history
        setPayrollSyncHistory(prev => [{
          employeeId: result.employeeId,
          payrollPeriod: result.payrollPeriod,
          deductionAmount: result.unpaidLeaveDeduction.deductionAmount,
          totalDays: result.unpaidLeaveDeduction.totalDays,
          syncedAt: result.syncedAt,
        }, ...prev.slice(0, 9)]); // Keep last 10

        if (result.unpaidLeaveDeduction.totalDays > 0) {
          setSuccessMessage(
            `Payroll sync complete! Found ${result.unpaidLeaveDeduction.totalDays} unpaid leave days. ` +
            `Deduction amount: $${result.unpaidLeaveDeduction.deductionAmount.toFixed(2)}`
          );
        } else {
          setSuccessMessage('Payroll sync complete! No unpaid leave deductions found for this period.');
        }
        setTimeout(() => setSuccessMessage(null), 8000);
      } else {
        setError(`Payroll sync failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Payroll sync error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate payroll sync';
      setError(`Payroll sync failed: ${message}`);
    } finally {
      setPayrollSyncLoading(false);
    }
  };

  // Quick calculate deduction without full sync
  const handleQuickCalculateDeduction = () => {
    if (payrollSyncForm.baseSalary <= 0 || payrollSyncForm.workDaysInMonth <= 0) {
      setError('Please enter valid salary and work days');
      return;
    }

    // This is a preview calculation - actual days would come from employee's leave data
    const previewDays = 1; // Default to 1 day for preview
    const result = leavesService.calculateUnpaidDeduction(
      payrollSyncForm.baseSalary,
      payrollSyncForm.workDaysInMonth,
      previewDays
    );

    setSuccessMessage(
      `Daily rate: $${result.dailyRate.toFixed(2)} | ` +
      `1 day deduction: $${result.deductionAmount.toFixed(2)} | ` +
      `Formula: ${result.formula}`
    );
    setTimeout(() => setSuccessMessage(null), 10000);
  };


  const getStatusConfig = (status: string) => {
    const upperStatus = (status || '').toUpperCase();
    switch (upperStatus) {
      case 'PENDING':
        return { bg: 'bg-warning/10 dark:bg-warning/20', text: 'text-warning dark:text-warning', label: 'Pending' };
      case 'APPROVED':
        return { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success dark:text-success', label: 'Approved' };
      case 'REJECTED':
        return { bg: 'bg-destructive/10 dark:bg-destructive/20', text: 'text-destructive dark:text-destructive', label: 'Rejected' };
      case 'CANCELLED':
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Cancelled' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    }
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Manage leave requests, entitlements, and balances</p>
        </div>

        {error && (
          <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-success/10 dark:bg-success/20 border border-success/20 text-success px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {(['requests', 'entitlements', 'adjustments', 'accruals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
              >
                {tab === 'requests' ? 'Leave Requests' :
                  tab === 'entitlements' ? 'Assign Entitlements' :
                    tab === 'adjustments' ? 'Balance Adjustments' :
                      'Auto Accruals'}
              </button>
            ))}
          </nav>
        </div>

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filterStatus === status
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                  >
                    {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedRequests.size > 0 && (
              <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {selectedRequests.size} request{selectedRequests.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    disabled={bulkProcessing}
                    className="px-4 py-2 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-lg disabled:opacity-50"
                  >
                    {bulkProcessing ? 'Processing...' : `Approve ${selectedRequests.size}`}
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    disabled={bulkProcessing}
                    className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-50"
                  >
                    {bulkProcessing ? 'Processing...' : `Reject ${selectedRequests.size}`}
                  </button>
                  <button
                    onClick={() => setSelectedRequests(new Set())}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Requests List */}
            {loading ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                <p className="text-muted-foreground">No leave requests found</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {requests.map((request) => {
                    const statusConfig = getStatusConfig(request.status);

                    return (
                      <div key={request._id} className="p-4 sm:p-5 hover:bg-accent/30 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Bulk Selection Checkbox */}
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedRequests.has(request._id || request.id || '')}
                              onChange={(e) => {
                                const newSelected = new Set(selectedRequests);
                                const requestId = request._id || request.id || '';
                                if (e.target.checked) {
                                  newSelected.add(requestId);
                                } else {
                                  newSelected.delete(requestId);
                                }
                                setSelectedRequests(newSelected);
                              }}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-medium text-foreground">
                                {request.employeeName || 'Employee'} - {request.leaveTypeName || 'Leave'}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDate(request.dates?.from)} - {formatDate(request.dates?.to)}</span>
                              <span>{request.durationDays} day{request.durationDays !== 1 ? 's' : ''}</span>
                            </div>
                            {request.justification && (
                              <p className="text-sm text-foreground/80 mt-2">{request.justification}</p>
                            )}
                            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                              {request.approvalFlow?.map((flow, idx) => (
                                <span key={idx}>
                                  {flow.role}: {flow.status}
                                </span>
                              ))}
                            </div>
                            {/* Medical Document Verification (REQ-028) */}
                            {/* Show button for any leave request with an attachment - not just "sick" leave */}
                            {request.attachmentId && (() => {
                              // Check if THIS specific request's attachment has been verified
                              // Each request has its own approvalFlow array, so we check only THIS request's flow
                              const currentAttachmentId = request.attachmentId.toString();

                              // Find verification entries in THIS request's approvalFlow
                              const verificationEntries = (request.approvalFlow || []).filter(
                                (flow): flow is typeof flow & { action: string } => 'action' in flow && flow.action === 'medical_document_verified'
                              );

                              // Check if any verification matches THIS attachmentId
                              const isVerified = verificationEntries.some((flow) => {
                                // If attachmentId is stored in the verification, it must match exactly
                                const attachmentId = (flow as Record<string, unknown>).attachmentId;
                                if (attachmentId) {
                                  const flowAttachmentId = attachmentId.toString();
                                  return flowAttachmentId === currentAttachmentId ||
                                    flowAttachmentId === request.attachmentId?.toString();
                                }

                                // If no attachmentId stored (legacy data), we can't be sure it's for THIS attachment
                                // So we return false to be safe - user will need to re-verify
                                return false;
                              });

                              return (
                                <div className="mt-2 flex gap-2 flex-wrap">
                                  {/* View Document Button - Always available */}
                                  <button
                                    onClick={() => handleOpenMedicalViewModal(request, 'view')}
                                    disabled={loading}
                                    className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="View medical document"
                                  >
                                    👁️ View Document
                                  </button>

                                  {/* Verify Button - Only show if not verified */}
                                  {isVerified ? (
                                    <div className="px-3 py-1.5 text-sm font-medium text-success bg-success/10 dark:bg-success/20 rounded-lg border border-success/20 inline-flex items-center gap-1">
                                      <span>✓</span>
                                      <span>Verified</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenMedicalViewModal(request, 'verify')}
                                      disabled={loading}
                                      className="px-3 py-1.5 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-lg border border-success/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      title="Verify medical document"
                                    >
                                      ✓ Verify Document
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-2 sm:ml-auto">
                            {(request.status === 'PENDING' || request.status === 'pending') && (
                              <>
                                {/* HR Final approval buttons */}
                                <button
                                  onClick={() => handleHRFinalize(request._id || request.id || '', 'approve')}
                                  className="px-3 py-1.5 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-lg transition-colors"
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  onClick={() => handleHRFinalize(request._id || request.id || '', 'reject')}
                                  className="px-3 py-1.5 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors"
                                >
                                  ✗ Reject
                                </button>
                              </>
                            )}
                            {(request.status === 'APPROVED' || request.status === 'approved') && (() => {
                              // Check if HR has already finalized this request
                              const hrApproval = request.approvalFlow?.find((f) => f.role === 'hr');
                              const isFinalized = hrApproval?.status === 'approved';

                              return isFinalized ? (
                                <span className="px-3 py-1.5 text-sm font-medium text-success">
                                  ✓ Finalized
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleHRFinalize(request._id || request.id || '', 'approve')}
                                  className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                                  title="Finalize this approved request to update employee records and adjust payroll"
                                >
                                  ✓ Finalize
                                </button>
                              );
                            })()}
                            {(request.status === 'REJECTED' || request.status === 'rejected') && (() => {
                              // Check if HR has already finalized this rejection
                              const hrApproval = request.approvalFlow?.find((f) => f.role === 'hr');
                              const isFinalized = hrApproval?.status === 'rejected';

                              return isFinalized ? (
                                <span className="px-3 py-1.5 text-sm font-medium text-destructive">
                                  ✗ Rejected
                                </span>
                              ) : (
                                // Allow HR to override rejection by approving
                                <button
                                  onClick={() => handleHRFinalize(request._id || request.id || '', 'approve')}
                                  className="px-3 py-1.5 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-lg transition-colors"
                                  title="Override manager's rejection and approve this request"
                                >
                                  ✓ Override & Approve
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Entitlements Tab */}
        {activeTab === 'entitlements' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign Entitlement Form */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Assign Leave Entitlement</h2>
                <form onSubmit={handleAssignEntitlement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Employee</label>
                    <select
                      value={assignForm.employeeId}
                      onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      required
                      disabled={loadingEmployees}
                    >
                      <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                      {employees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {getEmployeeDisplayName(emp)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Leave Type</label>
                    <select
                      value={assignForm.leaveTypeId}
                      onChange={(e) => setAssignForm({ ...assignForm, leaveTypeId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      required
                    >
                      <option value="">Select leave type</option>
                      {leaveTypes.map((type) => (
                        <option key={type._id || type.id} value={type._id || type.id}>
                          {type.name} ({type.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Yearly Entitlement (Days)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={assignForm.yearlyEntitlement}
                      onChange={(e) => setAssignForm({ ...assignForm, yearlyEntitlement: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      placeholder="e.g., 20"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Assigning...' : 'Assign Entitlement'}
                  </button>
                </form>
              </div>

              {/* View Employee Balances */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">View Employee Balances</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Employee</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                        disabled={loadingEmployees}
                      >
                        <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                        {employees.map((emp) => (
                          <option key={emp._id || emp.id} value={emp._id || emp.id}>
                            {getEmployeeDisplayName(emp)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => fetchEmployeeBalances(selectedEmployeeId)}
                        disabled={!selectedEmployeeId || loading}
                        className="px-4 py-2.5 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {employeeBalances.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">Leave Balances:</h3>
                      {employeeBalances.map((balance) => (
                        <div key={balance.leaveTypeId} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{balance.leaveTypeName}</span>
                            <span className={`text-sm font-medium ${balance.remaining < 0 ? 'text-destructive' : 'text-foreground'
                              }`}>
                              {balance.remaining} / {balance.entitled} days
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Used: {balance.taken} | Pending: {balance.pending}
                          </div>
                          {(balance.leaveTypeName?.toLowerCase().includes('unpaid') && balance.remaining < 0) && (
                            <div className="mt-2 text-xs text-destructive bg-destructive/10 dark:bg-destructive/20 p-2 rounded">
                              ⚠️ Negative balance detected for unpaid leave
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fix Unpaid Leave Balances Button */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <button
                      onClick={async () => {
                        if (!confirm('This will add 100 days to all unpaid leave balances and reset taken to 0. Continue?')) {
                          return;
                        }
                        try {
                          setLoading(true);
                          setError(null);
                          const response = await leavesService.fixUnpaidLeaveBalances(undefined, 100);
                          if (response.error) {
                            setError(response.error || 'Failed to fix unpaid leave balances');
                          } else {
                            setSuccessMessage(`Successfully fixed ${response.data?.fixed || 0} unpaid leave balance(s). Added 100 days to ${response.data?.updated || 0} entitlement(s).`);
                            setTimeout(() => setSuccessMessage(null), 5000);
                            // Refresh balances if viewing an employee
                            if (selectedEmployeeId) {
                              await fetchEmployeeBalances(selectedEmployeeId);
                            }
                          }
                        } catch (err) {
                          const message = err instanceof Error ? err.message : 'Failed to fix unpaid leave balances';
                          setError(message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2.5 bg-warning text-warning-foreground font-medium rounded-lg hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Fix Unpaid Leave Balances (+100 days)
                    </button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      This will add 100 days to all unpaid leave entitlements and reset taken balances to 0
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adjustments Tab */}
        {activeTab === 'adjustments' && (
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Manual Balance Adjustment</h2>
            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Employee</label>
                  <select
                    value={adjustmentForm.employeeId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, employeeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    required
                    disabled={loadingEmployees}
                  >
                    <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                    {employees.map((emp) => (
                      <option key={emp._id || emp.id} value={emp._id || emp.id}>
                        {getEmployeeDisplayName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Leave Type</label>
                  <select
                    value={adjustmentForm.leaveTypeId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, leaveTypeId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type._id || type.id} value={type._id || type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Adjustment Type</label>
                  <select
                    value={adjustmentForm.type}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as 'add' | 'deduct' })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="add">Add Days</option>
                    <option value="deduct">Deduct Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Days</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={adjustmentForm.days}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, days: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    placeholder="e.g., 2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Effective Date</label>
                  <input
                    type="date"
                    value={adjustmentForm.effectiveDate}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, effectiveDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reason</label>
                <textarea
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                  rows={3}
                  placeholder="Provide a reason for this adjustment"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Adjustment...' : 'Create Adjustment'}
              </button>
            </form>
          </div>
        )}

        {/* Accruals Tab */}
        {activeTab === 'accruals' && (
          <div className="space-y-6">
            {/* Accrual Info Card */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Automatic Leave Accrual</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Run accrual calculations to automatically add leave days to employee balances according to company policy.
                    This ensures entitlements stay accurate without manual calculation.
                  </p>
                  <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Monthly:</strong> Adds 1/12 of yearly entitlement each month</li>
                    <li>• <strong>Yearly:</strong> Adds full yearly entitlement at once</li>
                    <li>• <strong>Per-Term:</strong> Adds 1/3 of yearly entitlement (for academic/quarterly systems)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Run Accrual Form */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Run Leave Accrual</h2>
                <form onSubmit={handleRunAccrual} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Reference Date</label>
                    <input
                      type="date"
                      value={accrualForm.referenceDate}
                      onChange={(e) => setAccrualForm({ ...accrualForm, referenceDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Date to calculate accrual from</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Accrual Method</label>
                    <select
                      value={accrualForm.method}
                      onChange={(e) => setAccrualForm({ ...accrualForm, method: e.target.value as 'monthly' | 'yearly' | 'per-term' })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      <option value="monthly">Monthly (1/12 yearly)</option>
                      <option value="yearly">Yearly (full entitlement)</option>
                      <option value="per-term">Per-Term (1/3 yearly)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Rounding Rule</label>
                    <select
                      value={accrualForm.roundingRule}
                      onChange={(e) => setAccrualForm({ ...accrualForm, roundingRule: e.target.value as 'none' | 'round' | 'round_up' | 'round_down' })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    >
                      <option value="round">Round to nearest</option>
                      <option value="round_up">Round up</option>
                      <option value="round_down">Round down</option>
                      <option value="none">No rounding (keep decimals)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={accrualRunning}
                    className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {accrualRunning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Running Accrual...
                      </>
                    ) : (
                      'Run Accrual for All Employees'
                    )}
                  </button>
                </form>

                {lastAccrualResult && (
                  <div className={`mt-4 p-3 rounded-lg ${lastAccrualResult.ok ? 'bg-success/10 dark:bg-success/20 border border-success/20' : 'bg-destructive/10 dark:bg-destructive/20 border border-destructive/20'}`}>
                    <p className={`text-sm font-medium ${lastAccrualResult.ok ? 'text-success' : 'text-destructive'}`}>
                      Last Accrual Result:
                    </p>
                    {lastAccrualResult.ok ? (
                      <ul className="text-sm text-success mt-1 space-y-0.5">
                        {lastAccrualResult.created !== undefined && lastAccrualResult.created > 0 && (
                          <li>• Created: {lastAccrualResult.created} new entitlements</li>
                        )}
                        <li>• Processed: {lastAccrualResult.processed} accruals</li>
                        {lastAccrualResult.totalEntitlements !== undefined && (
                          <li>• Total entitlements: {lastAccrualResult.totalEntitlements}</li>
                        )}
                        <li>• Method: {lastAccrualResult.method}</li>
                        <li>• Date: {new Date(lastAccrualResult.referenceDate).toLocaleDateString()}</li>
                      </ul>
                    ) : (
                      <p className="text-sm text-destructive mt-1">{lastAccrualResult.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Carry Forward Form */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Year-End Carry Forward</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFetchReport}
                      disabled={accrualRunning}
                      className="px-3 py-1.5 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-accent disabled:opacity-50"
                    >
                      View Report
                    </button>
                    <button
                      onClick={() => { setError(null); setShowOverrideModal(true); }}
                      className="px-3 py-1.5 text-sm font-medium text-warning bg-warning/10 dark:bg-warning/20 rounded-lg hover:bg-warning/20"
                    >
                      Override
                    </button>
                  </div>
                </div>
                <form onSubmit={handleCarryForward} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Reference Date (Year End)</label>
                    <input
                      type="date"
                      value={carryForwardForm.referenceDate}
                      onChange={(e) => setCarryForwardForm({ ...carryForwardForm, referenceDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                  </div>

                  {/* Use Default Rules Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useDefaultRules"
                      checked={carryForwardForm.useDefaultRules}
                      onChange={(e) => setCarryForwardForm({ ...carryForwardForm, useDefaultRules: e.target.checked })}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    />
                    <label htmlFor="useDefaultRules" className="text-sm text-foreground">
                      Use default carry-forward rules
                    </label>
                  </div>

                  {/* Default Rules Info */}
                  {carryForwardForm.useDefaultRules && (
                    <div className="p-3 bg-accent/50 border border-border rounded-lg text-sm">
                      <p className="font-medium text-foreground mb-1">Default Rules:</p>
                      <ul className="text-muted-foreground space-y-0.5">
                        <li>• Annual Leave: Up to 10 days, expires after 6 months</li>
                        <li>• Sick Leave: Cannot be carried forward</li>
                        <li>• Personal/Paternity: Up to 5 days, expires after 3 months</li>
                      </ul>
                    </div>
                  )}

                  {/* Custom Rules */}
                  {!carryForwardForm.useDefaultRules && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground">Custom Rules:</p>

                      {/* Annual Leave */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Annual Leave Cap</label>
                          <input
                            type="number"
                            min="0"
                            value={carryForwardForm.annualCap}
                            onChange={(e) => setCarryForwardForm({ ...carryForwardForm, annualCap: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Expiry (months)</label>
                          <input
                            type="number"
                            min="1"
                            value={carryForwardForm.annualExpiryMonths}
                            onChange={(e) => setCarryForwardForm({ ...carryForwardForm, annualExpiryMonths: parseInt(e.target.value) || 6 })}
                            className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-primary"
                          />
                        </div>
                      </div>

                      {/* Sick Leave */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sickCanCarry"
                          checked={carryForwardForm.sickCanCarry}
                          onChange={(e) => setCarryForwardForm({ ...carryForwardForm, sickCanCarry: e.target.checked })}
                          className="w-4 h-4 text-primary border-border rounded"
                        />
                        <label htmlFor="sickCanCarry" className="text-xs text-muted-foreground">
                          Allow sick leave carry-forward
                        </label>
                      </div>

                      {/* Personal Leave */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Personal Leave Cap</label>
                          <input
                            type="number"
                            min="0"
                            value={carryForwardForm.personalCap}
                            onChange={(e) => setCarryForwardForm({ ...carryForwardForm, personalCap: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Expiry (months)</label>
                          <input
                            type="number"
                            min="1"
                            value={carryForwardForm.personalExpiryMonths}
                            onChange={(e) => setCarryForwardForm({ ...carryForwardForm, personalExpiryMonths: parseInt(e.target.value) || 3 })}
                            className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewCarryForward}
                      disabled={accrualRunning}
                      className="flex-1 px-4 py-2.5 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Preview Changes
                    </button>
                    <button
                      type="submit"
                      disabled={accrualRunning}
                      className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {accrualRunning ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Run Carry Forward'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Individual Employee Recalculation */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Individual Employee Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recalculate Employee */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Recalculate Employee Balances</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Recalculates taken/pending from actual leave requests to fix any discrepancies.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={recalcEmployeeId}
                      onChange={(e) => setRecalcEmployeeId(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      disabled={loadingEmployees}
                    >
                      <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                      {employees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {getEmployeeDisplayName(emp)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRecalcEmployee}
                      disabled={loading || !recalcEmployeeId.trim()}
                      className="px-4 py-2.5 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Recalculate
                    </button>
                  </div>
                </div>

                {/* Initialize Entitlements */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Initialize Default Entitlements</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Creates default entitlements (Annual: 21, Sick: 14, Personal: 5 days) for employees without any.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                      disabled={loadingEmployees}
                    >
                      <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                      {employees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {getEmployeeDisplayName(emp)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleInitializeEntitlements(selectedEmployeeId)}
                      disabled={loading || !selectedEmployeeId.trim()}
                      className="px-4 py-2.5 bg-success text-success-foreground font-medium rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Initialize
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Accrual Suspension for Unpaid Leave / Long Absence */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Accrual Suspension / Adjustment</h2>
                  <p className="text-sm text-muted-foreground mt-1">Adjust accruals for employees during unpaid leave or long absences</p>
                </div>
                <button
                  onClick={() => { setError(null); setShowSuspensionModal(true); }}
                  className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/90"
                >
                  Apply Suspension
                </button>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-r from-destructive/5 to-warning/5 rounded-lg border border-destructive/20 p-4 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-destructive">When to use Accrual Suspension:</p>
                    <ul className="mt-1 text-foreground space-y-0.5">
                      <li>• <strong>Unpaid Leave:</strong> When employee takes unpaid leave ≥ 5 consecutive working days</li>
                      <li>• <strong>Long Absence:</strong> Any absence ≥ 30 consecutive calendar days</li>
                      <li>• <strong>Prorated Calculation:</strong> System calculates adjustment based on working days missed</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Suspension Rules Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center">
                      <span className="text-destructive font-bold text-sm">5+</span>
                    </div>
                    <span className="font-medium text-foreground">Unpaid Leave</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Suspend accrual for unpaid leave of 5+ working days</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-warning/10 dark:bg-warning/20 rounded-full flex items-center justify-center">
                      <span className="text-warning font-bold text-sm">30+</span>
                    </div>
                    <span className="font-medium text-foreground">Long Absence</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Prorate accrual for absences of 30+ calendar days</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Prorated</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Monthly accrual × (Working days / Total month days)</p>
                </div>
              </div>

              {/* Recent Suspensions Applied */}
              {employeeSuspensions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Recent Suspensions Applied</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee ID</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Leave Type</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Deducted</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {employeeSuspensions.slice(0, 5).map((suspension, idx) => (
                          <tr key={idx} className="hover:bg-accent/30">
                            <td className="px-3 py-2 font-mono text-xs text-foreground">{suspension.employeeId.slice(-8)}</td>
                            <td className="px-3 py-2 text-foreground">{suspension.leaveTypeName}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${suspension.suspensionType === 'unpaid'
                                ? 'bg-destructive/10 dark:bg-destructive/20 text-destructive'
                                : 'bg-warning/10 dark:bg-warning/20 text-warning'
                                }`}>
                                {suspension.suspensionType === 'unpaid' ? 'Unpaid' : 'Long Absence'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-foreground">
                              {new Date(suspension.fromDate).toLocaleDateString()} - {new Date(suspension.toDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-right text-destructive font-medium">-{suspension.adjustmentDays} days</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {new Date(suspension.appliedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Payroll Sync - Real-time Salary Deductions */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Payroll Sync</h2>
                  <p className="text-sm text-muted-foreground mt-1">Real-time sync with payroll for salary deductions and adjustments</p>
                </div>
                <button
                  onClick={() => { setError(null); setShowPayrollSyncModal(true); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary"
                >
                  Sync Employee
                </button>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100 p-4 mb-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-primary">Automatic Payroll Integration:</p>
                    <ul className="mt-1 text-primary space-y-0.5">
                      <li>• <strong>Unpaid Leave Deductions:</strong> Calculate salary deductions for unpaid leave days</li>
                      <li>• <strong>Leave Encashment:</strong> Calculate payout for unused leave days</li>
                      <li>• <strong>Real-time Sync:</strong> Get latest leave data for payroll processing</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Deduction Calc</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Daily Rate = Monthly Salary ÷ Work Days</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Auto-Detect</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Finds approved unpaid leaves in period</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-foreground">Balance Summary</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Includes current leave balances</p>
                </div>
              </div>

              {/* Recent Sync History */}
              {payrollSyncHistory.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Recent Payroll Syncs</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Employee ID</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Unpaid Days</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Deduction</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Synced At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payrollSyncHistory.slice(0, 5).map((sync, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs">{sync.employeeId.slice(-8)}</td>
                            <td className="px-3 py-2">{sync.payrollPeriod}</td>
                            <td className="px-3 py-2 text-right">{sync.totalDays}</td>
                            <td className="px-3 py-2 text-right text-destructive font-medium">
                              {sync.deductionAmount > 0 ? `-$${sync.deductionAmount.toFixed(2)}` : '$0.00'}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {new Date(sync.syncedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Last Sync Result */}
              {payrollSyncResult && (
                <div className={`mt-4 p-4 rounded-lg ${payrollSyncResult.ok ? 'bg-accent/10 border border-accent/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                  <h3 className={`text-sm font-medium ${payrollSyncResult.ok ? 'text-accent-foreground' : 'text-destructive'} mb-2`}>
                    Last Sync Result - {payrollSyncResult.payrollPeriod}
                  </h3>
                  {payrollSyncResult.ok ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Unpaid Days:</span>
                        <span className="ml-2 font-medium">{payrollSyncResult.unpaidLeaveDeduction.totalDays}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Deduction:</span>
                        <span className="ml-2 font-medium text-destructive">${payrollSyncResult.unpaidLeaveDeduction.deductionAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Annual Balance:</span>
                        <span className="ml-2 font-medium">{payrollSyncResult.balanceSummary.annual.remaining} days</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sick Balance:</span>
                        <span className="ml-2 font-medium">{payrollSyncResult.balanceSummary.sick.remaining} days</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">{payrollSyncResult.error}</p>
                  )}
                </div>
              )}
            </div>

            {/* Personal Leave Fix Notice */}
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-warning">Personal Leave Balance Fix</h3>
                  <p className="text-sm text-warning mt-1">
                    If employees show 0 days for Personal Leave, use the &quot;Initialize Default Entitlements&quot; feature above
                    with their Employee ID. This will automatically create entitlements for all leave types including
                    5 days of Personal Leave.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && carryForwardPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => setShowPreviewModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-card px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Carry-Forward Preview</h3>
                  <button onClick={() => setShowPreviewModal(false)} className="text-muted-foreground hover:text-muted-foreground">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{carryForwardPreview.summary?.employeesProcessed || 0}</p>
                    <p className="text-sm text-primary">Employees</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-accent-foreground">{carryForwardPreview.totalCarriedForward || 0}</p>
                    <p className="text-sm text-accent-foreground">Days to Carry</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{carryForwardPreview.totalExpired || 0}</p>
                    <p className="text-sm text-destructive">Days to Expire</p>
                  </div>
                </div>

                {/* By Leave Type */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">By Leave Type:</h4>
                  <div className="space-y-2">
                    {carryForwardPreview.summary?.byLeaveType?.map((lt: { leaveTypeId: string; leaveTypeName: string; totalCarried: number; totalExpired: number; employeesAffected: number }) => (
                      <div key={lt.leaveTypeId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">{lt.leaveTypeName}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-accent-foreground">+{lt.totalCarried} carried</span>
                          <span className="text-destructive">-{lt.totalExpired} expired</span>
                          <span className="text-muted-foreground">{lt.employeesAffected} employees</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details Table */}
                {carryForwardPreview.details && carryForwardPreview.details.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Detailed Changes:</h4>
                    <div className="overflow-x-auto max-h-64">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-3 py-2 text-left">Employee</th>
                            <th className="px-3 py-2 text-left">Leave Type</th>
                            <th className="px-3 py-2 text-right">Remaining</th>
                            <th className="px-3 py-2 text-right">Cap</th>
                            <th className="px-3 py-2 text-right">Carried</th>
                            <th className="px-3 py-2 text-right">Expired</th>
                            <th className="px-3 py-2 text-left">Expiry Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {carryForwardPreview.details.slice(0, 50).map((d: { employeeId: string; leaveTypeName: string; previousRemaining: number; cappedAmount: number; carriedForward: number; expired: number; expiryDate?: string }, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono text-xs">{d.employeeId.slice(-8)}</td>
                              <td className="px-3 py-2">{d.leaveTypeName}</td>
                              <td className="px-3 py-2 text-right">{d.previousRemaining}</td>
                              <td className="px-3 py-2 text-right">{d.cappedAmount}</td>
                              <td className="px-3 py-2 text-right text-accent-foreground">+{d.carriedForward}</td>
                              <td className="px-3 py-2 text-right text-destructive">{d.expired > 0 ? `-${d.expired}` : '0'}</td>
                              <td className="px-3 py-2">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {carryForwardPreview.details.length > 50 && (
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          Showing first 50 of {carryForwardPreview.details.length} records
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-muted/30 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30"
                >
                  Close
                </button>
                <button
                  onClick={(e) => {
                    setShowPreviewModal(false);
                    handleCarryForward(e as unknown as React.FormEvent);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  Execute Carry-Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && carryForwardReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => setShowReportModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-card px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Carry-Forward Report</h3>
                  <button onClick={() => setShowReportModal(false)} className="text-muted-foreground hover:text-muted-foreground">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary/10 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary">{carryForwardReport.summary?.totalEmployees || 0}</p>
                    <p className="text-sm text-primary">Total Employees</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-4">
                    <p className="text-2xl font-bold text-accent-foreground">{carryForwardReport.summary?.totalCarryForward || 0}</p>
                    <p className="text-sm text-accent-foreground">Total Carry-Forward Days</p>
                  </div>
                </div>

                {/* By Leave Type */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">Summary by Leave Type:</h4>
                  <div className="space-y-2">
                    {carryForwardReport.summary?.byLeaveType?.map((lt: { leaveTypeId: string; leaveTypeName: string; totalCarryForward: number; employeesWithCarryForward: number }) => (
                      <div key={lt.leaveTypeId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">{lt.leaveTypeName}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-accent-foreground">{lt.totalCarryForward} days</span>
                          <span className="text-muted-foreground">{lt.employeesWithCarryForward} employees</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Report */}
                {carryForwardReport.report && carryForwardReport.report.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Current Entitlements:</h4>
                    <div className="overflow-x-auto max-h-64">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-3 py-2 text-left">Employee</th>
                            <th className="px-3 py-2 text-left">Leave Type</th>
                            <th className="px-3 py-2 text-right">Yearly</th>
                            <th className="px-3 py-2 text-right">Carry Fwd</th>
                            <th className="px-3 py-2 text-right">Taken</th>
                            <th className="px-3 py-2 text-right">Remaining</th>
                            <th className="px-3 py-2 text-left">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {carryForwardReport.report.slice(0, 50).map((r: { employeeId?: string; leaveTypeName: string; yearlyEntitlement: number; carryForward: number; taken: number; remaining: number; carryForwardExpiry?: string }, idx: number) => (
                            <tr key={idx} className="hover:bg-muted/30">
                              <td className="px-3 py-2 font-mono text-xs">{r.employeeId?.slice(-8)}</td>
                              <td className="px-3 py-2">{r.leaveTypeName}</td>
                              <td className="px-3 py-2 text-right">{r.yearlyEntitlement}</td>
                              <td className="px-3 py-2 text-right text-accent-foreground">{r.carryForward}</td>
                              <td className="px-3 py-2 text-right text-destructive">{r.taken}</td>
                              <td className="px-3 py-2 text-right font-medium">{r.remaining}</td>
                              <td className="px-3 py-2">{r.carryForwardExpiry ? new Date(r.carryForwardExpiry).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-muted/30 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => setShowOverrideModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <form onSubmit={handleOverrideCarryForward}>
                <div className="bg-card px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Override Carry-Forward</h3>
                      <p className="text-sm text-muted-foreground">Manually adjust carry-forward for a specific employee</p>
                    </div>
                  </div>

                  {/* Error display inside modal */}
                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Select Employee *</label>
                      <select
                        value={overrideForm.employeeId}
                        onChange={(e) => setOverrideForm({ ...overrideForm, employeeId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loadingEmployees}
                      >
                        <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                        {employees.map((emp) => (
                          <option key={emp._id || emp.id} value={emp._id || emp.id}>
                            {getEmployeeDisplayName(emp)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Leave Type *</label>
                      <select
                        value={overrideForm.leaveTypeId}
                        onChange={(e) => setOverrideForm({ ...overrideForm, leaveTypeId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">Select leave type</option>
                        {leaveTypes.length === 0 && (
                          <option value="" disabled>Loading leave types...</option>
                        )}
                        {leaveTypes.map((lt) => (
                          <option key={lt._id || lt.id} value={lt._id || lt.id}>{lt.name}</option>
                        ))}
                      </select>
                      {leaveTypes.length === 0 && (
                        <p className="text-xs text-warning mt-1">No leave types loaded. Please wait or refresh the page.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Carry-Forward Days *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={overrideForm.carryForwardDays}
                        onChange={(e) => setOverrideForm({ ...overrideForm, carryForwardDays: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={overrideForm.expiryDate}
                        onChange={(e) => setOverrideForm({ ...overrideForm, expiryDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                      <textarea
                        value={overrideForm.reason}
                        onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={3}
                        placeholder="Provide a reason for this override"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accrualRunning}
                    className="px-4 py-2 text-sm font-medium text-white bg-warning rounded-lg hover:bg-warning disabled:opacity-50"
                  >
                    {accrualRunning ? 'Applying...' : 'Apply Override'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Accrual Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => setShowSuspensionModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-xl sm:w-full">
              <form onSubmit={handleApplySuspension}>
                <div className="bg-card px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Accrual Suspension</h3>
                      <p className="text-sm text-muted-foreground">Adjust accrual for unpaid leave or long absence</p>
                    </div>
                  </div>

                  {/* Error display inside modal */}
                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Employee Selection */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Select Employee *</label>
                      <div className="flex gap-2">
                        <select
                          value={suspensionForm.employeeId}
                          onChange={(e) => setSuspensionForm({ ...suspensionForm, employeeId: e.target.value })}
                          className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                          disabled={loadingEmployees}
                        >
                          <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                          {employees.map((emp) => (
                            <option key={emp._id || emp.id} value={emp._id || emp.id}>
                              {getEmployeeDisplayName(emp)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => checkEmployeeAbsences(suspensionForm.employeeId)}
                          disabled={!suspensionForm.employeeId || loading}
                          className="px-3 py-2.5 text-sm font-medium text-muted-foreground bg-muted rounded-lg hover:bg-accent disabled:opacity-50"
                        >
                          Check Absences
                        </button>
                      </div>
                    </div>

                    {/* Leave Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Leave Type to Adjust *</label>
                      <select
                        value={suspensionForm.leaveTypeId}
                        onChange={(e) => setSuspensionForm({ ...suspensionForm, leaveTypeId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">Select leave type</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt._id || lt.id} value={lt._id || lt.id}>{lt.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Select which leave type&apos;s accrual to adjust (usually Annual Leave)</p>
                    </div>

                    {/* Suspension Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Suspension Type *</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSuspensionForm({ ...suspensionForm, suspensionType: 'unpaid' })}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${suspensionForm.suspensionType === 'unpaid'
                            ? 'border-destructive bg-destructive/10'
                            : 'border-border hover:border-border'
                            }`}
                        >
                          <span className="block font-medium text-foreground">Unpaid Leave</span>
                          <span className="text-xs text-muted-foreground">5+ consecutive working days</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSuspensionForm({ ...suspensionForm, suspensionType: 'long_absence' })}
                          className={`p-3 rounded-lg border-2 text-left transition-colors ${suspensionForm.suspensionType === 'long_absence'
                            ? 'border-warning bg-warning/10'
                            : 'border-border hover:border-border'
                            }`}
                        >
                          <span className="block font-medium text-foreground">Long Absence</span>
                          <span className="text-xs text-muted-foreground">30+ consecutive calendar days</span>
                        </button>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">From Date *</label>
                        <input
                          type="date"
                          value={suspensionForm.fromDate}
                          onChange={(e) => {
                            setSuspensionForm({ ...suspensionForm, fromDate: e.target.value });
                            setSuspensionPreview(null);
                          }}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">To Date *</label>
                        <input
                          type="date"
                          value={suspensionForm.toDate}
                          onChange={(e) => {
                            setSuspensionForm({ ...suspensionForm, toDate: e.target.value });
                            setSuspensionPreview(null);
                          }}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        />
                      </div>
                    </div>

                    {/* Calculate Preview Button */}
                    <button
                      type="button"
                      onClick={handlePreviewSuspension}
                      disabled={!suspensionForm.fromDate || !suspensionForm.toDate}
                      className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted/50 rounded-lg hover:bg-muted disabled:opacity-50"
                    >
                      Calculate Adjustment
                    </button>

                    {/* Preview Results */}
                    {suspensionPreview && (
                      <div className="p-4 bg-muted/30 rounded-lg border border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">Calculated Adjustment</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-card rounded">
                            <span className="text-muted-foreground">Total Days:</span>
                            <span className="float-right font-medium">{suspensionPreview.totalDays}</span>
                          </div>
                          <div className="p-2 bg-card rounded">
                            <span className="text-muted-foreground">Working Days:</span>
                            <span className="float-right font-medium">{suspensionPreview.workingDays}</span>
                          </div>
                          <div className="p-2 bg-card rounded">
                            <span className="text-muted-foreground">Prorate Ratio:</span>
                            <span className="float-right font-medium">{Math.round(suspensionPreview.prorateRatio * 100)}%</span>
                          </div>
                          <div className="p-2 bg-card rounded">
                            <span className="text-muted-foreground">Original Accrual:</span>
                            <span className="float-right font-medium">{suspensionPreview.originalAccrual} days</span>
                          </div>
                          <div className="col-span-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                            <span className="text-destructive">Days to Deduct:</span>
                            <span className="float-right font-bold text-destructive">{suspensionForm.adjustmentDays} days</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Adjustment Override */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Days to Deduct *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={suspensionForm.adjustmentDays}
                        onChange={(e) => setSuspensionForm({ ...suspensionForm, adjustmentDays: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-calculated or manually override</p>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                      <textarea
                        value={suspensionForm.reason}
                        onChange={(e) => setSuspensionForm({ ...suspensionForm, reason: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={2}
                        placeholder="e.g., Employee on unpaid leave for personal reasons"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuspensionModal(false);
                      setSuspensionPreview(null);
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accrualRunning || suspensionForm.adjustmentDays <= 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-destructive rounded-lg hover:bg-destructive disabled:opacity-50"
                  >
                    {accrualRunning ? 'Applying...' : 'Apply Suspension'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Sync Modal */}
      {showPayrollSyncModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => setShowPayrollSyncModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-xl sm:w-full">
              <form onSubmit={handleGeneratePayrollSync}>
                <div className="bg-card px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Payroll Sync</h3>
                      <p className="text-sm text-muted-foreground">Generate payroll data for salary deductions</p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Select Employee *</label>
                      <select
                        value={payrollSyncForm.employeeId}
                        onChange={(e) => setPayrollSyncForm({ ...payrollSyncForm, employeeId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loadingEmployees}
                      >
                        <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                        {employees.map((emp) => (
                          <option key={emp._id || emp.id} value={emp._id || emp.id}>
                            {getEmployeeDisplayName(emp)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Year *</label>
                        <select
                          value={payrollSyncForm.year}
                          onChange={(e) => setPayrollSyncForm({ ...payrollSyncForm, year: parseInt(e.target.value) })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value={2024}>2024</option>
                          <option value={2025}>2025</option>
                          <option value={2026}>2026</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Month *</label>
                        <select
                          value={payrollSyncForm.month}
                          onChange={(e) => setPayrollSyncForm({ ...payrollSyncForm, month: parseInt(e.target.value) })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value={1}>January</option>
                          <option value={2}>February</option>
                          <option value={3}>March</option>
                          <option value={4}>April</option>
                          <option value={5}>May</option>
                          <option value={6}>June</option>
                          <option value={7}>July</option>
                          <option value={8}>August</option>
                          <option value={9}>September</option>
                          <option value={10}>October</option>
                          <option value={11}>November</option>
                          <option value={12}>December</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Base Salary ($) *</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={payrollSyncForm.baseSalary}
                          onChange={(e) => setPayrollSyncForm({ ...payrollSyncForm, baseSalary: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Work Days in Month *</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={payrollSyncForm.workDaysInMonth}
                          onChange={(e) => setPayrollSyncForm({ ...payrollSyncForm, workDaysInMonth: parseInt(e.target.value) || 22 })}
                          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleQuickCalculateDeduction}
                      className="w-full px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/10"
                    >
                      Preview Daily Rate
                    </button>

                    <div className="p-3 bg-muted/30 rounded-lg text-sm">
                      <p className="font-medium text-foreground mb-1">Deduction Formula:</p>
                      <code className="text-xs text-muted-foreground">
                        Deduction = (Base Salary ÷ Work Days) × Unpaid Leave Days
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Daily Rate = ${payrollSyncForm.baseSalary > 0 && payrollSyncForm.workDaysInMonth > 0
                          ? (payrollSyncForm.baseSalary / payrollSyncForm.workDaysInMonth).toFixed(2)
                          : '0.00'}
                      </p>
                    </div>

                    {payrollSyncResult && payrollSyncResult.ok && (
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <h4 className="text-sm font-medium text-accent-foreground mb-2">Sync Result</h4>
                        <div className="space-y-2 text-sm text-accent-foreground">
                          <div className="flex justify-between">
                            <span>Unpaid Leave Days:</span>
                            <span className="font-medium">{payrollSyncResult.unpaidLeaveDeduction.totalDays}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Deduction:</span>
                            <span className="font-medium text-destructive">${payrollSyncResult.unpaidLeaveDeduction.deductionAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Formula:</span>
                            <span className="font-mono text-xs">{payrollSyncResult.unpaidLeaveDeduction.formula || 'N/A'}</span>
                          </div>
                          {payrollSyncResult.unpaidLeaveDeduction.leaves.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-accent/20">
                              <p className="font-medium mb-1">Unpaid Leave Records:</p>
                              {payrollSyncResult.unpaidLeaveDeduction.leaves.map((leave, idx) => (
                                <div key={idx} className="text-xs flex justify-between">
                                  <span>{new Date(leave.from).toLocaleDateString()} - {new Date(leave.to).toLocaleDateString()}</span>
                                  <span>{leave.days} days</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 px-6 py-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPayrollSyncModal(false);
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payrollSyncLoading || !payrollSyncForm.employeeId}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary disabled:opacity-50"
                  >
                    {payrollSyncLoading ? 'Syncing...' : 'Generate Sync Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HR Finalization Modal */}
      {showFinalizeModal && finalizeRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-muted bg-opacity-75 transition-opacity" onClick={() => !finalizeLoading && setShowFinalizeModal(false)}></div>
            <div className="relative inline-block bg-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="bg-card px-6 pt-6 pb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${finalizeDecision === 'approve' ? 'bg-accent/10' : 'bg-destructive/10'
                    }`}>
                    {finalizeDecision === 'approve' ? (
                      <svg className="w-6 h-6 text-accent-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {(() => {
                        const wasAlreadyApproved = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';
                        if (finalizeDecision === 'approve') {
                          return wasAlreadyApproved ? 'Finalize Approved Leave Request' : 'Approve Leave Request';
                        }
                        return 'Reject Leave Request';
                      })()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const wasAlreadyApproved = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';
                        if (finalizeDecision === 'approve') {
                          return wasAlreadyApproved
                            ? 'Finalize this approved request to update employee records and adjust payroll accordingly'
                            : 'Approve this leave request and update employee records';
                        }
                        return 'Reject this leave request';
                      })()}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Request Details */}
                <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-medium text-foreground mb-2">Request Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee:</span>
                      <span className="font-medium">{finalizeRequest.employeeName || finalizeRequest.employeeId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leave Type:</span>
                      <span className="font-medium">{finalizeRequest.leaveTypeName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{finalizeRequest.durationDays || 0} day(s)</span>
                    </div>
                    {finalizeRequest.dates && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dates:</span>
                        <span className="font-medium">
                          {finalizeRequest.dates.from ? new Date(finalizeRequest.dates.from).toLocaleDateString() : 'N/A'} - {finalizeRequest.dates.to ? new Date(finalizeRequest.dates.to).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    )}
                    {finalizeRequest.justification && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground">Reason:</span>
                        <p className="mt-1 text-foreground">{finalizeRequest.justification}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Approval Options */}
                {finalizeDecision === 'approve' && (
                  <div className="space-y-4">
                    {/* Override Manager Decision (REQ-026) */}
                    {(() => {
                      const managerRejected = finalizeRequest.approvalFlow?.find((f) => f.role === 'manager')?.status === 'rejected';
                      const managerApproved = finalizeRequest.approvalFlow?.find((f) => f.role === 'manager')?.status === 'approved';
                      const isRejectedStatus = finalizeRequest.status === 'REJECTED' || finalizeRequest.status === 'rejected';
                      const isApprovedStatus = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';

                      // Show override option if:
                      // 1. Manager rejected and HR wants to approve (override rejection)
                      // 2. Manager approved and HR wants to reject (override approval)
                      // 3. Request is in rejected status and HR wants to approve
                      // Determine override scenarios
                      let isOverridingRejection = false;
                      let isOverridingApproval = false;

                      if (finalizeDecision === 'approve') {
                        isOverridingRejection = managerRejected || isRejectedStatus;
                      } else if (finalizeDecision === 'reject') {
                        isOverridingApproval = managerApproved && isApprovedStatus;
                      }

                      const shouldShowOverride = isOverridingRejection || isOverridingApproval;

                      if (shouldShowOverride) {
                        return (
                          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium text-orange-900">Override Manager Decision</p>
                                <p className="text-xs text-warning">
                                  {isOverridingRejection
                                    ? 'This request was rejected by the manager. You are overriding to approve.'
                                    : 'This request was approved by the manager. You are overriding to reject.'}
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={finalizeOptions.isOverride}
                                  onChange={(e) => setFinalizeOptions({ ...finalizeOptions, isOverride: e.target.checked, overrideReason: e.target.checked ? finalizeOptions.overrideReason : '' })}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning"></div>
                              </label>
                            </div>
                            {finalizeOptions.isOverride && (
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-orange-900 mb-1">Override Reason *</label>
                                <textarea
                                  value={finalizeOptions.overrideReason}
                                  onChange={(e) => setFinalizeOptions({ ...finalizeOptions, overrideReason: e.target.value })}
                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                                  rows={3}
                                  placeholder="Please provide a reason for overriding the manager's decision..."
                                  required
                                />
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Payroll Sync Option */}
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Sync with Payroll</p>
                        <p className="text-xs text-primary">Calculate salary deduction for unpaid leave</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={finalizeOptions.syncPayroll}
                          onChange={(e) => setFinalizeOptions({ ...finalizeOptions, syncPayroll: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Salary Details (shown if sync is enabled) */}
                    {finalizeOptions.syncPayroll && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Base Salary ($)</label>
                          <input
                            type="number"
                            value={finalizeOptions.baseSalary}
                            onChange={(e) => setFinalizeOptions({ ...finalizeOptions, baseSalary: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Work Days/Month</label>
                          <input
                            type="number"
                            value={finalizeOptions.workDaysInMonth}
                            onChange={(e) => setFinalizeOptions({ ...finalizeOptions, workDaysInMonth: parseInt(e.target.value) || 22 })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* Impact Preview */}
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm font-medium text-warning mb-1">Impact Preview</p>
                      <ul className="text-xs text-warning space-y-1">
                        {(() => {
                          const wasAlreadyApproved = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';
                          const items = [];

                          if (!wasAlreadyApproved) {
                            items.push(<li key="balance">• Employee balance will be reduced by {finalizeRequest.durationDays || 0} day(s)</li>);
                          } else {
                            items.push(<li key="finalize">• Employee records will be updated (attendance, leave history)</li>);
                            items.push(<li key="payroll">• Payroll will be adjusted for unpaid leave days</li>);
                          }

                          if (finalizeOptions.syncPayroll && (finalizeRequest.leaveTypeName || '').toLowerCase().includes('unpaid') && finalizeRequest.durationDays > 0) {
                            items.push(<li key="deduction">• Payroll deduction: ${((finalizeOptions.baseSalary / finalizeOptions.workDaysInMonth) * (finalizeRequest.durationDays || 0)).toFixed(2)}</li>);
                          }

                          items.push(<li key="notify">• Employee, manager, and attendance coordinator will be notified</li>);

                          return items;
                        })()}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {finalizeDecision === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Reason for Rejection *</label>
                    <textarea
                      value={finalizeOptions.rejectReason}
                      onChange={(e) => setFinalizeOptions({ ...finalizeOptions, rejectReason: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
                      rows={3}
                      placeholder="Please provide a reason for rejecting this request..."
                      required
                    />
                  </div>
                )}

                {/* Finalization Result */}
                {finalizeResult && (
                  <div className={`mt-4 p-4 rounded-lg ${finalizeResult.ok ? 'bg-accent/10 border border-accent/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                    <p className={`text-sm font-medium ${finalizeResult.ok ? 'text-accent-foreground' : 'text-destructive'}`}>
                      {finalizeResult.message}
                    </p>
                    {finalizeResult.balanceUpdate && (
                      <div className="mt-2 text-xs text-accent-foreground">
                        <p>Balance Updated: {finalizeResult.balanceUpdate.previousBalance} → {finalizeResult.balanceUpdate.newBalance} days</p>
                      </div>
                    )}
                    {finalizeResult.payrollImpact && finalizeResult.payrollImpact.isUnpaidLeave && (
                      <div className="mt-2 text-xs text-accent-foreground">
                        <p>Payroll Deduction: ${finalizeResult.payrollImpact.deductionAmount}</p>
                        <p>Formula: {finalizeResult.payrollImpact.formula}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-muted/30 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinalizeModal(false);
                    setFinalizeRequest(null);
                    setFinalizeResult(null);
                    setError(null);
                  }}
                  disabled={finalizeLoading}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30 disabled:opacity-50"
                >
                  {finalizeResult ? 'Close' : 'Cancel'}
                </button>
                {!finalizeResult && (
                  <button
                    onClick={handleHRFinalizeWithSync}
                    disabled={
                      finalizeLoading ||
                      (finalizeDecision === 'reject' && !finalizeOptions.rejectReason.trim()) ||
                      (finalizeDecision === 'approve' && finalizeOptions.isOverride && !finalizeOptions.overrideReason.trim())
                    }
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${finalizeDecision === 'approve'
                      ? 'bg-accent hover:bg-accent'
                      : 'bg-destructive hover:bg-destructive'
                      }`}
                  >
                    {finalizeLoading
                      ? 'Processing...'
                      : (() => {
                        const wasAlreadyApproved = finalizeRequest.status === 'APPROVED' || finalizeRequest.status === 'approved';
                        if (finalizeDecision === 'approve') {
                          return wasAlreadyApproved ? 'Finalize & Update Records' : 'Approve & Update Records';
                        }
                        return 'Reject Request';
                      })()}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Document Verification Modal (REQ-028) */}
      {showMedicalVerificationModal && selectedMedicalAttachment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {medicalModalMode === 'verify' ? 'Verify Medical Document' : 'View Medical Document'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedMedicalAttachment.employeeName} - {selectedMedicalAttachment.leaveTypeName}
                </p>
                {selectedMedicalAttachment.dates && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave Period: {new Date(selectedMedicalAttachment.dates.from).toLocaleDateString()} to {new Date(selectedMedicalAttachment.dates.to).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowMedicalVerificationModal(false);
                  setSelectedMedicalAttachment(null);
                  setMedicalAttachmentData(null);
                  setError(null);
                }}
                className="text-muted-foreground hover:text-muted-foreground transition-colors"
                disabled={verifyingMedical}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {medicalAttachmentData ? (
                <div className="space-y-4">
                  {/* Document Info */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="font-medium text-foreground">File Name:</span>
                        <p className="text-foreground mt-1">{medicalAttachmentData.originalName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">File Type:</span>
                        <p className="text-foreground mt-1">{medicalAttachmentData.fileType || 'N/A'}</p>
                      </div>
                      {medicalAttachmentData.size && (
                        <div>
                          <span className="font-medium text-foreground">File Size:</span>
                          <p className="text-foreground mt-1">{(medicalAttachmentData.size / 1024).toFixed(2)} KB</p>
                        </div>
                      )}
                    </div>

                    {/* Download and Open Buttons */}
                    {selectedMedicalAttachment?.attachmentId && medicalAttachmentData && (() => {
                      // Determine file URL - could be external URL, data URL, static file path, or server endpoint
                      const filePath = medicalAttachmentData.filePath || '';
                      const staticUrl = typeof medicalAttachmentData === 'object' && 'staticUrl' in medicalAttachmentData
                        ? (medicalAttachmentData as Record<string, unknown>).staticUrl as string | undefined
                        : undefined; // From backend response
                      const isExternalUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
                      const isDataUrl = filePath.startsWith('data:');
                      const isStaticPath = filePath.startsWith('/uploads/') || filePath.startsWith('uploads/');

                      // Construct download URL
                      let downloadUrl: string;
                      let showWarning = false;

                      if (staticUrl) {
                        // Backend provided a static URL - use it
                        downloadUrl = staticUrl;
                        showWarning = true;
                      } else if (isExternalUrl || isDataUrl) {
                        // External URL or data URL - use directly
                        downloadUrl = filePath;
                      } else if (isStaticPath) {
                        // Static file path - construct static file URL
                        const staticPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
                        downloadUrl = `${API_BASE_URL}${staticPath}`;
                        showWarning = true; // Show warning that file might not be available
                      } else {
                        // Use download endpoint - it will handle the file appropriately
                        downloadUrl = `${API_BASE_URL}/leaves/attachments/${selectedMedicalAttachment.attachmentId}/download`;
                      }

                      return (
                        <div className="space-y-2">
                          <div className="flex gap-2 pt-3 border-t border-border">
                            <a
                              href={downloadUrl}
                              download={isExternalUrl || isDataUrl ? undefined : (medicalAttachmentData.originalName || 'document')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary rounded-lg transition-colors flex items-center gap-2"
                              onClick={() => {
                                // If it's a static path that might not exist, show a message
                                if (showWarning && !isExternalUrl && !isDataUrl) {
                                  console.log('[Download] Attempting to download from:', downloadUrl);
                                  console.log('[Download] File path reference:', filePath);
                                  // Let the browser handle it - if 404, user will see the error
                                }
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download Document
                            </a>
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border hover:bg-muted/30 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open in New Tab
                            </a>
                            {isExternalUrl && (
                              <span className="px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded">
                                External Link
                              </span>
                            )}
                          </div>
                          {showWarning && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                              <p className="font-medium mb-1">⚠️ File Reference</p>
                              <p className="text-xs">File path: <code className="bg-yellow-100 px-1 rounded">{filePath}</code></p>
                              <p className="text-xs mt-1">If the file doesn&apos;t open, it may be stored externally or the file path is a reference. Contact the employee or check the original source.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Document Preview */}
                  {medicalAttachmentData.filePath && (() => {
                    const filePath = medicalAttachmentData.filePath;
                    const isExternalUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
                    const isDataUrl = filePath.startsWith('data:');
                    const isStaticPath = filePath.startsWith('/uploads/') || filePath.startsWith('uploads/');

                    // Construct preview URL
                    let previewUrl: string;
                    if (isExternalUrl || isDataUrl) {
                      previewUrl = filePath;
                    } else if (isStaticPath) {
                      const staticPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
                      previewUrl = `${API_BASE_URL}${staticPath}`;
                    } else {
                      previewUrl = `${API_BASE_URL}/leaves/attachments/${selectedMedicalAttachment?.attachmentId}/download`;
                    }

                    return (
                      <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
                        <div className="p-4 bg-card">
                          {isDataUrl ? (
                            // Data URL - display directly
                            medicalAttachmentData.fileType?.toLowerCase().includes('image') ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={filePath}
                                alt="Medical Document"
                                className="max-w-full h-auto mx-auto"
                                style={{ maxHeight: '500px' }}
                              />
                            ) : medicalAttachmentData.fileType?.toLowerCase().includes('pdf') ? (
                              <iframe
                                src={filePath}
                                className="w-full h-96 border-0"
                                title="Medical Document"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm">Document loaded</p>
                                <a
                                  href={previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 text-primary hover:text-primary text-sm underline"
                                >
                                  Open in browser →
                                </a>
                              </div>
                            )
                          ) : isExternalUrl ? (
                            // External URL - show link
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                              <svg className="w-16 h-16 mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <p className="text-sm font-medium mb-2">External Document Link</p>
                              <p className="text-xs text-muted-foreground mb-4 text-center px-4 break-all">{filePath}</p>
                              <a
                                href={filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary rounded-lg transition-colors"
                              >
                                Open External Link
                              </a>
                            </div>
                          ) : (
                            // Server file - show preview placeholder
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                              <svg className="w-16 h-16 mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm font-medium mb-2">Document Preview</p>
                              <p className="text-xs text-muted-foreground mb-4">Click the buttons above to download or open the document</p>
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:text-primary underline"
                              >
                                View in browser →
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Verification Notice */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-primary">
                        <p className="font-medium mb-1">Verification Guidelines</p>
                        <ul className="list-disc list-inside space-y-1 text-primary">
                          <li>Review the medical document carefully</li>
                          <li>Ensure it is a legitimate medical certificate</li>
                          <li>Verify dates match the leave request period</li>
                          <li>Check that the document is from a valid medical provider</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading document...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMedicalVerificationModal(false);
                  setSelectedMedicalAttachment(null);
                  setMedicalAttachmentData(null);
                  setError(null);
                }}
                disabled={verifyingMedical}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted/30 disabled:opacity-50"
              >
                Close
              </button>
              {/* Only show Verify button if in verify mode */}
              {medicalModalMode === 'verify' && (
                <button
                  type="button"
                  onClick={handleVerifyMedicalDocument}
                  disabled={verifyingMedical || !medicalAttachmentData}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {verifyingMedical ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Verify Document</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

