//select.jsx

import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './utils'

const SelectContext = React.createContext()

const Select = ({ value, onValueChange, children, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || '')
  const [items, setItems] = React.useState({})

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  const registerItem = (itemValue, itemLabel) => {
    setItems(prev => ({ ...prev, [itemValue]: itemLabel }))
  }

  return (
    <SelectContext.Provider value={{ isOpen, setIsOpen, selectedValue, handleValueChange, registerItem, items }}>
      <div className="relative" {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {})
          }
          return child
        })}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
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
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = ({ placeholder, ...props }) => {
  const context = React.useContext(SelectContext)
  const displayText = context?.selectedValue ? context.items?.[context.selectedValue] : placeholder
  return <span {...props}>{displayText || placeholder}</span>
}
SelectValue.displayName = 'SelectValue'

const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => {
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
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border p-1 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  const isSelected = context?.selectedValue === value

  React.useEffect(() => {
    if (value && children && context?.registerItem) {
      context.registerItem(value, children)
    }
    // Chỉ depend vào value và children, không depend vào context object
  }, [value, children])

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-[var(--shell)] focus:bg-[var(--shell)]',
        isSelected && 'bg-[var(--shell)]',
        className
      )}
      onClick={() => context?.handleValueChange(value)}
      {...props}
    >
      {children}
    </div>
  )
})
SelectItem.displayName = 'SelectItem'

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }


