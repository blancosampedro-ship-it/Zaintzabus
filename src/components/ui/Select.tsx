'use client';

import * as React from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  error = false,
  className,
  size = 'md',
}: SelectProps) {
  const selected = options.find((opt) => opt.value === value);

  const sizeClasses = {
    sm: 'h-8 text-sm px-3',
    md: 'h-10 text-sm px-3',
    lg: 'h-11 text-base px-4',
  };

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn('relative', className)}>
        <Listbox.Button
          className={cn(
            'relative w-full cursor-pointer rounded-lg border bg-slate-800/50 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            sizeClasses[size],
            error
              ? 'border-red-500 focus-visible:ring-red-500/20'
              : 'border-slate-600 hover:border-slate-500 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span className={cn('block truncate', !selected && 'text-slate-500')}>
            {selected ? (
              <span className="flex items-center gap-2">
                {selected.icon}
                {selected.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-slate-800 border border-slate-600 py-1 shadow-industrial-lg focus:outline-none">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active }) =>
                  cn(
                    'relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm',
                    active ? 'bg-slate-700 text-white' : 'text-slate-300',
                    option.disabled && 'cursor-not-allowed opacity-50'
                  )
                }
                value={option.value}
                disabled={option.disabled}
              >
                {({ selected, active }) => (
                  <>
                    <span className={cn('flex items-center gap-2 truncate', selected && 'font-medium text-white')}>
                      {option.icon}
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-400">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// Multi Select
export interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  error = false,
  className,
  maxDisplay = 2,
}: MultiSelectProps) {
  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange?.(value.filter((v) => v !== optionValue));
    } else {
      onChange?.([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  return (
    <Listbox value={value} onChange={() => {}} disabled={disabled} multiple>
      <div className={cn('relative', className)}>
        <Listbox.Button
          className={cn(
            'relative w-full min-h-[40px] cursor-pointer rounded-lg border bg-slate-800/50 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 px-3 py-2',
            error
              ? 'border-red-500 focus-visible:ring-red-500/20'
              : 'border-slate-600 hover:border-slate-500 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-slate-500 text-sm">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1 pr-6">
              {selectedOptions.slice(0, maxDisplay).map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-xs text-slate-200"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => removeOption(opt.value, e)}
                    className="hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedOptions.length > maxDisplay && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-600 text-xs text-slate-300">
                  +{selectedOptions.length - maxDisplay} más
                </span>
              )}
            </div>
          )}
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={React.Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-slate-800 border border-slate-600 py-1 shadow-industrial-lg focus:outline-none">
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => !option.disabled && handleToggle(option.value)}
                className={cn(
                  'relative cursor-pointer select-none py-2 pl-10 pr-4 text-sm hover:bg-slate-700',
                  value.includes(option.value) ? 'text-white' : 'text-slate-300',
                  option.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <span className={cn('flex items-center gap-2 truncate', value.includes(option.value) && 'font-medium')}>
                  {option.icon}
                  {option.label}
                </span>
                {value.includes(option.value) && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-400">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </div>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// ==================== RADIX-STYLE SELECT COMPONENTS ====================

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  displayValue?: string;
  setDisplayValue: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a SelectRoot');
  }
  return context;
}

interface SelectRootProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SelectRoot({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
  disabled = false,
}: SelectRootProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState<string | undefined>();

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (disabled) return;
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
      setOpen(false);
    },
    [isControlled, onValueChange, disabled]
  );

  const handleSetOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!disabled) {
        setOpen(newOpen);
      }
    },
    [disabled]
  );

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen: handleSetOpen,
        displayValue,
        setDisplayValue,
      }}
    >
      <div className={cn("relative", disabled && "opacity-50 cursor-not-allowed")}>{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  placeholder?: string;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext();

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, displayValue } = useSelectContext();

  return (
    <span className={cn(!value && 'text-slate-500')}>
      {displayValue || value || placeholder}
    </span>
  );
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'popper' | 'item-aligned';
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelectContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          const parent = contentRef.current.parentElement;
          if (parent && !parent.contains(event.target as Node)) {
            setOpen(false);
          }
        }
      };

      if (open) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [open, setOpen]);

    if (!open) return null;

    return (
      <div
        ref={contentRef}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SelectContent.displayName = 'SelectContent';

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setDisplayValue } = useSelectContext();
    const isSelected = selectedValue === value;

    const handleSelect = () => {
      if (!disabled) {
        onValueChange(value);
        if (typeof children === 'string') {
          setDisplayValue(children);
        }
      }
    };

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        onClick={handleSelect}
        className={cn(
          'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none',
          'transition-colors hover:bg-slate-700 focus:bg-slate-700',
          isSelected && 'bg-slate-700 text-cyan-400',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        <span className="flex-1">{children}</span>
        {isSelected && <Check className="h-4 w-4 ml-2" />}
      </div>
    );
  }
);

SelectItem.displayName = 'SelectItem';

export const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-1', className)} {...props}>
      {children}
    </div>
  )
);

SelectGroup.displayName = 'SelectGroup';

export const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-2 py-1.5 text-xs font-semibold text-slate-400', className)}
      {...props}
    />
  )
);

SelectLabel.displayName = 'SelectLabel';

export const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-slate-700', className)}
      {...props}
    />
  )
);

SelectSeparator.displayName = 'SelectSeparator';
