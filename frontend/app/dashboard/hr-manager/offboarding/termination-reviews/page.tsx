'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  TerminationInitiation,
  EmployeePerformanceForTermination,
} from '@/app/services/offboarding';
import { employeeProfileService } from '@/app/services/employee-profile';
import { Search, UserPlus, Info } from 'lucide-react';

type FormStep = 'select' | 'review' | 'confirm';

export default function TerminationReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<TerminationStatus | 'all'>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>('select');
  const [submitting, setSubmitting] = useState(false);
  const [performanceData, setPerformanceData] = useState<EmployeePerformanceForTermination | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    reason: '',
    hrComments: '',
    terminationDate: '',
    contractId: '',
    initiator: TerminationInitiation.HR as TerminationInitiation,
  });

  // Employee directory state
  const [searchQuery, setSearchQuery] = useState('');
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Load all active employees when showing form
  useEffect(() => {
    if (showForm && allEmployees.length === 0) {
      fetchAllEmployees();
    }
  }, [showForm]);

  const fetchAllEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log('Fetching employees...');
      const response = await employeeProfileService.getAllEmployees(1, 100) as any;
      console.log('Employee API response:', response);

      let employeesList: any[] = [];

      // Safely extract array from various possible response structures
      if (Array.isArray(response)) {
        employeesList = response;
      } else if (response?.data && Array.isArray(response.data)) {
        employeesList = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        employeesList = response.data.data;
      } else if (response?.data?.employees && Array.isArray(response.data.employees)) {
        employeesList = response.data.employees;
      }

      console.log('Extracted employees list:', employeesList.length, employeesList);
      setAllEmployees(employeesList);
    } catch (err) {
      console.error('Fetch employees error:', err);
      setError('Failed to load employee list');
      setAllEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Filter employees locally
  const filteredEmployees = Array.isArray(allEmployees) ? allEmployees.filter(emp => {
    const query = searchQuery.toLowerCase();
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const employeeNumber = (emp.employeeNumber || '').toLowerCase();
    const position = (emp.position || '').toLowerCase();

    return fullName.includes(query) ||
      employeeNumber.includes(query) ||
      position.includes(query);
  }) : [];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (statusFilter === 'all') {
        const hr = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.HR);
        const manager = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.MANAGER);
        setTerminations([...hr, ...manager].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        const hr = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.HR, statusFilter as TerminationStatus);
        const manager = await offboardingService.getTerminationRequestsByInitiator(TerminationInitiation.MANAGER, statusFilter as TerminationStatus);
        setTerminations([...hr, ...manager].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch termination reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewPerformance = async (employeeId: string) => {
    try {
      setLoadingPerformance(true);
      setError(null);

      // Fetch performance data and employee profile to get contract ID
      const [perfData, profileRes] = await Promise.all([
        offboardingService.getEmployeePerformanceForTermination(employeeId),
        employeeProfileService.getEmployeeProfile(employeeId),
      ]);

      const profile = (profileRes as any).data || profileRes;
      // Try to find contract ID from various possible fields
      const contractId = profile.contractId || profile.activeContractId || profile.currentContractId || undefined;

      setFormData(prev => ({
        ...prev,
        employeeId,
        contractId: contractId || ''
      }));
      setPerformanceData(perfData);
      setFormStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee performance data');
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.reason) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.reason.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await offboardingService.createTerminationRequest({
        employeeId: formData.employeeId,
        initiator: formData.initiator,
        reason: formData.reason,
        hrComments: formData.hrComments || undefined,
        terminationDate: formData.terminationDate || undefined,
        contractId: formData.contractId || undefined,
      });

      setSuccessMsg('Termination request created successfully');
      resetForm();
      await fetchData();

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to create termination request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormStep('select');
    setPerformanceData(null);
    setFormData({
      employeeId: '',
      reason: '',
      hrComments: '',
      terminationDate: '',
      contractId: '',
      initiator: TerminationInitiation.HR,
    });
    setSearchQuery('');
  };

  const getStatusBadge = (status: TerminationStatus) => {
    const styles: Record<TerminationStatus, string> = {
      [TerminationStatus.PENDING]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      [TerminationStatus.UNDER_REVIEW]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      [TerminationStatus.APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      [TerminationStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-96 bg-card rounded-lg border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard/hr-manager/offboarding" className="hover:text-foreground transition-colors">
                Offboarding
              </Link>
              <span>/</span>
              <span className="text-foreground">Termination Reviews</span>
            </nav>
            <h1 className="text-2xl font-semibold text-foreground">Termination Reviews</h1>
            <p className="text-muted-foreground mt-1">
              Review employee performance and initiate termination requests
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
            className={`px-4 py-2.5 font-medium rounded-lg transition-colors ${showForm
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
          >
            {showForm ? 'Cancel' : 'Initiate Termination'}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Initiation Form */}
        {showForm && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Step Indicator */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-4">
                {['Select Employee', 'Review Performance', 'Confirm Request'].map((step, index) => {
                  const stepKey = ['select', 'review', 'confirm'][index] as FormStep;
                  const isActive = formStep === stepKey;
                  const isComplete =
                    (stepKey === 'select' && (formStep === 'review' || formStep === 'confirm')) ||
                    (stepKey === 'review' && formStep === 'confirm');

                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' :
                        isComplete ? 'bg-green-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                        {isComplete ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : index + 1}
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step}
                      </span>
                      {index < 2 && <div className="w-12 h-px bg-border" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6">
              {/* Step 1: Select Employee */}
              {formStep === 'select' && (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                      placeholder="Search employee by name, number or position..."
                    />
                  </div>

                  {loadingEmployees ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p className="text-muted-foreground">Loading employee directory...</p>
                    </div>
                  ) : filteredEmployees.length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 font-medium text-foreground">Employee</th>
                            <th className="px-4 py-3 font-medium text-foreground">Number</th>
                            <th className="px-4 py-3 font-medium text-foreground">Position</th>
                            <th className="px-4 py-3 text-right text-foreground">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredEmployees.map((emp) => (
                            <tr key={emp._id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {emp.workEmail || emp.personalEmail}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground font-mono">
                                {emp.employeeNumber}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {emp.position || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleReviewPerformance(emp._id)}
                                  disabled={loadingPerformance}
                                  className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-xs font-medium transition-all disabled:opacity-50"
                                >
                                  {loadingPerformance && formData.employeeId === emp._id ? 'Loading...' : 'Select & Review'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-lg p-12 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery ? `No employees found matching "${searchQuery}"` : 'No active employees found'}
                      </p>
                    </div>
                  )}

                  {!loadingEmployees && allEmployees.length > 0 && searchQuery === '' && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 flex gap-3 text-sm text-blue-700 dark:text-blue-400">
                      <Info className="w-5 h-5 flex-shrink-0" />
                      <p>Select an employee from the table above or use the search box to find someone specific. Performance data will be retrieved upon selection.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Review Performance */}
              {formStep === 'review' && performanceData && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{performanceData.employeeName}</h3>
                      <p className="text-sm text-muted-foreground">Status: {performanceData.employeeStatus}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${performanceData.terminationJustification.isJustified
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                      {performanceData.terminationJustification.isJustified ? 'Termination Justified' : 'Review Carefully'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total Appraisals</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">
                        {performanceData.performanceData.totalAppraisals}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">
                        {performanceData.performanceData.averageScore?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Low Scores</p>
                      <p className={`text-2xl font-semibold mt-1 ${performanceData.performanceData.lowScoreCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {performanceData.performanceData.lowScoreCount}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Warnings</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">
                        {performanceData.terminationJustification.warnings.length || 0}
                      </p>
                    </div>
                  </div>

                  {performanceData.terminationJustification.warnings.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Findings</h4>
                      <ul className="space-y-1">
                        {performanceData.terminationJustification.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-1">Recommendation</h4>
                    <p className="text-sm text-muted-foreground">{performanceData.recommendation}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormStep('select')}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Back to Selection
                    </button>
                    <button
                      onClick={() => setFormStep('confirm')}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Proceed to Application
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm Request */}
              {formStep === 'confirm' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Initiated By <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={formData.initiator}
                        onChange={(e) => setFormData({ ...formData, initiator: e.target.value as TerminationInitiation })}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                      >
                        <option value={TerminationInitiation.HR}>HR Department</option>
                        <option value={TerminationInitiation.MANAGER}>Manager Request</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Effective Date <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.terminationDate}
                        onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Reason for Termination <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground resize-none"
                      rows={4}
                      placeholder="Provide a detailed, clearly stated reason for termination..."
                      required
                      minLength={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 10 characters. {formData.reason.length}/1000
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      HR Comments (Optional)
                    </label>
                    <textarea
                      value={formData.hrComments}
                      onChange={(e) => setFormData({ ...formData, hrComments: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground resize-none"
                      rows={2}
                      placeholder="Additional notes or documentation..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setFormStep('review')}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-destructive text-destructive-foreground font-medium rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Submit Termination Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: TerminationStatus.PENDING },
            { label: 'Under Review', value: TerminationStatus.UNDER_REVIEW },
            { label: 'Approved', value: TerminationStatus.APPROVED },
            { label: 'Rejected', value: TerminationStatus.REJECTED },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${statusFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-accent'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Termination List */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Termination Requests
              <span className="ml-2 text-muted-foreground font-normal">({terminations.length})</span>
            </h2>
          </div>

          <div className="divide-y divide-border">
            {terminations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">No termination requests</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Termination requests initiated by HR or managers will appear here
                </p>
              </div>
            ) : (
              terminations.map((request) => (
                <Link
                  key={request._id}
                  href={`/dashboard/hr-manager/offboarding/resignations/${request._id}`}
                  className="block px-6 py-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-foreground">
                          {typeof request.employeeId === 'object' && request.employeeId
                            ? `${(request.employeeId as any).firstName || ''} ${(request.employeeId as any).lastName || ''}`.trim() || (request.employeeId as any).employeeNumber || 'Unknown Employee'
                            : 'Unknown Employee'}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                          {request.initiator === TerminationInitiation.HR ? 'HR' : 'Manager'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {request.reason}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      {request.terminationDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Effective: {new Date(request.terminationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
