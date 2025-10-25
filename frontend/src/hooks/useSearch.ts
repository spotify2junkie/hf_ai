import { useState, useCallback, useEffect } from 'react';
import { SearchResponse } from '../types';
import PapersAPI from '../services/api';

interface UseSearchResult {
  searchResponse: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;
  performSearch: (query: string, page?: number) => Promise<void>;
  clearSearch: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
}

/**
 * Custom hook for managing search state and operations
 * Includes debouncing, pagination, and error handling
 */
export function useSearch(pageSize: number = 10): UseSearchResult {
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Perform search with the current query and page
  const performSearch = useCallback(async (query: string, page: number = 1) => {
    // Validate minimum query length
    if (query.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      setSearchResponse(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchQuery(query);
    setCurrentPage(page);

    try {
      const response = await PapersAPI.searchPapers(query, page, pageSize);
      setSearchResponse(response);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search papers';
      setError(errorMessage);
      setSearchResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // Clear search results and reset state
  const clearSearch = useCallback(() => {
    setSearchResponse(null);
    setSearchQuery('');
    setCurrentPage(1);
    setError(null);
    setIsLoading(false);
  }, []);

  // Navigate to specific page
  const goToPage = useCallback((page: number) => {
    if (searchQuery && searchResponse) {
      performSearch(searchQuery, page);
    }
  }, [searchQuery, searchResponse, performSearch]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    if (searchResponse?.pagination.hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [searchResponse, currentPage, goToPage]);

  // Navigate to previous page
  const previousPage = useCallback(() => {
    if (searchResponse?.pagination.hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [searchResponse, currentPage, goToPage]);

  return {
    searchResponse,
    isLoading,
    error,
    searchQuery,
    currentPage,
    performSearch,
    clearSearch,
    goToPage,
    nextPage,
    previousPage,
  };
}

export default useSearch;
