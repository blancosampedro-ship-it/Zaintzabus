'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Cpu,
  MapPin,
  Calendar,
  MoreVertical,
  Eye,
  Pencil,
  ArrowRightLeft,
  Trash2,
  Bus,
  Warehouse,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { Equipo, EstadoEquipo, ESTADOS_EQUIPO } from '@/types';
import { Badge, Dropdown, type DropdownSection } from '@/components/ui';
import { formatDistanceToNow } from '@/lib/utils';

export interface EquipoCardProps {
  equipo: Equipo;
  onEdit?: (equipo: Equipo) => void;
  onMove?: (equipo: Equipo) => void;
  onDelete?: (equipo: Equipo) => void;
  showActions?: boolean;
  className?: string;
}

const estadoConfig: Record<
  EstadoEquipo,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary'; icon: React.ReactNode }
> = {
  [ESTADOS_EQUIPO.EN_SERVICIO]: {
    label: 'En Servicio',
    variant: 'success',
    icon: <Bus className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.EN_ALMACEN]: {
    label: 'En Almacén',
    variant: 'info',
    icon: <Warehouse className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.EN_LABORATORIO]: {
    label: 'En Laboratorio',
    variant: 'warning',
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.AVERIADO]: {
    label: 'Averiado',
    variant: 'danger',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.BAJA]: {
    label: 'Baja',
    variant: 'secondary',
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
};

export function EquipoCard({
  equipo,
  onEdit,
  onMove,
  onDelete,
  showActions = true,
  className,
}: EquipoCardProps) {
  const estado = estadoConfig[equipo.estado];

  const dropdownSections: DropdownSection[] = [
    {
      items: [
        {
          label: 'Ver detalles',
          icon: Eye,
          onClick: () => window.location.href = `/equipos/${equipo.id}`,
        },
        {
          label: 'Editar',
          icon: Pencil,
          onClick: () => onEdit?.(equipo),
        },
        {
          label: 'Mover equipo',
          icon: ArrowRightLeft,
          onClick: () => onMove?.(equipo),
        },
      ],
    },
    {
      items: [
        {
          label: 'Dar de baja',
          icon: Trash2,
          onClick: () => onDelete?.(equipo),
          danger: true,
          disabled: equipo.estado === ESTADOS_EQUIPO.BAJA,
        },
      ],
    },
  ];

  return (
    <div
      className={cn(
        'bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all group',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-700/50 rounded-lg">
            <Cpu className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <Link
              href={`/equipos/${equipo.id}`}
              className="font-semibold text-white hover:text-cyan-400 transition-colors"
            >
              {equipo.codigoInterno}
            </Link>
            <p className="text-sm text-slate-400">{equipo.tipoEquipoNombre}</p>
          </div>
        </div>
        {showActions && (
          <Dropdown
            trigger={
              <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </button>
            }
            sections={dropdownSections}
          />
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        {equipo.numeroSerieFabricante && (
          <p className="text-xs text-slate-500">
            S/N: {equipo.numeroSerieFabricante}
          </p>
        )}
        {equipo.caracteristicas?.marca && (
          <p className="text-xs text-slate-500">
            {equipo.caracteristicas.marca} {equipo.caracteristicas.modelo}
          </p>
        )}
      </div>

      {/* Ubicación */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
        <MapPin className="h-4 w-4" />
        <span className="truncate">
          {equipo.ubicacionActual.nombre}
          {equipo.ubicacionActual.posicionEnBus && (
            <span className="text-slate-500">
              {' '}
              · {equipo.ubicacionActual.posicionEnBus}
            </span>
          )}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
        <Badge variant={estado.variant} icon={estado.icon} size="sm">
          {estado.label}
        </Badge>
        {equipo.fechas.alta && (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(equipo.fechas.alta)}
          </span>
        )}
      </div>
    </div>
  );
}

// Versión compacta para listas
export function EquipoCardCompact({
  equipo,
  onClick,
  selected,
  className,
}: {
  equipo: Equipo;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  const estado = estadoConfig[equipo.estado];

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        selected
          ? 'bg-cyan-500/10 border-cyan-500/50'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600',
        className
      )}
    >
      <div className="p-2 bg-slate-700/50 rounded-lg">
        <Cpu className="h-4 w-4 text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{equipo.codigoInterno}</p>
        <p className="text-xs text-slate-400 truncate">{equipo.tipoEquipoNombre}</p>
      </div>
      <Badge variant={estado.variant} size="xs">
        {estado.label}
      </Badge>
    </div>
  );
}
