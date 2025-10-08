import { ApiResponse } from '@/types';

// API configuration - use Next.js API routes for better server-side handling
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  }
  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3002'
    : window.location.origin;
};

const API_TIMEOUT = 15000; // 15 seconds

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * Enhanced fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeout = API_TIMEOUT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }

    throw error;
  }
}

/**
 * Fetch papers for a specific date from the backend API
 */
export async function fetchPapers(date: string): Promise<ApiResponse> {
  try {
    const url = `${getApiBaseUrl()}/api/papers?date=${encodeURIComponent(date)}`;
    const response = await fetchWithTimeout(url, { method: 'GET' });
    const data: ApiResponse = await response.json();

    // Validate response structure
    if (!data || typeof data.success === 'undefined') {
      throw new Error('Invalid response format from server');
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching papers:', error);

    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw new Error('Failed to fetch papers');
  }
}

/**
 * Check backend health status
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${getApiBaseUrl()}/health`, {
      method: 'GET',
      timeout: 5000, // Shorter timeout for health check
    });

    const data = await response.json();
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

/**
 * Get papers with client-side caching (for browser only)
 */
export async function fetchPapersWithCache(date: string): Promise<ApiResponse> {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return fetchPapers(date);
  }

  const cacheKey = `papers_${date}`;
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      // Check if cache is less than 1 hour old
      if (Date.now() - parsed.timestamp < 3600000) {
        console.log(`📋 Using cached data for ${date}`);
        return parsed.data;
      }
    } catch {
      // Invalid cache data, remove it
      localStorage.removeItem(cacheKey);
    }
  }

  // Fetch fresh data
  const data = await fetchPapers(date);

  // Cache the result
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    // Storage quota exceeded or disabled, continue without caching
    console.warn('⚠️ Unable to cache data:', error);
  }

  return data;
}

/**
 * Clear cached papers data
 */
export function clearPapersCache(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('papers_')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Validate date before making API call
 */
export function validateDate(date: string): { isValid: boolean; error?: string } {
  // Check format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      isValid: false,
      error: 'Invalid date format. Please use YYYY-MM-DD format.'
    };
  }

  // Check if it's a valid date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date provided.'
    };
  }

  // Check if date string matches parsed date (catches invalid dates like 2024-02-31)
  if (date !== parsedDate.toISOString().split('T')[0]) {
    return {
      isValid: false,
      error: 'Invalid date provided.'
    };
  }

  return { isValid: true };
}

/**
 * Get suggested dates with paper activity (mock implementation)
 * In a real app, this could be an actual API endpoint
 */
export function getSuggestedDates(): string[] {
  const today = new Date();
  const dates: string[] = [];

  // Generate last 30 days as suggestions
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Error types for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}