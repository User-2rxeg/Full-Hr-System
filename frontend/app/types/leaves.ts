// =====================================================
// Leaves Management Interfaces (matches backend schemas)
// =====================================================

import {
  LeaveStatus,
  AccrualMethod,
  AdjustmentType,
} from './enums';

// =====================================================
// Leave Category (matches backend leave-category.schema.ts)
// =====================================================

export interface LeaveCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Leave Type (matches backend leave-type.schema.ts)
// =====================================================

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  paid: boolean;
  deductible: boolean;
  requiresAttachment: boolean;
  attachmentType?: 'medical_certificate' | 'other';
  minTenureMonths?: number;
  maxDurationDays?: number;

  // Denormalized
  categoryName?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeaveTypeRequest {
  code: string;
  name: string;
  categoryId: string;
  description?: string;
  paid?: boolean;
  deductible?: boolean;
  requiresAttachment?: boolean;
  attachmentType?: 'medical_certificate' | 'other';
  minTenureMonths?: number;
  maxDurationDays?: number;
}

// =====================================================
// Leave Entitlement (matches backend leave-entitlement.schema.ts)
// =====================================================

export interface LeaveEntitlement {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  yearlyEntitlement: number;
  accruedActual: number;
  accruedRounded: number;
  carryForward: number;
  taken: number;
  pending: number;
  remaining: number;
  lastAccrualDate?: string;
  nextResetDate?: string;

  // Denormalized
  leaveTypeName?: string;
  leaveTypeCode?: string;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Leave Request (matches backend leave-request.schema.ts)
// =====================================================

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  dates: {
    from: string;
    to: string;
  };
  durationDays: number;
  justification?: string;
  attachmentId?: string;
  approvalFlow: ApprovalFlowItem[];
  status: LeaveStatus;
  irregularPatternFlag: boolean;

  // Denormalized
  employeeName?: string;
  employeeNumber?: string;
  departmentName?: string;
  leaveTypeName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ApprovalFlowItem {
  role: string;
  status: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  dates: {
    from: string;
    to: string;
  };
  justification?: string;
  attachmentId?: string;
}

export interface ApproveLeaveRequest {
  status: 'approved' | 'rejected';
  comments?: string;
}

// =====================================================
// Leave Adjustment (matches backend leave-adjustment.schema.ts)
// =====================================================

export interface LeaveAdjustment {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  type: AdjustmentType;
  days: number;
  reason: string;
  effectiveDate: string;
  adjustedBy: string;
  createdAt: string;
}

export interface CreateLeaveAdjustmentRequest {
  employeeId: string;
  leaveTypeId: string;
  type: AdjustmentType;
  days: number;
  reason: string;
  effectiveDate: string;
}

// =====================================================
// Leave Policy (matches backend leave-policy.schema.ts)
// =====================================================

export interface LeavePolicy {
  id: string;
  name: string;
  description?: string;
  leaveTypeId: string;
  accrualMethod: AccrualMethod;
  accrualRate?: number;
  carryForwardLimit?: number;
  carryForwardExpiryMonths?: number;
  minServiceMonths?: number;
  applicableTo: 'all' | 'department' | 'position';
  departmentIds?: string[];
  positionIds?: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Attachment (matches backend attachment.schema.ts)
// =====================================================

export interface LeaveAttachment {
  id: string;
  leaveRequestId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
}

// =====================================================
// Calendar / Holiday (matches backend calendar.schema.ts)
// =====================================================

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company' | 'optional';
  year: number;
  description?: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayRequest {
  name: string;
  date: string;
  type: 'national' | 'company' | 'optional';
  year: number;
  description?: string;
  isRecurring?: boolean;
}

// =====================================================
// Leave Statistics
// =====================================================

export interface LeaveStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;

  byLeaveType: {
    leaveTypeId: string;
    leaveTypeName: string;
    count: number;
    totalDays: number;
  }[];

  byDepartment: {
    departmentId: string;
    departmentName: string;
    count: number;
    totalDays: number;
  }[];

  absentToday: number;
  onLeaveThisWeek: number;
}

export interface TeamLeaveCalendar {
  date: string;
  employees: {
    employeeId: string;
    employeeName: string;
    leaveType: string;
    status: LeaveStatus;
  }[];
}

export interface LeaveBalanceSummary {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  entitled: number;
  accrued: number;
  taken: number;
  pending: number;
  remaining: number;
  carryForward: number;
}
