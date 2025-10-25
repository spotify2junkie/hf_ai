import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
  disabled?: boolean;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  isLoading,
  disabled = false,
  initialValue = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      onSearch(debouncedQuery.trim());
    }
  }, [debouncedQuery, onSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    onClear();
    inputRef.current?.focus();
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim().length >= 2) {
      e.preventDefault();
      onSearch(query.trim());
    }
  };

  // Show validation error for short queries
  const showError = query.length > 0 && query.length < 2;

  return (
    <div className="w-full">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className={`h-5 w-5 ${isLoading ? 'animate-spin text-blue-600' : 'text-gray-400'}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            {isLoading ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                clipRule="evenodd"
                opacity="0.3"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            )}
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder="Search papers by topics... (e.g., machine learning, NLP)"
          className={`block w-full pl-10 pr-12 py-3 border ${
            showError ? 'border-red-300' : 'border-gray-300'
          } rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`}
          aria-label="Search papers"
          aria-describedby={showError ? 'search-error' : undefined}
          aria-invalid={showError}
        />

        {/* Clear Button */}
        {query.length > 0 && !isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-full p-1"
              aria-label="Clear search"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Validation Error */}
      {showError && (
        <p id="search-error" className="mt-2 text-sm text-red-600" role="alert">
          Please enter at least 2 characters to search
        </p>
      )}

      {/* Search Tip */}
      {query.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Tip: Use keywords like "machine learning", "computer vision", or "NLP" for best results
        </p>
      )}

      {/* Debounce indicator */}
      {query !== debouncedQuery && query.length >= 2 && (
        <p className="mt-2 text-xs text-gray-500">
          Searching...
        </p>
      )}
    </div>
  );
};

export default SearchBar;
