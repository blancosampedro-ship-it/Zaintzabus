'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  LayoutGrid,
  List,
  Download,
  Plus,
} from 'lucide-react';
import { Input, Button, Select, Badge, type SelectOption } from '@/components/ui';
import { EstadoEquipo, ESTADOS_EQUIPO, TipoEquipo } from '@/types';

export interface EquiposFilters {
  busqueda: string;
  tipoEquipoId: string;
  estado: EstadoEquipo | '';
  operadorId: string;
  ubicacionTipo: 'autobus' | 'ubicacion' | 'laboratorio' | '';
}

export interface EquiposToolbarProps {
  filters: EquiposFilters;
  onFiltersChange: (filters: EquiposFilters) => void;
  tiposEquipo: TipoEquipo[];
  operadores: { id: string; nombre: string }[];
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onExport?: () => void;
  onCreateNew?: () => void;
  selectedCount?: number;
  onClearSelection?: () => void;
  className?: string;
}

const estadoOptions: SelectOption[] = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADOS_EQUIPO.EN_SERVICIO, label: 'En Servicio' },
  { value: ESTADOS_EQUIPO.EN_ALMACEN, label: 'En Almacén' },
  { value: ESTADOS_EQUIPO.EN_LABORATORIO, label: 'En Laboratorio' },
  { value: ESTADOS_EQUIPO.AVERIADO, label: 'Averiado' },
  { value: ESTADOS_EQUIPO.BAJA, label: 'Baja' },
];

const ubicacionOptions: SelectOption[] = [
  { value: '', label: 'Todas las ubicaciones' },
  { value: 'autobus', label: 'En Autobuses' },
  { value: 'ubicacion', label: 'En Almacenes' },
  { value: 'laboratorio', label: 'En Laboratorios' },
];

export function EquiposToolbar({
  filters,
  onFiltersChange,
  tiposEquipo,
  operadores,
  viewMode,
  onViewModeChange,
  onExport,
  onCreateNew,
  selectedCount = 0,
  onClearSelection,
  className,
}: EquiposToolbarProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const tipoOptions: SelectOption[] = [
    { value: '', label: 'Todos los tipos' },
    ...tiposEquipo.map((t) => ({ value: t.id, label: t.nombre })),
  ];

  const operadorOptions: SelectOption[] = [
    { value: '', label: 'Todos los operadores' },
    ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
  ];

  const activeFiltersCount = [
    filters.tipoEquipoId,
    filters.estado,
    filters.operadorId,
    filters.ubicacionTipo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      busqueda: '',
      tipoEquipoId: '',
      estado: '',
      operadorId: '',
      ubicacionTipo: '',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Input
            type="search"
            placeholder="Buscar por código o número de serie..."
            value={filters.busqueda}
            onChange={(e) =>
              onFiltersChange({ ...filters, busqueda: e.target.value })
            }
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="primary" size="xs" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'table'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Equipo
            </Button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Tipo de Equipo
              </label>
              <Select
                options={tipoOptions}
                value={filters.tipoEquipoId}
                onChange={(v) =>
                  onFiltersChange({ ...filters, tipoEquipoId: v as string })
                }
                placeholder="Seleccionar tipo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Estado
              </label>
              <Select
                options={estadoOptions}
                value={filters.estado}
                onChange={(v) =>
                  onFiltersChange({ ...filters, estado: v as EstadoEquipo | '' })
                }
                placeholder="Seleccionar estado"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Operador
              </label>
              <Select
                options={operadorOptions}
                value={filters.operadorId}
                onChange={(v) =>
                  onFiltersChange({ ...filters, operadorId: v as string })
                }
                placeholder="Seleccionar operador"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Ubicación
              </label>
              <Select
                options={ubicacionOptions}
                value={filters.ubicacionTipo}
                onChange={(v) =>
                  onFiltersChange({
                    ...filters,
                    ubicacionTipo: v as 'autobus' | 'ubicacion' | 'laboratorio' | '',
                  })
                }
                placeholder="Seleccionar ubicación"
              />
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-end mt-4 pt-4 border-t border-slate-700">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Selection info */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <span className="text-sm text-cyan-400">
            {selectedCount} equipo{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Deseleccionar
            </Button>
            <Button variant="secondary" size="sm">
              Cambiar estado
            </Button>
            <Button variant="secondary" size="sm">
              Exportar selección
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
