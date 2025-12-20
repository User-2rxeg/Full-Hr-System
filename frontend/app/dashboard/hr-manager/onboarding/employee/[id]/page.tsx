'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  onboardingService,
  Onboarding,
  OnboardingProgress,
  OnboardingTaskStatus,
  Document,
} from '@/app/services/onboarding';

const ONBOARDING_PHASES = [
  { id: 1, name: 'Setup & Checklist', description: 'Assign onboarding template and tasks' },
  { id: 2, name: 'Profile Creation', description: 'Create employee profile from contract' },
  { id: 3, name: 'Document Collection', description: 'Collect compliance documents' },
  { id: 4, name: 'Resource Provisioning', description: 'Allocate equipment and workspace' },
  { id: 5, name: 'System Access', description: 'Provision email, SSO, internal systems' },
  { id: 6, name: 'Payroll & Benefits', description: 'Setup payroll and benefits' },
  { id: 7, name: 'Completion', description: 'Verify completion and activate employee' },
];

export default function OnboardingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const onboardingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents' | 'timeline'>('tasks');
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    if (onboardingId && onboardingId !== 'new') {
      fetchOnboarding();
    }
  }, [onboardingId]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);

      const [onboardingData, progressData] = await Promise.all([
        onboardingService.getOnboardingById(onboardingId),
        onboardingService.getOnboardingProgress(onboardingId),
      ]);

      setOnboarding(onboardingData);
      setProgress(progressData);

      // Handle case where employeeId might be a populated object
      const employeeId = typeof onboardingData.employeeId === 'object'
        ? (onboardingData.employeeId as any)?._id
        : onboardingData.employeeId;

      if (employeeId) {
        try {
          const docs = await onboardingService.getDocumentsByOwner(employeeId);
          setDocuments(docs);
        } catch {
          // Documents might not exist yet
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (taskName: string, newStatus: OnboardingTaskStatus) => {
    if (!onboarding) return;

    try {
      setUpdatingTask(taskName);
      setError(null);

      await onboardingService.updateTaskStatus(onboardingId, taskName, {
        status: newStatus,
        completedAt: newStatus === OnboardingTaskStatus.COMPLETED ? new Date().toISOString() : undefined,
      });

      await fetchOnboarding();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status');
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleCancelOnboarding = async () => {
    if (!confirm('Are you sure you want to cancel this onboarding? This will deactivate the employee profile.')) {
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (e.g., no-show):');
    if (!reason) return;

    try {
      setError(null);
      await onboardingService.cancelOnboarding(onboardingId, { reason });
      router.push('/dashboard/hr-manager/onboarding');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel onboarding');
    }
  };

  const getCurrentPhase = () => {
    if (!progress) return 1;
    if (progress.isComplete) return 7;
    if (progress.progressPercentage >= 80) return 6;
    if (progress.progressPercentage >= 60) return 5;
    if (progress.progressPercentage >= 40) return 4;
    if (progress.progressPercentage >= 20) return 3;
    if (progress.progressPercentage > 0) return 2;
    return 1;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          Onboarding not found
        </div>
        <Link href="/dashboard/hr-manager/onboarding" className="text-primary hover:underline mt-4 inline-block">
          Back to Onboarding Dashboard
        </Link>
      </div>
    );
  }

  const currentPhase = getCurrentPhase();

  // Handle case where employeeId might be a populated object
  const employeeIdDisplay = typeof onboarding.employeeId === 'object'
    ? (onboarding.employeeId as any)?._id || (onboarding.employeeId as any)?.firstName || 'Unknown'
    : onboarding.employeeId;

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/hr-manager/onboarding" className="text-muted-foreground hover:text-foreground">
              Onboarding
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-foreground">Employee Tracker</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">Onboarding Progress</h1>
          <p className="text-muted-foreground mt-1">Employee ID: {employeeIdDisplay}</p>
        </div>
        <div className="flex gap-3">
          {!onboarding.completed && (
            <button
              onClick={handleCancelOnboarding}
              className="px-4 py-2 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10"
            >
              Cancel Onboarding
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p className={`text-lg font-semibold mt-1 ${onboarding.completed ? 'text-green-600' : 'text-blue-600'}`}>
            {onboarding.completed ? 'Completed' : 'In Progress'}
          </p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Progress</p>
          <p className="text-lg font-semibold mt-1 text-foreground">{progress?.progressPercentage || 0}%</p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
          <p className="text-lg font-semibold mt-1 text-foreground">
            {progress?.completedTasks || 0} / {progress?.totalTasks || 0}
          </p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground">Current Phase</p>
          <p className="text-lg font-semibold mt-1 text-foreground">Phase {currentPhase}</p>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Onboarding Timeline</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
          <div className="space-y-4">
            {ONBOARDING_PHASES.map((phase) => {
              const isCompleted = phase.id < currentPhase;
              const isCurrent = phase.id === currentPhase;
              return (
                <div key={phase.id} className="relative pl-10">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-card border-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : phase.id}
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      isCompleted
                        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
                        : isCurrent
                        ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30'
                        : 'bg-muted/30 border border-border'
                    }`}
                  >
                    <p className={`font-medium ${isCurrent ? 'text-blue-900 dark:text-blue-400' : isCompleted ? 'text-green-900 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {phase.name}
                    </p>
                    <p className={`text-sm ${isCurrent ? 'text-blue-700 dark:text-blue-300' : isCompleted ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground/70'}`}>
                      {phase.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-lg border border-border">
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Tasks ({onboarding.tasks.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'documents'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Documents ({documents.length})
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {onboarding.tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tasks assigned</p>
              ) : (
                onboarding.tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      task.status === OnboardingTaskStatus.COMPLETED
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/30'
                        : task.status === OnboardingTaskStatus.IN_PROGRESS
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900/30'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{task.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">Department: {task.department}</p>
                        {task.deadline && (
                          <p className="text-sm text-muted-foreground">
                            Deadline: {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                        {task.notes && <p className="text-sm text-muted-foreground/80 mt-2">{task.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusUpdate(task.name, e.target.value as OnboardingTaskStatus)}
                          disabled={updatingTask === task.name || onboarding.completed}
                          className={`px-3 py-1.5 text-sm rounded-md border ${
                            task.status === OnboardingTaskStatus.COMPLETED
                              ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800'
                              : task.status === OnboardingTaskStatus.IN_PROGRESS
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800'
                              : 'bg-muted border-input text-foreground'
                          }`}
                        >
                          <option value={OnboardingTaskStatus.PENDING}>Pending</option>
                          <option value={OnboardingTaskStatus.IN_PROGRESS}>In Progress</option>
                          <option value={OnboardingTaskStatus.COMPLETED}>Completed</option>
                        </select>
                        {updatingTask === task.name && (
                          <span className="text-sm text-muted-foreground">Updating...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No documents uploaded</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc._id} className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">{doc.type.toUpperCase()}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                        Uploaded
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

