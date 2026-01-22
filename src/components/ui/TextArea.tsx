'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-lg border bg-slate-800/50 text-slate-100 transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
  {
    variants: {
      variant: {
        default: 'border-slate-600 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20',
        error: 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20',
      },
      textareaSize: {
        sm: 'min-h-[60px] px-3 py-2 text-sm',
        md: 'min-h-[80px] px-3 py-2 text-sm',
        lg: 'min-h-[120px] px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      textareaSize: 'md',
    },
  }
);

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  maxLength?: number;
  showCount?: boolean;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, variant, textareaSize, maxLength, showCount, value, ...props }, ref) => {
    const length = typeof value === 'string' ? value.length : 0;

    return (
      <div className="relative w-full">
        <textarea
          className={cn(textareaVariants({ variant, textareaSize, className }))}
          ref={ref}
          value={value}
          maxLength={maxLength}
          {...props}
        />
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-slate-500">
            {length}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export { TextArea, TextArea as Textarea, textareaVariants };
