'use client';

import { cn } from '@/app/lib/utils';

export type StatusType =
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'active'
    | 'inactive'
    | 'draft'
    | 'processing'
    | 'paid'
    | 'resolved'
    | 'in_review'
    | 'under_review'
    | 'cancelled';

// Map various status strings to semantic status types
const statusMapping: Record<string, StatusType> = {
    // Success states
    success: 'success',
    approved: 'success',
    active: 'success',
    paid: 'success',
    resolved: 'success',
    completed: 'success',

    // Warning states
    warning: 'warning',
    pending: 'warning',
    draft: 'warning',

    // Error states
    error: 'error',
    rejected: 'error',
    failed: 'error',
    cancelled: 'error',
    suspended: 'error',
    terminated: 'error',

    // Info states
    info: 'info',
    processing: 'info',
    in_review: 'info',
    'in-review': 'info',
    under_review: 'info',
    submitted: 'info',

    // Neutral states
    neutral: 'neutral',
    inactive: 'neutral',
    unknown: 'neutral',
};

// Semantic styles using CSS variables
const statusStyles: Record<string, string> = {
    success: 'bg-[oklch(var(--success)/0.1)] text-[oklch(var(--success))] border-[oklch(var(--success)/0.2)] dark:bg-[oklch(var(--success)/0.15)] dark:text-[oklch(var(--success))]',
    warning: 'bg-[oklch(var(--warning)/0.1)] text-[oklch(var(--warning))] border-[oklch(var(--warning)/0.2)] dark:bg-[oklch(var(--warning)/0.15)]',
    error: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/15',
    info: 'bg-[oklch(var(--info)/0.1)] text-[oklch(var(--info))] border-[oklch(var(--info)/0.2)] dark:bg-[oklch(var(--info)/0.15)] dark:text-[oklch(var(--info))]',
    neutral: 'bg-muted text-muted-foreground border-border',
};

// Fallback styles using Tailwind colors (for better compatibility)
const statusStylesFallback: Record<string, string> = {
    success: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    error: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    neutral: 'bg-muted text-muted-foreground border-border',
};

// Label overrides for better display
const labelOverrides: Record<string, string> = {
    in_review: 'In Review',
    'in-review': 'In Review',
    under_review: 'Under Review',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    active: 'Active',
    inactive: 'Inactive',
    draft: 'Draft',
    processing: 'Processing',
    paid: 'Paid',
    resolved: 'Resolved',
    cancelled: 'Cancelled',
    submitted: 'Submitted',
    completed: 'Completed',
    suspended: 'Suspended',
    terminated: 'Terminated',
};

interface StatusBadgeProps {
    /** The status value - can be any string, will be normalized */
    status: string;
    /** Optional custom label to display instead of the status */
    label?: string;
    /** Additional CSS classes */
    className?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Whether to show a dot indicator */
    showDot?: boolean;
    /** Use fallback Tailwind colors instead of CSS variables */
    useFallbackColors?: boolean;
}

export function StatusBadge({
    status,
    label,
    className,
    size = 'md',
    showDot = false,
    useFallbackColors = true, // Default to fallback for maximum compatibility
}: StatusBadgeProps) {
    // Normalize the status string
    const normalizedStatus = status?.toLowerCase().replace(/[\s-]/g, '_') || 'neutral';

    // Get the semantic status type
    const semanticStatus = statusMapping[normalizedStatus] || 'neutral';

    // Get the styles
    const styles = useFallbackColors ? statusStylesFallback : statusStyles;
    const style = styles[semanticStatus] || styles.neutral;

    // Get the display label
    const displayLabel = label || labelOverrides[normalizedStatus] || status || 'Unknown';

    // Size classes
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
    };

    // Dot colors for each status
    const dotColors: Record<string, string> = {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        neutral: 'bg-gray-400',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-medium border',
                sizeClasses[size],
                style,
                className
            )}
        >
            {showDot && (
                <span
                    className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        dotColors[semanticStatus] || dotColors.neutral
                    )}
                />
            )}
            {displayLabel}
        </span>
    );
}

// Convenience components for common statuses
export function SuccessBadge({ label = 'Success', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="success" label={label} {...props} />;
}

export function WarningBadge({ label = 'Warning', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="warning" label={label} {...props} />;
}

export function ErrorBadge({ label = 'Error', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="error" label={label} {...props} />;
}

export function InfoBadge({ label = 'Info', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="info" label={label} {...props} />;
}

export function PendingBadge({ label = 'Pending', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="pending" label={label} {...props} />;
}

export function ApprovedBadge({ label = 'Approved', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="approved" label={label} {...props} />;
}

export function RejectedBadge({ label = 'Rejected', ...props }: Omit<StatusBadgeProps, 'status'>) {
    return <StatusBadge status="rejected" label={label} {...props} />;
}

export default StatusBadge;
