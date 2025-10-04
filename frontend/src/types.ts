// TypeScript type definitions for the MVP

export interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  pdf_url: string | null;
  topics: string[];
  published_date: string;
}

export interface ApiResponse {
  success: boolean;
  date: string;
  count: number;
  papers: Paper[];
}

export interface ApiError {
  error: string;
  details?: string;
  provided?: string;
  example?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}