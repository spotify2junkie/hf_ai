'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Search, AlertCircle, FileText, TrendingUp } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import { PaperCard } from '@/components/ui/PaperCard'
import { PaperListSkeleton } from '@/components/ui/LoadingSkeleton'
import { SearchToggle, SearchMode } from '@/components/ui/SearchToggle'
import { SortDropdown, SortConfig } from '@/components/ui/SortDropdown'
import { fetchPapersWithCache, validateDate, searchPapersGlobal } from '@/lib/api/papers'
import { formatDateForApi, formatDateForDisplay } from '@/lib/utils'
import { Paper, GlobalSearchResult } from '@/types'

export default function Home() {
  // Date-specific search state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchMode, setSearchMode] = useState<SearchMode>('date')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Global search state
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([])
  const [globalSearchLoading, setGlobalSearchLoading] = useState<boolean>(false)
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null)
  const [searchStats, setSearchStats] = useState<{ totalResults: number; executionTime: number } | null>(null)

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sortBy: 'upvotes',
    order: 'desc'
  })

  // Sorting function
  const sortPapers = useCallback(<T extends Paper>(papers: T[]): T[] => {
    return [...papers].sort((a, b) => {
      let comparison = 0

      if (sortConfig.sortBy === 'upvotes') {
        comparison = a.upvotes - b.upvotes
      } else if (sortConfig.sortBy === 'date') {
        const dateA = new Date(a.published_date).getTime()
        const dateB = new Date(b.published_date).getTime()
        comparison = dateA - dateB
      }

      return sortConfig.order === 'asc' ? comparison : -comparison
    })
  }, [sortConfig])

  // Filter and sort papers based on search query
  const filteredPapers = useMemo(() => {
    const filtered = papers.filter(paper => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        paper.title?.toLowerCase().includes(query) ||
        paper.abstract?.toLowerCase().includes(query) ||
        paper.authors?.some(author => author.toLowerCase().includes(query))
      )
    })

    return sortPapers(filtered)
  }, [papers, searchQuery, sortPapers])

  // Sort global search results
  const sortedGlobalResults = useMemo(() => {
    return sortPapers(globalSearchResults)
  }, [globalSearchResults, sortPapers])

  const fetchPapers = async (date: Date) => {
    setLoading(true)
    setError(null)

    try {
      const dateString = formatDateForApi(date)

      // Validate date first
      const validation = validateDate(dateString)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      const response = await fetchPapersWithCache(dateString)

      if (response.success) {
        setPapers((response.data as Paper[]) || [])
      } else {
        throw new Error(response.error || 'Failed to fetch papers')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setPapers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
    fetchPapers(date)
  }

  // Global search handler
  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setGlobalSearchResults([])
      setSearchStats(null)
      setGlobalSearchError(null)
      return
    }

    setGlobalSearchLoading(true)
    setGlobalSearchError(null)

    try {
      const response = await searchPapersGlobal(query, 1, 50) // Fetch top 50 results

      if (response.success) {
        setGlobalSearchResults(response.results)
        setSearchStats({
          totalResults: response.pagination.totalResults,
          executionTime: response.searchMetadata.executionTime
        })
      } else {
        throw new Error('Search failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setGlobalSearchError(errorMessage)
      setGlobalSearchResults([])
      setSearchStats(null)
    } finally {
      setGlobalSearchLoading(false)
    }
  }, [])

  // Debounced global search effect
  useEffect(() => {
    if (searchMode === 'global' && searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        performGlobalSearch(searchQuery)
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    } else if (searchMode === 'global' && searchQuery.trim().length === 0) {
      setGlobalSearchResults([])
      setSearchStats(null)
    }
  }, [searchQuery, searchMode, performGlobalSearch])

  // Handle search mode change
  const handleSearchModeChange = (mode: SearchMode) => {
    setSearchMode(mode)
    setSearchQuery('') // Clear search when switching modes
    setGlobalSearchResults([])
    setGlobalSearchError(null)
    setSearchStats(null)
  }

  // Initial fetch on component mount
  useEffect(() => {
    fetchPapers(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = () => {
    if (searchMode === 'global' && searchQuery.trim().length >= 2) {
      performGlobalSearch(searchQuery)
    } else {
      fetchPapers(selectedDate)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white py-16 mb-8">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Daily Paper Extractor
            </h1>
            <p className="text-xl opacity-90 max-w-4xl mx-auto mb-8 px-6 sm:px-0">
              Discover and explore the latest academic papers from HuggingFace.
              Select any date to view papers published that day.
            </p>

            {/* Quick Stats */}
            <div className="flex justify-center items-center gap-8 text-sm opacity-80">
              {searchMode === 'date' ? (
                <>
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>{papers.length} papers today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{formatDateForDisplay(selectedDate)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Search size={16} />
                    <span>Global Search Mode</span>
                  </div>
                  {searchStats && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <span>{searchStats.totalResults} results found</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-16">
        {/* Controls Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm"
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Select Date
              </label>
              <DatePicker
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
              />
            </div>

            {/* Search */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-foreground">
                  Search Papers
                </label>
                <SearchToggle
                  mode={searchMode}
                  onModeChange={handleSearchModeChange}
                  disabled={loading || globalSearchLoading}
                />
              </div>
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder={
                    searchMode === 'global'
                      ? 'Search all papers by title, abstract, topics, authors...'
                      : 'Filter current date by title, abstract, author...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              {searchMode === 'global' && searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Type at least 2 characters to search
                </p>
              )}
            </div>

            {/* Sort Dropdown */}
            <div>
              <SortDropdown
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                disabled={loading || globalSearchLoading}
              />
            </div>
          </div>

          {/* Results Summary */}
          {!loading && !globalSearchLoading && !error && !globalSearchError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-between text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                {searchMode === 'global' ? (
                  <span>
                    {sortedGlobalResults.length > 0 ? (
                      <>
                        Found {searchStats?.totalResults || 0} results
                        {searchStats?.executionTime && ` in ${searchStats.executionTime}ms`}
                        {searchQuery && ` for "${searchQuery}"`}
                      </>
                    ) : (
                      <>
                        {searchQuery.trim().length >= 2 ? 'No results found' : 'Start typing to search all papers'}
                      </>
                    )}
                  </span>
                ) : (
                  <span>
                    Showing {filteredPapers.length} of {papers.length} papers
                    {searchQuery && ` matching "${searchQuery}"`}
                  </span>
                )}
              </div>
              {searchMode === 'date' && papers.length > 0 && (
                <span className="text-xs">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Papers List */}
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {(loading || globalSearchLoading) && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PaperListSkeleton count={3} />
            </motion.div>
          )}

          {/* Error State */}
          {((searchMode === 'date' && error) || (searchMode === 'global' && globalSearchError)) && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center"
            >
              <AlertCircle className="mx-auto mb-4 text-destructive" size={48} />
              <h3 className="text-lg font-medium text-destructive mb-2">
                {searchMode === 'global' ? 'Error Searching Papers' : 'Error Loading Papers'}
              </h3>
              <p className="text-destructive/80 mb-4">
                {searchMode === 'global' ? globalSearchError : error}
              </p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Date Mode: No Papers Found */}
          {searchMode === 'date' && !loading && !error && filteredPapers.length === 0 && papers.length === 0 && (
            <motion.div
              key="no-papers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-muted/50 border border-border rounded-lg p-12 text-center"
            >
              <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Papers Found
              </h3>
              <p className="text-muted-foreground">
                No papers were published on {formatDateForDisplay(selectedDate)}.
                Try selecting a different date.
              </p>
            </motion.div>
          )}

          {/* Date Mode: No Search Results */}
          {searchMode === 'date' && !loading && !error && filteredPapers.length === 0 && papers.length > 0 && (
            <motion.div
              key="no-search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-muted/50 border border-border rounded-lg p-12 text-center"
            >
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Matching Papers
              </h3>
              <p className="text-muted-foreground">
                No papers match your filter &ldquo;{searchQuery}&rdquo; on {formatDateForDisplay(selectedDate)}.
                Try different keywords or clear the filter.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Clear Filter
              </button>
            </motion.div>
          )}

          {/* Global Mode: No Results */}
          {searchMode === 'global' && !globalSearchLoading && !globalSearchError &&
           searchQuery.trim().length >= 2 && sortedGlobalResults.length === 0 && (
            <motion.div
              key="no-global-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-muted/50 border border-border rounded-lg p-12 text-center"
            >
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Papers Found
              </h3>
              <p className="text-muted-foreground">
                No papers match your search &ldquo;{searchQuery}&rdquo; across all cached dates.
                Try different keywords or check your spelling.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Clear Search
              </button>
            </motion.div>
          )}

          {/* Global Mode: Empty State */}
          {searchMode === 'global' && !globalSearchLoading && !globalSearchError &&
           searchQuery.trim().length < 2 && (
            <motion.div
              key="global-empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-muted/50 border border-border rounded-lg p-12 text-center"
            >
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Global Search Ready
              </h3>
              <p className="text-muted-foreground">
                Search across all cached papers by title, abstract, topics, or authors.
                Type at least 2 characters to begin searching.
              </p>
            </motion.div>
          )}

          {/* Date Mode: Show Papers */}
          {searchMode === 'date' && !loading && !error && filteredPapers.length > 0 && (
            <motion.div
              key="date-papers-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredPapers.map((paper, index) => (
                <motion.div
                  key={paper.paper_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <PaperCard paper={paper} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Global Mode: Show Search Results */}
          {searchMode === 'global' && !globalSearchLoading && !globalSearchError && sortedGlobalResults.length > 0 && (
            <motion.div
              key="global-papers-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {sortedGlobalResults.map((paper, index) => (
                <motion.div
                  key={paper.paper_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <PaperCard paper={paper} />
                  {paper.matchScore && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        Relevance: {paper.matchScore}%
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}