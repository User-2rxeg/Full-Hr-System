'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  onboardingService,
  Onboarding,
  OnboardingTask,
  OnboardingTaskStatus,
} from '@/app/services/onboarding';

const STATUS_CONFIG = {
  [OnboardingTaskStatus.PENDING]: {
    label: 'Pending',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
  [OnboardingTaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  [OnboardingTaskStatus.COMPLETED]: {
    label: 'Completed',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    dotColor: 'bg-green-500',
  },
};

export default function OnboardingChecklistDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  // Add task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', department: '', deadline: '' });
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOnboarding();
    }
  }, [id]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onboardingService.getOnboardingById(id);
      setOnboarding(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskName: string, newStatus: OnboardingTaskStatus) => {
    if (!onboarding) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      setSuccess(null);

      await onboardingService.updateTaskStatus(onboarding._id, taskName, {
        status: newStatus,
        completedAt: newStatus === OnboardingTaskStatus.COMPLETED ? new Date().toISOString() : undefined,
      });

      setSuccess(`Task "${taskName}" updated to ${newStatus}`);
      await fetchOnboarding();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update task status');
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboarding || !newTask.name || !newTask.department) return;

    try {
      setAddingTask(true);
      setError(null);

      await onboardingService.addTask(onboarding._id, {
        name: newTask.name,
        department: newTask.department,
        deadline: newTask.deadline || undefined,
      });

      setSuccess(`Task "${newTask.name}" added successfully`);
      setNewTask({ name: '', department: '', deadline: '' });
      setShowAddTask(false);
      await fetchOnboarding();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  const getProgress = () => {
    if (!onboarding?.tasks || onboarding.tasks.length === 0) return 0;
    const completed = onboarding.tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
    return Math.round((completed / onboarding.tasks.length) * 100);
  };

  const getTasksByDepartment = () => {
    if (!onboarding?.tasks) return {};
    return onboarding.tasks.reduce((acc, task) => {
      const dept = task.department || 'Other';
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(task);
      return acc;
    }, {} as Record<string, OnboardingTask[]>);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Onboarding checklist not found</p>
          <Link href="/dashboard/hr-manager/onboarding/checklists" className="text-primary hover:underline mt-4 inline-block">
            Back to Checklists
          </Link>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const tasksByDepartment = getTasksByDepartment();

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/hr-manager/onboarding/checklists"
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Onboarding Checklist</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Employee ID: {typeof onboarding.employeeId === 'object' 
                ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.id || 'N/A'
                : onboarding.employeeId || 'N/A'}
            </p>
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Progress Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-3xl font-bold text-foreground">{progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
              <p className="text-lg font-semibold text-foreground">
                {onboarding.tasks?.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length || 0} / {onboarding.tasks?.length || 0}
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {onboarding.completed && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-3">
              Onboarding completed on {new Date(onboarding.completedAt!).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-medium text-foreground mb-4">Add New Task</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
                  required
                />
                <input
                  type="text"
                  placeholder="Department"
                  value={newTask.department}
                  onChange={(e) => setNewTask({ ...newTask, department: e.target.value })}
                  className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
                  required
                />
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addingTask}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {addingTask ? 'Adding...' : 'Add Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 border border-input rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks by Department */}
        <div className="space-y-6">
          {Object.entries(tasksByDepartment).map(([department, tasks]) => (
            <div key={department} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-muted/50 border-b border-border">
                <h3 className="font-medium text-foreground">{department}</h3>
                <p className="text-sm text-muted-foreground">
                  {tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length} of {tasks.length} completed
                </p>
              </div>
              <div className="divide-y divide-border">
                {tasks.map((task, index) => {
                  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG[OnboardingTaskStatus.PENDING];
                  const isUpdating = updatingTask === task.name;

                  return (
                    <div key={index} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full ${statusConfig.dotColor}`} />
                        <div>
                          <p className="font-medium text-foreground">{task.name}</p>
                          {task.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(task.deadline).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          {statusConfig.label}
                        </span>
                        {task.status !== OnboardingTaskStatus.COMPLETED && (
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task.name, e.target.value as OnboardingTaskStatus)}
                            disabled={isUpdating || onboarding.completed}
                            className="px-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground disabled:opacity-50"
                          >
                            <option value={OnboardingTaskStatus.PENDING}>Pending</option>
                            <option value={OnboardingTaskStatus.IN_PROGRESS}>In Progress</option>
                            <option value={OnboardingTaskStatus.COMPLETED}>Completed</option>
                          </select>
                        )}
                        {isUpdating && (
                          <svg className="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Onboarding ID</p>
              <p className="font-mono text-foreground">{onboarding._id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Contract ID</p>
              <p className="font-mono text-foreground">
                {typeof onboarding.contractId === 'object' 
                  ? (onboarding.contractId as any)?._id || (onboarding.contractId as any)?.id || 'N/A'
                  : onboarding.contractId || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="text-foreground">{new Date(onboarding.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className={onboarding.completed ? 'text-green-600' : 'text-amber-600'}>
                {onboarding.completed ? 'Completed' : 'In Progress'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

