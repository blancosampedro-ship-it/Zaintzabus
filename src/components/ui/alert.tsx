'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  AlertTriangle,
  X 
} from 'lucide-react';

const alertVariants = {
  default: 'bg-gray-100 text-gray-900 border-gray-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200',
  success: 'bg-green-50 text-green-900 border-green-200',
  warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  error: 'bg-red-50 text-red-900 border-red-200',
  destructive: 'bg-red-50 text-red-900 border-red-200',
};

const alertIcons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  destructive: AlertCircle,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof alertVariants;
  icon?: React.ReactNode;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', icon, onClose, children, ...props }, ref) => {
    const IconComponent = alertIcons[variant];
    
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          alertVariants[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon || <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">{children}</div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
);

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
