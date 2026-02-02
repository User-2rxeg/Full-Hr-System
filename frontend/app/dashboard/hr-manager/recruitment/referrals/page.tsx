'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getReferrals,
  createReferral,
  getApplications,
  getJobs,
  getEmployees,
} from '@/app/services/recruitment';
import { Application, JobRequisition } from '@/types/recruitment';

// REC-030: Tag candidates as referrals for preferential filtering
// Employees can refer candidates, giving them higher priority

export default function ReferralsPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobRequisition[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filter state - REC-030: Preferential filtering for referred candidates
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create form state
  const [formData, setFormData] = useState({
    candidateId: '',
    role: '',
    level: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [referralsData, applicationsData, jobsData, employeesData] = await Promise.all([
        getReferrals(),
        getApplications(),
        getJobs({ status: 'published' }),
        getEmployees(),
      ]);

      setReferrals(referralsData);
      setApplications(applicationsData);
      setJobs(jobsData);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load referrals');
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('User ID not found');
      return;
    }

    try {
      await createReferral({
        referringEmployeeId: user.id,
        candidateId: formData.candidateId,
        role: formData.role || undefined,
        level: formData.level || undefined,
      });

      alert('Referral created successfully!');
      setShowCreateModal(false);
      setFormData({ candidateId: '', role: '', level: '' });
      await fetchData();
    } catch (err: any) {
      alert(`Failed to create referral: ${err.message}`);
    }
  };

  const getCandidateName = (candidateId: string): string => {
    // candidateId from referral is actually the Application's MongoDB _id, not the candidateId field
    const application = applications.find((app) => app._id === candidateId || app.id === candidateId);
    return application?.candidateName || 'Unknown';
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find((emp) => emp._id === employeeId || emp.id === employeeId);
    if (employee) {
      return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
    }
    return 'Unknown Employee';
  };

  // Filter referrals based on status and search query (REC-030)
  const filteredReferrals = referrals.filter((referral: any) => {
    // Status filter
    const referralStatus = referral.status || 'pending';
    if (statusFilter !== 'all' && referralStatus.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const candidateName = getCandidateName(referral.candidateId).toLowerCase();
      const role = (referral.role || '').toLowerCase();
      const level = (referral.level || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      return candidateName.includes(query) || role.includes(query) || level.includes(query);
    }
    
    return true;
  });

  // Get unique statuses for the filter dropdown
  const uniqueStatuses = Array.from(new Set(referrals.map((r: any) => r.status || 'pending')));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading referrals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">{error}</p>
        <button onClick={fetchData} className="mt-2 text-destructive underline hover:text-destructive">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Referrals</h1>
          <p className="text-muted-foreground mt-1">Candidates referred by employees get higher priority</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Add Referral
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Total Referrals</div>
          <div className="text-2xl font-bold text-foreground mt-1">{referrals.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Your Referrals</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {referrals.filter((r: any) => r.referrerId === user?.id || r.referringEmployeeId === user?.id).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Active Candidates</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {applications.filter((app, index, self) => 
              index === self.findIndex((a) => a.candidateId === app.candidateId)
            ).length}
          </div>
        </div>
      </div>

      {/* Filters - REC-030: Preferential filtering */}
      <div className="bg-white rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1">Search</label>
          <input
            type="text"
            placeholder="Search by candidate name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-primary"
          />
        </div>
        <div className="sm:w-48">
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="contacted">Contacted</option>
            <option value="interviewed">Interviewed</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
            {uniqueStatuses
              .filter((s) => !['pending', 'contacted', 'interviewed', 'hired', 'rejected'].includes(s.toLowerCase()))
              .map((status) => (
                <option key={status} value={status.toLowerCase()}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
          </select>
        </div>
        {(statusFilter !== 'all' || searchQuery) && (
          <div className="flex items-end">
            <button
              onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {(statusFilter !== 'all' || searchQuery) && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredReferrals.length} of {referrals.length} referrals
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Referred By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                    {referrals.length === 0 ? 'No referrals found' : 'No referrals match your filters'}
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((referral: any) => (
                  <tr key={referral.id || referral._id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {getCandidateName(referral.candidateId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {referral.role || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {referral.level || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {getEmployeeName(referral.referringEmployeeId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                        {referral.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Referral</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Candidate *
                </label>
                <select
                  required
                  value={formData.candidateId}
                  onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2"
                >
                  <option value="">Select Candidate</option>
                  {applications
                    .filter((app, index, self) => 
                      index === self.findIndex((a) => a.candidateId === app.candidateId)
                    )
                    .filter(app => app._id) // Only show applications with MongoDB _id
                    .map((application) => (
                      <option key={application._id} value={application._id}>
                        {application.candidateName || 'Unknown'} - {application.candidateEmail || 'No email'}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Role (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Seniority Level (Optional)
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2"
                >
                  <option value="">Select Level</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-sm text-foreground">
                <strong>Note:</strong> Referred candidates receive priority in the screening process
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
