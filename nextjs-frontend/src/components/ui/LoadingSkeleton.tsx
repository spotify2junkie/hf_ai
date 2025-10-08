'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse", className)}>
      {/* Paper Card Skeleton */}
      <div className="paper-card p-6 mb-4 bg-card border border-border rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
          <div className="h-10 w-16 bg-muted rounded"></div>
        </div>

        {/* Authors */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>

        {/* Abstract */}
        <div className="mb-4 space-y-2">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-24"></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PaperListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <LoadingSkeleton key={index} />
      ))}
    </div>
  )
}