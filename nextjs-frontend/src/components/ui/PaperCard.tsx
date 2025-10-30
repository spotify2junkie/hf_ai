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
    <div className="paper-card h-full flex flex-col p-5 bg-card border border-border rounded-lg hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-foreground leading-tight pr-2 line-clamp-2">
          {paper.title || 'Untitled Paper'}
        </h3>
        {paper.pdf_url && (
          <button
            onClick={handlePdfClick}
            className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors flex-shrink-0"
            title="View PDF"
          >
            <FileText size={14} />
            PDF
          </button>
        )}
      </div>

      {/* Authors */}
      {paper.authors && paper.authors.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <User size={14} />
          <span className="text-xs truncate">
            {formatAuthors(paper.authors, 2)}
          </span>
        </div>
      )}

      {/* Abstract */}
      {paper.abstract && (
        <div className="mb-3">
          <p className="text-foreground/80 leading-relaxed text-sm line-clamp-3">
            {paper.abstract}
          </p>
        </div>
      )}

      {/* Chinese Abstract - Collapsible */}
      {paper.abstract_zh && (
        <div className="mb-3">
          <button
            onClick={() => setIsAbstractExpanded(!isAbstractExpanded)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mb-2"
          >
            {isAbstractExpanded ? (
              <>
                <ChevronUp size={14} />
                <span>隐藏中文</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>中文摘要</span>
              </>
            )}
          </button>

          {isAbstractExpanded && (
            <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-foreground/90 leading-relaxed text-xs">
                {paper.abstract_zh}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Topics/Tags */}
      {paper.topics && paper.topics.length > 0 && (
        <div className="mb-3 flex-grow">
          <div className="flex flex-wrap gap-1.5">
            {paper.topics.slice(0, 6).map((topic, index) => (
              <span
                key={index}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-all hover:shadow-sm ${getTagColor(topic)}`}
                title={topic}
              >
                {topic.length > 15 ? topic.substring(0, 15) + '...' : topic}
              </span>
            ))}
            {paper.topics.length > 6 && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                +{paper.topics.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer - pushed to bottom */}
      <div className="flex items-center justify-between pt-3 mt-auto border-t border-border/50">
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Calendar size={12} />
          <span className="truncate">{paper.published_date || 'N/A'}</span>
        </div>

        {paper.upvotes > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>👍 {paper.upvotes}</span>
          </div>
        )}
      </div>
    </div>
  )
}