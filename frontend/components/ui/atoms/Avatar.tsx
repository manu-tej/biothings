'use client'

import { clsx } from 'clsx'
import { User } from 'lucide-react'
import React, { forwardRef, HTMLAttributes, useState } from 'react'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'busy' | 'away'
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  border?: boolean
  fallbackIcon?: React.ReactNode
  testId?: string
}

const sizeStyles = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
}

const statusSizeStyles = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
  '2xl': 'w-5 h-5 border-2',
}

const statusColorStyles = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
}

const statusPositionStyles = {
  'top-right': 'top-0 right-0',
  'bottom-right': 'bottom-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-left': 'bottom-0 left-0',
}

const iconSizeStyles = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      name,
      size = 'md',
      shape = 'circle',
      status,
      statusPosition = 'bottom-right',
      border = false,
      fallbackIcon,
      testId,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false)

    const initials = name
      ? name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : ''

    const containerStyles = clsx('relative inline-block', className)

    const avatarStyles = clsx(
      'flex items-center justify-center overflow-hidden',
      'bg-gray-200 dark:bg-gray-700',
      sizeStyles[size],
      shape === 'circle' ? 'rounded-full' : 'rounded-lg',
      border && 'ring-2 ring-white dark:ring-gray-900'
    )

    const statusStyles = clsx(
      'absolute rounded-full border-white dark:border-gray-900',
      statusSizeStyles[size],
      status ? statusColorStyles[status] : '',
      statusPositionStyles[statusPosition]
    )

    const renderContent = () => {
      if (src && !imageError) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )
      }

      if (initials) {
        return <span className="font-medium text-gray-700 dark:text-gray-300">{initials}</span>
      }

      const icon = fallbackIcon || <User />
      return (
        <span className={clsx('text-gray-500 dark:text-gray-400', iconSizeStyles[size])}>
          {icon}
        </span>
      )
    }

    return (
      <div ref={ref} className={containerStyles} data-testid={testId} {...props}>
        <div className={avatarStyles}>{renderContent()}</div>
        {status && <span className={statusStyles} aria-label={`Status: ${status}`} />}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

// Avatar Group component for displaying multiple avatars
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: AvatarProps['size']
  spacing?: 'tight' | 'normal' | 'loose'
}

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 3, size = 'md', spacing = 'normal', ...props }, ref) => {
    const childrenArray = React.Children.toArray(children)
    const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray
    const remainingCount = childrenArray.length - visibleChildren.length

    const spacingStyles = {
      tight: '-space-x-2',
      normal: '-space-x-3',
      loose: '-space-x-4',
    }

    return (
      <div
        ref={ref}
        className={clsx('flex items-center', spacingStyles[spacing], className)}
        {...props}
      >
        {visibleChildren.map((child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<AvatarProps>, {
              size,
              border: true,
              style: { zIndex: visibleChildren.length - index },
            })
          }
          return child
        })}
        {remainingCount > 0 && (
          <div
            className={clsx(
              'relative flex items-center justify-center',
              'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
              'font-medium ring-2 ring-white dark:ring-gray-900',
              sizeStyles[size],
              'rounded-full'
            )}
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    )
  }
)

AvatarGroup.displayName = 'AvatarGroup'
