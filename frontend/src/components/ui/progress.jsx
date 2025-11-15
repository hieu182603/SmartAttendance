import React from 'react'
import clsx from 'clsx'

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(
        'relative h-2 w-full overflow-hidden rounded-full bg-[var(--shell)]',
        className,
      )}
      {...props}
    >
      <div
        className="h-full bg-[var(--accent-cyan)] transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
})
Progress.displayName = 'Progress'

export { Progress }

