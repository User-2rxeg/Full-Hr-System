'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  offboardingService,
  TerminationRequest,
  TerminationStatus,
} from '@/app/services/offboarding';
import { StatusBadge } from '@/app/components/ui/status-badge';

export default function ResignationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resignations, setResignations] = useState<TerminationRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | TerminationStatus>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await offboardingService.getAllResignationRequests();
      setResignations(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resignations');
    } finally {
      setLoading(false);
    }
  };

  const filteredResignations = resignations.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/offboarding" className="text-muted-foreground hover:text-foreground">
              Offboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Resignations</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Resignation Requests</h1>
          <p className="text-muted-foreground mt-1">Review and process employee resignation requests (OFF-018, OFF-019)</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
          <button onClick={fetchData} className="ml-4 text-destructive hover:underline">
            Retry
          </button>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">All Resignation Requests</h2>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 text-sm bg-background border border-input rounded-md text-foreground"
          >
            <option value="all">All Status</option>
            <option value={TerminationStatus.PENDING}>Pending</option>
            <option value={TerminationStatus.UNDER_REVIEW}>Under Review</option>
            <option value={TerminationStatus.APPROVED}>Approved</option>
            <option value={TerminationStatus.REJECTED}>Rejected</option>
          </select>
        </div>

        <div className="divide-y divide-border">
          {filteredResignations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No resignation requests found.</p>
            </div>
          ) : (
            filteredResignations.map((resignation) => {
              const employee = typeof resignation.employeeId === 'object' ? resignation.employeeId as any : null;
              const employeeName = employee
                ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee'
                : 'Employee';
              return (
                <Link
                  key={resignation._id}
                  href={`/dashboard/hr-manager/offboarding/resignations/${resignation._id}`}
                  className="block p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-foreground">{employeeName}</h3>
                        <StatusBadge status={resignation.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Reason: {resignation.reason}</p>
                      {resignation.terminationDate && (
                        <p className="text-sm text-muted-foreground">
                          Effective Date: {new Date(resignation.terminationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Submitted: {new Date(resignation.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
