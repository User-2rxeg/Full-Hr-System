// filepath: d:\WebstormProjects\HR System\Main\frontend\app\services\auth.ts
import api, { setAccessToken, removeAccessToken } from './api';

// Types matching backend response
export interface LoginRequest {
  email: string;
  password: string;
}

export interface BackendUser {
  _id: string;
  email: string;
  roles: string[];
  employeeNumber?: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  message: string;
  user: BackendUser;
  userType: 'employee' | 'candidate';
  expiresIn: string;
  access_token: string;
}

export interface RegisterCandidateRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  nationalId: string;
  personalEmail: string;
  password: string;
  mobilePhone: string;
}

export interface RegisterCandidateResponse {
  message: string;
  candidateId: string;
}

export interface RegisterEmployeeRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  nationalId: string;
  workEmail: string;
  password: string;
  employeeNumber: string;
  dateOfHire: string;
  roles: string[];
  mobilePhone?: string;
  personalEmail?: string;
}

export interface RegisterEmployeeResponse {
  message: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    workEmail: string;
  };
}

export interface LogoutResponse {
  message: string;
}

// Auth API functions
export const authService = {
  /**
   * Login with email and password
   * Stores access token in cookie on success
   */
  async login(credentials: LoginRequest) {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    // Store the access token in cookie if login successful
    if (response.data?.access_token) {
      setAccessToken(response.data.access_token);
    }

    return response;
  },

  /**
   * Register a new candidate (public registration)
   */
  async registerCandidate(data: RegisterCandidateRequest) {
    return api.post<RegisterCandidateResponse>('/auth/register-candidate', data);
  },

  /**
   * Register a new employee (admin only - requires authentication)
   */
  async registerEmployee(data: RegisterEmployeeRequest) {
    return api.post<RegisterEmployeeResponse>('/auth/register-employee', data);
  },

  /**
   * Logout - clears the JWT cookie
   */
  async logout() {
    const response = await api.post<LogoutResponse>('/auth/logout');
    // Remove the token from cookie
    removeAccessToken();
    return response;
  },
};

export default authService;

