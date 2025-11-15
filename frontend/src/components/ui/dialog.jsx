//dialog.jsx

import React from 'react'
import { X } from 'lucide-react'
import { cn } from './utils'

const DialogContext = React.createContext()

const Dialog = ({ open, onOpenChange, children, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen: handleOpenChange }}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { ...props })
        }
        return child
      })}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef(({ asChild, children, className, ...props }, ref) => {
  const context = React.useContext(DialogContext)

  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      onClick: () => context?.setIsOpen(true),
      ...props
    })
  }

  return (
    <button
      ref={ref}
      className={className}
      onClick={() => context?.setIsOpen(true)}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = 'DialogTrigger'

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const context = React.useContext(DialogContext)

  if (!context?.isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => context?.setIsOpen(false)}
      />
      <div
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border rounded-2xl p-6 shadow-lg duration-200',
          className
        )}
        {...props}
      >
        <button
          onClick={() => context?.setIsOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  )
})
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription }

