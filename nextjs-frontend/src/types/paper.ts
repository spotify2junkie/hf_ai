// TypeScript type definitions for Daily Paper Extractor

export interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  abstract_zh?: string; // Chinese translation of abstract
  pdf_url: string | null;
  topics: string[];
  published_date: string;
  paper_id: string | null;
  upvotes: number;
}

export interface ApiResponse {
  success: boolean;
  date: string;
  count: number;
  data: Paper[]; // Changed from 'papers' to 'data' for backend compatibility
  source?: string; // 'cache' or 'api'
}

export interface ApiError {
  error: string;
  details?: string;
  provided?: string;
  example?: string;
  maxDate?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaperFilters {
  searchQuery: string;
  selectedTopics: string[];
  authorFilter: string;
  sortBy: 'title' | 'authors' | 'upvotes' | 'date';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Global Search Types
export interface GlobalSearchResult extends Paper {
  matchScore: number;  // 0-100 score (100 = perfect match)
  rawScore?: number;   // Original Fuse.js score (0-1)
}

export interface GlobalSearchPagination {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GlobalSearchMetadata {
  executionTime: number;      // Search execution time in ms
  searchedPapers: number;      // Total papers searched
  threshold: number;           // Fuse.js threshold used
  maxResults: number;          // Maximum results returned
}

export interface GlobalSearchResponse {
  success: boolean;
  query: string;
  results: GlobalSearchResult[];
  pagination: GlobalSearchPagination;
  searchMetadata: GlobalSearchMetadata;
  searchMode?: 'global' | 'date';  // Optional search mode indicator
}

// Component prop types
export interface PaperCardProps {
  paper: Paper;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export interface PaperTableProps {
  papers: Paper[];
  filters?: PaperFilters;
  onFilterChange?: (filters: PaperFilters) => void;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
}

export interface DatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  disabled?: boolean;
  maxDate?: Date;
  minDate?: Date;
}