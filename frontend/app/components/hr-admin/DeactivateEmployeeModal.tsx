'use client';

import { useState, useEffect } from 'react';
import { Employee } from './EmployeeTableRow';

interface DeactivateEmployeeModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employeeId: string, reason: string) => Promise<void>;
}

const DEACTIVATION_REASONS = [
  { value: 'resignation', label: 'Resignation' },
  { value: 'termination', label: 'Termination' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'end_of_contract', label: 'End of Contract' },
  { value: 'mutual_agreement', label: 'Mutual Agreement' },
  { value: 'other', label: 'Other' },
];

export default function DeactivateEmployeeModal({ employee, isOpen, onClose, onConfirm }: DeactivateEmployeeModalProps) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
      setConfirmText('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    if (!reason) {
      setError('Please select a deactivation reason');
      return;
    }

    if (confirmText !== 'DEACTIVATE') {
      setError('Please type DEACTIVATE to confirm');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await onConfirm(employee._id, `${reason}${notes ? `: ${notes}` : ''}`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate employee');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !employee) return null;

  const displayName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Red Gradient for Danger */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Deactivate Employee</h2>
              <p className="text-white/70 text-sm">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Employee Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground">
                <span className="text-lg font-bold">{initials}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {employee.primaryPositionId?.title || 'No Position'} • {employee.primaryDepartmentId?.name || 'No Department'}
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Important: This action will:</h4>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Disable all system access (BR 3j)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Block payroll processing
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Sync to Time Management module
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Log in audit trail (BR 22)
                </li>
              </ul>
            </div>

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Deactivation Reason <span className="text-destructive">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              >
                <option value="">Select a reason</option>
                {DEACTIVATION_REASONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Additional Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                rows={3}
                placeholder="Enter any additional details..."
              />
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type <span className="font-mono text-destructive">DEACTIVATE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="DEACTIVATE"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing || confirmText !== 'DEACTIVATE' || !reason}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Deactivate Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

