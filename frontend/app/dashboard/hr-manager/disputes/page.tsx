'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { performanceService } from '@/app/services/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';

interface Dispute {
    _id: string;
    recordId: {
        _id: string;
        overallRating?: number;
        employeeId?: {
            _id: string;
            firstName: string;
            lastName: string;
            employeeNumber: string;
        };
        managerId?: {
            _id: string;
            firstName: string;
            lastName: string;
        };
        cycleId?: {
            _id: string;
            name: string;
        };
    };
    employeeId: {
        _id: string;
        firstName: string;
        lastName: string;
        employeeNumber: string;
        workEmail: string;
        primaryDepartmentId?: {
            name: string;
        };
    };
    reason: string;
    status: 'OPEN' | 'UNDER_REVIEW' | 'ADJUSTED' | 'REJECTED';
    resolution?: string;
    resolutionType?: 'UPHELD' | 'MODIFIED' | 'REJECTED';
    reviewerId?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    filedAt: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface DisputeStats {
    total: number;
    pending: number;
    underReview: number;
    resolved: number;
    rejected: number;
}

const statusColors: Record<string, string> = {
    OPEN: 'bg-primary/10 text-primary border-primary/20',
    UNDER_REVIEW: 'bg-muted text-muted-foreground border-border',
    ADJUSTED: 'bg-accent/10 text-accent-foreground border-accent/20',
    REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
};

const StatusIcon = ({ status, className }: { status: string; className?: string }) => {
    switch (status) {
        case 'OPEN':
            return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'UNDER_REVIEW':
            return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
        case 'ADJUSTED':
            return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'REJECTED':
            return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
        default:
            return null;
    }
};

const resolutionTypes = [
    { value: 'UPHELD', label: 'Upheld - Original rating stands', color: 'text-muted-foreground' },
    { value: 'MODIFIED', label: 'Modified - Rating adjusted', color: 'text-foreground' },
    { value: 'REJECTED', label: 'Rejected - Dispute invalid', color: 'text-muted-foreground' },
];

export default function DisputesPage() {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [stats, setStats] = useState<DisputeStats>({ total: 0, pending: 0, underReview: 0, resolved: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('pending');

    // Dialog states
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Resolution form
    const [resolutionForm, setResolutionForm] = useState({
        resolution: '',
        resolutionType: 'UPHELD' as 'UPHELD' | 'MODIFIED' | 'REJECTED',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [disputesRes, statsRes] = await Promise.all([
                performanceService.searchDisputes(),
                performanceService.getDisputeStats(),
            ]);

            if (disputesRes.error) {
                setError(disputesRes.error);
                return;
            }

            const disputesData = disputesRes.data as any;
            const rawList = (disputesData?.data || disputesData || []) as any[];

            const disputesList = (Array.isArray(rawList) ? rawList : []).map((d: any) => {
                // Map backend properties to frontend interface expectations
                const mappedDispute = {
                    ...d,
                    recordId: d.appraisalId, // Alias appraisalId to recordId
                    employeeId: d.raisedByEmployeeId, // Alias raisedByEmployeeId to employeeId
                };

                // Extract resolution type from summary if present
                let resolutionType = d.resolutionType;
                let resolution = d.resolutionSummary;

                if (resolution && resolution.startsWith('[')) {
                    const match = resolution.match(/^\[(UPHELD|MODIFIED|REJECTED)\]\s*(.*)/);
                    if (match) {
                        resolutionType = match[1];
                        resolution = match[2];
                    }
                }

                return {
                    ...mappedDispute,
                    resolution,
                    resolutionType: resolutionType || d.resolutionType,
                };
            });

            setDisputes(disputesList);

            if (statsRes.data && typeof statsRes.data === 'object' && 'total' in statsRes.data) {
                setStats(statsRes.data as DisputeStats);
            } else {
                // Calculate stats from disputes
                setStats({
                    total: disputesList.length,
                    pending: disputesList.filter((d: Dispute) => d.status === 'OPEN').length,
                    underReview: disputesList.filter((d: Dispute) => d.status === 'UNDER_REVIEW').length,
                    resolved: disputesList.filter((d: Dispute) => d.status === 'ADJUSTED').length,
                    rejected: disputesList.filter((d: Dispute) => d.status === 'REJECTED').length,
                });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch disputes');
        } finally {
            setLoading(false);
        }
    };

    const handleResolveDispute = async () => {
        if (!selectedDispute) return;
        try {
            setIsSubmitting(true);

            // Map frontend resolution type to backend status
            let status = 'REJECTED'; // Default for REJECTED and UPHELD
            if (resolutionForm.resolutionType === 'MODIFIED') {
                status = 'ADJUSTED';
            }

            // Construct payload matching ResolveAppraisalDisputeDto
            const payload = {
                disputeId: selectedDispute._id,
                // Send dummy ID for validation, controller overwrites with actual user ID
                resolvedByEmployeeId: selectedDispute.employeeId?._id || selectedDispute._id,
                resolutionSummary: `[${resolutionForm.resolutionType}] ${resolutionForm.resolution}`,
                status: status,
                resolvedAt: new Date().toISOString(),
            };

            const response = await performanceService.resolveDispute(selectedDispute._id, payload);
            if (response.error) {
                setError(response.error);
                return;
            }
            setIsResolveDialogOpen(false);
            setResolutionForm({ resolution: '', resolutionType: 'UPHELD' });
            setSelectedDispute(null);
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Failed to resolve dispute');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openViewDialog = (dispute: Dispute) => {
        setSelectedDispute(dispute);
        setIsViewDialogOpen(true);
    };

    const openResolveDialog = (dispute: Dispute) => {
        setSelectedDispute(dispute);
        setResolutionForm({ resolution: '', resolutionType: 'UPHELD' });
        setIsResolveDialogOpen(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    };

    const filteredDisputes = disputes.filter(d => {
        const matchesSearch =
            d.employeeId?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.employeeId?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.employeeId?.employeeNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.reason?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = true;
        if (activeTab === 'pending') matchesTab = d.status === 'OPEN';
        else if (activeTab === 'under_review') matchesTab = d.status === 'UNDER_REVIEW';
        else if (activeTab === 'resolved') matchesTab = d.status === 'ADJUSTED' || d.status === 'REJECTED';

        return matchesSearch && matchesTab;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading disputes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Link href="/dashboard/hr-manager" className="hover:text-foreground">HR Manager</Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">Dispute Nexus</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Integrity Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Review, investigate, and adjudicate performance rating disputes</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                    <button onClick={() => setError(null)} className="text-sm text-red-600 underline mt-1">Dismiss</button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{stats.total}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <StatusIcon status="PENDING" className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{stats.pending}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <StatusIcon status="UNDER_REVIEW" className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{stats.underReview}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">In Review</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <StatusIcon status="ADJUSTED" className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{stats.resolved}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adjusted</p>
                        </div>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <StatusIcon status="REJECTED" className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-muted-foreground">{stats.rejected}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rejected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                    placeholder="Search by employee name, ID, or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1">
                    <TabsTrigger value="pending" className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                        <StatusIcon status="OPEN" className="w-3.5 h-3.5" /> Open Registry
                        {stats.pending > 0 && (
                            <Badge className="bg-foreground text-background ml-2 h-5 min-w-5 flex items-center justify-center p-0 rounded-full">{stats.pending}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="under_review" className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                        <StatusIcon status="UNDER_REVIEW" className="w-3.5 h-3.5" /> Active Review
                        {stats.underReview > 0 && (
                            <Badge className="bg-muted-foreground text-background ml-2 h-5 min-w-5 flex items-center justify-center p-0 rounded-full">{stats.underReview}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="resolved" className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]">
                        <StatusIcon status="ADJUSTED" className="w-3.5 h-3.5" /> Finalized
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {/* Disputes List */}
                    <div className="space-y-4">
                        {filteredDisputes.map((dispute) => (
                            <div
                                key={dispute._id}
                                className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/50 transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            {/* Employee Avatar */}
                                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-foreground font-bold text-lg flex-shrink-0 border border-border">
                                                {dispute.employeeId?.firstName?.[0]}{dispute.employeeId?.lastName?.[0]}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h3 className="font-semibold text-slate-900">
                                                        {dispute.employeeId?.firstName} {dispute.employeeId?.lastName}
                                                    </h3>
                                                    <Badge className={statusColors[dispute.status]}>
                                                        {dispute.status.replace('_', ' ')}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                                                    <span>#{dispute.employeeId?.employeeNumber}</span>
                                                    {dispute.employeeId?.primaryDepartmentId?.name && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{dispute.employeeId.primaryDepartmentId.name}</span>
                                                        </>
                                                    )}
                                                    <span>•</span>
                                                    <span>Filed {getTimeAgo(dispute.filedAt || dispute.createdAt)}</span>
                                                </div>

                                                {/* Dispute Reason */}
                                                <div className="bg-slate-50 rounded-lg p-4 mb-3">
                                                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Dispute Reason</h4>
                                                    <p className="text-slate-700 line-clamp-3">{dispute.reason}</p>
                                                </div>

                                                {/* Rating Info */}
                                                {dispute.recordId?.overallRating && (
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-slate-600">
                                                            <strong>Original Rating:</strong> {dispute.recordId.overallRating}/5
                                                        </span>
                                                        {dispute.recordId?.managerId && (
                                                            <span className="text-slate-600">
                                                                <strong>Manager:</strong> {dispute.recordId.managerId.firstName} {dispute.recordId.managerId.lastName}
                                                            </span>
                                                        )}
                                                        {dispute.recordId?.cycleId && (
                                                            <span className="text-slate-600">
                                                                <strong>Cycle:</strong> {dispute.recordId.cycleId.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Resolution (if resolved) */}
                                                {dispute.status === 'ADJUSTED' && dispute.resolution && (
                                                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-semibold text-green-700 uppercase">Resolution</span>
                                                            {dispute.resolutionType && (
                                                                <Badge variant="outline" className="text-xs">{dispute.resolutionType}</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-green-800">{dispute.resolution}</p>
                                                        {dispute.reviewerId && (
                                                            <p className="text-xs text-green-600 mt-2">
                                                                Resolved by {dispute.reviewerId.firstName} {dispute.reviewerId.lastName}
                                                                {dispute.resolvedAt && ` on ${formatDate(dispute.resolvedAt)}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {dispute.status === 'REJECTED' && dispute.resolution && (
                                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                                        <span className="text-xs font-semibold text-red-700 uppercase">Rejection Reason</span>
                                                        <p className="text-sm text-red-800 mt-1">{dispute.resolution}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Button variant="outline" size="sm" onClick={() => openViewDialog(dispute)}>
                                            View Details
                                        </Button>
                                        {(dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') && (
                                            <Button size="sm" onClick={() => openResolveDialog(dispute)}>
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDisputes.length === 0 && (
                        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
                            <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">
                                {activeTab === 'pending' ? 'No pending disputes' :
                                    activeTab === 'under_review' ? 'No disputes under review' :
                                        'No resolved disputes'}
                            </h3>
                            <p className="text-slate-600">
                                {activeTab === 'pending' ? 'All disputes have been addressed' :
                                    activeTab === 'under_review' ? 'No disputes are currently being reviewed' :
                                        'Resolved disputes will appear here'}
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* View Dispute Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <StatusIcon status={selectedDispute?.status || 'OPEN'} className="w-6 h-6" />
                            Dispute Details
                        </DialogTitle>
                        <DialogDescription>
                            Review the dispute filed by {selectedDispute?.employeeId?.firstName} {selectedDispute?.employeeId?.lastName}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDispute && (
                        <div className="space-y-6 py-4">
                            {/* Employee Info */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                    {selectedDispute.employeeId?.firstName?.[0]}{selectedDispute.employeeId?.lastName?.[0]}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-lg text-slate-900">
                                        {selectedDispute.employeeId?.firstName} {selectedDispute.employeeId?.lastName}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                        #{selectedDispute.employeeId?.employeeNumber} • {selectedDispute.employeeId?.workEmail}
                                    </p>
                                    {selectedDispute.employeeId?.primaryDepartmentId?.name && (
                                        <p className="text-sm text-slate-500">{selectedDispute.employeeId.primaryDepartmentId.name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <Label className="text-sm text-slate-500">Status</Label>
                                <div className="mt-1">
                                    <Badge className={`${statusColors[selectedDispute.status]} text-sm px-3 py-1 flex items-center gap-2 w-fit`}>
                                        <StatusIcon status={selectedDispute.status} className="w-4 h-4" />
                                        {selectedDispute.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>

                            {/* Appraisal Context */}
                            {selectedDispute.recordId && (
                                <div>
                                    <Label className="text-sm text-slate-500">Appraisal Details</Label>
                                    <div className="mt-2 p-4 border border-slate-200 rounded-lg space-y-2">
                                        {selectedDispute.recordId.overallRating && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">Original Rating:</span>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <svg
                                                            key={star}
                                                            className={`w-5 h-5 ${star <= selectedDispute.recordId!.overallRating! ? 'text-yellow-400' : 'text-slate-200'}`}
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                    <span className="ml-2 font-medium">{selectedDispute.recordId.overallRating}/5</span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedDispute.recordId.managerId && (
                                            <p className="text-sm text-slate-600">
                                                <strong>Evaluator:</strong> {selectedDispute.recordId.managerId.firstName} {selectedDispute.recordId.managerId.lastName}
                                            </p>
                                        )}
                                        {selectedDispute.recordId.cycleId && (
                                            <p className="text-sm text-slate-600">
                                                <strong>Cycle:</strong> {selectedDispute.recordId.cycleId.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dispute Reason */}
                            <div>
                                <Label className="text-sm text-slate-500">Employee's Dispute Reason</Label>
                                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-slate-800 whitespace-pre-wrap">{selectedDispute.reason}</p>
                                </div>
                            </div>

                            {/* Filed Date */}
                            <div>
                                <Label className="text-sm text-slate-500">Filed On</Label>
                                <p className="mt-1 text-slate-900">{formatDate(selectedDispute.filedAt || selectedDispute.createdAt)}</p>
                            </div>

                            {/* Resolution (if exists) */}
                            {selectedDispute.resolution && (
                                <div>
                                    <Label className="text-sm text-slate-500">Resolution</Label>
                                    <div className={`mt-2 p-4 rounded-lg border ${selectedDispute.status === 'ADJUSTED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                        }`}>
                                        {selectedDispute.resolutionType && (
                                            <Badge className="mb-2">{selectedDispute.resolutionType}</Badge>
                                        )}
                                        <p className="text-slate-800 whitespace-pre-wrap">{selectedDispute.resolution}</p>
                                        {selectedDispute.reviewerId && (
                                            <p className="text-sm text-slate-500 mt-3">
                                                Resolved by {selectedDispute.reviewerId.firstName} {selectedDispute.reviewerId.lastName}
                                                {selectedDispute.resolvedAt && ` on ${formatDate(selectedDispute.resolvedAt)}`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                        {selectedDispute && (selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW') && (
                            <Button onClick={() => {
                                setIsViewDialogOpen(false);
                                openResolveDialog(selectedDispute);
                            }}>
                                Resolve Dispute
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resolve Dispute Dialog */}
            <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Resolve Dispute</DialogTitle>
                        <DialogDescription>
                            Provide your decision and resolution for this dispute
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Quick Summary */}
                        {selectedDispute && (
                            <div className="p-4 bg-slate-50 rounded-lg">
                                <p className="font-medium text-slate-900">
                                    {selectedDispute.employeeId?.firstName} {selectedDispute.employeeId?.lastName}
                                </p>
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{selectedDispute.reason}</p>
                            </div>
                        )}

                        {/* Resolution Type */}
                        <div>
                            <Label htmlFor="resolutionType">Resolution Decision</Label>
                            <Select
                                value={resolutionForm.resolutionType}
                                onValueChange={(value: 'UPHELD' | 'MODIFIED' | 'REJECTED') =>
                                    setResolutionForm(prev => ({ ...prev, resolutionType: value }))
                                }
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {resolutionTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <span className={type.color}>{type.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Notes */}
                        <div>
                            <Label htmlFor="resolution">Resolution Notes</Label>
                            <Textarea
                                id="resolution"
                                value={resolutionForm.resolution}
                                onChange={(e) => setResolutionForm(prev => ({ ...prev, resolution: e.target.value }))}
                                placeholder="Provide detailed explanation for your decision..."
                                className="mt-1"
                                rows={5}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This explanation will be visible to the employee
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResolveDispute}
                            disabled={isSubmitting || !resolutionForm.resolution.trim()}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Resolution'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
