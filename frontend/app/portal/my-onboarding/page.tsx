'use client';

import { useState, useEffect } from 'react';
import {
  onboardingService,
  OnboardingTracker,
  OnboardingTaskStatus,
  Document,
} from '@/app/services/onboarding';
import { useAuth } from '@/app/context/AuthContext';

const TASK_STATUS_CONFIG = {
  [OnboardingTaskStatus.PENDING]: {
    label: 'Pending',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    dotColor: 'bg-muted-foreground',
  },
  [OnboardingTaskStatus.IN_PROGRESS]: {
    label: 'In Progress',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
    dotColor: 'bg-blue-500',
  },
  [OnboardingTaskStatus.COMPLETED]: {
    label: 'Completed',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-800 dark:text-green-300',
    dotColor: 'bg-green-500',
  },
};

export default function MyOnboardingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<OnboardingTracker | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [noOnboarding, setNoOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents'>('overview');

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoOnboarding(false);

      const employeeId = user?.id;
      if (!employeeId) {
        setNoOnboarding(true);
        return;
      }

      const [trackerData, docsData] = await Promise.all([
        onboardingService.getOnboardingTracker(employeeId).catch(() => null),
        onboardingService.getDocumentsByOwner(employeeId).catch(() => []),
      ]);

      if (!trackerData) {
        setNoOnboarding(true);
        return;
      }

      setTracker(trackerData);
      setDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setNoOnboarding(true);
      } else {
        setError(err.message || 'Failed to fetch onboarding data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskName: string) => {
    if (!user?.id) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      await onboardingService.startTask(user.id, taskName);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to start task');
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleCompleteTask = async (taskName: string) => {
    if (!user?.id) return;

    try {
      setUpdatingTask(taskName);
      setError(null);
      await onboardingService.completeTask(user.id, taskName);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete task');
    } finally {
      setUpdatingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-64 bg-card rounded-xl border border-border"></div>
          </div>
        </div>
      </div>
    );
  }

  if (noOnboarding) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No Active Onboarding</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              You don't have an active onboarding checklist yet. If you're a new hire, please upload your signed contract and required documents to get started.
            </p>
            <a
              href="/portal/candidate/document-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Documents
            </a>
          </div>

          {/* Instructions for Candidates */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">How to Start Your Onboarding</h3>
            <div className="space-y-3">
              {[
                { step: 1, title: 'Upload Your Signed Contract', description: 'Upload the signed employment contract you received' },
                { step: 2, title: 'Submit Required Documents', description: 'Upload government ID and any other required documents' },
                { step: 3, title: 'HR Verification', description: 'HR will verify your documents and create your employee profile' },
                { step: 4, title: 'Onboarding Begins', description: 'Your onboarding checklist will appear here once verified' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">{item.title}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Track your onboarding progress and complete required tasks
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {tracker && (
          <>
            {/* Progress Card */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Onboarding Progress</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Started {new Date(tracker.started).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-foreground">{tracker.progress.progressPercentage}%</p>
                    <p className="text-xs text-muted-foreground">Complete</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${tracker.progress.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{tracker.progress.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-green-600">{tracker.progress.completedTasks}</p>
                  <p className="text-xs text-green-600">Completed</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-blue-600">{tracker.progress.inProgressTasks}</p>
                  <p className="text-xs text-blue-600">In Progress</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-amber-600">{tracker.progress.pendingTasks}</p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
              </div>
            </div>

            {/* Next Task */}
            {tracker.nextTask && !tracker.progress.isComplete && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Next Task</h3>
                    <p className="text-lg font-semibold text-primary mt-1">{tracker.nextTask.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Department: {tracker.nextTask.department}</p>
                    {tracker.nextTask.deadline && (
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(tracker.nextTask.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartTask(tracker.nextTask!.name)}
                    disabled={updatingTask === tracker.nextTask.name}
                    className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {updatingTask === tracker.nextTask.name ? 'Starting...' : 'Start Task'}
                  </button>
                </div>
              </div>
            )}

            {/* Overdue Tasks Warning */}
            {tracker.overdueTasks.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-destructive">Overdue Tasks ({tracker.overdueTasks.length})</h3>
                    <ul className="mt-2 space-y-1">
                      {tracker.overdueTasks.map((task) => (
                        <li key={task.name} className="text-sm text-destructive/80">
                          {task.name} - Due: {new Date(task.deadline!).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'tasks', label: 'All Tasks' },
                { id: 'documents', label: 'Documents' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks by Department */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">Tasks by Department</h3>
                  <div className="space-y-3">
                    {Object.entries(tracker.tasksByDepartment).map(([dept, tasks]) => {
                      const completed = tasks.filter(t => t.status === OnboardingTaskStatus.COMPLETED).length;
                      const percentage = Math.round((completed / tasks.length) * 100);
                      return (
                        <div key={dept}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{dept}</span>
                            <span className="text-xs text-muted-foreground">{completed}/{tasks.length}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">Upcoming Deadlines</h3>
                  {tracker.upcomingDeadlines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-3">
                      {tracker.upcomingDeadlines.slice(0, 5).map((task) => (
                        <div key={task.name} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{task.name}</p>
                            <p className="text-xs text-muted-foreground">{task.department}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.deadline!).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {[...tracker.tasksByStatus.inProgress, ...tracker.tasksByStatus.pending, ...tracker.tasksByStatus.completed].map((task) => {
                    const config = TASK_STATUS_CONFIG[task.status];
                    return (
                      <div key={task.name} className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h4 className="font-medium text-foreground">{task.name}</h4>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.textColor}`}>
                                  {config.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {task.department}
                                {task.deadline && ` - Due: ${new Date(task.deadline).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {task.status === OnboardingTaskStatus.PENDING && (
                              <button
                                onClick={() => handleStartTask(task.name)}
                                disabled={updatingTask === task.name}
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                              >
                                {updatingTask === task.name ? 'Starting...' : 'Start'}
                              </button>
                            )}
                            {task.status === OnboardingTaskStatus.IN_PROGRESS && (
                              <button
                                onClick={() => handleCompleteTask(task.name)}
                                disabled={updatingTask === task.name}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {updatingTask === task.name ? 'Completing...' : 'Complete'}
                              </button>
                            )}
                            {task.status === OnboardingTaskStatus.COMPLETED && (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Uploaded Documents</h3>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{doc.type.toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completion Message */}
            {tracker.progress.isComplete && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Onboarding Complete!</h3>
                <p className="text-green-700 dark:text-green-400 mt-2">
                  Congratulations! You've completed all your onboarding tasks. Welcome to the team!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

