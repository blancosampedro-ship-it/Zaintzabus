'use client';

import * as React from 'react';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input, Select, Badge, type SelectOption } from '@/components/ui';
import { ESTADOS_AUTOBUS, FASES_INSTALACION, EstadoAutobus, FaseInstalacion } from '@/types';

// ============================================
// AUTOBUSES TOOLBAR
// ============================================

export interface AutobusesFilters {
  operadorId?: string;
  estado?: EstadoAutobus;
  faseInstalacion?: FaseInstalacion;
  marca?: string;
  busqueda?: string;
}

export interface AutobusesToolbarProps {
  filters: AutobusesFilters;
  onFiltersChange: (filters: AutobusesFilters) => void;
  view: 'grid' | 'table';
  onViewChange: (view: 'grid' | 'table') => void;
  operadores: Array<{ id: string; nombre: string }>;
  marcas?: string[];
  onCreateNew?: () => void;
  totalResults?: number;
  className?: string;
}

export function AutobusesToolbar({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  operadores,
  marcas = [],
  onCreateNew,
  totalResults,
  className,
}: AutobusesToolbarProps) {
  const [showFilters, setShowFilters] = React.useState(false);

  const operadorOptions: SelectOption[] = [
    { value: '', label: 'Todos los operadores' },
    ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
  ];

  const estadoOptions: SelectOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: ESTADOS_AUTOBUS.OPERATIVO, label: 'Operativo' },
    { value: ESTADOS_AUTOBUS.EN_TALLER, label: 'En taller' },
    { value: ESTADOS_AUTOBUS.BAJA, label: 'Baja' },
  ];

  const faseOptions: SelectOption[] = [
    { value: '', label: 'Todas las fases' },
    { value: FASES_INSTALACION.PENDIENTE, label: 'Pendiente' },
    { value: FASES_INSTALACION.PREINSTALACION, label: 'Pre-instalación' },
    { value: FASES_INSTALACION.COMPLETA, label: 'Completa' },
  ];

  const marcaOptions: SelectOption[] = [
    { value: '', label: 'Todas las marcas' },
    ...marcas.map((m) => ({ value: m, label: m })),
  ];

  const activeFiltersCount = Object.values(filters).filter((v) => v && v !== '').length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updateFilter = <K extends keyof AutobusesFilters>(
    key: K,
    value: AutobusesFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barra principal */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, matrícula..."
            value={filters.busqueda || ''}
            onChange={(e) => updateFilter('busqueda', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Toggle filtros */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-500 text-[10px] text-white flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* Toggle vista */}
          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => onViewChange('grid')}
              className={cn(
                'p-2 transition-colors',
                view === 'grid'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewChange('table')}
              className={cn(
                'p-2 transition-colors',
                view === 'table'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Nuevo autobús */}
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Panel de filtros expandible */}
      {showFilters && (
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Operador</label>
              <Select
                options={operadorOptions}
                value={filters.operadorId || ''}
                onChange={(v) => updateFilter('operadorId', v || undefined)}
                placeholder="Seleccionar..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Estado</label>
              <Select
                options={estadoOptions}
                value={filters.estado || ''}
                onChange={(v) => updateFilter('estado', v as EstadoAutobus || undefined)}
                placeholder="Seleccionar..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Fase instalación</label>
              <Select
                options={faseOptions}
                value={filters.faseInstalacion || ''}
                onChange={(v) => updateFilter('faseInstalacion', v as FaseInstalacion || undefined)}
                placeholder="Seleccionar..."
              />
            </div>

            {marcas.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Marca</label>
                <Select
                  options={marcaOptions}
                  value={filters.marca || ''}
                  onChange={(v) => updateFilter('marca', v || undefined)}
                  placeholder="Seleccionar..."
                />
              </div>
            )}
          </div>

          {/* Filtros activos y limpiar */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
              <span className="text-xs text-slate-400">Filtros activos:</span>
              {filters.operadorId && (
                <Badge variant="secondary" size="sm">
                  Operador
                  <button
                    onClick={() => updateFilter('operadorId', undefined)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.estado && (
                <Badge variant="secondary" size="sm">
                  Estado: {filters.estado}
                  <button
                    onClick={() => updateFilter('estado', undefined)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.faseInstalacion && (
                <Badge variant="secondary" size="sm">
                  Fase: {filters.faseInstalacion}
                  <button
                    onClick={() => updateFilter('faseInstalacion', undefined)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.marca && (
                <Badge variant="secondary" size="sm">
                  Marca: {filters.marca}
                  <button
                    onClick={() => updateFilter('marca', undefined)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Contador de resultados */}
      {totalResults !== undefined && (
        <p className="text-sm text-slate-400">
          {totalResults} {totalResults === 1 ? 'autobús encontrado' : 'autobuses encontrados'}
        </p>
      )}
    </div>
  );
}
