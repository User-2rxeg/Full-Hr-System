'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';
import {
  analyzeTeamLeavePatterns,
  PatternAnalysisResult,
  DetectedPattern,
  getRiskLevelColor,
  getPatternTypeIcon,
  getPatternTypeName,
  DEFAULT_CONFIG,
} from '@/app/utils/leavePatternAnalyzer';

// Types
interface LeaveRequest {
  _id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  justification?: string;
  status: string;
  createdAt?: string;
  approvalFlow?: Array<{
    role: string;
    status: string;
    decidedBy?: string;
    decidedAt?: string;
    reason?: string;
  }>;
  postLeave?: boolean;
  flaggedIrregular?: boolean;
  irregularReason?: string;
}

interface LeaveType {
  _id: string;
  name: string;
  code?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'returned_for_correction';
type SortField = 'dates.from' | 'createdAt' | 'durationDays' | 'employeeName';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'approvals' | 'patterns';

export default function DepartmentHeadPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('approvals');

  // Pattern analysis states
  const [patternResults, setPatternResults] = useState<PatternAnalysisResult[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<PatternAnalysisResult | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flaggingRequestId, setFlaggingRequestId] = useState<string | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState<SortField>('dates.from');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [requestsRes, typesRes] = await Promise.all([
        leavesService.getAllRequests({
          limit: 100,
        }),
        leavesService.getLeaveTypes(),
      ]);

      // Check for errors first
      if (requestsRes.error) {
        setError(requestsRes.error);
        setLoading(false);
        return;
      }

      // Handle requests response - backend returns { data: [...], meta: {...} }
      let requestsData: LeaveRequest[] = [];
      if (requestsRes.data) {
        const resData = requestsRes.data as { data?: LeaveRequest[]; meta?: unknown } | LeaveRequest[];
        if (Array.isArray(resData)) {
          requestsData = resData;
        } else if (resData.data && Array.isArray(resData.data)) {
          requestsData = resData.data;
        }
      }

      // Store leave types for filtering
      if (Array.isArray(typesRes.data)) {
        setLeaveTypes(typesRes.data);
      }

      // Filter out requests without valid dates
      const validRequests = requestsData.filter((req) => req.dates && req.dates.from && req.dates.to);

      // Enrich requests with leave type names
      const enrichedRequests = validRequests.map((req) => {
        const leaveType = (typesRes.data as LeaveType[])?.find(
          (lt) => lt._id === req.leaveTypeId
        );
        return {
          ...req,
          leaveTypeName: leaveType?.name || 'Unknown',
        };
      });

      setRequests(enrichedRequests);

      // Run pattern analysis on all requests
      analyzePatterns(enrichedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Analyze leave patterns for all employees
  const analyzePatterns = useCallback((allRequests: LeaveRequest[]) => {
    // Group requests by employee
    const leavesByEmployee = new Map<string, { leaves: LeaveRequest[]; employeeName?: string }>();

    allRequests.forEach((request) => {
      const existing = leavesByEmployee.get(request.employeeId);
      if (existing) {
        existing.leaves.push(request);
      } else {
        leavesByEmployee.set(request.employeeId, {
          leaves: [request],
          employeeName: request.employeeName,
        });
      }
    });

    // Run pattern analysis
    const results = analyzeTeamLeavePatterns(leavesByEmployee, [], DEFAULT_CONFIG);
    setPatternResults(results);
  }, []);

  // Flag a request as irregular
  const handleFlagIrregular = async () => {
    if (!flaggingRequestId || !flagReason.trim()) return;

    try {
      setActionLoading(flaggingRequestId);
      const response = await leavesService.flagIrregular(flaggingRequestId, true, flagReason);

      if (response.error) {
        setError(response.error);
        return;
      }

      // Update the request in state
      setRequests((prev) =>
        prev.map((r) =>
          r._id === flaggingRequestId
            ? { ...r, flaggedIrregular: true, irregularReason: flagReason }
            : r
        )
      );

      setSuccessMessage('Leave request flagged as irregular');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowFlagModal(false);
      setFlagReason('');
      setFlaggingRequestId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag request');
    } finally {
      setActionLoading(null);
    }
  };

  // Remove irregular flag
  const handleUnflagIrregular = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const response = await leavesService.flagIrregular(requestId, false);

      if (response.error) {
        setError(response.error);
        return;
      }

      // Update the request in state
      setRequests((prev) =>
        prev.map((r) =>
          r._id === requestId
            ? { ...r, flaggedIrregular: false, irregularReason: undefined }
            : r
        )
      );

      setSuccessMessage('Irregular flag removed');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unflag request');
    } finally {
      setActionLoading(null);
    }
  };

  const openFlagModal = (requestId: string, suggestedReason?: string) => {
    setFlaggingRequestId(requestId);
    setFlagReason(suggestedReason || '');
    setShowFlagModal(true);
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!user) return;

    try {
      setActionLoading(request._id);
      setError(null);

      const response = await leavesService.managerApprove(request._id, user.id);

      if (response.error) {
        setError(response.error);
        return;
      }

      // Remove the request from the list immediately
      setRequests((prev) => prev.filter((r) => r._id !== request._id));

      setSuccessMessage(`Leave request approved successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedRequest) return;

    try {
      setActionLoading(selectedRequest._id);
      setError(null);

      const response = await leavesService.managerReject(
        selectedRequest._id,
        user.id,
        rejectReason || undefined
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      // Remove the request from the list immediately
      setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));

      setSuccessMessage(`Leave request rejected`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReturnForCorrection = async () => {
    if (!user || !selectedRequest || !returnReason.trim()) return;

    try {
      setActionLoading(selectedRequest._id);
      setError(null);

      const response = await leavesService.returnForCorrection(
        selectedRequest._id,
        user.id,
        returnReason
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      // Remove the request from the list immediately
      setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));

      setSuccessMessage(`Leave request returned for correction`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowReturnModal(false);
      setReturnReason('');
      setSelectedRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return request');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const openReturnModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowReturnModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
      returned_for_correction: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Needs Correction' },
    };
    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getLeaveTypeColor = (typeName: string) => {
    const name = typeName.toLowerCase();
    if (name.includes('annual')) return 'bg-blue-500';
    if (name.includes('sick')) return 'bg-red-500';
    if (name.includes('personal')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    needsCorrection: requests.filter(r => r.status === 'returned_for_correction').length,
  };

  // Apply all filters
  const filteredRequests = requests
    .filter(r => {
      // Status filter
      if (filterStatus !== 'all' && r.status.toLowerCase() !== filterStatus) return false;

      // Leave type filter
      if (filterLeaveType !== 'all' && r.leaveTypeId !== filterLeaveType) return false;

      // Date range filter
      if (filterDateFrom && r.dates?.from) {
        const reqDate = new Date(r.dates.from);
        const fromDate = new Date(filterDateFrom);
        if (reqDate < fromDate) return false;
      }
      if (filterDateTo && r.dates?.to) {
        const reqDate = new Date(r.dates.to);
        const toDate = new Date(filterDateTo);
        if (reqDate > toDate) return false;
      }

      // Search query (employee name or ID)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const employeeName = (r.employeeName || '').toLowerCase();
        const employeeId = (r.employeeId || '').toLowerCase();
        const leaveTypeName = (r.leaveTypeName || '').toLowerCase();
        if (!employeeName.includes(query) && !employeeId.includes(query) && !leaveTypeName.includes(query)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'dates.from':
          comparison = new Date(a.dates?.from || 0).getTime() - new Date(b.dates?.from || 0).getTime();
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'durationDays':
          comparison = (a.durationDays || 0) - (b.durationDays || 0);
          break;
        case 'employeeName':
          comparison = (a.employeeName || '').localeCompare(b.employeeName || '');
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Check if any advanced filters are active
  const hasActiveFilters = filterLeaveType !== 'all' || filterDateFrom || filterDateTo || searchQuery.trim();

  // Clear all filters
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterLeaveType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setSortField('dates.from');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white rounded-xl shadow-sm"></div>
              ))}
            </div>
            <div className="h-96 bg-white rounded-xl shadow-sm"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Department Head Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your team and approve leave requests</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/department-head/team-balances"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Team Balances
            </Link>
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('approvals')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'approvals'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Leave Approvals
              </span>
            </button>
            <button
              onClick={() => setViewMode('patterns')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'patterns'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Pattern Analysis
                {patternResults.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                    {patternResults.length}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {viewMode === 'approvals' ? (
          <>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Needs Correction</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.needsCorrection}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs and Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Filter Header */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-4">
              {/* Top row: Status tabs and filter toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All Requests' },
                    { key: 'pending', label: 'Pending', count: stats.pending },
                    { key: 'approved', label: 'Approved', count: stats.approved },
                    { key: 'rejected', label: 'Rejected', count: stats.rejected },
                    { key: 'returned_for_correction', label: 'Needs Correction', count: stats.needsCorrection },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterStatus(tab.key as FilterStatus)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filterStatus === tab.key
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          filterStatus === tab.key ? 'bg-white/20' : 'bg-gray-200'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      showAdvancedFilters || hasActiveFilters
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {hasActiveFilters && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </button>
                  <span className="text-sm text-gray-500">
                    {filteredRequests.length} result{filteredRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Employee name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Leave Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                      <select
                        value={filterLeaveType}
                        onChange={(e) => setFilterLeaveType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Types</option>
                        {leaveTypes.map((type) => (
                          <option key={type._id} value={type._id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date From Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Date To Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                      <div className="flex gap-2">
                        <select
                          value={sortField}
                          onChange={(e) => setSortField(e.target.value as SortField)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="dates.from">Leave Date</option>
                          <option value="createdAt">Submitted Date</option>
                          <option value="durationDays">Duration</option>
                          <option value="employeeName">Employee Name</option>
                        </select>
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                          {sortOrder === 'asc' ? (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter Actions */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {hasActiveFilters && (
                        <span>
                          Showing {filteredRequests.length} of {requests.length} requests
                        </span>
                      )}
                    </div>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requests List */}
          <div className="divide-y divide-gray-100">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No leave requests found</h3>
                <p className="text-gray-500 mt-1">
                  {hasActiveFilters
                    ? 'No requests match your current filters.'
                    : filterStatus === 'pending'
                    ? 'No pending requests to review at this time.'
                    : filterStatus !== 'all'
                    ? 'No requests found with the selected status.'
                    : 'No leave requests available.'}
                </p>
                {(hasActiveFilters || filterStatus !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Employee & Leave Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-1.5 h-16 rounded-full ${getLeaveTypeColor(request.leaveTypeName || '')}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {request.employeeName || `Employee ${request.employeeId.slice(-6)}`}
                          </h3>
                          {getStatusBadge(request.status)}
                          {request.postLeave && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              Post-Leave
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${getLeaveTypeColor(request.leaveTypeName || '')}`}></span>
                            {request.leaveTypeName}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {request.dates?.from ? formatDate(request.dates.from) : 'N/A'} - {request.dates?.to ? formatDate(request.dates.to) : 'N/A'}
                          </span>
                          <span className="font-medium text-gray-700">
                            {request.durationDays} day{request.durationDays !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {request.justification && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            <span className="font-medium">Reason:</span> {request.justification}
                          </p>
                        )}
                        {request.createdAt && (
                          <p className="mt-1 text-xs text-gray-400">
                            Submitted: {formatDate(request.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 lg:ml-4">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={actionLoading === request._id}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === request._id ? (
                              <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing
                              </span>
                            ) : (
                              <>
                                <span className="hidden sm:inline">Approve</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            disabled={actionLoading === request._id}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="hidden sm:inline">Reject</span>
                            <span className="sm:hidden">✗</span>
                          </button>
                          <button
                            onClick={() => openReturnModal(request)}
                            disabled={actionLoading === request._id}
                            className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <span className="hidden sm:inline">Return</span>
                            <span className="sm:hidden">↩</span>
                          </button>
                        </>
                      )}
                      <button
                        className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Help Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Leave Approval Guidelines</h3>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li>• <strong>Approve:</strong> Accept the leave request if it doesn&apos;t conflict with team operations</li>
                <li>• <strong>Reject:</strong> Decline the request with a reason (e.g., critical project deadline)</li>
                <li>• <strong>Return:</strong> Send back for correction if information is incomplete or incorrect</li>
                <li>• Requests pending for more than 48 hours will be escalated to HR</li>
              </ul>
            </div>
          </div>
        </div>
          </>
        ) : (
          /* Pattern Analysis View */
          <div className="space-y-6">
            {/* Pattern Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employees Analyzed</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {new Set(requests.map(r => r.employeeId)).size}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Patterns Detected</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">
                      {patternResults.reduce((sum, r) => sum + r.patterns.length, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">High Risk</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">
                      {patternResults.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Flagged Requests</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">
                      {requests.filter(r => r.flaggedIrregular).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Pattern Results List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Irregular Leave Pattern Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Employees with detected irregular leave patterns, sorted by risk level
                </p>
              </div>

              {patternResults.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No Irregular Patterns Detected</h3>
                  <p className="text-gray-500 mt-1">
                    All team members&apos; leave patterns appear normal based on the analysis criteria.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {patternResults.map((result) => {
                    const riskColors = getRiskLevelColor(result.riskLevel);
                    return (
                      <div key={result.employeeId} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-gray-600">
                                {(result.employeeName || result.employeeId).substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-gray-900">
                                  {result.employeeName || `Employee ${result.employeeId.slice(-6)}`}
                                </h3>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${riskColors.bg} ${riskColors.text}`}>
                                  {result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)} Risk
                                </span>
                                <span className="text-sm text-gray-500">
                                  Score: {result.overallRiskScore}/100
                                </span>
                              </div>

                              {/* Patterns */}
                              <div className="mt-3 space-y-2">
                                {result.patterns.map((pattern, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-3 rounded-lg border ${
                                      pattern.severity === 'high'
                                        ? 'bg-red-50 border-red-200'
                                        : pattern.severity === 'medium'
                                        ? 'bg-amber-50 border-amber-200'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className="text-lg">{getPatternTypeIcon(pattern.type)}</span>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900">
                                            {getPatternTypeName(pattern.type)}
                                          </span>
                                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                            pattern.severity === 'high'
                                              ? 'bg-red-100 text-red-700'
                                              : pattern.severity === 'medium'
                                              ? 'bg-amber-100 text-amber-700'
                                              : 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {pattern.severity}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                                        <p className="text-xs text-gray-500 mt-1 italic">{pattern.suggestion}</p>

                                        {/* Show some occurrences */}
                                        {pattern.occurrences.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {pattern.occurrences.slice(0, 5).map((occ, occIdx) => (
                                              <span
                                                key={occIdx}
                                                className="px-2 py-0.5 text-xs bg-white border border-gray-200 rounded text-gray-600"
                                                title={occ.details}
                                              >
                                                {new Date(occ.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                            ))}
                                            {pattern.occurrences.length > 5 && (
                                              <span className="px-2 py-0.5 text-xs bg-gray-100 rounded text-gray-500">
                                                +{pattern.occurrences.length - 5} more
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => setSelectedPattern(result)}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                const employeeRequests = requests.filter(r => r.employeeId === result.employeeId);
                                if (employeeRequests.length > 0) {
                                  const latestRequest = employeeRequests.sort((a, b) =>
                                    new Date(b.dates.from).getTime() - new Date(a.dates.from).getTime()
                                  )[0];
                                  openFlagModal(
                                    latestRequest._id,
                                    result.patterns.map(p => getPatternTypeName(p.type)).join(', ')
                                  );
                                }
                              }}
                              className="px-3 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
                            >
                              Flag Pattern
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pattern Analysis Help */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Pattern Detection Criteria</h3>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• <strong>Monday/Friday:</strong> Frequent leaves on Mondays or Fridays (extending weekends)</li>
                    <li>• <strong>Holiday Extension:</strong> Leaves adjacent to holidays or long weekends</li>
                    <li>• <strong>Short Notice:</strong> Multiple leaves requested with less than 2 days notice</li>
                    <li>• <strong>Clustering:</strong> Multiple single-day leaves within a short period</li>
                    <li>• <strong>Behavioral Change:</strong> Sudden increase in leave usage compared to history</li>
                    <li>• <strong>Excessive Sick Leave:</strong> Unusually high sick leave usage</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowRejectModal(false)}></div>
            <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Reject Leave Request</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection (optional)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === selectedRequest._id}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === selectedRequest._id ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return for Correction Modal */}
      {showReturnModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowReturnModal(false)}></div>
            <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Return for Correction</h3>
                    <p className="text-sm text-gray-500">Request will be sent back to employee</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What needs to be corrected? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    placeholder="Please specify what needs to be corrected..."
                    required
                  />
                  {!returnReason.trim() && (
                    <p className="mt-1 text-xs text-red-500">Reason is required</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setReturnReason('');
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnForCorrection}
                  disabled={actionLoading === selectedRequest._id || !returnReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === selectedRequest._id ? 'Sending...' : 'Return Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flag Irregular Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowFlagModal(false)}></div>
            <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Flag Irregular Pattern</h3>
                    <p className="text-sm text-gray-500">Document the irregular leave pattern for this employee</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for flagging <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    placeholder="Describe the irregular pattern detected..."
                  />
                  {!flagReason.trim() && (
                    <p className="mt-1 text-xs text-red-500">Reason is required</p>
                  )}
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Flagging a pattern will add a note to the employee&apos;s leave record.
                    Consider discussing with the employee before taking further action.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFlagModal(false);
                    setFlagReason('');
                    setFlaggingRequestId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagIrregular}
                  disabled={actionLoading === flaggingRequestId || !flagReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === flaggingRequestId ? 'Flagging...' : 'Flag Pattern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Details Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedPattern(null)}></div>
            <div className="relative inline-block bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full max-h-[80vh] overflow-y-auto">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-600">
                        {(selectedPattern.employeeName || selectedPattern.employeeId).substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedPattern.employeeName || `Employee ${selectedPattern.employeeId.slice(-6)}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Risk Score: {selectedPattern.overallRiskScore}/100
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPattern(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedPattern.patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        pattern.severity === 'high'
                          ? 'bg-red-50 border-red-200'
                          : pattern.severity === 'medium'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getPatternTypeIcon(pattern.type)}</span>
                        <span className="font-semibold text-gray-900">{getPatternTypeName(pattern.type)}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          pattern.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : pattern.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {pattern.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{pattern.description}</p>
                      <p className="text-sm text-gray-500 italic mt-2">{pattern.suggestion}</p>

                      {pattern.occurrences.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Occurrences:</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {pattern.occurrences.map((occ, occIdx) => (
                              <div
                                key={occIdx}
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                              >
                                <div className="font-medium text-gray-900">
                                  {new Date(occ.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                {occ.details && (
                                  <div className="text-xs text-gray-500 truncate">{occ.details}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const employeeRequests = requests.filter(r => r.employeeId === selectedPattern.employeeId);
                    if (employeeRequests.length > 0) {
                      const latestRequest = employeeRequests.sort((a, b) =>
                        new Date(b.dates.from).getTime() - new Date(a.dates.from).getTime()
                      )[0];
                      openFlagModal(
                        latestRequest._id,
                        selectedPattern.patterns.map(p => getPatternTypeName(p.type)).join(', ')
                      );
                      setSelectedPattern(null);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Flag This Pattern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

