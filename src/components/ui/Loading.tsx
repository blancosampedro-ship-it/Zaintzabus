'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Loading Spinner
export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const spinnerSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-cyan-500', spinnerSizes[size], className)}
    />
  );
}

// Loading Page
export interface LoadingPageProps {
  message?: string;
  className?: string;
}

export function LoadingPage({ message = 'Cargando...', className }: LoadingPageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] gap-4',
        className
      )}
    >
      <LoadingSpinner size="xl" />
      <p className="text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}

// Loading Overlay
export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  message,
  className,
  children,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
          <LoadingSpinner size="lg" />
          {message && <p className="text-slate-400 mt-3 text-sm">{message}</p>}
        </div>
      )}
    </div>
  );
}

// Skeleton Loader
export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-700',
        variantClasses[variant],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'circular' ? width : undefined),
      }}
    />
  );
}

// Skeleton Card
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-slate-800 border border-slate-700 rounded-xl p-4', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton className="w-24 h-4 mb-2" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-3/4 h-4 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-6 rounded-full" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
    </div>
  );
}

// Skeleton Table
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('bg-slate-800 border border-slate-700 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-slate-700 bg-slate-900/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-slate-700 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="flex-1 h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton List
export function SkeletonList({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-lg"
        >
          <Skeleton variant="circular" width={32} height={32} />
          <div className="flex-1">
            <Skeleton className="w-32 h-4 mb-2" />
            <Skeleton className="w-20 h-3" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}
