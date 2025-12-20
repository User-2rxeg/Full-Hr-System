// =====================================================
// Performance Management Interfaces
// =====================================================

import {
  AppraisalCycleStatus,
  AppraisalRecordStatus,
  AppraisalRatingScaleType,
  AppraisalType,
} from './enums';

// =====================================================
// Appraisal Template
// =====================================================

export interface AppraisalTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: AppraisalType;

  // Rating Scale
  ratingScaleType: AppraisalRatingScaleType;
  ratingScale: RatingScaleItem[];

  // Sections & Criteria
  sections: AppraisalSection[];

  // Weights
  totalWeight: number;

  // Applicable To
  departmentIds?: string[];
  positionIds?: string[];

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RatingScaleItem {
  value: number;
  label: string;
  description?: string;
  minScore?: number;
  maxScore?: number;
}

export interface AppraisalSection {
  id: string;
  name: string;
  description?: string;
  weight: number;
  order: number;
  criteria: AppraisalCriterion[];
}

export interface AppraisalCriterion {
  id: string;
  name: string;
  description?: string;
  weight: number;
  order: number;
}

export interface CreateAppraisalTemplateRequest {
  name: string;
  description?: string;
  templateType: AppraisalType;
  ratingScaleType: AppraisalRatingScaleType;
  ratingScale: RatingScaleItem[];
  sections: Omit<AppraisalSection, 'id'>[];
  departmentIds?: string[];
  positionIds?: string[];
}

// =====================================================
// Appraisal Cycle
// =====================================================

export interface AppraisalCycle {
  id: string;
  name: string;
  description?: string;
  cycleType: AppraisalType;

  // Timeline
  startDate: string;
  endDate: string;
  selfAssessmentDeadline?: string;
  managerReviewDeadline?: string;
  hrPublishDeadline?: string;
  disputeDeadline?: string;

  // Status
  status: AppraisalCycleStatus;

  // Template
  templateId: string;
  templateName?: string;

  // Applicable To
  departmentIds?: string[];

  // Statistics
  totalEmployees?: number;
  completedCount?: number;
  pendingCount?: number;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppraisalCycleRequest {
  name: string;
  description?: string;
  cycleType: AppraisalType;
  templateId: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline?: string;
  managerReviewDeadline?: string;
  hrPublishDeadline?: string;
  disputeDeadline?: string;
  departmentIds?: string[];
}

// =====================================================
// Appraisal Record
// =====================================================

export interface AppraisalRecord {
  id: string;
  employeeId: string;
  cycleId: string;
  templateId: string;
  reviewerId: string;

  // Status
  status: AppraisalRecordStatus;

  // Self Assessment
  selfAssessment?: AppraisalAssessment;
  selfAssessmentSubmittedAt?: string;

  // Manager Review
  managerAssessment?: AppraisalAssessment;
  managerSubmittedAt?: string;
  managerComments?: string;
  developmentPlan?: string;

  // Scores
  totalScore?: number;
  finalRating?: string;

  // HR Review & Publish
  hrReviewedBy?: string;
  hrReviewedAt?: string;
  hrPublishedAt?: string;

  // Dispute
  disputeReason?: string;
  disputeSubmittedAt?: string;
  disputeResolvedAt?: string;
  disputeResolution?: string;

  // Denormalized
  employeeName?: string;
  employeeNumber?: string;
  departmentName?: string;
  reviewerName?: string;
  cycleName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AppraisalAssessment {
  sections: AppraisalSectionAssessment[];
  overallComments?: string;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
}

export interface AppraisalSectionAssessment {
  sectionId: string;
  criteria: AppraisalCriterionAssessment[];
  sectionScore?: number;
  comments?: string;
}

export interface AppraisalCriterionAssessment {
  criterionId: string;
  rating: number;
  comments?: string;
}

export interface SubmitSelfAssessmentRequest {
  sections: AppraisalSectionAssessment[];
  overallComments?: string;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
}

export interface SubmitManagerReviewRequest {
  sections: AppraisalSectionAssessment[];
  overallComments?: string;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
}

export interface SubmitDisputeRequest {
  reason: string;
}

export interface ResolveDisputeRequest {
  resolution: string;
  adjustedScore?: number;
  adjustedRating?: string;
}

// =====================================================
// Goals & Objectives
// =====================================================

export interface Goal {
  id: string;
  employeeId: string;
  cycleId?: string;

  title: string;
  description?: string;
  category: GoalCategory;

  // Timeline
  startDate: string;
  targetDate: string;
  completedAt?: string;

  // Progress
  progress: number; // 0-100
  status: GoalStatus;

  // Metrics
  targetMetric?: string;
  currentMetric?: string;

  // Manager Assignment
  assignedBy?: string;
  assignedAt?: string;

  // Updates
  updates: GoalUpdate[];

  createdAt: string;
  updatedAt: string;
}

export type GoalCategory =
  | 'performance'
  | 'development'
  | 'project'
  | 'behavioral'
  | 'other';

export type GoalStatus =
  | 'draft'
  | 'pending_approval'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface GoalUpdate {
  id: string;
  progress: number;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: GoalCategory;
  startDate: string;
  targetDate: string;
  targetMetric?: string;
}

export interface UpdateGoalProgressRequest {
  progress: number;
  notes?: string;
  currentMetric?: string;
}

// =====================================================
// Performance Reports
// =====================================================

export interface PerformanceDistribution {
  cycleId: string;
  cycleName: string;

  distribution: {
    rating: string;
    count: number;
    percentage: number;
  }[];

  averageScore: number;
  totalEmployees: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;

  averageScore: number;
  completedAppraisals: number;
  pendingAppraisals: number;

  distribution: {
    rating: string;
    count: number;
  }[];
}

export interface EmployeePerformanceHistory {
  employeeId: string;
  employeeName: string;

  records: {
    cycleId: string;
    cycleName: string;
    cycleType: AppraisalType;
    score: number;
    rating: string;
    reviewDate: string;
  }[];

  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

