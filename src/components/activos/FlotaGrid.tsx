'use client';

import { useMemo, useState } from 'react';
import { Activo, EstadoActivo } from '@/types';
import { ActivoCard } from './ActivoCard';
import { cn } from '@/lib/utils/index';
import { 
  LayoutGrid, 
  List, 
  Bus, 
  CheckCircle, 
  Wrench, 
  AlertTriangle,
  XCircle 
} from 'lucide-react';

interface FlotaGridProps {
  activos: Activo[];
  selectedId?: string;
  onSelect?: (activo: Activo) => void;
  loading?: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterEstado = EstadoActivo | 'todos';

const ESTADO_TABS: { value: FilterEstado; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'todos', label: 'Todos', icon: Bus, color: 'text-slate-400' },
  { value: 'operativo', label: 'Operativos', icon: CheckCircle, color: 'text-green-400' },
  { value: 'en_taller', label: 'En Taller', icon: Wrench, color: 'text-amber-400' },
  { value: 'averiado', label: 'Averiados', icon: AlertTriangle, color: 'text-red-400' },
  { value: 'baja', label: 'Baja', icon: XCircle, color: 'text-slate-500' },
];

export function FlotaGrid({ activos, selectedId, onSelect, loading }: FlotaGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [estadoFilter, setEstadoFilter] = useState<FilterEstado>('todos');

  // Contar por estado
  const contadores = useMemo(() => {
    return {
      todos: activos.length,
      operativo: activos.filter(a => a.estado === 'operativo').length,
      en_taller: activos.filter(a => a.estado === 'en_taller').length,
      averiado: activos.filter(a => a.estado === 'averiado').length,
      baja: activos.filter(a => a.estado === 'baja').length,
    };
  }, [activos]);

  // Filtrar
  const activosFiltrados = useMemo(() => {
    if (estadoFilter === 'todos') return activos;
    return activos.filter(a => a.estado === estadoFilter);
  }, [activos, estadoFilter]);

  // Ordenar: averiados primero, luego en_taller, luego operativos
  const activosOrdenados = useMemo(() => {
    return [...activosFiltrados].sort((a, b) => {
      const orden: Record<EstadoActivo, number> = {
        averiado: 0,
        en_taller: 1,
        operativo: 2,
        baja: 3,
      };
      return orden[a.estado] - orden[b.estado];
    });
  }, [activosFiltrados]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton tabs */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-slate-700/50 rounded animate-pulse" />
          ))}
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs de filtro por estado */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg">
          {ESTADO_TABS.map(tab => {
            const Icon = tab.icon;
            const count = contadores[tab.value];
            const isActive = estadoFilter === tab.value;
            
            return (
              <button
                key={tab.value}
                onClick={() => setEstadoFilter(tab.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                  isActive 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive && tab.color)} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-mono',
                  isActive ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-500'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toggle vista */}
        <div className="flex items-center bg-slate-800 rounded p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === 'grid' 
                ? "bg-cyan-600 text-white" 
                : "text-slate-400 hover:text-white"
            )}
            title="Vista Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === 'list' 
                ? "bg-cyan-600 text-white" 
                : "text-slate-400 hover:text-white"
            )}
            title="Vista Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid/List de activos */}
      {activosOrdenados.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Bus className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Sin activos</h3>
            <p className="text-slate-400 mt-1">
              No hay activos con el estado seleccionado
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activosOrdenados.map(activo => (
            <ActivoCard
              key={activo.id}
              activo={activo}
              selected={selectedId === activo.id}
              onClick={() => onSelect?.(activo)}
              size="normal"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {activosOrdenados.map(activo => (
            <ActivoCard
              key={activo.id}
              activo={activo}
              selected={selectedId === activo.id}
              onClick={() => onSelect?.(activo)}
              size="compact"
            />
          ))}
        </div>
      )}
    </div>
  );
}
