'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    timeManagementService,
    ShiftType,
    Shift,
    CreateShiftDto,
    PunchPolicy,
} from '@/app/services/time-management';

// Predefined shift type suggestions
const SHIFT_TYPE_SUGGESTIONS = [
    { name: 'Normal', description: 'Standard working hours (e.g., 9 AM - 5 PM)' },
    { name: 'Split', description: 'Work divided into two periods with a break' },
    { name: 'Overnight', description: 'Night shift crossing midnight' },
    { name: 'Rotational', description: 'Rotating shifts between different time slots' },
    { name: 'Flexible', description: 'Flexible start and end times within a range' },
    { name: 'Part-Time', description: 'Reduced working hours' },
];

export default function ShiftManagementPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Shift Types state
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [showCreateShiftType, setShowCreateShiftType] = useState(false);
    const [newShiftTypeName, setNewShiftTypeName] = useState('');
    const [creatingShiftType, setCreatingShiftType] = useState(false);
    const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null);

    // Shifts state
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [showCreateShift, setShowCreateShift] = useState(false);
    const [creatingShift, setCreatingShift] = useState(false);
    const [newShift, setNewShift] = useState<CreateShiftDto>({
        name: '',
        shiftType: '',
        startTime: '09:00',
        endTime: '17:00',
        punchPolicy: PunchPolicy.FIRST_LAST,
        graceInMinutes: 15,
        graceOutMinutes: 15,
        requiresApprovalForOvertime: false,
        active: true,
    });

    // Active tab
    const [activeTab, setActiveTab] = useState<'types' | 'shifts'>('types');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [typesRes, shiftsRes] = await Promise.all([
                timeManagementService.getShiftTypes(),
                timeManagementService.getShifts(),
            ]);

            if (typesRes.data) {
                setShiftTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
            }
            if (shiftsRes.data) {
                setShifts(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load shift data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ============================================================
    // SHIFT TYPE HANDLERS
    // ============================================================

    const handleCreateShiftType = async () => {
        if (!newShiftTypeName.trim()) {
            setError('Shift type name is required');
            return;
        }

        try {
            setCreatingShiftType(true);
            setError(null);

            const response = await timeManagementService.createShiftType({
                name: newShiftTypeName.trim(),
                active: true,
            });

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess(`Shift type "${newShiftTypeName}" created successfully`);
            setNewShiftTypeName('');
            setShowCreateShiftType(false);
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to create shift type');
        } finally {
            setCreatingShiftType(false);
        }
    };

    const handleUpdateShiftType = async () => {
        if (!editingShiftType) return;

        try {
            setError(null);

            const response = await timeManagementService.updateShiftType(editingShiftType._id, {
                name: editingShiftType.name,
                active: editingShiftType.active,
            });

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess('Shift type updated successfully');
            setEditingShiftType(null);
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update shift type');
        }
    };

    const handleDeactivateShiftType = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to deactivate "${name}"?`)) return;

        try {
            setError(null);

            const response = await timeManagementService.deactivateShiftType(id);

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess(`Shift type "${name}" deactivated`);
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to deactivate shift type');
        }
    };

    // ============================================================
    // SHIFT HANDLERS
    // ============================================================

    const handleCreateShift = async () => {
        if (!newShift.name.trim()) {
            setError('Shift name is required');
            return;
        }
        if (!newShift.shiftType) {
            setError('Please select a shift type');
            return;
        }

        try {
            setCreatingShift(true);
            setError(null);

            const response = await timeManagementService.createShift(newShift);

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess(`Shift "${newShift.name}" created successfully`);
            setNewShift({
                name: '',
                shiftType: '',
                startTime: '09:00',
                endTime: '17:00',
                punchPolicy: PunchPolicy.FIRST_LAST,
                graceInMinutes: 15,
                graceOutMinutes: 15,
                requiresApprovalForOvertime: false,
                active: true,
            });
            setShowCreateShift(false);
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to create shift');
        } finally {
            setCreatingShift(false);
        }
    };

    const handleDeactivateShift = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to deactivate "${name}"?`)) return;

        try {
            setError(null);

            const response = await timeManagementService.deactivateShift(id);

            if (response.error) {
                setError(response.error);
                return;
            }

            setSuccess(`Shift "${name}" deactivated`);
            await fetchData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to deactivate shift');
        }
    };

    const getShiftTypeName = (shiftTypeId: string | ShiftType) => {
        if (typeof shiftTypeId === 'object') return shiftTypeId.name;
        const found = shiftTypes.find((st) => st._id === shiftTypeId);
        return found?.name || 'Unknown';
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minutes} ${period}`;
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
                        <h1 className="text-2xl font-semibold text-foreground">Shift Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Define and configure shift types and their schedules
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
                        onClick={() => setActiveTab('types')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'types'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Shift Types
                    </button>
                    <button
                        onClick={() => setActiveTab('shifts')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === 'shifts'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Shift Configurations
                    </button>
                </div>

                {/* Shift Types Tab */}
                {activeTab === 'types' && (
                    <div className="space-y-6">
                        {/* Quick Add from Suggestions */}
                        <div className="bg-card rounded-xl border border-border p-6">
                            <h2 className="font-semibold text-foreground mb-4">Quick Add Shift Types</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Click on a suggested shift type to add it, or create a custom one below.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {SHIFT_TYPE_SUGGESTIONS.map((suggestion) => {
                                    const exists = shiftTypes.some(
                                        (st) => st.name.toLowerCase() === suggestion.name.toLowerCase()
                                    );
                                    return (
                                        <button
                                            key={suggestion.name}
                                            onClick={() => {
                                                if (!exists) {
                                                    setNewShiftTypeName(suggestion.name);
                                                    setShowCreateShiftType(true);
                                                }
                                            }}
                                            disabled={exists}
                                            className={`p-3 rounded-lg border text-left transition-all ${
                                                exists
                                                    ? 'bg-muted border-border cursor-not-allowed opacity-50'
                                                    : 'bg-background border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                                            }`}
                                            title={suggestion.description}
                                        >
                                            <div className="font-medium text-sm text-foreground">{suggestion.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {exists ? 'Already exists' : suggestion.description}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Create Custom ShiftType */}
                        <div className="bg-card rounded-xl border border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-foreground">
                                    {showCreateShiftType ? 'Create ShiftType' : 'Existing Shift Types'}
                                </h2>
                                {!showCreateShiftType && (
                                    <button
                                        onClick={() => setShowCreateShiftType(true)}
                                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        Create Custom
                                    </button>
                                )}
                            </div>

                            {showCreateShiftType && (
                                <div className="border border-border rounded-lg p-4 mb-4 bg-muted/30">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            value={newShiftTypeName}
                                            onChange={(e) => setNewShiftTypeName(e.target.value)}
                                            placeholder="Enter shift type name (e.g., Morning, Evening, Weekend)"
                                            className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCreateShiftType}
                                                disabled={creatingShiftType}
                                                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                            >
                                                {creatingShiftType ? 'Creating...' : 'Create'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowCreateShiftType(false);
                                                    setNewShiftTypeName('');
                                                }}
                                                className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Shift Types List */}
                            <div className="space-y-2">
                                {shiftTypes.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No shift types defined yet. Create one using the suggestions above or add a custom type.
                                    </div>
                                ) : (
                                    shiftTypes.map((st) => (
                                        <div
                                            key={st._id}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${
                                                st.active
                                                    ? 'bg-background border-border'
                                                    : 'bg-muted/50 border-border opacity-60'
                                            }`}
                                        >
                                            {editingShiftType?._id === st._id ? (
                                                <div className="flex items-center gap-3 flex-1">
                                                    <input
                                                        type="text"
                                                        value={editingShiftType.name}
                                                        onChange={(e) =>
                                                            setEditingShiftType({ ...editingShiftType, name: e.target.value })
                                                        }
                                                        className="px-3 py-1.5 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingShiftType.active}
                                                            onChange={(e) =>
                                                                setEditingShiftType({ ...editingShiftType, active: e.target.checked })
                                                            }
                                                            className="rounded border-input"
                                                        />
                                                        Active
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${
                                                            st.active ? 'bg-green-500' : 'bg-muted-foreground'
                                                        }`}
                                                    />
                                                    <span className="font-medium text-foreground">{st.name}</span>
                                                    {!st.active && (
                                                        <span className="text-xs text-muted-foreground">(Inactive)</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {editingShiftType?._id === st._id ? (
                                                    <>
                                                        <button
                                                            onClick={handleUpdateShiftType}
                                                            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingShiftType(null)}
                                                            className="px-3 py-1.5 text-sm border border-input text-foreground rounded-lg hover:bg-accent transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingShiftType(st)}
                                                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        {st.active && (
                                                            <button
                                                                onClick={() => handleDeactivateShiftType(st._id, st.name)}
                                                                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                                                title="Deactivate"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Shifts Tab */}
                {activeTab === 'shifts' && (
                    <div className="space-y-6">
                        {/* Create Shift Form */}
                        <div className="bg-card rounded-xl border border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-foreground">
                                    {showCreateShift ? 'Create New Shift' : 'Configured Shifts'}
                                </h2>
                                {!showCreateShift && (
                                    <button
                                        onClick={() => setShowCreateShift(true)}
                                        disabled={shiftTypes.filter((st) => st.active).length === 0}
                                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Create Shift
                                    </button>
                                )}
                            </div>

                            {shiftTypes.filter((st) => st.active).length === 0 && !showCreateShift && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                    <p className="text-amber-800 dark:text-amber-300 text-sm">
                                        You need to create at least one active shift type before creating shifts.
                                        Go to the "Shift Types" tab to add one.
                                    </p>
                                </div>
                            )}

                            {showCreateShift && (
                                <div className="border border-border rounded-lg p-4 mb-4 bg-muted/30 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Shift Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newShift.name}
                                                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                                                placeholder="e.g., Morning Shift 9-5"
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Shift Type *
                                            </label>
                                            <select
                                                value={newShift.shiftType}
                                                onChange={(e) => setNewShift({ ...newShift, shiftType: e.target.value })}
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">Select a shift type</option>
                                                {shiftTypes
                                                    .filter((st) => st.active)
                                                    .map((st) => (
                                                        <option key={st._id} value={st._id}>
                                                            {st.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Start Time *
                                            </label>
                                            <input
                                                type="time"
                                                value={newShift.startTime}
                                                onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                End Time *
                                            </label>
                                            <input
                                                type="time"
                                                value={newShift.endTime}
                                                onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Punch Policy
                                            </label>
                                            <select
                                                value={newShift.punchPolicy}
                                                onChange={(e) =>
                                                    setNewShift({ ...newShift, punchPolicy: e.target.value as PunchPolicy })
                                                }
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value={PunchPolicy.FIRST_LAST}>First In / Last Out</option>
                                                <option value={PunchPolicy.MULTIPLE}>Multiple Punches</option>
                                                <option value={PunchPolicy.ONLY_FIRST}>Only First Punch</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Grace In (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={newShift.graceInMinutes}
                                                onChange={(e) =>
                                                    setNewShift({ ...newShift, graceInMinutes: parseInt(e.target.value) || 0 })
                                                }
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Grace Out (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={newShift.graceOutMinutes}
                                                onChange={(e) =>
                                                    setNewShift({ ...newShift, graceOutMinutes: parseInt(e.target.value) || 0 })
                                                }
                                                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 text-sm pb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={newShift.requiresApprovalForOvertime}
                                                    onChange={(e) =>
                                                        setNewShift({ ...newShift, requiresApprovalForOvertime: e.target.checked })
                                                    }
                                                    className="rounded border-input"
                                                />
                                                Require Overtime Approval
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleCreateShift}
                                            disabled={creatingShift}
                                            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            {creatingShift ? 'Creating...' : 'Create Shift'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCreateShift(false);
                                                setNewShift({
                                                    name: '',
                                                    shiftType: '',
                                                    startTime: '09:00',
                                                    endTime: '17:00',
                                                    punchPolicy: PunchPolicy.FIRST_LAST,
                                                    graceInMinutes: 15,
                                                    graceOutMinutes: 15,
                                                    requiresApprovalForOvertime: false,
                                                    active: true,
                                                });
                                            }}
                                            className="px-4 py-2 border border-input text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Shifts List */}
                            <div className="space-y-3">
                                {shifts.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No shifts configured yet. Create shift types first, then add shift configurations.
                                    </div>
                                ) : (
                                    shifts.map((shift) => (
                                        <div
                                            key={shift._id}
                                            className={`p-4 rounded-lg border ${
                                                shift.active
                                                    ? 'bg-background border-border'
                                                    : 'bg-muted/50 border-border opacity-60'
                                            }`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                                <div className="flex items-start gap-4">
                                                    <div
                                                        className={`w-3 h-3 rounded-full mt-1.5 ${
                                                            shift.active ? 'bg-green-500' : 'bg-muted-foreground'
                                                        }`}
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-medium text-foreground">{shift.name}</h3>
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                {getShiftTypeName(shift.shiftType)}
                              </span>
                                                            {!shift.active && (
                                                                <span className="text-xs text-muted-foreground">(Inactive)</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                              <span>
                                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                              </span>
                                                            <span>Policy: {shift.punchPolicy ? shift.punchPolicy.replace('_', ' ') : 'N/A'}</span>
                                                            <span>
                                Grace: {shift.graceInMinutes}m in / {shift.graceOutMinutes}m out
                              </span>
                                                            {shift.requiresApprovalForOvertime && (
                                                                <span className="text-amber-600">OT Approval Required</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {shift.active && (
                                                        <button
                                                            onClick={() => handleDeactivateShift(shift._id, shift.name)}
                                                            className="px-3 py-1.5 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

