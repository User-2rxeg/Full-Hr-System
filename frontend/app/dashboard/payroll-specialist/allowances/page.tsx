'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';

// Type definitions based on your API response
interface Allowance {
  _id: string;
  name: string;
  amount: number;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  __v: number;
}

interface AllowancesResponse {
  data: Allowance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common allowance types for suggestion
const commonAllowanceTypes = [
  { value: 'Housing Allowance', label: 'Housing Allowance' },
  { value: 'Transportation Allowance', label: 'Transportation Allowance' },
  { value: 'Meal Allowance', label: 'Meal Allowance' },
  { value: 'Medical Allowance', label: 'Medical Allowance' },
  { value: 'Education Allowance', label: 'Education Allowance' },
  { value: 'Travel Allowance', label: 'Travel Allowance' },
  { value: 'Overtime Allowance', label: 'Overtime Allowance' },
  { value: 'Uniform Allowance', label: 'Uniform Allowance' },
  { value: 'Communication Allowance', label: 'Communication Allowance' },
  { value: 'Entertainment Allowance', label: 'Entertainment Allowance' },
];

const statusColors = {
  // Draft: yellow shade with white text
  draft: 'bg-warning/80 text-foreground',
  // Pending: keep warning token (lighter)
  pending_approval: 'bg-warning/10 text-warning-foreground',
  // Approved: green shade with white text
  approved: 'bg-success/80 text-foreground',
  // Rejected: darker destructive background with white text
  rejected: 'bg-destructive/80 text-foreground',
};

const statusLabels = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function AllowancesPage() {
  const { user } = useAuth();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<Allowance | null>(null);
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
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
  });

  // Fetch allowances on component mount and when filters change
  useEffect(() => {
    fetchAllowances();
  }, [pagination.page, filters]);

  const fetchAllowances = async () => {
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
      
      const response = await payrollConfigurationService.getAllowances(queryParams);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setAllowances([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        // Handle paginated response
        setAllowances(apiData.data);
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
        setAllowances(apiData);
        setPagination(prev => ({
          ...prev,
          total: apiData.length,
          totalPages: 1,
        }));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setAllowances([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch allowances');
      console.error('Error fetching allowances:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllowance = async () => {
  try {
    // Basic frontend validation
    if (!formData.name || !formData.amount) {
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
      name: formData.name,
      amount: amountNum,
      createdByEmployeeId: createdByEmployeeId,
    };
    
    console.log('Creating allowance with data:', apiData);
    
    const response = await payrollConfigurationService.createAllowance(apiData);
    
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
                            'Failed to create allowance';
        throw new Error(errorMessage);
      }
    }
    
    setSuccess('Allowance created successfully as DRAFT');
    setShowCreateModal(false);
    resetForm();
    fetchAllowances();
  } catch (err: any) {
    console.error('Create error details:', err);
    
    // Extract error message from various possible formats
    let errorMessage = 'Failed to create allowance';
    
    if (err.message) {
      errorMessage = err.message;
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.response?.data?.error?.message) {
      errorMessage = err.response.data.error.message;
    }
    
    // Format specific error messages
    if (errorMessage.includes('already exists')) {
      errorMessage = `Allowance "${formData.name}" already exists. Please use a different name.`;
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
  const handleDeleteAllowance = async (allowance: Allowance) => {
    if (!confirm(`Are you sure you want to delete "${allowance.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await payrollConfigurationService.deleteAllowance(allowance._id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess(`Allowance "${allowance.name}" deleted successfully`);
      fetchAllowances();
    } catch (err: any) {
      console.error('Delete error:', err);
      
      let errorMessage = 'Failed to delete allowance';
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (errorMessage.includes('Cannot delete allowance with status')) {
        errorMessage = `Cannot delete ${allowance.status.toLowerCase()} allowance. Only DRAFT allowances can be deleted.`;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewClick = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setShowViewModal(true);
  };

  const handleEditClick = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setFormData({
      name: allowance.name,
      amount: allowance.amount.toString(),
    });
    setShowEditModal(true);
  };

  const handleUpdateAllowance = async () => {
    if (!selectedAllowance) return;
    
    try {
      if (!formData.name || !formData.amount) {
        setError('Please fill all required fields');
        return;
      }

      const amountNum = parseFloat(formData.amount);
      
      if (isNaN(amountNum) || amountNum < 0) {
        setError('Amount must be a valid number 0 or greater');
        return;
      }

      setActionLoading(true);
      
      const apiData = {
        name: formData.name,
        amount: amountNum,
      };
      
      console.log('Updating allowance with data:', apiData);
      
      const response = await payrollConfigurationService.updateAllowance(selectedAllowance._id, apiData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Allowance updated successfully');
      setShowEditModal(false);
      setSelectedAllowance(null);
      resetForm();
      fetchAllowances();
    } catch (err: any) {
      console.error('Update error:', err);
      let errorMessage = 'Failed to update allowance';
      if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
    });
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

  if (loading && allowances.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Allowances</h1>
            <p className="text-muted-foreground mt-2">Loading allowances...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Allowances Configuration</h1>
          <p className="text-muted-foreground mt-2">Define and manage employee allowances (transportation, housing, meals, etc.)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAllowances}
            disabled={loading}
            className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted/5 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium"
          >
            + Create Allowance
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
            className="ml-auto text-success-foreground hover:underline"
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
            className="ml-auto text-destructive-foreground hover:underline"
          >
            ×
          </button>
        </div>
      )}

  {/* Filters */}
<div className="bg-card rounded-lg border border-border p-4">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Search Allowances</label>
      <input
        type="text"
        name="search"
        value={filters.search}
        onChange={handleFilterChange}
        className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
        placeholder="Search by name..."
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Status Filter</label>
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
        className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted/5 transition-colors font-medium w-full"
      >
        Clear Filters
      </button>
    </div>
  </div>
</div>

      {/* Allowances Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Allowances ({pagination.total})
            {loading && <span className="text-foreground text-sm ml-2">Updating...</span>}
          </h2>
          <div className="text-sm text-foreground">Page {pagination.page} of {pagination.totalPages || 1}</div>
        </div>
        
        {allowances.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-foreground font-medium">No allowances found</p>
            <p className="text-foreground text-sm mt-1">{filters.search || filters.status ? 'Try changing your filters' : 'Create your first allowance to get started'}</p>
            <button onClick={handleCreateClick} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 transition-colors font-medium">Create Allowance</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Allowance Name</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Created</th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
              <tbody>
  {allowances.map((allowance) => (
    <tr key={allowance._id} className="border-b border-border hover:bg-muted/20">
      <td className="py-4 px-6">
        <div>
          <p className="font-medium text-foreground">{allowance.name}</p>
          {/* ID display removed intentionally */}
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="text-foreground font-medium">{formatCurrency(allowance.amount)}</span>
      </td>
      <td className="py-4 px-6">
         <span className={`
    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
    ${allowance.status === 'approved' 
      ? 'bg-green-100 text-green-800' 
      : allowance.status === 'draft' 
      ? 'bg-yellow-100 text-yellow-800'
      : allowance.status === 'rejected' 
      ? 'bg-red-100 text-red-800'
      : allowance.status === 'pending_approval'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-muted/20 text-foreground'
    }
  `}>
    {allowance.status === 'approved' 
      ? 'Approved' 
      : allowance.status === 'draft' 
      ? 'Draft'
      : allowance.status === 'rejected' 
      ? 'Rejected'
      : allowance.status === 'pending_approval'
      ? 'Pending Approval'
      : allowance.status}
  </span>
      </td>
      <td className="py-4 px-6 text-foreground text-sm">{formatDate(allowance.createdAt)}</td>
        <td className="py-4 px-6 text-foreground text-sm">{formatDate(allowance.createdAt)}</td>
      <td className="py-4 px-6">
        <div className="flex gap-2">
          {/* View button */}
          <button
            onClick={() => handleViewClick(allowance)}
            className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
            title="View Details"
          >
            View
          </button>

          {/* Edit button - Only for DRAFT allowances */}
          {allowance.status === 'draft' && (
            <button
              onClick={() => handleEditClick(allowance)}
              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
              title="Edit Allowance"
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
                <div className="text-sm text-muted-foreground">Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} allowances</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="px-3 py-1 border border-input text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/5"
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
                          className={`px-3 py-1 rounded ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'border border-input text-muted-foreground hover:bg-muted/5'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || loading}
                    className="px-3 py-1 border border-input text-muted-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/5"
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
          <li>• As a Payroll Specialist, you can <span className="font-semibold">create draft</span> allowances</li>
          <li>• You can <span className="font-semibold">view all</span> allowances (draft, approved, rejected)</li>
          <li>• You can <span className="font-semibold">delete draft</span> allowances only</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> allowances cannot be modified or deleted</li>
          <li>• Only Payroll Managers can <span className="font-semibold">approve</span> or <span className="font-semibold">reject</span> allowances</li>
          <li>• Allowances are used to reward employees for special conditions (housing, transportation, etc.)</li>
          <li>• Duplicate allowance names are not allowed</li>
        </ul>
      </div>

  {/* Create Modal */}
{showCreateModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-border">
        <h3 className="text-xl font-bold text-foreground">Create New Allowance</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Allowance Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            required
            placeholder="e.g., Transportation Allowance"
            list="allowance-suggestions"
          />
          <datalist id="allowance-suggestions">
            {commonAllowanceTypes.map((option) => (
              <option key={option.value} value={option.value} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground mt-1">Enter a unique name for this allowance. Common types include Housing, Transportation, Meal, etc.</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Amount (USD) *</label>
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
              placeholder="e.g., 500"
              step="0.01"
              min="0"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly amount for this allowance. Must be 0 or greater.</p>
        </div>
        
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <p className="text-sm font-medium text-warning-foreground mb-2">Important Notes</p>
          <ul className="text-xs text-warning-foreground space-y-1">
            <li>• Allowance will be created as <span className="font-semibold">DRAFT</span></li>
            <li>• Payroll Manager approval is required before use</li>
            <li>• Duplicate names are not allowed</li>
            <li>• Only you can delete your draft allowances</li>
          </ul>
        </div>
      </div>
      <div className="p-6 border-t border-border flex justify-end gap-3">
        <button
          onClick={() => setShowCreateModal(false)}
          disabled={actionLoading}
          className="px-4 py-2 border border-input text-muted-foreground rounded-lg hover:bg-muted/5 disabled:opacity-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateAllowance}
          disabled={actionLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
        >
          {actionLoading ? 'Creating...' : 'Create Allowance'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* View Modal */}
      {showViewModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Allowance Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-foreground mb-2">{selectedAllowance.name}</h4>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-primary">Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1
                      ${selectedAllowance.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : selectedAllowance.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedAllowance.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : selectedAllowance.status === 'pending_approval'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-muted/20 text-foreground'}
                    `}>
                      {selectedAllowance.status === 'approved'
                        ? 'Approved'
                        : selectedAllowance.status === 'draft'
                        ? 'Draft'
                        : selectedAllowance.status === 'rejected'
                        ? 'Rejected'
                        : selectedAllowance.status === 'pending_approval'
                        ? 'Pending Approval'
                        : selectedAllowance.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary">Amount</p>
                  <p className="font-medium text-foreground text-xl">{formatCurrency(selectedAllowance.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created By</p>
                  <p className="font-medium text-foreground">{selectedAllowance.createdBy || 'N/A'}</p>
                </div>
                {/* Approved By/At or Rejected By/At */}
                {(selectedAllowance.status === 'approved' || selectedAllowance.status === 'rejected') && (
                  <>
                    <div>
                      <p className="text-sm text-primary">{selectedAllowance.status === 'approved' ? 'Approved By' : 'Rejected By'}</p>
                      <p className="font-medium text-foreground">{selectedAllowance.approvedBy || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary">{selectedAllowance.status === 'approved' ? 'Approved At' : 'Rejected At'}</p>
                      <p className="font-medium text-foreground">{selectedAllowance.approvedAt ? formatDate(selectedAllowance.approvedAt) : 'N/A'}</p>
                    </div>
                  </>
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

      {/* Edit Modal */}
      {showEditModal && selectedAllowance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Edit Allowance</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Allowance Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  required
                  placeholder="e.g., Transportation Allowance"
                  list="allowance-suggestions-edit"
                />
                <datalist id="allowance-suggestions-edit">
                  {commonAllowanceTypes.map((option) => (
                    <option key={option.value} value={option.value} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount (USD) *</label>
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
                    placeholder="e.g., 500"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div className="p-4 bg-muted/5 border border-border rounded-lg">
                <p className="text-sm text-foreground"><span className="font-semibold">Current Status:</span> {statusLabels[selectedAllowance.status]}</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAllowance(null);
                  resetForm();
                }}
                disabled={actionLoading}
                className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted/5 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAllowance}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-95 disabled:opacity-50 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}