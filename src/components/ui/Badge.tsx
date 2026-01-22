'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-slate-600 bg-slate-700/50 text-slate-300',
        primary: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
        secondary: 'border-slate-500 bg-slate-600/50 text-slate-200',
        success: 'border-green-500/50 bg-green-500/10 text-green-400',
        warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
        danger: 'border-red-500/50 bg-red-500/10 text-red-400',
        info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        outline: 'border-slate-600 bg-transparent text-slate-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, removable, onRemove, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 -mr-0.5 rounded-full p-0.5 hover:bg-slate-600/50 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// Status Indicator
export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'unknown';
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-slate-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  unknown: 'bg-slate-400',
};

const statusLabels = {
  online: 'En línea',
  offline: 'Desconectado',
  away: 'Ausente',
  busy: 'Ocupado',
  unknown: 'Desconocido',
};

function StatusIndicator({ status, label, showLabel = false, size = 'md' }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn('rounded-full', sizeClasses[size], statusColors[status])} />
      {showLabel && (
        <span className="text-sm text-slate-400">{label || statusLabels[status]}</span>
      )}
    </div>
  );
}

// Alert Component
const alertVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'border-slate-700 bg-slate-800/50 text-slate-300',
        info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        success: 'border-green-500/50 bg-green-500/10 text-green-400',
        warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
        error: 'border-red-500/50 bg-red-500/10 text-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const alertIcons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

function Alert({ className, variant, title, icon, onClose, children, ...props }: AlertProps) {
  const IconComponent = alertIcons[variant || 'default'];
  
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <div className="flex gap-3">
        {icon || <IconComponent className="h-5 w-5 flex-shrink-0" />}
        <div className="flex-1">
          {title && <h5 className="mb-1 font-medium">{title}</h5>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-slate-700/50 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export { Badge, badgeVariants, StatusIndicator, Alert };
