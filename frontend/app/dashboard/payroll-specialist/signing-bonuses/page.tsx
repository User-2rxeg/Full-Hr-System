'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
// Type definitions based on your API response
interface SigningBonus {
  _id: string;
  positionName: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

interface SigningBonusesResponse {
  data: SigningBonus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common position names for suggestion
const commonPositionNames = [
  { value: 'Junior Software Engineer', label: 'Junior Software Engineer' },
  { value: 'Mid Software Engineer', label: 'Mid Software Engineer' },
  { value: 'Senior Software Engineer', label: 'Senior Software Engineer' },
  { value: 'Junior Teaching Assistant', label: 'Junior Teaching Assistant' },
  { value: 'Mid Teaching Assistant', label: 'Mid Teaching Assistant' },
  { value: 'Senior Teaching Assistant', label: 'Senior Teaching Assistant' },
  { value: 'Junior Data Analyst', label: 'Junior Data Analyst' },
  { value: 'Mid Data Analyst', label: 'Mid Data Analyst' },
  { value: 'Senior Data Analyst', label: 'Senior Data Analyst' },
  { value: 'Junior Project Manager', label: 'Junior Project Manager' },
  { value: 'Mid Project Manager', label: 'Mid Project Manager' },
  { value: 'Senior Project Manager', label: 'Senior Project Manager' },
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

export default function SigningBonusesPage() {
  const { user } = useAuth();
  const [signingBonuses, setSigningBonuses] = useState<SigningBonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSigningBonus, setSelectedSigningBonus] = useState<SigningBonus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [calcInputs, setCalcInputs] = useState({
    monthlySalary: '',
    startDate: '',
    resignationDate: '',
    lastWorkingDate: '',
    accruedLeaveDays: '',
    pendingAllowances: '',
  });
  const [calcResult, setCalcResult] = useState<null | any>(null);
  const [showCalculateSummaryModal, setShowCalculateSummaryModal] = useState(false);
  
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
  
  // Form state
  const [formData, setFormData] = useState({
    positionName: '',
    amount: '',
  });

  // Fetch signing bonuses on component mount and when filters change
  useEffect(() => {
    fetchSigningBonuses();
  }, [pagination.page, filters]);

  const fetchSigningBonuses = async () => {
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
      
      const response = await payrollConfigurationService.getSigningBonuses(queryParams);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setSigningBonuses([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        // Handle paginated response
        setSigningBonuses(apiData.data);
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
        setSigningBonuses(apiData);
        setPagination(prev => ({
          ...prev,
          total: apiData.length,
          totalPages: 1,
        }));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setSigningBonuses([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch signing bonuses');
      console.error('Error fetching signing bonuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSigningBonus = async () => {
  try {
    // Basic frontend validation
    if (!formData.positionName || !formData.amount) {
      setError('Please fill all required fields');
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
    
    // Prepare data for backend
    const apiData = {
      positionName: formData.positionName,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    console.log('Creating signing bonus with data:', apiData);
    
    const response = await payrollConfigurationService.createSigningBonus(apiData);
    
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
                            'Failed to create signing bonus';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Signing bonus created successfully as DRAFT');
    setShowCreateModal(false);
    resetForm();
    fetchSigningBonuses();
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create signing bonus';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format specific error messages
    if (errorMessage.includes('already exists')) {
      errorMessage = `Signing bonus for position "${formData.positionName}" already exists. Please use a different position name.`;
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

  const handleUpdateSigningBonus = async () => {
    if (!selectedSigningBonus) return;
    
    try {
      // Basic frontend validation
      if (!formData.positionName || !formData.amount) {
        setError('Please fill all required fields');
        return;
      }

      // Convert amount to number
      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum) || amountNum < 0) {
        setError('Amount must be a valid number 0 or greater');
        return;
      }

      setActionLoading(true);
      
      // Prepare update data
      const updateData = {
        positionName: formData.positionName,
        amount: amountNum,
      };
      
      const response = await payrollConfigurationService.updateSigningBonus(
        selectedSigningBonus._id,
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
                              'Failed to update signing bonus';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Signing bonus updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchSigningBonuses();
    } catch (err: any) {
      console.error('Update error details:', err);
      
      let errorMessage = 'Failed to update signing bonus';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Format specific error messages
      if (errorMessage.includes('already exists')) {
        errorMessage = `Signing bonus for position "${formData.positionName}" already exists. Please use a different position name.`;
      } else if (errorMessage.includes('Cannot update signing bonus with status')) {
        errorMessage = `Cannot update ${selectedSigningBonus.status.toLowerCase()} signing bonus. Only DRAFT signing bonuses can be edited.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSigningBonus = async (signingBonus: SigningBonus) => {
    if (!confirm(`Are you sure you want to delete the signing bonus for "${signingBonus.positionName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await payrollConfigurationService.deleteSigningBonus(signingBonus._id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess(`Signing bonus for "${signingBonus.positionName}" deleted successfully`);
      fetchSigningBonuses();
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = 'Failed to delete signing bonus';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Cannot delete signing bonus with status')) {
        errorMessage = `Cannot delete ${signingBonus.status.toLowerCase()} signing bonus. Only DRAFT signing bonuses can be deleted.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (signingBonus: SigningBonus) => {
    // Check if signing bonus can be edited (only draft status)
    if (signingBonus.status !== 'draft') {
      setError(`Cannot edit ${signingBonus.status.toLowerCase()} signing bonus. Only DRAFT signing bonuses can be edited.`);
      return;
    }
    
    setSelectedSigningBonus(signingBonus);
    setFormData({
      positionName: signingBonus.positionName,
      amount: signingBonus.amount.toString(),
    });
    
    setShowEditModal(true);
  };

  const handleViewClick = (signingBonus: SigningBonus) => {
    setSelectedSigningBonus(signingBonus);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      positionName: '',
      amount: '',
    });
    setSelectedSigningBonus(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  if (loading && signingBonuses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Signing Bonuses</h1>
            <p className="text-muted-foreground mt-2">Loading signing bonuses...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Signing Bonuses Configuration</h1>
          <p className="text-muted-foreground mt-2">Configure signing bonus policies for different positions to seamlessly incorporate new hires into payroll</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSigningBonuses}
            disabled={loading}
            className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setSelectedSigningBonus(null);
              setCalcInputs(prev => ({ ...prev, pendingAllowances: '' }));
              setShowCalculateModal(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
          >
            Calculate Entitelments
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
          >
            + Create Signing Bonus
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
        Search Signing Bonuses
      </label>
      <input
        type="text"
        name="search"
        value={filters.search}
        onChange={handleFilterChange}
        className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        placeholder="Search by position name..."
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

      {/* Signing Bonuses Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Signing Bonuses ({pagination.total})
            {loading && <span className="text-muted-foreground text-sm ml-2">Updating...</span>}
          </h2>
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages || 1}
          </div>
        </div>
        
        {signingBonuses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">No signing bonuses found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filters.search || filters.status ? 'Try changing your filters' : 'Create your first signing bonus to get started'}
            </p>
            <button
              onClick={handleCreateClick}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
            >
              Create Signing Bonus
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Position Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Signing Bonus Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Created</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {signingBonuses.map((signingBonus) => (
                    <tr key={signingBonus._id} className="border-b border-border hover:bg-muted/20">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-foreground">{signingBonus.positionName}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-foreground font-medium">
                          {formatCurrency(signingBonus.amount)}
                        </span>
                      </td>
  <td className="py-4 px-6">
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
      ${signingBonus.status === 'approved' 
        ? 'bg-green-100 text-green-800' 
        : signingBonus.status === 'draft' 
        ? 'bg-yellow-100 text-yellow-800'
        : signingBonus.status === 'rejected' 
        ? 'bg-red-100 text-red-800'
        : signingBonus.status === 'pending_approval'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-muted/20 text-foreground'
      }
    `}>
      {signingBonus.status === 'approved' 
        ? 'Approved' 
        : signingBonus.status === 'draft' 
        ? 'Draft'
        : signingBonus.status === 'rejected' 
        ? 'Rejected'
        : signingBonus.status === 'pending_approval'
        ? 'Pending Approval'
        : signingBonus.status}
    </span>
  </td>
                      <td className="py-4 px-6 text-foreground text-sm">
                        {formatDate(signingBonus.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {/* View button */}
                          <button
                            onClick={() => handleViewClick(signingBonus)}
                            className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                            title="View Details"
                          >
                            View
                          </button>
                          
                          {/* Edit button - Only for DRAFT signing bonuses */}
                          {signingBonus.status === 'draft' && (
                            <button
                              onClick={() => handleEditClick(signingBonus)}
                              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                              title="Edit"
                            >
                              Edit
                            </button>
                          )}
                          {/* per-row Calculate removed — use header 'Calculate Entitelments' button */}
                          
                          {/* Delete button - Only for DRAFT signing bonuses
                          {signingBonus.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteSigningBonus(signingBonus)}
                              disabled={actionLoading}
                              className="p-1.5 text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )} */}
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} signing bonuses
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="px-3 py-1 border border-border text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
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
                          className={`px-3 py-1 rounded ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-muted/50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                    className="px-3 py-1 border border-border text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
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
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> signing bonus policies</li>
          <li>• You can <span className="font-semibold">edit draft</span> signing bonus policies only</li>
          <li>• You can <span className="font-semibold">view all</span> signing bonus policies (draft, approved, rejected)</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> signing bonuses cannot be modified or deleted</li>
          <li>• Only Payroll Managers can <span className="font-semibold">approve</span> or <span className="font-semibold">reject</span> signing bonus policies</li>
          <li>• Duplicate position names are not allowed</li>

        </ul>
      </div>

     {/* Create Modal */}
{showCreateModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-border">
        <h3 className="text-xl font-bold text-foreground">
          Create New Signing Bonus Policy
        </h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Position Name *
          </label>
          <input
            type="text"
            name="positionName"
            value={formData.positionName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            required
            placeholder="e.g., Senior Software Engineer"
            list="position-suggestions"
          />
          <datalist id="position-suggestions">
            {commonPositionNames.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground mt-1">
            Enter the position name for this signing bonus policy. Common positions include Junior, Mid, and Senior levels.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Signing Bonus Amount (USD) *
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
            One-time signing bonus amount for this position. Must be 0 or greater.
          </p>
        </div>
        
        <div className="p-4 border border-border rounded-lg">
          <p className="text-sm font-medium text-foreground mb-2">Important Notes</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Signing bonus will be created as <span className="font-semibold">DRAFT</span></li>
            <li>• Payroll Manager approval is required before use</li>
            <li>• Duplicate position names are not allowed</li>
            <li>• Only you can edit or delete your draft signing bonuses</li>
            <li>• These policies help seamlessly incorporate new hires into payroll</li>
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
          onClick={handleCreateSigningBonus}
          disabled={actionLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
        >
          {actionLoading ? 'Creating...' : 'Create Signing Bonus'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Edit Modal */}
      {showEditModal && selectedSigningBonus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Edit Signing Bonus</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Position Name *</label>
                <input
                  type="text"
                  name="positionName"
                  value={formData.positionName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  required
                  placeholder="e.g., Senior Software Engineer"
                  list="position-suggestions-edit"
                />
                <datalist id="position-suggestions-edit">
                  {commonPositionNames.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">Enter the position name for this signing bonus policy.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Signing Bonus Amount (USD) *</label>
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
                <p className="text-xs text-muted-foreground mt-1">One-time signing bonus amount for this position.</p>
              </div>
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <p className="text-sm text-foreground"><span className="font-semibold">Editing Notice:</span></p>
                <ul className="text-xs text-foreground space-y-1 mt-1">
                  <li>• You can only edit DRAFT signing bonuses</li>
                  <li>• Changing the position name will be checked for duplicates</li>
                  <li>• Once approved, this policy cannot be edited or deleted</li>
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
                onClick={handleUpdateSigningBonus}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
              >
                {actionLoading ? 'Updating...' : 'Update Signing Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedSigningBonus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Signing Bonus Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-2">{selectedSigningBonus.positionName}</h4>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-primary">Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1
                      ${selectedSigningBonus.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : selectedSigningBonus.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedSigningBonus.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : selectedSigningBonus.status === 'pending_approval'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-muted/20 text-foreground'}
                    `}>
                      {selectedSigningBonus.status === 'approved'
                        ? 'Approved'
                        : selectedSigningBonus.status === 'draft'
                        ? 'Draft'
                        : selectedSigningBonus.status === 'rejected'
                        ? 'Rejected'
                        : selectedSigningBonus.status === 'pending_approval'
                        ? 'Pending Approval'
                        : selectedSigningBonus.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary">Signing Bonus Amount</p>
                  <p className="font-medium text-foreground text-xl">{formatCurrency(selectedSigningBonus.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-1">One-time payment for new hires</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created</p>
                  <p className="font-medium text-foreground">{formatDate(selectedSigningBonus.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Last Modified</p>
                  <p className="font-medium text-foreground">{formatDate(selectedSigningBonus.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created By</p>
                  <p className="font-medium text-foreground">{selectedSigningBonus.createdBy || 'N/A'}</p>
                </div>
                {(selectedSigningBonus.status === 'approved' || selectedSigningBonus.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-primary">
                      {selectedSigningBonus.status === 'approved' ? 'Approved By' : 'Rejected By'}
                    </p>
                    <p className="font-medium text-foreground">{selectedSigningBonus.approvedBy || 'N/A'}</p>
                  </div>
                )}
                {(selectedSigningBonus.status === 'approved' || selectedSigningBonus.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-primary">
                      {selectedSigningBonus.status === 'approved' ? 'Approved At' : 'Rejected At'}
                    </p>
                    <p className="font-medium text-foreground">{selectedSigningBonus.approvedAt ? formatDate(selectedSigningBonus.approvedAt) : 'N/A'}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Entitlements Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-border">
                <h3 className="text-xl font-bold text-foreground">Calculate Resignation Entitlements</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-foreground mb-1">Monthly Salary (USD)</label>
                    <input
                      type="number"
                      name="monthlySalary"
                      value={calcInputs.monthlySalary}
                      onChange={(e) => setCalcInputs(prev => ({ ...prev, monthlySalary: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded text-foreground"
                      placeholder="e.g., 2000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1">Employment Start Date</label>
                    <input type="date" value={calcInputs.startDate} onChange={(e) => setCalcInputs(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-input rounded text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1">Resignation Date</label>
                    <input type="date" value={calcInputs.resignationDate} onChange={(e) => setCalcInputs(prev => ({ ...prev, resignationDate: e.target.value }))} className="w-full px-3 py-2 border border-input rounded text-foreground" />
                  </div>
                  {/* Removed Last Working Date - not required for this calculation flow. */}
                  <div>
                    <label className="block text-sm text-foreground mb-1">Accrued Leave Days</label>
                    <input type="number" value={calcInputs.accruedLeaveDays} onChange={(e) => setCalcInputs(prev => ({ ...prev, accruedLeaveDays: e.target.value }))} className="w-full px-3 py-2 border border-input rounded text-foreground" min="0" />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-1">Pending Allowances (total USD)</label>
                    <input type="number" value={calcInputs.pendingAllowances} onChange={(e) => setCalcInputs(prev => ({ ...prev, pendingAllowances: e.target.value }))} className="w-full px-3 py-2 border border-input rounded text-foreground" min="0" />
                  </div>
                </div>

                {/* Results are shown in the summary modal below; inline results removed. */}

                {/* Calculation Rules Explanation */}
                <div className="mt-4 p-4 bg-muted/5 border border-border rounded">
                  <h4 className="font-semibold mb-2 text-foreground">Calculation Rules (summary)</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Accrued leave = accrued_days × (monthly_salary / 30).</li>
                    <li>• Pending allowances = added as entered.</li>
                    <li>• Gratuity (default): first 5 years = 21 days/year; after 5 years = 30 days/year.</li>
                  </ul>
                </div>
              </div>
                <div className="p-6 border-t border-border flex justify-end gap-3">
                  <button onClick={() => { setShowCalculateModal(false); setCalcResult(null); }} className="px-4 py-2 border border-border rounded text-muted-foreground">Cancel</button>
                  <button
                    onClick={() => {
                      const monthly = parseFloat(calcInputs.monthlySalary || '0');
                      const accruedDays = parseFloat(calcInputs.accruedLeaveDays || '0');
                      const pending = parseFloat(calcInputs.pendingAllowances || '0');
                      const start = calcInputs.startDate ? new Date(calcInputs.startDate) : null;
                      const resign = calcInputs.resignationDate ? new Date(calcInputs.resignationDate) : null;
                      let years = 0;
                      if (start && resign && !isNaN(start.getTime()) && !isNaN(resign.getTime())) {
                        years = (resign.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
                      }
                      const accruedLeavePayout = Math.max(0, accruedDays) * (monthly / 30);
                      const fullYears = Math.floor(Math.max(0, years));
                      // Tiered gratuity: first 5 years = 21 days/year, after 5 years = 30 days/year
                      const yearsFirstTier = Math.min(fullYears, 5);
                      const yearsSecondTier = Math.max(0, fullYears - 5);
                      const gratuity = (yearsFirstTier * (monthly * (21 / 30))) + (yearsSecondTier * (monthly * (30 / 30)));
                      const totalPayout = accruedLeavePayout + pending + gratuity;
                      setCalcResult({ accruedLeavePayout, pendingAllowances: pending, gratuity, totalPayout, years: fullYears });
                      setShowCalculateSummaryModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors"
                  >
                    Calculate
                  </button>
                </div>
            </div>
          </div>
        )}

      {/* Calculate Summary Modal */}
      {showCalculateSummaryModal && calcResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Calculated Entitlements Summary</h3>
              <p className="text-sm text-muted-foreground mt-1">Review the breakdown below. These values are estimates based on entered data and default rules.</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div><span className="text-sm text-foreground">Service Years (rounded down):</span> <span className="font-medium text-foreground">{calcResult.years}</span></div>
                <div><span className="text-sm text-foreground">Accrued Leave Payout:</span> <span className="font-medium text-foreground">{formatCurrency(calcResult.accruedLeavePayout)}</span></div>
                <div><span className="text-sm text-foreground">Pending Allowances:</span> <span className="font-medium text-foreground">{formatCurrency(calcResult.pendingAllowances)}</span></div>
                <div><span className="text-sm text-foreground">Estimated Gratuity:</span> <span className="font-medium text-foreground">{formatCurrency(calcResult.gratuity)}</span></div>
                <div className="border-t pt-2"><span className="text-sm text-foreground">Total Estimated Payout:</span> <span className="font-medium text-foreground">{formatCurrency(calcResult.totalPayout)}</span></div>
              </div>
              <div className="text-xs text-muted-foreground">Note: These calculations use default rule multipliers (first 5 years: 21 days/year; after 5 years: 30 days/year).</div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => { setShowCalculateSummaryModal(false); setShowCalculateModal(false); setCalcResult(null); }} className="px-4 py-2 border border-border text-foreground rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}