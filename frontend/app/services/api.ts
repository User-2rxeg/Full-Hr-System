
// Force the correct API URL - environment variable may not be loading correctly
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

// Log the API URL at startup for debugging
if (typeof window !== 'undefined') {
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Env value:', process.env.NEXT_PUBLIC_API_URL);
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

// Get access token from cookie
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'access_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Set access token in cookie
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  // Set cookie with 7 days expiry, secure in production
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

// Remove access token from cookie
export function removeAccessToken(): void {
  if (typeof window === 'undefined') return;
  document.cookie = 'access_token=; path=/; max-age=0';
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log('[API] Making request to:', url);

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if we have a token
    const token = getAccessToken();
    if (token) {
      (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        return {
          error: data?.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('[API] Request failed:', url);
      console.error('[API] Error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error - Is the backend running?',
        status: 0,
      };
    }
  }

  async get<T>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async put<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async delete<T>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  async postFormData<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {};
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Don't set Content-Type for FormData - browser sets it with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        return {
          error: data?.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('[API] FormData request failed:', url);
      console.error('[API] Error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error - Is the backend running?',
        status: 0,
      };
    }
  }

  async downloadFile(endpoint: string): Promise<{ blob?: Blob; filename?: string; error?: string; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {};

    // Add authorization header if we have a token
    const token = getAccessToken();
    if (token) {
      (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: defaultHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        return {
          error: `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename: string | undefined;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      return {
        blob,
        filename,
        status: response.status,
      };
    } catch (error) {
      console.error('[API] Download failed:', url);
      console.error('[API] Error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error - Is the backend running?',
        status: 0,
      };
    }
  }
}

const apiService = new ApiService(API_BASE_URL);

export default apiService;
export { API_BASE_URL };

