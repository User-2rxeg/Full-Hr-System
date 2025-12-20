// =====================================================
// Time Management Interfaces
// =====================================================

import {
  CorrectionRequestStatus,
  PunchType,
  HolidayType,
  ShiftAssignmentStatus,
  PunchPolicy,
  TimeExceptionType,
  TimeExceptionStatus,
} from './enums';

// =====================================================
// Shift Configuration
// =====================================================

export interface ShiftType {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: ShiftCategory;
  isActive: boolean;

  // Timing
  defaultStartTime: string; // HH:mm
  defaultEndTime: string;
  defaultBreakMinutes: number;

  // Flexibility
  flexibleStart: boolean;
  flexibleEnd: boolean;
  graceMinutes?: number;

  // Rules
  minimumHours: number;
  maximumHours: number;

  createdAt: string;
  updatedAt: string;
}

export type ShiftCategory =
  | 'normal'
  | 'split'
  | 'overnight'
  | 'rotational'
  | 'flexible';

export interface CreateShiftTypeRequest {
  code: string;
  name: string;
  description?: string;
  category: ShiftCategory;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultBreakMinutes?: number;
  flexibleStart?: boolean;
  flexibleEnd?: boolean;
  graceMinutes?: number;
  minimumHours?: number;
  maximumHours?: number;
}

// =====================================================
// Shift Assignment
// =====================================================

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  shiftTypeId: string;

  startDate: string;
  endDate?: string;
  status: ShiftAssignmentStatus;

  // Override timing
  customStartTime?: string;
  customEndTime?: string;
  customBreakMinutes?: number;

  // Weekly rest days (0=Sunday, 6=Saturday)
  restDays: number[];

  // Denormalized
  employeeName?: string;
  shiftTypeName?: string;

  assignedBy?: string;
  assignedAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftAssignmentRequest {
  employeeId: string;
  shiftTypeId: string;
  startDate: string;
  endDate?: string;
  customStartTime?: string;
  customEndTime?: string;
  restDays?: number[];
}

export interface BulkShiftAssignmentRequest {
  employeeIds: string[];
  shiftTypeId: string;
  startDate: string;
  endDate?: string;
  restDays?: number[];
}

// =====================================================
// Attendance Record
// =====================================================

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;

  // Punches
  punches: AttendancePunch[];
  firstPunchIn?: string;
  lastPunchOut?: string;

  // Calculated
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualWorkMinutes: number;
  scheduledWorkMinutes: number;
  overtimeMinutes: number;
  shortTimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;

  // Status
  status: AttendanceStatus;
  isWeekend: boolean;
  isHoliday: boolean;
  isOnLeave: boolean;
  leaveRequestId?: string;

  // Denormalized
  employeeName?: string;
  employeeNumber?: string;
  departmentName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AttendancePunch {
  id: string;
  type: PunchType;
  time: string;
  source: 'biometric' | 'web' | 'mobile' | 'manual';
  location?: {
    latitude: number;
    longitude: number;
  };
  isManualEntry: boolean;
  enteredBy?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'half_day'
  | 'on_leave'
  | 'holiday'
  | 'weekend';

export interface ClockInOutRequest {
  type: PunchType;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// =====================================================
// Attendance Correction
// =====================================================

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  attendanceRecordId: string;
  date: string;

  // Correction Details
  correctionType: CorrectionType;
  originalValue?: string;
  requestedValue: string;
  reason: string;

  // Status
  status: CorrectionRequestStatus;

  // Review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Denormalized
  employeeName?: string;

  createdAt: string;
  updatedAt: string;
}

export type CorrectionType =
  | 'add_punch_in'
  | 'add_punch_out'
  | 'modify_punch_in'
  | 'modify_punch_out'
  | 'delete_punch';

export interface CreateCorrectionRequest {
  attendanceRecordId: string;
  correctionType: CorrectionType;
  requestedValue: string;
  reason: string;
}

export interface ReviewCorrectionRequest {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

// =====================================================
// Time Exceptions
// =====================================================

export interface TimeException {
  id: string;
  employeeId: string;
  attendanceRecordId?: string;
  date: string;

  type: TimeExceptionType;
  status: TimeExceptionStatus;

  // Details
  minutes?: number;
  description?: string;

  // Review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Denormalized
  employeeName?: string;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Overtime Rules
// =====================================================

export interface OvertimeRule {
  id: string;
  name: string;
  description?: string;

  // Thresholds
  dailyThresholdMinutes: number;
  weeklyThresholdMinutes: number;

  // Rates
  normalRate: number; // multiplier, e.g., 1.5
  weekendRate: number;
  holidayRate: number;

  // Approval
  requiresApproval: boolean;
  autoApproveUpToMinutes?: number;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Lateness Rules
// =====================================================

export interface LatenessRule {
  id: string;
  name: string;
  description?: string;

  // Grace Period
  graceMinutes: number;

  // Penalties
  penalties: LatenessPenalty[];

  // Reset
  resetPeriod: 'daily' | 'weekly' | 'monthly';

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LatenessPenalty {
  fromMinutes: number;
  toMinutes: number;
  penaltyType: 'warning' | 'deduction' | 'half_day';
  deductionMinutes?: number;
}

// =====================================================
// Holiday Calendar
// =====================================================

export interface TimeHoliday {
  id: string;
  name: string;
  date: string;
  type: HolidayType;
  isRecurring: boolean;
  year?: number;
  description?: string;

  // Applicable To
  appliesToAll: boolean;
  departmentIds?: string[];

  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Time Reports
// =====================================================

export interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;

  periodStart: string;
  periodEnd: string;

  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  weekendDays: number;

  totalScheduledHours: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  totalShortTimeHours: number;
  totalLateMinutes: number;

  attendancePercentage: number;
  punctualityPercentage: number;
}

export interface DailyAttendanceReport {
  date: string;

  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;

  employees: {
    employeeId: string;
    employeeName: string;
    departmentName: string;
    status: AttendanceStatus;
    firstIn?: string;
    lastOut?: string;
    workedHours?: number;
  }[];
}

export interface OvertimeReport {
  periodStart: string;
  periodEnd: string;

  totalOvertimeHours: number;
  totalOvertimeCost: number;

  byEmployee: {
    employeeId: string;
    employeeName: string;
    departmentName: string;
    normalOvertimeHours: number;
    weekendOvertimeHours: number;
    holidayOvertimeHours: number;
    totalOvertimeHours: number;
    estimatedCost: number;
  }[];

  byDepartment: {
    departmentId: string;
    departmentName: string;
    totalOvertimeHours: number;
    estimatedCost: number;
  }[];
}

