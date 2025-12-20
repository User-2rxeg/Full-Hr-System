'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  timeManagementService,
  OvertimeRule,
  ShortTimeRule,
  LatenessRule,
  CreateOvertimeRuleDto,
  CreateShortTimeRuleDto,
  CreateLatenessRuleDto,
} from '@/app/services/time-management';

// Predefined overtime rule templates
const OVERTIME_TEMPLATES = [
  {
    name: 'Standard Overtime Policy',
    description: 'Overtime paid at 1.5x for hours beyond 8 per day. Weekend and holiday overtime paid at 2x rate.',
  },
  {
    name: 'Weekend/Holiday Overtime',
    description: 'Weekend overtime paid at 2x. Holiday overtime paid at 2.5x. Requires manager pre-approval.',
  },
  {
    name: 'Flexible Overtime',
    description: 'Overtime calculated weekly (beyond 40 hours). No premium for weekend work unless exceeding weekly limit.',
  },
];

// Predefined short-time rule templates
const SHORTTIME_TEMPLATES = [
  {
    name: 'Standard Short Time Policy',
    description: 'Short time flagged when worked 30+ minutes less than scheduled. Holidays ignored.',
    requiresPreApproval: false,
    ignoreWeekends: false,
    ignoreHolidays: true,
    minShortMinutes: 30,
  },
  {
    name: 'Strict Short Time Policy',
    description: 'Short time flagged for any 15+ minute difference. Weekends and holidays included.',
    requiresPreApproval: true,
    ignoreWeekends: false,
    ignoreHolidays: false,
    minShortMinutes: 15,
  },
  {
    name: 'Lenient Short Time Policy',
    description: 'Short time only flagged for 60+ minute difference. Weekends and holidays ignored.',
    requiresPreApproval: false,
    ignoreWeekends: true,
    ignoreHolidays: true,
    minShortMinutes: 60,
  },
];

// Predefined lateness rule templates
const LATENESS_TEMPLATES = [
  {
    name: 'Standard Lateness Policy',
    description: 'Grace period of 10 minutes. Deduction of 0.5 salary per minute after grace period.',
    gracePeriodMinutes: 10,
    deductionForEachMinute: 0.5,
  },
  {
    name: 'Strict Lateness Policy',
    description: 'No grace period. Deduction of 1.0 salary per minute for any lateness.',
    gracePeriodMinutes: 0,
    deductionForEachMinute: 1.0,
  },
  {
    name: 'Lenient Lateness Policy',
    description: 'Grace period of 15 minutes. Deduction of 0.25 salary per minute after grace period.',
    gracePeriodMinutes: 15,
    deductionForEachMinute: 0.25,
  },
];

export default function ConfigureRulesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([]);
  const [shortTimeRules, setShortTimeRules] = useState<ShortTimeRule[]>([]);
  const [latenessRules, setLatenessRules] = useState<LatenessRule[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overtime' | 'shorttime' | 'lateness'>('overtime');

  // Form state - Overtime
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState<CreateOvertimeRuleDto>({
    name: '',
    description: '',
    active: true,
    approved: false,
  });
  const [editingOvertime, setEditingOvertime] = useState<OvertimeRule | null>(null);

  // Form state - Short-time
  const [showShortTimeForm, setShowShortTimeForm] = useState(false);
  const [shortTimeForm, setShortTimeForm] = useState<CreateShortTimeRuleDto>({
    name: '',
    description: '',
    requiresPreApproval: false,
    ignoreWeekends: false,
    ignoreHolidays: true,
    minShortMinutes: 30,
    active: true,
    approved: false,
  });
  const [editingShortTime, setEditingShortTime] = useState<ShortTimeRule | null>(null);

  // Form state - Lateness
  const [showLatenessForm, setShowLatenessForm] = useState(false);
  const [latenessForm, setLatenessForm] = useState<CreateLatenessRuleDto>({
    name: '',
    description: '',
    gracePeriodMinutes: 10,
    deductionForEachMinute: 0.5,
    active: true,
  });
  const [editingLateness, setEditingLateness] = useState<LatenessRule | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overtimeRes, shortTimeRes, latenessRes] = await Promise.all([
        timeManagementService.getOvertimeRules(),
        timeManagementService.getShortTimeRules(),
        timeManagementService.getLatenessRules(),
      ]);

      // Handle overtime rules response
      if (overtimeRes.error) {
        console.error('Error fetching overtime rules:', overtimeRes.error);
      } else {
        const overtimeData = overtimeRes.data;
        if (Array.isArray(overtimeData)) {
          setOvertimeRules(overtimeData);
        } else {
          setOvertimeRules([]);
        }
      }

      // Handle short-time rules response
      if (shortTimeRes.error) {
        console.error('Error fetching short-time rules:', shortTimeRes.error);
      } else {
        const shortTimeData = shortTimeRes.data;
        if (Array.isArray(shortTimeData)) {
          setShortTimeRules(shortTimeData);
        } else {
          setShortTimeRules([]);
        }
      }

      // Handle lateness rules response
      if (latenessRes.error) {
        console.error('Error fetching lateness rules:', latenessRes.error);
      } else {
        const latenessData = latenessRes.data;
        if (Array.isArray(latenessData)) {
          setLatenessRules(latenessData);
        } else {
          setLatenessRules([]);
        }
      }
    } catch (err: unknown) {
      console.error('Error in fetchData:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load rules';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // OVERTIME HANDLERS
  // ============================================================

  const handleCreateOvertime = async () => {
    if (!overtimeForm.name.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.createOvertimeRule(overtimeForm);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Overtime rule "${overtimeForm.name}" created successfully`);
      resetOvertimeForm();
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create overtime rule';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOvertime = async () => {
    if (!editingOvertime) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.updateOvertimeRule(editingOvertime._id, {
        name: editingOvertime.name,
        description: editingOvertime.description,
        active: editingOvertime.active,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Overtime rule updated successfully');
      setEditingOvertime(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update overtime rule';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOvertime = async (id: string, name: string) => {
    try {
      setError(null);

      const response = await timeManagementService.approveOvertimeRule(id);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Overtime rule "${name}" approved`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve overtime rule';
      setError(errorMsg);
    }
  };

  const resetOvertimeForm = () => {
    setOvertimeForm({
      name: '',
      description: '',
      active: true,
      approved: false,
    });
    setShowOvertimeForm(false);
  };

  const selectOvertimeTemplate = (template: typeof OVERTIME_TEMPLATES[0]) => {
    setOvertimeForm({
      ...overtimeForm,
      name: template.name,
      description: template.description,
    });
  };

  // ============================================================
  // SHORT-TIME HANDLERS
  // ============================================================

  const handleCreateShortTime = async () => {
    if (!shortTimeForm.name.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.createShortTimeRule(shortTimeForm);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Short-time rule "${shortTimeForm.name}" created successfully`);
      resetShortTimeForm();
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create short-time rule';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateShortTime = async () => {
    if (!editingShortTime) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.updateShortTimeRule(editingShortTime._id, {
        name: editingShortTime.name,
        description: editingShortTime.description,
        requiresPreApproval: editingShortTime.requiresPreApproval,
        ignoreWeekends: editingShortTime.ignoreWeekends,
        ignoreHolidays: editingShortTime.ignoreHolidays,
        minShortMinutes: editingShortTime.minShortMinutes,
        active: editingShortTime.active,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Short-time rule updated successfully');
      setEditingShortTime(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update short-time rule';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveShortTime = async (id: string, name: string) => {
    try {
      setError(null);

      const response = await timeManagementService.approveShortTimeRule(id);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Short-time rule "${name}" approved`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve short-time rule';
      setError(errorMsg);
    }
  };

  const resetShortTimeForm = () => {
    setShortTimeForm({
      name: '',
      description: '',
      requiresPreApproval: false,
      ignoreWeekends: false,
      ignoreHolidays: true,
      minShortMinutes: 30,
      active: true,
      approved: false,
    });
    setShowShortTimeForm(false);
  };

  const selectShortTimeTemplate = (template: typeof SHORTTIME_TEMPLATES[0]) => {
    setShortTimeForm({
      ...shortTimeForm,
      name: template.name,
      description: template.description,
      requiresPreApproval: template.requiresPreApproval,
      ignoreWeekends: template.ignoreWeekends,
      ignoreHolidays: template.ignoreHolidays,
      minShortMinutes: template.minShortMinutes,
    });
  };

  // ============================================================
  // LATENESS HANDLERS
  // ============================================================

  const handleCreateLateness = async () => {
    if (!latenessForm.name.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.createLatenessRule(latenessForm);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Lateness rule "${latenessForm.name}" created successfully`);
      resetLatenessForm();
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create lateness rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLateness = async () => {
    if (!editingLateness) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await timeManagementService.updateLatenessRule(editingLateness._id, {
        name: editingLateness.name,
        description: editingLateness.description,
        gracePeriodMinutes: editingLateness.gracePeriodMinutes,
        deductionForEachMinute: editingLateness.deductionForEachMinute,
        active: editingLateness.active,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Lateness rule updated successfully');
      setEditingLateness(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update lateness rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLateness = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      setError(null);

      const response = await timeManagementService.deleteLatenessRule(id);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Lateness rule "${name}" deleted`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete lateness rule');
    }
  };

  const resetLatenessForm = () => {
    setLatenessForm({
      name: '',
      description: '',
      gracePeriodMinutes: 10,
      deductionForEachMinute: 0.5,
      active: true,
    });
    setShowLatenessForm(false);
  };

  const selectLatenessTemplate = (template: typeof LATENESS_TEMPLATES[0]) => {
    setLatenessForm({
      name: template.name,
      description: template.description,
      gracePeriodMinutes: template.gracePeriodMinutes,
      deductionForEachMinute: template.deductionForEachMinute,
      active: true,
    });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Configure Rules</h1>
            <p className="text-muted-foreground mt-1">
              Configure overtime and short-time rules for attendance and payroll compliance
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('overtime')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'overtime'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overtime Rules
          </button>
          <button
            onClick={() => setActiveTab('shorttime')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'shorttime'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Short-time Rules
          </button>
          <button
            onClick={() => setActiveTab('lateness')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'lateness'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Lateness Rules
          </button>
        </div>

        {/* Overtime Rules Tab */}
        {activeTab === 'overtime' && (
          <div className="space-y-6">
            {/* Templates */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Quick Start Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OVERTIME_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      selectOvertimeTemplate(template);
                      setShowOvertimeForm(true);
                    }}
                    className="p-4 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 text-left transition-all"
                  >
                    <h3 className="font-medium text-foreground text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Create Form */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">
                  {showOvertimeForm ? 'Create Overtime Rule' : 'Existing Overtime Rules'}
                </h2>
                {!showOvertimeForm && (
                  <button
                    onClick={() => setShowOvertimeForm(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create Rule
                  </button>
                )}
              </div>

              {showOvertimeForm && (
                <div className="border border-border rounded-lg p-4 mb-4 bg-muted/30 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Rule Name *</label>
                    <input
                      type="text"
                      value={overtimeForm.name}
                      onChange={(e) => setOvertimeForm({ ...overtimeForm, name: e.target.value })}
                      placeholder="e.g., Standard Overtime Policy"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea
                      value={overtimeForm.description || ''}
                      onChange={(e) => setOvertimeForm({ ...overtimeForm, description: e.target.value })}
                      placeholder="Describe how overtime is calculated, including weekend/holiday rates and approval requirements"
                      rows={3}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={overtimeForm.active}
                        onChange={(e) => setOvertimeForm({ ...overtimeForm, active: e.target.checked })}
                        className="rounded border-input"
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateOvertime}
                      disabled={submitting}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Creating...' : 'Create Rule'}
                    </button>
                    <button
                      onClick={resetOvertimeForm}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-3">
                {overtimeRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No overtime rules configured. Create one using the templates above or add a custom rule.
                  </div>
                ) : (
                  overtimeRules.map((rule) => (
                    <div
                      key={rule._id}
                      className={`p-4 rounded-lg border ${
                        rule.active
                          ? 'bg-background border-border'
                          : 'bg-muted/50 border-border opacity-60'
                      }`}
                    >
                      {editingOvertime?._id === rule._id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingOvertime.name}
                            onChange={(e) => setEditingOvertime({ ...editingOvertime, name: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <textarea
                            value={editingOvertime.description || ''}
                            onChange={(e) => setEditingOvertime({ ...editingOvertime, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingOvertime.active}
                                onChange={(e) => setEditingOvertime({ ...editingOvertime, active: e.target.checked })}
                                className="rounded border-input"
                              />
                              Active
                            </label>
                            <div className="flex gap-2 ml-auto">
                              <button
                                onClick={handleUpdateOvertime}
                                disabled={submitting}
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingOvertime(null)}
                                className="px-3 py-1.5 text-sm border border-input text-foreground rounded-lg hover:bg-accent transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                                rule.active ? 'bg-green-500' : 'bg-muted-foreground'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-foreground">{rule.name}</h3>
                                {rule.approved ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                    Pending Approval
                                  </span>
                                )}
                                {!rule.active && (
                                  <span className="text-xs text-muted-foreground">(Inactive)</span>
                                )}
                              </div>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingOvertime(rule)}
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {!rule.approved && (
                              <button
                                onClick={() => handleApproveOvertime(rule._id, rule.name)}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Short-time Rules Tab */}
        {activeTab === 'shorttime' && (
          <div className="space-y-6">
            {/* Templates */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Quick Start Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SHORTTIME_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      selectShortTimeTemplate(template);
                      setShowShortTimeForm(true);
                    }}
                    className="p-4 rounded-lg border border-border bg-background hover:border-primary hover:bg-primary/5 text-left transition-all"
                  >
                    <h3 className="font-medium text-foreground text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded">{template.minShortMinutes}m threshold</span>
                      {template.requiresPreApproval && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">Pre-approval</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Create Form */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">
                  {showShortTimeForm ? 'Create Short-time Rule' : 'Existing Short-time Rules'}
                </h2>
                {!showShortTimeForm && (
                  <button
                    onClick={() => setShowShortTimeForm(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create Rule
                  </button>
                )}
              </div>

              {showShortTimeForm && (
                <div className="border border-border rounded-lg p-4 mb-4 bg-muted/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Rule Name *</label>
                      <input
                        type="text"
                        value={shortTimeForm.name}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, name: e.target.value })}
                        placeholder="e.g., Standard Short Time Policy"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Minimum Short Minutes</label>
                      <input
                        type="number"
                        min="1"
                        value={shortTimeForm.minShortMinutes}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, minShortMinutes: parseInt(e.target.value) || 30 })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Threshold in minutes to flag short-time</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea
                      value={shortTimeForm.description || ''}
                      onChange={(e) => setShortTimeForm({ ...shortTimeForm, description: e.target.value })}
                      placeholder="Describe the short-time policy and how it affects payroll"
                      rows={2}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={shortTimeForm.requiresPreApproval}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, requiresPreApproval: e.target.checked })}
                        className="rounded border-input"
                      />
                      Requires Pre-approval
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={shortTimeForm.ignoreWeekends}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, ignoreWeekends: e.target.checked })}
                        className="rounded border-input"
                      />
                      Ignore Weekends
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={shortTimeForm.ignoreHolidays}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, ignoreHolidays: e.target.checked })}
                        className="rounded border-input"
                      />
                      Ignore Holidays
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={shortTimeForm.active}
                        onChange={(e) => setShortTimeForm({ ...shortTimeForm, active: e.target.checked })}
                        className="rounded border-input"
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateShortTime}
                      disabled={submitting}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Creating...' : 'Create Rule'}
                    </button>
                    <button
                      onClick={resetShortTimeForm}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-3">
                {shortTimeRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No short-time rules configured. Create one using the templates above or add a custom rule.
                  </div>
                ) : (
                  shortTimeRules.map((rule) => (
                    <div
                      key={rule._id}
                      className={`p-4 rounded-lg border ${
                        rule.active
                          ? 'bg-background border-border'
                          : 'bg-muted/50 border-border opacity-60'
                      }`}
                    >
                      {editingShortTime?._id === rule._id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editingShortTime.name}
                              onChange={(e) => setEditingShortTime({ ...editingShortTime, name: e.target.value })}
                              className="px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <input
                              type="number"
                              min="1"
                              value={editingShortTime.minShortMinutes}
                              onChange={(e) => setEditingShortTime({ ...editingShortTime, minShortMinutes: parseInt(e.target.value) || 30 })}
                              className="px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <textarea
                            value={editingShortTime.description || ''}
                            onChange={(e) => setEditingShortTime({ ...editingShortTime, description: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          />
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingShortTime.requiresPreApproval}
                                onChange={(e) => setEditingShortTime({ ...editingShortTime, requiresPreApproval: e.target.checked })}
                                className="rounded border-input"
                              />
                              Pre-approval
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingShortTime.ignoreWeekends}
                                onChange={(e) => setEditingShortTime({ ...editingShortTime, ignoreWeekends: e.target.checked })}
                                className="rounded border-input"
                              />
                              Ignore Weekends
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingShortTime.ignoreHolidays}
                                onChange={(e) => setEditingShortTime({ ...editingShortTime, ignoreHolidays: e.target.checked })}
                                className="rounded border-input"
                              />
                              Ignore Holidays
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editingShortTime.active}
                                onChange={(e) => setEditingShortTime({ ...editingShortTime, active: e.target.checked })}
                                className="rounded border-input"
                              />
                              Active
                            </label>
                            <div className="flex gap-2 ml-auto">
                              <button
                                onClick={handleUpdateShortTime}
                                disabled={submitting}
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingShortTime(null)}
                                className="px-3 py-1.5 text-sm border border-input text-foreground rounded-lg hover:bg-accent transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                                rule.active ? 'bg-green-500' : 'bg-muted-foreground'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-foreground">{rule.name}</h3>
                                {rule.approved ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                    Pending Approval
                                  </span>
                                )}
                                {!rule.active && (
                                  <span className="text-xs text-muted-foreground">(Inactive)</span>
                                )}
                              </div>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                  {rule.minShortMinutes}m threshold
                                </span>
                                {rule.requiresPreApproval && (
                                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full">
                                    Pre-approval required
                                  </span>
                                )}
                                {rule.ignoreWeekends && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                    Weekends ignored
                                  </span>
                                )}
                                {rule.ignoreHolidays && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                                    Holidays ignored
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingShortTime(rule)}
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {!rule.approved && (
                              <button
                                onClick={() => handleApproveShortTime(rule._id, rule.name)}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lateness Rules Tab */}
        {activeTab === 'lateness' && (
          <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">
                  {showLatenessForm ? 'Create Lateness Rule' : 'Existing Lateness Rules'}
                </h2>
                {!showLatenessForm && (
                  <button
                    onClick={() => setShowLatenessForm(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Create Rule
                  </button>
                )}
              </div>

              {showLatenessForm && (
                <div className="border border-border rounded-lg p-4 mb-4 bg-muted/30 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Rule Name *</label>
                    <input
                      type="text"
                      value={latenessForm.name}
                      onChange={(e) => setLatenessForm({ ...latenessForm, name: e.target.value })}
                      placeholder="e.g., Standard Lateness Policy"
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea
                      value={latenessForm.description || ''}
                      onChange={(e) => setLatenessForm({ ...latenessForm, description: e.target.value })}
                      placeholder="Describe the lateness rule..."
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={3}
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Grace Period (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={latenessForm.gracePeriodMinutes || 0}
                        onChange={(e) => setLatenessForm({ ...latenessForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Deduction per Minute</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={latenessForm.deductionForEachMinute || 0}
                        onChange={(e) => setLatenessForm({ ...latenessForm, deductionForEachMinute: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={latenessForm.active || true}
                      onChange={(e) => setLatenessForm({ ...latenessForm, active: e.target.checked })}
                      className="rounded border-input"
                    />
                    Active
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateLateness}
                      disabled={submitting}
                      className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Creating...' : 'Create Rule'}
                    </button>
                    <button
                      onClick={resetLatenessForm}
                      disabled={submitting}
                      className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Templates */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-2">Quick Templates:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {LATENESS_TEMPLATES.map((template) => (
                        <button
                          key={template.name}
                          onClick={() => selectLatenessTemplate(template)}
                          disabled={submitting}
                          className="text-left px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm disabled:opacity-50"
                        >
                          <div className="font-medium text-foreground">{template.name}</div>
                          <div className="text-xs text-muted-foreground">{template.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Rules List */}
              {!showLatenessForm && (
                <div className="space-y-2">
                  {latenessRules.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No lateness rules configured yet.</p>
                  ) : (
                    latenessRules.map((rule) => (
                      <div key={rule._id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">{rule.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${rule.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'}`}>
                              {rule.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {rule.description && <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>}
                          <div className="flex flex-wrap gap-3 text-xs">
                            <span><strong>Grace:</strong> {rule.gracePeriodMinutes} min</span>
                            <span><strong>Deduction:</strong> {rule.deductionForEachMinute} per min</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setEditingLateness(rule)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteLateness(rule._id, rule.name)}
                            className="p-2 text-destructive hover:text-destructive/80 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Edit Form */}
              {editingLateness && (
                <div className="border border-border rounded-lg p-4 mt-4 bg-muted/30 space-y-4">
                  <h3 className="font-medium text-foreground">Edit Lateness Rule</h3>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Rule Name</label>
                    <input
                      type="text"
                      value={editingLateness.name}
                      onChange={(e) => setEditingLateness({ ...editingLateness, name: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea
                      value={editingLateness.description || ''}
                      onChange={(e) => setEditingLateness({ ...editingLateness, description: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={3}
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Grace Period (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingLateness.gracePeriodMinutes}
                        onChange={(e) => setEditingLateness({ ...editingLateness, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Deduction per Minute</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingLateness.deductionForEachMinute}
                        onChange={(e) => setEditingLateness({ ...editingLateness, deductionForEachMinute: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editingLateness.active}
                      onChange={(e) => setEditingLateness({ ...editingLateness, active: e.target.checked })}
                      className="rounded border-input"
                    />
                    Active
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleUpdateLateness}
                      disabled={submitting}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? 'Updating...' : 'Update Rule'}
                    </button>
                    <button
                      onClick={() => setEditingLateness(null)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300">Rule Configuration Guide</h3>
              <div className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                <p><strong>Overtime Rules:</strong> Define how overtime is calculated, including rates for regular, weekend, and holiday overtime. Rules require admin approval before taking effect.</p>
                <p><strong>Short-time Rules:</strong> Set thresholds for flagging when employees work less than scheduled. Configure whether weekends/holidays are included and if pre-approval is required.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

