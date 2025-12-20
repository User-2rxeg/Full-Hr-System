'use client';

import { useState, useEffect } from 'react';
import { payrollConfigurationService } from '@/app/services/payroll-configuration';
import { useAuth } from '@/app/context/AuthContext';
import { ThemeCustomizer, ThemeCustomizerTrigger } from '@/app/components/theme-customizer';
import { X, Eye, Calculator, Edit } from 'lucide-react';

// Type definitions
interface InsuranceBracket {
  _id: string;
  name: string;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  __v: number;
}

type ContributionCalculation = {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  isValid: boolean;
};

// Predefined insurance types
const insuranceTypeOptions = [
  { value: 'Health Insurance', label: 'Health Insurance' },
  { value: 'Social Insurance', label: 'Social Insurance' },
  { value: 'Pension Fund', label: 'Pension Fund' },
  { value: 'Unemployment Insurance', label: 'Unemployment Insurance' },
  { value: 'Disability Insurance', label: 'Disability Insurance' },
  { value: 'Life Insurance', label: 'Life Insurance' },
  { value: 'custom', label: 'Custom Insurance Type' },
];

// Fixed status colors (not theme dependent)
const statusColors = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function InsuranceBracketsPage() {
  const { user } = useAuth();
  const [brackets, setBrackets] = useState<InsuranceBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<InsuranceBracket | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState<ContributionCalculation | null>(null);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customName: '',
    minSalary: '',
    maxSalary: '',
    employeeRate: '',
    employerRate: '',
  });

  // Calculation form state
  const [calculationData, setCalculationData] = useState({
    salary: '',
  });

  // Search and filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    insuranceType: '',
    minSalaryRange: '',
    maxSalaryRange: '',
  });

  // Fetch insurance brackets on component mount
  useEffect(() => {
    fetchInsuranceBrackets();
  }, []);

  const fetchInsuranceBrackets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await payrollConfigurationService.getInsuranceBrackets();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.data) {
        console.warn('No data in response');
        setBrackets([]);
        return;
      }
      
      const apiData = response.data as any;
      
      if (apiData.data && Array.isArray(apiData.data)) {
        setBrackets(apiData.data);
      } 
      else if (Array.isArray(apiData)) {
        setBrackets(apiData);
      }
      else {
        console.warn('Unexpected response structure:', apiData);
        setBrackets([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch insurance brackets');
      console.error('Error fetching insurance brackets:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Determine the final name
    const finalName = formData.name === 'custom' ? formData.customName : formData.name;

    // Only validate name for new creation (not for editing)
    if (!selectedBracket) {
      if (!formData.name) {
        errors.push('Please select an insurance type');
      } else if (formData.name === 'custom' && !formData.customName.trim()) {
        errors.push('Custom insurance name is required');
      }

      // Check for duplicate name only when creating new
      if (finalName) {
        const isDuplicate = brackets.some(bracket => 
          bracket.name.toLowerCase() === finalName.toLowerCase()
        );
        if (isDuplicate) {
          errors.push(`Insurance name "${finalName}" already exists. Please use a different name.`);
        }
      }
    }

    // Required numeric fields
    if (!formData.minSalary) errors.push('Minimum salary is required');
    if (!formData.maxSalary) errors.push('Maximum salary is required');
    if (!formData.employeeRate) errors.push('Employee rate is required');
    if (!formData.employerRate) errors.push('Employer rate is required');

    // Numeric validation
    const minSalary = parseFloat(formData.minSalary);
    const maxSalary = parseFloat(formData.maxSalary);
    const employeeRate = parseFloat(formData.employeeRate);
    const employerRate = parseFloat(formData.employerRate);

    if (isNaN(minSalary) || minSalary < 0) errors.push('Minimum salary must be a positive number');
    if (isNaN(maxSalary) || maxSalary < 0) errors.push('Maximum salary must be a positive number');
    if (isNaN(employeeRate) || employeeRate < 0 || employeeRate > 100) errors.push('Employee rate must be between 0 and 100');
    if (isNaN(employerRate) || employerRate < 0 || employerRate > 100) errors.push('Employer rate must be between 0 and 100');

    // Logical validation
    if (minSalary >= maxSalary) errors.push('Maximum salary must be greater than minimum salary');
    if (employeeRate + employerRate > 100) errors.push('Total contribution rate (employee + employer) cannot exceed 100%');

    return errors;
  };

  const handleCreateInsurance = async () => {
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      // Determine the final name
      const finalName = formData.name === 'custom' ? formData.customName : formData.name;

      // Check if user is authenticated and has an ID
      if (!user?.id) {
        setError('You must be logged in to create an insurance bracket');
        return;
      }

      console.log('Current user ID:', user.id);
      console.log('User object:', user);

      setActionLoading(true);
      
      const apiData = {
        name: finalName,
        minSalary: parseFloat(formData.minSalary),
        maxSalary: parseFloat(formData.maxSalary),
        employeeRate: parseFloat(formData.employeeRate),
        employerRate: parseFloat(formData.employerRate),
        createdByEmployeeId: user.id,
      };
      
      console.log('Sending API data:', apiData);
      
      const response = await payrollConfigurationService.createInsuranceBracket(apiData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Check for backend validation errors
      if (response.data) {
        const responseData = response.data as any;
        
        if (responseData.message && responseData.message.includes('already exists')) {
          throw new Error(responseData.message);
        }
        else if (responseData.error) {
          throw new Error(responseData.error);
        }
        else if (responseData.statusCode && responseData.statusCode >= 400) {
          const errorMessage = responseData.message || 
                              responseData.error?.message || 
                              'Failed to create insurance bracket';
          throw new Error(errorMessage);
        }
      }
      
      setSuccess('Insurance bracket created successfully as DRAFT');
      setShowModal(false);
      resetForm();
      fetchInsuranceBrackets();
    } catch (err: any) {
      console.error('Create error details:', err);
      
      let errorMessage = 'Failed to create insurance bracket';
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateInsurance = async () => {
    if (!selectedBracket) return;

    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setError(validationErrors.join('. '));
        return;
      }

      if (selectedBracket.status !== 'draft') {
        setError('Only DRAFT insurance brackets can be edited.');
        return;
      }

      setActionLoading(true);
      setError(null);

      const updateData = {
        minSalary: parseFloat(formData.minSalary),
        maxSalary: parseFloat(formData.maxSalary),
        employeeRate: parseFloat(formData.employeeRate),
        employerRate: parseFloat(formData.employerRate),
      };

      const response = await payrollConfigurationService.updateInsuranceBracket(
        selectedBracket._id,
        updateData
      );
      
      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Insurance bracket updated successfully');
      setShowModal(false);
      resetForm();
      fetchInsuranceBrackets();

    } catch (err: any) {
      setError(err.message || 'Failed to update insurance bracket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insurance bracket? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await payrollConfigurationService.deleteInsuranceBracket(id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSuccess('Insurance bracket deleted successfully');
      fetchInsuranceBrackets();
    } catch (err: any) {
      setError(err.message || 'Failed to delete insurance bracket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateContributions = async () => {
    if (!selectedBracket) return;

    try {
      const salary = parseFloat(calculationData.salary);
      if (isNaN(salary) || salary < 0) {
        setError('Please enter a valid positive salary amount');
        setCalculationResult(null);
        return;
      }

      setActionLoading(true);
      setCalculationResult(null);
      setError(null);

      const response = await payrollConfigurationService.calculateContributions(
        selectedBracket._id,
        salary
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        const result = response.data as ContributionCalculation;

        setCalculationResult(result);

        if (!result.isValid) {
          setError(
            `Salary does not fall within this insurance bracket range (${selectedBracket.minSalary} - ${selectedBracket.maxSalary})`
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to calculate contributions');
      setCalculationResult(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (bracket: InsuranceBracket) => {
    if (bracket.status !== 'draft') {
      setError('Only DRAFT insurance brackets can be edited. Approved or rejected brackets cannot be modified.');
      return;
    }
    
    setSelectedBracket(bracket);
    setFormData({
      name: '',
      customName: '',
      minSalary: bracket.minSalary.toString(),
      maxSalary: bracket.maxSalary.toString(),
      employeeRate: bracket.employeeRate.toString(),
      employerRate: bracket.employerRate.toString(),
    });
    
    setShowModal(true);
  };

  const handleViewClick = (bracket: InsuranceBracket) => {
    setSelectedBracket(bracket);
    setShowViewModal(true);
  };

  const handleCalculateClick = (bracket: InsuranceBracket) => {
    setSelectedBracket(bracket);
    setCalculationData({ salary: '' });
    setCalculationResult(null);
    setError(null);
    setShowCalculateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      customName: '',
      minSalary: '',
      maxSalary: '',
      employeeRate: '',
      employerRate: '',
    });
    setSelectedBracket(null);
    setCalculationResult(null);
    setError(null);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      insuranceType: '',
      minSalaryRange: '',
      maxSalaryRange: '',
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error && error.includes('already exists')) {
      setError(null);
    }
  };

  const handleCalculationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalculationData(prev => ({
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  const getDuplicateError = () => {
    if (!formData.name || formData.name === 'custom') return null;
    
    const finalName = formData.name === 'custom' ? formData.customName : formData.name;
    if (!finalName) return null;
    
    const isDuplicate = brackets.some(bracket => 
      bracket.name.toLowerCase() === finalName.toLowerCase()
    );
    
    return isDuplicate ? `Insurance name "${finalName}" already exists. Please use a different name.` : null;
  };

  // Filter insurance brackets based on search and filters
  const filteredBrackets = brackets.filter(bracket => {
    const matchesSearch = !filters.search || 
      bracket.name.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = !filters.status || bracket.status === filters.status;
    
    const matchesInsuranceType = !filters.insuranceType || 
      bracket.name.toLowerCase().includes(filters.insuranceType.toLowerCase());
    
    const minSalaryFilter = parseFloat(filters.minSalaryRange) || 0;
    const maxSalaryFilter = parseFloat(filters.maxSalaryRange) || Number.MAX_SAFE_INTEGER;
    const matchesSalaryRange = bracket.minSalary >= minSalaryFilter && bracket.maxSalary <= maxSalaryFilter;
    
    return matchesSearch && matchesStatus && matchesInsuranceType && matchesSalaryRange;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Insurance Brackets Configuration</h1>
            <p className="text-muted-foreground mt-2">Loading insurance brackets...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Insurance Brackets Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Define insurance brackets with salary ranges and contribution percentages for automatic payroll deductions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInsuranceBrackets}
            className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
          >
            Refresh
          </button>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
          >
            Create Insurance Bracket
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-success font-bold">✓</div>
          <p className="text-success-foreground font-medium">{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-success hover:text-success/80 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && !showModal && !error.includes('already exists') && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <div className="text-destructive font-bold">✕</div>
          <div>
            <p className="text-destructive-foreground font-medium">Validation Error</p>
            <p className="text-destructive/90 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive hover:text-destructive/80 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Search
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-sm"
              placeholder="Search by name..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Insurance Type
            </label>
            <select
              name="insuranceType"
              value={filters.insuranceType}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-sm"
            >
              <option value="">All Types</option>
              {insuranceTypeOptions
                .filter(opt => opt.value !== 'custom')
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Min Salary
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-muted-foreground text-sm">$</span>
              </div>
              <input
                type="number"
                name="minSalaryRange"
                value={filters.minSalaryRange}
                onChange={handleFilterChange}
                className="w-full pl-7 pr-2 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-sm"
                placeholder="Min"
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Max Salary
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-muted-foreground text-sm">$</span>
              </div>
              <input
                type="number"
                name="maxSalaryRange"
                value={filters.maxSalaryRange}
                onChange={handleFilterChange}
                className="w-full pl-7 pr-2 py-2 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-sm"
                placeholder="Max"
                min="0"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Insurance Brackets Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            Insurance Brackets ({filteredBrackets.length})
            {(filters.search || filters.status || filters.insuranceType || filters.minSalaryRange || filters.maxSalaryRange) && (
              <span className="text-muted-foreground text-sm ml-2">of {brackets.length} total</span>
            )}
          </h2>
        </div>
        
        {filteredBrackets.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-muted-foreground text-4xl mb-4">🛡️</div>
            <p className="text-foreground font-medium">
              {(filters.search || filters.status || filters.insuranceType || filters.minSalaryRange || filters.maxSalaryRange) 
                ? 'No insurance brackets match your filters' 
                : 'No insurance brackets found'}
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {(filters.search || filters.status || filters.insuranceType || filters.minSalaryRange || filters.maxSalaryRange) 
                ? 'Try adjusting your search criteria' 
                : 'Create your first insurance bracket to get started'}
            </p>
            {!(filters.search || filters.status || filters.insuranceType || filters.minSalaryRange || filters.maxSalaryRange) && (
              <button
                onClick={handleCreateClick}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
              >
                Create Insurance Bracket
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Insurance Type</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Salary Range</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Contributions</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Created</th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBrackets.map((bracket) => (
                  <tr key={bracket._id} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-foreground">{bracket.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <p className="text-foreground">
                          {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <p className="text-foreground">
                          Employee: <span className="font-medium">{formatPercentage(bracket.employeeRate)}</span>
                        </p>
                        <p className="text-foreground">
                          Employer: <span className="font-medium">{formatPercentage(bracket.employerRate)}</span>
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Total: {formatPercentage(bracket.employeeRate + bracket.employerRate)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {/* Fixed status colors (not theme dependent) */}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[bracket.status]}`}>
                        {statusLabels[bracket.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-foreground text-sm">{formatDate(bracket.createdAt)}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {/* View button */}
                        <button
                          onClick={() => handleViewClick(bracket)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        
                        {/* Calculate button */}
                        <button
                          onClick={() => handleCalculateClick(bracket)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-primary bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-all duration-200"
                          title="Calculate Contributions"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          Calculate
                        </button>
                        
                        {/* Edit button - Only show for DRAFT brackets */}
                     {bracket.status === 'draft' && (
  <button
    onClick={() => handleEditClick(bracket)}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200"
    title="Edit"
  >
    <Edit className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Information Box */}
      <div className="bg-muted/10 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">Payroll Specialist Information - Insurance Brackets</h3>
        <ul className="text-muted-foreground text-sm space-y-2">
          <li>• As a Payroll Specialist, you can <span className="font-semibold text-primary">create draft</span> insurance brackets</li>
          <li>• You can <span className="font-semibold text-primary">edit draft</span> insurance brackets only (not approved or rejected ones)</li>
          <li>• You can <span className="font-semibold text-primary">delete draft</span> insurance brackets</li>
          <li>• You can <span className="font-semibold text-primary">view all</span> insurance brackets (draft, approved, rejected)</li>
          <li>• You can <span className="font-semibold text-primary">calculate contributions</span> for any insurance bracket</li>
          <li>• <span className="font-semibold">Approved</span> and <span className="font-semibold">rejected</span> brackets cannot be modified</li>
          <li>• <span className="font-semibold">Note:</span> Insurance type/name cannot be changed after creation</li>
          <li>• Insurance brackets define salary ranges and contribution percentages for automatic payroll deductions</li>
          <li>• <span className="font-semibold">Compliance:</span> Configurations must follow Social Insurance and Pensions Law</li>
          <li>• <span className="font-semibold">Note:</span> HR Manager has exclusive approval authority for insurance configurations</li>
        </ul>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">
                  {selectedBracket ? 'Edit Insurance Bracket' : 'Create Insurance Bracket'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Show error only inside modal */}
              {(error || getDuplicateError()) && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive mt-0.5">✕</div>
                    <div>
                      <p className="text-destructive-foreground font-medium">Validation Error</p>
                      <p className="text-destructive/90 text-sm mt-1">{error || getDuplicateError()}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Insurance Type {selectedBracket && <span className="text-muted-foreground">(Cannot be changed)</span>}
                </label>
                {selectedBracket ? (
                  <div className="w-full px-4 py-3 border border-input rounded-lg bg-muted/50 text-foreground font-medium">
                    {selectedBracket.name}
                  </div>
                ) : (
                  <>
                    <select
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      required
                    >
                      <option value="">Select insurance type</option>
                      {insuranceTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.name === 'custom' 
                        ? 'Enter a custom insurance name below' 
                        : 'Select a predefined insurance type or choose "Custom Insurance Type"'}
                    </p>
                  </>
                )}
              </div>
              
              {formData.name === 'custom' && !selectedBracket && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Custom Insurance Name *
                  </label>
                  <input
                    type="text"
                    name="customName"
                    value={formData.customName}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 ${
                      getDuplicateError() && formData.customName.trim() 
                        ? 'border-destructive focus:ring-destructive' 
                        : 'border-input'
                    }`}
                    required={formData.name === 'custom'}
                    placeholder="e.g., Vision Insurance, Dental Insurance, etc."
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter a unique name for your custom insurance type. 
                    {formData.customName && (
                      <span className="ml-1">
                        {getDuplicateError() ? (
                          <span className="text-destructive font-medium">This name already exists!</span>
                        ) : (
                          <span className="text-success">✓ Available</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Minimum Salary *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground">$</span>
                    </div>
                    <input
                      type="number"
                      name="minSalary"
                      value={formData.minSalary}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      required
                      placeholder="e.g., 0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Minimum salary for this bracket</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Maximum Salary *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground">$</span>
                    </div>
                    <input
                      type="number"
                      name="maxSalary"
                      value={formData.maxSalary}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      required
                      placeholder="e.g., 10000"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Maximum salary for this bracket</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Employee Contribution Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="employeeRate"
                      value={formData.employeeRate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-10"
                      required
                      placeholder="e.g., 5"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Employee's contribution percentage</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Employer Contribution Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="employerRate"
                      value={formData.employerRate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-10"
                      required
                      placeholder="e.g., 10"
                      step="0.01"
                      min="0"
                      max="100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Employer's contribution percentage</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">Important Notes</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• Maximum salary must be greater than minimum salary</li>
                  <li>• Contribution rates must be between 0% and 100%</li>
                  <li>• Total contribution rate (employee + employer) cannot exceed 100%</li>
                  <li>• Insurance name must be unique - duplicates are not allowed</li>
                  <li>• <span className="font-semibold">Insurance type/name cannot be changed after creation</span></li>
                  <li>• All brackets start in DRAFT status and require HR Manager approval</li>
                </ul>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2.5 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={selectedBracket ? handleUpdateInsurance : handleCreateInsurance}
                disabled={actionLoading || (!selectedBracket && !!getDuplicateError())}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted/40 transition-all duration-200 font-medium"
              >
                {actionLoading ? 'Saving...' : selectedBracket ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal - Matches Tax Rules page style */}
      {showViewModal && selectedBracket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-lg w-full border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">Insurance Bracket Details</h3>
                  <div className="text-muted-foreground text-sm">
                    ID: {selectedBracket._id.substring(0, 8)}...
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-lg font-bold text-foreground mb-2">{selectedBracket.name}</h4>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedBracket.status]}`}>
                  {statusLabels[selectedBracket.status]}
                </span>
              </div>
             
              <div>
                <p className="text-sm text-muted-foreground mb-2">Salary Range</p>
                <p className="font-medium text-foreground text-3xl">
                  {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Contribution Rates</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-medium text-foreground text-2xl">{formatPercentage(selectedBracket.employeeRate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employer</p>
                    <p className="font-medium text-foreground text-2xl">{formatPercentage(selectedBracket.employerRate)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total: {formatPercentage(selectedBracket.employeeRate + selectedBracket.employerRate)}
                </p>
              </div>
             
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground">{statusLabels[selectedBracket.status]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium text-foreground">{formatDate(selectedBracket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Modified</p>
                  <p className="font-medium text-foreground">{formatDate(selectedBracket.updatedAt)}</p>
                </div>
                {selectedBracket.createdBy && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Created By</p>
                    <p className="font-medium text-foreground truncate" title={selectedBracket.createdBy}>
                      {selectedBracket.createdBy}
                    </p>
                  </div>
                )}
              </div>
             
              {selectedBracket.approvedBy && (
                <div className={`${selectedBracket.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mt-4`}>
                  <div className="space-y-4">
                    <div>
                      <p className={`text-sm ${selectedBracket.status === 'rejected' ? 'text-red-600' : 'text-green-600'} mb-1`}>
                        {selectedBracket.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                      </p>
                      <p className={`font-medium ${selectedBracket.status === 'rejected' ? 'text-red-800' : 'text-green-800'} truncate`} 
                         title={selectedBracket.approvedBy}>
                        {selectedBracket.approvedBy}
                      </p>
                    </div>
                    {selectedBracket.approvedAt && (
                      <div>
                        <p className={`text-sm ${selectedBracket.status === 'rejected' ? 'text-red-600' : 'text-green-600'} mb-1`}>
                          {selectedBracket.status === 'rejected' ? 'Rejected At' : 'Approved At'}
                        </p>
                        <p className={`font-medium ${selectedBracket.status === 'rejected' ? 'text-red-800' : 'text-green-800'}`}>
                          {formatDate(selectedBracket.approvedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Contributions Modal */}
      {showCalculateModal && selectedBracket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-border shadow-xl">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Calculate Contributions</h3>
                <button
                  onClick={() => setShowCalculateModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm mt-1">{selectedBracket.name}</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Employee Salary *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground">$</span>
                  </div>
                  <input
                    type="number"
                    name="salary"
                    value={calculationData.salary}
                    onChange={handleCalculationChange}
                    className="w-full pl-8 pr-4 py-2.5 border border-input rounded-lg font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    required
                    placeholder="e.g., 5000"
                    step="0.01"
                    min="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the employee's gross salary to calculate insurance contributions
                </p>
              </div>
              
              <div className="bg-muted/10 border border-border rounded-lg p-4">
                <p className="text-sm font-medium text-foreground mb-2">Bracket Information:</p>
                <div className="text-sm text-foreground space-y-1">
                  <p>• Salary Range: {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}</p>
                  <p>• Employee Rate: {formatPercentage(selectedBracket.employeeRate)}</p>
                  <p>• Employer Rate: {formatPercentage(selectedBracket.employerRate)}</p>
                </div>
              </div>
              
              {calculationResult && (
                <div className={`border rounded-lg p-4 ${calculationResult.isValid ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                  <h4 className="font-semibold text-foreground mb-3">Calculation Results</h4>
                  
                  {calculationResult.isValid ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Employee Contribution</p>
                          <p className="text-xl font-bold text-success-foreground">
                            {formatCurrency(calculationResult.employeeContribution)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Employer Contribution</p>
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(calculationResult.employerContribution)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-success/20">
                          <p className="text-sm text-muted-foreground">Total Contribution</p>
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(calculationResult.totalContribution)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-success/20 border border-success/30 rounded-lg">
                        <p className="text-sm font-medium text-success-foreground">Valid Salary</p>
                        <p className="text-xs text-success/90 mt-1">
                          The salary falls within this bracket's range
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="font-medium text-destructive-foreground">Invalid Salary</p>
                      <p className="text-destructive/90 text-sm mt-1">
                        The entered salary does not fall within this insurance bracket's range
                      </p>
                      <p className="text-destructive text-sm mt-2">
                        Required range: {formatCurrency(selectedBracket.minSalary)} - {formatCurrency(selectedBracket.maxSalary)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowCalculateModal(false)}
                className="px-4 py-2.5 border border-input bg-background text-foreground rounded-lg hover:bg-muted transition-all duration-200 font-medium"
              >
                Close
              </button>
              <button
                onClick={handleCalculateContributions}
                disabled={actionLoading || !calculationData.salary}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted/40 transition-all duration-200 font-medium"
              >
                {actionLoading ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}