'use client';

import { Bus, AlertTriangle, Wrench, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/index';

interface StatusBarProps {
  flotaOperativa: number;
  flotaTotal: number;
  incidenciasCriticas: number;
  incidenciasAbiertas: number;
  enTaller: number;
}

export default function StatusBar({
  flotaOperativa,
  flotaTotal,
  incidenciasCriticas,
  incidenciasAbiertas,
  enTaller,
}: StatusBarProps) {
  // Asegurar valores numéricos válidos
  const safeFlotaOperativa = flotaOperativa ?? 0;
  const safeFlotaTotal = flotaTotal ?? 0;
  const safeIncidenciasCriticas = incidenciasCriticas ?? 0;
  const safeIncidenciasAbiertas = incidenciasAbiertas ?? 0;
  const safeEnTaller = enTaller ?? 0;

  const disponibilidad = safeFlotaTotal > 0 ? (safeFlotaOperativa / safeFlotaTotal) * 100 : 0;
  
  // Determinar nivel de alerta global
  const alertLevel = 
    safeIncidenciasCriticas > 0 || disponibilidad < 80 ? 'critical' :
    safeIncidenciasAbiertas > 5 || disponibilidad < 90 ? 'warning' : 
    'normal';

  const alertColors = {
    critical: 'bg-red-600',
    warning: 'bg-yellow-500',
    normal: 'bg-green-500',
  };

  return (
    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-sm">
      {/* Indicador de estado global */}
      <div className="flex items-center gap-3">
        <div className={cn('w-3 h-3 rounded-full animate-pulse', alertColors[alertLevel])} />
        <span className="font-medium tracking-wide uppercase text-xs text-slate-400">
          Estado del Sistema
        </span>
      </div>

      {/* Métricas rápidas */}
      <div className="flex items-center gap-6">
        {/* Flota */}
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-slate-400" />
          <span className="font-mono">
            <span className={cn(
              'font-bold',
              disponibilidad >= 90 ? 'text-green-400' : 
              disponibilidad >= 80 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {safeFlotaOperativa}
            </span>
            <span className="text-slate-500">/{safeFlotaTotal}</span>
          </span>
          <span className="text-slate-500 text-xs">operativos</span>
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-slate-700" />

        {/* En taller */}
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-yellow-500" />
          <span className="font-mono font-bold text-yellow-400">{safeEnTaller}</span>
          <span className="text-slate-500 text-xs">en taller</span>
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-slate-700" />

        {/* Incidencias críticas */}
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn(
            'w-4 h-4',
            safeIncidenciasCriticas > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500'
          )} />
          <span className={cn(
            'font-mono font-bold',
            safeIncidenciasCriticas > 0 ? 'text-red-400' : 'text-slate-400'
          )}>
            {safeIncidenciasCriticas}
          </span>
          <span className="text-slate-500 text-xs">críticas</span>
        </div>

        {/* Separador */}
        <div className="w-px h-4 bg-slate-700" />

        {/* Incidencias abiertas */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-400" />
          <span className="font-mono font-bold text-slate-300">{safeIncidenciasAbiertas}</span>
          <span className="text-slate-500 text-xs">abiertas</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-slate-500 text-xs font-mono">
        {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
