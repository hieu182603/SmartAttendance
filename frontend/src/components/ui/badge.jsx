import React from 'react'
import clsx from 'clsx'

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30',
    success: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/30',
    error: 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/30',
  }

  return (
    <span
      ref={ref}
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
        variants[variant] || variants.default,
        className,
      )}
      {...props}
    />
  )
})
Badge.displayName = 'Badge'

export { Badge }






