// Job Templates (REC-003)
export * from './create-job-template.dto';

// Job Requisitions (REC-004, REC-023)
export * from './create-job-requisition.dto';

// Applications (REC-007, REC-008, REC-028)
export * from './create-application.dto';

// Referrals (REC-030)
export * from './create-referral.dto';

// Interviews (REC-010, REC-021)
export * from './schedule-interview.dto';

// Feedback & Assessment (REC-011, REC-020)
export * from './submit-feedback.dto';

// Offers (REC-014, REC-018)
export * from './create-offer.dto';

// Notifications (REC-017, REC-022)
export * from './notification.dto';

// Re-export all DTOs to ensure they're available
export {
    // Job Templates
    CreateJobTemplateDto,
    UpdateJobTemplateDto,
} from './create-job-template.dto';

export {
    // Job Requisitions
    CreateJobRequisitionDto,
    PublishJobRequisitionDto,
    UpdateJobRequisitionDto,
} from './create-job-requisition.dto';

export {
    // Applications
    CreateApplicationDto,
    UpdateApplicationStageDto,
    UpdateApplicationStatusDto,
    AssignHrDto,
} from './create-application.dto';

export {
    // Referrals
    CreateReferralDto,
} from './create-referral.dto';

export {
    // Interviews
    ScheduleInterviewDto,
    UpdateInterviewDto,
    CancelInterviewDto,
} from './schedule-interview.dto';

export {
    // Feedback
    SubmitFeedbackDto,
} from './submit-feedback.dto';

export {
    // Offers
    CreateOfferDto,
    ApproveOfferDto,
    CandidateOfferResponseDto,
    SendOfferDto,
} from './create-offer.dto';

export {
    // Notifications
    NotificationType,
    SendNotificationDto,
    SendRejectionDto,
    CreateEmailTemplateDto,
} from './notification.dto';
