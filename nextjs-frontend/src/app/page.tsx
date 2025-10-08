'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Search, AlertCircle, FileText, TrendingUp } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import { PaperCard } from '@/components/ui/PaperCard'
import { PaperListSkeleton } from '@/components/ui/LoadingSkeleton'
import { fetchPapersWithCache, validateDate } from '@/lib/api/papers'
import { formatDateForApi, formatDateForDisplay } from '@/lib/utils'
import { Paper } from '@/types'

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Filter papers based on search query
  const filteredPapers = papers.filter(paper => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      paper.title?.toLowerCase().includes(query) ||
      paper.abstract?.toLowerCase().includes(query) ||
      paper.authors?.some(author => author.toLowerCase().includes(query))
    )
  })

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

  // Initial fetch on component mount
  useEffect(() => {
    fetchPapers(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = () => {
    fetchPapers(selectedDate)
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
            <p className="text-xl opacity-90 max-w-2xl mx-auto mb-8">
              Discover and explore the latest academic papers from HuggingFace.
              Select any date to view papers published that day.
            </p>

            {/* Quick Stats */}
            <div className="flex justify-center items-center gap-8 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>{papers.length} papers today</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDateForDisplay(selectedDate)}</span>
              </div>
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
          <div className="grid md:grid-cols-2 gap-6">
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
              <label className="block text-sm font-medium text-foreground mb-3">
                Search Papers
              </label>
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by title, abstract, or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {!loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-between text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                <span>
                  Showing {filteredPapers.length} of {papers.length} papers
                  {searchQuery && ` for "${searchQuery}"`}
                </span>
              </div>
              {papers.length > 0 && (
                <span className="text-xs">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Papers List */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PaperListSkeleton count={3} />
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center"
            >
              <AlertCircle className="mx-auto mb-4 text-destructive" size={48} />
              <h3 className="text-lg font-medium text-destructive mb-2">
                Error Loading Papers
              </h3>
              <p className="text-destructive/80 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {!loading && !error && filteredPapers.length === 0 && papers.length === 0 && (
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

          {!loading && !error && filteredPapers.length === 0 && papers.length > 0 && (
            <motion.div
              key="no-search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-muted/50 border border-border rounded-lg p-12 text-center"
            >
              <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Search Results
              </h3>
              <p className="text-muted-foreground">
                No papers match your search query &ldquo;{searchQuery}&rdquo;.
                Try different keywords or clear the search.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Clear Search
              </button>
            </motion.div>
          )}

          {!loading && !error && filteredPapers.length > 0 && (
            <motion.div
              key="papers-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredPapers.map((paper, index) => (
                <motion.div
                  key={paper.paper_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <PaperCard paper={paper} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}