import React from 'react'
import { cn } from './utils'

export const Input = React.forwardRef(({ className = '', ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

