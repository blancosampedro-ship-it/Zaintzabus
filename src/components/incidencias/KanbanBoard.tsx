'use client';

import { useState } from 'react';
import { Incidencia, EstadoIncidencia, ESTADO_LABELS } from '@/types';
import { IncidenciaCard } from './IncidenciaCard';
import { cn } from '@/lib/utils/index';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface KanbanBoardProps {
  incidencias: Incidencia[];
  loading?: boolean;
  onIncidenciaClick?: (incidencia: Incidencia) => void;
}

interface KanbanColumn {
  estado: EstadoIncidencia;
  label: string;
  color: string;
  bgColor: string;
}

const COLUMNAS: KanbanColumn[] = [
  { estado: 'nueva', label: 'Nuevas', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { estado: 'en_analisis', label: 'En Análisis', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  { estado: 'en_intervencion', label: 'En Intervención', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { estado: 'resuelta', label: 'Resueltas', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { estado: 'cerrada', label: 'Cerradas', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
];

export function KanbanBoard({ incidencias, loading, onIncidenciaClick }: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<EstadoIncidencia>>(() => new Set(['cerrada'] as EstadoIncidencia[]));

  const toggleColumn = (estado: EstadoIncidencia) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(estado)) {
        next.delete(estado);
      } else {
        next.add(estado);
      }
      return next;
    });
  };

  const getIncidenciasPorEstado = (estado: EstadoIncidencia) => {
    return incidencias.filter(inc => inc.estado === estado);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNAS.map((col) => (
          <div key={col.estado} className="bg-slate-800/30 rounded-xl p-4 animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-24 mb-4"></div>
            <div className="space-y-3">
              {[1, 2].map(i => (
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
        const items = getIncidenciasPorEstado(columna.estado);
        const isCollapsed = collapsedColumns.has(columna.estado);
        const criticasCount = items.filter(i => i.criticidad === 'critica').length;

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
                {criticasCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-xs font-medium text-red-400">
                    {criticasCount} ⚠
                  </span>
                )}
              </div>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Lista de incidencias */}
            {!isCollapsed && (
              <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[600px]">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Sin incidencias
                  </div>
                ) : (
                  items
                    .sort((a, b) => {
                      // Críticas primero
                      if (a.criticidad === 'critica' && b.criticidad !== 'critica') return -1;
                      if (b.criticidad === 'critica' && a.criticidad !== 'critica') return 1;
                      // Luego por fecha
                      return b.timestamps.recepcion.toMillis() - a.timestamps.recepcion.toMillis();
                    })
                    .map((inc) => (
                      <IncidenciaCard 
                        key={inc.id} 
                        incidencia={inc} 
                        onClick={() => onIncidenciaClick?.(inc)}
                      />
                    ))
                )}
              </div>
            )}

            {isCollapsed && items.length > 0 && (
              <div className="p-3 text-center text-xs text-slate-500">
                {items.length} incidencia{items.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
