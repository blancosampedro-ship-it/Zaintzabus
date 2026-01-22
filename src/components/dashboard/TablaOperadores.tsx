'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Building2,
  Bus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import type { MetricasOperador } from '@/lib/firebase/metricas';

interface TablaOperadoresProps {
  operadores: MetricasOperador[];
  titulo?: string;
  mostrarRentabilidad?: boolean; // Solo para WINFIN
  onOperadorClick?: (operadorId: string) => void;
  className?: string;
}

export function TablaOperadores({
  operadores,
  titulo = 'Comparativa de Operadores',
  mostrarRentabilidad = false,
  onOperadorClick,
  className,
}: TablaOperadoresProps) {
  const getDisponibilidadColor = (disponibilidad: number) => {
    if (disponibilidad >= 95) return 'text-green-600 bg-green-50';
    if (disponibilidad >= 85) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getDisponibilidadIcono = (disponibilidad: number) => {
    if (disponibilidad >= 95) return <CheckCircle2 className="h-4 w-4" />;
    if (disponibilidad >= 85) return <TrendingDown className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <Card className={cn('bg-white', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            {titulo}
          </CardTitle>
          <Badge variant="secondary" className="bg-slate-100">
            {operadores.length} operadores
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-2 font-medium text-slate-500">
                  #
                </th>
                <th className="text-left py-3 px-2 font-medium text-slate-500">
                  Operador
                </th>
                <th className="text-center py-3 px-2 font-medium text-slate-500">
                  <div className="flex items-center justify-center gap-1">
                    <Bus className="h-3.5 w-3.5" />
                    Flota
                  </div>
                </th>
                <th className="text-center py-3 px-2 font-medium text-slate-500">
                  Disponibilidad
                </th>
                <th className="text-center py-3 px-2 font-medium text-slate-500">
                  Incidencias
                </th>
                <th className="text-center py-3 px-2 font-medium text-slate-500">
                  OTs
                </th>
                <th className="text-center py-3 px-2 font-medium text-slate-500">
                  SLA
                </th>
                {mostrarRentabilidad && (
                  <th className="text-center py-3 px-2 font-medium text-slate-500">
                    Rentabilidad
                  </th>
                )}
                <th className="text-right py-3 px-2 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {operadores.map((op, index) => (
                <tr
                  key={op.operadorId}
                  className={cn(
                    'border-b border-slate-50 transition-colors',
                    onOperadorClick && 'hover:bg-slate-50 cursor-pointer'
                  )}
                  onClick={() => onOperadorClick?.(op.operadorId)}
                >
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-medium text-slate-800">
                      {op.operadorNombre}
                    </div>
                    <div className="text-xs text-slate-400">{op.operadorId}</div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="font-medium text-slate-700">
                      {op.autobusesOperativos}/{op.totalAutobuses}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        getDisponibilidadColor(op.disponibilidad)
                      )}
                    >
                      {getDisponibilidadIcono(op.disponibilidad)}
                      {op.disponibilidad}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {op.incidenciasAbiertas > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-red-50 text-red-700"
                      >
                        {op.incidenciasAbiertas}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700"
                      >
                        0
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {op.otsPendientes > 0 ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-50 text-amber-700"
                      >
                        {op.otsPendientes}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={cn(
                        'font-medium',
                        op.cumplimientoSLA >= 90
                          ? 'text-green-600'
                          : op.cumplimientoSLA >= 75
                          ? 'text-amber-600'
                          : 'text-red-600'
                      )}
                    >
                      {op.cumplimientoSLA}%
                    </span>
                  </td>
                  {mostrarRentabilidad && (
                    <td className="py-3 px-2 text-center">
                      {op.rentabilidad !== undefined ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 font-medium',
                            op.rentabilidad >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {op.rentabilidad >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {op.rentabilidad}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-2 text-right">
                    {onOperadorClick && (
                      <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// Ranking compacto de operadores
// ================================

interface RankingOperadoresProps {
  operadores: MetricasOperador[];
  metrica: 'disponibilidad' | 'cumplimientoSLA' | 'incidenciasAbiertas';
  titulo?: string;
  limite?: number;
  className?: string;
}

export function RankingOperadores({
  operadores,
  metrica,
  titulo,
  limite = 5,
  className,
}: RankingOperadoresProps) {
  const operadoresOrdenados = [...operadores]
    .sort((a, b) => {
      if (metrica === 'incidenciasAbiertas') {
        return a[metrica] - b[metrica]; // Menos es mejor
      }
      return b[metrica] - a[metrica]; // Más es mejor
    })
    .slice(0, limite);

  const getValor = (op: MetricasOperador) => {
    switch (metrica) {
      case 'disponibilidad':
        return `${op.disponibilidad}%`;
      case 'cumplimientoSLA':
        return `${op.cumplimientoSLA}%`;
      case 'incidenciasAbiertas':
        return op.incidenciasAbiertas.toString();
    }
  };

  const tituloDefault = {
    disponibilidad: 'Mejor Disponibilidad',
    cumplimientoSLA: 'Mejor Cumplimiento SLA',
    incidenciasAbiertas: 'Menos Incidencias',
  };

  return (
    <Card className={cn('bg-white', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {titulo || tituloDefault[metrica]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {operadoresOrdenados.map((op, index) => (
          <div
            key={op.operadorId}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                  index === 0 && 'bg-amber-100 text-amber-700',
                  index === 1 && 'bg-slate-200 text-slate-700',
                  index === 2 && 'bg-orange-100 text-orange-700',
                  index > 2 && 'bg-slate-100 text-slate-500'
                )}
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {op.operadorNombre}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-900">
              {getValor(op)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
