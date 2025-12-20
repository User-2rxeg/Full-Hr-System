// filepath: d:\WebstormProjects\HR System\Main\frontend\app\services\index.ts
export { default as api } from './api';
export { authService } from './auth';
export { employeeProfileService } from './employee-profile';
export { leavesService } from './leaves';
export { organizationStructureService } from './organization-structure';
export { timeManagementService } from './time-management';
export { payrollConfigurationService } from './payroll-configuration';
export { payrollExecutionService } from './payroll-execution';
export { payrollTrackingService } from './payroll-tracking';
export { performanceService } from './performance';
export { onboardingService } from './onboarding';
export { offboardingService } from './offboarding';

export type { LoginRequest, LoginResponse, RegisterCandidateRequest, RegisterCandidateResponse, LogoutResponse } from './auth';

