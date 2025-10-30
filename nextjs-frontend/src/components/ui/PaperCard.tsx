'use client'

import { useState } from 'react'
import { Paper } from '@/types'
import { formatAuthors, truncateText, extractDomain } from '@/lib/utils'
import { Calendar, User, ExternalLink, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface PaperCardProps {
  paper: Paper
}

// Generate consistent color for a topic/tag based on its name
const getTagColor = (tag: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-yellow-100 text-yellow-700 border-yellow-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-red-100 text-red-700 border-red-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
  ]

  // Simple hash function to consistently assign colors
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function PaperCard({ paper }: PaperCardProps) {
  const [isAbstractExpanded, setIsAbstractExpanded] = useState(false)

  const handlePdfClick = () => {
    if (paper.pdf_url) {
      window.open(paper.pdf_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="paper-card p-6 mb-4 bg-card border border-border rounded-lg hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-foreground leading-tight pr-4">
          {paper.title || 'Untitled Paper'}
        </h3>
        {paper.pdf_url && (
          <button
            onClick={handlePdfClick}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors flex-shrink-0"
            title="View PDF"
          >
            <FileText size={16} />
            PDF
          </button>
        )}
      </div>

      {/* Authors */}
      {paper.authors && paper.authors.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <User size={16} />
          <span className="text-sm">
            {formatAuthors(paper.authors, 3)}
          </span>
        </div>
      )}

      {/* Abstract */}
      {paper.abstract && (
        <div className="mb-4">
          <p className="text-foreground/90 leading-relaxed">
            {truncateText(paper.abstract, 300)}
          </p>
        </div>
      )}

      {/* Chinese Abstract - Collapsible */}
      {paper.abstract_zh && (
        <div className="mb-4">
          <button
            onClick={() => setIsAbstractExpanded(!isAbstractExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-2"
          >
            {isAbstractExpanded ? (
              <>
                <ChevronUp size={16} />
                <span>隐藏中文摘要</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                <span>显示中文摘要</span>
              </>
            )}
          </button>

          {isAbstractExpanded && (
            <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-foreground/90 leading-relaxed text-sm">
                {paper.abstract_zh}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Topics/Tags */}
      {paper.topics && paper.topics.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {paper.topics.map((topic, index) => (
              <span
                key={index}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all hover:shadow-sm ${getTagColor(topic)}`}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Calendar size={14} />
          <span>{paper.published_date || 'Date not available'}</span>
        </div>

        {paper.pdf_url && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink size={12} />
            <span>{extractDomain(paper.pdf_url)}</span>
          </div>
        )}
      </div>
    </div>
  )
}