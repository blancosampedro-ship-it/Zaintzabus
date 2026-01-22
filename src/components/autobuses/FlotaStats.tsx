'use client';

import * as React from 'react';
import {
  Bus,
  CheckCircle,
  Wrench,
  XCircle,
  Settings,
  Cpu,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ResumenFlota, ResumenFlotaPorOperador } from '@/lib/firebase/autobuses';
import { ESTADOS_AUTOBUS, FASES_INSTALACION } from '@/types';

// ============================================
// FLOTA STATS - Estadísticas generales de flota
// ============================================

export interface FlotaStatsProps {
  resumen: ResumenFlota;
  className?: string;
}

export function FlotaStats({ resumen, className }: FlotaStatsProps) {
  const stats = [
    {
      label: 'Total flota',
      value: resumen.total,
      icon: Bus,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
    },
    {
      label: 'Operativos',
      value: resumen.operativos,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      percentage: resumen.total > 0 ? Math.round((resumen.operativos / resumen.total) * 100) : 0,
    },
    {
      label: 'En taller',
      value: resumen.enTaller,
      icon: Wrench,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Baja',
      value: resumen.baja,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              'rounded-lg p-4 border border-slate-700',
              stat.bgColor
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('h-5 w-5', stat.color)} />
              <span className="text-sm text-slate-400">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              {stat.percentage !== undefined && (
                <span className={cn('text-sm', stat.color)}>
                  {stat.percentage}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// INSTALACION STATS - Estadísticas por fase de instalación
// ============================================

export interface InstalacionStatsProps {
  resumen: ResumenFlota;
  className?: string;
}

export function InstalacionStats({ resumen, className }: InstalacionStatsProps) {
  const { porFaseInstalacion, total } = resumen;

  const fases = [
    {
      label: 'Pendiente',
      value: porFaseInstalacion.pendiente,
      percentage: total > 0 ? (porFaseInstalacion.pendiente / total) * 100 : 0,
      color: 'bg-slate-500',
    },
    {
      label: 'Pre-instalación',
      value: porFaseInstalacion.preinstalacion,
      percentage: total > 0 ? (porFaseInstalacion.preinstalacion / total) * 100 : 0,
      color: 'bg-amber-500',
    },
    {
      label: 'Completa',
      value: porFaseInstalacion.completa,
      percentage: total > 0 ? (porFaseInstalacion.completa / total) * 100 : 0,
      color: 'bg-emerald-500',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          Estado de Instalación
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Barra de progreso apilada */}
        <div className="h-4 rounded-full overflow-hidden bg-slate-700 mb-4 flex">
          {fases.map((fase) => (
            <div
              key={fase.label}
              className={cn('h-full transition-all', fase.color)}
              style={{ width: `${fase.percentage}%` }}
            />
          ))}
        </div>

        {/* Leyenda */}
        <div className="grid grid-cols-3 gap-4">
          {fases.map((fase) => (
            <div key={fase.label} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className={cn('h-3 w-3 rounded', fase.color)} />
                <span className="text-sm text-slate-400">{fase.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{fase.value}</p>
              <p className="text-xs text-slate-500">{fase.percentage.toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// FLOTA POR OPERADOR - Comparativa por operadores
// ============================================

export interface FlotaPorOperadorProps {
  data: ResumenFlotaPorOperador[];
  operadores: Array<{ id: string; nombre: string }>;
  className?: string;
}

export function FlotaPorOperador({
  data,
  operadores,
  className,
}: FlotaPorOperadorProps) {
  // Enriquecer data con nombres de operadores
  const dataConNombres = data.map((d) => ({
    ...d,
    operadorNombre: operadores.find((o) => o.id === d.operadorId)?.nombre || 'Desconocido',
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          Flota por Operador
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dataConNombres.map((op) => {
            const disponibilidad = op.total > 0 ? (op.operativos / op.total) * 100 : 0;
            const instalados = op.total > 0 ? (op.instalacionCompleta / op.total) * 100 : 0;

            return (
              <div key={op.operadorId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{op.operadorNombre}</span>
                  <span className="text-sm text-slate-400">{op.total} buses</span>
                </div>

                {/* Barra de disponibilidad */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20">Operativos</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${disponibilidad}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {op.operativos}/{op.total}
                  </span>
                </div>

                {/* Barra de instalación */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20">Instalados</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${instalados}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {op.instalacionCompleta}/{op.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// ALERTAS FLOTA - Buses con problemas
// ============================================

export interface AlertasFlotaProps {
  busesConAverias: Array<{
    autobusId: string;
    autobusCodigo: string;
    equiposAveriados: number;
  }>;
  className?: string;
}

export function AlertasFlota({ busesConAverias, className }: AlertasFlotaProps) {
  if (busesConAverias.length === 0) {
    return null;
  }

  return (
    <Card className={cn('border-amber-500/30 bg-amber-500/5', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Buses con Equipos Averiados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {busesConAverias.map((bus) => (
            <div
              key={bus.autobusId}
              className="flex items-center justify-between p-2 rounded bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-white">{bus.autobusCodigo}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <Cpu className="h-4 w-4" />
                <span className="text-sm">{bus.equiposAveriados} averiados</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
