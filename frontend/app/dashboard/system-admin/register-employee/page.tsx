'use client';

import { useState } from 'react';
import { authService, RegisterEmployeeRequest } from '@/app/services/auth';
import { SystemRole } from '@/app/types';
import { Button } from '@/app/components/ui/button';
import { GlassCard } from '@/app/components/ui/glass-card';
import { UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: SystemRole.DEPARTMENT_EMPLOYEE, label: 'Department Employee' },
  { value: SystemRole.DEPARTMENT_HEAD, label: 'Department Head' },
  { value: SystemRole.HR_EMPLOYEE, label: 'HR Employee' },
  { value: SystemRole.HR_MANAGER, label: 'HR Manager' },
  { value: SystemRole.HR_ADMIN, label: 'HR Admin' },
  { value: SystemRole.PAYROLL_SPECIALIST, label: 'Payroll Specialist' },
  { value: SystemRole.PAYROLL_MANAGER, label: 'Payroll Manager' },
  { value: SystemRole.RECRUITER, label: 'Recruiter' },
  { value: SystemRole.FINANCE_STAFF, label: 'Finance Staff' },
  { value: SystemRole.LEGAL_POLICY_ADMIN, label: 'Legal & Policy Admin' },
  { value: SystemRole.SYSTEM_ADMIN, label: 'System Admin' },
];

export default function RegisterEmployeePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<RegisterEmployeeRequest>({
    firstName: '',
    lastName: '',
    middleName: '',
    nationalId: '',
    workEmail: '',
    password: '',
    employeeNumber: '',
    dateOfHire: '',
    roles: [SystemRole.DEPARTMENT_EMPLOYEE],
    mobilePhone: '',
    personalEmail: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleToggle = (role: SystemRole) => {
    setFormData((prev) => {
      const currentRoles = prev.roles || [];
      const isSelected = currentRoles.includes(role);
      
      if (isSelected) {
        // Don't allow removing all roles
        if (currentRoles.length === 1) {
          return prev;
        }
        return {
          ...prev,
          roles: currentRoles.filter((r) => r !== role),
        };
      } else {
        return {
          ...prev,
          roles: [...currentRoles, role],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.nationalId || 
        !formData.workEmail || !formData.password || !formData.employeeNumber || 
        !formData.dateOfHire || !formData.roles || formData.roles.length === 0) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Format date for backend
      const submitData: RegisterEmployeeRequest = {
        ...formData,
        dateOfHire: new Date(formData.dateOfHire).toISOString(),
        middleName: formData.middleName || undefined,
        mobilePhone: formData.mobilePhone || undefined,
        personalEmail: formData.personalEmail || undefined,
      };

      const response = await authService.registerEmployee(submitData);
      
      if (response.data?.employee) {
        setSuccess(`Employee ${response.data.employee.firstName} ${response.data.employee.lastName} registered successfully!`);
      } else {
        setSuccess('Employee registered successfully!');
      }
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        nationalId: '',
        workEmail: '',
        password: '',
        employeeNumber: '',
        dateOfHire: '',
        roles: [SystemRole.DEPARTMENT_EMPLOYEE],
        mobilePhone: '',
        personalEmail: '',
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to register employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10 pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 blur-[100px] rounded-full -z-10 animate-pulse"></div>

      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Register Employee
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            Create a new employee account in the system
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <GlassCard className="border-destructive/20 bg-destructive/5 text-destructive p-5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-destructive/70 hover:text-destructive"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </GlassCard>
        )}

        {success && (
          <GlassCard className="border-green-200 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </GlassCard>
        )}

        {/* Form */}
        <GlassCard className="p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Middle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    National ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="ID987654321"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                Contact Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Work Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    name="workEmail"
                    value={formData.workEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="john.smith@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Personal Email
                  </label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="john.personal@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    name="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="+250788123456"
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                Employment Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Employee Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="EMP-0001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date of Hire <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfHire"
                    value={formData.dateOfHire}
                    onChange={handleInputChange}
                    required
                    min={getMinDate()}
                    className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* System Roles */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                System Roles <span className="text-destructive">*</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Select one or more roles for this employee. At least one role is required.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = formData.roles?.includes(role.value);
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => handleRoleToggle(role.value)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-background/50 text-foreground hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{role.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {formData.roles && formData.roles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {formData.roles.length} role(s)
                </p>
              )}
            </div>

            {/* Account Security */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
                Account Security
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Initial Password <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 bg-background/50 border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Minimum 6 characters"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Employee will be required to change this password on first login.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl transition-all hover:scale-[1.02] gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Info Box */}
        <GlassCard className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                Important Information
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• The employee will receive an email with their login credentials</li>
                <li>• They must change their password on first login</li>
                <li>• Multiple roles can be assigned to a single employee</li>
                <li>• Employee number must be unique across the system</li>
                <li>• Work email must be unique and will be used for login</li>
              </ul>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

