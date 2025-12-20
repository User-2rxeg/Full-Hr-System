'use client';

import { ReactNode } from 'react';

// =====================================================
// Types
// =====================================================

export type ErrorStateVariant = 
  | 'default'
  | 'network'
  | 'server'
  | 'notFound'
  | 'timeout'
  | 'forbidden';

interface ErrorStateProps {
  /**
   * The title to display
   */
  title?: string;
  /**
   * The error message to display
   */
  message?: string;
  /**
   * Pre-defined variant for common error types
   */
  variant?: ErrorStateVariant;
  /**
   * Custom icon to display
   */
  icon?: ReactNode;
  /**
   * Retry action configuration
   */
  onRetry?: () => void;
  /**
   * Custom retry button label
   * @default 'Try again'
   */
  retryLabel?: string;
  /**
   * Additional action configuration
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /**
   * Error code or reference for support
   */
  errorCode?: string;
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

const variantConfig: Record<ErrorStateVariant, { title: string; message: string; icon: ReactNode }> = {
  default: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: (
      <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  network: {
    title: 'Connection error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    icon: (
      <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
      </svg>
    ),
  },
  server: {
    title: 'Server error',
    message: 'The server is currently unavailable. Please try again later.',
    icon: (
      <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  notFound: {
    title: 'Not found',
    message: 'The requested resource could not be found.',
    icon: (
      <svg className="w-full h-full text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  timeout: {
    title: 'Request timed out',
    message: 'The request took too long to complete. Please try again.',
    icon: (
      <svg className="w-full h-full text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  forbidden: {
    title: 'Access denied',
    message: 'You do not have permission to view this resource.',
    icon: (
      <svg className="w-full h-full text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
    messageSize: 'text-xs',
    padding: 'py-6',
  },
  md: {
    iconSize: 'w-14 h-14',
    titleSize: 'text-base',
    messageSize: 'text-sm',
    padding: 'py-10',
  },
  lg: {
    iconSize: 'w-20 h-20',
    titleSize: 'text-lg',
    messageSize: 'text-base',
    padding: 'py-16',
  },
};

// =====================================================
// ErrorState Component
// =====================================================

export default function ErrorState({
  title,
  message,
  variant = 'default',
  icon,
  onRetry,
  retryLabel = 'Try again',
  secondaryAction,
  errorCode,
  className = '',
  size = 'md',
}: ErrorStateProps) {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];

  const displayTitle = title || config.title;
  const displayMessage = message || config.message;
  const displayIcon = icon || config.icon;

  return (
    <div className={`text-center ${sizes.padding} ${className}`}>
      {/* Icon Container */}
      <div className={`${sizes.iconSize} mx-auto mb-4 p-3 bg-red-50 rounded-full flex items-center justify-center`}>
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className={`${sizes.titleSize} font-semibold text-slate-900 mb-1`}>
        {displayTitle}
      </h3>

      {/* Message */}
      <p className={`${sizes.messageSize} text-slate-500 max-w-sm mx-auto`}>
        {displayMessage}
      </p>

      {/* Error Code */}
      {errorCode && (
        <p className="text-xs text-slate-400 mt-2 font-mono">
          Error code: {errorCode}
        </p>
      )}

      {/* Actions */}
      {(onRetry || secondaryAction) && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {retryLabel}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
