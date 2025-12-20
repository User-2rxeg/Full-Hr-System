'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
  FinalSettlementPreview,
} from '@/app/services/offboarding';

export default function FinalSettlementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvedTerminations, setApprovedTerminations] = useState<TerminationRequest[]>([]);
  const [selectedTermination, setSelectedTermination] = useState<TerminationRequest | null>(null);
  const [preview, setPreview] = useState<FinalSettlementPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settlementResult, setSettlementResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const approved = await offboardingService.getTerminationRequestsByStatus(TerminationStatus.APPROVED);
      setApprovedTerminations(approved || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approved terminations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTermination = async (termination: TerminationRequest) => {
    setSelectedTermination(termination);
    setSettlementResult(null);
    setPreview(null);

    try {
      setLoadingPreview(true);
      const previewData = await offboardingService.previewFinalSettlement(termination._id);
      setPreview(previewData);
    } catch (err: any) {
      setError(err.message || 'Failed to load settlement preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTriggerSettlement = async () => {
    if (!selectedTermination || !preview?.canTrigger) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await offboardingService.triggerFinalSettlement({
        terminationId: selectedTermination._id,
      });

      setSuccess('Final settlement triggered successfully');
      setSettlementResult(result);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger final settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-card rounded-lg border border-border"></div>
              <div className="lg:col-span-2 h-96 bg-card rounded-lg border border-border"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard/hr-manager/offboarding" className="hover:text-foreground transition-colors">
              Offboarding
            </Link>
            <span>/</span>
            <span className="text-foreground">Final Settlement</span>
          </nav>
          <h1 className="text-2xl font-semibold text-foreground">Final Settlement</h1>
          <p className="text-muted-foreground mt-1">
            Process final pay calculation and benefits termination for approved terminations
          </p>
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

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Terminations List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-foreground">
                  Approved Terminations
                  <span className="ml-2 text-muted-foreground font-normal">({approvedTerminations.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {approvedTerminations.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No approved terminations</p>
                  </div>
                ) : (
                  approvedTerminations.map((termination) => (
                    <button
                      key={termination._id}
                      onClick={() => handleSelectTermination(termination)}
                      className={`w-full text-left p-4 hover:bg-accent/50 transition-colors ${
                        selectedTermination?._id === termination._id 
                          ? 'bg-primary/5 border-l-2 border-l-primary' 
                          : ''
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm">
                        {typeof termination.employeeId === 'object'
                          ? (termination.employeeId as any).firstName + ' ' + (termination.employeeId as any).lastName
                          : `Employee ${termination.employeeId.slice(-6)}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {termination.terminationDate
                          ? `Effective: ${new Date(termination.terminationDate).toLocaleDateString()}`
                          : 'Date not set'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Settlement Details */}
          <div className="lg:col-span-2">
            {!selectedTermination ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-foreground font-medium">Select a termination</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose an approved termination to preview and process final settlement
                </p>
              </div>
            ) : loadingPreview ? (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading settlement preview...</p>
              </div>
            ) : settlementResult ? (
              /* Settlement Result */
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-green-50 dark:bg-green-900/20">
                  <h2 className="font-semibold text-green-800 dark:text-green-300">Settlement Processed Successfully</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {settlementResult.leaveEncashment && (
                      <>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Unused Leave Days</p>
                          <p className="text-2xl font-semibold text-foreground mt-1">
                            {settlementResult.leaveEncashment.unusedDays}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Leave Encashment</p>
                          <p className="text-2xl font-semibold text-foreground mt-1">
                            {formatCurrency(settlementResult.leaveEncashment.encashmentAmount)}
                          </p>
                        </div>
                      </>
                    )}
                    {settlementResult.terminationBenefit && (
                      <div className="col-span-2 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <p className="text-sm text-green-700 dark:text-green-400">Total Settlement Amount</p>
                        <p className="text-3xl font-bold text-green-800 dark:text-green-300 mt-1">
                          {formatCurrency(settlementResult.terminationBenefit.amount)}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{settlementResult.message}</p>
                  <button
                    onClick={() => {
                      setSelectedTermination(null);
                      setSettlementResult(null);
                      setPreview(null);
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Process Another Settlement
                  </button>
                </div>
              </div>
            ) : preview ? (
              /* Settlement Preview */
              <div className="space-y-4">
                {/* Employee Info */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{preview.employeeName}</h3>
                      {preview.terminationDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Effective Date: {new Date(preview.terminationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      preview.canTrigger
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {preview.canTrigger ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                </div>

                {/* Clearance Status */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h4 className="font-medium text-foreground mb-4">Clearance Status</h4>
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      preview.clearanceStatus.isComplete ? 'bg-green-500' : 
                      preview.clearanceStatus.hasChecklist ? 'bg-amber-500' : 'bg-muted'
                    }`} />
                    <span className="text-sm text-foreground">
                      {preview.clearanceStatus.isComplete ? 'Fully Cleared' :
                       preview.clearanceStatus.hasChecklist ? `Pending: ${preview.clearanceStatus.pendingItems?.join(', ')}` :
                       'No checklist created'}
                    </span>
                  </div>
                </div>

                {/* Leave Encashment */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h4 className="font-medium text-foreground mb-4">Leave Encashment</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Unused Days</p>
                      <p className="text-xl font-semibold text-foreground">{preview.leaveEncashment.unusedDays}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Daily Rate</p>
                      <p className="text-xl font-semibold text-foreground">{formatCurrency(preview.leaveEncashment.dailyRate)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Encashment</p>
                      <p className="text-xl font-semibold text-foreground">{formatCurrency(preview.leaveEncashment.encashmentAmount)}</p>
                    </div>
                  </div>
                  {preview.leaveEncashment.leaveDetails.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground mb-2">Breakdown by Leave Type</p>
                      <div className="space-y-2">
                        {preview.leaveEncashment.leaveDetails.map((detail, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{detail.leaveType}</span>
                            <span className="text-muted-foreground">
                              {detail.remaining} days (of {detail.entitled} entitled, {detail.taken} taken)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Termination Benefit */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h4 className="font-medium text-foreground mb-4">Termination Benefit</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Base Amount</p>
                      <p className="text-xl font-semibold text-foreground">{formatCurrency(preview.terminationBenefit.baseAmount)}</p>
                      {preview.terminationBenefit.configName && (
                        <p className="text-xs text-muted-foreground mt-1">{preview.terminationBenefit.configName}</p>
                      )}
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3">
                      <p className="text-xs text-primary">Total Settlement</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(preview.terminationBenefit.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Blockers */}
                {preview.blockers.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2">Cannot Process Settlement</h4>
                    <ul className="space-y-1">
                      {preview.blockers.map((blocker, i) => (
                        <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleTriggerSettlement}
                  disabled={!preview.canTrigger || submitting}
                  className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${
                    preview.canTrigger
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Process Final Settlement'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

