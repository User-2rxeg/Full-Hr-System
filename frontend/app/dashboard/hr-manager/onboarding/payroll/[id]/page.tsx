'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { onboardingService, Onboarding, Contract } from '@/app/services/onboarding';

export default function PayrollInitiationPage() {
  const params = useParams();
  const onboardingId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [payrollTriggered, setPayrollTriggered] = useState(false);
  const [bonusProcessed, setBonusProcessed] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    if (onboardingId) {
      fetchData();
    }
  }, [onboardingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const onboardingData = await onboardingService.getOnboardingById(onboardingId);
      setOnboarding(onboardingData);

      // Extract contract ID - handle both populated object and string ID
      const contractId = typeof onboardingData.contractId === 'object'
        ? (onboardingData.contractId as any)?._id || (onboardingData.contractId as any)?.id
        : onboardingData.contractId;

      if (contractId) {
        try {
          const contractData = await onboardingService.getContractDetails(contractId);
          setContract(contractData);
        } catch {
          // Contract details might not be accessible
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPayroll = async () => {
    // Extract contract ID - handle both populated object and string ID
    const contractId = typeof onboarding?.contractId === 'object'
      ? (onboarding?.contractId as any)?._id || (onboarding?.contractId as any)?.id
      : onboarding?.contractId;

    if (!contractId) return;

    try {
      setTriggering(true);
      setError(null);
      await onboardingService.triggerPayrollInitiation({
        contractId: contractId,
      });
      setPayrollTriggered(true);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger payroll initiation');
    } finally {
      setTriggering(false);
    }
  };

  const handleProcessBonus = async () => {
    // Extract contract ID - handle both populated object and string ID
    const contractId = typeof onboarding?.contractId === 'object'
      ? (onboarding?.contractId as any)?._id || (onboarding?.contractId as any)?.id
      : onboarding?.contractId;

    if (!contractId) return;

    try {
      setTriggering(true);
      setError(null);
      await onboardingService.processSigningBonus(contractId);
      setBonusProcessed(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process signing bonus');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Onboarding not found
        </div>
        <Link href="/dashboard/hr-manager/onboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Onboarding Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/onboarding" className="text-muted-foreground hover:text-foreground">
              Onboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <Link
              href={`/dashboard/hr-manager/onboarding/employee/${onboardingId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              Employee
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Payroll Setup</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Payroll and Benefits Setup</h1>
          <p className="text-muted-foreground mt-1">Phase 6: Initialize payroll and process signing bonuses (ONB-018, ONB-019)</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Contract Information</h2>
        {contract ? (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="mt-1 text-foreground">{contract.role || 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Gross Salary</dt>
              <dd className="mt-1 text-foreground">
                {contract.grossSalary ? `$${contract.grossSalary.toLocaleString()}` : 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Signing Bonus</dt>
              <dd className="mt-1 text-foreground">
                {contract.signingBonus ? `$${contract.signingBonus.toLocaleString()}` : 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Acceptance Date</dt>
              <dd className="mt-1 text-foreground">
                {contract.acceptanceDate ? new Date(contract.acceptanceDate).toLocaleDateString() : 'Not specified'}
              </dd>
            </div>
            {contract.benefits && contract.benefits.length > 0 && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Benefits</dt>
                <dd className="mt-1 text-foreground">{contract.benefits.join(', ')}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground">Contract details not available</p>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Payroll Initiation (ONB-018)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Per BR 9(a): Auto tasks generated for HR include payroll and benefits creation.
          Triggers REQ-PY-23 for automatic payroll processing.
        </p>

        {payrollTriggered ? (
          <div className="bg-green-100 border border-green-200 dark:bg-green-900/20 dark:border-green-900/30 p-4 rounded-lg">
            <p className="text-green-800 dark:text-green-300 font-medium">Payroll initiation has been triggered successfully.</p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              The employee has been added to the current payroll cycle.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30 p-4 rounded-lg">
              <p className="text-blue-800 dark:text-blue-300">
                Click the button below to trigger automatic payroll initiation based on the contract signing date.
              </p>
            </div>
            <button
              onClick={handleTriggerPayroll}
              disabled={triggering || !onboarding.contractId}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {triggering ? 'Processing...' : 'Trigger Payroll Initiation'}
            </button>
          </div>
        )}
      </div>

      {contract?.signingBonus && contract.signingBonus > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Signing Bonus Processing (ONB-019)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Per BR 9(a): Bonuses are treated as distinct payroll components.
            Triggers REQ-PY-27 for automatic signing bonus processing.
          </p>

          <div className="mb-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">Signing Bonus Amount</p>
            <p className="text-2xl font-semibold text-foreground">${contract.signingBonus.toLocaleString()}</p>
          </div>

          {bonusProcessed ? (
            <div className="bg-green-100 border border-green-200 dark:bg-green-900/20 dark:border-green-900/30 p-4 rounded-lg">
              <p className="text-green-800 dark:text-green-300 font-medium">Signing bonus has been processed successfully.</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                The bonus has been scheduled for processing with the next payroll run.
              </p>
            </div>
          ) : (
            <button
              onClick={handleProcessBonus}
              disabled={triggering}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {triggering ? 'Processing...' : 'Process Signing Bonus'}
            </button>
          )}
        </div>
      )}

      <div className="bg-muted/30 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Setup Status</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                payrollTriggered ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {payrollTriggered ? '✓' : '1'}
            </div>
            <span className={payrollTriggered ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
              Payroll Initiation {payrollTriggered ? '(Complete)' : '(Pending)'}
            </span>
          </div>
          {contract?.signingBonus && contract.signingBonus > 0 && (
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  bonusProcessed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {bonusProcessed ? '✓' : '2'}
              </div>
              <span className={bonusProcessed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                Signing Bonus {bonusProcessed ? '(Complete)' : '(Pending)'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground">
              {contract?.signingBonus && contract.signingBonus > 0 ? '3' : '2'}
            </div>
            <span className="text-muted-foreground">Benefits Enrollment (Auto-configured)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

