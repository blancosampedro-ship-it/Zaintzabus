'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = 'default', 
    width, 
    height, 
    animation = 'pulse',
    style,
    ...props 
  }, ref) => {
    const variantClasses = {
      default: 'rounded-md',
      circular: 'rounded-full',
      rectangular: 'rounded-none',
      text: 'rounded h-4 w-full',
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200',
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Componentes pre-configurados para casos de uso comunes
const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="text"
      className={cn('h-4', className)}
      {...props}
    />
  )
);

SkeletonText.displayName = 'SkeletonText';

const SkeletonAvatar = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="circular"
      className={cn('h-10 w-10', className)}
      {...props}
    />
  )
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

const SkeletonButton = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="default"
      className={cn('h-10 w-24', className)}
      {...props}
    />
  )
);

SkeletonButton.displayName = 'SkeletonButton';

const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border border-gray-200 p-4 space-y-3', className)}
      {...props}
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
);

SkeletonCard.displayName = 'SkeletonCard';

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonButton, SkeletonCard };
