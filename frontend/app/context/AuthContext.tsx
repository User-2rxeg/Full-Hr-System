'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, BackendUser } from '@/app/services/auth';
import { removeAccessToken, getAccessToken } from '@/app/services/api';

// System roles enum
export enum SystemRole {
  DEPARTMENT_EMPLOYEE = 'department employee',
  DEPARTMENT_HEAD = 'department head',
  HR_MANAGER = 'HR Manager',
  HR_EMPLOYEE = 'HR Employee',
  PAYROLL_SPECIALIST = 'Payroll Specialist',
  PAYROLL_MANAGER = 'Payroll Manager',
  SYSTEM_ADMIN = 'System Admin',
  LEGAL_POLICY_ADMIN = 'Legal & Policy Admin',
  RECRUITER = 'Recruiter',
  FINANCE_STAFF = 'Finance Staff',
  JOB_CANDIDATE = 'Job Candidate',
  HR_ADMIN = 'HR Admin',
}

// User type stored in context
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: SystemRole;
  roles: string[];
  employeeNumber?: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  password: string;
  mobilePhone: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  getDashboardRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const USER_STORAGE_KEY = 'hr_system_user';

// Map backend role string to SystemRole enum
function mapRole(role: string): SystemRole {
  const roleMap: Record<string, SystemRole> = {
    'department employee': SystemRole.DEPARTMENT_EMPLOYEE,
    'department head': SystemRole.DEPARTMENT_HEAD,
    'HR Manager': SystemRole.HR_MANAGER,
    'HR Employee': SystemRole.HR_EMPLOYEE,
    'Payroll Specialist': SystemRole.PAYROLL_SPECIALIST,
    'Payroll Manager': SystemRole.PAYROLL_MANAGER,
    'System Admin': SystemRole.SYSTEM_ADMIN,
    'Legal & Policy Admin': SystemRole.LEGAL_POLICY_ADMIN,
    'Recruiter': SystemRole.RECRUITER,
    'Finance Staff': SystemRole.FINANCE_STAFF,
    'Job Candidate': SystemRole.JOB_CANDIDATE,
    'HR Admin': SystemRole.HR_ADMIN,
  };
  return roleMap[role] || SystemRole.DEPARTMENT_EMPLOYEE;
}

// Get dashboard route for a given role
function getDashboardRouteForRole(role: SystemRole): string {
  const routes: Record<SystemRole, string> = {
    [SystemRole.SYSTEM_ADMIN]: '/dashboard/system-admin',
    [SystemRole.HR_ADMIN]: '/dashboard/hr-admin',
    [SystemRole.HR_MANAGER]: '/dashboard/hr-manager',
    [SystemRole.HR_EMPLOYEE]: '/dashboard/hr-employee',
    [SystemRole.PAYROLL_MANAGER]: '/dashboard/payroll-manager',
    [SystemRole.PAYROLL_SPECIALIST]: '/dashboard/payroll-specialist',
    [SystemRole.FINANCE_STAFF]: '/dashboard/finance-staff',
    [SystemRole.RECRUITER]: '/dashboard/recruiter',
    [SystemRole.DEPARTMENT_HEAD]: '/dashboard/department-head',
    [SystemRole.LEGAL_POLICY_ADMIN]: '/dashboard/legal-policy-admin',
    [SystemRole.JOB_CANDIDATE]: '/dashboard/job-candidate',
    [SystemRole.DEPARTMENT_EMPLOYEE]: '/dashboard/department-employee',
  };
  return routes[role] || '/dashboard/department-employee';
}

// Transform backend user to frontend user
function transformUser(backendUser: BackendUser): User {
  const primaryRole = backendUser.roles?.[0] || 'department employee';
  return {
    id: backendUser._id,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email,
    role: mapRole(primaryRole),
    roles: backendUser.roles || [],
    employeeNumber: backendUser.employeeNumber,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Add minimum loading time to prevent flash
        const startTime = Date.now();
        const minLoadingTime = 500; // Minimum 500ms loading

        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const token = getAccessToken();

        if (storedUser && token) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } else if (storedUser && !token) {
          // Token missing but user data exists - session expired
          console.warn('User data found but no access token. Clearing session.');
          localStorage.removeItem(USER_STORAGE_KEY);
          setUser(null);
        }

        // Ensure minimum loading time
        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
        }
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return false;
      }

      if (response.data?.user) {
        const transformedUser = transformUser(response.data.user);
        setUser(transformedUser);

        // Store user in localStorage
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(transformedUser));

        setIsLoading(false);
        return true;
      }

      setError('Invalid response from server');
      setIsLoading(false);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.registerCandidate({
        firstName: data.firstName,
        lastName: data.lastName,
        nationalId: data.nationalId,
        personalEmail: data.email,
        password: data.password,
        mobilePhone: data.mobilePhone,
      });

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return false;
      }

      // After successful registration, login the candidate and redirect to their dashboard
      try {
        const loginResponse = await authService.login({
          email: data.email,
          password: data.password,
        });
        
        if (loginResponse.data?.user) {
          const transformedUser = transformUser(loginResponse.data.user);
          setUser(transformedUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(transformedUser));
          
          // Redirect to candidate dashboard
          router.push('/dashboard/job-candidate');
        }
      } catch (loginErr) {
        // If auto-login fails, just redirect to login page
        router.push('/login');
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
      return false;
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear user state and storage
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      removeAccessToken();
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getDashboardRoute = useCallback((): string => {
    if (!user) return '/login';
    return getDashboardRouteForRole(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        getDashboardRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { getDashboardRouteForRole };