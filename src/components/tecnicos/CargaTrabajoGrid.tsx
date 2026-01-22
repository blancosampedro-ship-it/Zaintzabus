'use client';

import { useMemo, useState } from 'react';
import { CargaTecnico } from '@/lib/firebase/tecnicos';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CargaTrabajoGridProps {
  cargas: CargaTecnico[];
  loading?: boolean;
  onTecnicoClick?: (tecnicoId: string) => void;
  maxOTsPorDia?: number;
}

export function CargaTrabajoGrid({
  cargas,
  loading,
  onTecnicoClick,
  maxOTsPorDia = 5,
}: CargaTrabajoGridProps) {
  // Ordenar por carga (descendente)
  const cargasOrdenadas = useMemo(() => {
    return [...cargas].sort((a, b) => b.otsAsignadas - a.otsAsignadas);
  }, [cargas]);

  // Calcular promedio de carga
  const promedioCarga = useMemo(() => {
    if (cargas.length === 0) return 0;
    const total = cargas.reduce((sum, c) => sum + c.otsAsignadas, 0);
    return total / cargas.length;
  }, [cargas]);

  // Técnicos con sobrecarga
  const tecnicosSobrecarga = useMemo(() => {
    return cargas.filter((c) => c.otsAsignadas > maxOTsPorDia).length;
  }, [cargas, maxOTsPorDia]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-slate-700 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{cargas.length}</p>
          <p className="text-xs text-slate-400">Técnicos activos</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{promedioCarga.toFixed(1)}</p>
          <p className="text-xs text-slate-400">OTs promedio</p>
        </div>
        <div className={cn(
          'rounded-lg p-4 text-center',
          tecnicosSobrecarga > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
        )}>
          <p className={cn(
            'text-2xl font-bold',
            tecnicosSobrecarga > 0 ? 'text-red-400' : 'text-green-400'
          )}>
            {tecnicosSobrecarga}
          </p>
          <p className="text-xs text-slate-400">Con sobrecarga</p>
        </div>
      </div>

      {/* Lista de técnicos con barras de carga */}
      <div className="space-y-2">
        {cargasOrdenadas.map((carga) => {
          const tecnico = carga.tecnico;
          const iniciales = `${tecnico.nombre[0]}${tecnico.apellidos[0]}`.toUpperCase();
          const porcentajeCarga = Math.min((carga.otsAsignadas / maxOTsPorDia) * 100, 100);
          const sobrecarga = carga.otsAsignadas > maxOTsPorDia;
          const tendencia = carga.otsAsignadas > promedioCarga ? 'alta' : 
                          carga.otsAsignadas < promedioCarga ? 'baja' : 'media';

          return (
            <div
              key={tecnico.id}
              onClick={() => onTecnicoClick?.(tecnico.id)}
              className={cn(
                'p-4 rounded-lg border transition-all cursor-pointer',
                'bg-slate-800/50 border-slate-700/50',
                'hover:bg-slate-700/50 hover:border-slate-600',
                sobrecarga && 'border-red-500/50'
              )}
            >
              <div className="flex items-center gap-4">
                {/* Avatar y nombre */}
                <Avatar fallback={iniciales} alt={`${tecnico.nombre} ${tecnico.apellidos}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">
                      {tecnico.nombre} {tecnico.apellidos}
                    </p>
                    {sobrecarga && (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  
                  {/* Barra de carga */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          porcentajeCarga < 50 ? 'bg-green-500' :
                          porcentajeCarga < 80 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${porcentajeCarga}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-slate-400 w-8">
                      {carga.otsAsignadas}
                    </span>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        carga.disponibilidad === 'alta' ? 'success' :
                        carga.disponibilidad === 'media' ? 'warning' :
                        carga.disponibilidad === 'baja' ? 'danger' : 'default'
                      }
                      className="text-xs"
                    >
                      {carga.disponibilidad === 'sin_disponibilidad' ? 'No disp.' :
                       carga.disponibilidad.charAt(0).toUpperCase() + carga.disponibilidad.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    {tendencia === 'alta' && <TrendingUp className="w-3 h-3 text-red-400" />}
                    {tendencia === 'baja' && <TrendingDown className="w-3 h-3 text-green-400" />}
                    {tendencia === 'media' && <Minus className="w-3 h-3 text-slate-400" />}
                    <span>
                      {carga.otsPendientes} pend. / {carga.otsEnCurso} curso
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
