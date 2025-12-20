'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { employeeProfileService } from '@/app/services/employee-profile';
import ChangeRequestCard, { ChangeRequest } from '@/app/components/hr-admin/ChangeRequestCard';

export default function ChangeRequestsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [limit] = useState(10);

    // Fetch change requests
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await employeeProfileService.getAllChangeRequests(page, limit);

                if (response.error) {
                    throw new Error(response.error);
                }

                const data = response.data as any;
                if (Array.isArray(data)) {
                    setRequests(data);
                    setTotalCount(data.length);
                } else if (data && Array.isArray(data.data)) {
                    setRequests(data.data);
                    setTotalCount(data.total || data.data.length);
                } else {
                    setRequests([]);
                    setTotalCount(0);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch change requests');
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [page, limit]);

    // Filter requests
    const filteredRequests = statusFilter === 'all'
        ? requests
        : requests.filter((r) => r.status === statusFilter);

    // Stats
    const stats = {
        pending: requests.filter((r) => r.status === 'PENDING').length,
        approved: requests.filter((r) => r.status === 'APPROVED').length,
        rejected: requests.filter((r) => r.status === 'REJECTED').length,
    };

    // Handlers
    const handleApprove = async (requestId: string, proposedChanges?: Record<string, any>) => {
        try {
            setProcessing(requestId);
            setError(null);

            const response = await employeeProfileService.processChangeRequest(requestId, {
                status: 'APPROVED',
                proposedChanges,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setSuccess('Change request approved ' + (proposedChanges ? 'and changes applied ' : '') + 'successfully');
            setTimeout(() => setSuccess(null), 3000);

            // Update local state by requestId
            setRequests((prev) =>
                prev.map((r) => (
                    r.requestId === requestId
                        ? {
                            ...r,
                            status: 'APPROVED' as const,
                            processedAt: new Date().toISOString(),
                            proposedChanges: proposedChanges || r.proposedChanges
                        }
                        : r
                ))
            );
        } catch (err: any) {
            setError(err.message || 'Failed to approve request');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (requestId: string, reason: string) => {
        try {
            setProcessing(requestId);
            setError(null);

            const response = await employeeProfileService.processChangeRequest(requestId, {
                status: 'REJECTED',
                rejectionReason: reason,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setSuccess('Change request rejected');
            setTimeout(() => setSuccess(null), 3000);

            // Update local state by requestId
            setRequests((prev) =>
                prev.map((r) =>
                    r.requestId === requestId
                        ? { ...r, status: 'REJECTED' as const, rejectionReason: reason, processedAt: new Date().toISOString() }
                        : r
                )
            );
        } catch (err: any) {
            setError(err.message || 'Failed to reject request');
        } finally {
            setProcessing(null);
        }
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="p-6 lg:p-8 bg-background min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Change Requests</h1>
                        </div>
                        <p className="text-muted-foreground">
                            Review and approve employee-submitted profile changes (US-E2-03)
                        </p>
                    </div>
                    <Link
                        href="/dashboard/hr-admin"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => setStatusFilter('PENDING')}
                        className={`p-4 rounded-xl border transition-all ${statusFilter === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-card border-border hover:border-amber-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.pending}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${statusFilter === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-muted'}`}>
                                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('APPROVED')}
                        className={`p-4 rounded-xl border transition-all ${statusFilter === 'APPROVED'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-card border-border hover:border-green-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.approved}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${statusFilter === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setStatusFilter('REJECTED')}
                        className={`p-4 rounded-xl border transition-all ${statusFilter === 'REJECTED'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-card border-border hover:border-red-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.rejected}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${statusFilter === 'REJECTED' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted'}`}>
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
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

                {success && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {success}
                    </div>
                )}

                {/* Filter Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${statusFilter === 'all'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            All
                        </button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredRequests.length} {statusFilter !== 'all' ? statusFilter.toLowerCase() : ''} request{filteredRequests.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Requests List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                                        <div className="h-3 bg-muted rounded w-1/4"></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-20 bg-muted rounded-lg"></div>
                                    <div className="h-20 bg-muted rounded-lg"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {statusFilter === 'PENDING' ? 'No Pending Requests' : 'No Change Requests Found'}
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {statusFilter === 'PENDING'
                                ? "All employee profile revision requests have been successfully processed."
                                : "There are currently no records that match the selected filter criteria."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map((request) => (
                            <ChangeRequestCard
                                key={request._id}
                                request={request}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                processing={processing === request.requestId}
                            />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Workflow Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Workflow Approval Process (BR 36)</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                            All profile changes must be made via workflow approval. Approved changes are automatically applied to the employee's profile. Notifications are sent to employees upon approval or rejection.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
