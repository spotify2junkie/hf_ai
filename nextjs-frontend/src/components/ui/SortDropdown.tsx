'use client'

import { ArrowUpDown, TrendingDown, TrendingUp, CalendarArrowDown, CalendarArrowUp } from 'lucide-react'

export type SortBy = 'upvotes' | 'date'
export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  sortBy: SortBy
  order: SortOrder
}

interface SortDropdownProps {
  sortConfig: SortConfig
  onSortChange: (config: SortConfig) => void
  disabled?: boolean
}

const sortOptions = [
  {
    label: 'Most Popular',
    sortBy: 'upvotes' as SortBy,
    order: 'desc' as SortOrder,
    icon: TrendingDown,
    description: 'Sort by upvotes (high to low)'
  },
  {
    label: 'Least Popular',
    sortBy: 'upvotes' as SortBy,
    order: 'asc' as SortOrder,
    icon: TrendingUp,
    description: 'Sort by upvotes (low to high)'
  },
  {
    label: 'Newest First',
    sortBy: 'date' as SortBy,
    order: 'desc' as SortOrder,
    icon: CalendarArrowDown,
    description: 'Sort by date (newest first)'
  },
  {
    label: 'Oldest First',
    sortBy: 'date' as SortBy,
    order: 'asc' as SortOrder,
    icon: CalendarArrowUp,
    description: 'Sort by date (oldest first)'
  }
]

export function SortDropdown({ sortConfig, onSortChange, disabled = false }: SortDropdownProps) {
  const currentOption = sortOptions.find(
    opt => opt.sortBy === sortConfig.sortBy && opt.order === sortConfig.order
  ) || sortOptions[0]

  const CurrentIcon = currentOption.icon

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-foreground mb-3">
        Sort By
      </label>
      <div className="relative">
        <select
          value={`${sortConfig.sortBy}-${sortConfig.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split('-') as [SortBy, SortOrder]
            onSortChange({ sortBy, order })
          }}
          disabled={disabled}
          className={`
            w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            transition-all appearance-none cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
          `}
          aria-label="Sort papers by"
        >
          {sortOptions.map((option) => (
            <option
              key={`${option.sortBy}-${option.order}`}
              value={`${option.sortBy}-${option.order}`}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <CurrentIcon size={20} className="text-muted-foreground" />
        </div>

        {/* Dropdown Arrow */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ArrowUpDown size={16} className="text-muted-foreground" />
        </div>
      </div>

      {/* Helper text */}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {currentOption.description}
      </p>
    </div>
  )
}
