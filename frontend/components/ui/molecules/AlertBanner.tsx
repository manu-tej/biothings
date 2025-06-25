'use client';

import { clsx } from 'clsx';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  X,
  ExternalLink 
} from 'lucide-react';
import React, { forwardRef, useState } from 'react';

import { Button } from '../atoms/Button';

export interface AlertAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  external?: boolean;
}

export interface AlertBannerProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  actions?: AlertAction[];
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  border?: boolean;
  className?: string;
  testId?: string;
}

const variantStyles = {
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
    defaultIcon: Info,
  },
  success: {
    container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    title: 'text-green-900 dark:text-green-100',
    message: 'text-green-800 dark:text-green-200',
    icon: 'text-green-600 dark:text-green-400',
    defaultIcon: CheckCircle,
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-600 dark:text-yellow-400',
    defaultIcon: AlertTriangle,
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-800 dark:text-red-200',
    icon: 'text-red-600 dark:text-red-400',
    defaultIcon: AlertCircle,
  },
};

const sizeStyles = {
  sm: {
    container: 'p-3',
    icon: 'w-4 h-4',
    title: 'text-sm font-medium',
    message: 'text-sm',
    actions: 'gap-2 mt-2',
  },
  md: {
    container: 'p-4',
    icon: 'w-5 h-5',
    title: 'text-base font-medium',
    message: 'text-sm',
    actions: 'gap-3 mt-3',
  },
  lg: {
    container: 'p-5',
    icon: 'w-6 h-6',
    title: 'text-lg font-medium',
    message: 'text-base',
    actions: 'gap-3 mt-4',
  },
};

export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      variant = 'info',
      title,
      message,
      actions = [],
      dismissible = false,
      onDismiss,
      icon,
      showIcon = true,
      size = 'md',
      rounded = true,
      border = true,
      className,
      testId,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);
    
    if (!isVisible) return null;

    const styles = variantStyles[variant];
    const sizes = sizeStyles[size];
    const DefaultIcon = styles.defaultIcon;
    const displayIcon = icon || (showIcon ? <DefaultIcon /> : null);

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-start gap-3',
          styles.container,
          border && 'border',
          rounded && 'rounded-lg',
          sizes.container,
          className
        )}
        role="alert"
        data-testid={testId}
      >
        {displayIcon && (
          <div className={clsx('flex-shrink-0 mt-0.5', styles.icon)}>
            <span className={sizes.icon}>{displayIcon}</span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className={clsx(sizes.title, styles.title)}>
            {title}
          </h3>
          
          {message && (
            <p className={clsx('mt-1', sizes.message, styles.message)}>
              {message}
            </p>
          )}
          
          {actions.length > 0 && (
            <div className={clsx('flex flex-wrap', sizes.actions)}>
              {actions.map((action, index) => (
                <Button
                  key={action.id}
                  size={size === 'lg' ? 'md' : 'sm'}
                  variant={action.variant || (index === 0 ? 'primary' : 'ghost')}
                  onClick={action.onClick}
                  icon={action.external ? <ExternalLink /> : undefined}
                  iconPosition="right"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {dismissible && (
          <div className="flex-shrink-0">
            <Button
              size="xs"
              variant="ghost"
              onClick={handleDismiss}
              icon={<X />}
              className={clsx(
                'hover:bg-black/5 dark:hover:bg-white/5',
                styles.icon
              )}
              aria-label="Dismiss alert"
            />
          </div>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';

// Toast-style alert that appears at the edge of the screen
export interface ToastAlertProps extends Omit<AlertBannerProps, 'className'> {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  onClose?: () => void;
}

export const ToastAlert = forwardRef<HTMLDivElement, ToastAlertProps>(
  (
    {
      position = 'top-right',
      duration = 5000,
      onClose,
      dismissible = true,
      ...alertProps
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(true);

    React.useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    if (!isVisible) return null;

    const positionStyles = {
      'top-right': 'fixed top-4 right-4 z-50',
      'top-left': 'fixed top-4 left-4 z-50',
      'bottom-right': 'fixed bottom-4 right-4 z-50',
      'bottom-left': 'fixed bottom-4 left-4 z-50',
      'top-center': 'fixed top-4 left-1/2 -translate-x-1/2 z-50',
      'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
    };

    return (
      <div className={clsx(positionStyles[position], 'max-w-md shadow-lg')}>
        <AlertBanner
          ref={ref}
          {...alertProps}
          dismissible={dismissible}
          onDismiss={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="animate-in slide-in-from-top-2 fade-in duration-300"
        />
      </div>
    );
  }
);

ToastAlert.displayName = 'ToastAlert';