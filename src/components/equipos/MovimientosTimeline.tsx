'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Calendar,
  User,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRightLeft,
  Wrench,
  Package,
  XCircle,
} from 'lucide-react';
import { MovimientoEquipo, TipoMovimientoEquipo, TIPOS_MOVIMIENTO_EQUIPO } from '@/types';
import { formatDistanceToNow, formatDate } from '@/lib/utils';

export interface MovimientosTimelineProps {
  movimientos: MovimientoEquipo[];
  className?: string;
}

const tipoMovimientoConfig: Record<
  TipoMovimientoEquipo,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  [TIPOS_MOVIMIENTO_EQUIPO.ALTA]: {
    label: 'Alta en sistema',
    icon: CheckCircle,
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.PREINSTALACION]: {
    label: 'Pre-instalación',
    icon: Package,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.INSTALACION]: {
    label: 'Instalación',
    icon: ArrowRight,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.SUSTITUCION]: {
    label: 'Sustitución',
    icon: ArrowRightLeft,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.RETIRADA_AVERIA]: {
    label: 'Retirada por avería',
    icon: AlertTriangle,
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.RETORNO_LABORATORIO]: {
    label: 'Retorno de laboratorio',
    icon: Wrench,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.REUBICACION]: {
    label: 'Reubicación',
    icon: MapPin,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  [TIPOS_MOVIMIENTO_EQUIPO.BAJA]: {
    label: 'Baja',
    icon: XCircle,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  },
};

export function MovimientosTimeline({ movimientos, className }: MovimientosTimelineProps) {
  if (movimientos.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-400', className)}>
        No hay movimientos registrados
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {movimientos.map((mov, index) => {
        const config = tipoMovimientoConfig[mov.tipoMovimiento];
        const Icon = config.icon;
        const isLast = index === movimientos.length - 1;

        return (
          <div key={mov.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-700" />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0',
                config.color
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-white">{config.label}</h4>
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(mov.fecha)}
                  </span>
                </div>

                {/* Origen -> Destino */}
                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-slate-400">{mov.origen.nombre}</span>
                  {mov.origen.posicionEnBus && (
                    <span className="text-slate-500 text-xs">
                      ({mov.origen.posicionEnBus})
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  <span className="text-white font-medium">{mov.destino.nombre}</span>
                  {mov.destino.posicionEnBus && (
                    <span className="text-cyan-400 text-xs">
                      ({mov.destino.posicionEnBus})
                    </span>
                  )}
                </div>

                {/* Motivo */}
                {mov.motivo && (
                  <div className="flex items-start gap-2 text-sm text-slate-400 mb-2">
                    <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{mov.motivo}</span>
                  </div>
                )}

                {/* Comentarios */}
                {mov.comentarios && (
                  <p className="text-sm text-slate-500 italic mt-2">
                    &quot;{mov.comentarios}&quot;
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(mov.fecha)}
                  </span>
                  {mov.incidenciaId && (
                    <span className="text-amber-400">
                      Incidencia vinculada
                    </span>
                  )}
                  {mov.otId && (
                    <span className="text-cyan-400">
                      OT vinculada
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Versión compacta para sidebar
export function MovimientosCompact({
  movimientos,
  maxItems = 5,
  className,
}: {
  movimientos: MovimientoEquipo[];
  maxItems?: number;
  className?: string;
}) {
  const items = movimientos.slice(0, maxItems);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((mov) => {
        const config = tipoMovimientoConfig[mov.tipoMovimiento];
        const Icon = config.icon;

        return (
          <div
            key={mov.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50"
          >
            <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{config.label}</p>
              <p className="text-xs text-slate-500 truncate">
                {mov.origen.nombre} → {mov.destino.nombre}
              </p>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {formatDistanceToNow(mov.fecha)}
            </span>
          </div>
        );
      })}
      {movimientos.length > maxItems && (
        <p className="text-xs text-slate-500 text-center pt-2">
          +{movimientos.length - maxItems} más
        </p>
      )}
    </div>
  );
}
