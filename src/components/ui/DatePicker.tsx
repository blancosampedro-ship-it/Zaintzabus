'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from './Button';

// Simple Date Picker
export interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  error?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  minDate,
  maxDate,
  className,
  error = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(value || new Date());
  const containerRef = React.useRef<HTMLDivElement>(null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return value?.toDateString() === date.toDateString();
  };

  const handleSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  const navigateMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-slate-800 border rounded-lg text-left transition-colors',
          error ? 'border-red-500' : 'border-slate-600',
          !disabled && 'hover:border-slate-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className={cn('flex-1', value ? 'text-white' : 'text-slate-400')}>
          {value ? formatDate(value) : placeholder}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-industrial-lg min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-white">
              {months[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-medium text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(viewDate).map((date, index) => (
              <div key={index} className="aspect-square">
                {date && (
                  <button
                    type="button"
                    onClick={() => !isDateDisabled(date) && handleSelect(date)}
                    disabled={isDateDisabled(date)}
                    className={cn(
                      'w-full h-full flex items-center justify-center rounded-lg text-sm transition-colors',
                      isSelected(date)
                        ? 'bg-cyan-500 text-white'
                        : isToday(date)
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700',
                      isDateDisabled(date) && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Today Button */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => handleSelect(new Date())}
            >
              Hoy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Date Range Picker
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  presets?: { label: string; range: DateRange }[];
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Seleccionar rango',
  disabled = false,
  className,
  presets,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectingEnd, setSelectingEnd] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isInRange = (date: Date) => {
    if (!value.start || !value.end) return false;
    return date >= value.start && date <= value.end;
  };

  const isStart = (date: Date) => value.start?.toDateString() === date.toDateString();
  const isEnd = (date: Date) => value.end?.toDateString() === date.toDateString();

  const handleSelect = (date: Date) => {
    if (!selectingEnd || !value.start) {
      onChange({ start: date, end: null });
      setSelectingEnd(true);
    } else {
      if (date < value.start) {
        onChange({ start: date, end: value.start });
      } else {
        onChange({ start: value.start, end: date });
      }
      setSelectingEnd(false);
      setIsOpen(false);
    }
  };

  const navigateMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatRange = () => {
    if (!value.start && !value.end) return placeholder;
    if (value.start && !value.end) return `${formatDate(value.start)} - ...`;
    if (value.start && value.end) return `${formatDate(value.start)} - ${formatDate(value.end)}`;
    return placeholder;
  };

  const defaultPresets = [
    { label: 'Últimos 7 días', range: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() } },
    { label: 'Últimos 30 días', range: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() } },
    { label: 'Este mes', range: { start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() } },
    { label: 'Mes anterior', range: { start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) } },
  ];

  const activePresets = presets || defaultPresets;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-left transition-colors',
          !disabled && 'hover:border-slate-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className={cn('flex-1', value.start ? 'text-white' : 'text-slate-400')}>
          {formatRange()}
        </span>
        {(value.start || value.end) && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: null, end: null });
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-industrial-lg">
          <div className="flex">
            {/* Presets */}
            <div className="w-40 p-2 border-r border-slate-700">
              {activePresets.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onChange(preset.range);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon-sm" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-white">
                  {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <Button variant="ghost" size="icon-sm" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="h-8 flex items-center justify-center text-xs font-medium text-slate-500"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(viewDate).map((date, index) => (
                  <div key={index} className="aspect-square">
                    {date && (
                      <button
                        type="button"
                        onClick={() => handleSelect(date)}
                        className={cn(
                          'w-full h-full flex items-center justify-center text-sm transition-colors',
                          isStart(date) && 'rounded-l-lg bg-cyan-500 text-white',
                          isEnd(date) && 'rounded-r-lg bg-cyan-500 text-white',
                          isInRange(date) && !isStart(date) && !isEnd(date) && 'bg-cyan-500/20 text-cyan-300',
                          !isInRange(date) && !isStart(date) && !isEnd(date) && 'rounded-lg text-slate-300 hover:bg-slate-700'
                        )}
                      >
                        {date.getDate()}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
