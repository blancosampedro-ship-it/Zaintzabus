'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Check,
} from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { EmptyState, NoResultsState } from './EmptyState';
import { LoadingSpinner } from './Loading';

// Table Column Definition
export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  cell?: (row: T, index: number) => React.ReactNode;
}

// Sort State
export type SortDirection = 'asc' | 'desc' | null;
export interface SortState {
  column: string | null;
  direction: SortDirection;
}

// DataTable Props
export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  sortState?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  actions?: (row: T) => React.ReactNode;
  className?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  compact?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  sortState,
  onSortChange,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  pagination,
  actions,
  className,
  stickyHeader = false,
  striped = false,
  compact = false,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((row) => row.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    
    if (sortState?.column === columnId) {
      if (sortState.direction === 'asc') {
        onSortChange({ column: columnId, direction: 'desc' });
      } else if (sortState.direction === 'desc') {
        onSortChange({ column: null, direction: null });
      }
    } else {
      onSortChange({ column: columnId, direction: 'asc' });
    }
  };

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (column.cell) {
      return column.cell(row, data.indexOf(row));
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as React.ReactNode;
  };

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sortState?.column !== columnId) {
      return <ChevronsUpDown className="h-4 w-4 text-slate-500" />;
    }
    return sortState.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-cyan-400" />
    ) : (
      <ChevronDown className="h-4 w-4 text-cyan-400" />
    );
  };

  return (
    <div className={cn('bg-slate-800 border border-slate-700 rounded-xl overflow-hidden', className)}>
      {/* Search Header */}
      {searchable && (
        <div className="p-4 border-b border-slate-700">
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            'bg-slate-900/50',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer select-none hover:text-white',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.headerClassName
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={cn(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {column.sortable && <SortIcon columnId={column.id} />}
                  </div>
                </th>
              ))}
              {actions && <th className="w-12 px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <LoadingSpinner size="lg" className="mx-auto" />
                  <p className="text-slate-400 mt-3">Cargando datos...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8"
                >
                  {searchValue ? (
                    <NoResultsState
                      searchQuery={searchValue}
                      onClear={() => onSearchChange?.('')}
                    />
                  ) : (
                    <EmptyState title={emptyMessage} size="sm" />
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-cyan-500/10',
                      !isSelected && striped && index % 2 === 1 && 'bg-slate-800/50',
                      !isSelected && 'hover:bg-slate-700/30'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(row.id)}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          'px-4 text-sm text-slate-300',
                          compact ? 'py-2' : 'py-3',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {getCellValue(row, column)}
                      </td>
                    ))}
                    {actions && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && data.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            Mostrando{' '}
            <span className="font-medium text-white">
              {(pagination.page - 1) * pagination.pageSize + 1}
            </span>{' '}
            a{' '}
            <span className="font-medium text-white">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{' '}
            de{' '}
            <span className="font-medium text-white">{pagination.total}</span> resultados
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {/* Page Numbers */}
              {Array.from(
                { length: Math.ceil(pagination.total / pagination.pageSize) },
                (_, i) => i + 1
              )
                .filter((page) => {
                  const current = pagination.page;
                  const total = Math.ceil(pagination.total / pagination.pageSize);
                  return (
                    page === 1 ||
                    page === total ||
                    Math.abs(page - current) <= 1
                  );
                })
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-slate-500">...</span>
                    )}
                    <Button
                      variant={page === pagination.page ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => pagination.onPageChange(page)}
                      className="min-w-[32px]"
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectable && selectedIds.length > 0 && (
        <div className="px-4 py-2 bg-cyan-500/10 border-t border-cyan-500/30 flex items-center justify-between">
          <span className="text-sm text-cyan-400">
            {selectedIds.length} elemento{selectedIds.length > 1 ? 's' : ''} seleccionado{selectedIds.length > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange?.([])}
          >
            Deseleccionar todo
          </Button>
        </div>
      )}
    </div>
  );
}
