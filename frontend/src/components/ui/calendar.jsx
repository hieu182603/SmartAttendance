import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from './utils'
import 'react-day-picker/dist/style.css'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        caption: 'flex justify-center pt-1 relative items-center w-full',
        caption_label: 'text-sm font-medium text-[var(--text-main)]',
        nav: 'flex items-center gap-1',
        nav_button: cn(
          'inline-flex items-center justify-center rounded-xl h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-[var(--text-main)] hover:bg-[var(--surface)]',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-x-1',
        head_row: 'flex',
        head_cell:
          'text-[var(--text-sub)] rounded-md w-8 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[var(--shell)] [&:has([aria-selected].day-range-end)]:rounded-r-md',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md',
        ),
        day: cn(
          'inline-flex items-center justify-center rounded-xl h-8 w-8 p-0 font-normal aria-selected:opacity-100 text-[var(--text-main)] hover:bg-[var(--surface)]',
        ),
        day_range_start:
          'day-range-start aria-selected:bg-[var(--primary)] aria-selected:text-white',
        day_range_end:
          'day-range-end aria-selected:bg-[var(--primary)] aria-selected:text-white',
        day_selected:
          'bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white focus:bg-[var(--primary)] focus:text-white',
        day_today: 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] font-semibold',
        day_outside:
          'day-outside text-[var(--text-sub)] aria-selected:text-[var(--text-sub)]',
        day_disabled: 'text-[var(--text-sub)] opacity-50',
        day_range_middle:
          'aria-selected:bg-[var(--shell)] aria-selected:text-[var(--text-main)]',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn('h-4 w-4', className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn('h-4 w-4', className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }

