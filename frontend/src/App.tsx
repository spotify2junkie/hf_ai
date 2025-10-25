import React, { useState } from 'react';
import DatePicker from './components/DatePicker';
import PapersTable from './components/PapersTable';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import SearchBar from './components/SearchBar';
import SearchResults from './components/SearchResults';
import { Paper, LoadingState } from './types';
import PapersAPI from './services/api';
import { useSearch } from './hooks/useSearch';
import './App.css';

function App() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Search functionality
  const {
    searchResponse,
    isLoading: isSearching,
    error: searchError,
    performSearch,
    clearSearch,
    goToPage,
    nextPage,
    previousPage,
  } = useSearch();

  // Track if we're in search mode
  const isSearchMode = searchResponse !== null || isSearching || searchError !== null;

  const handleDateSelect = async (date: Date) => {
    // Clear search when switching to date mode
    clearSearch();

    setSelectedDate(date);

    // Validate date
    if (!PapersAPI.isValidDate(date)) {
      setLoadingState({
        isLoading: false,
        error: 'Cannot fetch papers for future dates'
      });
      return;
    }

    // Start loading
    setLoadingState({
      isLoading: true,
      error: null
    });
    setPapers([]);

    try {
      const dateString = PapersAPI.formatDate(date);
      const response = await PapersAPI.fetchPapers(dateString);

      setPapers(response.papers);
      setLoadingState({
        isLoading: false,
        error: null
      });

    } catch (error) {
      setLoadingState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch papers'
      });
      setPapers([]);
    }
  };

  const handleSearch = (query: string) => {
    // Clear date-based results when searching
    setPapers([]);
    setLoadingState({ isLoading: false, error: null });
    performSearch(query);
  };

  const handleClearSearch = () => {
    clearSearch();
  };

  const handleRetry = () => {
    if (selectedDate) {
      handleDateSelect(selectedDate);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              📚 Daily Paper Extractor
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Discover academic papers from HuggingFace daily collection
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Search Papers
            </h2>
            <SearchBar
              onSearch={handleSearch}
              onClear={handleClearSearch}
              isLoading={isSearching}
              disabled={loadingState.isLoading}
            />
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Browse by Date
            </h2>
            <DatePicker
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              disabled={loadingState.isLoading || isSearching}
            />
          </div>
        </div>

        {/* Loading State */}
        {loadingState.isLoading && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <LoadingSpinner />
          </div>
        )}

        {/* Search Loading State */}
        {isSearching && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <LoadingSpinner />
            <p className="text-center text-sm text-gray-600 mt-4">
              Searching papers...
            </p>
          </div>
        )}

        {/* Search Error State */}
        {searchError && !isSearching && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error searching papers
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {searchError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResponse && !isSearching && !searchError && (
          <SearchResults
            searchResponse={searchResponse}
            onPageChange={goToPage}
            onPrevious={previousPage}
            onNext={nextPage}
          />
        )}

        {/* Date-based Error State */}
        {loadingState.error && !isSearchMode && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error fetching papers
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {loadingState.error}
                </p>
              </div>
              {selectedDate && (
                <div className="ml-4">
                  <button
                    onClick={handleRetry}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Date-based Results */}
        {papers.length > 0 && !loadingState.isLoading && !isSearchMode && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Found {papers.length} papers for{' '}
                {selectedDate?.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
            </div>
            <PapersTable papers={papers} />
          </div>
        )}

        {/* Date-based Empty State */}
        {papers.length === 0 && !loadingState.isLoading && !loadingState.error && selectedDate && !isSearchMode && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No papers found
            </h3>
            <p className="text-gray-600">
              No papers were found for{' '}
              {selectedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Welcome State */}
        {!selectedDate && !loadingState.isLoading && !isSearchMode && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <span className="text-6xl mb-4 block">🔍</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a date or search for papers
            </h3>
            <p className="text-gray-600">
              Use the search bar above to find papers by topics, or choose a date to browse papers from HuggingFace
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Daily Paper Extractor MVP - Powered by HuggingFace API
          </p>
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;