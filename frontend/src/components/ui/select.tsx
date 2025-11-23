//select.tsx

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './utils'

interface SelectContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedValue: string
  handleValueChange: (value: string) => void
  registerItem: (value: string, label: React.ReactNode) => void
  items: Record<string, React.ReactNode>
}

const SelectContext = React.createContext<SelectContextType | null>(null)

interface SelectProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const Select = ({ value, onValueChange, disabled, children, ...props }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || '')
  const [items, setItems] = React.useState<Record<string, React.ReactNode>>({})

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue: string) => {
    if (disabled) return
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  const registerItem = (itemValue: string, itemLabel: React.ReactNode) => {
    setItems(prev => ({ ...prev, [itemValue]: itemLabel }))
  }

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen: disabled ? () => {} : setIsOpen, selectedValue, handleValueChange, registerItem, items }}>
      <div className="relative" {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { disabled: disabled || child.props.disabled })
          }
          return child
        })}
      </div>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => context?.setIsOpen(!context?.isOpen)}
        {...props}
      >
        {children || <span className="text-[var(--text-sub)]">Chọn...</span>}
        <ChevronDown className={`h-4 w-4 text-[var(--text-sub)] transition-transform ${context?.isOpen ? 'rotate-180' : ''}`} />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

const SelectValue = ({ placeholder, ...props }: SelectValueProps) => {
  const context = React.useContext(SelectContext)
  const displayText = context?.selectedValue ? context.items?.[context.selectedValue] : placeholder
  return <span {...props}>{displayText || placeholder}</span>
}
SelectValue.displayName = 'SelectValue'

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)

    if (!context?.isOpen) return null

    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => context?.setIsOpen(false)}
        />
        <div
          ref={ref}
          className={cn(
            'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    const isSelected = context?.selectedValue === value

    React.useEffect(() => {
      if (value && children && context?.registerItem) {
        context.registerItem(value, children)
      }
      // Chỉ depend vào value và children, không depend vào context object
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, children])

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors',
          'hover:bg-[var(--primary)]/30 hover:text-[var(--primary)]',
          'focus:bg-[var(--primary)]/30 focus:text-[var(--primary)]',
          isSelected && 'bg-[var(--primary)]/40 text-[var(--primary)] font-medium',
          className
        )}
        onClick={() => context?.handleValueChange(value)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }

