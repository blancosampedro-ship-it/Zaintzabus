'use client';

import * as React from 'react';
import {
  Cpu,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRightLeft,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Badge, EmptyState } from '@/components/ui';
import { Equipo, ESTADOS_EQUIPO } from '@/types';

// ============================================
// POSICIONES DEL BUS - Constantes
// ============================================

export const POSICIONES_BUS_SCHEMA = {
  CABINA_CONDUCTOR: { x: 10, y: 10, width: 80, height: 60, label: 'Cabina' },
  SALPICADERO: { x: 100, y: 15, width: 60, height: 50, label: 'Salpicadero' },
  TECHO_DELANTERO: { x: 10, y: 80, width: 150, height: 30, label: 'Techo Delantero' },
  TECHO_CENTRAL: { x: 170, y: 80, width: 160, height: 30, label: 'Techo Central' },
  TECHO_TRASERO: { x: 340, y: 80, width: 150, height: 30, label: 'Techo Trasero' },
  LATERAL_IZQUIERDO: { x: 10, y: 120, width: 480, height: 25, label: 'Lateral Izq.' },
  LATERAL_DERECHO: { x: 10, y: 210, width: 480, height: 25, label: 'Lateral Der.' },
  ZONA_PASAJEROS_DELANTERA: { x: 100, y: 150, width: 100, height: 25, label: 'Pasajeros Del.' },
  ZONA_PASAJEROS_CENTRAL: { x: 210, y: 150, width: 100, height: 25, label: 'Pasajeros Cent.' },
  ZONA_PASAJEROS_TRASERA: { x: 320, y: 150, width: 100, height: 25, label: 'Pasajeros Tras.' },
  MALETERO: { x: 340, y: 180, width: 150, height: 25, label: 'Maletero' },
} as const;

export const POSICIONES_BUS_LABELS = {
  CABINA_CONDUCTOR: 'Cabina del conductor',
  SALPICADERO: 'Salpicadero',
  TECHO_DELANTERO: 'Techo delantero',
  TECHO_CENTRAL: 'Techo central',
  TECHO_TRASERO: 'Techo trasero',
  LATERAL_IZQUIERDO: 'Lateral izquierdo',
  LATERAL_DERECHO: 'Lateral derecho',
  ZONA_PASAJEROS_DELANTERA: 'Zona pasajeros delantera',
  ZONA_PASAJEROS_CENTRAL: 'Zona pasajeros central',
  ZONA_PASAJEROS_TRASERA: 'Zona pasajeros trasera',
  MALETERO: 'Maletero',
} as const;

// ============================================
// BUS SCHEMA - Esquema visual del bus
// ============================================

export interface BusSchemaProps {
  equipos: Equipo[];
  onPositionClick?: (posicion: string, equipo?: Equipo) => void;
  selectedPosition?: string | null;
  className?: string;
}

export function BusSchema({
  equipos,
  onPositionClick,
  selectedPosition,
  className,
}: BusSchemaProps) {
  const [hoveredPosition, setHoveredPosition] = React.useState<string | null>(null);

  // Mapear equipos por posición
  const equiposPorPosicion = React.useMemo(() => {
    const map = new Map<string, Equipo>();
    equipos.forEach((equipo) => {
      if (equipo.ubicacionActual.posicionEnBus) {
        map.set(equipo.ubicacionActual.posicionEnBus, equipo);
      }
    });
    return map;
  }, [equipos]);

  const getPositionColor = (posicion: string) => {
    const equipo = equiposPorPosicion.get(posicion);
    if (!equipo) return { fill: '#334155', stroke: '#475569' }; // Vacío - gris

    switch (equipo.estado) {
      case ESTADOS_EQUIPO.EN_SERVICIO:
        return { fill: '#059669', stroke: '#10b981' }; // Verde
      case ESTADOS_EQUIPO.AVERIADO:
        return { fill: '#dc2626', stroke: '#ef4444' }; // Rojo
      default:
        return { fill: '#f59e0b', stroke: '#fbbf24' }; // Amarillo
    }
  };

  return (
    <div className={cn('relative', className)}>
      <svg viewBox="0 0 500 250" className="w-full h-auto">
        {/* Fondo del bus */}
        <rect
          x="5"
          y="5"
          width="490"
          height="240"
          rx="20"
          fill="#1e293b"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Cabina frontal */}
        <rect
          x="5"
          y="5"
          width="90"
          height="240"
          rx="20"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Posiciones interactivas */}
        {Object.entries(POSICIONES_BUS_SCHEMA).map(([key, pos]) => {
          const colors = getPositionColor(key);
          const equipo = equiposPorPosicion.get(key);
          const isSelected = selectedPosition === key;
          const isHovered = hoveredPosition === key;

          return (
            <g key={key}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                rx="4"
                fill={colors.fill}
                stroke={isSelected ? '#06b6d4' : isHovered ? '#94a3b8' : colors.stroke}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition-all"
                onClick={() => onPositionClick?.(key, equipo)}
                onMouseEnter={() => setHoveredPosition(key)}
                onMouseLeave={() => setHoveredPosition(null)}
              />
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + pos.height / 2 + 4}
                textAnchor="middle"
                fill="white"
                fontSize="9"
                className="pointer-events-none select-none"
              >
                {pos.label}
              </text>
              {equipo && (
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height - 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  className="pointer-events-none select-none opacity-70"
                >
                  {equipo.codigoInterno}
                </text>
              )}
            </g>
          );
        })}

        {/* Ruedas */}
        <ellipse cx="70" cy="245" rx="25" ry="8" fill="#0f172a" stroke="#334155" />
        <ellipse cx="430" cy="245" rx="25" ry="8" fill="#0f172a" stroke="#334155" />
      </svg>

      {/* Tooltip */}
      {hoveredPosition && (
        <div className="absolute top-2 right-2 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl z-10 min-w-[200px]">
          <p className="font-medium text-white mb-1">
            {POSICIONES_BUS_LABELS[hoveredPosition as keyof typeof POSICIONES_BUS_LABELS]}
          </p>
          {equiposPorPosicion.get(hoveredPosition) ? (
            <div>
              <p className="text-sm text-cyan-400 font-mono">
                {equiposPorPosicion.get(hoveredPosition)?.codigoInterno}
              </p>
              <p className="text-xs text-slate-400">
                {equiposPorPosicion.get(hoveredPosition)?.tipoEquipoNombre}
              </p>
              <Badge
                variant={
                  equiposPorPosicion.get(hoveredPosition)?.estado === ESTADOS_EQUIPO.EN_SERVICIO
                    ? 'success'
                    : equiposPorPosicion.get(hoveredPosition)?.estado === ESTADOS_EQUIPO.AVERIADO
                    ? 'danger'
                    : 'warning'
                }
                size="sm"
                className="mt-1"
              >
                {equiposPorPosicion.get(hoveredPosition)?.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Posición vacía</p>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-600" />
          <span className="text-slate-400">Operativo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-600" />
          <span className="text-slate-400">Averiado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-500" />
          <span className="text-slate-400">Otro estado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-slate-600 border border-slate-500" />
          <span className="text-slate-400">Vacío</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EQUIPOS LIST - Lista de equipos del bus
// ============================================

export interface EquiposListProps {
  equipos: Equipo[];
  onEquipoClick?: (equipo: Equipo) => void;
  onMoverEquipo?: (equipo: Equipo) => void;
  selectedEquipoId?: string | null;
  className?: string;
}

export function EquiposList({
  equipos,
  onEquipoClick,
  onMoverEquipo,
  selectedEquipoId,
  className,
}: EquiposListProps) {
  if (equipos.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="Sin equipos instalados"
        description="Este autobús no tiene equipos embarcados"
        className={className}
      />
    );
  }

  const estadoConfig = {
    [ESTADOS_EQUIPO.EN_SERVICIO]: {
      icon: CheckCircle,
      color: 'text-emerald-500',
      label: 'Operativo',
    },
    [ESTADOS_EQUIPO.AVERIADO]: {
      icon: AlertTriangle,
      color: 'text-red-500',
      label: 'Averiado',
    },
  };

  return (
    <div className={cn('space-y-2', className)}>
      {equipos.map((equipo) => {
        const config = estadoConfig[equipo.estado as keyof typeof estadoConfig] || {
          icon: Cpu,
          color: 'text-amber-500',
          label: equipo.estado,
        };
        const StatusIcon = config.icon;
        const isSelected = selectedEquipoId === equipo.id;

        return (
          <div
            key={equipo.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-all',
              isSelected
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            )}
          >
            <StatusIcon className={cn('h-5 w-5', config.color)} />
            
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onEquipoClick?.(equipo)}
                className="font-mono text-sm text-cyan-400 hover:text-cyan-300"
              >
                {equipo.codigoInterno}
              </button>
              <p className="text-xs text-slate-400">{equipo.tipoEquipoNombre}</p>
              {equipo.numeroSerieFabricante && (
                <p className="text-xs text-slate-500">
                  S/N: <span className="font-mono text-slate-400">{equipo.numeroSerieFabricante}</span>
                </p>
              )}
              {equipo.ubicacionActual.posicionEnBus && (
                <p className="text-xs text-slate-500">
                  📍 {POSICIONES_BUS_LABELS[equipo.ubicacionActual.posicionEnBus as keyof typeof POSICIONES_BUS_LABELS] || equipo.ubicacionActual.posicionEnBus}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEquipoClick?.(equipo)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {onMoverEquipo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMoverEquipo(equipo)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
