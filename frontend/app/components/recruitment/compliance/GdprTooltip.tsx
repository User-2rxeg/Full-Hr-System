'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

// =====================================================
// Types
// =====================================================

interface GdprTooltipProps {
  /**
   * The element that triggers the tooltip
   */
  children: ReactNode;
  /**
   * Custom content for the tooltip
   */
  content?: ReactNode;
  /**
   * Position of the tooltip
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Additional CSS classes
   */
  className?: string;
}

// =====================================================
// Default GDPR Content
// =====================================================

function DefaultGdprContent() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="font-semibold text-slate-900">Data Protection Notice</span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        Your personal data will be processed in accordance with GDPR and applicable labor laws. 
        We collect only the information necessary for recruitment purposes.
      </p>
      <ul className="text-xs text-slate-500 space-y-1 ml-4 list-disc">
        <li>Data is stored securely and encrypted</li>
        <li>You can request data deletion at any time</li>
        <li>Information is shared only with hiring personnel</li>
      </ul>
    </div>
  );
}

// =====================================================
// GdprTooltip Component
// =====================================================

export default function GdprTooltip({
  children,
  content,
  position = 'top',
  className = '',
}: GdprTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Position classes
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow classes
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800',
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-help"
      >
        {children}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-72 p-3 bg-white border border-slate-200 rounded-lg shadow-lg ${positionClasses[position]}`}
        >
          {content || <DefaultGdprContent />}
          
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// =====================================================
// GDPR Info Icon Component
// =====================================================

export function GdprInfoIcon({ className = '' }: { className?: string }) {
  return (
    <GdprTooltip>
      <div className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors ${className}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-xs">GDPR Protected</span>
      </div>
    </GdprTooltip>
  );
}

// =====================================================
// GDPR Question Mark Icon
// =====================================================

export function GdprQuestionIcon({ className = '' }: { className?: string }) {
  return (
    <GdprTooltip>
      <div className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors cursor-help ${className}`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </GdprTooltip>
  );
}
