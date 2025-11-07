import React from 'react'

export const Checkbox = React.forwardRef(({ className = '', checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={`h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-2 focus:ring-cyan-500 ${className}`}
      {...props}
    />
  )
})
Checkbox.displayName = 'Checkbox'

