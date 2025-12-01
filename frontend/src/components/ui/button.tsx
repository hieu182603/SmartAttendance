import React from 'react'
import { cn } from '@/components/ui/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      default: 'bg-[var(--primary)] text-white hover:opacity-90',
      outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--surface)] text-[var(--text-main)]',
      ghost: 'bg-transparent hover:bg-[var(--surface)] text-[var(--text-main)]',
    }
    
    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 py-1.5 text-sm',
      lg: 'h-12 px-6 py-3 text-lg',
      icon: 'h-10 w-10 p-0',
    }
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

