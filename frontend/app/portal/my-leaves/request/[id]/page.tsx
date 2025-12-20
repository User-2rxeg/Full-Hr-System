'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { leavesService } from '@/app/services/leaves';
import { useAuth } from '@/app/context/AuthContext';
import type { LeaveType } from '@/app/types/leaves';

type LeaveTypeKey = 'annual' | 'sick' | 'personal';

interface BackendLeaveRequest {
  _id: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  dates: {
    from: string | Date;
    to: string | Date;
  };
  durationDays: number;
  justification?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  postLeave?: boolean;
  attachmentId?: string;
}

interface LeaveTypeMap {
  annual?: string;
  sick?: string;
  personal?: string;
}

export default function EditLeaveRequestPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveTypeMap, setLeaveTypeMap] = useState<LeaveTypeMap>({});

  const [formData, setFormData] = useState<{
    type: LeaveTypeKey;
    startDate: string;
    endDate: string;
    reason: string;
    postLeave: boolean;
  }>({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    postLeave: false,
  });

  useEffect(() => {
    if (!user || !params?.id) return;
    void fetchInitialData(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params?.id]);

  const fetchInitialData = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [reqRes, typesRes] = await Promise.all([
        leavesService.getRequest(id),
        leavesService.getLeaveTypes(),
      ]);

      if (!reqRes.data) {
        setError('Leave request not found.');
        return;
      }

      const req = reqRes.data as BackendLeaveRequest;

      // Map leave type names/codes for keys and for submit
      if (Array.isArray(typesRes.data)) {
        const types = typesRes.data as LeaveType[];
        const map: LeaveTypeMap = {};

        for (const t of types) {
          const name = (t.name || '').toLowerCase();
          const code = (t.code || '').toLowerCase();

          if (!map.annual && (name.includes('annual') || code.includes('annual'))) {
            map.annual = t.id;
          } else if (!map.sick && (name.includes('sick') || code.includes('sick'))) {
            map.sick = t.id;
          } else if (!map.personal && (name.includes('personal') || code.includes('personal'))) {
            map.personal = t.id;
          }
        }

        setLeaveTypeMap(map);
      }

      const fromDate = toDateOnly(req.dates?.from);
      const toDate = toDateOnly(req.dates?.to);
      const typeKey = toTypeKey(req.leaveTypeName);

      setFormData({
        type: typeKey,
        startDate: fromDate,
        endDate: toDate,
        reason: req.justification || '',
        postLeave: !!req.postLeave,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leave request';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toDateOnly = (value: string | Date | undefined): string => {
    if (!value) return '';
    if (typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d.toISOString().split('T')[0];
    }
    return value.toISOString().split('T')[0];
  };

  const toTypeKey = (name?: string): LeaveTypeKey => {
    const n = (name || '').toLowerCase();
    if (n.includes('sick')) return 'sick';
    if (n.includes('personal')) return 'personal';
    return 'annual';
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user || !params?.id) {
      setError('Missing user or request id.');
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      setError('Please select valid dates.');
      return;
    }

    const leaveTypeId = leaveTypeMap[formData.type];

    try {
      setSaving(true);

      await leavesService.updateRequest(params.id, {
        from: formData.startDate,
        to: formData.endDate,
        durationDays: days,
        justification: formData.reason,
        postLeave: formData.postLeave,
        ...(leaveTypeId ? { leaveTypeId } : {}),
      });

      router.push('/portal/my-leaves');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update leave request';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !params?.id) {
      setError('Missing user or request id.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this leave request?')) return;

    try {
      setSaving(true);
      await leavesService.cancelRequest(params.id, user.id);
      router.push('/portal/my-leaves');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel leave request';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-white rounded-xl shadow-sm" />
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
            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">Edit Leave Request</h1>
            <p className="text-gray-500 mt-1">Update your leave request details or cancel it.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <form
          onSubmit={handleUpdate}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
        >
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'annual', label: 'Annual Leave', color: 'blue' },
                { value: 'sick', label: 'Sick Leave', color: 'red' },
                { value: 'personal', label: 'Personal Leave', color: 'purple' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      type: type.value as LeaveTypeKey,
                    }))
                  }
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
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                min={formData.startDate || undefined}
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
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Post-leave flag */}
          <div className="flex items-center gap-2">
            <input
              id="post-leave-edit"
              type="checkbox"
              checked={formData.postLeave}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  postLeave: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="post-leave-edit" className="text-sm text-gray-700">
              This is a post-leave request (submitted after the leave was taken)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={saving}
              className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Request
            </button>
            <div className="flex items-center gap-3">
              <Link
                href="/portal/my-leaves"
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


