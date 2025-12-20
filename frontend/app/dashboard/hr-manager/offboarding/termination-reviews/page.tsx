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
    contractId: '',
    reason: '',
    hrComments: '',
    terminationDate: '',
    initiator: TerminationInitiation.HR as TerminationInitiation,
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

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

  const handleReviewPerformance = async () => {
    if (!formData.employeeId.trim()) {
      setError('Please enter an Employee ID');
      return;
    }

    try {
      setLoadingPerformance(true);
      setError(null);
      const data = await offboardingService.getEmployeePerformanceForTermination(formData.employeeId);
      setPerformanceData(data);
      setFormStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee performance data');
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.contractId || !formData.reason) {
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
        contractId: formData.contractId,
        initiator: formData.initiator,
        reason: formData.reason,
        hrComments: formData.hrComments || undefined,
        terminationDate: formData.terminationDate || undefined,
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
      contractId: '',
      reason: '',
      hrComments: '',
      terminationDate: '',
      initiator: TerminationInitiation.HR,
    });
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
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2.5 font-medium rounded-lg transition-colors ${
              showForm
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isActive ? 'bg-primary text-primary-foreground' :
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Employee ID <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full max-w-md px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                      placeholder="Enter employee ID to review"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the employee ID to review their performance data before initiating termination
                    </p>
                  </div>
                  <button
                    onClick={handleReviewPerformance}
                    disabled={loadingPerformance || !formData.employeeId.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingPerformance ? 'Loading...' : 'Review Performance Data'}
                  </button>
                </div>
              )}

              {/* Step 2: Review Performance */}
              {formStep === 'review' && performanceData && (
                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{performanceData.employeeName}</h3>
                      <p className="text-sm text-muted-foreground">Status: {performanceData.employeeStatus}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      performanceData.terminationJustification.isJustified
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {performanceData.terminationJustification.isJustified ? 'May Be Justified' : 'Review Carefully'}
                    </span>
                  </div>

                  {/* Performance Summary */}
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
                      <p className={`text-2xl font-semibold mt-1 ${
                        performanceData.performanceData.lowScoreCount > 0 ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {performanceData.performanceData.lowScoreCount}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Appraisals Found</p>
                      <p className="text-2xl font-semibold text-foreground mt-1">
                        {performanceData.performanceData.hasPublishedAppraisals ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {performanceData.terminationJustification.warnings.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Warnings</h4>
                      <ul className="space-y-1">
                        {performanceData.terminationJustification.warnings.map((warning, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-1">Recommendation</h4>
                    <p className="text-sm text-muted-foreground">{performanceData.recommendation}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormStep('select')}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setFormStep('confirm')}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Proceed with Termination
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
                        Contract ID <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contractId}
                        onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring text-foreground"
                        placeholder="Enter contract ID"
                        required
                      />
                    </div>
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
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === filter.value
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
                          {typeof request.employeeId === 'object'
                            ? (request.employeeId as any).firstName + ' ' + (request.employeeId as any).lastName
                            : `Employee ${request.employeeId.slice(-6)}`}
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
                      {request.performanceWarnings && request.performanceWarnings.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {request.performanceWarnings.length} warning(s) noted
                        </p>
                      )}
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

