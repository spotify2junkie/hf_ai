'use client'

import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}

export function DatePicker({ selectedDate, onDateChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date)
      setIsOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Date Display Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors w-full"
      >
        <Calendar size={20} className="text-primary" />
        <div className="text-left">
          <div className="text-sm font-medium text-foreground">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-xs text-muted-foreground">
            Click to change date
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            "text-muted-foreground transition-transform ml-auto",
            isOpen && "rotate-90"
          )}
        />
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar */}
          <div className="absolute top-full left-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date > new Date()}
              showOutsideDays={false}
              className="text-foreground"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-muted transition-colors",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-muted transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}