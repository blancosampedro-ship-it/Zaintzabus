'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bus,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  ArrowRightLeft,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, Button, Dropdown, type DropdownItem } from '@/components/ui';
import { Autobus, ESTADOS_AUTOBUS, FASES_INSTALACION } from '@/types';

// ============================================
// AUTOBUS CARD - Tarjeta para grid de flota
// ============================================

export interface AutobusCardProps {
  autobus: Autobus;
  operadorNombre?: string;
  equiposCount?: { total: number; operativos: number; averiados: number };
  onView?: () => void;
  onEdit?: () => void;
  onManageEquipos?: () => void;
  onChangeStatus?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function AutobusCard({
  autobus,
  operadorNombre,
  equiposCount,
  onView,
  onEdit,
  onManageEquipos,
  onChangeStatus,
  onDelete,
  className,
}: AutobusCardProps) {
  // Estado visual
  const estadoConfig = {
    [ESTADOS_AUTOBUS.OPERATIVO]: {
      color: 'bg-emerald-500',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
      icon: CheckCircle,
      label: 'Operativo',
    },
    [ESTADOS_AUTOBUS.EN_TALLER]: {
      color: 'bg-amber-500',
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-amber-500/10',
      icon: Wrench,
      label: 'En taller',
    },
    [ESTADOS_AUTOBUS.BAJA]: {
      color: 'bg-red-500',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-500/10',
      icon: XCircle,
      label: 'Baja',
    },
  };

  const config = estadoConfig[autobus.estado] || estadoConfig[ESTADOS_AUTOBUS.OPERATIVO];
  const StatusIcon = config.icon;

  // Fase de instalación
  const faseConfig = {
    [FASES_INSTALACION.PENDIENTE]: { label: 'Sin instalar', variant: 'secondary' as const },
    [FASES_INSTALACION.PREINSTALACION]: { label: 'Pre-instalado', variant: 'warning' as const },
    [FASES_INSTALACION.COMPLETA]: { label: 'Instalado', variant: 'success' as const },
  };
  const fase = autobus.instalacion?.fase || FASES_INSTALACION.PENDIENTE;
  const faseInfo = faseConfig[fase];

  // Menú de acciones
  const menuItems: DropdownItem[] = [
    ...(onView ? [{ label: 'Ver detalles', onClick: onView, icon: <Eye className="h-4 w-4" /> }] : []),
    ...(onEdit ? [{ label: 'Editar', onClick: onEdit, icon: <Edit className="h-4 w-4" /> }] : []),
    ...(onManageEquipos ? [{ label: 'Gestionar equipos', onClick: onManageEquipos, icon: <Settings className="h-4 w-4" /> }] : []),
    ...(onChangeStatus ? [{ label: 'Cambiar estado', onClick: onChangeStatus, icon: <ArrowRightLeft className="h-4 w-4" /> }] : []),
    ...(onDelete ? [{ type: 'divider' as const }, { label: 'Dar de baja', onClick: onDelete, icon: <Trash2 className="h-4 w-4" />, variant: 'danger' as const }] : []),
  ];

  const hasAveriados = equiposCount && equiposCount.averiados > 0;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all hover:shadow-lg',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Indicador de estado en esquina */}
      <div className={cn('absolute top-3 right-3 h-3 w-3 rounded-full', config.color)} />

      {/* Alerta de equipos averiados */}
      {hasAveriados && (
        <div className="absolute top-3 right-8">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
      )}

      {/* Header con código */}
      <div className="flex items-start justify-between mb-3">
        <Link href={`/autobuses/${autobus.id}`} className="group">
          <div className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            <span className="font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">
              {autobus.codigo}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{autobus.matricula}</p>
        </Link>

        {menuItems.length > 0 && (
          <Dropdown items={menuItems} align="right">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </Dropdown>
        )}
      </div>

      {/* Info del vehículo */}
      {(autobus.marca || autobus.modelo) && (
        <p className="text-sm text-slate-300 mb-2">
          {[autobus.marca, autobus.modelo].filter(Boolean).join(' ')}
        </p>
      )}

      {/* Operador */}
      {operadorNombre && (
        <p className="text-xs text-slate-500 mb-3">{operadorNombre}</p>
      )}

      {/* Estado y fase */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={autobus.estado === ESTADOS_AUTOBUS.OPERATIVO ? 'success' : autobus.estado === ESTADOS_AUTOBUS.EN_TALLER ? 'warning' : 'danger'} size="sm">
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
        <Badge variant={faseInfo.variant} size="sm">
          {faseInfo.label}
        </Badge>
      </div>

      {/* Contador de equipos */}
      {equiposCount && (
        <div className="flex items-center gap-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-1.5 text-sm">
            <Cpu className="h-4 w-4 text-slate-400" />
            <span className="text-slate-300">{equiposCount.total}</span>
            <span className="text-slate-500">equipos</span>
          </div>
          {equiposCount.averiados > 0 && (
            <div className="flex items-center gap-1 text-sm text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{equiposCount.averiados} averiados</span>
            </div>
          )}
        </div>
      )}

      {/* Indicadores FMS/Cartelería */}
      <div className="flex items-center gap-2 mt-2 text-xs">
        {autobus.telemetria?.tieneFms && (
          <span className={cn(
            'px-1.5 py-0.5 rounded',
            autobus.telemetria.fmsConectado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'
          )}>
            FMS
          </span>
        )}
        {autobus.carteleria?.tiene && (
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
            Cartelería
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// AUTOBUS MINI CARD - Para selectores y listas compactas
// ============================================

export interface AutobusMiniCardProps {
  autobus: Autobus;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AutobusMiniCard({
  autobus,
  selected,
  onClick,
  className,
}: AutobusMiniCardProps) {
  const estadoColor = {
    [ESTADOS_AUTOBUS.OPERATIVO]: 'bg-emerald-500',
    [ESTADOS_AUTOBUS.EN_TALLER]: 'bg-amber-500',
    [ESTADOS_AUTOBUS.BAJA]: 'bg-red-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-lg border transition-all text-left',
        selected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-slate-700 bg-slate-800 hover:border-slate-600',
        className
      )}
    >
      <div className={cn('h-2 w-2 rounded-full', estadoColor[autobus.estado])} />
      <Bus className="h-4 w-4 text-slate-400" />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-white truncate">{autobus.codigo}</p>
        <p className="text-xs text-slate-500 truncate">{autobus.matricula}</p>
      </div>
      {autobus.contadores.totalEquipos > 0 && (
        <span className="text-xs text-slate-400">
          {autobus.contadores.totalEquipos} eq.
        </span>
      )}
    </button>
  );
}
