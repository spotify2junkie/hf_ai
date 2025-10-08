'use client'

import { Paper } from '@/types'
import { formatAuthors, truncateText, extractDomain } from '@/lib/utils'
import { Calendar, User, ExternalLink, FileText } from 'lucide-react'

interface PaperCardProps {
  paper: Paper
}

export function PaperCard({ paper }: PaperCardProps) {
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