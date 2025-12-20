'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, ApprovedDispute, ApprovedClaim } from '@/app/services/finance-staff';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [approvedDisputes, setApprovedDisputes] = useState<ApprovedDispute[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ApprovedClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'disputes' | 'claims'>('disputes');
  const [readItems, setReadItems] = useState<{ disputes: Set<string>; claims: Set<string> }>({
    disputes: new Set(),
    claims: new Set(),
  });
  const [generatingRefund, setGeneratingRefund] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const allowedRoles = [SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (!hasAccess) return;
    loadNotifications();
    loadReadStatus();
  }, [user]);

  const loadReadStatus = () => {
    try {
      const stored = localStorage.getItem('financeNotificationsRead');
      if (stored) {
        const parsed = JSON.parse(stored);
        setReadItems({
          disputes: new Set(parsed.disputes || []),
          claims: new Set(parsed.claims || []),
        });
      }
    } catch (error) {
      console.error('Failed to load read status:', error);
    }
  };

  const saveReadStatus = (newReadItems: { disputes: Set<string>; claims: Set<string> }) => {
    try {
      localStorage.setItem('financeNotificationsRead', JSON.stringify({
        disputes: Array.from(newReadItems.disputes),
        claims: Array.from(newReadItems.claims),
      }));
    } catch (error) {
      console.error('Failed to save read status:', error);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [disputesResponse, claimsResponse] = await Promise.all([
        financeStaffService.getApprovedDisputes(),
        financeStaffService.getApprovedClaims(),
      ]);

      console.log('[Notifications] Disputes response:', disputesResponse.data);
      console.log('[Notifications] Claims response:', claimsResponse.data);

      // Transform data to ensure all fields are strings, not objects
      if (disputesResponse.data) {
        const transformed = disputesResponse.data.map((d: any) => ({
          ...d,
          employeeId: typeof d.employeeId === 'string' ? d.employeeId : d.employeeId?._id || '',
          employeeName: typeof d.employeeName === 'string' ? d.employeeName : 'Unknown',
          employeeNumber: typeof d.employeeNumber === 'string' ? d.employeeNumber : 'N/A',
          department: typeof d.department === 'string' ? d.department : 'N/A',
          type: typeof d.type === 'string' ? d.type : 'Unknown',
          description: typeof d.description === 'string' ? d.description : '',
          period: typeof d.period === 'string' ? d.period : 'N/A',
          approvedBy: typeof d.approvedBy === 'string' ? d.approvedBy : 'System',
          priority: typeof d.priority === 'string' ? d.priority : 'medium',
          refundStatus: typeof d.refundStatus === 'string' ? d.refundStatus : 'pending',
        }));
        console.log('[Notifications] Transformed disputes:', transformed);
        setApprovedDisputes(transformed);
      }

      if (claimsResponse.data) {
        const transformed = claimsResponse.data.map((c: any) => ({
          ...c,
          employeeId: typeof c.employeeId === 'string' ? c.employeeId : c.employeeId?._id || '',
          employeeName: typeof c.employeeName === 'string' ? c.employeeName : 'Unknown',
          employeeNumber: typeof c.employeeNumber === 'string' ? c.employeeNumber : 'N/A',
          department: typeof c.department === 'string' ? c.department : 'N/A',
          title: typeof c.title === 'string' ? c.title : 'Expense Claim',
          description: typeof c.description === 'string' ? c.description : '',
          category: typeof c.category === 'string' ? c.category : 'General',
          period: typeof c.period === 'string' ? c.period : 'N/A',
          approvedBy: typeof c.approvedBy === 'string' ? c.approvedBy : 'Unknown',
          priority: typeof c.priority === 'string' ? c.priority : 'medium',
          refundStatus: typeof c.refundStatus === 'string' ? c.refundStatus : 'pending',
        }));
        console.log('[Notifications] Transformed claims:', transformed);
        setApprovedClaims(transformed);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (type: 'dispute' | 'claim', id: string) => {
    try {
      await financeStaffService.markNotificationAsRead(type, id);

      // Update local read status
      const newReadItems = {
        disputes: new Set(readItems.disputes),
        claims: new Set(readItems.claims),
      };

      if (type === 'dispute') {
        newReadItems.disputes.add(id);
      } else {
        newReadItems.claims.add(id);
      }

      setReadItems(newReadItems);
      saveReadStatus(newReadItems);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleGenerateRefund = async (
    type: 'dispute' | 'claim',
    id: string,
    amount: number,
    employeeId: string,
    description: string
  ) => {
    if (!user?.id) {
      setRefundError('User not authenticated');
      return;
    }

    setGeneratingRefund(id);
    setRefundError(null);
    setRefundSuccess(null);

    try {
      await financeStaffService.generateRefund(
        {
          disputeId: type === 'dispute' ? id : undefined,
          claimId: type === 'claim' ? id : undefined,
          employeeId,
          financeStaffId: user.id,
          refundDetails: {
            amount,
            description: description || `Refund for ${type} - ${id}`,
          },
        },
        user.id
      );

      setRefundSuccess(`Refund generated successfully for ${type}`);
      // Reload notifications to update refund status
      await loadNotifications();

      // Auto-clear success message after 3 seconds
      setTimeout(() => setRefundSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to generate refund:', error);
      setRefundError(error.response?.data?.message || `Failed to generate refund for ${type}`);
      // Auto-clear error message after 5 seconds
      setTimeout(() => setRefundError(null), 5000);
    } finally {
      setGeneratingRefund(null);
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  const renderDisputes = () => {
    // Helper to safely convert any value to string (NEVER returns objects)
    const safeString = (value: any, defaultValue: string = 'N/A'): string => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        // For objects, try to extract useful string value
        if (value._id) return String(value._id);
        if (value.toString && value.toString() !== '[object Object]') return value.toString();
        return defaultValue;
      }
      return String(value);
    };

    // Helper to safely extract employee name (ALWAYS returns string)
    const getEmployeeName = (dispute: any): string => {
      if (typeof dispute.employeeName === 'string') return dispute.employeeName;
      if (typeof dispute.employeeId === 'object' && dispute.employeeId) {
        const emp = dispute.employeeId;
        const firstName = safeString(emp.firstName, '');
        const lastName = safeString(emp.lastName, '');
        return `${firstName} ${lastName}`.trim() || 'Unknown';
      }
      return 'Unknown';
    };

    // Helper to safely extract employee number (ALWAYS returns string)
    const getEmployeeNumber = (dispute: any): string => {
      if (typeof dispute.employeeNumber === 'string') return dispute.employeeNumber;
      if (typeof dispute.employeeId === 'object' && dispute.employeeId) {
        // Try multiple possible locations for employee number
        if (dispute.employeeId.employeeId) return safeString(dispute.employeeId.employeeId, 'N/A');
        if (dispute.employeeId.employeeNumber) return safeString(dispute.employeeId.employeeNumber, 'N/A');
      }
      return 'N/A';
    };

    return (
      <div className="space-y-4">
        {approvedDisputes.map((dispute) => {
          const isRead = readItems.disputes.has(dispute.id);
          return (
            <div key={dispute.id} className={`border rounded-lg p-4 transition-all ${isRead
              ? 'bg-slate-50 border-slate-200 opacity-75'
              : 'bg-white border-blue-200 shadow-sm'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {!isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" title="Unread"></div>
                    )}
                    <h3 className="font-medium text-slate-900">{getEmployeeName(dispute)}</h3>
                    <span className="text-sm text-slate-500">{getEmployeeNumber(dispute)}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${dispute.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      dispute.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        dispute.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                      {safeString(dispute.priority, 'medium')}
                    </span>
                    {dispute.needsRefund && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Needs Refund
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{safeString(dispute.department)}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-slate-900">{safeString(dispute.type, 'Unknown')}</p>
                    <p className="text-sm text-slate-600 mt-1">{safeString(dispute.description)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div key="amount">
                      <p className="text-slate-500">Amount</p>
                      <p className="font-medium text-slate-900">${dispute.amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div key="period">
                      <p className="text-slate-500">Period</p>
                      <p className="font-medium text-slate-900">{safeString(dispute.period)}</p>
                    </div>
                    <div key="approvedBy">
                      <p className="text-slate-500">Approved By</p>
                      <p className="font-medium text-slate-900">{safeString(dispute.approvedBy, 'System')}</p>
                    </div>
                    <div key="refundStatus">
                      <p className="text-slate-500">Refund Status</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${dispute.refundStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        dispute.refundStatus === 'processed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {safeString(dispute.refundStatus, 'pending')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Approved on {dispute.approvedAt ? new Date(dispute.approvedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {isRead ? (
                    <span className="text-slate-400 text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkAsRead('dispute', dispute.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Mark as Read
                    </button>
                  )}

                  {/* REQ-PY-45: Generate refund for disputes */}
                  {dispute.needsRefund && dispute.refundStatus === 'pending' && (
                    <button
                      onClick={() => handleGenerateRefund(
                        'dispute',
                        dispute.id,
                        dispute.amount,
                        String(dispute.employeeId || ''),
                        dispute.description || `Refund for ${dispute.type}`
                      )}
                      disabled={generatingRefund === dispute.id}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${generatingRefund === dispute.id
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                      {generatingRefund === dispute.id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        '💰 Generate Refund'
                      )}
                    </button>
                  )}

                  {dispute.refundStatus === 'processed' && (
                    <span className="text-green-600 text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Refund Generated
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {approvedDisputes.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No approved disputes found
          </div>
        )}
      </div>
    );
  };

  const renderClaims = () => {
    // Helper to safely convert any value to string (NEVER returns objects)
    const safeString = (value: any, defaultValue: string = 'N/A'): string => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        // For objects, try to extract useful string value
        if (value._id) return String(value._id);
        if (value.toString && value.toString() !== '[object Object]') return value.toString();
        return defaultValue;
      }
      return String(value);
    };

    // Helper to safely extract employee name (ALWAYS returns string)
    const getEmployeeName = (claim: any): string => {
      if (typeof claim.employeeName === 'string') return claim.employeeName;
      if (typeof claim.employeeId === 'object' && claim.employeeId) {
        const emp = claim.employeeId;
        const firstName = safeString(emp.firstName, '');
        const lastName = safeString(emp.lastName, '');
        return `${firstName} ${lastName}`.trim() || 'Unknown';
      }
      return 'Unknown';
    };

    // Helper to safely extract employee number (ALWAYS returns string)
    const getEmployeeNumber = (claim: any): string => {
      if (typeof claim.employeeNumber === 'string') return claim.employeeNumber;
      if (typeof claim.employeeId === 'object' && claim.employeeId) {
        // Try multiple possible locations for employee number
        if (claim.employeeId.employeeId) return safeString(claim.employeeId.employeeId, 'N/A');
        if (claim.employeeId.employeeNumber) return safeString(claim.employeeId.employeeNumber, 'N/A');
      }
      return 'N/A';
    };

    return (
      <div className="space-y-4">
        {approvedClaims.map((claim) => {
          const isRead = readItems.claims.has(claim.id);
          return (
            <div key={claim.id} className={`border rounded-lg p-4 transition-all ${isRead
              ? 'bg-slate-50 border-slate-200 opacity-75'
              : 'bg-white border-blue-200 shadow-sm'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {!isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" title="Unread"></div>
                    )}
                    <h3 className="font-medium text-slate-900">{getEmployeeName(claim)}</h3>
                    <span className="text-sm text-slate-500">{getEmployeeNumber(claim)}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${claim.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      claim.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        claim.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                      {safeString(claim.priority, 'medium')}
                    </span>
                    {claim.needsRefund && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Needs Refund
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{safeString(claim.department)}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-slate-900">{safeString(claim.title, 'Expense Claim')}</p>
                    <p className="text-sm text-slate-600 mt-1">{safeString(claim.description)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div key="amount">
                      <p className="text-slate-500">Amount</p>
                      <p className="font-medium text-slate-900">${claim.amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div key="category">
                      <p className="text-slate-500">Category</p>
                      <p className="font-medium text-slate-900">{safeString(claim.category, 'General')}</p>
                    </div>
                    <div key="period">
                      <p className="text-slate-500">Period</p>
                      <p className="font-medium text-slate-900">{safeString(claim.period)}</p>
                    </div>
                    <div key="refundStatus">
                      <p className="text-slate-500">Refund Status</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${claim.refundStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        claim.refundStatus === 'processed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {safeString(claim.refundStatus, 'pending')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Approved on {claim.approvedAt ? new Date(claim.approvedAt).toLocaleDateString() : 'N/A'} by {safeString(claim.approvedBy, 'Unknown')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {isRead ? (
                    <span className="text-slate-400 text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkAsRead('claim', claim.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Mark as Read
                    </button>
                  )}

                  {/* REQ-PY-46: Generate refund for expense claims */}
                  {claim.needsRefund && claim.refundStatus === 'pending' && (
                    <button
                      onClick={() => handleGenerateRefund(
                        'claim',
                        claim.id,
                        claim.amount,
                        String(claim.employeeId || ''),
                        claim.description || `Refund for ${claim.title}`
                      )}
                      disabled={generatingRefund === claim.id}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${generatingRefund === claim.id
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                      {generatingRefund === claim.id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        '💰 Generate Refund'
                      )}
                    </button>
                  )}

                  {claim.refundStatus === 'processed' && (
                    <span className="text-green-600 text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Refund Generated
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {approvedClaims.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No approved claims found
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Approved Disputes and Claims Notifications</h1>
        <p className="text-white mt-1">View and manage approved disputes and expense claims for adjustments</p>
      </div>

      {/* Success/Error Messages */}
      {refundSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-medium">{refundSuccess}</p>
          </div>
        </div>
      )}

      {refundError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-medium">{refundError}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Approved Disputes</p>
              <p className="text-2xl font-bold text-slate-900">{approvedDisputes.length}</p>
              <p className="text-sm text-slate-500 mt-1">
                {approvedDisputes.filter(d => !readItems.disputes.has(d.id)).length} unread
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Approved Claims</p>
              <p className="text-2xl font-bold text-slate-900">{approvedClaims.length}</p>
              <p className="text-sm text-slate-500 mt-1">
                {approvedClaims.filter(c => !readItems.claims.has(c.id)).length} unread
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'disputes', label: 'Approved Disputes', count: approvedDisputes.length },
              { id: 'claims', label: 'Approved Claims', count: approvedClaims.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-500 mt-2">Loading notifications...</p>
            </div>
          ) : (
            <>
              {activeTab === 'disputes' && renderDisputes()}
              {activeTab === 'claims' && renderClaims()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
