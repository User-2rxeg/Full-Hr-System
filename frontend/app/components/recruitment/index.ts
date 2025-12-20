// =====================================================
// Recruitment Components - Index Export
// =====================================================

// Components
export { default as JobList, type JobDisplayItem, type UserRole, type ViewMode } from './JobList';
export { default as JobForm, type JobFormData } from './JobForm';
export { default as StageStepper, type HiringStage, DEFAULT_HIRING_STAGES } from './StageStepper';
export { default as FileUploader, type UploadedFile } from './FileUploader';
export { default as InterviewScheduler, type InterviewScheduleData, type InterviewMode, type PanelMember } from './InterviewScheduler';
export { default as OfferForm, type OfferFormData } from './OfferForm';

// Audit Timeline (BR-37, BR-26)
export { default as AuditTimeline } from './AuditTimeline';
export { default as AuditEvent, getEventIcon, getActorBadge } from './AuditEvent';

// Role Guard
export { 
  default as RecruitmentRoleGuard,
  type RecruitmentRole,
  getRecruitmentRole,
  HROnly,
  HRManagerOnly,
  RecruiterOnly,
  CandidateOnly,
  InternalOnly,
  useRecruitmentRole,
} from './RoleGuard';

// Analytics Components (BR-33)
export {
  KpiCard,
  OpenPositionsKpi,
  TotalApplicationsKpi,
  HiredKpi,
  TimeToHireKpi,
  PipelineChart,
  TimeToHireChart,
} from './analytics';

// Compliance Components - GDPR (UX Compliance)
export {
  GdprTooltip,
  GdprInfoIcon,
  GdprQuestionIcon,
  ConsentModal,
  DataUsageNotice,
  CompactDataNotice,
  InlineDataNotice,
  DataUsageCard,
  ApplicationDataNotice,
  ConsentCheckbox,
  SimpleConsentCheckbox,
  CompactConsentCheckbox,
} from './compliance';

