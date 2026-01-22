'use client';

import { ReactNode } from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerOff } from 'lucide-react';
import { Button } from './Button';

// ============================================
// Loading States
// ============================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`bg-slate-800 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-slate-800 rounded-lg">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-slate-800/30 rounded">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Error States
// ============================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Ha ocurrido un error',
  message = 'No se ha podido completar la operación. Por favor, inténtalo de nuevo.',
  onRetry,
  icon,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="p-4 bg-red-500/10 rounded-full mb-4">
        {icon || <AlertCircle className="h-8 w-8 text-red-400" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Sin conexión"
      message="No se puede conectar con el servidor. Comprueba tu conexión a internet."
      icon={<WifiOff className="h-8 w-8 text-amber-400" />}
      onRetry={onRetry}
    />
  );
}

export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Error del servidor"
      message="El servidor no está disponible en este momento. Por favor, inténtalo más tarde."
      icon={<ServerOff className="h-8 w-8 text-red-400" />}
      onRetry={onRetry}
    />
  );
}

// ============================================
// Empty States
// ============================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {icon && (
        <div className="p-4 bg-slate-800 rounded-full mb-4 text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================
// Loading Overlay
// ============================================

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: ReactNode;
}

export function LoadingOverlay({ isLoading, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
            {message && <p className="text-slate-300 text-sm">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Progress Indicator
// ============================================

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'green' | 'amber' | 'red';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  color = 'cyan',
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
  
  const colorClasses = {
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={className}>
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-400 mt-1 text-right">{Math.round(percentage)}%</p>
      )}
    </div>
  );
}

// ============================================
// Inline Loading
// ============================================

export function InlineLoading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

// ============================================
// Saving Indicator
// ============================================

type SavingStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SavingIndicator({ status }: { status: SavingStatus }) {
  if (status === 'idle') return null;

  const config = {
    saving: { text: 'Guardando...', color: 'text-slate-400', animate: true },
    saved: { text: 'Guardado', color: 'text-green-400', animate: false },
    error: { text: 'Error al guardar', color: 'text-red-400', animate: false },
  };

  const current = config[status];

  return (
    <div className={`flex items-center gap-2 text-sm ${current.color}`}>
      {current.animate && (
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      <span>{current.text}</span>
    </div>
  );
}
