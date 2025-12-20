// =====================================================
// Auth Types
// =====================================================

export type { User } from '@/app/context/AuthContext';

/**
 * Auth state type
 */
export interface AuthState {
  user: import('@/app/context/AuthContext').User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nationalId: string;
  mobilePhone: string;
}

