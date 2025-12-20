// =====================================================
// ENUMS - System Roles & Authentication
// =====================================================

export enum SystemRole {
  DEPARTMENT_EMPLOYEE = 'department employee',
  DEPARTMENT_HEAD = 'department head',
  HR_MANAGER = 'HR Manager',
  HR_EMPLOYEE = 'HR Employee',
  PAYROLL_SPECIALIST = 'Payroll Specialist',
  PAYROLL_MANAGER = 'Payroll Manager',
  SYSTEM_ADMIN = 'System Admin',
  LEGAL_POLICY_ADMIN = 'Legal & Policy Admin',
  RECRUITER = 'Recruiter',
  FINANCE_STAFF = 'Finance Staff',
  JOB_CANDIDATE = 'Job Candidate',
  HR_ADMIN = 'HR Admin',
}

// =====================================================
// ENUMS - Employee Profile
// =====================================================

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
  PROBATION = 'PROBATION',
  TERMINATED = 'TERMINATED',
}

export enum ContractType {
  FULL_TIME_CONTRACT = 'FULL_TIME_CONTRACT',
  PART_TIME_CONTRACT = 'PART_TIME_CONTRACT',
}

export enum WorkType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
}

export enum GraduationType {
  UNDERGRADE = 'UNDERGRADE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  PHD = 'PHD',
  OTHER = 'OTHER',
}

export enum ProfileChangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
}

// =====================================================
// ENUMS - Recruitment & Candidates
// =====================================================

export enum CandidateStatus {
  APPLIED = 'APPLIED',
  SCREENING = 'SCREENING',
  INTERVIEW = 'INTERVIEW',
  OFFER_SENT = 'OFFER_SENT',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationStatus {
  SUBMITTED = 'submitted',
  IN_PROCESS = 'in_process',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum ApplicationStage {
  SCREENING = 'screening',
  DEPARTMENT_INTERVIEW = 'department_interview',
  HR_INTERVIEW = 'hr_interview',
  OFFER = 'offer',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum InterviewMethod {
  ONSITE = 'onsite',
  VIDEO = 'video',
  PHONE = 'phone',
}

export enum OfferResponseStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum OfferFinalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// =====================================================
// ENUMS - Onboarding & Offboarding
// =====================================================

export enum OnboardingTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum TerminationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum TerminationInitiation {
  EMPLOYEE = 'employee',
  HR = 'hr',
  MANAGER = 'manager',
}

export enum DocumentType {
  RESUME = 'resume',
  COVER_LETTER = 'cover_letter',
  ID_DOCUMENT = 'id_document',
  DEGREE = 'degree',
  CERTIFICATE = 'certificate',
  REFERENCE = 'reference',
  CONTRACT = 'contract',
  OTHER = 'other',
}

// =====================================================
// ENUMS - Leaves
// =====================================================

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// Note: LeaveType is not an enum in the backend - it's a collection
// The LeaveType interface is defined in leaves.ts

export enum AccrualMethod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  NONE = 'none',
}

export enum AdjustmentType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum AttachmentType {
  MEDICAL_CERTIFICATE = 'medical_certificate',
  OTHER = 'other',
}

export enum RoundingRule {
  NONE = 'none',
  ROUND_UP = 'round_up',
  ROUND_DOWN = 'round_down',
  ROUND_NEAREST = 'round_nearest',
}

// =====================================================
// ENUMS - Payroll
// =====================================================

// Payroll Configuration Status
export enum ConfigStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Policy Types
export enum PolicyType {
  DEDUCTION = 'Deduction',
  ALLOWANCE = 'Allowance',
  BENEFIT = 'Benefit',
  MISCONDUCT = 'Misconduct',
  LEAVE = 'Leave',
}

// Applicability
export enum Applicability {
  ALL_EMPLOYEES = 'All Employees',
  FULL_TIME = 'Full Time Employees',
  PART_TIME = 'Part Time Employees',
  CONTRACTORS = 'Contractors',
}

// Payroll Execution Status
export enum PayrollStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under review',
  PENDING_FINANCE_APPROVAL = 'pending finance approval',
  REJECTED = 'rejected',
  APPROVED = 'approved',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
}

export enum PayrollPaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
}

export enum PayslipPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

export enum BankStatus {
  VALID = 'valid',
  MISSING = 'missing',
}

export enum BonusStatus {
  PENDING = 'pending',
  PAID = 'paid',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum BenefitStatus {
  PENDING = 'pending',
  PAID = 'paid',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Payroll Tracking Status
export enum ClaimStatus {
  UNDER_REVIEW = 'under review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DisputeStatus {
  UNDER_REVIEW = 'under review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RefundStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

// =====================================================
// ENUMS - Time Management
// =====================================================

export enum CorrectionRequestStatus {
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export enum PunchType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum HolidayType {
  NATIONAL = 'NATIONAL',
  ORGANIZATIONAL = 'ORGANIZATIONAL',
  WEEKLY_REST = 'WEEKLY_REST',
}

export enum ShiftAssignmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum PunchPolicy {
  MULTIPLE = 'MULTIPLE',
  FIRST_LAST = 'FIRST_LAST',
  ONLY_FIRST = 'ONLY_FIRST',
}

export enum TimeExceptionType {
  MISSED_PUNCH = 'MISSED_PUNCH',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  SHORT_TIME = 'SHORT_TIME',
  OVERTIME_REQUEST = 'OVERTIME_REQUEST',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export enum TimeExceptionStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
}

// =====================================================
// ENUMS - Performance
// =====================================================

export enum AppraisalCycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum AppraisalRecordStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  HR_PUBLISHED = 'hr_published',
  DISPUTED = 'disputed',
  ARCHIVED = 'archived',
}

export enum AppraisalRatingScaleType {
  NUMERIC = 'numeric',
  LETTER = 'letter',
  DESCRIPTIVE = 'descriptive',
}

export enum AppraisalType {
  ANNUAL = 'annual',
  PROBATION = 'probation',
  MID_YEAR = 'mid_year',
  PROJECT = 'project',
}

