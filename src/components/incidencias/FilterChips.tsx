'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils/index';

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  filters: FilterChip[];
  resultCount?: number;
}

export function FilterChips({ 
  filters, 
  resultCount 
}: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Chips de filtros */}
      {filters.map((filter) => (
        <div
          key={filter.key}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm',
            'bg-slate-700/50 border border-slate-600/50',
            'text-slate-200'
          )}
        >
          <span className="font-medium">{filter.label}</span>
          <button
            onClick={filter.onRemove}
            className="ml-1 p-0.5 rounded-full hover:bg-slate-600 transition-colors"
          >
            <X className="w-3 h-3 text-slate-400 hover:text-white" />
          </button>
        </div>
      ))}

      {/* Contador de resultados */}
      {resultCount !== undefined && (
        <div className="ml-auto text-sm text-slate-500">
          <span className="font-mono text-white">{resultCount}</span> resultado{resultCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
