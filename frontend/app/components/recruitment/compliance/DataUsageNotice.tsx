'use client';

import { ReactNode } from 'react';

// =====================================================
// Types
// =====================================================

interface DataUsageNoticeProps {
  /**
   * Variant of the notice
   * @default 'default'
   */
  variant?: 'default' | 'compact' | 'inline' | 'card';
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom content
   */
  children?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show the privacy policy link
   * @default true
   */
  showPrivacyLink?: boolean;
  /**
   * Privacy policy URL
   * @default '#'
   */
  privacyPolicyUrl?: string;
}

// =====================================================
// DataUsageNotice Component
// =====================================================

export default function DataUsageNotice({
  variant = 'default',
  title,
  children,
  className = '',
  showPrivacyLink = true,
  privacyPolicyUrl = '#',
}: DataUsageNoticeProps) {
  // Default content based on variant
  const defaultContent = {
    default: (
      <>
        <p className="text-sm text-slate-600 leading-relaxed">
          The information you provide will be used solely for recruitment purposes. 
          Your data is protected in accordance with GDPR and will be handled by authorized HR personnel only. 
          We retain application data for 12 months after the recruitment process concludes.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Your data is encrypted and stored securely
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You can request to access, modify, or delete your data at any time
          </li>
          <li className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Data is shared only with hiring team members
          </li>
        </ul>
      </>
    ),
    compact: (
      <p className="text-xs text-slate-500 leading-relaxed">
        Your data is protected under GDPR. We collect only necessary information for recruitment, 
        store it securely, and retain it for 12 months. You have the right to access, correct, or delete your data at any time.
      </p>
    ),
    inline: (
      <span className="text-xs text-slate-500">
        Your information will be processed in accordance with GDPR.
      </span>
    ),
    card: (
      <>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">GDPR Compliant</h4>
            <p className="text-xs text-slate-500">Your data is protected</p>
          </div>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            We take your privacy seriously. The personal data you submit will be:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs">Encrypted</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs">Limited access</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">12 month retention</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-xs">Right to delete</span>
            </div>
          </div>
        </div>
      </>
    ),
  };

  // Variant-specific container classes
  const containerClasses = {
    default: 'p-4 bg-slate-50 border border-slate-200 rounded-lg',
    compact: 'p-3 bg-slate-50 border border-slate-100 rounded-lg',
    inline: '',
    card: 'p-5 bg-white border border-slate-200 rounded-xl shadow-sm',
  };

  // Default titles
  const defaultTitles = {
    default: 'How We Use Your Data',
    compact: '',
    inline: '',
    card: '',
  };

  const displayTitle = title ?? defaultTitles[variant];

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      {displayTitle && (
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-800">{displayTitle}</h3>
        </div>
      )}

      {children || defaultContent[variant]}

      {showPrivacyLink && variant !== 'inline' && (
        <div className={`${variant === 'compact' ? 'mt-2' : 'mt-4'}`}>
          <a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            Read our full Privacy Policy
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Pre-built Notice Components
// =====================================================

/**
 * Compact data usage notice for forms
 */
export function CompactDataNotice({ className = '' }: { className?: string }) {
  return <DataUsageNotice variant="compact" className={className} />;
}

/**
 * Inline data usage notice for small spaces
 */
export function InlineDataNotice({ className = '' }: { className?: string }) {
  return <DataUsageNotice variant="inline" showPrivacyLink={false} className={className} />;
}

/**
 * Card-style data usage notice for prominent display
 */
export function DataUsageCard({ className = '' }: { className?: string }) {
  return <DataUsageNotice variant="card" className={className} />;
}

/**
 * Application form data notice
 */
export function ApplicationDataNotice({ className = '' }: { className?: string }) {
  return (
    <DataUsageNotice
      variant="default"
      title="About Your Application Data"
      className={className}
    >
      <p className="text-sm text-slate-600 leading-relaxed">
        When you submit this application, the following information will be collected and processed:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-500">
        <li className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong>Personal details</strong> – Name, contact information, and professional background
          </span>
        </li>
        <li className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong>Documents</strong> – Resume, cover letter, and any supporting materials
          </span>
        </li>
        <li className="flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            <strong>Assessment data</strong> – Interview notes and evaluation feedback
          </span>
        </li>
      </ul>
      <p className="mt-3 text-sm text-slate-600">
        This data helps us evaluate your suitability for the role and maintain records for compliance. 
        Your privacy is important to us.
      </p>
    </DataUsageNotice>
  );
}
