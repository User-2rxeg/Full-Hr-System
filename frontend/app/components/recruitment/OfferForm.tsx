'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

// =====================================================
// Types
// =====================================================

export interface OfferFormData {
  salary: number;
  signingBonus?: number;
  benefits: string[];
  startDate: string;
  conditions?: string;
  notes?: string;
}

interface OfferFormProps {
  onSubmit: (data: OfferFormData) => void | Promise<void>;
  initialData?: Partial<OfferFormData>;
  readOnly?: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
  candidateName?: string;
  positionTitle?: string;
}

interface FormErrors {
  salary?: string;
  startDate?: string;
  benefits?: string;
}

// =====================================================
// Helper Components
// =====================================================

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
          disabled ? 'bg-slate-50 cursor-not-allowed' : ''
        }`}
      />
    </div>
  );
}

function BenefitsTags({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  const commonBenefits = [
    'Health Insurance',
    'Dental Insurance',
    'Vision Insurance',
    '401(k)',
    'Paid Time Off',
    'Remote Work',
    'Gym Membership',
    'Stock Options',
    'Tuition Reimbursement',
    'Parental Leave',
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const toggleBenefit = (benefit: string) => {
    if (disabled) return;
    if (value.includes(benefit)) {
      onChange(value.filter((b) => b !== benefit));
    } else {
      onChange([...value, benefit]);
    }
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Benefits <span className="text-red-500">*</span>
      </label>

      {/* Quick Add Buttons */}
      {!disabled && (
        <div className="flex flex-wrap gap-2 mb-3">
          {commonBenefits.map((benefit) => (
            <button
              key={benefit}
              type="button"
              onClick={() => toggleBenefit(benefit)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                value.includes(benefit)
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {value.includes(benefit) ? '✓ ' : '+ '}
              {benefit}
            </button>
          ))}
        </div>
      )}

      {/* Selected Benefits */}
      <div
        className={`border rounded-lg p-3 min-h-[80px] ${
          error
            ? 'border-red-300'
            : disabled
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-200'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {value.map((benefit, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-sm rounded-full"
            >
              {benefit}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="w-4 h-4 rounded-full hover:bg-green-200 flex items-center justify-center"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          {!disabled && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? 'Type custom benefit...' : 'Add more...'}
              className="flex-1 min-w-[120px] outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent"
            />
          )}
        </div>
      </div>
      {!disabled && <p className="mt-1 text-xs text-slate-500">Click to select or type custom benefits</p>}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function CurrencyInput({
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input
          id={id}
          type="number"
          min={0}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-8 pr-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-slate-200 focus:ring-blue-500'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {value > 0 && !disabled && (
        <p className="mt-1 text-xs text-slate-500">{formatCurrency(value)} per year</p>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// =====================================================
// Read-Only Offer Display
// =====================================================

function OfferDisplay({
  data,
  candidateName,
  positionTitle,
}: {
  data: Partial<OfferFormData>;
  candidateName?: string;
  positionTitle?: string;
}) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Job Offer</h2>
        {candidateName && <p className="text-slate-600 mt-1">For: {candidateName}</p>}
        {positionTitle && <p className="text-sm text-slate-500">{positionTitle}</p>}
      </div>

      {/* Compensation */}
      <div className="bg-green-50 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-green-800 mb-4">Compensation</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-green-600 uppercase tracking-wider">Annual Salary</p>
            <p className="text-2xl font-bold text-green-900">
              {data.salary ? formatCurrency(data.salary) : '—'}
            </p>
          </div>
          {data.signingBonus && data.signingBonus > 0 && (
            <div>
              <p className="text-xs text-green-600 uppercase tracking-wider">Signing Bonus</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(data.signingBonus)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Benefits */}
      {data.benefits && data.benefits.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Benefits Package</h3>
          <div className="flex flex-wrap gap-2">
            {data.benefits.map((benefit, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
              >
                <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Start Date */}
      {data.startDate && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Start Date</h3>
          <p className="text-slate-900">{formatDate(data.startDate)}</p>
        </div>
      )}

      {/* Conditions */}
      {data.conditions && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Conditions</h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap">{data.conditions}</p>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Additional Notes</h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Main OfferForm Component
// =====================================================

export default function OfferForm({
  onSubmit,
  initialData,
  readOnly = false,
  isLoading = false,
  onCancel,
  candidateName,
  positionTitle,
}: OfferFormProps) {
  // Form state
  const [formData, setFormData] = useState<OfferFormData>({
    salary: initialData?.salary || 0,
    signingBonus: initialData?.signingBonus || 0,
    benefits: initialData?.benefits || [],
    startDate: initialData?.startDate || '',
    conditions: initialData?.conditions || '',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read-only mode
  if (readOnly) {
    return (
      <OfferDisplay
        data={formData}
        candidateName={candidateName}
        positionTitle={positionTitle}
      />
    );
  }

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.salary || formData.salary <= 0) {
      newErrors.salary = 'Salary is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.benefits.length === 0) {
      newErrors.benefits = 'At least one benefit is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update field
  const updateField = <K extends keyof OfferFormData>(field: K, value: OfferFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Offer Header */}
      {(candidateName || positionTitle) && (
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-500">Creating offer for</p>
          {candidateName && <p className="text-lg font-semibold text-slate-900">{candidateName}</p>}
          {positionTitle && <p className="text-sm text-slate-600">{positionTitle}</p>}
        </div>
      )}

      {/* Compensation Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">
          Compensation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CurrencyInput
            label="Annual Salary"
            value={formData.salary}
            onChange={(value) => updateField('salary', value)}
            error={errors.salary}
            placeholder="e.g., 75000"
            required
          />

          <CurrencyInput
            label="Signing Bonus (Optional)"
            value={formData.signingBonus || 0}
            onChange={(value) => updateField('signingBonus', value)}
            placeholder="e.g., 5000"
          />
        </div>
      </div>

      {/* Benefits */}
      <BenefitsTags
        value={formData.benefits}
        onChange={(value) => updateField('benefits', value)}
        error={errors.benefits}
      />

      {/* Start Date */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Start Date <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => updateField('startDate', e.target.value)}
          min={minDate}
          required
        />
        {errors.startDate && <p className="text-sm text-red-600">{errors.startDate}</p>}
      </div>

      {/* Conditions */}
      <TextArea
        label="Conditions (Optional)"
        value={formData.conditions || ''}
        onChange={(value) => updateField('conditions', value)}
        placeholder="e.g., Subject to successful background check and verification of employment eligibility..."
        rows={3}
      />

      {/* Notes */}
      <TextArea
        label="Additional Notes (Optional)"
        value={formData.notes || ''}
        onChange={(value) => updateField('notes', value)}
        placeholder="Any additional information for the candidate..."
        rows={3}
      />

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || isLoading}
        >
          Create Offer
        </Button>
      </div>
    </form>
  );
}
