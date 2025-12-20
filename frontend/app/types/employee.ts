// =====================================================
// Employee Profile Interfaces
// =====================================================

import {
  Gender,
  MaritalStatus,
  EmployeeStatus,
  ContractType,
  WorkType,
  GraduationType,
  ProfileChangeStatus,
} from './enums';

export interface Address {
  city?: string;
  streetAddress?: string;
  country?: string;
  postalCode?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Qualification {
  id: string;
  type: GraduationType;
  institution: string;
  fieldOfStudy: string;
  graduationDate: string;
  grade?: string;
  documentUrl?: string;
}

export interface EmployeeProfile {
  id: string;
  employeeNumber: string;

  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string;
  nationalId: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  dateOfBirth?: string;
  profilePictureUrl?: string;
  biography?: string;

  // Contact Information
  personalEmail?: string;
  workEmail?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: Address;

  // Emergency Contact
  emergencyContact?: EmergencyContact;

  // Employment Information
  dateOfHire: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractType?: ContractType;
  workType?: WorkType;
  status: EmployeeStatus;
  statusEffectiveFrom?: string;

  // Banking Details
  bankName?: string;
  bankAccountNumber?: string;

  // Organization Structure
  primaryPositionId?: string;
  primaryDepartmentId?: string;
  supervisorPositionId?: string;
  payGradeId?: string;

  // Denormalized for display
  positionName?: string;
  departmentName?: string;
  supervisorName?: string;

  // Performance Summary
  lastAppraisalDate?: string;
  lastAppraisalScore?: number;
  lastAppraisalRatingLabel?: string;

  // Qualifications
  qualifications?: Qualification[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeProfileSummary {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  workEmail?: string;
  profilePictureUrl?: string;
  status: EmployeeStatus;
  positionName?: string;
  departmentName?: string;
}

export interface ProfileChangeRequest {
  id: string;
  employeeId: string;
  requestedFields: Record<string, unknown>;
  currentFields: Record<string, unknown>;
  status: ProfileChangeStatus;
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileChangeRequest {
  employeeId: string;
  requestedFields: Record<string, unknown>;
  reason?: string;
}

