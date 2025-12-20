'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { ApplicationStage, InterviewMethod, InterviewStatus } from '@/app/types/enums';
import { getInterviewById, submitInterviewFeedback, getApplicationById } from '@/app/services/recruitment';
import { SubmitFeedbackRequest } from '@/app/types/recruitment';

// =====================================================
// Types
// =====================================================

interface InterviewDetail {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  departmentName: string;
  stage: ApplicationStage;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  method: InterviewMethod;
  videoLink?: string;
  location?: string;
  panelMembers: {
    id: string;
    name: string;
    role: string;
  }[];
  status: InterviewStatus;
}

interface AssessmentCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
}

interface CriterionScore {
  criterionId: string;
  score: number;
  comments: string;
}

interface AssessmentSubmission {
  scores: CriterionScore[];
  overallScore: number;
  recommendation: 'hire' | 'no_hire' | 'maybe';
  generalComments: string;
}

// =====================================================
// Static Assessment Criteria
// =====================================================

const assessmentCriteria: AssessmentCriterion[] = [
  {
    id: 'crit-1',
    name: 'Technical Skills',
    description: 'Evaluate the candidate\'s technical knowledge and expertise relevant to the role.',
    maxScore: 10,
  },
  {
    id: 'crit-2',
    name: 'Problem Solving',
    description: 'Assess the candidate\'s ability to analyze problems and develop effective solutions.',
    maxScore: 10,
  },
  {
    id: 'crit-3',
    name: 'Communication',
    description: 'Evaluate verbal and written communication skills, clarity of expression.',
    maxScore: 10,
  },
  {
    id: 'crit-4',
    name: 'Leadership & Teamwork',
    description: 'Assess ability to lead, collaborate, and work effectively with others.',
    maxScore: 10,
  },
  {
    id: 'crit-5',
    name: 'Cultural Fit',
    description: 'Evaluate alignment with company values, work style, and team dynamics.',
    maxScore: 10,
  },
  {
    id: 'crit-6',
    name: 'Domain Knowledge',
    description: 'Assess industry-specific knowledge and understanding of the business domain.',
    maxScore: 10,
  },
];

// =====================================================
// Components
// =====================================================

function InterviewMethodBadge({ method }: { method: InterviewMethod }) {
  const config = {
    [InterviewMethod.ONSITE]: { label: 'Onsite', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    [InterviewMethod.VIDEO]: { label: 'Video Call', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    [InterviewMethod.PHONE]: { label: 'Phone', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  // Handle case sensitivity or missing config
  const methodKey = Object.keys(config).find(k => k.toLowerCase() === method?.toLowerCase()) as InterviewMethod | undefined;
  const safeConfig = methodKey ? config[methodKey] : undefined;

  if (!safeConfig) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {method || 'Unknown'}
      </span>
    );
  }

  const { label, color } = safeConfig;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

function ScoreSlider({
  criterion,
  value,
  onChange,
  comments,
  onCommentsChange,
  error,
}: {
  criterion: AssessmentCriterion;
  value: number;
  onChange: (score: number) => void;
  comments: string;
  onCommentsChange: (comments: string) => void;
  error?: string;
}) {
  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) return 'text-emerald-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-slate-900">{criterion.name}</h4>
          <p className="text-sm text-slate-500">{criterion.description}</p>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(value, criterion.maxScore)}`}>
          {value}/{criterion.maxScore}
        </div>
      </div>

      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={criterion.maxScore}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
          <span>{criterion.maxScore / 2}</span>
          <span>{criterion.maxScore}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Comments for {criterion.name}
        </label>
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          rows={2}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'
            }`}
          placeholder={`Provide specific feedback on ${criterion.name.toLowerCase()}...`}
        />
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
    </div>
  );
}

// =====================================================
// Main Component
// =====================================================

export default function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [interview, setInterview] = useState<InterviewDetail | null>(null);
  const [criteria, setCriteria] = useState<AssessmentCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [assessment, setAssessment] = useState<AssessmentSubmission>({
    scores: [],
    overallScore: 0,
    recommendation: 'maybe',
    generalComments: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load interview data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const interviewData = await getInterviewById(resolvedParams.id);

      // Get application data for denormalized fields
      let candidateName = 'Unknown';
      let candidateEmail = '';
      let jobTitle = '';
      let departmentName = '';

      try {
        const appData = await getApplicationById(interviewData.applicationId);
        candidateName = appData.candidateName || 'Unknown';
        candidateEmail = appData.candidateEmail || '';
        jobTitle = appData.jobTitle || '';
        departmentName = appData.departmentName || '';
      } catch (appErr) {
        // If we can't get application data, use defaults
        console.warn('Could not load application data for interview');
      }

      // Transform API response to local interface
      const interviewDetail: InterviewDetail = {
        id: interviewData.id,
        applicationId: interviewData.applicationId || '',
        candidateName,
        candidateEmail,
        jobTitle,
        departmentName,
        stage: interviewData.stage || ApplicationStage.SCREENING,
        scheduledDate: interviewData.scheduledDate || '',
        startTime: '',
        endTime: '',
        method: interviewData.method || InterviewMethod.VIDEO,
        videoLink: interviewData.videoLink,
        location: undefined,
        panelMembers: interviewData.panelMembers ? interviewData.panelMembers.map(pm => ({
          id: pm.employeeId,
          name: pm.employeeName,
          role: 'Panelist'
        })) : [],
        status: interviewData.status || InterviewStatus.SCHEDULED,
      };

      setInterview(interviewDetail);
      setCriteria(assessmentCriteria);

      // Initialize scores
      setAssessment((prev) => ({
        ...prev,
        scores: assessmentCriteria.map((c) => ({
          criterionId: c.id,
          score: 0,
          comments: '',
        })),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interview details');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update criterion score
  const updateCriterionScore = (criterionId: string, score: number) => {
    setAssessment((prev) => {
      const newScores = prev.scores.map((s) =>
        s.criterionId === criterionId ? { ...s, score } : s
      );

      // Calculate overall score
      const totalMax = criteria.reduce((sum, c) => sum + c.maxScore, 0);
      const totalScore = newScores.reduce((sum, s) => sum + s.score, 0);
      const overallPercentage = Math.round((totalScore / totalMax) * 100);

      return {
        ...prev,
        scores: newScores,
        overallScore: overallPercentage,
      };
    });
  };

  // Update criterion comments
  const updateCriterionComments = (criterionId: string, comments: string) => {
    setAssessment((prev) => ({
      ...prev,
      scores: prev.scores.map((s) =>
        s.criterionId === criterionId ? { ...s, comments } : s
      ),
    }));
  };

  // Validate form (BR-21, BR-23)
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check if all criteria have scores
    assessment.scores.forEach((score) => {
      if (score.score === 0) {
        const criterion = criteria.find((c) => c.id === score.criterionId);
        newErrors[`score_${score.criterionId}`] = `Please provide a score for ${criterion?.name}`;
      }
    });

    // Check for general comments
    if (!assessment.generalComments.trim()) {
      newErrors.generalComments = 'Please provide general comments about the candidate';
    } else if (assessment.generalComments.trim().length < 50) {
      newErrors.generalComments = 'General comments must be at least 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit feedback (BR-21, BR-23)
  const handleSubmit = async () => {
    if (!validateForm() || !interview) return;

    try {
      setSubmitting(true);
      setError(null);

      // Submit simple feedback with score and comments
      const feedbackData: SubmitFeedbackRequest = {
        interviewId: interview.id,
        interviewerId: 'current-user', // Should be the actual interviewer ID from auth context
        score: assessment.overallScore,
        comments: assessment.generalComments,
      };

      await submitInterviewFeedback(feedbackData);

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // Get recommendation label
  const getRecommendationLabel = (rec: AssessmentSubmission['recommendation']) => {
    switch (rec) {
      case 'hire':
        return { label: 'Recommend to Hire', color: 'text-emerald-600' };
      case 'no_hire':
        return { label: 'Do Not Recommend', color: 'text-red-600' };
      case 'maybe':
        return { label: 'Need More Information', color: 'text-amber-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Interview not found.</p>
        <Link href="/dashboard/hr-employee/recruitment/interviews">
          <Button variant="default" className="mt-4">
            Back to Interviews
          </Button>
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Feedback Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Your interview feedback for {interview.candidateName} has been recorded successfully.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6 inline-block">
            <p className="text-sm text-slate-500">Overall Score</p>
            <p className={`text-3xl font-bold ${assessment.overallScore >= 70 ? 'text-emerald-600' : assessment.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {assessment.overallScore}%
            </p>
            <p className={`text-sm font-medium ${getRecommendationLabel(assessment.recommendation).color}`}>
              {getRecommendationLabel(assessment.recommendation).label}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard/hr-employee/recruitment/interviews">
              <Button variant="outline">Back to Interviews</Button>
            </Link>
            <Link href={`/dashboard/hr-employee/recruitment/applications/${interview.applicationId}`}>
              <Button variant="default">View Application</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/hr-employee/recruitment/interviews"
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Interviews
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Interview Feedback</h1>
        <p className="text-slate-600 mt-1">
          Submit your assessment for {interview.candidateName}
        </p>
      </div>

      {/* Interview Info Card */}
      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-xl">
                {interview.candidateName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{interview.candidateName}</h2>
              <p className="text-slate-600">{interview.jobTitle} • {interview.departmentName}</p>
              <p className="text-sm text-slate-500">{interview.candidateEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <InterviewMethodBadge method={interview.method} />
            <p className="text-sm text-slate-600 mt-2">
              {new Date(interview.scheduledDate).toLocaleDateString()} • {interview.startTime} - {interview.endTime}
            </p>
            {interview.location && (
              <p className="text-sm text-slate-500">{interview.location}</p>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>Panel Members:</strong>{' '}
            {interview.panelMembers.map((m) => `${m.name} (${m.role})`).join(', ')}
          </p>
        </div>
      </Card>

      {/* Assessment Form (BR-21, BR-23) */}
      <Card className="mb-6">
        <p className="text-sm text-slate-600 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <strong>Note:</strong> Use the pre-set criteria to ensure consistent and fair evaluation.
          All scores and comments are required for submission.
        </p>

        <div className="space-y-4">
          {criteria.map((criterion) => {
            const scoreData = assessment.scores.find((s) => s.criterionId === criterion.id);
            return (
              <ScoreSlider
                key={criterion.id}
                criterion={criterion}
                value={scoreData?.score || 0}
                onChange={(score) => updateCriterionScore(criterion.id, score)}
                comments={scoreData?.comments || ''}
                onCommentsChange={(comments) => updateCriterionComments(criterion.id, comments)}
                error={errors[`score_${criterion.id}`]}
              />
            );
          })}
        </div>
      </Card>

      {/* Overall Assessment */}
      <Card className="mb-6">
        {/* Overall Score Display */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-slate-600 mb-1">Calculated Overall Score</p>
          <p className={`text-4xl font-bold ${assessment.overallScore >= 70 ? 'text-emerald-600' :
              assessment.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
            {assessment.overallScore}%
          </p>
        </div>

        {/* Recommendation */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Recommendation <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'hire', label: 'Recommend to Hire', icon: '👍', color: 'border-emerald-500 bg-emerald-50' },
              { value: 'maybe', label: 'Need More Info', icon: '🤔', color: 'border-amber-500 bg-amber-50' },
              { value: 'no_hire', label: 'Do Not Recommend', icon: '👎', color: 'border-red-500 bg-red-50' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setAssessment({ ...assessment, recommendation: option.value as AssessmentSubmission['recommendation'] })}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${assessment.recommendation === option.value
                    ? option.color
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <span className="text-2xl mb-1 block">{option.icon}</span>
                <span className="text-sm font-medium text-slate-700">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* General Comments */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            General Comments <span className="text-red-500">*</span>
          </label>
          <textarea
            value={assessment.generalComments}
            onChange={(e) => setAssessment({ ...assessment, generalComments: e.target.value })}
            rows={5}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errors.generalComments ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'
              }`}
            placeholder="Provide an overall assessment of the candidate, including strengths, areas for improvement, and any additional observations from the interview..."
          />
          {errors.generalComments && (
            <p className="text-red-600 text-sm mt-1">{errors.generalComments}</p>
          )}
          <p className="text-slate-500 text-sm mt-1">
            {assessment.generalComments.length}/50 characters minimum
          </p>
        </div>
      </Card>

      {/* Submit Actions */}
      <div className="flex justify-between items-center">
        <Link href="/dashboard/hr-employee/recruitment/interviews">
          <Button variant="outline">Cancel</Button>
        </Link>
        <div className="flex gap-3">
          <Button variant="secondary">Save Draft</Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={submitting}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
