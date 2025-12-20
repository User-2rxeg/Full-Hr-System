/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║        RECRUITMENT MODULE - COMPREHENSIVE ROUTE TESTING SCRIPT                ║
 * ║                         Tests all 50 API Endpoints                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Usage:
 *   npx ts-node scripts/test-recruitment-routes.ts
 *   npx ts-node scripts/test-recruitment-routes.ts --interactive
 *   npx ts-node scripts/test-recruitment-routes.ts --env=production
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import * as readline from 'readline';

// ============================================================
// CONFIGURATION
// ============================================================

interface Config {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  verbose: boolean;
}

const config: Config = {
  baseUrl: process.env.API_URL || 'http://localhost:9000',
  timeout: 30000,
  retryAttempts: 2,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
};

// ============================================================
// TEST DATA STORAGE
// ============================================================

interface TestData {
  // IDs collected from database or user input
  jobTemplateId: string;
  jobRequisitionId: string;
  applicationId: string;
  candidateId: string;
  interviewId: string;
  offerId: string;
  feedbackId: string;
  referralId: string;
  panelistId: string;
  hrEmployeeId: string;
  
  // Sample payloads for POST/PUT requests
  sampleJobTemplate: any;
  sampleJobRequisition: any;
  sampleApplication: any;
  sampleInterview: any;
  sampleFeedback: any;
  sampleOffer: any;
  sampleReferral: any;
}

let testData: TestData = {
  jobTemplateId: '',
  jobRequisitionId: '',
  applicationId: '',
  candidateId: '',
  interviewId: '',
  offerId: '',
  feedbackId: '',
  referralId: '',
  panelistId: '',
  hrEmployeeId: '',
  
  sampleJobTemplate: {
    title: 'Test Software Engineer',
    department: 'Engineering',
    location: 'Remote',
    description: 'Test job template description',
    requirements: ['Node.js', 'TypeScript', 'NestJS'],
    responsibilities: ['Develop features', 'Write tests', 'Review code'],
    employmentType: 'full-time',
    experienceLevel: 'mid',
  },
  
  sampleJobRequisition: {
    title: 'Test Developer Position',
    departmentId: '',
    templateId: '',
    numberOfOpenings: 2,
    location: 'Remote',
    description: 'Test requisition',
    requirements: ['3+ years experience'],
    salaryRange: { min: 50000, max: 80000, currency: 'USD' },
  },
  
  sampleApplication: {
    candidateId: '',
    requisitionId: '',
    cvFilePath: '/uploads/test-cv.pdf',
    coverLetter: 'Test cover letter content',
    dataProcessingConsent: true,
    backgroundCheckConsent: true,
  },
  
  sampleInterview: {
    applicationId: '',
    stage: 'department_interview',
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    method: 'video',
    panel: [],
    videoLink: 'https://meet.google.com/test-link',
  },
  
  sampleFeedback: {
    interviewId: '',
    interviewerId: '',
    score: 8,
    comments: 'Test feedback comments - candidate performed well',
  },
  
  sampleOffer: {
    applicationId: '',
    salary: 75000,
    currency: 'USD',
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Health insurance', '401k', 'Remote work'],
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  
  sampleReferral: {
    candidateId: '',
    referrerId: '',
    relationship: 'Former colleague',
    notes: 'Highly recommended for the position',
  },
};

// ============================================================
// TYPES
// ============================================================

interface TestResult {
  route: string;
  method: string;
  status: 'success' | 'failed' | 'skipped';
  statusCode?: number;
  expectedCode: number | number[];
  responseTime: number;
  error?: string;
  missingData?: string[];
  response?: any;
}

interface RouteTest {
  id: number;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requiresAuth: boolean;
  requiredData: string[];
  expectedStatus: number | number[];
  payload?: () => any;
  queryParams?: () => Record<string, string>;
  description: string;
  category: string;
}

// ============================================================
// ROUTE DEFINITIONS (50 ROUTES)
// ============================================================

const routes: RouteTest[] = [
  // ═══════════════════════════════════════════════════════════
  // REC-003: JOB TEMPLATES (5 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 1,
    name: 'Create Job Template',
    method: 'POST',
    path: '/recruitment/job-templates',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 201,
    payload: () => testData.sampleJobTemplate,
    description: 'REC-003: Create a standardized job description template',
    category: 'Job Templates',
  },
  {
    id: 2,
    name: 'Get All Job Templates',
    method: 'GET',
    path: '/recruitment/job-templates',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-003: Get all job templates',
    category: 'Job Templates',
  },
  {
    id: 3,
    name: 'Get Job Template by ID',
    method: 'GET',
    path: '/recruitment/job-templates/:jobTemplateId',
    requiresAuth: true,
    requiredData: ['jobTemplateId'],
    expectedStatus: [200, 404],
    description: 'REC-003: Get job template by ID',
    category: 'Job Templates',
  },
  {
    id: 4,
    name: 'Update Job Template',
    method: 'PUT',
    path: '/recruitment/job-templates/:jobTemplateId',
    requiresAuth: true,
    requiredData: ['jobTemplateId'],
    expectedStatus: [200, 404],
    payload: () => ({ ...testData.sampleJobTemplate, title: 'Updated Template Title' }),
    description: 'REC-003: Update job template',
    category: 'Job Templates',
  },
  {
    id: 5,
    name: 'Delete Job Template',
    method: 'DELETE',
    path: '/recruitment/job-templates/:jobTemplateId',
    requiresAuth: true,
    requiredData: ['jobTemplateId'],
    expectedStatus: [200, 204, 404],
    description: 'REC-003: Delete job template',
    category: 'Job Templates',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-004 & REC-023: JOB REQUISITIONS (8 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 6,
    name: 'Create Job Requisition',
    method: 'POST',
    path: '/recruitment/job-requisitions',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 201,
    payload: () => testData.sampleJobRequisition,
    description: 'REC-004: Create a new job requisition',
    category: 'Job Requisitions',
  },
  {
    id: 7,
    name: 'Get All Job Requisitions',
    method: 'GET',
    path: '/recruitment/job-requisitions',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    queryParams: () => ({ status: 'published' }),
    description: 'REC-004: Get all job requisitions',
    category: 'Job Requisitions',
  },
  {
    id: 8,
    name: 'Get Published Jobs (Public)',
    method: 'GET',
    path: '/recruitment/job-requisitions/published',
    requiresAuth: false,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-023: Get published jobs for careers page (Public)',
    category: 'Job Requisitions',
  },
  {
    id: 9,
    name: 'Get Job Requisition by ID',
    method: 'GET',
    path: '/recruitment/job-requisitions/:jobRequisitionId',
    requiresAuth: true,
    requiredData: ['jobRequisitionId'],
    expectedStatus: [200, 404],
    description: 'REC-004: Get job requisition by ID',
    category: 'Job Requisitions',
  },
  {
    id: 10,
    name: 'Get Requisition Progress',
    method: 'GET',
    path: '/recruitment/job-requisitions/:jobRequisitionId/progress',
    requiresAuth: true,
    requiredData: ['jobRequisitionId'],
    expectedStatus: [200, 404],
    description: 'REC-009: Get recruitment progress for a requisition',
    category: 'Job Requisitions',
  },
  {
    id: 11,
    name: 'Update Job Requisition',
    method: 'PUT',
    path: '/recruitment/job-requisitions/:jobRequisitionId',
    requiresAuth: true,
    requiredData: ['jobRequisitionId'],
    expectedStatus: [200, 404],
    payload: () => ({ ...testData.sampleJobRequisition, title: 'Updated Requisition' }),
    description: 'REC-004: Update job requisition',
    category: 'Job Requisitions',
  },
  {
    id: 12,
    name: 'Publish/Unpublish Job Requisition',
    method: 'PATCH',
    path: '/recruitment/job-requisitions/:jobRequisitionId/publish',
    requiresAuth: true,
    requiredData: ['jobRequisitionId'],
    expectedStatus: [200, 404],
    payload: () => ({ isPublished: true }),
    description: 'REC-023: Publish or unpublish job requisition',
    category: 'Job Requisitions',
  },
  {
    id: 13,
    name: 'Close Job Requisition',
    method: 'PATCH',
    path: '/recruitment/job-requisitions/:jobRequisitionId/close',
    requiresAuth: true,
    requiredData: ['jobRequisitionId'],
    expectedStatus: [200, 404],
    description: 'REC-004: Close a job requisition',
    category: 'Job Requisitions',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-007 & REC-028: APPLICATIONS (9 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 14,
    name: 'Create Application (Public)',
    method: 'POST',
    path: '/recruitment/applications',
    requiresAuth: false,
    requiredData: ['candidateId', 'jobRequisitionId'],
    expectedStatus: [201, 400, 409],
    payload: () => ({
      ...testData.sampleApplication,
      candidateId: testData.candidateId,
      requisitionId: testData.jobRequisitionId,
    }),
    description: 'REC-007 & REC-028: Submit a new job application with consent',
    category: 'Applications',
  },
  {
    id: 15,
    name: 'Get All Applications',
    method: 'GET',
    path: '/recruitment/applications',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    queryParams: () => ({ stage: 'screening' }),
    description: 'REC-008: Get all applications with filters',
    category: 'Applications',
  },
  {
    id: 16,
    name: 'Get Application by ID',
    method: 'GET',
    path: '/recruitment/applications/:applicationId',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-008: Get application by ID',
    category: 'Applications',
  },
  {
    id: 17,
    name: 'Get Application History',
    method: 'GET',
    path: '/recruitment/applications/:applicationId/history',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-017: Get application status history',
    category: 'Applications',
  },
  {
    id: 18,
    name: 'Get Applications by Candidate',
    method: 'GET',
    path: '/recruitment/candidates/:candidateId/applications',
    requiresAuth: true,
    requiredData: ['candidateId'],
    expectedStatus: [200, 404],
    description: 'REC-017: Get all applications by candidate',
    category: 'Applications',
  },
  {
    id: 19,
    name: 'Assign HR to Application',
    method: 'PATCH',
    path: '/recruitment/applications/:applicationId/assign-hr',
    requiresAuth: true,
    requiredData: ['applicationId', 'hrEmployeeId'],
    expectedStatus: [200, 404],
    payload: () => ({ hrId: testData.hrEmployeeId }),
    description: 'REC-008: Assign HR employee to application',
    category: 'Applications',
  },
  {
    id: 20,
    name: 'Update Application Stage',
    method: 'PATCH',
    path: '/recruitment/applications/:applicationId/stage',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    payload: () => ({ stage: 'department_interview', notes: 'Moving to interview stage' }),
    description: 'REC-008: Update application stage',
    category: 'Applications',
  },
  {
    id: 21,
    name: 'Update Application Status',
    method: 'PATCH',
    path: '/recruitment/applications/:applicationId/status',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    payload: () => ({ status: 'in_progress' }),
    description: 'REC-008: Update application status',
    category: 'Applications',
  },
  {
    id: 22,
    name: 'Reject Application',
    method: 'PATCH',
    path: '/recruitment/applications/:applicationId/reject',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    payload: () => ({ reason: 'Test rejection - does not meet requirements' }),
    description: 'REC-022: Reject application',
    category: 'Applications',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-009: DASHBOARD & ANALYTICS (1 route)
  // ═══════════════════════════════════════════════════════════
  {
    id: 23,
    name: 'Get Recruitment Dashboard',
    method: 'GET',
    path: '/recruitment/dashboard',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-009: Get recruitment dashboard data',
    category: 'Dashboard',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-030: REFERRALS (4 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 24,
    name: 'Create Referral',
    method: 'POST',
    path: '/recruitment/referrals',
    requiresAuth: true,
    requiredData: ['candidateId', 'hrEmployeeId'],
    expectedStatus: [201, 409],
    payload: () => ({
      ...testData.sampleReferral,
      candidateId: testData.candidateId,
      referrerId: testData.hrEmployeeId,
    }),
    description: 'REC-030: Create employee referral',
    category: 'Referrals',
  },
  {
    id: 25,
    name: 'Get All Referrals',
    method: 'GET',
    path: '/recruitment/referrals',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-030: Get all referrals',
    category: 'Referrals',
  },
  {
    id: 26,
    name: 'Get Referral by Candidate',
    method: 'GET',
    path: '/recruitment/referrals/candidate/:candidateId',
    requiresAuth: true,
    requiredData: ['candidateId'],
    expectedStatus: [200, 404],
    description: 'REC-030: Get referral by candidate ID',
    category: 'Referrals',
  },
  {
    id: 27,
    name: 'Check If Candidate is Referral',
    method: 'GET',
    path: '/recruitment/referrals/check/:candidateId',
    requiresAuth: true,
    requiredData: ['candidateId'],
    expectedStatus: 200,
    description: 'REC-030: Check if candidate is a referral',
    category: 'Referrals',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-010 & REC-021: INTERVIEWS (8 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 28,
    name: 'Schedule Interview',
    method: 'POST',
    path: '/recruitment/interviews',
    requiresAuth: true,
    requiredData: ['applicationId', 'panelistId'],
    expectedStatus: 201,
    payload: () => ({
      ...testData.sampleInterview,
      applicationId: testData.applicationId,
      panel: [testData.panelistId],
    }),
    description: 'REC-010: Schedule a new interview',
    category: 'Interviews',
  },
  {
    id: 29,
    name: 'Get Upcoming Interviews',
    method: 'GET',
    path: '/recruitment/interviews',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    queryParams: () => ({ days: '14' }),
    description: 'REC-010: Get upcoming interviews',
    category: 'Interviews',
  },
  {
    id: 30,
    name: 'Get Interview by ID',
    method: 'GET',
    path: '/recruitment/interviews/:interviewId',
    requiresAuth: true,
    requiredData: ['interviewId'],
    expectedStatus: [200, 404],
    description: 'REC-010: Get interview by ID',
    category: 'Interviews',
  },
  {
    id: 31,
    name: 'Get Interviews by Application',
    method: 'GET',
    path: '/recruitment/interviews/application/:applicationId',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-010: Get interviews for an application',
    category: 'Interviews',
  },
  {
    id: 32,
    name: 'Get Interviews by Panelist',
    method: 'GET',
    path: '/recruitment/interviews/panelist/:panelistId',
    requiresAuth: true,
    requiredData: ['panelistId'],
    expectedStatus: [200, 404],
    description: 'REC-021: Get interviews for a panelist',
    category: 'Interviews',
  },
  {
    id: 33,
    name: 'Update Interview',
    method: 'PUT',
    path: '/recruitment/interviews/:interviewId',
    requiresAuth: true,
    requiredData: ['interviewId'],
    expectedStatus: [200, 404],
    payload: () => ({
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Interview rescheduled',
    }),
    description: 'REC-010: Update interview details',
    category: 'Interviews',
  },
  {
    id: 34,
    name: 'Complete Interview',
    method: 'PATCH',
    path: '/recruitment/interviews/:interviewId/complete',
    requiresAuth: true,
    requiredData: ['interviewId'],
    expectedStatus: [200, 404],
    description: 'REC-010: Mark interview as completed',
    category: 'Interviews',
  },
  {
    id: 35,
    name: 'Cancel Interview',
    method: 'PATCH',
    path: '/recruitment/interviews/:interviewId/cancel',
    requiresAuth: true,
    requiredData: ['interviewId'],
    expectedStatus: [200, 404],
    payload: () => ({ reason: 'Test cancellation - scheduling conflict' }),
    description: 'REC-010: Cancel an interview',
    category: 'Interviews',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-011 & REC-020: FEEDBACK & ASSESSMENT (4 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 36,
    name: 'Submit Interview Feedback',
    method: 'POST',
    path: '/recruitment/feedback',
    requiresAuth: true,
    requiredData: ['interviewId', 'panelistId'],
    expectedStatus: 201,
    payload: () => ({
      ...testData.sampleFeedback,
      interviewId: testData.interviewId,
      interviewerId: testData.panelistId,
    }),
    description: 'REC-011: Submit interview feedback and scores',
    category: 'Feedback',
  },
  {
    id: 37,
    name: 'Get Feedback by Interview',
    method: 'GET',
    path: '/recruitment/feedback/interview/:interviewId',
    requiresAuth: true,
    requiredData: ['interviewId'],
    expectedStatus: [200, 404],
    description: 'REC-011: Get feedback for an interview',
    category: 'Feedback',
  },
  {
    id: 38,
    name: 'Get Feedback by Application',
    method: 'GET',
    path: '/recruitment/feedback/application/:applicationId',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-020: Get all feedback for an application',
    category: 'Feedback',
  },
  {
    id: 39,
    name: 'Get Average Score for Application',
    method: 'GET',
    path: '/recruitment/feedback/application/:applicationId/average-score',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-020: Get average score for an application',
    category: 'Feedback',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-014 & REC-018: OFFERS (7 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 40,
    name: 'Create Offer',
    method: 'POST',
    path: '/recruitment/offers',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [201, 409],
    payload: () => ({
      ...testData.sampleOffer,
      applicationId: testData.applicationId,
    }),
    description: 'REC-014: Create a new job offer',
    category: 'Offers',
  },
  {
    id: 41,
    name: 'Get Pending Offers',
    method: 'GET',
    path: '/recruitment/offers',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-014: Get pending offers',
    category: 'Offers',
  },
  {
    id: 42,
    name: 'Get Offer by ID',
    method: 'GET',
    path: '/recruitment/offers/:offerId',
    requiresAuth: true,
    requiredData: ['offerId'],
    expectedStatus: [200, 404],
    description: 'REC-014: Get offer by ID',
    category: 'Offers',
  },
  {
    id: 43,
    name: 'Get Offer by Application',
    method: 'GET',
    path: '/recruitment/offers/application/:applicationId',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 404],
    description: 'REC-014: Get offer for an application',
    category: 'Offers',
  },
  {
    id: 44,
    name: 'Approve/Reject Offer',
    method: 'PATCH',
    path: '/recruitment/offers/:offerId/approve',
    requiresAuth: true,
    requiredData: ['offerId'],
    expectedStatus: [200, 404],
    payload: () => ({ approved: true, comments: 'Offer approved for test' }),
    description: 'REC-014: Approve or reject an offer',
    category: 'Offers',
  },
  {
    id: 45,
    name: 'Record Candidate Response',
    method: 'PATCH',
    path: '/recruitment/offers/:offerId/candidate-response',
    requiresAuth: true,
    requiredData: ['offerId'],
    expectedStatus: [200, 404],
    payload: () => ({ response: 'accepted', comments: 'Looking forward to joining' }),
    description: 'REC-018: Record candidate response to offer',
    category: 'Offers',
  },
  {
    id: 46,
    name: 'Send Offer Letter',
    method: 'POST',
    path: '/recruitment/offers/:offerId/send',
    requiresAuth: true,
    requiredData: ['offerId'],
    expectedStatus: [200, 404],
    description: 'REC-018: Send offer letter electronically to candidate',
    category: 'Offers',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-017 & REC-022: NOTIFICATIONS (3 routes)
  // ═══════════════════════════════════════════════════════════
  {
    id: 47,
    name: 'Send Status Update Notification',
    method: 'POST',
    path: '/recruitment/notifications/status-update',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 400],
    payload: () => ({
      applicationId: testData.applicationId,
      type: 'status_update',
      message: 'Your application has been moved to the interview stage',
    }),
    description: 'REC-017: Send status update notification to candidate',
    category: 'Notifications',
  },
  {
    id: 48,
    name: 'Send Rejection Notification',
    method: 'POST',
    path: '/recruitment/notifications/rejection',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 400],
    payload: () => ({
      applicationId: testData.applicationId,
      templateId: 'standard_rejection',
      customMessage: 'Thank you for your interest. Unfortunately...',
    }),
    description: 'REC-022: Send automated rejection notification',
    category: 'Notifications',
  },
  {
    id: 49,
    name: 'Get Email Templates',
    method: 'GET',
    path: '/recruitment/notifications/templates',
    requiresAuth: true,
    requiredData: [],
    expectedStatus: 200,
    description: 'REC-022: Get available email templates',
    category: 'Notifications',
  },

  // ═══════════════════════════════════════════════════════════
  // REC-029: PRE-BOARDING (1 route)
  // ═══════════════════════════════════════════════════════════
  {
    id: 50,
    name: 'Trigger Pre-boarding',
    method: 'POST',
    path: '/recruitment/applications/:applicationId/trigger-preboarding',
    requiresAuth: true,
    requiredData: ['applicationId'],
    expectedStatus: [200, 400, 404],
    description: 'REC-029: Trigger pre-boarding after offer acceptance',
    category: 'Pre-boarding',
  },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

function log(message: string, color: string = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function replacePlaceholders(path: string): string {
  return path
    .replace(':jobTemplateId', testData.jobTemplateId || 'MISSING_ID')
    .replace(':jobRequisitionId', testData.jobRequisitionId || 'MISSING_ID')
    .replace(':applicationId', testData.applicationId || 'MISSING_ID')
    .replace(':candidateId', testData.candidateId || 'MISSING_ID')
    .replace(':interviewId', testData.interviewId || 'MISSING_ID')
    .replace(':offerId', testData.offerId || 'MISSING_ID')
    .replace(':panelistId', testData.panelistId || 'MISSING_ID');
}

// ============================================================
// HTTP CLIENT
// ============================================================

function createHttpClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use((reqConfig) => {
    if (config.verbose) {
      logInfo(`Request: ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
    }
    return reqConfig;
  });

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  return client;
}

// ============================================================
// AUTHENTICATION (DISABLED - Guards are commented out)
// ============================================================

// Authentication skipped - guards are disabled for testing

// ============================================================
// DATA COLLECTION
// ============================================================

async function collectTestData(client: AxiosInstance): Promise<void> {
  log('\n📊 Collecting Test Data from Database...', colors.cyan);
  
  const headers = {}; // No auth headers needed - guards are disabled

  // Try to fetch existing data
  try {
    // Get job templates
    const templatesRes = await client.get('/recruitment/job-templates', { headers });
    if (templatesRes.data?.length > 0) {
      testData.jobTemplateId = templatesRes.data[0].id || templatesRes.data[0]._id;
      logSuccess(`Found Job Template ID: ${testData.jobTemplateId}`);
    }
  } catch (e) {
    logWarning('Could not fetch job templates');
  }

  try {
    // Get job requisitions
    const reqsRes = await client.get('/recruitment/job-requisitions', { headers });
    if (reqsRes.data?.length > 0) {
      testData.jobRequisitionId = reqsRes.data[0].id || reqsRes.data[0]._id;
      logSuccess(`Found Job Requisition ID: ${testData.jobRequisitionId}`);
    }
  } catch (e) {
    logWarning('Could not fetch job requisitions');
  }

  try {
    // Get applications
    const appsRes = await client.get('/recruitment/applications', { headers });
    if (appsRes.data?.length > 0) {
      const app = appsRes.data[0];
      testData.applicationId = app.id || app._id;
      testData.candidateId = app.candidateId || app.candidate?._id || app.candidate?.id;
      logSuccess(`Found Application ID: ${testData.applicationId}`);
      if (testData.candidateId) {
        logSuccess(`Found Candidate ID: ${testData.candidateId}`);
      }
    }
  } catch (e) {
    logWarning('Could not fetch applications');
  }

  try {
    // Get interviews
    const interviewsRes = await client.get('/recruitment/interviews', { headers });
    if (interviewsRes.data?.length > 0) {
      const interview = interviewsRes.data[0];
      testData.interviewId = interview.id || interview._id;
      if (interview.panelMembers?.length > 0) {
        testData.panelistId = interview.panelMembers[0].employeeId || interview.panelMembers[0].id;
      }
      logSuccess(`Found Interview ID: ${testData.interviewId}`);
    }
  } catch (e) {
    logWarning('Could not fetch interviews');
  }

  try {
    // Get offers
    const offersRes = await client.get('/recruitment/offers', { headers });
    if (offersRes.data?.length > 0) {
      testData.offerId = offersRes.data[0].id || offersRes.data[0]._id;
      logSuccess(`Found Offer ID: ${testData.offerId}`);
    }
  } catch (e) {
    logWarning('Could not fetch offers');
  }

  try {
    // Get employees (for HR and panelist IDs)
    const employeesRes = await client.get('/employees', { headers });
    if (employeesRes.data?.length > 0) {
      testData.hrEmployeeId = employeesRes.data[0].id || employeesRes.data[0]._id;
      testData.panelistId = testData.panelistId || testData.hrEmployeeId;
      logSuccess(`Found HR Employee ID: ${testData.hrEmployeeId}`);
    }
  } catch (e) {
    logWarning('Could not fetch employees');
  }
}

async function promptForMissingData(): Promise<void> {
  const missingFields: string[] = [];
  
  if (!testData.applicationId) missingFields.push('applicationId');
  if (!testData.candidateId) missingFields.push('candidateId');
  if (!testData.interviewId) missingFields.push('interviewId');
  if (!testData.offerId) missingFields.push('offerId');
  if (!testData.panelistId) missingFields.push('panelistId');
  if (!testData.hrEmployeeId) missingFields.push('hrEmployeeId');
  if (!testData.jobTemplateId) missingFields.push('jobTemplateId');
  if (!testData.jobRequisitionId) missingFields.push('jobRequisitionId');

  if (missingFields.length === 0) {
    logSuccess('All required test data collected!');
    return;
  }

  log('\n⚠️  Missing Test Data:', colors.yellow);
  missingFields.forEach(field => log(`   - ${field}`, colors.yellow));

  if (!process.argv.includes('--interactive')) {
    logInfo('Run with --interactive flag to manually input missing IDs');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  for (const field of missingFields) {
    const value = await new Promise<string>((resolve) => {
      rl.question(`Enter ${field} (or press Enter to skip): `, resolve);
    });
    
    if (value && isValidObjectId(value)) {
      (testData as any)[field] = value;
      logSuccess(`Set ${field}: ${value}`);
    } else if (value) {
      logWarning(`Invalid ObjectId format for ${field}, skipping`);
    }
  }

  rl.close();
}

// ============================================================
// TEST RUNNER
// ============================================================

async function runTest(client: AxiosInstance, route: RouteTest): Promise<TestResult> {
  const startTime = Date.now();
  const path = replacePlaceholders(route.path);
  
  // Check for missing required data
  const missingData = route.requiredData.filter(field => !(testData as any)[field]);
  
  if (missingData.length > 0) {
    return {
      route: route.path,
      method: route.method,
      status: 'skipped',
      expectedCode: route.expectedStatus,
      responseTime: 0,
      missingData,
      error: `Missing required data: ${missingData.join(', ')}`,
    };
  }

  // Build request config
  const headers: Record<string, string> = {};
  // Authentication headers removed - guards are disabled for testing

  try {
    let response: AxiosResponse;
    const queryParams = route.queryParams ? route.queryParams() : undefined;
    const payload = route.payload ? route.payload() : undefined;

    switch (route.method) {
      case 'GET':
        response = await client.get(path, { headers, params: queryParams });
        break;
      case 'POST':
        response = await client.post(path, payload, { headers });
        break;
      case 'PUT':
        response = await client.put(path, payload, { headers });
        break;
      case 'PATCH':
        response = await client.patch(path, payload, { headers });
        break;
      case 'DELETE':
        response = await client.delete(path, { headers });
        break;
      default:
        throw new Error(`Unsupported method: ${route.method}`);
    }

    const responseTime = Date.now() - startTime;
    const expectedCodes = Array.isArray(route.expectedStatus) 
      ? route.expectedStatus 
      : [route.expectedStatus];
    
    const isSuccess = expectedCodes.includes(response.status);

    // Store created IDs for subsequent tests
    if (isSuccess && route.method === 'POST' && response.data) {
      const id = response.data.id || response.data._id;
      if (id) {
        if (route.path.includes('job-templates')) testData.jobTemplateId = id;
        if (route.path.includes('job-requisitions')) testData.jobRequisitionId = id;
        if (route.path.includes('applications') && !route.path.includes('trigger')) testData.applicationId = id;
        if (route.path.includes('interviews') && !route.path.includes('feedback')) testData.interviewId = id;
        if (route.path.includes('offers')) testData.offerId = id;
      }
    }

    return {
      route: route.path,
      method: route.method,
      status: isSuccess ? 'success' : 'failed',
      statusCode: response.status,
      expectedCode: route.expectedStatus,
      responseTime,
      response: config.verbose ? response.data : undefined,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    const statusCode = error.response?.status;
    const expectedCodes = Array.isArray(route.expectedStatus) 
      ? route.expectedStatus 
      : [route.expectedStatus];
    
    // Some routes expect error codes (404 for missing resources)
    if (statusCode && expectedCodes.includes(statusCode)) {
      return {
        route: route.path,
        method: route.method,
        status: 'success',
        statusCode,
        expectedCode: route.expectedStatus,
        responseTime,
      };
    }

    return {
      route: route.path,
      method: route.method,
      status: 'failed',
      statusCode,
      expectedCode: route.expectedStatus,
      responseTime,
      error: error.response?.data?.message || error.message,
    };
  }
}

async function runAllTests(client: AxiosInstance): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const categories = [...new Set(routes.map(r => r.category))];

  for (const category of categories) {
    const categoryRoutes = routes.filter(r => r.category === category);
    
    log(`\n${'═'.repeat(60)}`, colors.cyan);
    log(`  ${category.toUpperCase()} (${categoryRoutes.length} routes)`, colors.cyan);
    log(`${'═'.repeat(60)}`, colors.cyan);

    for (const route of categoryRoutes) {
      process.stdout.write(`  [${route.id.toString().padStart(2, '0')}] ${route.method.padEnd(6)} ${route.path.substring(0, 45).padEnd(45)} `);
      
      const result = await runTest(client, route);
      results.push(result);

      if (result.status === 'success') {
        log(`✅ ${result.statusCode} (${result.responseTime}ms)`, colors.green);
      } else if (result.status === 'skipped') {
        log(`⏭️  SKIPPED - ${result.error}`, colors.yellow);
      } else {
        log(`❌ ${result.statusCode || 'ERR'} - ${result.error || 'Unknown error'}`, colors.red);
      }

      if (config.verbose && result.response) {
        log(`     Response: ${JSON.stringify(result.response).substring(0, 100)}...`, colors.dim);
      }
    }
  }

  return results;
}

// ============================================================
// REPORT GENERATION
// ============================================================

function generateReport(results: TestResult[]): void {
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
  const avgResponseTime = Math.round(totalResponseTime / results.length);

  console.log('\n');
  log('┌─────────────────────────────────────────────────────────────────────┐', colors.cyan);
  log('│            RECRUITMENT ROUTE TESTER - FINAL RESULTS                │', colors.cyan);
  log('├─────────────────────────────────────────────────────────────────────┤', colors.cyan);
  log(`│  Total Routes:        ${results.length.toString().padEnd(44)}│`, colors.white);
  log(`│  ${colors.green}Successful:           ${successful.length} (${Math.round(successful.length / results.length * 100)}%)${colors.cyan}`.padEnd(77) + '│', colors.cyan);
  log(`│  ${colors.red}Failed:               ${failed.length} (${Math.round(failed.length / results.length * 100)}%)${colors.cyan}`.padEnd(77) + '│', colors.cyan);
  log(`│  ${colors.yellow}Skipped:              ${skipped.length} (${Math.round(skipped.length / results.length * 100)}%)${colors.cyan}`.padEnd(77) + '│', colors.cyan);
  log(`│  Average Response:    ${avgResponseTime}ms`.padEnd(70) + '│', colors.white);
  log('├─────────────────────────────────────────────────────────────────────┤', colors.cyan);

  if (failed.length > 0) {
    log('│  FAILED TESTS:                                                      │', colors.red);
    failed.forEach((r, i) => {
      log(`│  ${i + 1}. ${r.method} ${r.route.substring(0, 45)}`.padEnd(70) + '│', colors.red);
      log(`│     Error: ${(r.error || 'Unknown').substring(0, 55)}`.padEnd(70) + '│', colors.red);
    });
    log('├─────────────────────────────────────────────────────────────────────┤', colors.cyan);
  }

  if (skipped.length > 0) {
    log('│  SKIPPED TESTS (Missing Data):                                      │', colors.yellow);
    skipped.forEach((r, i) => {
      log(`│  ${i + 1}. ${r.method} ${r.route.substring(0, 45)}`.padEnd(70) + '│', colors.yellow);
      if (r.missingData) {
        log(`│     Missing: ${r.missingData.join(', ').substring(0, 53)}`.padEnd(70) + '│', colors.yellow);
      }
    });
    log('├─────────────────────────────────────────────────────────────────────┤', colors.cyan);
  }

  log('│  TEST DATA USED:                                                    │', colors.cyan);
  log(`│  - jobTemplateId:     ${(testData.jobTemplateId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - jobRequisitionId:  ${(testData.jobRequisitionId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - applicationId:     ${(testData.applicationId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - candidateId:       ${(testData.candidateId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - interviewId:       ${(testData.interviewId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - offerId:           ${(testData.offerId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - panelistId:        ${(testData.panelistId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log(`│  - hrEmployeeId:      ${(testData.hrEmployeeId || 'NOT SET').substring(0, 44)}│`, colors.dim);
  log('└─────────────────────────────────────────────────────────────────────┘', colors.cyan);

  // Summary by category
  const categories = [...new Set(routes.map(r => r.category))];
  console.log('\n');
  log('📊 Results by Category:', colors.bright);
  log('─'.repeat(60), colors.dim);
  
  for (const category of categories) {
    const categoryResults = results.filter(r => {
      const route = routes.find(rt => rt.path === r.route && rt.method === r.method);
      return route?.category === category;
    });
    const categorySuccess = categoryResults.filter(r => r.status === 'success').length;
    const categoryTotal = categoryResults.length;
    const percentage = Math.round((categorySuccess / categoryTotal) * 100);
    
    const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    const color = percentage === 100 ? colors.green : percentage >= 80 ? colors.yellow : colors.red;
    
    log(`  ${category.padEnd(20)} [${bar}] ${percentage}% (${categorySuccess}/${categoryTotal})`, color);
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.clear();
  
  log('╔═══════════════════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                                                                           ║', colors.cyan);
  log('║     🧪 RECRUITMENT MODULE - COMPREHENSIVE ROUTE TESTING SCRIPT 🧪       ║', colors.cyan);
  log('║                         Testing 50 API Endpoints                          ║', colors.cyan);
  log('║                                                                           ║', colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════╝', colors.cyan);
  
  log(`\n📡 Base URL: ${config.baseUrl}`, colors.dim);
  log(`⏱️  Timeout: ${config.timeout}ms`, colors.dim);
  log(`🔄 Retry Attempts: ${config.retryAttempts}`, colors.dim);
  
  const client = createHttpClient();
  
  // Step 1: Authentication skipped - guards are disabled for testing
  logSuccess('Authentication skipped - guards are disabled for testing');

  // Step 2: Collect test data from database
  await collectTestData(client);
  
  // Step 3: Prompt for missing data if interactive mode
  await promptForMissingData();

  // Step 4: Run all tests
  log('\n🚀 Starting Route Tests...', colors.bright);
  const results = await runAllTests(client);

  // Step 5: Generate report
  generateReport(results);

  // Exit with appropriate code
  const failed = results.filter(r => r.status === 'failed').length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run the script
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
