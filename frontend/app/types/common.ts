// =====================================================
// Common/Shared Interfaces
// =====================================================

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Search & Filter Types
// =====================================================

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, unknown>;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// =====================================================
// Notification Types
// =====================================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'leave_request'
  | 'leave_approved'
  | 'leave_rejected'
  | 'payroll'
  | 'performance'
  | 'attendance'
  | 'recruitment'
  | 'onboarding'
  | 'system';

// =====================================================
// Audit & History Types
// =====================================================

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'cancel'
  | 'export';

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// =====================================================
// File & Document Types
// =====================================================

export interface FileUpload {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FileUploadRequest {
  file: File;
  category?: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// Select/Dropdown Option Types
// =====================================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface TreeSelectOption<T = string> extends SelectOption<T> {
  children?: TreeSelectOption<T>[];
  expanded?: boolean;
}

// =====================================================
// Dashboard & Stats Types
// =====================================================

export interface DashboardStats {
  totalEmployees: number;
  activeLeaves: number;
  pendingApprovals: number;
  openPositions: number;
  pendingPayroll?: boolean;
  upcomingEvents: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

// =====================================================
// Form & Validation Types
// =====================================================

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: SelectOption[];
  validation?: FormValidation;
  defaultValue?: unknown;
  disabled?: boolean;
  hidden?: boolean;
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime'
  | 'time'
  | 'file'
  | 'switch';

export interface FormValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: (value: unknown) => string | undefined;
}

export interface FormError {
  field: string;
  message: string;
}

// =====================================================
// Table & Grid Types
// =====================================================

export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface TableAction<T = unknown> {
  label: string;
  icon?: string;
  onClick: (row: T) => void;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  variant?: 'default' | 'danger' | 'primary';
}

// =====================================================
// Modal & Dialog Types
// =====================================================

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

// =====================================================
// Toast & Alert Types
// =====================================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

