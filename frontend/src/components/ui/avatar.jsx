import React from 'react'
import { cn } from './utils'

const Avatar = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className
      )}
      {...props}
    />
  )
})
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef(({ className, src, alt, ...props }, ref) => {
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-[var(--primary)]',
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }

