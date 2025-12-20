'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import timeManagementService, {
  Holiday,
  HolidayType,
  CreateHolidayDto,
  UpdateHolidayDto,
} from '@/app/services/time-management';

export default function HRAdminHolidaysPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateHolidayDto>({
    type: HolidayType.NATIONAL,
    startDate: '',
    endDate: '',
    name: '',
    active: true,
  });

  // Fetch all holidays
  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await timeManagementService.getAllHolidays();
      setHolidays(response.data || []);
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  // Save holiday (create or update)
  const handleSaveHoliday = async () => {
    if (!formData.startDate || !formData.type) {
      setError('Please fill in required fields (Type and Start Date)');
      return;
    }

    try {
      if (editingId) {
        await timeManagementService.updateHoliday(editingId, formData as UpdateHolidayDto);
        setSuccess('Holiday updated successfully');
      } else {
        await timeManagementService.createHoliday(formData);
        setSuccess('Holiday created successfully');
      }

      setFormData({
        type: HolidayType.NATIONAL,
        startDate: '',
        endDate: '',
        name: '',
        active: true,
      });
      setEditingId(null);
      setShowAddForm(false);
      await fetchHolidays();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save holiday');
    }
  };

  // Delete holiday
  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await timeManagementService.deleteHoliday(id);
      setSuccess('Holiday deleted successfully');
      await fetchHolidays();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete holiday');
    }
  };

  // Edit holiday
  const handleEditHoliday = (holiday: Holiday) => {
    setFormData({
      type: holiday.type,
      startDate: typeof holiday.startDate === 'string'
        ? holiday.startDate.split('T')[0]
        : new Date(holiday.startDate).toISOString().split('T')[0],
      endDate: holiday.endDate
        ? typeof holiday.endDate === 'string'
          ? holiday.endDate.split('T')[0]
          : new Date(holiday.endDate).toISOString().split('T')[0]
        : '',
      name: holiday.name || '',
      active: holiday.active,
    });
    setEditingId(holiday._id || null);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      type: HolidayType.NATIONAL,
      startDate: '',
      endDate: '',
      name: '',
      active: true,
    });
  };

  const getHolidayTypeBadgeColor = (type: HolidayType) => {
    switch (type) {
      case HolidayType.NATIONAL:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case HolidayType.ORGANIZATIONAL:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case HolidayType.WEEKLY_REST:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Holidays Management</h1>
            <p className="text-muted-foreground mt-1">Configure national, organizational, and weekly rest holidays</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium w-fit"
          >
            + Add Holiday
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add/Edit Holiday Form */}
            {showAddForm && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {editingId ? 'Edit Holiday' : 'Add New Holiday'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Holiday Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as HolidayType })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value={HolidayType.NATIONAL}>National Holiday</option>
                      <option value={HolidayType.ORGANIZATIONAL}>Organizational Holiday</option>
                      <option value={HolidayType.WEEKLY_REST}>Weekly Rest Day</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.type === HolidayType.NATIONAL && 'Fixed date national holiday'}
                      {formData.type === HolidayType.ORGANIZATIONAL && 'Company-specific holiday/closure'}
                      {formData.type === HolidayType.WEEKLY_REST && 'Recurring weekly rest day (e.g., Sunday)'}
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Holiday Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Christmas Day, Diwali"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={typeof formData.startDate === 'string' ? formData.startDate : ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={typeof formData.endDate === 'string' ? (formData.endDate || '') : ''}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank for single-day holidays</p>
                  </div>

                  {/* Active Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{formData.active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveHoliday}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    {editingId ? 'Update Holiday' : 'Create Holiday'}
                  </button>
                  <button
                    onClick={handleCancelForm}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Holidays List */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                All Holidays ({holidays.length})
              </h2>

              {holidays.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No holidays added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday._id}
                      className="p-4 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-between hover:border-border transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getHolidayTypeBadgeColor(holiday.type)}`}>
                            {holiday.type}
                          </span>
                          {!holiday.active && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground">{holiday.name || 'Unnamed Holiday'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(holiday.startDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {holiday.endDate && (
                            <>
                              {' - '}
                              {new Date(holiday.endDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditHoliday(holiday)}
                          className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => holiday._id && handleDeleteHoliday(holiday._id)}
                          className="px-3 py-1 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

