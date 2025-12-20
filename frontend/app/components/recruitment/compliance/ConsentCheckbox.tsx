'use client';

import { useState, useCallback } from 'react';
import ConsentModal from './ConsentModal';

// =====================================================
// Types
// =====================================================

interface ConsentCheckboxProps {
  /**
   * Controlled checked state
   */
  checked?: boolean;
  /**
   * Callback when checkbox state changes
   */
  onChange?: (checked: boolean) => void;
  /**
   * Whether to show the modal when clicking "Learn more"
   * @default true
   */
  showModal?: boolean;
  /**
   * Whether the checkbox is required
   * @default true
   */
  required?: boolean;
  /**
   * Whether to show error state
   * @default false
   */
  error?: boolean;
  /**
   * Error message to display
   */
  errorMessage?: string;
  /**
   * Whether the checkbox is disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * Custom label text
   */
  label?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * ID for the checkbox input
   */
  id?: string;
  /**
   * Name for the checkbox input
   */
  name?: string;
}

// =====================================================
// ConsentCheckbox Component
// =====================================================

export default function ConsentCheckbox({
  checked: controlledChecked,
  onChange,
  showModal = true,
  required = true,
  error = false,
  errorMessage,
  disabled = false,
  label,
  className = '',
  id = 'consent-checkbox',
  name = 'consent',
}: ConsentCheckboxProps) {
  // Internal state for uncontrolled mode
  const [internalChecked, setInternalChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine if controlled or uncontrolled
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  // Handle checkbox change
  const handleChange = useCallback(() => {
    if (disabled) return;

    const newValue = !isChecked;
    
    if (!isControlled) {
      setInternalChecked(newValue);
    }
    
    if (onChange) {
      onChange(newValue);
    }
  }, [isChecked, isControlled, disabled, onChange]);

  // Handle modal accept
  const handleModalAccept = useCallback(() => {
    if (!isControlled) {
      setInternalChecked(true);
    }
    
    if (onChange) {
      onChange(true);
    }
  }, [isControlled, onChange]);

  // Default label
  const defaultLabel = (
    <>
      I consent to the collection and processing of my personal data for recruitment purposes. 
      I understand that my data will be handled in accordance with GDPR and applicable data protection laws.
    </>
  );

  return (
    <>
      <div className={`${className}`}>
        <div className={`flex items-start gap-3 ${disabled ? 'opacity-50' : ''}`}>
          {/* Custom checkbox */}
          <div className="flex items-center h-5 mt-0.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              aria-required={required}
              aria-invalid={error}
              id={id}
              disabled={disabled}
              onClick={handleChange}
              className={`
                relative w-5 h-5 rounded border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                ${isChecked 
                  ? 'bg-blue-600 border-blue-600' 
                  : error 
                    ? 'bg-white border-red-400 hover:border-red-500' 
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Hidden input for form submission */}
              <input
                type="checkbox"
                name={name}
                checked={isChecked}
                onChange={() => {}} // Controlled by button
                className="sr-only"
                tabIndex={-1}
              />
              
              {/* Checkmark */}
              {isChecked && (
                <svg 
                  className="absolute inset-0 w-full h-full text-white p-0.5"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Label */}
          <div className="flex-1">
            <label 
              htmlFor={id}
              className={`
                text-sm leading-relaxed cursor-pointer select-none
                ${error ? 'text-red-700' : 'text-slate-600'}
                ${disabled ? 'cursor-not-allowed' : ''}
              `}
            >
              {label || defaultLabel}
              {required && (
                <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              )}
            </label>

            {/* Learn more link */}
            {showModal && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="block mt-1 text-xs text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:underline"
              >
                Learn more about how we process your data →
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && errorMessage && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMessage}
          </div>
        )}
      </div>

      {/* Consent Modal */}
      {showModal && (
        <ConsentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAccept={handleModalAccept}
        />
      )}
    </>
  );
}

// =====================================================
// Pre-built Consent Checkbox Components
// =====================================================

/**
 * Simple consent checkbox without modal
 */
export function SimpleConsentCheckbox({ 
  checked, 
  onChange, 
  className = '' 
}: { 
  checked?: boolean; 
  onChange?: (checked: boolean) => void; 
  className?: string;
}) {
  return (
    <ConsentCheckbox
      checked={checked}
      onChange={onChange}
      showModal={false}
      label="I agree to the processing of my personal data for recruitment purposes."
      className={className}
    />
  );
}

/**
 * Compact consent checkbox for small forms
 */
export function CompactConsentCheckbox({ 
  checked, 
  onChange, 
  error,
  className = '' 
}: { 
  checked?: boolean; 
  onChange?: (checked: boolean) => void; 
  error?: boolean;
  className?: string;
}) {
  return (
    <ConsentCheckbox
      checked={checked}
      onChange={onChange}
      error={error}
      errorMessage={error ? 'You must consent to continue' : undefined}
      label="I consent to data processing (GDPR)"
      className={className}
    />
  );
}
