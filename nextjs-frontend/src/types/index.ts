// General application types and utilities

export * from './paper';

// Common UI types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<any>;
  isActive?: boolean;
}

// Form types
export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Generic API types
export interface ApiRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
  statusCode?: number;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Date utility types
export type DateString = string; // YYYY-MM-DD format
export type ISODateString = string; // ISO 8601 format

// Component size variants
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

// Loading states
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// Search and filter types
export interface SearchState {
  query: string;
  isSearching: boolean;
  results: any[];
  totalResults: number;
}

export interface SortConfig<T = string> {
  field: T;
  direction: 'asc' | 'desc';
}