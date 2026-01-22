'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { HelpCircle, AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-300"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <div className="flex items-start gap-1.5">
          {error ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </>
          ) : hint ? (
            <>
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500">{hint}</p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function FormSection({
  title,
  description,
  children,
  className,
  columns = 1,
}: FormSectionProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="border-b border-slate-700 pb-3">
          {title && (
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          )}
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className={cn('grid gap-4', gridCols[columns])}>
        {children}
      </div>
    </div>
  );
}

export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function FormActions({
  children,
  className,
  align = 'right',
}: FormActionsProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 pt-4 border-t border-slate-700',
        alignClass[align],
        className
      )}
    >
      {children}
    </div>
  );
}
