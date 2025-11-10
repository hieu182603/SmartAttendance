import * as React from 'react'
import { OTPInput, OTPInputContext } from 'input-otp'
import { Minus } from 'lucide-react'
import { cn } from './utils'

const InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => {
  return (
    <OTPInput
      ref={ref}
      containerClassName={cn(
        'flex items-center gap-2 has-disabled:opacity-50',
        containerClassName
      )}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
})
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  )
})
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center border-y border-r border-[var(--border)] text-sm bg-[var(--input-bg)] text-[var(--text-main)] transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md',
        'data-[active=true]:z-10 data-[active=true]:border-[var(--primary)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--primary)]/20',
        'aria-invalid:border-red-500 data-[active=true]:aria-invalid:border-red-500',
        className
      )}
      data-active={isActive}
      {...props}
    >
      <span className="text-[var(--text-main)] font-medium">{char}</span>
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-[var(--text-main)] duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = 'InputOTPSlot'

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => {
  return (
    <div ref={ref} role="separator" {...props}>
      <Minus className="h-4 w-4 text-[var(--text-sub)]" />
    </div>
  )
})
InputOTPSeparator.displayName = 'InputOTPSeparator'

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }

