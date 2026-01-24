'use client';

import Link from 'next/link';
import { 
  X, 
  Bus, 
  Gauge, 
  MapPin, 
  Calendar, 
  Wrench, 
  AlertTriangle,
  ExternalLink,
  Clock,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Activo } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivoSidebarProps {
  activo: Activo | null;
  onClose: () => void;
  incidenciasActivas?: number;
  preventivosProximos?: number;
}

const ESTADO_CONFIG = {
  operativo: { 
    icon: CheckCircle, 
    color: 'text-green-400', 
    bg: 'bg-green-500/20',
    label: 'Operativo'
  },
  en_taller: { 
    icon: Wrench, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/20',
    label: 'En Taller'
  },
  averiado: { 
    icon: AlertTriangle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20',
    label: 'Averiado'
  },
  baja: { 
    icon: XCircle, 
    color: 'text-slate-500', 
    bg: 'bg-slate-500/20',
    label: 'Baja'
  },
};

export function ActivoSidebar({ 
  activo, 
  onClose, 
  incidenciasActivas = 0,
  preventivosProximos = 0 
}: ActivoSidebarProps) {
  if (!activo) return null;

  const estadoConfig = ESTADO_CONFIG[activo.estado] || ESTADO_CONFIG.operativo;
  const IconEstado = estadoConfig.icon;

  const fechaAlta = activo.fechaAlta?.toDate?.() 
    ? format(activo.fechaAlta.toDate(), 'dd MMM yyyy', { locale: es })
    : '—';

  return (
    <div className="w-80 lg:w-96 bg-slate-800 border-l border-slate-700 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
            <Bus className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-white text-lg">
              {activo.codigo}
            </h2>
            <p className="text-sm text-slate-400">
              {activo.marca} {activo.modelo}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Estado actual */}
        <div className={cn(
          'p-4 rounded-lg border flex items-center gap-3',
          estadoConfig.bg,
          'border-slate-700'
        )}>
          <IconEstado className={cn('w-6 h-6', estadoConfig.color)} />
          <div>
            <p className={cn('font-medium', estadoConfig.color)}>
              {estadoConfig.label}
            </p>
            <p className="text-xs text-slate-400">Estado actual</p>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Kilometraje</span>
            </div>
            <p className="text-lg font-mono font-bold text-white">
              {activo.kmTotales 
                ? `${(activo.kmTotales / 1000).toFixed(0)}k`
                : activo.kilometraje
                  ? `${(activo.kilometraje / 1000).toFixed(0)}k`
                  : '—'
              }
            </p>
          </div>

          <div className="p-3 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Horas Op.</span>
            </div>
            <p className="text-lg font-mono font-bold text-white">
              {activo.horasOperacion ? `${activo.horasOperacion}h` : '—'}
            </p>
          </div>
        </div>

        {/* Información */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase text-slate-500 font-medium tracking-wider">
            Información
          </h3>

          <div className="space-y-2">
            {activo.matricula && (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">Matrícula</span>
                <span className="text-sm font-mono text-white">{activo.matricula}</span>
              </div>
            )}

            {activo.numeroSerie && (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">Nº Serie</span>
                <span className="text-sm font-mono text-white truncate max-w-[150px]">
                  {activo.numeroSerie}
                </span>
              </div>
            )}

            {(activo.anioFabricacion || activo.anyoFabricacion) && (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-400">Año Fab.</span>
                <span className="text-sm font-mono text-white">
                  {activo.anioFabricacion || activo.anyoFabricacion}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
              <span className="text-sm text-slate-400">Fecha Alta</span>
              <span className="text-sm text-white">{fechaAlta}</span>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        {(activo.ubicacionNombre || activo.ubicacionBase) && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase text-slate-500 font-medium tracking-wider">
              Ubicación
            </h3>
            <div className="p-3 bg-slate-700/30 rounded-lg flex items-start gap-3">
              <MapPin className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div>
                <p className="text-sm text-white">
                  {activo.ubicacionNombre || activo.ubicacionBase?.nombre}
                </p>
                {(activo.ubicacionDireccion || activo.ubicacionBase?.direccion) && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activo.ubicacionDireccion || activo.ubicacionBase?.direccion}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Equipos instalados */}
        {activo.equipos.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase text-slate-500 font-medium tracking-wider">
              Equipos Instalados ({activo.equipos.length})
            </h3>
            <div className="space-y-2">
              {activo.equipos.slice(0, 5).map((equipo, idx) => (
                <div 
                  key={idx}
                  className="p-2 bg-slate-700/30 rounded flex items-center gap-2"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {equipo.tipo}
                    </p>
                    {equipo.posicion && (
                      <p className="text-xs text-slate-500">{equipo.posicion}</p>
                    )}
                  </div>
                </div>
              ))}
              {activo.equipos.length > 5 && (
                <p className="text-xs text-slate-500 text-center">
                  +{activo.equipos.length - 5} más
                </p>
              )}
            </div>
          </div>
        )}

        {/* Alertas */}
        {(incidenciasActivas > 0 || preventivosProximos > 0) && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase text-slate-500 font-medium tracking-wider">
              Alertas
            </h3>
            <div className="space-y-2">
              {incidenciasActivas > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-red-400">
                      {incidenciasActivas} incidencia{incidenciasActivas !== 1 ? 's' : ''} activa{incidenciasActivas !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {preventivosProximos > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      {preventivosProximos} preventivo{preventivosProximos !== 1 ? 's' : ''} próximo{preventivosProximos !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        {activo.tipo === 'autobus' && (
          <Link
            href={`/autobuses/${activo.codigo}/equipos`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            <Package className="w-4 h-4" />
            Ver Equipos Instalados
          </Link>
        )}
        <Link
          href={`/activos/${activo.id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
        >
          Ver Detalle Completo
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
