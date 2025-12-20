'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { performanceService } from '@/app/services/performance';

/**
 * Team Performance - Department Head / Line Manager
 * REQ-PP-13: View assigned appraisal forms
 * REQ-AE-03: Access and complete structured appraisal ratings for direct reports
 * REQ-AE-04: Add comments, examples and development recommendations
 * BR 7(a), 8, 14, 21, 26, 33(d), 41(d)
 */

interface Assignment {
  _id: string;
  cycleId: {
    _id: string;
    name: string;
    status: string;
  };
  templateId?: {
    _id: string;
    name: string;
    ratingScale: {
      type: string;
      min: number;
      max: number;
    };
    criteria: {
      key: string;
      title: string;
      details?: string;
      weight?: number;
    }[];
  };
  employeeProfileId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    jobTitle?: string;
    primaryDepartmentId?: {
      name: string;
    };
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'PUBLISHED';
  dueDate?: string;
  createdAt: string;
}

interface AppraisalRecord {
  assignmentId: string;
  ratings: {
    criterionKey: string;
    score: number;
    comment?: string;
  }[];
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
}

export default function DepartmentHeadPerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  // Evaluation form state
  const [formData, setFormData] = useState<AppraisalRecord>({
    assignmentId: '',
    ratings: [],
    overallRating: undefined,
    strengths: '',
    areasForImprovement: '',
    developmentPlan: '',
    managerComments: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
  }, [user?.id]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await performanceService.getAssignmentsForManager(user?.id || '');

      if (response.error) {
        setError(response.error);
        return;
      }

      const responseData = response.data;
      if (Array.isArray(responseData)) {
        setAssignments(responseData as Assignment[]);
      } else if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        setAssignments((responseData as { data: Assignment[] }).data);
      } else {
        setAssignments([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = (assignment: Assignment) => {
    setSelectedAssignment(assignment);

    // Initialize ratings for each criterion
    const initialRatings = assignment.templateId?.criteria?.map(criterion => ({
      criterionKey: criterion.key,
      score: 0,
      comment: '',
    })) || [];

    setFormData({
      assignmentId: assignment._id,
      ratings: initialRatings,
      overallRating: undefined,
      strengths: '',
      areasForImprovement: '',
      developmentPlan: '',
      managerComments: '',
    });

    setShowEvaluationForm(true);
  };

  const handleRatingChange = (criterionKey: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.criterionKey === criterionKey ? { ...r, score } : r
      ),
    }));
  };

  const handleCommentChange = (criterionKey: string, comment: string) => {
    setFormData(prev => ({
      ...prev,
      ratings: prev.ratings.map(r =>
        r.criterionKey === criterionKey ? { ...r, comment } : r
      ),
    }));
  };

  const calculateOverallRating = () => {
    const template = selectedAssignment?.templateId;
    if (!template?.criteria) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    formData.ratings.forEach(rating => {
      const criterion = template.criteria.find(c => c.key === rating.criterionKey);
      const weight = criterion?.weight || 1;
      totalWeightedScore += rating.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const overall = calculateOverallRating();

      const response = await performanceService.saveDraftRecord({
        assignmentId: formData.assignmentId,
        ratings: formData.ratings,
        overallRating: overall,
        strengths: formData.strengths || undefined,
        areasForImprovement: formData.areasForImprovement || undefined,
        developmentPlan: formData.developmentPlan || undefined,
        managerComments: formData.managerComments || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Draft saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    // Validate all ratings are filled
    const unratedCriteria = formData.ratings.filter(r => r.score === 0);
    if (unratedCriteria.length > 0) {
      setError('Please rate all criteria before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const overall = calculateOverallRating();

      const response = await performanceService.submitAppraisalRecord({
        assignmentId: formData.assignmentId,
        ratings: formData.ratings,
        overallRating: overall,
        strengths: formData.strengths || undefined,
        areasForImprovement: formData.areasForImprovement || undefined,
        developmentPlan: formData.developmentPlan || undefined,
        managerComments: formData.managerComments || undefined,
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setSuccess('Evaluation submitted successfully');
      setShowEvaluationForm(false);
      setSelectedAssignment(null);
      fetchAssignments();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'SUBMITTED': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PUBLISHED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const pendingCount = assignments.filter(a => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length;
  const completedCount = assignments.filter(a => a.status === 'SUBMITTED' || a.status === 'PUBLISHED').length;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Team Performance</h1>
          <p className="text-muted-foreground mt-1">
            Evaluate your direct reports' performance (REQ-AE-03, REQ-AE-04)
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-2xl font-bold text-foreground">{assignments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Appraisal Assignments</h3>
          </div>

          {assignments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="font-medium text-foreground mb-1">No Assignments</h4>
              <p className="text-sm text-muted-foreground">
                You don't have any appraisal assignments at this time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignments.map((assignment) => (
                <div key={assignment._id} className="p-5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-semibold text-foreground">
                          {assignment.employeeProfileId?.firstName} {assignment.employeeProfileId?.lastName}
                        </h4>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{assignment.employeeProfileId?.employeeNumber}</span>
                        <span>{assignment.employeeProfileId?.jobTitle || 'No Title'}</span>
                        <span>{assignment.employeeProfileId?.primaryDepartmentId?.name || 'No Department'}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Cycle: <span className="text-foreground">{assignment.cycleId?.name}</span>
                        </span>
                        {assignment.dueDate && (
                          <span className="text-muted-foreground">
                            Due: <span className="text-foreground">{new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {(assignment.status === 'PENDING' || assignment.status === 'IN_PROGRESS') ? (
                        <button
                          onClick={() => handleStartEvaluation(assignment)}
                          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          {assignment.status === 'IN_PROGRESS' ? 'Continue' : 'Start'} Evaluation
                        </button>
                      ) : (
                        <button className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors">
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Form Modal */}
        {showEvaluationForm && selectedAssignment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden my-4">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Performance Evaluation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAssignment.employeeProfileId?.firstName} {selectedAssignment.employeeProfileId?.lastName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEvaluationForm(false);
                    setSelectedAssignment(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(95vh-180px)]">
                {/* Employee Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Employee</p>
                      <p className="font-medium text-foreground">
                        {selectedAssignment.employeeProfileId?.firstName} {selectedAssignment.employeeProfileId?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ID</p>
                      <p className="font-medium text-foreground">{selectedAssignment.employeeProfileId?.employeeNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">{selectedAssignment.employeeProfileId?.primaryDepartmentId?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cycle</p>
                      <p className="font-medium text-foreground">{selectedAssignment.cycleId?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Rating Criteria */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4">Performance Criteria</h4>
                  <div className="space-y-4">
                    {selectedAssignment.templateId?.criteria?.map((criterion) => {
                      const rating = formData.ratings.find(r => r.criterionKey === criterion.key);
                      const maxScore = selectedAssignment.templateId?.ratingScale?.max || 5;

                      return (
                        <div key={criterion.key} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-foreground">{criterion.title}</h5>
                              {criterion.details && (
                                <p className="text-sm text-muted-foreground mt-1">{criterion.details}</p>
                              )}
                              {criterion.weight && (
                                <p className="text-xs text-muted-foreground mt-1">Weight: {criterion.weight}%</p>
                              )}
                            </div>
                          </div>

                          {/* Rating Selector */}
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground mb-2">Rating</p>
                            <div className="flex gap-2">
                              {Array.from({ length: maxScore }, (_, i) => i + 1).map((score) => (
                                <button
                                  key={score}
                                  onClick={() => handleRatingChange(criterion.key, score)}
                                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                                    rating?.score === score
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Comment */}
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Comment (Optional)</p>
                            <textarea
                              value={rating?.comment || ''}
                              onChange={(e) => handleCommentChange(criterion.key, e.target.value)}
                              placeholder="Add specific examples or feedback..."
                              rows={2}
                              className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm resize-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Feedback */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Development Feedback (REQ-AE-04)</h4>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Strengths</label>
                    <textarea
                      value={formData.strengths}
                      onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
                      placeholder="Highlight key strengths and achievements..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Areas for Improvement</label>
                    <textarea
                      value={formData.areasForImprovement}
                      onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
                      placeholder="Identify areas that need development..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Development Plan</label>
                    <textarea
                      value={formData.developmentPlan}
                      onChange={(e) => setFormData(prev => ({ ...prev, developmentPlan: e.target.value }))}
                      placeholder="Recommend training, goals, or next steps..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Additional Comments</label>
                    <textarea
                      value={formData.managerComments}
                      onChange={(e) => setFormData(prev => ({ ...prev, managerComments: e.target.value }))}
                      placeholder="Any other observations or feedback..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                    />
                  </div>
                </div>

                {/* Calculated Overall */}
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Calculated Overall Rating</span>
                    <span className="text-2xl font-bold text-primary">
                      {calculateOverallRating().toFixed(1)} / {selectedAssignment.templateId?.ratingScale?.max || 5}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-card">
                <button
                  onClick={() => {
                    setShowEvaluationForm(false);
                    setSelectedAssignment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-muted disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={handleSubmitEvaluation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

