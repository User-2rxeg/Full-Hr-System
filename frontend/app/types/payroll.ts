// =====================================================
// Payroll Interfaces
// =====================================================

import {
  PayrollStatus,
  PayrollPaymentStatus,
  PayslipPaymentStatus,
  BonusStatus,
  BenefitStatus,
  ConfigStatus,
  ClaimStatus,
  DisputeStatus,
  RefundStatus,
} from './enums';

// =====================================================
// Pay Grade (matches backend payGrades.schema.ts)
// =====================================================

export interface PayGrade {
  id: string;
  grade: string; // position grade and name like: Junior TA, Mid TA, Senior TA
  baseSalary: number;
  grossSalary: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayGradeRequest {
  grade: string;
  baseSalary: number;
  grossSalary: number;
}

export interface UpdatePayGradeRequest {
  grade?: string;
  baseSalary?: number;
  grossSalary?: number;
  status?: ConfigStatus;
}

// =====================================================
// Allowance (matches backend allowance.schema.ts)
// =====================================================

export interface Allowance {
  id: string;
  name: string; // allowance name like: Housing Allowance, Transport Allowance
  amount: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllowanceRequest {
  name: string;
  amount: number;
}

// =====================================================
// Tax Rules (matches backend taxRules.schema.ts)
// =====================================================

export interface TaxRule {
  id: string;
  name: string;
  description?: string;
  rate: number; // tax rate in percentage
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRuleRequest {
  name: string;
  description?: string;
  rate: number;
}

// =====================================================
// Insurance Brackets (matches backend insuranceBrackets.schema.ts)
// =====================================================

export interface InsuranceBracket {
  id: string;
  name: string; // insurance name like: social, health insurance
  amount: number;
  status: ConfigStatus;
  minSalary: number;
  maxSalary: number;
  employeeRate: number; // percentage (0-100)
  employerRate: number; // percentage (0-100)
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsuranceBracketRequest {
  name: string;
  amount: number;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
}

// =====================================================
// Signing Bonus Config (matches backend signingBonus.schema.ts)
// =====================================================

export interface SigningBonusConfig {
  id: string;
  positionName: string; // only onboarding bonus based on position
  amount: number;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSigningBonusConfigRequest {
  positionName: string;
  amount: number;
}

// =====================================================
// Termination & Resignation Benefits Config
// (matches backend terminationAndResignationBenefits.ts)
// =====================================================

export interface TerminationBenefitConfig {
  id: string;
  name: string; // termination/resignation name like: End of Service Gratuity
  amount: number;
  terms?: string;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTerminationBenefitConfigRequest {
  name: string;
  amount: number;
  terms?: string;
}

// =====================================================
// Payroll Run (matches backend payrollRuns.schema.ts)
// =====================================================

export interface PayrollRun {
  id: string;
  runId: string; // for viewing purposes ex: PR-2025-0001
  payrollPeriod: string; // end of each month like 31-01-2025
  status: PayrollStatus;
  entity: string; // name of the company
  employees: number;
  exceptions: number;
  totalnetpay: number;
  payrollSpecialistId: string; // createdBy
  paymentStatus: PayrollPaymentStatus;
  payrollManagerId?: string;
  financeStaffId?: string;
  rejectionReason?: string;
  unlockReason?: string;
  managerApprovalDate?: string;
  financeApprovalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePayrollRequest {
  payrollPeriod: string;
  entity: string;
}

export interface PayrollReviewRequest {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface PayrollUnlockRequest {
  unlockReason: string;
}

// =====================================================
// Payslip (matches backend payslip.schema.ts)
// =====================================================

export interface PayslipEarnings {
  baseSalary: number;
  allowances: Allowance[];
  bonuses?: SigningBonusConfig[];
  benefits?: TerminationBenefitConfig[];
  refunds?: RefundDetails[];
}

export interface PayslipDeductions {
  taxes: TaxRule[];
  insurances?: InsuranceBracket[];
  penalties?: EmployeePenalties;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollRunId: string;
  earningsDetails: PayslipEarnings;
  deductionsDetails: PayslipDeductions;
  totalGrossSalary: number;
  totaDeductions?: number;
  netPay: number;
  paymentStatus: PayslipPaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Employee Penalties (embedded in payslip)
// =====================================================

export interface EmployeePenalties {
  id: string;
  employeeId: string;
  penaltyType: string;
  amount: number;
  reason?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Employee Signing Bonus (matches backend EmployeeSigningBonus.schema.ts)
// =====================================================

export interface EmployeeSigningBonus {
  id: string;
  employeeId: string;
  signingBonusId: string;
  givenAmount: number; // for sake of editing signingBonus amount manually given to this employee
  paymentDate?: string;
  status: BonusStatus; // pending, paid, approved, rejected
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeSigningBonusRequest {
  employeeId: string;
  signingBonusId: string;
  givenAmount: number;
}

// =====================================================
// Employee Termination/Resignation Benefits
// (matches backend EmployeeTerminationResignation.schema.ts)
// =====================================================

export interface EmployeeTerminationBenefit {
  id: string;
  employeeId: string;
  benefitId: string;
  givenAmount: number; // for sake of editing Benefits amount manually given to this employee
  terminationId: string;
  status: BenefitStatus; // pending, paid, approved, rejected
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeTerminationBenefitRequest {
  employeeId: string;
  benefitId: string;
  givenAmount: number;
  terminationId: string;
}

// =====================================================
// Claims (matches backend claims.schema.ts)
// =====================================================

export interface Claim {
  id: string;
  claimId: string; // for frontend view purposes ex: CLAIM-0001
  description: string;
  claimType: string; // for example: medical, etc
  employeeId: string;
  financeStaffId?: string;
  amount: number;
  approvedAmount?: number;
  status: ClaimStatus; // under review, approved, rejected
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimRequest {
  description: string;
  claimType: string;
  amount: number;
}

export interface ReviewClaimRequest {
  status: 'approved' | 'rejected';
  approvedAmount?: number;
  rejectionReason?: string;
  resolutionComment?: string;
}

// =====================================================
// Disputes (matches backend disputes.schema.ts)
// =====================================================

export interface Dispute {
  id: string;
  disputeId: string; // for frontend view purposes ex: DISP-0001
  description: string;
  employeeId: string;
  financeStaffId?: string;
  payslipId: string;
  status: DisputeStatus; // under review, approved, rejected
  rejectionReason?: string;
  resolutionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeRequest {
  description: string;
  payslipId: string;
}

export interface ReviewDisputeRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  resolutionComment?: string;
}

// =====================================================
// Refunds (matches backend refunds.schema.ts)
// =====================================================

export interface RefundDetails {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  status: RefundStatus; // pending, paid
  relatedClaimId?: string;
  relatedDisputeId?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Payroll Policy (matches backend payrollPolicies.schema.ts)
// =====================================================

// Note: PolicyType and Applicability enums are defined in enums.ts
import { PolicyType, Applicability } from './enums';

export interface PayrollPolicy {
  id: string;
  name: string;
  description?: string;
  policyType: PolicyType;
  applicability: Applicability;
  rules?: Record<string, unknown>;
  status: ConfigStatus;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Company Wide Settings
// =====================================================

export interface CompanyWideSettings {
  id: string;
  companyName: string;
  currency: string;
  payrollCycleDay: number; // day of month payroll runs
  taxYear: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// Payroll Reports
// =====================================================

export interface PayrollSummaryReport {
  periodMonth: number;
  periodYear: number;
  totalEmployees: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalInsurance: number;
  totalEmployerCost: number;
  byDepartment: {
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    totalGross: number;
    totalNet: number;
  }[];
  byPayGrade: {
    payGradeId: string;
    payGradeName: string;
    employeeCount: number;
    totalGross: number;
    averageSalary: number;
  }[];
}

export interface TaxReport {
  periodMonth: number;
  periodYear: number;
  totalTaxableIncome: number;
  totalTaxWithheld: number;
  employeeCount: number;
  breakdown: {
    employeeId: string;
    employeeName: string;
    taxableIncome: number;
    taxWithheld: number;
  }[];
}

export interface InsuranceReport {
  periodMonth: number;
  periodYear: number;
  totalEmployeeContribution: number;
  totalEmployerContribution: number;
  employeeCount: number;
  breakdown: {
    employeeId: string;
    employeeName: string;
    employeeContribution: number;
    employerContribution: number;
  }[];
}
