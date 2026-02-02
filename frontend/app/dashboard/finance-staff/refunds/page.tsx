'use client';

import { useState, useEffect } from 'react';
import { financeStaffService, RefundGeneration, PayrollCycle, RefundRequest, ApprovedDispute, ApprovedClaim } from '@/app/services/finance-staff';
import { employeeProfileService } from '@/app/services/employee-profile';
import { useAuth } from '@/context/AuthContext';
import { SystemRole } from '@/types';
import { Clock, CheckCircle, DollarSign, Loader2, Plus, X, Eye, User } from 'lucide-react';

export default function RefundsPage() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<RefundGeneration[]>([]);
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedDisputes, setApprovedDisputes] = useState<ApprovedDispute[]>([]);
  const [approvedClaims, setApprovedClaims] = useState<ApprovedClaim[]>([]);
  const [employeeNames, setEmployeeNames] = useState<Record<string, string>>({});

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundGeneration | null>(null);
  const [refundType, setRefundType] = useState<'dispute' | 'claim'>('dispute');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDescription, setRefundDescription] = useState('');
  const [refundEmployeeId, setRefundEmployeeId] = useState('');
  const [targetPayrollCycle, setTargetPayrollCycle] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  // Helper to safely convert any value to string (NEVER returns objects)
  const safeString = (value: any, defaultValue: string = 'N/A'): string => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value._id) return String(value._id);
      return defaultValue;
    }
    return String(value);
  };

  useEffect(() => {
    if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [refundsResponse, cyclesResponse, disputesRes, claimsRes] = await Promise.all([
        financeStaffService.getRefunds(),
        financeStaffService.getPayrollCycles(),
        financeStaffService.getApprovedDisputes(),
        financeStaffService.getApprovedClaims(),
      ]);

      const loadedRefunds = refundsResponse.data || [];
      if (refundsResponse.data) setRefunds(loadedRefunds);
      if (cyclesResponse.data) setPayrollCycles(cyclesResponse.data);
      if (disputesRes.data) setApprovedDisputes(disputesRes.data);
      if (claimsRes.data) setApprovedClaims(claimsRes.data);

      // Fetch all employees to build a name map
      const namesMap: Record<string, string> = {};

      try {
        // Try to get all employees at once (more efficient than individual calls)
        const employeesResponse = await employeeProfileService.getAllEmployees(1, 500) as any;
        const employees = employeesResponse?.data?.employees || employeesResponse?.data || employeesResponse || [];

        if (Array.isArray(employees)) {
          employees.forEach((emp: any) => {
            const empId = emp._id || emp.id;
            if (empId) {
              const firstName = emp.firstName || emp.personalInfo?.firstName || '';
              const lastName = emp.lastName || emp.personalInfo?.lastName || '';
              const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
              namesMap[empId] = fullName || emp.employeeNumber || emp.email?.split('@')[0] || 'Unknown';
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch employee list:', err);
      }

      // Also add names from approved disputes and claims
      if (disputesRes.data) {
        disputesRes.data.forEach((d: ApprovedDispute) => {
          if (d.employeeId && d.employeeName) {
            namesMap[d.employeeId] = d.employeeName;
          }
        });
      }

      if (claimsRes.data) {
        claimsRes.data.forEach((c: ApprovedClaim) => {
          if (c.employeeId && c.employeeName) {
            namesMap[c.employeeId] = c.employeeName;
          }
        });
      }

      setEmployeeNames(namesMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSourceId('');
    setRefundAmount('');
    setRefundDescription('');
    setRefundEmployeeId('');
    setRefundNotes('');
    setRefundType('dispute');
  };

  const handleSourceChange = (id: string) => {
    setSelectedSourceId(id);
    if (!id) {
      setRefundEmployeeId('');
      setRefundDescription('');
      setRefundAmount('');
      return;
    }

    if (refundType === 'dispute') {
      const dispute = approvedDisputes.find(d => d.id === id);
      if (dispute) {
        setRefundEmployeeId(dispute.employeeId);
        setRefundDescription(dispute.description);
        setRefundAmount(dispute.amount.toString());
      }
    } else {
      const claim = approvedClaims.find(c => c.id === id);
      if (claim) {
        setRefundEmployeeId(claim.employeeId);
        setRefundDescription(claim.description);
        setRefundAmount(claim.amount.toString());
      }
    }
  };

  const handleGenerateRefund = async () => {
    const refundRequest = {
      [refundType === 'dispute' ? 'disputeId' : 'claimId']: selectedSourceId,
      refundDetails: {
        description: refundDescription,
        amount: parseFloat(refundAmount)
      },
      employeeId: refundEmployeeId,
      financeStaffId: user?.id || '',
      status: 'pending' as const
    };

    try {
      const response = await financeStaffService.generateRefund(refundRequest, user?.id || '');
      if (response.data) {
        setRefunds(prev => [response.data!, ...prev]);
        setShowGenerateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to generate refund:', error);
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    try {
      const response = await financeStaffService.processRefund(refundId);
      if (response.data) {
        setRefunds(prev => prev.map(r => r._id === refundId ? response.data! : r));
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const handleUpdateRefundStatus = async (refundId: string, status: RefundGeneration['status']) => {
    try {
      const response = await financeStaffService.updateRefundStatus(refundId, status, refundNotes);
      if (response.data) {
        setRefunds(prev => prev.map(r => r._id === refundId ? response.data! : r));
        setSelectedRefund(null);
      }
    } catch (error) {
      console.error('Failed to update refund status:', error);
    }
  };

  if (!user?.role || ![SystemRole.FINANCE_STAFF, SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN].includes(user.role as SystemRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Finance Staff role required.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/30';
      case 'processed': return 'bg-info/10 text-info border-info/30';
      case 'paid': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'dispute' ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' : 'bg-success/10 text-success border-success/30';
  };

  // Helper to get employee name from the map
  const getEmployeeName = (employeeId: any): string => {
    if (!employeeId) return 'Unknown Employee';
    const id = typeof employeeId === 'object' && employeeId !== null
      ? (employeeId._id || String(employeeId))
      : String(employeeId);

    // Return the name if we have it, otherwise show a cleaner fallback
    if (employeeNames[id]) {
      return employeeNames[id];
    }

    // If ID is a valid MongoDB ObjectId (24 chars hex), don't show it raw
    if (id.length === 24 && /^[a-f0-9]+$/i.test(id)) {
      return 'Employee (Name not available)';
    }

    return id; // Return the ID if it might be a readable employee number
  };

  // Helper to get employee ID string (shortened for display)
  const getEmployeeIdString = (employeeId: any): string => {
    if (!employeeId) return '';
    if (typeof employeeId === 'object' && employeeId !== null) {
      const id = employeeId._id || String(employeeId);
      return id.length > 8 ? `...${id.slice(-8)}` : id;
    }
    const id = String(employeeId);
    return id.length > 8 ? `...${id.slice(-8)}` : id;
  };

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Refund Generation</h1>
          <p className="text-muted-foreground mt-1">Generate and manage refunds for approved disputes and claims</p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Generate Refund
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Refunds</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {refunds.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Processed Refunds</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {refunds.filter(r => r.status === 'processed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-info" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid Refunds</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {refunds.filter(r => r.status === 'paid').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Refunds List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">All Refunds</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-2">Loading refunds...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Employee</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refunds.map((refund) => (
                  <tr key={refund._id || `${refund.claimId || refund.disputeId}-${refund.createdAt}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${getTypeColor(refund.claimId ? 'claim' : 'dispute')}`}>
                        {refund.claimId ? 'Claim' : refund.disputeId ? 'Dispute' : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{getEmployeeName(refund.employeeId)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground max-w-[200px] truncate">
                      {safeString(refund.refundDetails?.description, 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      ${refund.refundDetails?.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${getStatusColor(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {refund.createdAt ? new Date(refund.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {refunds.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto opacity-30 mb-4" />
                No refunds found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate Refund Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Generate Refund</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Refund Type</label>
                <select
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={refundType}
                  onChange={(e) => {
                    setRefundType(e.target.value as any);
                    handleSourceChange('');
                  }}
                >
                  <option value="dispute">Dispute Refund</option>
                  <option value="claim">Expense Claim Refund</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {refundType === 'dispute' ? 'Approved Dispute' : 'Approved Expense Claim'}
                </label>
                <select
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedSourceId}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  required
                >
                  <option value="">Select a {refundType}</option>
                  {refundType === 'dispute'
                    ? approvedDisputes.map(d => (
                      <option key={d.id} value={d.id}>
                        {getEmployeeName(d.employeeId)} - {d.description ? (d.description.length > 30 ? d.description.substring(0, 30) + '...' : d.description) : 'No description'} (${d.amount})
                      </option>
                    ))
                    : approvedClaims.map(c => (
                      <option key={c.id} value={c.id}>
                        {getEmployeeName(c.employeeId)} - {c.description ? (c.description.length > 30 ? c.description.substring(0, 30) + '...' : c.description) : 'No description'} (${c.amount})
                      </option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Employee</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-border bg-muted/30 rounded-xl outline-none cursor-not-allowed text-muted-foreground"
                  value={refundEmployeeId ? getEmployeeName(refundEmployeeId) : ''}
                  readOnly
                  placeholder="Fetched automatically"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-3 border border-border bg-muted/30 rounded-xl outline-none cursor-not-allowed text-muted-foreground resize-none"
                  value={refundDescription}
                  readOnly
                  rows={3}
                  placeholder="Fetched from source"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-border bg-muted/30 rounded-xl outline-none cursor-not-allowed text-muted-foreground"
                  value={refundAmount ? `$${parseFloat(refundAmount).toLocaleString()}` : ''}
                  readOnly
                  placeholder="$0.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateRefund}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                Generate Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Details Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Refund Details</h3>
              <button
                onClick={() => setSelectedRefund(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <span className={`block mt-1 px-2.5 py-1 text-xs font-medium rounded-lg border w-fit ${getTypeColor(selectedRefund.claimId ? 'claim' : 'dispute')}`}>
                    {selectedRefund.claimId ? 'Claim' : selectedRefund.disputeId ? 'Dispute' : 'Unknown'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <span className={`block mt-1 px-2.5 py-1 text-xs font-medium rounded-lg border w-fit ${getStatusColor(selectedRefund.status)}`}>
                    {selectedRefund.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee</label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{getEmployeeName(selectedRefund.employeeId)}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Source Reference</label>
                <p className="text-foreground mt-1 text-sm">{selectedRefund.claimId ? `Claim: ${safeString(selectedRefund.claimId).substring(0, 8)}...` : selectedRefund.disputeId ? `Dispute: ${safeString(selectedRefund.disputeId).substring(0, 8)}...` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-foreground mt-1">{safeString(selectedRefund.refundDetails?.description, 'No description')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-foreground font-semibold mt-1">${selectedRefund.refundDetails?.amount?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-foreground mt-1">{selectedRefund.createdAt ? new Date(selectedRefund.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              {selectedRefund.financeStaffId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Processed By</label>
                  <p className="text-foreground mt-1 text-sm">{getEmployeeName(selectedRefund.financeStaffId)}</p>
                </div>
              )}
              {selectedRefund.paidInPayrollRunId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Paid in Payroll Run</label>
                  <p className="text-foreground mt-1 text-sm">Run: {safeString(selectedRefund.paidInPayrollRunId).substring(0, 8)}...</p>
                </div>
              )}
              {selectedRefund.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedRefund(null)}
                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
