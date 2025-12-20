'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
// Type definitions based on your API response
interface TerminationBenefit {
  _id: string;
  name: string;
  amount: number;
  terms?: string; // Optional field
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

interface TerminationBenefitsResponse {
  data: TerminationBenefit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common termination benefit types for suggestion
const commonTerminationBenefits = [
  { value: 'End of Service Gratuity', label: 'End of Service Gratuity' },
  { value: 'Severance Package - Standard', label: 'Severance Package - Standard' },
  { value: 'Severance Package - Senior', label: 'Severance Package - Senior' },
  { value: 'Notice Period Pay', label: 'Notice Period Pay' },
  { value: 'Accrued Vacation Pay', label: 'Accrued Vacation Pay' },
  { value: 'Unused Sick Leave Pay', label: 'Unused Sick Leave Pay' },
  { value: 'Retirement Benefits', label: 'Retirement Benefits' },
  { value: 'Redundancy Package', label: 'Redundancy Package' },
  { value: 'Voluntary Resignation Package', label: 'Voluntary Resignation Package' },
  { value: 'Medical Benefits Continuation', label: 'Medical Benefits Continuation' },
];

const statusColors = {
  draft: 'bg-muted/10 text-muted-foreground',
  pending_approval: 'bg-warning/10 text-warning-foreground',
  approved: 'bg-success/10 text-success-foreground',
  rejected: 'bg-destructive/10 text-destructive-foreground',
};

const statusLabels = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function TerminationBenefitsPage() {
  const { user } = useAuth();
  const [terminationBenefits, setTerminationBenefits] = useState<TerminationBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTerminationBenefit, setSelectedTerminationBenefit] = useState<TerminationBenefit | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  });
  
  // Form state - terms is optional
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    terms: '',
  });

  // Fetch termination benefits on component mount and when filters change
  useEffect(() => {
    fetchTerminationBenefits();
  }, [pagination.page, filters]);

  const fetchTerminationBenefits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user ID for filtering (if needed)
      let currentUserId = '';
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            currentUserId = user.id || user._id || '';
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        createdByEmployeeId: currentUserId || undefined,
      };
      
      const response = await payrollConfigurationService.getTerminationBenefits(queryParams);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setTerminationBenefits([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        // Handle paginated response
        setTerminationBenefits(apiData.data);
        setPagination(prev => ({
          ...prev,
          total: apiData.total || 0,
          totalPages: apiData.totalPages || 0,
          page: apiData.page || 1,
          limit: apiData.limit || 10,
        }));
      } 
      else if (Array.isArray(apiData)) {
        // Handle non-paginated response
        setTerminationBenefits(apiData);
        setPagination(prev => ({
          ...prev,
          total: apiData.length,
          totalPages: 1,
        }));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setTerminationBenefits([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch termination benefits');
      console.error('Error fetching termination benefits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerminationBenefit = async () => {
  try {
    // Basic frontend validation - terms is optional
    if (!formData.name || !formData.amount) {
      setError('Please fill all required fields (Name and Amount)');
      return;
    }

    // Convert amount to number
    const amountNum = parseFloat(formData.amount);
    
    if (isNaN(amountNum) || amountNum < 0) {
      setError('Amount must be a valid number 0 or greater');
      return;
    }

    setActionLoading(true);
    
    // Get the employee ID - REQUIRED by backend DTO
    let createdByEmployeeId = user?.id || '';
    
    // Fallback to localStorage if user.id is not available
    if (!createdByEmployeeId) {
      try {
        const storedUser = localStorage.getItem('hr_system_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          createdByEmployeeId = userData.id || userData._id || '';
        }
      } catch (e) {
        console.error('Failed to get user from localStorage:', e);
      }
    }
    
    if (!createdByEmployeeId) {
      setError('Unable to identify user. Please make sure you are logged in.');
      setActionLoading(false);
      return;
    }
    
    // Validate that createdByEmployeeId looks like a MongoDB ObjectId
    // MongoDB ObjectIds are 24-character hex strings
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(createdByEmployeeId)) {
      console.warn('Employee ID does not look like a MongoDB ObjectId:', createdByEmployeeId);
      // Continue anyway - the backend validation will catch it
    }
    
    // Prepare data for backend - terms is optional
    const apiData: any = {
      name: formData.name,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    // Only add terms if it's not empty
    if (formData.terms.trim() !== '') {
      apiData.terms = formData.terms;
    }
    
    console.log('Creating termination benefit with data:', apiData);
    
    const response = await payrollConfigurationService.createTerminationBenefit(apiData);
    
    // Handle response
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Check for backend validation errors
    if (response.data) {
      const responseData = response.data as any;
      
      // Handle various error response formats
      if (responseData.message && responseData.message.includes('already exists')) {
        throw new Error(responseData.message);
      }
      else if (responseData.error) {
        throw new Error(responseData.error);
      }
      else if (responseData.statusCode && responseData.statusCode >= 400) {
        // Extract validation messages if available
        const errorMessage = responseData.message || 
                            responseData.error?.message || 
                            'Failed to create termination benefit';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Termination benefit created successfully as DRAFT');
    setShowCreateModal(false);
    resetForm();
    fetchTerminationBenefits();
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create termination benefit';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format specific error messages
    if (errorMessage.includes('already exists')) {
      errorMessage = `Termination benefit "${formData.name}" already exists. Please use a different name.`;
    }
    
    // Special handling for ObjectId conversion errors
    if (errorMessage.includes('ObjectId') || errorMessage.includes('Cast to ObjectId')) {
      errorMessage = 'User identification issue. Please try logging out and back in.';
    }
    
    setError(errorMessage);
  } finally {
    setActionLoading(false);
  }
};
  const handleUpdateTerminationBenefit = async () => {
    if (!selectedTerminationBenefit) return;
    
    try {
      // Basic frontend validation - terms is optional
      if (!formData.name || !formData.amount) {
        setError('Please fill all required fields (Name and Amount)');
        return;
      }

      // Convert amount to number
      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum) || amountNum < 0) {
        setError('Amount must be a valid number 0 or greater');
        return;
      }

      setActionLoading(true);
      
      // Prepare update data - terms is optional
      const updateData: any = {
        name: formData.name,
        amount: amountNum,
      };
      
      // Only add terms if it's not empty or if we're updating from existing value
      if (formData.terms.trim() !== '' || (selectedTerminationBenefit.terms && selectedTerminationBenefit.terms !== formData.terms)) {
        updateData.terms = formData.terms;
      }
      
      const response = await payrollConfigurationService.updateTerminationBenefit(
        selectedTerminationBenefit._id,
        updateData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Check for backend validation errors
      if (response.data) {
        const responseData = response.data as any;
        
        if (responseData.statusCode && responseData.statusCode >= 400) {
          const errorMessage = responseData.message || 
                              responseData.error?.message || 
                              'Failed to update termination benefit';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Termination benefit updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchTerminationBenefits();
    } catch (err: any) {
      console.error('Update error details:', err);
      
      let errorMessage = 'Failed to update termination benefit';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Format specific error messages
      if (errorMessage.includes('already exists')) {
        errorMessage = `Termination benefit "${formData.name}" already exists. Please use a different name.`;
      } else if (errorMessage.includes('Cannot update termination benefit with status')) {
        errorMessage = `Cannot update ${selectedTerminationBenefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be edited. Manual adjustments require specialist approval (BR27).`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTerminationBenefit = async (benefit: TerminationBenefit) => {
    if (!confirm(`Are you sure you want to delete the termination benefit "${benefit.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await payrollConfigurationService.deleteTerminationBenefit(benefit._id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess(`Termination benefit "${benefit.name}" deleted successfully`);
      fetchTerminationBenefits();
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = 'Failed to delete termination benefit';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Cannot delete termination benefit with status')) {
        errorMessage = `Cannot delete ${benefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be deleted.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (benefit: TerminationBenefit) => {
    // Check if termination benefit can be edited (only draft status)
    if (benefit.status !== 'draft') {
      setError(`Cannot edit ${benefit.status.toLowerCase()} termination benefit. Only DRAFT termination benefits can be edited. Manual adjustments require specialist approval (BR27).`);
      return;
    }
    
    setSelectedTerminationBenefit(benefit);
    setFormData({
      name: benefit.name,
      amount: benefit.amount.toString(),
      terms: benefit.terms || '', // Handle optional terms
    });
    
    setShowEditModal(true);
  };

  const handleViewClick = (benefit: TerminationBenefit) => {
    setSelectedTerminationBenefit(benefit);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      terms: '',
    });
    setSelectedTerminationBenefit(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && terminationBenefits.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Termination & Resignation Benefits</h1>
            <p className="text-muted-foreground mt-2">Loading termination benefits...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Termination & Resignation Benefits</h1>
          <p className="text-muted-foreground mt-2">Configure benefits and terms for employee offboarding to ensure seamless and legally compliant processes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTerminationBenefits}
            disabled={loading}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
          >
            + Create Benefit
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-success-foreground font-bold">Success</div>
          <p className="text-success-foreground font-medium">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-success-foreground hover:text-success-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-destructive-foreground font-bold">Failed</div>
          <div>
            <p className="text-destructive-foreground font-medium">Error</p>
            <p className="text-destructive-foreground text-sm mt-1">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-destructive-foreground hover:text-destructive-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search Benefits
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="Search by name or terms..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status Filter
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ search: '', status: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 transition-colors font-medium w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Termination Benefits Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Termination Benefits ({pagination.total})
            {loading && <span className="text-muted-foreground text-sm ml-2">Updating...</span>}
          </h2>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>
        </div>
        
        {terminationBenefits.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">No termination benefits found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filters.search || filters.status ? 'Try changing your filters' : 'Create your first termination benefit to get started'}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
            >
              Create Termination Benefit
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Benefit Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Terms</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Created</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {terminationBenefits.map((benefit) => (
                    <tr key={benefit._id} className="border-b border-border hover:bg-muted/5">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-foreground">{benefit.name}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-foreground font-medium">
                          {formatCurrency(benefit.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-foreground text-sm line-clamp-2" title={benefit.terms || 'No terms specified'}>
                          {benefit.terms || <span className="text-muted-foreground italic">No terms specified</span>}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
      ${benefit.status === 'approved' 
        ? 'bg-green-100 text-green-800' 
        : benefit.status === 'draft' 
        ? 'bg-yellow-100 text-yellow-800'
        : benefit.status === 'rejected' 
        ? 'bg-red-100 text-red-800'
        : benefit.status === 'pending_approval'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-muted/20 text-foreground'
      }
    `}>
      {benefit.status === 'approved' 
        ? 'Approved' 
        : benefit.status === 'draft' 
        ? 'Draft'
        : benefit.status === 'rejected' 
        ? 'Rejected'
        : benefit.status === 'pending_approval'
        ? 'Pending Approval'
        : benefit.status}
    </span>
                      </td>
                      <td className="py-4 px-6 text-foreground text-sm">
                        {formatDate(benefit.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {/* View button */}
                          <button
                            onClick={() => handleViewClick(benefit)}
                            className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                            title="View Details"
                          >
                            View
                          </button>
                          
                          {/* Edit button - Only for DRAFT termination benefits */}
                          {benefit.status === 'draft' && (
                            <button
                              onClick={() => handleEditClick(benefit)}
                              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} benefits
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="px-3 py-1 border border-border text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/5"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className={`px-3 py-1 rounded ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted/5'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                    className="px-3 py-1 border border-border text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/5"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-muted/5 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-2">Payroll Specialist Information</h3>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> termination/resignation benefit policies</li>
          <li>• You can <span className="font-semibold">edit draft</span> termination benefit policies only</li>
          <li>• You can <span className="font-semibold">view all</span> termination benefits (draft, approved, rejected)</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> benefits cannot be modified or deleted</li>
          <li>• Only Payroll Managers can <span className="font-semibold">approve</span> or <span className="font-semibold">reject</span> benefit policies</li>
          <li>• Duplicate benefit names are not allowed</li>
          <li>• <span className="font-semibold">Note:</span> Terms & Conditions field is optional</li>
        </ul>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">
                Create New Termination Benefit
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Benefit Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  required
                  placeholder="e.g., End of Service Gratuity"
                  list="benefit-suggestions"
                />
                <datalist id="benefit-suggestions">
                  {commonTerminationBenefits.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a unique name for this termination benefit.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    required
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Benefit amount. Must be 0 or greater.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  placeholder="e.g., Applicable after 2 years of continuous service"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe the conditions and terms for this benefit (optional)
                </p>
              </div>
              
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Important Notes</p>
                <ul className="text-xs text-warning-foreground space-y-1">
                  <li>• Benefit will be created as <span className="font-semibold">DRAFT</span></li>
                  <li>• Payroll Manager approval is required before use</li>
                  <li>• Duplicate benefit names are not allowed</li>
                  <li>• Terms & Conditions field is optional</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTerminationBenefit}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
              >
                {actionLoading ? 'Creating...' : 'Create Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTerminationBenefit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">
                Edit Termination Benefit
              </h3>
              <p className="text-muted-foreground text-sm mt-1">Editing: {selectedTerminationBenefit.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Benefit Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  required
                  placeholder="e.g., End of Service Gratuity"
                  list="benefit-suggestions-edit"
                />
                <datalist id="benefit-suggestions-edit">
                  {commonTerminationBenefits.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a unique name for this termination benefit.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full pl-8 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                    required
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Benefit amount.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Terms & Conditions (Optional)
                </label>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  placeholder="e.g., Applicable after 2 years of continuous service"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe the conditions and terms for this benefit (optional)
                </p>
              </div>
              
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Editing Notice (BR27)</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• You can only edit DRAFT termination benefits</li>
                  <li>• Changing the benefit name will be checked for duplicates</li>
                  <li>• Once approved, this benefit cannot be edited or deleted</li>
                  <li>• Manual adjustments to approved benefits require specialist approval</li>
                  <li>• Terms & Conditions field is optional</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTerminationBenefit}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
              >
                {actionLoading ? 'Updating...' : 'Update Benefit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedTerminationBenefit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-bold text-foreground">Termination Benefit Details</h3>
              </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-foreground">{selectedTerminationBenefit.name}</h4>
                  <p className="text-sm text-primary mt-2">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1
                      ${selectedTerminationBenefit.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : selectedTerminationBenefit.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedTerminationBenefit.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : selectedTerminationBenefit.status === 'pending_approval'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-muted/20 text-foreground'}
                    `}>
                      {selectedTerminationBenefit.status === 'approved'
                        ? 'Approved'
                        : selectedTerminationBenefit.status === 'draft'
                        ? 'Draft'
                        : selectedTerminationBenefit.status === 'rejected'
                        ? 'Rejected'
                        : selectedTerminationBenefit.status === 'pending_approval'
                        ? 'Pending Approval'
                        : selectedTerminationBenefit.status}
                    </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary">Amount</p>
                  <p className="font-medium text-foreground text-xl">{formatCurrency(selectedTerminationBenefit.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created</p>
                  <p className="font-medium text-foreground">{formatDate(selectedTerminationBenefit.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Last Modified</p>
                  <p className="font-medium text-foreground">{formatDate(selectedTerminationBenefit.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created</p>
                  <p className="font-medium text-foreground">{formatDate(selectedTerminationBenefit.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Last Modified</p>
                  <p className="font-medium text-foreground">{formatDate(selectedTerminationBenefit.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created By</p>
                  <p className="font-medium text-foreground">{selectedTerminationBenefit.createdBy || 'N/A'}</p>
                </div>
                {(selectedTerminationBenefit.status === 'approved' || selectedTerminationBenefit.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-primary">{selectedTerminationBenefit.status === 'approved' ? 'Approved By' : 'Rejected By'}</p>
                    <p className="font-medium text-foreground">{selectedTerminationBenefit.approvedBy || 'N/A'}</p>
                  </div>
                )}
                {(selectedTerminationBenefit.status === 'approved' || selectedTerminationBenefit.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-muted-foreground">{selectedTerminationBenefit.status === 'rejected' ? 'Rejected At' : 'Approved At'}</p>
                    <p className="font-medium text-foreground">{selectedTerminationBenefit.approvedAt ? formatDate(selectedTerminationBenefit.approvedAt) : 'N/A'}</p>
                  </div>
                )}
              </div>
              
              {selectedTerminationBenefit.terms && (
                <div>
                  <p className="text-sm font-medium text-primary mb-2">Terms & Conditions</p>
                  <div className="bg-muted/5 border border-border rounded-lg p-4">
                    <p className="text-foreground whitespace-pre-wrap">{selectedTerminationBenefit.terms}</p>
                  </div>
                </div>
              )}
              
             
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}