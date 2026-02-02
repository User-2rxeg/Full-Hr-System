'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// PORTAL PAGE HEADER
// ============================================
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PortalPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PortalPageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className
}: PortalPageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/portal" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Portal</span>
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3.5 w-3.5" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PORTAL CARD
// ============================================
interface PortalCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function PortalCard({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md'
}: PortalCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm",
        paddingClasses[padding],
        hover && "hover:shadow-md hover:border-primary/30 transition-all cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ============================================
// PORTAL STAT CARD
// ============================================
interface PortalStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
    positive?: boolean;
  };
  accentColor?: 'primary' | 'accent' | 'destructive' | 'warning' | 'muted';
  className?: string;
}

export function PortalStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'primary',
  className,
}: PortalStatCardProps) {
  const accentClasses = {
    primary: 'border-l-primary bg-primary/5',
    accent: 'border-l-accent bg-accent/5',
    destructive: 'border-l-destructive bg-destructive/5',
    warning: 'border-l-warning bg-warning/5',
    muted: 'border-l-muted-foreground bg-muted/50',
  };

  const iconBgClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent-foreground',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border border-l-4 p-5 shadow-sm",
      accentClasses[accentColor],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-accent-foreground" : "text-destructive"
            )}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            iconBgClasses[accentColor]
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PORTAL LOADING STATE
// ============================================
interface PortalLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function PortalLoading({ message = "Loading...", fullScreen = false }: PortalLoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-muted animate-pulse"></div>
        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
      <p className="text-muted-foreground font-medium animate-pulse">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

// ============================================
// PORTAL EMPTY STATE
// ============================================
interface PortalEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function PortalEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PortalEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================
// PORTAL ERROR STATE
// ============================================
interface PortalErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function PortalErrorState({
  title = "Something went wrong",
  message,
  onRetry
}: PortalErrorStateProps) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ============================================
// PORTAL TABLE
// ============================================
interface PortalTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface PortalTableProps<T> {
  columns: PortalTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function PortalTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyState,
  className,
}: PortalTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={cn(
                "hover:bg-muted/50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-sm text-foreground", col.className)}>
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// PORTAL TABS
// ============================================
interface PortalTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface PortalTabsProps {
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function PortalTabs({ tabs, activeTab, onTabChange, className }: PortalTabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-muted rounded-lg", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={cn(
              "px-1.5 py-0.5 text-xs rounded-full",
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// PORTAL BADGE
// ============================================
interface PortalBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function PortalBadge({
  children,
  variant = 'default',
  size = 'sm',
  className
}: PortalBadgeProps) {
  const variantClasses = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-accent/10 text-accent-foreground border-accent/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    outline: 'bg-transparent text-muted-foreground border-border',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={cn(
      "inline-flex items-center font-medium rounded-full border",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  );
}

// ============================================
// PORTAL MODAL
// ============================================
interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PortalModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: PortalModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={cn(
          "relative w-full bg-card rounded-xl shadow-xl border border-border transform transition-all",
          sizeClasses[size]
        )}>
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// PORTAL FORM COMPONENTS
// ============================================
interface PortalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function PortalInput({
  label,
  error,
  hint,
  className,
  ...props
}: PortalInputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <input
        className={cn(
          "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

interface PortalSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function PortalSelect({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}: PortalSelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <select
        className={cn(
          "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

interface PortalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function PortalTextarea({
  label,
  error,
  className,
  ...props
}: PortalTextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        rows={4}
        {...props}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================
// PORTAL BUTTON
// ============================================
interface PortalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function PortalButton({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  disabled,
  className,
  ...props
}: PortalButtonProps) {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
    ghost: 'bg-transparent text-foreground hover:bg-muted',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}

// ============================================
// PORTAL LIST ITEM
// ============================================
interface PortalListItemProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PortalListItem({
  title,
  subtitle,
  meta,
  icon,
  badge,
  actions,
  onClick,
  className,
}: PortalListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-card border border-border rounded-lg",
        "hover:shadow-sm hover:border-primary/20 transition-all",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground truncate">{title}</h4>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
        {meta && (
          <div className="text-xs text-muted-foreground mt-1">{meta}</div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
