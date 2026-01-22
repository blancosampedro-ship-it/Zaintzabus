'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, indeterminate = false, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    
    // Handle indeterminate state
    React.useEffect(() => {
      const element = internalRef.current;
      if (element) {
        element.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Merge refs
    const mergedRef = React.useCallback((node: HTMLInputElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    }, [ref]);

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id={inputId}
            ref={mergedRef}
            className={cn(
              'peer h-5 w-5 shrink-0 rounded border border-slate-600 bg-slate-800/50 ring-offset-slate-900',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'checked:bg-cyan-600 checked:border-cyan-600',
              'cursor-pointer',
              className
            )}
            {...props}
          />
          {/* Checkmark icon */}
          <svg
            className={cn(
              'absolute left-0.5 top-0.5 h-4 w-4 text-white pointer-events-none transition-opacity',
              indeterminate ? 'opacity-0' : 'opacity-0 peer-checked:opacity-100'
            )}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 8 7 11 12 5" />
          </svg>
          {/* Indeterminate icon */}
          <svg
            className={cn(
              'absolute left-0.5 top-0.5 h-4 w-4 text-white pointer-events-none transition-opacity',
              indeterminate ? 'opacity-100' : 'opacity-0'
            )}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </div>
        {(label || description) && (
          <div className="grid gap-0.5 leading-none">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-slate-200 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio Button
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            type="radio"
            id={inputId}
            ref={ref}
            className={cn(
              'peer h-5 w-5 shrink-0 rounded-full border border-slate-600 bg-slate-800/50 ring-offset-slate-900',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'checked:border-cyan-600',
              'cursor-pointer',
              className
            )}
            {...props}
          />
          <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-cyan-500 opacity-0 peer-checked:opacity-100 pointer-events-none" />
        </div>
        {(label || description) && (
          <div className="grid gap-0.5 leading-none">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-slate-200 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group
export interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  orientation = 'vertical',
  className,
}: RadioGroupProps) {
  return (
    <div
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-4',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
        />
      ))}
    </div>
  );
}

export { Checkbox, Radio };
