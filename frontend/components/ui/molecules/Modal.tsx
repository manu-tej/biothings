'use client'

import { clsx } from 'clsx'
import { X } from 'lucide-react'
import React, { forwardRef, useEffect, useRef } from 'react'

import { Button } from '../atoms/Button'
import { Card, CardHeader, CardBody, CardFooter } from '../atoms/Card'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  position?: 'center' | 'top'
  closable?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  preventScroll?: boolean
  footer?: React.ReactNode
  className?: string
  overlayClassName?: string
  testId?: string
}

const sizeStyles = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4 my-4 h-[calc(100vh-2rem)]',
}

const positionStyles = {
  center: 'items-center justify-center',
  top: 'items-start justify-center pt-12',
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = 'md',
      position = 'center',
      closable = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      preventScroll = true,
      footer,
      className,
      overlayClassName,
      testId,
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const mergedRef = ref || modalRef

    useEffect(() => {
      if (!isOpen) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onClose()
        }
      }

      const handleFocus = (e: FocusEvent) => {
        if (
          mergedRef &&
          'current' in mergedRef &&
          mergedRef.current &&
          !mergedRef.current.contains(e.target as Node)
        ) {
          mergedRef.current.focus()
        }
      }

      document.addEventListener('keydown', handleEscape)
      document.addEventListener('focusin', handleFocus)

      // Prevent body scroll
      if (preventScroll) {
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.removeEventListener('focusin', handleFocus)
        if (preventScroll) {
          document.body.style.overflow = ''
        }
      }
    }, [isOpen, closeOnEscape, onClose, preventScroll, mergedRef])

    useEffect(() => {
      if (isOpen && mergedRef && 'current' in mergedRef && mergedRef.current) {
        mergedRef.current.focus()
      }
    }, [isOpen, mergedRef])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        onClose()
      }
    }

    return (
      <div
        className={clsx(
          'fixed inset-0 z-50 flex',
          positionStyles[position],
          'bg-black/50 backdrop-blur-sm',
          overlayClassName
        )}
        onClick={handleOverlayClick}
        data-testid={testId}
      >
        <div
          ref={mergedRef}
          className={clsx(
            'relative w-full max-h-[90vh] overflow-auto',
            sizeStyles[size],
            size !== 'full' && 'mx-4',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          tabIndex={-1}
        >
          <Card variant="elevated" className="shadow-2xl">
            {(title || closable) && (
              <CardHeader>
                <div className="flex items-center justify-between">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {title}
                    </h2>
                  )}
                  {closable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onClose}
                      icon={<X />}
                      className="ml-auto"
                      aria-label="Close modal"
                    />
                  )}
                </div>
              </CardHeader>
            )}

            <CardBody className={!title && !closable ? 'pt-6' : ''}>{children}</CardBody>

            {footer && <CardFooter>{footer}</CardFooter>}
          </Card>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'

// Confirmation modal component
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export const ConfirmModal = forwardRef<HTMLDivElement, ConfirmModalProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      variant = 'info',
      loading = false,
    },
    ref
  ) => {
    const confirmVariant = variant === 'danger' ? 'danger' : 'primary'

    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
              {confirmText}
            </Button>
          </div>
        }
      >
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
      </Modal>
    )
  }
)

ConfirmModal.displayName = 'ConfirmModal'

// Hook for modal state management
export const useModal = (defaultOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
