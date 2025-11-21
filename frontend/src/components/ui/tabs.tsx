import React, { createContext, useContext, useState } from 'react'
import { cn } from './utils'

interface TabsContextType {
  value: string | null
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextType>({
  value: null,
  onValueChange: () => {},
})

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

const Tabs = ({ className, value: controlledValue, onValueChange, defaultValue, ...props }: TabsProps) => {
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue || null)
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    if (onValueChange) {
      onValueChange(newValue)
    }
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('flex flex-col gap-2', className)} {...props} />
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex h-9 w-fit items-center justify-center rounded-xl bg-[var(--shell)] p-1',
          className,
        )}
        {...props}
      />
    )
  }
)
TabsList.displayName = 'TabsList'

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useContext(TabsContext)
    const isActive = selectedValue === value

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onValueChange(value)}
        className={cn(
          'inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'bg-[var(--surface)] text-[var(--text-main)] shadow-sm'
            : 'text-[var(--text-sub)] hover:text-[var(--text-main)]',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue } = useContext(TabsContext)
    if (selectedValue !== value) return null

    return (
      <div ref={ref} className={cn('flex-1 outline-none', className)} {...props}>
        {children}
      </div>
    )
  }
)
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }

