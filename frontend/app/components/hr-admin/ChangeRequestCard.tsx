'use client';

import { useState } from 'react';
import { StatusBadge } from '@/app/components/ui/status-badge';

export interface ChangeRequest {
    _id: string;
    requestId: string;
    employeeProfileId: {
        _id: string;
        firstName: string;
        lastName: string;
        fullName?: string;
        employeeNumber: string;
        workEmail: string;
    } | string;
    requestDescription: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    proposedChanges?: Record<string, any>;
    rejectionReason?: string;
    processedBy?: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface ChangeRequestCardProps {
    request: ChangeRequest;
    onApprove: (requestId: string, proposedChanges?: Record<string, any>) => Promise<void>;
    onReject: (requestId: string, reason: string) => Promise<void>;
    processing?: boolean;
}

const STATUS_ICONS: Record<string, string> = {
    PENDING: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    APPROVED: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    REJECTED: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    CANCELED: 'M6 18L18 6M6 6l12 12',
};

const FIELD_LABELS: Record<string, string> = {
    mobilePhone: 'Mobile Phone',
    homePhone: 'Home Phone',
    personalEmail: 'Personal Email',
    'address.streetAddress': 'Street Address',
    'address.city': 'City',
    'address.country': 'Country',
    biography: 'Biography',
    profilePictureUrl: 'Profile Picture URL',
    bankName: 'Bank Name',
    bankAccountNumber: 'Bank Account Number',
};

export default function ChangeRequestCard({ request, onApprove, onReject, processing }: ChangeRequestCardProps) {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [expanded, setExpanded] = useState(false);

    // State for structured changes (auto-apply)
    const [showApplyForm, setShowApplyForm] = useState(false);
    const [proposedChanges, setProposedChanges] = useState<Record<string, any>>({});
    const [newField, setNewField] = useState<string>('');
    const [newValue, setNewValue] = useState<string>('');

    const isPending = request.status === 'PENDING';

    const getEmployeeInfo = () => {
        const emp = request.employeeProfileId;
        if (emp && typeof emp === 'object') {
            return {
                name: emp.fullName || `${emp.firstName} ${emp.lastName}`,
                number: emp.employeeNumber,
                email: emp.workEmail,
                initials: `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase(),
            };
        }
        return { name: 'Unknown', number: 'ID: ' + String(emp || ''), email: '', initials: 'U' };
    };

    const employee = getEmployeeInfo();

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return;
        await onReject(request.requestId, rejectReason);
        setShowRejectModal(false);
        setRejectReason('');
    };

    const addProposedChange = () => {
        if (!newField || !newValue) return;
        setProposedChanges(prev => ({ ...prev, [newField]: newValue }));
        setNewField('');
        setNewValue('');
    };

    const removeProposedChange = (field: string) => {
        const updated = { ...proposedChanges };
        delete updated[field];
        setProposedChanges(updated);
    };

    const handleApproveClick = () => {
        // Gathering existing proposed changes
        const finalChanges = { ...proposedChanges };

        // If user typed something but didn't click "Add", include it anyway
        if (newField && newValue) {
            finalChanges[newField] = newValue;
        }

        onApprove(request.requestId, Object.keys(finalChanges).length > 0 ? finalChanges : undefined);
    };

    return (
        <div className={`bg-card border rounded-xl overflow-hidden transition-all ${isPending ? 'border-amber-500/30' : 'border-border'}`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                        {employee.initials}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.number} • {employee.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={request.status} showDot />
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        <svg className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 border-t border-border">
                <div className="mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Employee's Request
                    </p>
                    <div className="p-5 bg-muted/20 rounded-xl text-sm text-foreground border border-border/50 shadow-sm">
                        <p className="font-medium leading-relaxed text-foreground/90">{request.requestDescription}</p>
                        {request.reason && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Employee Justification</span>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">{request.reason}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Auto-Apply Changes Status */}
                {(request.status === 'APPROVED' && request.proposedChanges && Object.keys(request.proposedChanges).length > 0) && (
                    <div className="mb-4">
                        <p className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Applied Changes
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(request.proposedChanges).map(([field, value]) => (
                                <div key={field} className="flex flex-col p-3 bg-green-50/20 dark:bg-green-900/10 border border-green-200/30 dark:border-green-800/20 rounded-lg">
                                    <span className="text-[9px] font-black text-green-700 dark:text-green-500 uppercase tracking-widest mb-1">{FIELD_LABELS[field] || field}</span>
                                    <span className="text-sm font-semibold truncate">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Processing Controls for Pending */}
                {isPending && (
                    <div className="mt-4 space-y-4">
                        {!showApplyForm ? (
                            <button
                                onClick={() => setShowApplyForm(true)}
                                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 transition-colors group"
                            >
                                <div className="p-1 rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                Prepare Auto-Apply Profile Changes
                            </button>
                        ) : (
                            <div className="p-5 bg-background border border-amber-200/50 dark:border-amber-800/30 rounded-2xl space-y-5 shadow-lg shadow-amber-500/5 animate-in slide-in-from-top-2 duration-400">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                                        <p className="text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest text-shadow-sm">Prepare Auto-Apply Changes</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowApplyForm(false);
                                            setProposedChanges({});
                                            setNewField('');
                                            setNewValue('');
                                        }}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all uppercase tracking-tighter"
                                    >
                                        Cancel Preparation
                                    </button>
                                </div>

                                {/* New Field Entry */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-4">
                                        <select
                                            value={newField}
                                            onChange={(e) => setNewField(e.target.value)}
                                            className="w-full px-4 py-2.5 text-xs bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                        >
                                            <option value="">Choose profile field...</option>
                                            {Object.entries(FIELD_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-8 flex gap-3">
                                        {newField === 'biography' ? (
                                            <textarea
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                placeholder="Enter the official biographical text..."
                                                className="flex-1 px-4 py-2.5 text-xs bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none transition-all min-h-[100px] resize-none"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                placeholder="Enter the corrected value..."
                                                className="flex-1 px-4 py-2.5 text-xs bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                                onKeyPress={(e) => e.key === 'Enter' && addProposedChange()}
                                            />
                                        )}
                                        <button
                                            onClick={addProposedChange}
                                            disabled={!newField || !newValue}
                                            className="px-5 py-2.5 bg-foreground text-background font-bold text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-30 transition-all shadow-md active:scale-95 h-fit"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                {/* List of structured changes */}
                                {Object.keys(proposedChanges).length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {Object.entries(proposedChanges).map(([field, val]) => (
                                            <div key={field} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border/50 text-xs group hover:border-amber-500/30 transition-all">
                                                <div className="flex flex-col gap-0.5 truncate pr-2">
                                                    <span className="font-black text-amber-700 dark:text-amber-500 uppercase text-[8px] tracking-widest">{FIELD_LABELS[field] || field}</span>
                                                    <span className="text-foreground font-semibold truncate italic">"{String(val)}"</span>
                                                </div>
                                                <button onClick={() => removeProposedChange(field)} className="flex-shrink-0 text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Rejection reason if rejected */}
                {request.status === 'REJECTED' && request.rejectionReason && (
                    <div className="mt-3 p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 rounded-xl">
                        <p className="text-[10px] font-black text-red-600 dark:text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Rejection Note
                        </p>
                        <p className="text-sm text-red-800/90 dark:text-red-300/80 italic font-medium leading-relaxed">"{request.rejectionReason}"</p>
                    </div>
                )}

                {/* Expanded Details */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2.5 text-[10px]">
                        <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg">
                            <span className="text-muted-foreground font-bold uppercase tracking-tighter">Request Tracking ID</span>
                            <span className="font-mono text-foreground font-black bg-white dark:bg-black px-1.5 py-0.5 rounded shadow-sm">{request.requestId}</span>
                        </div>
                        <div className="flex justify-between px-2">
                            <span className="text-muted-foreground font-bold uppercase tracking-tighter">Created Date</span>
                            <span className="text-foreground font-semibold">{formatDate(request.createdAt)}</span>
                        </div>
                        {request.processedAt && (
                            <div className="flex justify-between px-2">
                                <span className="text-muted-foreground font-bold uppercase tracking-tighter">Finalized Date</span>
                                <span className="text-foreground font-semibold">{formatDate(request.processedAt)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions for Pending */}
            {isPending && (
                <div className="px-5 py-3.5 bg-muted/40 border-t border-border flex items-center justify-end gap-3.5">
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processing}
                        className="px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-white dark:bg-black border border-red-200 dark:border-red-900 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        Reject
                    </button>
                    <button
                        onClick={handleApproveClick}
                        disabled={processing}
                        className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-green-600 rounded-xl hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/30 transition-all transform active:scale-95 flex items-center gap-2.5 shadow-md shadow-green-600/20 disabled:opacity-50"
                    >
                        {processing ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Syncing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                {Object.keys(proposedChanges).length > 0 || (newField && newValue) ? 'Apply & Approve' : 'Approve Only'}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-7 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Reject Request</h3>
                        </div>
                        <div className="mb-6">
                            <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest pl-1">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all resize-none italic text-sm placeholder:text-muted-foreground/50 shadow-inner"
                                rows={3}
                                placeholder="Example: Document missing or info mismatch..."
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleRejectSubmit}
                                disabled={!rejectReason.trim() || processing}
                                className="w-full py-3 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                            >
                                Confirm Rejection
                            </button>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="w-full py-3 text-xs font-black uppercase tracking-widest text-foreground bg-muted/50 hover:bg-muted rounded-xl transition-all active:scale-[0.98]"
                            >
                                Nevermind
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
