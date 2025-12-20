'use client';

import { ReactNode } from 'react';

// =====================================================
// Types
// =====================================================

export type EmptyStateVariant = 
  | 'default'
  | 'jobs'
  | 'applications'
  | 'interviews'
  | 'offers'
  | 'notifications'
  | 'candidates'
  | 'search'
  | 'filter';

interface EmptyStateProps {
  /**
   * The title to display
   */
  title?: string;
  /**
   * The description/message to display
   */
  description?: string;
  /**
   * Pre-defined variant for common empty states
   */
  variant?: EmptyStateVariant;
  /**
   * Custom icon to display
   */
  icon?: ReactNode;
  /**
   * Action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

// =====================================================
// Variant Configurations
// =====================================================

const variantConfig: Record<EmptyStateVariant, { title: string; description: string; icon: ReactNode }> = {
  default: {
    title: 'No data available',
    description: 'There is nothing to display at the moment.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
  },
  jobs: {
    title: 'No jobs available',
    description: 'There are no job postings at this time. Create a new job to get started.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  applications: {
    title: 'No applications yet',
    description: 'Applications will appear here once candidates start applying.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  interviews: {
    title: 'No interviews scheduled',
    description: 'Schedule interviews with candidates to see them here.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  offers: {
    title: 'No offers available',
    description: 'Job offers will appear here once they are created.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  notifications: {
    title: 'No notifications',
    description: "You're all caught up! Check back later for updates.",
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  candidates: {
    title: 'No candidates found',
    description: 'There are no candidates matching your criteria.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search or filter to find what you are looking for.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  filter: {
    title: 'No matches',
    description: 'No items match your current filters. Try adjusting or clearing your filters.',
    icon: (
      <svg className="w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
};

// =====================================================
// Size Configurations
// =====================================================

const sizeConfig = {
  sm: {
    iconSize: 'w-10 h-10',
    titleSize: 'text-sm',
    descriptionSize: 'text-xs',
    padding: 'py-6',
  },
  md: {
    iconSize: 'w-14 h-14',
    titleSize: 'text-base',
    descriptionSize: 'text-sm',
    padding: 'py-10',
  },
  lg: {
    iconSize: 'w-20 h-20',
    titleSize: 'text-lg',
    descriptionSize: 'text-base',
    padding: 'py-16',
  },
};

// =====================================================
// EmptyState Component
// =====================================================

export default function EmptyState({
  title,
  description,
  variant = 'default',
  icon,
  action,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  return (
    <div className={`text-center ${sizes.padding} ${className}`}>
      {/* Icon Container */}
      <div className={`${sizes.iconSize} mx-auto mb-4 p-3 bg-slate-100 rounded-full flex items-center justify-center`}>
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className={`${sizes.titleSize} font-semibold text-slate-900 mb-1`}>
        {displayTitle}
      </h3>

      {/* Description */}
      <p className={`${sizes.descriptionSize} text-slate-500 max-w-sm mx-auto`}>
        {displayDescription}
      </p>

      {/* Action Button */}
      {action && (
        <div className="mt-4">
          <button
            onClick={action.onClick}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-colors
              ${action.variant === 'secondary'
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }
            `}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
