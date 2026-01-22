'use client';

import { Clock, User, Wrench, Calendar, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrdenTrabajo, ESTADOS_OT, TIPOS_OT } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface OTCardProps {
  orden: OrdenTrabajo;
  mode?: 'compact' | 'full';
  onClick?: () => void;
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  [ESTADOS_OT.PENDIENTE]: { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
  [ESTADOS_OT.ASIGNADA]: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  [ESTADOS_OT.EN_CURSO]: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400 animate-pulse' },
  [ESTADOS_OT.COMPLETADA]: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  [ESTADOS_OT.VALIDADA]: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  [ESTADOS_OT.RECHAZADA]: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
};

const ESTADO_LABELS: Record<string, string> = {
  [ESTADOS_OT.PENDIENTE]: 'Pendiente',
  [ESTADOS_OT.ASIGNADA]: 'Asignada',
  [ESTADOS_OT.EN_CURSO]: 'En curso',
  [ESTADOS_OT.COMPLETADA]: 'Completada',
  [ESTADOS_OT.VALIDADA]: 'Validada',
  [ESTADOS_OT.RECHAZADA]: 'Rechazada',
};

const TIPO_LABELS: Record<string, string> = {
  [TIPOS_OT.CORRECTIVO_URGENTE]: 'Correctivo Urgente',
  [TIPOS_OT.CORRECTIVO_PROGRAMADO]: 'Correctivo',
  [TIPOS_OT.PREVENTIVO]: 'Preventivo',
};

const TIPO_ICONS: Record<string, { bg: string; icon: string }> = {
  [TIPOS_OT.CORRECTIVO_URGENTE]: { bg: 'bg-red-500/20', icon: '⚡' },
  [TIPOS_OT.CORRECTIVO_PROGRAMADO]: { bg: 'bg-orange-500/20', icon: '🔧' },
  [TIPOS_OT.PREVENTIVO]: { bg: 'bg-blue-500/20', icon: '📋' },
};

function getTimestamp(ts: Timestamp | undefined): Date | null {
  if (!ts) return null;
  return ts.toDate();
}

export function OTCard({ orden, mode = 'compact', onClick }: OTCardProps) {
  const colors = ESTADO_COLORS[orden.estado];
  const tipoInfo = TIPO_ICONS[orden.tipo];
  const esUrgente = orden.tipo === TIPOS_OT.CORRECTIVO_URGENTE;
  const esCritica = orden.criticidad === 'critica';

  const fechaCreacion = getTimestamp(orden.auditoria?.createdAt as Timestamp);
  const tiempoTranscurrido = fechaCreacion
    ? formatDistanceToNow(fechaCreacion, { locale: es })
    : '-';

  if (mode === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'cursor-pointer',
          'block p-3 rounded-lg border transition-all group',
          'bg-slate-800/50 border-slate-700/50',
          'hover:bg-slate-700/50 hover:border-slate-600',
          (esUrgente || esCritica) && 'border-l-2 border-l-red-500'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Indicador estado */}
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />

          {/* Código */}
          <span className="font-mono text-sm font-medium text-white">
            {orden.codigo}
          </span>

          {/* Tipo */}
          <span className={cn('px-1.5 py-0.5 rounded text-xs', tipoInfo.bg)}>
            {tipoInfo.icon}
          </span>

          {/* Origen */}
          <span className="text-xs text-slate-500 truncate flex-1">
            {orden.origen === 'incidencia' ? 'INC' : 'PREV'}
          </span>

          {/* Tiempo */}
          <span className="text-xs text-slate-500 flex-shrink-0">
            {tiempoTranscurrido}
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
        (esUrgente || esCritica) && 'border-l-4 border-l-red-500'
      )}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white">
              {orden.codigo}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', tipoInfo.bg)}>
              {TIPO_LABELS[orden.tipo]}
            </span>
            {esCritica && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-xs font-medium text-red-400">
                Crítica
              </span>
            )}
          </div>

          {/* Estado */}
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colors.bg, colors.text)}>
            {ESTADO_LABELS[orden.estado]}
          </span>
        </div>

        {/* Info adicional */}
        <div className="mt-3 space-y-2">
          {/* Origen */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {orden.origen === 'incidencia' ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Desde incidencia</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>Desde preventivo</span>
              </>
            )}
          </div>

          {/* Técnico asignado */}
          {orden.tecnicoId && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <User className="w-4 h-4" />
              <span>Técnico asignado</span>
            </div>
          )}

          {/* Fecha prevista */}
          {orden.planificacion?.fechaPrevista && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>
                {format(getTimestamp(orden.planificacion.fechaPrevista as Timestamp)!, 'dd/MM/yyyy', { locale: es })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {tiempoTranscurrido}
          </div>
        </div>

        {orden.costes?.total !== undefined && orden.costes.total > 0 && (
          <span className="text-xs font-mono text-green-400">
            {orden.costes.total.toFixed(2)} €
          </span>
        )}
      </div>
    </div>
  );
}
