'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  timeManagementService,
  ScheduleRule,
  CreateScheduleRuleDto,
} from '@/app/services/time-management';

// Predefined pattern templates for common scheduling patterns
const PATTERN_TEMPLATES = [
  {
    name: 'Standard Work Week',
    pattern: 'WEEKLY:Mon,Tue,Wed,Thu,Fri',
    description: 'Monday to Friday schedule',
    category: 'Weekly',
  },
  {
    name: 'Weekend Only',
    pattern: 'WEEKLY:Sat,Sun',
    description: 'Saturday and Sunday only',
    category: 'Weekly',
  },
  {
    name: '4 Days On / 3 Days Off',
    pattern: 'WEEKLY:Mon,Tue,Wed,Thu',
    description: 'Work Mon-Thu, off Fri-Sun',
    category: 'Compressed',
  },
  {
    name: '3 Days On / 4 Days Off',
    pattern: 'WEEKLY:Mon,Wed,Fri',
    description: 'Alternating days work schedule',
    category: 'Compressed',
  },
  {
    name: 'Daily Schedule',
    pattern: 'DAILY',
    description: 'Every day of the week',
    category: 'Daily',
  },
  {
    name: 'Rotating 3-2 Schedule',
    pattern: 'ROTATION:3days-on-2days-off',
    description: '3 days working, 2 days off rotation',
    category: 'Rotational',
  },
  {
    name: 'Rotating 4-3 Schedule',
    pattern: 'ROTATION:4days-on-3days-off',
    description: '4 days working, 3 days off rotation',
    category: 'Rotational',
  },
  {
    name: 'Flexible Hours',
    pattern: 'FLEX:core-10:00-15:00',
    description: 'Flexible with core hours 10 AM - 3 PM',
    category: 'Flexible',
  },
  {
    name: 'Early Flex',
    pattern: 'FLEX:window-06:00-10:00',
    description: 'Flexible start between 6 AM - 10 AM',
    category: 'Flexible',
  },
];

const DAY_OPTIONS = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
];

export default function ScheduleRulesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schedule Rules state
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateScheduleRuleDto>({
    name: '',
    pattern: '',
    active: true,
  });

  // Pattern builder state
  const [patternType, setPatternType] = useState<'template' | 'weekly' | 'custom'>('template');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [customPattern, setCustomPattern] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await timeManagementService.getScheduleRules();

      if (response.data) {
        setScheduleRules(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build pattern from selected days
  useEffect(() => {
    if (patternType === 'weekly' && selectedDays.length > 0) {
      setFormData((prev) => ({
        ...prev,
        pattern: `WEEKLY:${selectedDays.join(',')}`,
      }));
    } else if (patternType === 'custom') {
      setFormData((prev) => ({
        ...prev,
        pattern: customPattern,
      }));
    }
  }, [patternType, selectedDays, customPattern]);

  const handleSelectTemplate = (template: typeof PATTERN_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      pattern: template.pattern,
      active: true,
    });
    setPatternType('template');
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreateRule = async () => {
    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (!formData.pattern.trim()) {
      setError('Pattern is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await timeManagementService.createScheduleRule(formData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Schedule rule "${formData.name}" created successfully`);
      resetForm();
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule rule');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      setError(null);

      const response = await timeManagementService.updateScheduleRule(editingRule._id, {
        name: editingRule.name,
        pattern: editingRule.pattern,
        active: editingRule.active,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Schedule rule updated successfully');
      setEditingRule(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule rule');
    }
  };

  const handleDeactivateRule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"?`)) return;

    try {
      setError(null);

      const response = await timeManagementService.deactivateScheduleRule(id);

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess(`Schedule rule "${name}" deactivated`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate schedule rule');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', pattern: '', active: true });
    setPatternType('template');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setCustomPattern('');
    setShowCreateForm(false);
  };

  const parsePattern = (pattern: string) => {
    if (pattern.startsWith('WEEKLY:')) {
      const days = pattern.replace('WEEKLY:', '').split(',');
      return { type: 'Weekly', days: days.join(', ') };
    }
    if (pattern.startsWith('DAILY')) {
      return { type: 'Daily', days: 'Every day' };
    }
    if (pattern.startsWith('ROTATION:')) {
      return { type: 'Rotational', days: pattern.replace('ROTATION:', '') };
    }
    if (pattern.startsWith('FLEX:')) {
      return { type: 'Flexible', days: pattern.replace('FLEX:', '') };
    }
    return { type: 'Custom', days: pattern };
  };

  const getPatternBadgeColor = (type: string) => {
    switch (type) {
      case 'Weekly':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Daily':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Rotational':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Flexible':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
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
            <h1 className="text-2xl font-semibold text-foreground">Schedule Rules</h1>
            <p className="text-muted-foreground mt-1">
              Define flexible and custom scheduling rules for diverse work arrangements
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Schedule Rule
            </button>
          )}
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

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create New Schedule Rule</h2>
              <button
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Pattern Type Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                How would you like to create the schedule?
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'template', label: 'Use Template' },
                  { id: 'weekly', label: 'Build Weekly Pattern' },
                  { id: 'custom', label: 'Custom Pattern' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPatternType(option.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      patternType === option.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selection */}
            {patternType === 'template' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select a Template
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PATTERN_TEMPLATES.map((template) => (
                    <button
                      key={template.pattern}
                      onClick={() => handleSelectTemplate(template)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        formData.pattern === template.pattern
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground text-sm">{template.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPatternBadgeColor(template.category)}`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{template.pattern}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Pattern Builder */}
            {patternType === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Working Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Pattern: <code className="bg-muted px-2 py-0.5 rounded text-xs">{`WEEKLY:${selectedDays.join(',')}`}</code>
                  </p>
                )}
              </div>
            )}

            {/* Custom Pattern */}
            {patternType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Enter Custom Pattern
                </label>
                <input
                  type="text"
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  placeholder="e.g., WEEKLY:Mon,Wed,Fri or ROTATION:3days-on-2days-off"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: WEEKLY:Day1,Day2, DAILY, ROTATION:XdaysOn-YdaysOff, FLEX:type-value
                </p>
              </div>
            )}

            {/* Rule Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter a descriptive name for this schedule rule"
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Pattern Preview */}
            {formData.pattern && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-foreground mb-2">Pattern Preview</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-background px-3 py-1 rounded text-sm border border-border">
                    {formData.pattern}
                  </code>
                  {(() => {
                    const parsed = parsePattern(formData.pattern);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getPatternBadgeColor(parsed.type)}`}>
                        {parsed.type}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreateRule}
                disabled={creating || !formData.name || !formData.pattern}
                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Rule'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Existing Rules */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">Configured Schedule Rules</h2>

          {scheduleRules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-foreground font-medium">No schedule rules defined</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first schedule rule to define work patterns for employees.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleRules.map((rule) => {
                const parsed = parsePattern(rule.pattern);
                return (
                  <div
                    key={rule._id}
                    className={`p-4 rounded-lg border ${
                      rule.active
                        ? 'bg-background border-border'
                        : 'bg-muted/50 border-border opacity-60'
                    }`}
                  >
                    {editingRule?._id === rule._id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingRule.name}
                            onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                            placeholder="Rule name"
                            className="px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="text"
                            value={editingRule.pattern}
                            onChange={(e) => setEditingRule({ ...editingRule, pattern: e.target.value })}
                            placeholder="Pattern"
                            className="px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editingRule.active}
                              onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                              className="rounded border-input"
                            />
                            Active
                          </label>
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={handleUpdateRule}
                              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRule(null)}
                              className="px-3 py-1.5 text-sm border border-input text-foreground rounded-lg hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                              rule.active ? 'bg-green-500' : 'bg-muted-foreground'
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-foreground">{rule.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getPatternBadgeColor(parsed.type)}`}>
                                {parsed.type}
                              </span>
                              {!rule.active && (
                                <span className="text-xs text-muted-foreground">(Inactive)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                {rule.pattern}
                              </code>
                              <span className="text-sm text-muted-foreground">
                                {parsed.days}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          {rule.active && (
                            <button
                              onClick={() => handleDeactivateRule(rule._id, rule.name)}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              title="Deactivate"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300">Pattern Format Guide</h3>
              <div className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                <p><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">WEEKLY:Mon,Tue,Wed,Thu,Fri</code> - Specific days of the week</p>
                <p><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">DAILY</code> - Every day schedule</p>
                <p><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">ROTATION:Xdays-on-Ydays-off</code> - Rotating schedules</p>
                <p><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">FLEX:core-HH:MM-HH:MM</code> - Flexible with core hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

