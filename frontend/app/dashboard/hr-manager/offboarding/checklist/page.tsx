'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  ClearanceChecklist,
  ClearanceCompletionStatus,
  TerminationRequest,
  TerminationStatus,
  ApprovalStatus,
} from '@/app/services/offboarding';

export default function ClearanceChecklistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<ClearanceChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<ClearanceChecklist | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ClearanceCompletionStatus | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvedTerminations, setApprovedTerminations] = useState<TerminationRequest[]>([]);
  const [selectedForCreate, setSelectedForCreate] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all checklists
      const checklistsData = await offboardingService.getAllClearanceChecklists();
      setChecklists(checklistsData || []);

      // Fetch approved terminations for creating new checklists
      const approved = await offboardingService.getTerminationRequestsByStatus(TerminationStatus.APPROVED);
      setApprovedTerminations(approved || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clearance checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForCreate) {
      setError('Please select a termination request');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await offboardingService.createClearanceChecklist({
        terminationId: selectedForCreate,
        items: [
          { department: 'IT' },
          { department: 'Finance' },
          { department: 'Facilities' },
          { department: 'HR' },
          { department: 'Admin' },
        ],
      });

      setSuccess('Clearance checklist created successfully');
      setShowCreateForm(false);
      setSelectedForCreate('');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create clearance checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectChecklist = async (checklist: ClearanceChecklist) => {
    setSelectedChecklist(checklist);
    try {
      const status = await offboardingService.getClearanceCompletionStatus(checklist._id);
      setCompletionStatus(status);
    } catch (err: any) {
      setError('Failed to fetch checklist status');
    }
  };

  const handleUpdateItemStatus = async (department: string, status: ApprovalStatus, comments: string) => {
    if (!selectedChecklist) return;

    try {
      setSubmitting(true);
      setError(null);

      await offboardingService.updateClearanceItem(selectedChecklist._id, {
        department,
        status,
        comments: comments || undefined,
        updatedBy: 'current-user-id', // TODO: Get from context
      });

      setSuccess(`${department} status updated to ${status}`);
      await handleSelectChecklist(selectedChecklist);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update item status');
    } finally {
      setSubmitting(false);
    }
  };

  const getCompletionPercentage = (completionStatus: ClearanceCompletionStatus | null, checklist: ClearanceChecklist | null) => {
    if (!completionStatus || !checklist) return 0;
    const approvedCount = checklist.items.filter((i) => i.status === 'approved').length;
    return Math.round((approvedCount / checklist.items.length) * 100);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Clearance Checklist</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Exit Clearance Checklists</h1>
          <p className="text-muted-foreground mt-1">
            OFF-006, OFF-010: Manage multi-department clearance sign-offs and asset recovery (IT, Finance, Facilities, HR, Admin)
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create Checklist'}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Create Clearance Checklist</h2>
          <form onSubmit={handleCreateChecklist} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Approved Termination <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedForCreate}
                onChange={(e) => setSelectedForCreate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-ring"
                required
              >
                <option value="">-- Select a termination --</option>
                {approvedTerminations.map((term) => (
                  <option key={term._id} value={term._id}>
                    {term.employeeId} - {term.reason.substring(0, 40)}...
                  </option>
                ))}
              </select>
              {approvedTerminations.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  No approved terminations available. Please approve a termination first.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || approvedTerminations.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Checklist'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-input text-foreground rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Checklists List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: List of Checklists */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Checklists ({checklists.length})</h2>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {checklists.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No clearance checklists found.</p>
                </div>
              ) : (
                checklists.map((checklist) => (
                  <button
                    key={checklist._id}
                    onClick={() => handleSelectChecklist(checklist)}
                    className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                      selectedChecklist?._id === checklist._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <p className="font-medium text-foreground">Termination: {checklist.terminationId.toString().slice(0, 8)}...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created: {new Date(checklist.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Checklist Details */}
        {selectedChecklist && completionStatus && (
          <div className="lg:col-span-2 space-y-6">
            {/* Overall Progress */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Progress Summary</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Completion</span>
                    <span className="text-sm text-muted-foreground">{getCompletionPercentage(completionStatus, selectedChecklist)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${getCompletionPercentage(completionStatus, selectedChecklist)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-sm text-muted-foreground">All Departments Cleared</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {completionStatus.allDepartmentsCleared ? '✓' : '✗'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-sm text-muted-foreground">Equipment Returned</p>
                    <p className="text-2xl font-bold text-green-600">
                      {completionStatus.allEquipmentReturned ? '✓' : '✗'}
                    </p>
                  </div>
                </div>

                {completionStatus.fullyCleared && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded text-green-700 font-semibold">
                    ✓ Clearance checklist is fully complete!
                  </div>
                )}
              </div>
            </div>

            {/* Department Approvals */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Department Sign-offs</h2>
              <div className="space-y-3">
                {selectedChecklist.items.map((item) => (
                  <div key={item.department} className="border border-border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-foreground">{item.department}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === ApprovalStatus.APPROVED
                            ? 'bg-green-100 text-green-700'
                            : item.status === ApprovalStatus.REJECTED
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.comments && (
                      <p className="text-sm text-muted-foreground mb-3">Comments: {item.comments}</p>
                    )}
                    {item.status !== ApprovalStatus.APPROVED && item.status !== ApprovalStatus.REJECTED && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          id={`${item.department}-comments`}
                          placeholder="Add comments..."
                          className="w-full px-3 py-1 bg-background border border-input rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const comments = (
                                document.getElementById(`${item.department}-comments`) as HTMLInputElement
                              )?.value;
                              handleUpdateItemStatus(item.department, ApprovalStatus.APPROVED, comments);
                            }}
                            disabled={submitting}
                            className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const comments = (
                                document.getElementById(`${item.department}-comments`) as HTMLInputElement
                              )?.value;
                              handleUpdateItemStatus(item.department, ApprovalStatus.REJECTED, comments);
                            }}
                            disabled={submitting}
                            className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment Status */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Equipment Return Status</h2>
              <div className="space-y-3">
                {selectedChecklist.equipmentList.map((equip, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border border-border rounded">
                    <div>
                      <p className="font-medium text-foreground">{equip.name}</p>
                      {equip.condition && (
                        <p className="text-sm text-muted-foreground">Condition: {equip.condition}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        equip.returned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {equip.returned ? 'Returned' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 border border-border rounded flex justify-between items-center">
                <p className="font-medium text-foreground">Access Card</p>
                <span
                  className={`px-3 py-1 rounded text-sm font-semibold ${
                    selectedChecklist.cardReturned
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {selectedChecklist.cardReturned ? 'Returned' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {!selectedChecklist && (
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <p className="text-muted-foreground">Select a checklist to view and manage clearance items</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

