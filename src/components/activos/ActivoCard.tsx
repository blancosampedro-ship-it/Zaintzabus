'use client';

import { Bus, Wrench, CheckCircle, XCircle, AlertTriangle, Gauge, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Activo } from '@/types';

interface ActivoCardProps {
  activo: Activo;
  selected?: boolean;
  onClick?: () => void;
  size?: 'compact' | 'normal';
}

const ESTADO_CONFIG = {
  operativo: { 
    icon: CheckCircle, 
    color: 'text-green-400', 
    bg: 'bg-green-500/20', 
    border: 'border-green-500/50',
    label: 'Operativo'
  },
  en_taller: { 
    icon: Wrench, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/20', 
    border: 'border-amber-500/50',
    label: 'En Taller'
  },
  averiado: { 
    icon: AlertTriangle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20', 
    border: 'border-red-500/50',
    label: 'Averiado'
  },
  baja: { 
    icon: XCircle, 
    color: 'text-slate-500', 
    bg: 'bg-slate-500/20', 
    border: 'border-slate-500/50',
    label: 'Baja'
  },
};

export function ActivoCard({ activo, selected, onClick, size = 'normal' }: ActivoCardProps) {
  const estadoConfig = ESTADO_CONFIG[activo.estado] || ESTADO_CONFIG.operativo;
  const IconEstado = estadoConfig.icon;

  if (size === 'compact') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full p-3 rounded-lg border transition-all text-left',
          'bg-slate-800/50 hover:bg-slate-700/50',
          selected 
            ? 'border-cyan-500 ring-1 ring-cyan-500/50' 
            : 'border-slate-700/50 hover:border-slate-600',
          activo.estado === 'averiado' && 'border-l-2 border-l-red-500'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Indicador estado */}
          <div className={cn('p-1.5 rounded', estadoConfig.bg)}>
            <IconEstado className={cn('w-4 h-4', estadoConfig.color)} />
          </div>

          {/* Código */}
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-white text-sm truncate">
              {activo.codigo}
            </p>
            {activo.marca && (
              <p className="text-xs text-slate-400 truncate">
                {activo.marca} {activo.modelo}
              </p>
            )}
          </div>

          {/* KM o ubicación */}
          {activo.kmTotales && (
            <div className="text-xs text-slate-500 font-mono">
              {(activo.kmTotales / 1000).toFixed(0)}k km
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border transition-all text-left group',
        'bg-slate-800/50 hover:bg-slate-700/30',
        selected 
          ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
          : 'border-slate-700/50 hover:border-slate-600',
        activo.estado === 'averiado' && 'border-l-4 border-l-red-500',
        activo.estado === 'en_taller' && 'border-l-4 border-l-amber-500'
      )}
    >
      {/* Header con icono y estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            'bg-slate-700/50 border border-slate-600/50'
          )}>
            <Bus className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white text-lg">
              {activo.codigo}
            </h3>
            <p className="text-sm text-slate-400">
              {activo.marca} {activo.modelo}
            </p>
          </div>
        </div>

        {/* Badge estado */}
        <div className={cn(
          'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
          estadoConfig.bg, estadoConfig.color
        )}>
          <IconEstado className="w-3 h-3" />
          {estadoConfig.label}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Kilometraje */}
        <div className="flex items-center gap-2 text-sm">
          <Gauge className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400">
            {activo.kmTotales 
              ? `${(activo.kmTotales / 1000).toFixed(0)}k km`
              : activo.horasOperacion 
                ? `${activo.horasOperacion}h`
                : '—'
            }
          </span>
        </div>

        {/* Ubicación */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 truncate">
            {activo.ubicacionNombre || activo.ubicacionBase?.nombre || '—'}
          </span>
        </div>
      </div>

      {/* Equipos instalados */}
      {activo.equipos && activo.equipos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">
            <span className="text-cyan-400 font-mono">{activo.equipos.length}</span> equipos instalados
          </p>
        </div>
      )}

      {/* Incidencias activas (si hay) - esto se podría pasar como prop */}
      {activo.estado === 'averiado' && (
        <div className="mt-2 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Requiere atención
        </div>
      )}
    </button>
  );
}
