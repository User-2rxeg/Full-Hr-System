'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';

// =====================================================
// Types
// =====================================================

interface ConsentModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when modal is closed
   */
  onClose: () => void;
  /**
   * Callback when consent is accepted
   */
  onAccept: () => void;
  /**
   * Callback when consent is declined
   */
  onDecline?: () => void;
  /**
   * Custom title
   * @default 'Data Processing Consent'
   */
  title?: string;
  /**
   * Custom content to display
   */
  children?: ReactNode;
  /**
   * Whether accept button should be disabled initially
   * @default true
   */
  requireScroll?: boolean;
}

// =====================================================
// Default Consent Content
// =====================================================

function DefaultConsentContent() {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Why We Collect Your Data</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          As part of our recruitment process, we need to collect and process certain personal information. 
          This helps us evaluate your application and match you with suitable opportunities within our organization.
        </p>
      </section>

      {/* What We Collect */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Information We Collect</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Contact Information:</strong> Name, email address, phone number</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Professional Background:</strong> Work history, education, skills, certifications</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Application Documents:</strong> Resume/CV, cover letter, portfolio (if applicable)</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Interview Notes:</strong> Assessments and feedback from interview panels</span>
          </li>
        </ul>
      </section>

      {/* How We Use It */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">How We Use Your Information</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-semibold">1.</span>
            <span>Evaluate your qualifications for the position you applied to</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-semibold">2.</span>
            <span>Contact you regarding your application status and schedule interviews</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-semibold">3.</span>
            <span>Consider you for other suitable positions within our organization</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 font-semibold">4.</span>
            <span>Comply with legal and regulatory requirements</span>
          </li>
        </ul>
      </section>

      {/* Who Has Access */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Who Can Access Your Data</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your information is accessible only to authorized personnel involved in the recruitment process, including:
        </p>
        <ul className="text-sm text-slate-600 mt-2 ml-4 list-disc space-y-1">
          <li>HR team members handling your application</li>
          <li>Hiring managers for the relevant positions</li>
          <li>Interview panel members (limited to assessment needs)</li>
        </ul>
      </section>

      {/* Data Retention */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">How Long We Keep Your Data</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          We retain your application data for <strong>12 months</strong> after the recruitment process concludes. 
          If you are hired, your data becomes part of your employee record. You can request earlier deletion 
          at any time.
        </p>
      </section>

      {/* Your Rights */}
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Your Rights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-xs text-slate-700">Access your data</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs text-slate-700">Correct inaccuracies</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-xs text-slate-700">Request deletion</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-xs text-slate-700">Export your data</span>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Questions?</h3>
        <p className="text-sm text-slate-600">
          Contact our Data Protection Officer at <span className="text-blue-600 font-medium">privacy@company.com</span> for 
          any questions about how we handle your data.
        </p>
      </section>
    </div>
  );
}

// =====================================================
// ConsentModal Component
// =====================================================

export default function ConsentModal({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  title = 'Data Processing Consent',
  children,
  requireScroll = true,
}: ConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(!requireScroll);
  const [isClosing, setIsClosing] = useState(false);

  // Handle scroll detection
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!requireScroll) return;
    
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [requireScroll, hasScrolledToBottom]);

  // Reset scroll state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(!requireScroll);
      setIsClosing(false);
    }
  }, [isOpen, requireScroll]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  // Handle accept
  const handleAccept = useCallback(() => {
    onAccept();
    handleClose();
  }, [onAccept, handleClose]);

  // Handle decline
  const handleDecline = useCallback(() => {
    if (onDecline) {
      onDecline();
    }
    handleClose();
  }, [onDecline, handleClose]);

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div 
        className={`relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all duration-200 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6"
          onScroll={handleScroll}
        >
          {children || <DefaultConsentContent />}
        </div>

        {/* Scroll hint */}
        {requireScroll && !hasScrolledToBottom && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Scroll to read all
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {requireScroll && !hasScrolledToBottom
                ? 'Please read the entire consent before proceeding'
                : 'By clicking Accept, you consent to our data processing practices'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecline}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={requireScroll && !hasScrolledToBottom}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  requireScroll && !hasScrolledToBottom
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
