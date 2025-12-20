'use client';

import { useState, FormEvent, useMemo, ReactNode } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';

// =====================================================
// Types
// =====================================================

export type InterviewMode = 'onsite' | 'video' | 'phone';

export interface PanelMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface InterviewScheduleData {
  applicationId: string;
  stage: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in minutes
  method: InterviewMode;
  panel: string[]; // employee IDs
  videoLink?: string;
  location?: string;
  notes?: string;
}

interface InterviewSchedulerProps {
  onSchedule: (data: InterviewScheduleData) => void | Promise<void>;
  defaultValues?: Partial<InterviewScheduleData>;
  availablePanelMembers?: PanelMember[];
  applicationId: string;
  stage?: string;
  isLoading?: boolean;
  onCancel?: () => void;
}

interface FormErrors {
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: string;
  method?: string;
  panel?: string;
  videoLink?: string;
  location?: string;
}

// =====================================================
// Helper Components
// =====================================================

function Select({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition-all appearance-none bg-white ${
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-slate-200 focus:ring-blue-500'
        }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function PanelSelector({
  availableMembers,
  selectedIds,
  onChange,
  error,
}: {
  availableMembers: PanelMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const toggleMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter((id) => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Interview Panel <span className="text-red-500">*</span>
      </label>
      <div
        className={`border rounded-lg p-3 max-h-48 overflow-y-auto ${
          error ? 'border-red-300' : 'border-slate-200'
        }`}
      >
        {availableMembers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No panel members available
          </p>
        ) : (
          <div className="space-y-2">
            {availableMembers.map((member) => (
              <label
                key={member.id}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.includes(member.id)
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{member.name}</p>
                  {member.role && (
                    <p className="text-xs text-slate-500">{member.role}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
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
        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
      />
    </div>
  );
}

// =====================================================
// Interview Mode Options
// =====================================================

const INTERVIEW_MODES: { value: InterviewMode; label: string; icon: ReactNode }[] = [
  {
    value: 'onsite',
    label: 'On-site',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    value: 'video',
    label: 'Video Call',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'phone',
    label: 'Phone',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
];

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
];

// =====================================================
// Main InterviewScheduler Component
// =====================================================

export default function InterviewScheduler({
  onSchedule,
  defaultValues,
  availablePanelMembers = [],
  applicationId,
  stage = 'department_interview',
  isLoading = false,
  onCancel,
}: InterviewSchedulerProps) {
  // Form state
  const [formData, setFormData] = useState<InterviewScheduleData>({
    applicationId,
    stage,
    scheduledDate: defaultValues?.scheduledDate || '',
    scheduledTime: defaultValues?.scheduledTime || '',
    duration: defaultValues?.duration || 60,
    method: defaultValues?.method || 'video',
    panel: defaultValues?.panel || [],
    videoLink: defaultValues?.videoLink || '',
    location: defaultValues?.location || '',
    notes: defaultValues?.notes || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get minimum date (today)
  const minDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Date is required';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Time is required';
    }

    if (!formData.method) {
      newErrors.method = 'Interview mode is required';
    }

    if (formData.panel.length === 0) {
      newErrors.panel = 'At least one panel member is required';
    }

    if (formData.method === 'video' && !formData.videoLink) {
      newErrors.videoLink = 'Video link is required for video interviews';
    }

    if (formData.method === 'onsite' && !formData.location) {
      newErrors.location = 'Location is required for on-site interviews';
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
      await onSchedule(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update field
  const updateField = <K extends keyof InterviewScheduleData>(
    field: K,
    value: InterviewScheduleData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interview Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Interview Mode <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {INTERVIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => updateField('method', mode.value)}
              className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl transition-all ${
                formData.method === mode.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {mode.icon}
              <span className="text-sm font-medium">{mode.label}</span>
            </button>
          ))}
        </div>
        {errors.method && <p className="mt-1.5 text-sm text-red-600">{errors.method}</p>}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => updateField('scheduledDate', e.target.value)}
            min={minDate}
            required
          />
          {errors.scheduledDate && <p className="text-sm text-red-600">{errors.scheduledDate}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Time <span className="text-red-500">*</span>
          </label>
          <Input
            type="time"
            value={formData.scheduledTime}
            onChange={(e) => updateField('scheduledTime', e.target.value)}
            required
          />
          {errors.scheduledTime && <p className="text-sm text-red-600">{errors.scheduledTime}</p>}
        </div>

        <Select
          label="Duration"
          value={formData.duration.toString()}
          onChange={(value) => updateField('duration', parseInt(value))}
          options={DURATION_OPTIONS}
          required
        />
      </div>

      {/* Video Link (for video interviews) */}
      {formData.method === 'video' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Video Meeting Link <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.videoLink || ''}
            onChange={(e) => updateField('videoLink', e.target.value)}
            placeholder="e.g., https://meet.google.com/xxx-xxxx-xxx"
            required
          />
          {errors.videoLink && <p className="text-sm text-red-600">{errors.videoLink}</p>}
        </div>
      )}

      {/* Location (for on-site interviews) */}
      {formData.method === 'onsite' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            Location <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.location || ''}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="e.g., Conference Room A, 3rd Floor"
            required
          />
          {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}
        </div>
      )}

      {/* Panel Selection */}
      <PanelSelector
        availableMembers={availablePanelMembers}
        selectedIds={formData.panel}
        onChange={(ids) => updateField('panel', ids)}
        error={errors.panel}
      />

      {/* Notes */}
      <TextArea
        label="Notes (Optional)"
        value={formData.notes || ''}
        onChange={(value) => updateField('notes', value)}
        placeholder="Any additional information for the interview..."
      />

      {/* Confirmation Preview */}
      {formData.scheduledDate && formData.scheduledTime && formData.panel.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Interview Summary</h4>
          <div className="space-y-1 text-sm text-blue-700">
            <p>
              <span className="font-medium">Date & Time:</span>{' '}
              {new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toLocaleString()} ({formData.duration} min)
            </p>
            <p>
              <span className="font-medium">Mode:</span>{' '}
              {INTERVIEW_MODES.find((m) => m.value === formData.method)?.label}
            </p>
            <p>
              <span className="font-medium">Panel:</span>{' '}
              {formData.panel
                .map((id) => availablePanelMembers.find((m) => m.id === id)?.name)
                .filter(Boolean)
                .join(', ') || `${formData.panel.length} member(s)`}
            </p>
          </div>
        </div>
      )}

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
          Schedule Interview
        </Button>
      </div>
    </form>
  );
}
