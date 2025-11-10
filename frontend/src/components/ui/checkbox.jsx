import React from 'react'
import { cn } from './utils'

export const Checkbox = React.forwardRef(({ className = '', checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        'h-4 w-4 rounded border-[var(--border)] bg-[var(--input-bg)] text-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] cursor-pointer',
        className
      )}
      {...props}
    />
  )
})
Checkbox.displayName = 'Checkbox'

