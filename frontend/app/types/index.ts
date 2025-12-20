// =====================================================
// HR System Types - Main Export File
// =====================================================

// Re-export all enums
export * from './enums';

// Re-export all interfaces
export * from './auth';
export * from './employee';
export * from './organization';
// Namespace recruitment exports to avoid duplicate top-level names (e.g. AuditLog)
export * as recruitment from './recruitment';
export * from './onboarding';
export * from './leaves';
export * from './payroll';
export * from './time-management';
export * from './performance';
export * from './common';

// =====================================================
// Legacy exports for backward compatibility
// =====================================================

// User type (used in existing components)
export type { User } from './auth';

// Notification type (used in existing components)
export type { Notification } from './common';
