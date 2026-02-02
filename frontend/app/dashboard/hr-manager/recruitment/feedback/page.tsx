'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getInterviewsByPanelist,
  submitInterviewFeedback,
  getFeedbackByInterview,
} from '@/app/services/recruitment';
import { Interview } from '@/types/recruitment';
import { InterviewStatus, ApplicationStage } from '@/types/enums';

// REC-011: Provide feedback/interview score for filtration
// REC-020: Structured assessment and scoring forms per role
// Panel members submit feedback with scores (1-10)

export default function FeedbackPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Feedback form state
  const [score, setScore] = useState<number>(5);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchInterviews();
    }
  }, [user]);

  useEffect(() => {
    if (selectedInterview) {
      fetchFeedback(selectedInterview.id);
    }
  }, [selectedInterview]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError('User ID not found');
        return;
      }

      const data = await getInterviewsByPanelist(user.id);
      // Filter completed or scheduled interviews that need feedback
      const completedInterviews = data.filter(
        (interview) =>
          interview.status === InterviewStatus.COMPLETED ||
          interview.status === InterviewStatus.SCHEDULED
      );
      setInterviews(completedInterviews);
    } catch (err: any) {
      setError(err.message || 'Failed to load interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async (interviewId: string) => {
    try {
      const feedback = await getFeedbackByInterview(interviewId);
      setExistingFeedback(feedback);
    } catch (err: any) {
      console.error('Error fetching feedback:', err);
      setExistingFeedback([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInterview || !user?.id) {
      alert('Interview or user information missing');
      return;
    }

    // Check if user already submitted feedback
    const alreadySubmitted = existingFeedback.some(
      (fb: any) => fb.interviewerId === user.id
    );

    if (alreadySubmitted) {
      alert('You have already submitted feedback for this interview');
      return;
    }

    try {
      setSubmitting(true);
      await submitInterviewFeedback({
        interviewId: selectedInterview.id,
        interviewerId: user.id,
        score,
        comments: comments || undefined,
      });

      alert('Feedback submitted successfully!');
      setScore(5);
      setComments('');
      setSelectedInterview(null);
      await fetchInterviews();
    } catch (err: any) {
      alert(`Failed to submit feedback: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStageLabel = (stage: ApplicationStage): string => {
    const labels: Record<ApplicationStage, string> = {
      [ApplicationStage.SCREENING]: 'Screening',
      [ApplicationStage.DEPARTMENT_INTERVIEW]: 'Department Interview',
      [ApplicationStage.HR_INTERVIEW]: 'HR Interview',
      [ApplicationStage.OFFER]: 'Offer',
    };
    return labels[stage] || stage;
  };

  const hasSubmittedFeedback = (interviewId: string): boolean => {
    if (!selectedInterview || selectedInterview.id !== interviewId) return false;
    return existingFeedback.some((fb: any) => fb.interviewerId === user?.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading interviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive">{error}</p>
        <button onClick={fetchInterviews} className="mt-2 text-destructive underline hover:text-destructive">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Interview Feedback</h1>
        <p className="text-muted-foreground mt-1">Submit feedback for completed interviews</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interview List */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold mb-4">Your Completed Interviews</h2>
          {interviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed interviews requiring feedback
            </div>
          ) : (
            <div className="space-y-3">
              {interviews.map((interview) => {
                const needsFeedback = !hasSubmittedFeedback(interview.id);
                return (
                  <button
                    key={interview.id}
                    onClick={() => setSelectedInterview(interview)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedInterview?.id === interview.id
                      ? 'border-primary bg-primary/10'
                      : needsFeedback
                        ? 'border-border hover:border-primary/30 hover:bg-muted'
                        : 'border-border bg-muted opacity-75'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-foreground">
                        {getStageLabel(interview.stage)}
                      </div>
                      {needsFeedback && (
                        <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                          Pending
                        </span>
                      )}
                      {!needsFeedback && selectedInterview?.id === interview.id && (
                        <span className="px-2 py-1 text-xs bg-accent/10 text-accent-foreground rounded-full">
                          Submitted
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-foreground font-medium">
                      {interview.jobTitle || `Application #${interview.applicationId}`}
                    </div>
                    {interview.candidateName && (
                      <div className="text-sm text-muted-foreground">
                        {interview.candidateName}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {new Date(interview.scheduledDate).toLocaleDateString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold mb-4">Submit Feedback</h2>
          {!selectedInterview ? (
            <div className="text-center py-16 text-muted-foreground">
              Select an interview to provide feedback
            </div>
          ) : hasSubmittedFeedback(selectedInterview.id) ? (
            <div className="text-center py-16">
              <div className="text-accent-foreground mb-2">✓ Feedback Submitted</div>
              <div className="text-muted-foreground">You have already submitted feedback for this interview</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">
                  <strong>Candidate:</strong> {selectedInterview.candidateName || 'Unknown'}
                </div>
                <div className="mb-2 text-sm text-muted-foreground">
                  <strong>Position:</strong> {selectedInterview.jobTitle || 'Unknown'}
                </div>
                <div className="mb-2 text-sm text-muted-foreground">
                  <strong>Interview:</strong> {getStageLabel(selectedInterview.stage)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Date:</strong> {new Date(selectedInterview.scheduledDate).toLocaleString()}
                </div>
                {selectedInterview.panel?.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <strong>Panel:</strong> {selectedInterview.panel.length} member(s)
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Score * (1-10)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="w-12 text-center">
                    <span className="text-2xl font-bold text-primary">{score}</span>
                    <div className="text-xs text-muted-foreground">/ 10</div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={6}
                  placeholder="Provide detailed feedback about the candidate's performance, skills, and fit for the role..."
                  className="w-full border border-border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {existingFeedback.length > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                  <div className="text-sm font-medium text-foreground mb-1">
                    Other Panel Feedback
                  </div>
                  <div className="text-sm text-primary">
                    {existingFeedback.length} panel member(s) have submitted feedback
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
