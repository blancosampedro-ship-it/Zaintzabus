'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bus,
  Cpu,
  CheckCircle,
  Wrench,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Autobus, ESTADOS_AUTOBUS, FASES_INSTALACION } from '@/types';

// ============================================
// FLOTA GRID - Vista de cuadrícula visual
// ============================================

export interface FlotaGridProps {
  autobuses: Autobus[];
  equiposPorBus?: Map<string, { total: number; operativos: number; averiados: number }>;
  operadores?: Array<{ id: string; nombre: string }>;
  onBusClick?: (autobus: Autobus) => void;
  className?: string;
}

export function FlotaGrid({
  autobuses,
  equiposPorBus,
  operadores,
  onBusClick,
  className,
}: FlotaGridProps) {
  const router = useRouter();

  const getOperadorNombre = (operadorId: string) => {
    return operadores?.find((o) => o.id === operadorId)?.nombre || '';
  };

  const handleClick = (autobus: Autobus) => {
    if (onBusClick) {
      onBusClick(autobus);
    } else {
      router.push(`/autobuses/${autobus.id}`);
    }
  };

  // Configuración de estados
  const estadoConfig = {
    [ESTADOS_AUTOBUS.OPERATIVO]: {
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/50',
      hoverBorder: 'hover:border-emerald-400',
      dotColor: 'bg-emerald-500',
      icon: CheckCircle,
    },
    [ESTADOS_AUTOBUS.EN_TALLER]: {
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/50',
      hoverBorder: 'hover:border-amber-400',
      dotColor: 'bg-amber-500',
      icon: Wrench,
    },
    [ESTADOS_AUTOBUS.BAJA]: {
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      hoverBorder: 'hover:border-red-400',
      dotColor: 'bg-red-500',
      icon: XCircle,
    },
  };

  return (
    <div
      className={cn(
        'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2',
        className
      )}
    >
      {autobuses.map((autobus) => {
        const config = estadoConfig[autobus.estado] || estadoConfig[ESTADOS_AUTOBUS.OPERATIVO];
        const equipos = equiposPorBus?.get(autobus.id);
        const hasAveriados = equipos && equipos.averiados > 0;
        const StatusIcon = config.icon;

        return (
          <button
            key={autobus.id}
            onClick={() => handleClick(autobus)}
            className={cn(
              'relative p-2 rounded-lg border transition-all cursor-pointer group',
              config.bgColor,
              config.borderColor,
              config.hoverBorder,
              'hover:shadow-lg hover:scale-105'
            )}
            title={`${autobus.codigo} - ${autobus.matricula}${getOperadorNombre(autobus.operadorId) ? ` (${getOperadorNombre(autobus.operadorId)})` : ''}`}
          >
            {/* Indicador de estado */}
            <div className={cn('absolute top-1 right-1 h-2 w-2 rounded-full', config.dotColor)} />

            {/* Alerta de averías */}
            {hasAveriados && (
              <div className="absolute top-1 left-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </div>
            )}

            {/* Contenido */}
            <div className="flex flex-col items-center">
              <Bus className="h-5 w-5 text-slate-300 group-hover:text-white transition-colors mb-1" />
              <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors truncate w-full text-center">
                {autobus.codigo}
              </span>
            </div>

            {/* Tooltip con más info (visible on hover) */}
            <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl min-w-[140px]">
                <p className="font-mono font-bold text-white text-sm">{autobus.codigo}</p>
                <p className="text-xs text-slate-400">{autobus.matricula}</p>
                {getOperadorNombre(autobus.operadorId) && (
                  <p className="text-xs text-slate-500 mt-1">{getOperadorNombre(autobus.operadorId)}</p>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <StatusIcon className="h-3 w-3" />
                  <span className="text-slate-300 capitalize">
                    {autobus.estado.replace(/_/g, ' ')}
                  </span>
                </div>
                {equipos && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                    <Cpu className="h-3 w-3" />
                    <span>{equipos.total} equipos</span>
                    {equipos.averiados > 0 && (
                      <span className="text-amber-500">({equipos.averiados} averiados)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// FLOTA LEGEND - Leyenda para la cuadrícula
// ============================================

export function FlotaLegend({ className }: { className?: string }) {
  const items = [
    { label: 'Operativo', color: 'bg-emerald-500' },
    { label: 'En taller', color: 'bg-amber-500' },
    { label: 'Baja', color: 'bg-red-500' },
  ];

  return (
    <div className={cn('flex items-center gap-4 text-xs', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={cn('h-3 w-3 rounded', item.color)} />
          <span className="text-slate-400">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-700">
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        <span className="text-slate-400">Con averías</span>
      </div>
    </div>
  );
}
