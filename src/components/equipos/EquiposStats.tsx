'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Bus, Warehouse, Wrench, AlertTriangle, Cpu, TrendingUp } from 'lucide-react';
import { ResumenEquipos } from '@/lib/firebase/equipos';
import { StatsCard } from '@/components/ui';

export interface EquiposStatsProps {
  resumen: ResumenEquipos;
  className?: string;
}

export function EquiposStats({ resumen, className }: EquiposStatsProps) {
  const stats = [
    {
      title: 'Total Equipos',
      value: resumen.total,
      icon: Cpu,
      iconColor: 'text-cyan-400',
    },
    {
      title: 'En Servicio',
      value: resumen.enServicio,
      subtitle: `${((resumen.enServicio / resumen.total) * 100).toFixed(1)}% del total`,
      icon: Bus,
      iconColor: 'text-green-400',
    },
    {
      title: 'En Almacén',
      value: resumen.enAlmacen,
      icon: Warehouse,
      iconColor: 'text-blue-400',
    },
    {
      title: 'En Laboratorio',
      value: resumen.enLaboratorio,
      icon: Wrench,
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

// Gráfico de distribución por tipo
export function EquiposPorTipo({
  data,
  className,
}: {
  data: Record<string, number>;
  className?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const maxCount = Math.max(...entries.map(([, count]) => count));

  return (
    <div className={cn('bg-slate-800 border border-slate-700 rounded-xl p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Equipos por Tipo</h3>
      <div className="space-y-3">
        {entries.map(([tipo, count]) => {
          const percentage = ((count / total) * 100).toFixed(1);
          const barWidth = (count / maxCount) * 100;

          return (
            <div key={tipo}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">{tipo}</span>
                <span className="text-sm font-medium text-white">
                  {count} <span className="text-slate-500">({percentage}%)</span>
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mini stats para header
export function EquiposMiniStats({
  enServicio,
  averiados,
  className,
}: {
  enServicio: number;
  averiados: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm text-slate-400">
          <span className="font-medium text-white">{enServicio}</span> en servicio
        </span>
      </div>
      {averiados > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm text-slate-400">
            <span className="font-medium text-red-400">{averiados}</span> averiados
          </span>
        </div>
      )}
    </div>
  );
}
