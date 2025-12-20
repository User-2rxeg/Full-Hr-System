'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

// =====================================================
// Types
// =====================================================

export interface JobFormData {
  title: string;
  department: string;
  location: string;
  description: string;
  qualifications: string[];
  openings: number;
  requirements?: string[];
  responsibilities?: string[];
}

interface JobFormProps {
  initialData?: Partial<JobFormData>;
  onSubmit: (data: JobFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  mode?: 'create' | 'edit';
}

interface FormErrors {
  title?: string;
  department?: string;
  location?: string;
  description?: string;
  qualifications?: string;
  openings?: string;
}

// =====================================================
// Helper Components
// =====================================================

function TextArea({
  label,
  value,
  onChange,
  error,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 border rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none ${
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-slate-200 focus:ring-blue-500'
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TagInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

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

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div
        className={`w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:border-transparent transition-all ${
          error
            ? 'border-red-300 focus-within:ring-red-500'
            : 'border-slate-200 focus-within:ring-blue-500'
        }`}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="w-4 h-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          className="w-full outline-none text-slate-800 placeholder-slate-400 text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">Press Enter to add</p>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// =====================================================
// Main JobForm Component
// =====================================================

export default function JobForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Job',
  mode = 'create',
}: JobFormProps) {
  // Form state
  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || '',
    department: initialData?.department || '',
    location: initialData?.location || '',
    description: initialData?.description || '',
    qualifications: initialData?.qualifications || [],
    openings: initialData?.openings || 1,
    requirements: initialData?.requirements || [],
    responsibilities: initialData?.responsibilities || [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation (BR-2: Required fields)
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }

    if (formData.qualifications.length === 0) {
      newErrors.qualifications = 'At least one qualification is required';
    }

    if (formData.openings < 1) {
      newErrors.openings = 'At least one opening is required';
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
  const updateField = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Title */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Job Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g., Senior Software Engineer"
          required
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Department & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Department <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.department}
            onChange={(e) => updateField('department', e.target.value)}
            placeholder="e.g., Engineering"
            required
          />
          {errors.department && <p className="text-sm text-red-600">{errors.department}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Location <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="e.g., New York, NY / Remote"
            required
          />
          {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
        </div>
      </div>

      {/* Number of Openings */}
      <div className="w-full md:w-1/3">
        <label htmlFor="openings" className="block text-sm font-medium text-slate-700 mb-1.5">
          Number of Openings <span className="text-red-500">*</span>
        </label>
        <input
          id="openings"
          type="number"
          min={1}
          value={formData.openings}
          onChange={(e) => updateField('openings', parseInt(e.target.value) || 1)}
          className={`w-full px-4 py-3 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
            errors.openings
              ? 'border-red-300 focus:ring-red-500'
              : 'border-slate-200 focus:ring-blue-500'
          }`}
        />
        {errors.openings && <p className="mt-1.5 text-sm text-red-600">{errors.openings}</p>}
      </div>

      {/* Job Description */}
      <TextArea
        label="Job Description"
        value={formData.description}
        onChange={(value) => updateField('description', value)}
        error={errors.description}
        placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
        rows={6}
        required
      />

      {/* Qualifications */}
      <TagInput
        label="Qualifications"
        value={formData.qualifications}
        onChange={(value) => updateField('qualifications', value)}
        error={errors.qualifications}
        placeholder="e.g., Bachelor's degree in Computer Science"
        required
      />

      {/* Requirements (Optional) */}
      <TagInput
        label="Requirements"
        value={formData.requirements || []}
        onChange={(value) => updateField('requirements', value)}
        placeholder="e.g., 5+ years of experience"
      />

      {/* Responsibilities (Optional) */}
      <TagInput
        label="Responsibilities"
        value={formData.responsibilities || []}
        onChange={(value) => updateField('responsibilities', value)}
        placeholder="e.g., Lead a team of engineers"
      />

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="default"
          disabled={isSubmitting || isLoading}
        >
          {mode === 'edit' ? 'Update Job' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
