'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X, Eye, EyeOff } from 'lucide-react';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-slate-800/50 text-slate-100 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-slate-600 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20',
        error: 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20',
        success: 'border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/20',
      },
      inputSize: {
        sm: 'h-8 px-3 text-sm',
        default: 'h-10 px-3 text-sm',
        lg: 'h-11 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      inputSize,
      leftIcon,
      rightIcon,
      onClear,
      showClear,
      error,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;
    const actualVariant = error ? 'error' : variant;

    const hasValue = value !== undefined && value !== '';

    return (
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-500">{leftIcon}</div>
        )}
        <input
          type={actualType}
          className={cn(
            inputVariants({ variant: actualVariant, inputSize, className }),
            leftIcon && 'pl-10',
            (rightIcon || showClear || isPasswordType) && 'pr-10'
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-slate-500 hover:text-slate-300 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {showClear && hasValue && !isPasswordType && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 text-slate-500 hover:text-slate-300 focus:outline-none"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {rightIcon && !showClear && !isPasswordType && (
          <div className="absolute right-3 text-slate-500">{rightIcon}</div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
