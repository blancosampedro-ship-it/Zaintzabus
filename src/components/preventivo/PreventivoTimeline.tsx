'use client';

import { useMemo } from 'react';
import { Preventivo } from '@/types';
import { cn } from '@/lib/utils/index';
import { AlertTriangle, Clock, Calendar, CheckCircle } from 'lucide-react';
import { differenceInDays, isPast, isToday } from 'date-fns';

interface PreventivoTimelineProps {
  preventivos: Preventivo[];
  dias?: number;
  onPreventivoClick?: (preventivo: Preventivo) => void;
}

interface DiaTimeline {
  offset: number;
  label: string;
  esHoy: boolean;
  preventivos: Preventivo[];
}

export function PreventivoTimeline({ 
  preventivos, 
  dias = 14,
  onPreventivoClick 
}: PreventivoTimelineProps) {
  const timeline = useMemo(() => {
    const hoy = new Date();
    const diasArr: DiaTimeline[] = [];

    // Crear array de días
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      
      const prevs = preventivos.filter(p => {
        if (!p.proximaEjecucion) return false;
        const fechaPrev = p.proximaEjecucion.toDate?.();
        if (!fechaPrev) return false;
        return differenceInDays(fechaPrev, fecha) === 0;
      });

      diasArr.push({
        offset: i,
        label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `+${i}d`,
        esHoy: i === 0,
        preventivos: prevs
      });
    }

    return diasArr;
  }, [preventivos, dias]);

  // Vencidos (días anteriores)
  const vencidos = useMemo(() => {
    return preventivos.filter(p => {
      if (!p.proximaEjecucion) return false;
      const fecha = p.proximaEjecucion.toDate?.();
      return fecha && isPast(fecha) && !isToday(fecha);
    });
  }, [preventivos]);

  const totalProximos = timeline.reduce((acc, d) => acc + d.preventivos.length, 0);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Próximos {dias} días
        </h3>
        <div className="flex items-center gap-3 text-xs">
          {vencidos.length > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {vencidos.length} vencido{vencidos.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-slate-400">
            <span className="text-cyan-400 font-mono">{totalProximos}</span> programado{totalProximos !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Vencidos alert */}
      {vencidos.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            Preventivos vencidos
          </div>
          <div className="space-y-1">
            {vencidos.slice(0, 3).map(prev => (
              <button
                key={prev.id}
                onClick={() => onPreventivoClick?.(prev)}
                className="w-full text-left px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded text-sm text-red-300 transition-colors"
              >
                <span className="font-mono">{prev.codigo}</span>
                <span className="mx-2">—</span>
                <span className="text-red-400/70">{prev.nombre}</span>
              </button>
            ))}
            {vencidos.length > 3 && (
              <p className="text-xs text-red-400/60 pl-2">
                +{vencidos.length - 3} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Timeline visual */}
      <div className="relative">
        {/* Línea base */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-700" />

        {/* Días */}
        <div className="flex justify-between relative">
          {timeline.map((dia, idx) => {
            const tienePrevs = dia.preventivos.length > 0;
            
            return (
              <div 
                key={idx}
                className="flex flex-col items-center"
                style={{ width: `${100 / dias}%` }}
              >
                {/* Punto en la línea */}
                <div className={cn(
                  'w-3 h-3 rounded-full border-2 z-10 transition-all',
                  dia.esHoy && 'bg-cyan-500 border-cyan-400 ring-4 ring-cyan-500/20',
                  !dia.esHoy && tienePrevs && 'bg-amber-500 border-amber-400',
                  !dia.esHoy && !tienePrevs && 'bg-slate-700 border-slate-600'
                )} />

                {/* Label del día */}
                <span className={cn(
                  'text-xs mt-2',
                  dia.esHoy && 'text-cyan-400 font-medium',
                  !dia.esHoy && 'text-slate-500'
                )}>
                  {dia.label}
                </span>

                {/* Contador */}
                {tienePrevs && (
                  <div className={cn(
                    'mt-1 px-1.5 py-0.5 rounded text-xs font-mono',
                    dia.esHoy 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'bg-amber-500/20 text-amber-400'
                  )}>
                    {dia.preventivos.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de próximos */}
      {totalProximos > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-xs text-slate-500 uppercase tracking-wider">
            Próximas ejecuciones
          </h4>
          {timeline
            .filter(d => d.preventivos.length > 0)
            .slice(0, 5)
            .flatMap(d => d.preventivos.map(p => ({ dia: d, prev: p })))
            .slice(0, 5)
            .map(({ dia, prev }) => (
              <button
                key={prev.id}
                onClick={() => onPreventivoClick?.(prev)}
                className="w-full flex items-center gap-3 p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg text-left transition-colors group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono',
                  dia.esHoy 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-slate-600/50 text-slate-400'
                )}>
                  {dia.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="font-mono">{prev.codigo}</span>
                    <span className="mx-2 text-slate-600">—</span>
                    <span className="text-slate-300">{prev.nombre}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {prev.tareas.length} tareas • {prev.tipoActivo}
                  </p>
                </div>
                <Calendar className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
              </button>
            ))
          }
        </div>
      )}

      {totalProximos === 0 && vencidos.length === 0 && (
        <div className="mt-6 text-center py-6">
          <CheckCircle className="w-8 h-8 text-green-500/50 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Sin preventivos programados en los próximos {dias} días
          </p>
        </div>
      )}
    </div>
  );
}
