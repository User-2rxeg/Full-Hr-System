'use client';

import { ReactNode } from 'react';

// =====================================================
// Types
// =====================================================

export type KpiTrend = 'up' | 'down' | 'neutral';
export type KpiVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface KpiCardProps {
  /**
   * The title/label for the KPI
   */
  title: string;
  /**
   * The main value to display
   */
  value: string | number;
  /**
   * Optional subtitle or unit
   */
  subtitle?: string;
  /**
   * Icon to display
   */
  icon?: ReactNode;
  /**
   * Trend direction
   */
  trend?: KpiTrend;
  /**
   * Trend value (e.g., "+12%", "-5 days")
   */
  trendValue?: string;
  /**
   * Trend comparison period (e.g., "vs last month")
   */
  trendLabel?: string;
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: KpiVariant;
  /**
   * Whether the card is loading
   * @default false
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

// =====================================================
// Variant Configurations
// =====================================================

const variantStyles: Record<KpiVariant, { bg: string; iconBg: string; iconColor: string }> = {
  default: {
    bg: 'bg-white',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  success: {
    bg: 'bg-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  warning: {
    bg: 'bg-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  danger: {
    bg: 'bg-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  info: {
    bg: 'bg-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
};

// =====================================================
// Trend Icon
// =====================================================

function TrendIndicator({ trend, value, label }: { trend: KpiTrend; value?: string; label?: string }) {
  const trendStyles = {
    up: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ),
    },
    down: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
    },
    neutral: {
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      icon: (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      ),
    },
  };

  const style = trendStyles[trend];

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
        {style.icon}
        {value}
      </span>
      {label && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  );
}

// =====================================================
// Loading Skeleton
// =====================================================

function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
          <div className="h-8 bg-slate-200 rounded w-20 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-16" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

// =====================================================
// KpiCard Component
// =====================================================

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  trendLabel,
  variant = 'default',
  isLoading = false,
  className = '',
}: KpiCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return <KpiCardSkeleton />;
  }

  return (
    <div className={`${styles.bg} rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-medium text-slate-500 mb-1 truncate">
            {title}
          </p>
          
          {/* Value */}
          <p className="text-2xl font-bold text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">
              {subtitle}
            </p>
          )}
          
          {/* Trend */}
          {trend && trendValue && (
            <TrendIndicator trend={trend} value={trendValue} label={trendLabel} />
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`w-10 h-10 rounded-lg ${styles.iconBg} flex items-center justify-center flex-shrink-0 ml-4`}>
            <div className={styles.iconColor}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// Pre-built KPI Cards for Common Use Cases
// =====================================================

export function OpenPositionsKpi({ value, trend, trendValue }: { value: number; trend?: KpiTrend; trendValue?: string }) {
  return (
    <KpiCard
      title="Open Positions"
      value={value}
      variant="info"
      trend={trend}
      trendValue={trendValue}
      trendLabel="vs last month"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
    />
  );
}

export function TotalApplicationsKpi({ value, trend, trendValue }: { value: number; trend?: KpiTrend; trendValue?: string }) {
  return (
    <KpiCard
      title="Total Applications"
      value={value}
      variant="default"
      trend={trend}
      trendValue={trendValue}
      trendLabel="vs last month"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    />
  );
}

export function HiredKpi({ value, trend, trendValue }: { value: number; trend?: KpiTrend; trendValue?: string }) {
  return (
    <KpiCard
      title="Hired This Month"
      value={value}
      variant="success"
      trend={trend}
      trendValue={trendValue}
      trendLabel="vs last month"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}

export function TimeToHireKpi({ value, trend, trendValue }: { value: number; trend?: KpiTrend; trendValue?: string }) {
  return (
    <KpiCard
      title="Avg. Time to Hire"
      value={value}
      subtitle="days"
      variant={value > 30 ? 'warning' : 'default'}
      trend={trend}
      trendValue={trendValue}
      trendLabel="vs last month"
      icon={
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}
