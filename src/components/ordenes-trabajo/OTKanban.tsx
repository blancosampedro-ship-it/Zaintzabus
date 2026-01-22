'use client';

import { useState, useMemo } from 'react';
import { OrdenTrabajo, ESTADOS_OT, EstadoOT } from '@/types';
import { OTCard } from './OTCard';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface OTKanbanProps {
  ordenes: OrdenTrabajo[];
  loading?: boolean;
  onOTClick?: (orden: OrdenTrabajo) => void;
}

interface KanbanColumn {
  estado: EstadoOT;
  label: string;
  color: string;
  bgColor: string;
}

const COLUMNAS: KanbanColumn[] = [
  { estado: 'pendiente', label: 'Pendientes', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  { estado: 'asignada', label: 'Asignadas', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { estado: 'en_curso', label: 'En Curso', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { estado: 'completada', label: 'Completadas', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { estado: 'validada', label: 'Validadas', color: 'text-green-400', bgColor: 'bg-green-500/10' },
];

export function OTKanban({ ordenes, loading, onOTClick }: OTKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<EstadoOT>>(
    () => new Set(['validada'] as EstadoOT[])
  );

  const toggleColumn = (estado: EstadoOT) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(estado)) {
        next.delete(estado);
      } else {
        next.add(estado);
      }
      return next;
    });
  };

  const getOTsPorEstado = (estado: EstadoOT) => {
    return ordenes.filter((ot) => ot.estado === estado);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNAS.map((col) => (
          <div key={col.estado} className="bg-slate-800/30 rounded-xl p-4 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-24 mb-4"></div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[500px]">
      {COLUMNAS.map((columna) => {
        const items = getOTsPorEstado(columna.estado);
        const isCollapsed = collapsedColumns.has(columna.estado);
        const urgentesCount = items.filter(
          (ot) => ot.tipo === 'correctivo_urgente' || ot.criticidad === 'critica'
        ).length;

        return (
          <div
            key={columna.estado}
            className={cn(
              'rounded-xl border border-slate-700/50 flex flex-col',
              columna.bgColor
            )}
          >
            {/* Header de columna */}
            <button
              onClick={() => toggleColumn(columna.estado)}
              className="flex items-center justify-between p-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className={cn('font-semibold text-sm', columna.color)}>
                  {columna.label}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs font-mono text-white">
                  {items.length}
                </span>
                {urgentesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-xs font-medium text-red-400">
                    {urgentesCount} ⚡
                  </span>
                )}
              </div>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Lista de OTs */}
            {!isCollapsed && (
              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Sin órdenes
                  </div>
                ) : (
                  items
                    .sort((a, b) => {
                      // Urgentes/Críticas primero
                      const aUrgent =
                        a.tipo === 'correctivo_urgente' || a.criticidad === 'critica';
                      const bUrgent =
                        b.tipo === 'correctivo_urgente' || b.criticidad === 'critica';
                      if (aUrgent && !bUrgent) return -1;
                      if (bUrgent && !aUrgent) return 1;
                      return 0;
                    })
                    .map((ot) => (
                      <OTCard
                        key={ot.id}
                        orden={ot}
                        onClick={() => onOTClick?.(ot)}
                      />
                    ))
                )}
              </div>
            )}

            {isCollapsed && items.length > 0 && (
              <div className="p-3 text-center text-xs text-slate-500">
                {items.length} orden{items.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
