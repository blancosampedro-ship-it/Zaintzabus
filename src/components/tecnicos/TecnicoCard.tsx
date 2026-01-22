'use client';

import { Tecnico, ESTADOS_TECNICO } from '@/types';
import { cn } from '@/lib/utils';
import { Badge, Avatar } from '@/components/ui';
import { User, MapPin, Wrench, Clock, ChevronRight, Phone, Mail } from 'lucide-react';

interface TecnicoCardProps {
  tecnico: Tecnico;
  cargaActual?: {
    otsAsignadas: number;
    disponibilidad: 'alta' | 'media' | 'baja' | 'sin_disponibilidad';
  };
  mode?: 'compact' | 'full';
  onClick?: () => void;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  [ESTADOS_TECNICO.ACTIVO]: { label: 'Activo', color: 'text-green-400', bg: 'bg-green-500/20' },
  [ESTADOS_TECNICO.VACACIONES]: { label: 'Vacaciones', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  [ESTADOS_TECNICO.BAJA_TEMPORAL]: { label: 'Baja temporal', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  [ESTADOS_TECNICO.BAJA_DEFINITIVA]: { label: 'Baja definitiva', color: 'text-red-400', bg: 'bg-red-500/20' },
};

const DISPONIBILIDAD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  alta: { label: 'Alta disponibilidad', color: 'text-green-400', bg: 'bg-green-500' },
  media: { label: 'Disponibilidad media', color: 'text-amber-400', bg: 'bg-amber-500' },
  baja: { label: 'Baja disponibilidad', color: 'text-orange-400', bg: 'bg-orange-500' },
  sin_disponibilidad: { label: 'No disponible', color: 'text-red-400', bg: 'bg-red-500' },
};

export function TecnicoCard({ tecnico, cargaActual, mode = 'compact', onClick }: TecnicoCardProps) {
  const estadoConfig = ESTADO_CONFIG[tecnico.estado];
  const disponConfig = cargaActual ? DISPONIBILIDAD_CONFIG[cargaActual.disponibilidad] : null;
  const nombreCompleto = `${tecnico.nombre} ${tecnico.apellidos}`;
  const iniciales = `${tecnico.nombre[0]}${tecnico.apellidos[0]}`.toUpperCase();

  if (mode === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border transition-all',
          'bg-slate-800/50 border-slate-700/50',
          'hover:bg-slate-700/50 hover:border-slate-600',
          onClick && 'cursor-pointer'
        )}
      >
        {/* Avatar */}
        <div className="relative">
          <Avatar fallback={iniciales} alt={nombreCompleto} size="md" />
          {disponConfig && (
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800',
                disponConfig.bg
              )}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white truncate">{nombreCompleto}</p>
            <Badge variant={tecnico.estado === ESTADOS_TECNICO.ACTIVO ? 'success' : 'default'} className="text-xs">
              {estadoConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
            {tecnico.codigoEmpleado && (
              <span className="font-mono">{tecnico.codigoEmpleado}</span>
            )}
            {tecnico.especialidades && tecnico.especialidades.length > 0 && (
              <span className="truncate">{tecnico.especialidades[0]}</span>
            )}
          </div>
        </div>

        {/* Carga actual */}
        {cargaActual && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{cargaActual.otsAsignadas}</p>
            <p className="text-xs text-slate-500">OTs</p>
          </div>
        )}

        <ChevronRight className="w-5 h-5 text-slate-600" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border transition-all',
        'bg-slate-800/50 border-slate-700/50',
        'hover:bg-slate-700/30 hover:border-slate-600',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar fallback={iniciales} alt={nombreCompleto} size="lg" />
            {disponConfig && (
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800',
                  disponConfig.bg
                )}
              />
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{nombreCompleto}</h3>
            {tecnico.codigoEmpleado && (
              <p className="text-sm font-mono text-slate-400">{tecnico.codigoEmpleado}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={tecnico.estado === ESTADOS_TECNICO.ACTIVO ? 'success' : 'default'}>
                {estadoConfig.label}
              </Badge>
              {disponConfig && (
                <span className={cn('text-xs', disponConfig.color)}>
                  {disponConfig.label}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          {cargaActual && (
            <div className="text-center bg-slate-700/50 rounded-lg px-4 py-2">
              <p className="text-2xl font-bold text-white">{cargaActual.otsAsignadas}</p>
              <p className="text-xs text-slate-400">OTs asignadas</p>
            </div>
          )}
        </div>

        {/* Contacto */}
        {tecnico.contacto && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
            {tecnico.contacto.telefono && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Phone className="w-4 h-4" />
                <span>{tecnico.contacto.telefono}</span>
              </div>
            )}
            {tecnico.contacto.email && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="w-4 h-4" />
                <span>{tecnico.contacto.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Especialidades */}
        {tecnico.especialidades && tecnico.especialidades.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {tecnico.especialidades.map((esp) => (
                <span
                  key={esp}
                  className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300"
                >
                  {esp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con estadísticas */}
      <div className="px-5 py-3 bg-slate-900/30 border-t border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-slate-400">
            <Wrench className="w-4 h-4" />
            <span>{tecnico.estadisticas?.otsCompletadas || 0} completadas</span>
          </div>
          {tecnico.estadisticas?.tiempoMedioResolucionMinutos && (
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-4 h-4" />
              <span>{Math.round(tecnico.estadisticas.tiempoMedioResolucionMinutos / 60)}h media</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
