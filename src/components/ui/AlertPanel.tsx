'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Incidencia, CRITICIDAD_LABELS } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AlertPanelProps {
  incidencias: Incidencia[];
  maxItems?: number;
}

export default function AlertPanel({ incidencias, maxItems = 5 }: AlertPanelProps) {
  const alertas = incidencias
    .filter(inc => ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'].includes(inc.estado))
    .sort((a, b) => {
      // Críticas primero, luego por fecha
      if (a.criticidad === 'critica' && b.criticidad !== 'critica') return -1;
      if (b.criticidad === 'critica' && a.criticidad !== 'critica') return 1;
      return b.timestamps.recepcion.toMillis() - a.timestamps.recepcion.toMillis();
    })
    .slice(0, maxItems);

  if (alertas.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Zap className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="font-semibold text-white">Alertas Activas</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No hay alertas pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-white">Alertas Activas</h3>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            {alertas.length}
          </span>
        </div>
        <Link 
          href="/incidencias?estado=abiertas"
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Ver todas →
        </Link>
      </div>

      {/* Lista de alertas */}
      <div className="divide-y divide-slate-700/30">
        {alertas.map((inc) => (
          <Link
            key={inc.id}
            href={`/incidencias/${inc.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-slate-700/30 transition-colors group"
          >
            {/* Indicador de criticidad */}
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              inc.criticidad === 'critica' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
            )} />

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-white">
                  {inc.codigo}
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  inc.criticidad === 'critica' 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-slate-500/20 text-slate-400'
                )}>
                  {CRITICIDAD_LABELS[inc.criticidad]}
                </span>
              </div>
              <p className="text-sm text-slate-400 truncate mt-0.5">
                {inc.activoPrincipalCodigo} — {inc.naturalezaFallo}
              </p>
            </div>

            {/* Tiempo */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(inc.timestamps.recepcion.toDate(), { 
                addSuffix: true, 
                locale: es 
              })}
            </div>

            {/* Flecha */}
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
