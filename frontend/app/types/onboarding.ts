// =====================================================
// Onboarding & Offboarding Interfaces (matches backend schemas)
// =====================================================

import {
  OnboardingTaskStatus,
  TerminationStatus,
  TerminationInitiation,
} from './enums';

// =====================================================
// Onboarding (matches backend onboarding.schema.ts)
// =====================================================

export interface Onboarding {
  id: string;
  employeeId: string;
  contractId: string;
  tasks: OnboardingTask[];
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTask {
  name: string;
  department: string;
  status: OnboardingTaskStatus;
  deadline?: string;
  completedAt?: string;
  documentId?: string;
  notes?: string;
}

export interface CreateOnboardingRequest {
  employeeId: string;
  contractId: string;
  tasks: Omit<OnboardingTask, 'status' | 'completedAt'>[];
}

export interface UpdateOnboardingTaskRequest {
  taskIndex: number;
  status?: OnboardingTaskStatus;
  notes?: string;
  documentId?: string;
}

// =====================================================
// Termination Request (matches backend termination-request.schema.ts)
// =====================================================

export interface TerminationRequest {
  id: string;
  employeeId: string;
  contractId: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  hrComments?: string;
  status: TerminationStatus;
  terminationDate?: string;

  // Denormalized
  employeeName?: string;
  employeeNumber?: string;
  positionTitle?: string;
  departmentName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateTerminationRequest {
  employeeId: string;
  contractId: string;
  initiator: TerminationInitiation;
  reason: string;
  employeeComments?: string;
  terminationDate?: string;
}

export interface ReviewTerminationRequest {
  status: 'approved' | 'rejected';
  hrComments?: string;
  terminationDate?: string;
}

// =====================================================
// Clearance Checklist (matches backend clearance-checklist.schema.ts)
// =====================================================

export interface ClearanceChecklist {
  id: string;
  terminationId: string;
  employeeId: string;
  items: ClearanceItem[];
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClearanceItem {
  department: string;
  description: string;
  status: 'pending' | 'cleared' | 'issues';
  clearedBy?: string;
  clearedAt?: string;
  notes?: string;
}

export interface UpdateClearanceItemRequest {
  itemIndex: number;
  status: 'cleared' | 'issues';
  notes?: string;
}

// =====================================================
// Onboarding Statistics
// =====================================================

export interface OnboardingStats {
  activeOnboarding: number;
  completedThisMonth: number;
  upcoming: number;
  averageCompletionDays: number;

  byDepartment: {
    departmentId: string;
    departmentName: string;
    count: number;
  }[];
}

// =====================================================
// Offboarding Statistics
// =====================================================

export interface OffboardingStats {
  activeOffboarding: number;
  completedThisMonth: number;
  pendingClearance: number;
  averageProcessDays: number;

  byReason: {
    reason: string;
    count: number;
    percentage: number;
  }[];
}
