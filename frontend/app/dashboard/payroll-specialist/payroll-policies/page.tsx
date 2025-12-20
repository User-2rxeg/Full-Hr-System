'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
// Type definitions based on your API response
interface PayrollPolicy {
  _id: string;
  policyType: string;
  policyName: string;
  description: string;
  effectiveDate: string;
  expirationDate?: string;
  status: 'draft' | 'approved' | 'rejected' | 'pending_approval';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  applicability?: string;
  ruleDefinition?: {
    percentage: number;
    fixedAmount: number;
    thresholdAmount: number;
    condition?: string;
  };
  __v: number;
}

// Updated policy types based on validation
const policyTypes = [
  { value: 'Deduction', label: 'Deduction' },
  { value: 'Allowance', label: 'Allowance' },
  { value: 'Benefit', label: 'Benefit' },
  { value: 'Misconduct', label: 'Misconduct' },
  { value: 'Leave', label: 'Leave' },
];

// Applicability options
const applicabilityOptions = [
  { value: 'All Employees', label: 'All Employees' },
  { value: 'Full Time Employees', label: 'Full Time Employees' },
  { value: 'Part Time Employees', label: 'Part Time Employees' },
  { value: 'Contractors', label: 'Contractors' },
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

export default function PayrollPoliciesPage() {
  const { user } = useAuth();
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [policies, setPolicies] = useState<PayrollPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PayrollPolicy | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    policyType: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    policyType: '',
    name: '',
    description: '',
    effectiveDate: '',
    expirationDate: '',
    applicability: '',
    createdByEmployeeId: '',
  });

  const [ruleDefinition, setRuleDefinition] = useState({
    percentage: '',
    fixedAmount: '',
    thresholdAmount: '',
    condition: '',
  });

  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch policies on component mount
  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching payroll policies...');
      const response = await payrollConfigurationService.getPayrollPolicies();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('API Response:', response);
      
      if (!response.data) {
        console.warn('No data in response');
        setPolicies([]);
        return;
      }
      
      const apiData = response.data as any;

      // helper: normalize status strings to our mapping keys (e.g. "Approved" -> "approved", "Pending Approval" -> "pending_approval")
      const normalizeStatus = (s: any) => {
        if (!s && s !== 0) return '';
        const str = String(s).toLowerCase();
        return str.replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
      };
      
      // Handle different response structures
      if (apiData.data && Array.isArray(apiData.data)) {
        console.log('Found policies in data.data');
        setPolicies(apiData.data.map((p: any) => ({ ...p, status: normalizeStatus(p.status) })));
      } 
      else if (Array.isArray(apiData)) {
        console.log('Response is directly an array');
        setPolicies(apiData.map((p: any) => ({ ...p, status: normalizeStatus(p.status) })));
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setPolicies([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll policies');
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

 const handleCreatePolicy = async () => {
    try {
      // Validate required fields (remove createdByEmployeeId from this check)
      if (!formData.policyType || !formData.name || !formData.description || 
          !formData.effectiveDate || !formData.applicability) {
        setError('Please fill all required fields');
        return;
      }

      // Validate that at least one rule definition field is filled
      if (!ruleDefinition.percentage && !ruleDefinition.fixedAmount && !ruleDefinition.thresholdAmount) {
        setError('Please fill at least one rule definition field (percentage, fixed amount, or threshold)');
        return;
      }

      // Validate individual fields
      const percentageNum = ruleDefinition.percentage ? parseFloat(ruleDefinition.percentage) : 0;
      const fixedAmountNum = ruleDefinition.fixedAmount ? parseFloat(ruleDefinition.fixedAmount) : 0;
      const thresholdNum = ruleDefinition.thresholdAmount ? parseFloat(ruleDefinition.thresholdAmount) : 0;

      if (ruleDefinition.percentage && (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
        setError('Percentage must be between 0 and 100');
        return;
      }
      
      if (ruleDefinition.fixedAmount && (isNaN(fixedAmountNum) || fixedAmountNum < 0)) {
        setError('Fixed amount must be 0 or greater');
        return;
      }
      
      if (ruleDefinition.thresholdAmount && (isNaN(thresholdNum) || thresholdNum < 1)) {
        setError('Threshold amount must be 1 or greater');
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
      
      // Transform form data to match API expected format
      const apiData = {
        policyType: formData.policyType,
        policyName: formData.name,
        description: formData.description,
        effectiveDate: formData.effectiveDate,
        expirationDate: formData.expirationDate || undefined,
        applicability: formData.applicability,
        createdByEmployeeId: createdByEmployeeId, // Use the authenticated user ID
        ruleDefinition: {
          percentage: percentageNum,
          fixedAmount: fixedAmountNum,
          thresholdAmount: thresholdNum,
          condition: ruleDefinition.condition || undefined,
        }
      };
      
      console.log('Creating policy with data:', apiData);
      
      const response = await payrollConfigurationService.createPayrollPolicy(apiData);
      
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
                              'Failed to create payroll policy';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Payroll policy created successfully as DRAFT');
      setShowModal(false);
      resetForm();
      fetchPolicies();
    } catch (err: any) {
      console.error('Create policy error details:', err);
      
      // Extract error message from various possible formats
      let errorMessage = 'Failed to create payroll policy';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
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
  const handleUpdatePolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      // Validate required fields
      if (!formData.policyType || !formData.name || !formData.description || 
          !formData.effectiveDate || !formData.applicability) {
        setError('Please fill all required fields');
        return;
      }

      // Validate that at least one rule definition field is filled
      if (!ruleDefinition.percentage && !ruleDefinition.fixedAmount && !ruleDefinition.thresholdAmount) {
        setError('Please fill at least one rule definition field (percentage, fixed amount, or threshold)');
        return;
      }

      // Validate individual fields
      const percentageNum = ruleDefinition.percentage ? parseFloat(ruleDefinition.percentage) : 0;
      const fixedAmountNum = ruleDefinition.fixedAmount ? parseFloat(ruleDefinition.fixedAmount) : 0;
      const thresholdNum = ruleDefinition.thresholdAmount ? parseFloat(ruleDefinition.thresholdAmount) : 0;

      if (ruleDefinition.percentage && (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
        setError('Percentage must be between 0 and 100');
        return;
      }
      
      if (ruleDefinition.fixedAmount && (isNaN(fixedAmountNum) || fixedAmountNum < 0)) {
        setError('Fixed amount must be 0 or greater');
        return;
      }
      
      if (ruleDefinition.thresholdAmount && (isNaN(thresholdNum) || thresholdNum < 1)) {
        setError('Threshold amount must be 1 or greater');
        return;
      }

      setActionLoading(true);
      
      const updateData = {
        policyName: formData.name,
        description: formData.description,
        effectiveDate: formData.effectiveDate,
        expirationDate: formData.expirationDate || undefined,
        applicability: formData.applicability,
        ruleDefinition: {
          percentage: percentageNum,
          fixedAmount: fixedAmountNum,
          thresholdAmount: thresholdNum,
          condition: ruleDefinition.condition || undefined,
        }
      };
      
      const response = await payrollConfigurationService.updatePayrollPolicy(
        selectedPolicy._id,
        updateData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Payroll policy updated successfully');
      setShowModal(false);
      resetForm();
      fetchPolicies();
    } catch (err: any) {
      setError(err.message || 'Failed to update payroll policy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy? This action cannot be undone.')) return;
    
    try {
      setActionLoading(true);
      const response = await payrollConfigurationService.deletePayrollPolicy(id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Payroll policy deleted successfully');
      fetchPolicies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete payroll policy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      setActionLoading(true);
      const approveData = {
        approvedBy: 'current-user-id',
      };
      
      const response = await payrollConfigurationService.approvePayrollPolicy(
        selectedPolicy._id,
        approveData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Payroll policy approved successfully');
      setShowApproveModal(false);
      fetchPolicies();
    } catch (err: any) {
      setError(err.message || 'Failed to approve payroll policy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      setActionLoading(true);
      const rejectData = {
        approvedBy: 'current-user-id',
        rejectionReason: rejectionReason,
      };
      
      const response = await payrollConfigurationService.rejectPayrollPolicy(
        selectedPolicy._id,
        rejectData
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Payroll policy rejected successfully');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchPolicies();
    } catch (err: any) {
      setError(err.message || 'Failed to reject payroll policy');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (policy: PayrollPolicy) => {
    // Check if policy can be edited (only draft status)
    if (policy.status !== 'draft') {
      setError('Only DRAFT policies can be edited. Approved or rejected policies cannot be modified.');
      return;
    }
    
    setSelectedPolicy(policy);
    setFormData({
      policyType: policy.policyType,
      name: policy.policyName,
      description: policy.description,
      effectiveDate: policy.effectiveDate.split('T')[0],
      expirationDate: policy.expirationDate?.split('T')[0] || '',
      applicability: policy.applicability || '',
      createdByEmployeeId: 'current-user-id',
    });
    
    // Set rule definition if it exists
    if (policy.ruleDefinition) {
      setRuleDefinition({
        percentage: policy.ruleDefinition.percentage?.toString() || '',
        fixedAmount: policy.ruleDefinition.fixedAmount?.toString() || '',
        thresholdAmount: policy.ruleDefinition.thresholdAmount?.toString() || '',
        condition: policy.ruleDefinition.condition || '',
      });
    }
    
    setShowModal(true);
  };

  const handleViewClick = (policy: PayrollPolicy) => {
    setSelectedPolicy(policy);
    setShowViewModal(true);
  };

  const handleApproveClick = (policy: PayrollPolicy) => {
    setSelectedPolicy(policy);
    setShowApproveModal(true);
  };

  const handleRejectClick = (policy: PayrollPolicy) => {
    setSelectedPolicy(policy);
    setShowRejectModal(true);
  };

  const resetForm = () => {
    setFormData({
      policyType: '',
      name: '',
      description: '',
      effectiveDate: '',
      expirationDate: '',
      applicability: '',
      createdByEmployeeId: '',
    });
    setRuleDefinition({
      percentage: '',
      fixedAmount: '',
      thresholdAmount: '',
      condition: '',
    });
    setSelectedPolicy(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRuleDefinitionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRuleDefinition(prev => ({
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
  };

  // Filter policies based on search, status, and policy type
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = !filters.search || 
      policy.policyName.toLowerCase().includes(filters.search.toLowerCase()) ||
      policy.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = !filters.status || policy.status === filters.status;
    const matchesPolicyType = !filters.policyType || policy.policyType === filters.policyType;
    return matchesSearch && matchesStatus && matchesPolicyType;
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const canEdit = (policy: PayrollPolicy) => {
    // Only allow editing for draft policies
    return policy.status === 'draft';
  };

  const canDelete = (policy: PayrollPolicy) => {
    return policy.status !== 'pending_approval';
  };

  const canApproveReject = (policy: PayrollPolicy) => {
    return policy.status === 'pending_approval';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll Policies</h1>
            <p className="text-muted-foreground mt-2">Loading policies...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
       {/* Theme Customizer */}
    <div className="fixed bottom-6 right-6 z-40">
      <ThemeCustomizerTrigger 
        onClick={() => setShowThemeCustomizer(true)}
      />
    </div>
    
    {showThemeCustomizer && (
      <ThemeCustomizer open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer} />
    )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll Policies Configuration</h1>
          <p className="text-muted-foreground mt-2">Configure company-level payroll policies (salary types, misconduct penalties, leave policies, allowances)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPolicies}
            className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Create Policy
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-success font-bold">Success</div>
          <p className="text-success-foreground font-medium">{success}</p>
          <button 
            onClick={() => setSuccess(null)}
            className="ml-auto text-success hover:text-success/80"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-destructive font-bold">Failed</div>
          <p className="text-destructive/90 font-medium">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search Policies
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground placeholder:text-muted-foreground"
              placeholder="Search by name or description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Policy Type
            </label>
            <select
              name="policyType"
              value={filters.policyType}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground"
            >
              <option value="">All Types</option>
              {policyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status Filter
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-muted-foreground focus:text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: '', status: '', policyType: '' })}
              className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            Payroll Policies ({filteredPolicies.length})
            {(filters.search || filters.status || filters.policyType) && (
              <span className="text-foreground text-sm ml-2">of {policies.length} total</span>
            )}
          </h2>
        </div>
        
        {filteredPolicies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground font-medium">
              {(filters.search || filters.status || filters.policyType) ? 'No policies match your filters' : 'No payroll policies found'}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {(filters.search || filters.status || filters.policyType) ? 'Try adjusting your search criteria' : 'Create your first payroll policy to get started'}
            </p>
            {!(filters.search || filters.status || filters.policyType) && (
              <button
                onClick={handleCreateClick}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Create Policy
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
                  <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Policy Name</th>
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Type</th>
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Effective Date</th>
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Last Modified</th>
                        <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                      </tr>
                  </thead>
              <tbody>
                {filteredPolicies.map((policy) => (
                    <tr key={policy._id} className="border-b border-border hover:bg-muted/20">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-foreground">{policy.policyName}</p>
                        <p className="text-muted-foreground text-sm mt-1 truncate max-w-md">
                          {policy.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-foreground">
                        {policyTypes.find(t => t.value === policy.policyType)?.label || policy.policyType}
                      </span>
                    </td>
                   <td className="py-4 px-6">
  <span className={`
    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
    ${policy.status === 'approved' 
      ? 'bg-green-100 text-green-800' 
      : policy.status === 'draft' 
      ? 'bg-yellow-100 text-yellow-800'
      : policy.status === 'rejected' 
      ? 'bg-red-100 text-red-800'
      : policy.status === 'pending_approval'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-muted/20 text-foreground'
    }
  `}>
    {policy.status === 'approved' 
      ? 'Approved' 
      : policy.status === 'draft' 
      ? 'Draft'
      : policy.status === 'rejected' 
      ? 'Rejected'
      : policy.status === 'pending_approval'
      ? 'Pending Approval'
      : policy.status}
  </span>
</td>
                    <td className="py-4 px-6 text-foreground">{formatDate(policy.effectiveDate)}</td>
                    <td className="py-4 px-6 text-foreground">{formatDate(policy.updatedAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewClick(policy)}
                          className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                          title="View Details"
                        >
                          View
                        </button>
                        
                        {/* Only show edit button for draft policies */}
                        {policy.status === 'draft' && (
                          <button
                            onClick={() => handleEditClick(policy)}
                            className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                            title="Edit"
                          >
                            Edit
                          </button>
                        )}
                        
                        {canApproveReject(policy) && (
                          <>
                            <button
                              onClick={() => handleApproveClick(policy)}
                              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(policy)}
                              className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/5 border border-border rounded-lg transition-colors"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-muted/5 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-2">Important Information</h3>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li>• All policies are created with <span className="font-semibold">DRAFT</span> status initially</li>
          <li>• Only <span className="font-semibold">DRAFT</span> policies can be edited or deleted</li>
          <li>• <span className="font-semibold">APPROVED</span> and <span className="font-semibold">REJECTED</span> policies cannot be edited</li>
          <li>• To publish a policy, submit it for <span className="font-semibold">Payroll Manager approval</span></li>
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">
                {selectedPolicy ? 'Edit Payroll Policy' : 'Create Payroll Policy'}
              </h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Policy Type *
                  </label>
                  <select
                    name="policyType"
                    value={formData.policyType}
                    onChange={handleChange}
                      className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    required
                  >
                    <option value="">Select a policy type</option>
                    {policyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Applicability *
                  </label>
                  <select
                    name="applicability"
                    value={formData.applicability}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    required
                  >
                    <option value="">Select applicability</option>
                    {applicabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Policy Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  required
                  placeholder="Enter policy name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  required
                  placeholder="Enter policy description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    name="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              
              {/* Rule Definition Section */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-foreground mb-4">Rule Definition *</h4>
                
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Percentage (0-100)
                    </label>
                    <input
                      type="number"
                      name="percentage"
                      value={ruleDefinition.percentage}
                      onChange={handleRuleDefinitionChange}
                      className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      placeholder="e.g., 15.5"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">0-100 range</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fixed Amount (≥ 0)
                    </label>
                    <input
                      type="number"
                      name="fixedAmount"
                      value={ruleDefinition.fixedAmount}
                      onChange={handleRuleDefinitionChange}
                      className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      placeholder="e.g., 500"
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Must be ≥ 0</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Threshold (≥ 1)
                    </label>
                    <input
                      type="number"
                      name="thresholdAmount"
                      value={ruleDefinition.thresholdAmount}
                      onChange={handleRuleDefinitionChange}
                      className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      placeholder="e.g., 1000"
                      step="1"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Must be ≥ 1</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Condition (Optional)
                  </label>
                  <input
                    type="text"
                    name="condition"
                    value={ruleDefinition.condition}
                    onChange={handleRuleDefinitionChange}
                    className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    placeholder="Optional condition"
                  />
                </div>
              </div>
              
              {/* Hidden createdByEmployeeId field */}
              <input
                type="hidden"
                name="createdByEmployeeId"
                value={formData.createdByEmployeeId}
              />
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={selectedPolicy ? handleUpdatePolicy : handleCreatePolicy}
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted/40 transition-colors font-medium"
              >
                {actionLoading ? 'Saving...' : selectedPolicy ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Policy Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold text-foreground">{selectedPolicy.policyName}</h4>
                  <p className="text-sm text-primary">Status</p>
                  <span className={`
  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1
  ${selectedPolicy.status === 'approved' 
    ? 'bg-green-100 text-green-800' 
    : selectedPolicy.status === 'draft' 
    ? 'bg-yellow-100 text-yellow-800'
    : selectedPolicy.status === 'rejected' 
    ? 'bg-red-100 text-red-800'
    : selectedPolicy.status === 'pending_approval'
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-muted/20 text-foreground'
  }
`}>
  {selectedPolicy.status === 'approved' 
    ? 'Approved' 
    : selectedPolicy.status === 'draft' 
    ? 'Draft'
    : selectedPolicy.status === 'rejected' 
    ? 'Rejected'
    : selectedPolicy.status === 'pending_approval'
    ? 'Pending Approval'
    : selectedPolicy.status}
</span>
                </div>
              </div>
              
                  <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary">Policy Type</p>
                  <p className="font-medium text-foreground">
                    {policyTypes.find(t => t.value === selectedPolicy.policyType)?.label || selectedPolicy.policyType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-primary">Applicability</p>
                  <p className="font-medium text-foreground">{selectedPolicy.applicability || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created By</p>
                  <p className="font-medium text-foreground">{selectedPolicy.createdBy}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Created At</p>
                  <p className="font-medium text-foreground">{formatDate(selectedPolicy.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Effective Date</p>
                  <p className="font-medium text-foreground">{formatDate(selectedPolicy.effectiveDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-primary">Last Modified</p>
                  <p className="font-medium text-foreground">{formatDate(selectedPolicy.updatedAt)}</p>
                </div>
                {selectedPolicy.expirationDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expiration Date</p>
                    <p className="font-medium text-foreground">{formatDate(selectedPolicy.expirationDate)}</p>
                  </div>
                )}
                {(selectedPolicy.status === 'approved' || selectedPolicy.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-primary">
                      {selectedPolicy.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                    </p>
                    <p className="font-medium text-foreground">{selectedPolicy.approvedBy || 'N/A'}</p>
                  </div>
                )}
                {(selectedPolicy.status === 'approved' || selectedPolicy.status === 'rejected') && (
                  <div>
                    <p className="text-sm text-primary">
                      {selectedPolicy.status === 'rejected' ? 'Rejected At' : 'Approved At'}
                    </p>
                    <p className="font-medium text-foreground">{selectedPolicy.approvedAt ? formatDate(selectedPolicy.approvedAt) : 'N/A'}</p>
                  </div>
                )}
              </div>
              
                <div>
                  <p className="text-sm text-primary mb-2">Description</p>
                <p className="font-medium text-foreground">{selectedPolicy.description}</p>
              </div>
              
              {selectedPolicy.ruleDefinition && (
                <div className="bg-muted/5 border border-border rounded-lg p-4">
                  <h5 className="font-medium text-foreground">Rule Definition</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-primary mb-2">Percentage (0-100)</p>
                      <p className="font-medium text-foreground">{selectedPolicy.ruleDefinition.percentage ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary mb-2">Fixed Amount</p>
                      <p className="font-medium text-foreground">${selectedPolicy.ruleDefinition.fixedAmount ?? '0'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary mb-2">Threshold</p>
                      <p className="font-medium text-foreground">{selectedPolicy.ruleDefinition.thresholdAmount ?? 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-primary mb-2">Condition (Optional)</p>
                      <p className="font-medium text-foreground">{selectedPolicy.ruleDefinition.condition ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedPolicy.rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive mb-1">Rejection Reason</p>
                  <p className="text-destructive-foreground">{selectedPolicy.rejectionReason}</p>
                </div>
              )}
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

      {/* Approve Modal */}
      {showApproveModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Approve Policy</h3>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to approve <span className="font-semibold">"{selectedPolicy.policyName}"</span>?
              </p>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
                <p className="text-warning-foreground text-sm">
                  Once approved, this policy will be published and take effect. Approved policies cannot be edited.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePolicy}
                disabled={actionLoading}
                className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:bg-muted/40 transition-colors font-medium"
              >
                {actionLoading ? 'Approving...' : 'Approve Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">Reject Policy</h3>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                Are you sure you want to reject <span className="font-semibold">"{selectedPolicy.policyName}"</span>?
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-input rounded-lg font-medium text-muted-foreground focus:text-foreground focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPolicy}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:bg-muted/40 transition-colors font-medium"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}