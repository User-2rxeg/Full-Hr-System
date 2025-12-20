'use client';

import { useRouter } from 'next/navigation';

// =====================================================
// Types
// =====================================================

interface AccessDeniedProps {
  /**
   * The title to display
   * @default 'Access Denied'
   */
  title?: string;
  /**
   * The message to display
   */
  message?: string;
  /**
   * Show "Go Back" button
   * @default true
   */
  showGoBack?: boolean;
  /**
   * Custom back route (defaults to browser history)
   */
  backRoute?: string;
  /**
   * Show "Contact Admin" button
   * @default true
   */
  showContactAdmin?: boolean;
  /**
   * Admin contact email or link
   */
  adminContact?: string;
  /**
   * Custom redirect URL
   */
  redirectUrl?: string;
  /**
   * Custom redirect label
   */
  redirectLabel?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Display variant
   * @default 'page'
   */
  variant?: 'page' | 'inline' | 'card';
}

// =====================================================
// Size Configurations
// =====================================================

const sizeConfig = {
  sm: {
    iconSize: 'w-12 h-12',
    iconInner: 'w-6 h-6',
    titleSize: 'text-base',
    messageSize: 'text-sm',
    padding: 'py-8',
  },
  md: {
    iconSize: 'w-16 h-16',
    iconInner: 'w-8 h-8',
    titleSize: 'text-lg',
    messageSize: 'text-sm',
    padding: 'py-12',
  },
  lg: {
    iconSize: 'w-20 h-20',
    iconInner: 'w-10 h-10',
    titleSize: 'text-xl',
    messageSize: 'text-base',
    padding: 'py-16',
  },
};

// =====================================================
// AccessDenied Component
// =====================================================

export default function AccessDenied({
  title = 'Access Denied',
  message = "You don't have permission to view this content. Please contact your administrator if you believe this is an error.",
  showGoBack = true,
  backRoute,
  showContactAdmin = true,
  adminContact,
  redirectUrl,
  redirectLabel = 'Go to Dashboard',
  className = '',
  size = 'md',
  variant = 'page',
}: AccessDeniedProps) {
  const router = useRouter();
  const sizes = sizeConfig[size];

  const handleGoBack = () => {
    if (backRoute) {
      router.push(backRoute);
    } else {
      router.back();
    }
  };

  const handleRedirect = () => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  };

  const handleContactAdmin = () => {
    if (adminContact) {
      if (adminContact.includes('@')) {
        window.location.href = `mailto:${adminContact}`;
      } else {
        window.open(adminContact, '_blank');
      }
    }
  };

  const variantClasses = {
    page: 'min-h-[400px] flex items-center justify-center',
    inline: '',
    card: 'bg-white border border-slate-200 rounded-xl shadow-sm',
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      <div className={`text-center ${sizes.padding} px-4`}>
        {/* Icon */}
        <div className={`${sizes.iconSize} mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center`}>
          <svg
            className={`${sizes.iconInner} text-red-500`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className={`${sizes.titleSize} font-semibold text-slate-900 mb-2`}>
          {title}
        </h3>

        {/* Message */}
        <p className={`${sizes.messageSize} text-slate-500 max-w-md mx-auto mb-6`}>
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {showGoBack && (
            <button
              onClick={handleGoBack}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </button>
          )}

          {redirectUrl && (
            <button
              onClick={handleRedirect}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {redirectLabel}
            </button>
          )}

          {showContactAdmin && adminContact && (
            <button
              onClick={handleContactAdmin}
              className="px-4 py-2 rounded-lg font-medium text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Contact Administrator
            </button>
          )}
        </div>

        {/* Help text */}
        {!adminContact && showContactAdmin && (
          <p className="text-xs text-slate-400 mt-6">
            If you need access, please contact your system administrator.
          </p>
        )}
      </div>
    </div>
  );
}
