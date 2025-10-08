// TypeScript type definitions for Daily Paper Extractor

export interface Paper {
  title: string;
  authors: string[];
  abstract: string;
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
  papers: Paper[];
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