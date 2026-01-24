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
  Phone,
  Wifi,
  Globe,
  Tag,
  Zap,
} from 'lucide-react';
import { Equipo, EstadoEquipo, ESTADOS_EQUIPO } from '@/types';
import { Badge, Dropdown, type DropdownSection } from '@/components/ui';
import { formatDistanceToNow } from '@/lib/utils';

export interface EquipoCardProps {
  equipo: Equipo;
  onEdit?: (equipo: Equipo) => void;
  onMove?: (equipo: Equipo) => void;
  onDelete?: (equipo: Equipo) => void;
  onReportarAveria?: (equipo: Equipo) => void;
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

// Tags conocidos con configuración visual
const tagConfig: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  cableado_reforzado: { 
    label: 'Cableado Reforzado', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: <Zap className="h-3 w-3" />,
  },
  migrado: { 
    label: 'Migrado', 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
  },
  requiere_atencion: { 
    label: 'Requiere Atención', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

/**
 * Detecta el "tipo lógico" del equipo para mostrar los campos relevantes.
 * Basado en tipoEquipoNombre o tipoEquipoId.
 */
function detectarTipoLogico(equipo: Equipo): 'cpu' | 'router' | 'sim' | 'camara' | 'otro' {
  const nombre = (equipo.tipoEquipoNombre || '').toLowerCase();
  const id = (equipo.tipoEquipoId || '').toLowerCase();
  
  if (nombre.includes('cpu') || nombre.includes('sae') || id.includes('cpu') || id.includes('sae')) {
    return 'cpu';
  }
  if (nombre.includes('router') || nombre.includes('modem') || id.includes('router')) {
    return 'router';
  }
  if (nombre.includes('sim') || id.includes('sim')) {
    return 'sim';
  }
  if (nombre.includes('camara') || nombre.includes('cctv') || id.includes('camara')) {
    return 'camara';
  }
  return 'otro';
}

export function EquipoCard({
  equipo,
  onEdit,
  onMove,
  onDelete,
  onReportarAveria,
  showActions = true,
  className,
}: EquipoCardProps) {
  const estado = estadoConfig[equipo.estado];
  const tipoLogico = detectarTipoLogico(equipo);

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
          label: 'Reportar avería',
          icon: AlertTriangle,
          onClick: () => onReportarAveria?.(equipo),
          disabled: equipo.estado === ESTADOS_EQUIPO.AVERIADO || equipo.estado === ESTADOS_EQUIPO.BAJA,
        },
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

  // Renderizar badge de ubicación
  const renderUbicacion = () => {
    const { ubicacionActual } = equipo;
    
    if (ubicacionActual.tipo === 'autobus') {
      // Badge especial para bus: [321] 0767-HVG
      return (
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-cyan-400" />
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300 font-medium text-sm">
            <span className="text-cyan-400">[{ubicacionActual.nombre}]</span>
            {ubicacionActual.matricula && (
              <span className="text-white">{ubicacionActual.matricula}</span>
            )}
          </span>
          {ubicacionActual.posicionEnBus && (
            <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
              {ubicacionActual.posicionEnBus}
            </span>
          )}
        </div>
      );
    }
    
    // Ubicación normal (almacén, laboratorio)
    const icon = ubicacionActual.tipo === 'laboratorio' 
      ? <Wrench className="h-4 w-4 text-amber-400" />
      : <Warehouse className="h-4 w-4 text-slate-400" />;
    
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        {icon}
        <span className="truncate">{ubicacionActual.nombre}</span>
      </div>
    );
  };

  // Renderizar "Power Fields" según tipo de equipo
  const renderPowerFields = () => {
    const fields: React.ReactNode[] = [];
    
    // Para CPUs/Routers: IP y Firmware
    if ((tipoLogico === 'cpu' || tipoLogico === 'router') && equipo.red?.ip) {
      fields.push(
        <div key="ip" className="flex items-center gap-1.5 text-xs">
          <Globe className="h-3 w-3 text-green-400" />
          <span className="text-slate-300 font-mono">{equipo.red.ip}</span>
        </div>
      );
    }
    
    if ((tipoLogico === 'cpu' || tipoLogico === 'router') && equipo.caracteristicas?.firmware) {
      fields.push(
        <div key="fw" className="flex items-center gap-1.5 text-xs">
          <Cpu className="h-3 w-3 text-slate-400" />
          <span className="text-slate-400">FW: {equipo.caracteristicas.firmware}</span>
        </div>
      );
    }
    
    // Para SIMs: Teléfono e ICCID
    if (equipo.sim?.telefono) {
      fields.push(
        <div key="tel" className="flex items-center gap-1.5 text-xs">
          <Phone className="h-3 w-3 text-blue-400" />
          <span className="text-slate-300 font-mono">{equipo.sim.telefono}</span>
        </div>
      );
    }
    
    if (equipo.sim?.iccid) {
      fields.push(
        <div key="iccid" className="flex items-center gap-1.5 text-xs">
          <Wifi className="h-3 w-3 text-slate-400" />
          <span className="text-slate-400 font-mono text-[10px]">{equipo.sim.iccid}</span>
        </div>
      );
    }
    
    if (fields.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-700/50">
        {fields}
      </div>
    );
  };

  // Renderizar tags
  const renderTags = () => {
    if (!equipo.tags || equipo.tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {equipo.tags.map((tag) => {
          const config = tagConfig[tag] || { 
            label: tag, 
            color: 'bg-slate-600/30 text-slate-400 border-slate-500/30' 
          };
          return (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border',
                config.color
              )}
            >
              {config.icon}
              {config.label}
            </span>
          );
        })}
      </div>
    );
  };

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

      {/* Info básica */}
      <div className="space-y-1 mb-3">
        {equipo.numeroSerieFabricante && (
          <p className="text-xs text-slate-500">
            S/N: <span className="font-mono text-slate-400">{equipo.numeroSerieFabricante}</span>
          </p>
        )}
        {equipo.caracteristicas?.marca && (
          <p className="text-xs text-slate-500">
            {equipo.caracteristicas.marca} {equipo.caracteristicas.modelo}
          </p>
        )}
      </div>

      {/* Power Fields (IP, Firmware, Teléfono, ICCID) */}
      {renderPowerFields()}

      {/* Tags */}
      {renderTags()}

      {/* Ubicación con badge especial para buses */}
      <div className="mt-3 mb-3">
        {renderUbicacion()}
      </div>

      {/* Footer con estado y acciones rápidas */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
        <Badge variant={estado.variant} icon={estado.icon} size="sm">
          {estado.label}
        </Badge>
        
        {/* Quick Actions - siempre visibles para técnicos */}
        <div className="flex items-center gap-1">
          {/* Botón Mover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove?.(equipo);
            }}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
            title="Mover equipo"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          
          {/* Botón Reportar Avería */}
          {equipo.estado !== ESTADOS_EQUIPO.AVERIADO && equipo.estado !== ESTADOS_EQUIPO.BAJA && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReportarAveria?.(equipo);
              }}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded transition-colors"
              title="Reportar avería"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Versión compacta para listas (con Power Fields inline)
export function EquipoCardCompact({
  equipo,
  onClick,
  selected,
  onMove,
  onReportarAveria,
  className,
}: {
  equipo: Equipo;
  onClick?: () => void;
  selected?: boolean;
  onMove?: (equipo: Equipo) => void;
  onReportarAveria?: (equipo: Equipo) => void;
  className?: string;
}) {
  const estado = estadoConfig[equipo.estado];
  const tipoLogico = detectarTipoLogico(equipo);

  // Info secundaria según tipo
  const getSecondaryInfo = () => {
    if ((tipoLogico === 'cpu' || tipoLogico === 'router') && equipo.red?.ip) {
      return <span className="text-green-400 font-mono">{equipo.red.ip}</span>;
    }
    if (equipo.sim?.telefono) {
      return <span className="text-blue-400 font-mono">{equipo.sim.telefono}</span>;
    }
    return <span>{equipo.tipoEquipoNombre}</span>;
  };

  // Badge de ubicación
  const getUbicacionBadge = () => {
    const { ubicacionActual } = equipo;
    if (ubicacionActual.tipo === 'autobus') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-medium">
          [{ubicacionActual.nombre}] {ubicacionActual.matricula || ''}
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group',
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
        <div className="flex items-center gap-2">
          <p className="font-medium text-white truncate">{equipo.codigoInterno}</p>
          {getUbicacionBadge()}
        </div>
        <p className="text-xs text-slate-400 truncate">{getSecondaryInfo()}</p>
      </div>
      
      {/* Quick actions on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove?.(equipo);
          }}
          className="p-1 text-slate-400 hover:text-cyan-400 rounded"
          title="Mover"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>
        {equipo.estado !== ESTADOS_EQUIPO.AVERIADO && equipo.estado !== ESTADOS_EQUIPO.BAJA && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReportarAveria?.(equipo);
            }}
            className="p-1 text-slate-400 hover:text-amber-400 rounded"
            title="Reportar avería"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      <Badge variant={estado.variant} size="sm">
        {estado.label}
      </Badge>
    </div>
  );
}
