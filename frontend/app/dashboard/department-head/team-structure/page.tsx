'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { organizationStructureService } from '@/app/services/organization-structure';

/**
 * Team Structure - Department Head
 * REQ-SANV-02: As a Manager, I want to view my team's structure and reporting lines
 * REQ-OSM-03: As a Manager, I want to submit requests for changes to the team assignments
 * BR 41: Direct Managers see their team only
 */

interface TeamMember {
  _id: string;
  positionId: {
    _id: string;
    title: string;
    code: string;
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    workEmail?: string;
  };
  startDate: string;
  endDate?: string;
}

interface ChangeRequest {
  _id: string;
  requestNumber: string;
  requestType: string;
  status: string;
  description: string;
  createdAt: string;
}

const requestTypeLabels: Record<string, string> = {
  NEW_DEPARTMENT: 'New Department',
  UPDATE_DEPARTMENT: 'Update Department',
  NEW_POSITION: 'New Position',
  UPDATE_POSITION: 'Update Position',
  CLOSE_POSITION: 'Close Position',
};

export default function TeamStructurePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myRequests, setMyRequests] = useState<ChangeRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [requestForm, setRequestForm] = useState({
    requestType: 'UPDATE_POSITION',
    description: '',
    justification: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assignmentsRes, requestsRes] = await Promise.all([
        organizationStructureService.searchAssignments(undefined, undefined, undefined, true),
        organizationStructureService.searchChangeRequests(undefined, undefined, user?.id),
      ]);

      // Extract team members from response
      if (assignmentsRes) {
        const resData = assignmentsRes.data || assignmentsRes;
        let members: TeamMember[] = [];
        if (Array.isArray(resData)) {
          members = resData;
        } else if ((resData as any)?.data && Array.isArray((resData as any).data)) {
          members = (resData as any).data;
        }
        // Filter out any invalid entries
        setTeamMembers(members.filter(m => m && m._id));
      }

      // Extract change requests from response
      if (requestsRes) {
        const resData = requestsRes.data || requestsRes;
        let requests: ChangeRequest[] = [];
        if (Array.isArray(resData)) {
          requests = resData;
        } else if ((resData as any)?.data && Array.isArray((resData as any).data)) {
          requests = (resData as any).data;
        }
        setMyRequests(requests.filter(r => r && r._id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load team structure');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestForm.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await organizationStructureService.createChangeRequest({
        requestType: requestForm.requestType,
        description: requestForm.description.trim(),
        justification: requestForm.justification.trim() || undefined,
      });

      setSuccess('Change request submitted successfully');
      setShowRequestModal(false);
      setRequestForm({
        requestType: 'UPDATE_POSITION',
        description: '',
        justification: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'APPROVED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-48 bg-muted rounded-xl"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Structure</h1>
            <p className="text-muted-foreground text-sm mt-1">
              REQ-SANV-02: View team structure and reporting lines
            </p>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Request Change
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="float-right">&times;</button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess(null)} className="float-right">&times;</button>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Team Members</h2>
            <p className="text-sm text-muted-foreground">Current team assignments and positions</p>
          </div>

          {teamMembers.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="font-medium text-foreground">No Team Members</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Team assignments will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teamMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {member.employeeProfileId?.firstName || 'Unknown'} {member.employeeProfileId?.lastName || ''}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.employeeProfileId?.employeeNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{member.positionId?.title || 'Unknown Position'}</div>
                        <div className="text-sm text-muted-foreground font-mono">{member.positionId?.code || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {member.startDate ? new Date(member.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {member.employeeProfileId?.workEmail || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My Change Requests */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">My Change Requests</h2>
            <p className="text-sm text-muted-foreground">REQ-OSM-03: Track submitted change requests</p>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-medium text-foreground">No Requests</h3>
              <p className="text-muted-foreground text-sm mt-1">
                You have not submitted any change requests
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Request</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{request.requestNumber}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-xs">{request.description}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {requestTypeLabels[request.requestType] || request.requestType}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusStyle(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Submit Change Request</h2>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Request Type
                  </label>
                  <select
                    value={requestForm.requestType}
                    onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="NEW_POSITION">Request New Position</option>
                    <option value="UPDATE_POSITION">Update Position</option>
                    <option value="CLOSE_POSITION">Close Position</option>
                    <option value="NEW_DEPARTMENT">Request New Department</option>
                    <option value="UPDATE_DEPARTMENT">Update Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Describe the change you are requesting..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Justification
                  </label>
                  <textarea
                    value={requestForm.justification}
                    onChange={(e) => setRequestForm({ ...requestForm, justification: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                    placeholder="Business justification for this change..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

