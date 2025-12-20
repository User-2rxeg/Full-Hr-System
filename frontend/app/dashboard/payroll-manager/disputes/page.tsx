'use client';

import { useState, useEffect } from 'react';
import { payrollManagerService, DisputeConfirmation } from '@/app/services/payroll-manager';
import { useAuth } from '@/app/context/AuthContext';
import { SystemRole } from '@/app/types';

export default function PayrollManagerDisputesPage() {
  const { user } = useAuth();
  const allowedRoles = [SystemRole.PAYROLL_MANAGER, SystemRole.HR_ADMIN];
  const hasAccess = !!user && allowedRoles.includes(user.role);
  const [allDisputes, setAllDisputes] = useState<DisputeConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeConfirmation | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'reject'>('approve');
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!hasAccess) return;
    loadDisputes();
  }, [user, hasAccess]);

  const loadDisputes = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Fetch all disputes: pending, approved, and rejected
      const response = await payrollManagerService.getAllDisputes().catch(() => ({ data: [], error: null }));
      
      const allDisputesData = (response.data && Array.isArray(response.data)) ? response.data : [];
      
      setAllDisputes(allDisputesData);
      
      if (response.error) {
        console.error('Error fetching disputes:', response.error);
      }
    } catch (err) {
      console.error('Error loading disputes:', err);
      setError('Failed to load disputes. Please try again.');
      setAllDisputes([]);
    } finally {
      setLoading(false);
    }
  };
      
  const openConfirmModal = (dispute: DisputeConfirmation, action: 'approve' | 'reject') => {
    setSelectedDispute(dispute);
    setConfirmationAction(action);
    setConfirmationNotes('');
    setShowConfirmModal(true);
  };

  const handleConfirmation = async () => {
    if (!selectedDispute || !user?.id) {
      setError('Missing dispute or user information');
      return;
    }
    try {
      const response = await payrollManagerService.confirmDispute({
        disputeId: selectedDispute.id,
        confirmed: confirmationAction === 'approve',
        notes: confirmationNotes,
      }, user.id);
      if (response.error) {
        setError(`Failed to ${confirmationAction} dispute: ${response.error}`);
        return;
      }
      if (response.data) {
        setSuccessMessage(`Dispute ${confirmationAction === 'approve' ? 'approved' : 'rejected'} successfully`);
        setShowConfirmModal(false);
        setSelectedDispute(null);
        setConfirmationNotes('');
        await loadDisputes();
      }
    } catch (error) {
      setError(`Failed to ${confirmationAction} dispute. Please try again.`);
    } finally {
      setLoading(false);
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending payroll Manager approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterDisputes = () => {
    if (statusFilter === 'all') {
      // Show only disputes that are pending manager approval (accepted by specialist)
      return allDisputes.filter(d => {
        const s = (d.status || '').toLowerCase();
        return s.includes('pending') && s.includes('manager') && s.includes('approval');
      });
    }
    if (statusFilter === 'approved') {
      return allDisputes.filter(d => d.status?.toLowerCase() === 'approved' || d.status?.toLowerCase() === 'confirmed');
    }
    if (statusFilter === 'rejected') {
      return allDisputes.filter(d => d.status?.toLowerCase() === 'rejected');
    }
    return [];
  };

  const disputes = filterDisputes();



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Access denied. Payroll Manager role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Disputes Approval</h1>
          <p className="text-slate-600 mt-1">Disputes approved by Payroll Specialists awaiting your confirmation</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'all'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-orange-400'
          }`}
        >
          All Claims/Disputes
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'approved'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-green-400'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm transition-colors shadow-sm ${
            statusFilter === 'rejected'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-red-400'
          }`}
        >
          Rejected
        </button>
      </div>

      {/* Disputes List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {statusFilter === 'all' 
              ? `Pending Disputes (${disputes.length})`
              : statusFilter === 'approved'
              ? `Approved Disputes (${disputes.length})`
              : `Rejected Disputes (${disputes.length})`}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {statusFilter === 'all' 
              ? 'Disputes accepted by specialist, awaiting your approval'
              : statusFilter === 'approved'
              ? 'Disputes that have been approved'
              : 'Disputes that have been rejected'}
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-2">Loading disputes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Specialist Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Manager Comments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {disputes.map((dispute, index) => (
                  <tr key={`dispute-${dispute.id || dispute.employeeNumber || index}-${index}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{dispute.employeeName}</div>
                        <div className="text-xs text-slate-500">{dispute.employeeNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-xs truncate">
                        {dispute.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {dispute.amount ? `$${dispute.amount.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-xs">
                        {dispute.specialistNotes ? (
                          <span className="text-slate-700">{dispute.specialistNotes}</span>
                        ) : (
                          <span className="text-slate-400 italic">No comment</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 max-w-xs">
                        {dispute.managerNotes ? (
                          <span className="text-slate-700">{dispute.managerNotes}</span>
                        ) : (
                          <span className="text-slate-400 italic">No comment</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {dispute.status?.toLowerCase().includes('pending') ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openConfirmModal(dispute, 'approve')}
                            className="text-green-600 hover:text-green-800"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openConfirmModal(dispute, 'reject')}
                            className="text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disputes.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                {statusFilter === 'all' 
                  ? 'No disputes pending your approval'
                  : statusFilter === 'approved'
                  ? 'No approved disputes found'
                  : 'No rejected disputes found'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {confirmationAction === 'approve' ? 'Approve' : 'Reject'} Dispute
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Dispute</label>
                <p className="text-slate-900">{selectedDispute.description}</p>
                <p className="text-sm text-slate-600">{selectedDispute.employeeName}</p>
                <p className="text-sm text-slate-600">Amount: {selectedDispute.amount ? `$${selectedDispute.amount.toLocaleString()}` : 'N/A'}</p>
              </div>
              {selectedDispute.specialistNotes && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Specialist Comment</label>
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {selectedDispute.specialistNotes}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add your notes..."
                  value={confirmationNotes}
                  onChange={(e) => setConfirmationNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedDispute(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmation}
                className={`px-4 py-2 text-white rounded-lg ${
                  confirmationAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmationAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
