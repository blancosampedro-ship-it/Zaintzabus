'use client';

import { Clock, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Incidencia, CRITICIDAD_LABELS } from '@/types';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidenciaCardProps {
  incidencia: Incidencia;
  mode?: 'compact' | 'full';
  showActions?: boolean;
  onClick?: () => void;
}

export function IncidenciaCard({ 
  incidencia, 
  mode = 'compact',
  showActions = true,
  onClick
}: IncidenciaCardProps) {
  const isCritica = incidencia.criticidad === 'critica';
  
  // Calcular tiempo en estado actual
  const tiempoEnEstado = formatDistanceToNow(
    incidencia.timestamps.recepcion.toDate(), 
    { locale: es }
  );

  // Calcular progreso SLA (simulado - en producción usar SLA targets reales)
  const minutosTranscurridos = differenceInMinutes(
    new Date(),
    incidencia.timestamps.recepcion.toDate()
  );
  const slaTarget = isCritica ? 240 : 480; // 4h críticas, 8h normales
  const slaProgress = Math.min((minutosTranscurridos / slaTarget) * 100, 100);
  const slaStatus = slaProgress < 50 ? 'ok' : slaProgress < 80 ? 'warning' : 'danger';

  if (mode === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'cursor-pointer',
          'block p-3 rounded-lg border transition-all group',
          'bg-slate-800/50 border-slate-700/50',
          'hover:bg-slate-700/50 hover:border-slate-600',
          isCritica && 'border-l-2 border-l-red-500'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Indicador criticidad */}
          <div className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            isCritica ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
          )} />

          {/* Código */}
          <span className="font-mono text-sm font-medium text-white">
            {incidencia.codigo}
          </span>

          {/* Activo */}
          <span className="text-sm text-slate-400 truncate flex-1">
            {incidencia.activoPrincipalCodigo}
          </span>

          {/* SLA indicator mini */}
          <div className={cn(
            'w-12 h-1.5 rounded-full overflow-hidden bg-slate-700',
          )}>
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                slaStatus === 'ok' && 'bg-green-500',
                slaStatus === 'warning' && 'bg-yellow-500',
                slaStatus === 'danger' && 'bg-red-500',
              )}
              style={{ width: `${slaProgress}%` }}
            />
          </div>

          {/* Tiempo */}
          <span className="text-xs text-slate-500 flex-shrink-0">
            {tiempoEnEstado}
          </span>

          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        'rounded-lg border transition-all group relative',
        'bg-slate-800/50 border-slate-700/50',
        'hover:bg-slate-700/30 hover:border-slate-600',
        onClick && 'cursor-pointer',
        isCritica && 'border-l-4 border-l-red-500'
      )}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white">
              {incidencia.codigo}
            </span>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium',
              isCritica 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-slate-500/20 text-slate-400'
            )}>
              {CRITICIDAD_LABELS[incidencia.criticidad]}
            </span>
          </div>
          
          {/* SLA Progress */}
          <div className="flex items-center gap-2">
            <div className={cn(
              'px-2 py-0.5 rounded text-xs font-mono',
              slaStatus === 'ok' && 'bg-green-500/20 text-green-400',
              slaStatus === 'warning' && 'bg-yellow-500/20 text-yellow-400',
              slaStatus === 'danger' && 'bg-red-500/20 text-red-400 animate-pulse',
            )}>
              {slaStatus === 'danger' ? '⚠ SLA' : `${Math.round(100 - slaProgress)}%`}
            </div>
          </div>
        </div>

        {/* Activo y descripción */}
        <div className="mt-2">
          <p className="text-sm font-medium text-slate-200">
            {incidencia.activoPrincipalCodigo}
          </p>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {incidencia.naturalezaFallo}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {tiempoEnEstado}
          </div>
          {incidencia.asignadoA && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">
                {incidencia.asignadoA}
              </span>
            </div>
          )}
        </div>

        {/* Quick actions - visible on hover */}
        {showActions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={onClick}
              className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
            >
              Ver
            </button>
          </div>
        )}
      </div>

      {/* SLA bar at bottom */}
      <div className="h-1 bg-slate-700">
        <div 
          className={cn(
            'h-full transition-all',
            slaStatus === 'ok' && 'bg-green-500',
            slaStatus === 'warning' && 'bg-yellow-500',
            slaStatus === 'danger' && 'bg-red-500',
          )}
          style={{ width: `${slaProgress}%` }}
        />
      </div>
    </div>
  );
}
