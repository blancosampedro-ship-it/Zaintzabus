'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const tooltipVariants = cva(
  'absolute z-50 px-2 py-1 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-700 text-white border border-slate-600',
        dark: 'bg-slate-900 text-white border border-slate-700',
        light: 'bg-white text-slate-900 border border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TooltipProps extends VariantProps<typeof tooltipVariants> {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  variant,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const positions = {
        top: {
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        },
        bottom: {
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        },
        left: {
          x: rect.left - 8,
          y: rect.top + rect.height / 2,
        },
        right: {
          x: rect.right + 8,
          y: rect.top + rect.height / 2,
        },
      };
      setCoords(positions[position]);
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-slate-700 border-x-transparent border-b-transparent',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-slate-700 border-x-transparent border-t-transparent',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            tooltipVariants({ variant }),
            positionClasses[position],
            'animate-in fade-in-0 zoom-in-95 duration-100',
            className
          )}
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
          }}
        >
          {content}
          <span
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[position]
            )}
          />
        </div>
      )}
    </>
  );
}

// Simple inline tooltip wrapper
export interface TooltipWrapperProps {
  content: string;
  children: React.ReactElement;
}

export function TooltipWrapper({ content, children }: TooltipWrapperProps) {
  return (
    <Tooltip content={content}>
      {children}
    </Tooltip>
  );
}
