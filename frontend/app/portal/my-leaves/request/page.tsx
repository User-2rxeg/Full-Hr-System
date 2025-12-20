'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';
import type { LeaveBalanceSummary } from '@/app/types/leaves';

type BalanceList = LeaveBalanceSummary[];
type LeaveTypeKey = 'annual' | 'sick' | 'personal';

interface TypeBalance {
  entitled: number;
  taken: number;
  pending: number;
  remaining: number;
}

interface LeaveTypeMap {
  annual?: string;
  sick?: string;
  personal?: string; // Can also be paternity or other third leave type
}


export default function LeaveRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [balance, setBalance] = useState<BalanceList>([]);
  const [leaveTypeMap, setLeaveTypeMap] = useState<LeaveTypeMap>({});
  const [thirdLeaveTypeName, setThirdLeaveTypeName] = useState<string>('Personal Leave'); // Can be Personal, Paternity, etc.
  const [attachmentRequired, setAttachmentRequired] = useState<{ required: boolean; reason: string | null }>({ required: false, reason: null });

  // Post-leave configuration from backend
  const postLeaveConfig = leavesService.getPostLeaveConfig();

  const [formData, setFormData] = useState<{
    type: LeaveTypeKey;
    startDate: string;
    endDate: string;
    reason: string;
    attachment: File | null;
    postLeave: boolean;
  }>({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: null,
    postLeave: false,
  });

  useEffect(() => {
    if (!user) return;
    void fetchInitialData(user.id);
  }, [user]);

  // Check attachment requirements when leave type or dates change
  useEffect(() => {
    const checkAttachment = async () => {
      const leaveTypeId = leaveTypeMap[formData.type];
      if (!leaveTypeId || !formData.startDate || !formData.endDate) {
        setAttachmentRequired({ required: false, reason: null });
        return;
      }

      const days = calculateDays();
      if (days <= 0) return;

      const result = await leavesService.checkAttachmentRequirement(leaveTypeId, days);
      setAttachmentRequired({ required: result.required, reason: result.reason || null });
    };

    void checkAttachment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type, formData.startDate, formData.endDate, leaveTypeMap]);

  // Validate post-leave dates when toggled
  useEffect(() => {
    if (formData.postLeave && formData.endDate) {
      const validation = leavesService.validatePostLeaveRequest(formData.endDate);
      if (!validation.valid) {
        setError(validation.error);
      } else {
        setError(null);
      }
    }
  }, [formData.postLeave, formData.endDate]);

  const fetchInitialData = async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);

      const [balanceRes, typesRes] = await Promise.all([
        leavesService.getBalance(employeeId),
        leavesService.getLeaveTypes(),
      ]);

      if (Array.isArray(balanceRes.data)) {
        // Map backend response to expected format
        interface BackendBalance {
          leaveTypeId: string;
          yearlyEntitlement?: number;
          entitled?: number;
          accrued?: number;
          taken?: number;
          pending?: number;
          remaining?: number;
          carryForward?: number;
          leaveTypeName?: string;
          leaveTypeCode?: string;
        }
        const mappedBalance = (balanceRes.data as BackendBalance[]).map((bal) => ({
          leaveTypeId: bal.leaveTypeId,
          leaveTypeName: bal.leaveTypeName || '',
          leaveTypeCode: bal.leaveTypeCode || '',
          entitled: bal.yearlyEntitlement ?? bal.entitled ?? 0,
          accrued: bal.accrued ?? 0,
          taken: bal.taken ?? 0,
          pending: bal.pending ?? 0,
          remaining: bal.remaining ?? 0,
          carryForward: bal.carryForward ?? 0,
        }));
        setBalance(mappedBalance as BalanceList);
      }

      if (Array.isArray(typesRes.data)) {
        // Backend returns _id, but type interface uses id
        interface BackendLeaveType {
          _id?: string;
          id?: string;
          name?: string;
          code?: string;
        }
        const types = typesRes.data as BackendLeaveType[];
        const map: LeaveTypeMap = {};
        let thirdTypeName = 'Personal Leave';

        for (const t of types) {
          const name = (t.name || '').toLowerCase();
          const code = (t.code || '').toLowerCase();
          const typeId = t._id || t.id;

          if (!typeId) continue;

          if (!map.annual && (name.includes('annual') || code.includes('annual'))) {
            map.annual = typeId;
          } else if (!map.sick && (name.includes('sick') || code.includes('sick'))) {
            map.sick = typeId;
          } else if (!map.personal) {
            // Check for personal, paternity, maternity, compassionate, or other third leave type
            if (name.includes('personal') || code.includes('personal')) {
              map.personal = typeId;
              thirdTypeName = t.name || 'Personal Leave';
            } else if (name.includes('paternity') || code.includes('paternity')) {
              map.personal = typeId;
              thirdTypeName = t.name || 'Paternity Leave';
            } else if (name.includes('maternity') || code.includes('maternity')) {
              map.personal = typeId;
              thirdTypeName = t.name || 'Maternity Leave';
            } else if (name.includes('compassionate') || code.includes('compassionate')) {
              map.personal = typeId;
              thirdTypeName = t.name || 'Compassionate Leave';
            } else if (name.includes('unpaid') || code.includes('unpaid')) {
              map.personal = typeId;
              thirdTypeName = t.name || 'Unpaid Leave';
            }
          }
        }

        // If still no third type found, use the first non-annual/non-sick type
        if (!map.personal) {
          for (const t of types) {
            const name = (t.name || '').toLowerCase();
            const code = (t.code || '').toLowerCase();
            const typeId = t._id || t.id;

            if (!typeId) continue;

            // Skip annual and sick
            if (name.includes('annual') || code.includes('annual')) continue;
            if (name.includes('sick') || code.includes('sick')) continue;

            // Use this as the third leave type
            map.personal = typeId;
            thirdTypeName = t.name || 'Other Leave';
            break;
          }
        }

        setLeaveTypeMap(map);
        setThirdLeaveTypeName(thirdTypeName);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getTypeBalance = (key: LeaveTypeKey): TypeBalance => {
    const match = balance.find((item) => {
      const name = (item.leaveTypeName || '').toLowerCase();
      const code = (item.leaveTypeCode || '').toLowerCase();

      if (key === 'annual') {
        return name.includes('annual') || code.includes('annual');
      }
      if (key === 'sick') {
        return name.includes('sick') || code.includes('sick');
      }
      if (key === 'personal') {
        // Check for personal, paternity, maternity, compassionate, or other third types
        return name.includes('personal') || code.includes('personal') ||
               name.includes('paternity') || code.includes('paternity') ||
               name.includes('maternity') || code.includes('maternity') ||
               name.includes('compassionate') || code.includes('compassionate') ||
               name.includes('unpaid') || code.includes('unpaid');
      }
      return false;
    });

    return {
      entitled: match?.entitled ?? 0,
      taken: match?.taken ?? 0,
      pending: match?.pending ?? 0,
      remaining: match?.remaining ?? 0,
    };
  };

  const getAvailableBalance = (type: LeaveTypeKey) => {
    const summary = getTypeBalance(type);
    return summary.remaining;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    if (!user) {
      setError('You must be logged in to submit a leave request.');
      return;
    }

    const days = calculateDays();
    const available = getAvailableBalance(formData.type);

    if (days <= 0) {
      setError('Please select valid dates');
      return;
    }

    const leaveTypeId = leaveTypeMap[formData.type];
    if (!leaveTypeId) {
      setError('Configured leave type not found. Please contact HR.');
      return;
    }

    try {
      setValidating(true);

      // Run full validation matching backend createLeaveRequest logic
      const validation = await leavesService.validateLeaveRequest({
        employeeId: user.id,
        leaveTypeId,
        from: formData.startDate,
        to: formData.endDate,
        durationDays: days,
        postLeave: formData.postLeave,
        hasAttachment: !!formData.attachment,
        availableBalance: available,
      });

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setValidating(false);
        return;
      }

      setValidating(false);
      setLoading(true);

      // Handle attachment upload if present
      let attachmentId: string | undefined;
      if (formData.attachment) {
        const file = formData.attachment;
        const attachmentRes = await leavesService.saveAttachment({
          originalName: file.name,
          filePath: `/uploads/leaves/${file.name}`,
          fileType: file.type,
          size: file.size,
        });

        const created = attachmentRes.data as { _id?: string } | undefined;
        if (created?._id) {
          attachmentId = created._id;
        }
      }

      // Submit the leave request
      const response = await leavesService.submitRequest({
        employeeId: user.id,
        leaveTypeId,
        from: formData.startDate,
        to: formData.endDate,
        durationDays: days,
        justification: formData.reason,
        attachmentId,
        postLeave: formData.postLeave,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/my-leaves');
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit leave request';
      setError(message);
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-800">Leave Request Submitted</h2>
            <p className="text-green-600 mt-2">Your leave request has been submitted for approval.</p>
            <p className="text-sm text-green-500 mt-4">Redirecting to My Leaves...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/portal/my-leaves"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My Leaves
            </Link>
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Request Leave</h1>
            <p className="text-gray-500 mt-1">Submit a new leave request for approval</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium mb-2">Please fix the following issues:</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Available Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Available Balance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg ${formData.type === 'annual' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600">Annual</p>
              <p className="text-xl font-bold text-gray-900">{getAvailableBalance('annual')} days</p>
            </div>
            <div className={`p-3 rounded-lg ${formData.type === 'sick' ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600">Sick</p>
              <p className="text-xl font-bold text-gray-900">{getAvailableBalance('sick')} days</p>
            </div>
            <div className={`p-3 rounded-lg ${formData.type === 'personal' ? 'bg-purple-50 border-2 border-purple-200' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600">{thirdLeaveTypeName.replace(' Leave', '')}</p>
              <p className="text-xl font-bold text-gray-900">{getAvailableBalance('personal')} days</p>
            </div>
          </div>
          {getAvailableBalance(formData.type) === 0 && !formData.postLeave && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>No balance available.</strong> You can still submit a post-leave request for emergencies by enabling &quot;Post-Leave Request&quot; below.
              </p>
            </div>
          )}
        </div>

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'annual' as LeaveTypeKey, label: 'Annual Leave', color: 'blue' as const },
                  { value: 'sick' as LeaveTypeKey, label: 'Sick Leave', color: 'red' as const },
                  { value: 'personal' as LeaveTypeKey, label: thirdLeaveTypeName, color: 'purple' as const },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration Summary */}
          {formData.startDate && formData.endDate && (
            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="text-gray-600">Total Duration</span>
              <span className="text-lg font-semibold text-gray-900">
                {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a reason for your leave request..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachment {attachmentRequired.required ? <span className="text-red-500">*</span> : '(optional)'}
            </label>
            <input
              type="file"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  attachment: e.target.files?.[0] ?? null,
                })
              }
              className="w-full text-sm text-gray-700 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {attachmentRequired.required ? (
              <p className="mt-1 text-xs text-amber-600 font-medium">
                ⚠️ {attachmentRequired.reason}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Upload supporting documents (e.g. medical certificate for sick leave).
              </p>
            )}
            {formData.attachment && (
              <p className="mt-1 text-xs text-green-600">
                ✓ Selected: {formData.attachment.name}
              </p>
            )}
          </div>

          {/* Post-leave flag */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="post-leave"
                type="checkbox"
                checked={formData.postLeave}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    postLeave: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="post-leave" className="text-sm font-medium text-gray-700">
                This is a post-leave request (submitted after the leave was taken)
              </label>
            </div>
            {formData.postLeave && (
              <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                <p className="font-medium">⚠️ Post-Leave Request Notice</p>
                <p className="mt-1">
                  Post-leave requests must be submitted within <strong>{postLeaveConfig.maxPostLeaveDays} days</strong> after the leave end date.
                  This is for emergencies where leave could not be requested in advance.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/portal/my-leaves"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || validating}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? 'Validating...' : loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        {/* Policy Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Important Notes</p>
              <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                <li>Leave requests require manager approval</li>
                <li>Sick leave exceeding 1 day may require medical documentation</li>
                <li>Submit requests at least 3 days in advance when possible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

