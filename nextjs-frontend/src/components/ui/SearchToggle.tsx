'use client'

import { Globe, Calendar } from 'lucide-react'

export type SearchMode = 'date' | 'global'

interface SearchToggleProps {
  mode: SearchMode
  onModeChange: (mode: SearchMode) => void
  disabled?: boolean
}

export function SearchToggle({ mode, onModeChange, disabled = false }: SearchToggleProps) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1 gap-1">
      {/* Date-specific search button */}
      <button
        onClick={() => onModeChange('date')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
          ${mode === 'date'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Search within selected date only"
      >
        <Calendar size={16} />
        <span>Date</span>
      </button>

      {/* Global search button */}
      <button
        onClick={() => onModeChange('global')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
          ${mode === 'global'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="Search across all cached papers"
      >
        <Globe size={16} />
        <span>Global</span>
      </button>
    </div>
  )
}
