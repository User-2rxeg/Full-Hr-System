// =====================================================
// Organization Structure Interfaces
// =====================================================

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  headPositionId?: string;
  isActive: boolean;

  // Denormalized for display
  parentDepartmentName?: string;
  headName?: string;
  employeeCount?: number;
  positionCount?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface Position {
  id: string;
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
  payGradeId?: string;
  isActive: boolean;
  isManagement: boolean;
  maxHeadcount?: number;
  currentHeadcount?: number;

  // Denormalized for display
  departmentName?: string;
  reportsToTitle?: string;
  payGradeName?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationChart {
  id: string;
  name: string;
  title?: string;
  department?: string;
  imageUrl?: string;
  children?: OrganizationChart[];
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  headName?: string;
}

export interface PositionSummary {
  id: string;
  title: string;
  code: string;
  departmentName: string;
  isVacant: boolean;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string;
  parentDepartmentId?: string;
  headPositionId?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  parentDepartmentId?: string;
  headPositionId?: string;
  isActive?: boolean;
}

export interface CreatePositionRequest {
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
  payGradeId?: string;
  isManagement?: boolean;
  maxHeadcount?: number;
}

export interface UpdatePositionRequest {
  title?: string;
  description?: string;
  reportsToPositionId?: string;
  payGradeId?: string;
  isManagement?: boolean;
  maxHeadcount?: number;
  isActive?: boolean;
}

