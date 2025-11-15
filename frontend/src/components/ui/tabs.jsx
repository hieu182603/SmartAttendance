import React, { createContext, useContext } from 'react'
import { cn } from './utils'

const TabsContext = createContext({
  value: null,
  onValueChange: () => {},
})

const Tabs = ({ className, value, onValueChange, ...props }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('flex flex-col gap-2', className)} {...props} />
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => {
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
})
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
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
})
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const { value: selectedValue } = useContext(TabsContext)
  if (selectedValue !== value) return null

  return (
    <div ref={ref} className={cn('flex-1 outline-none', className)} {...props}>
      {children}
    </div>
  )
})
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }

