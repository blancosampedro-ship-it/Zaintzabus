'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  titulo: string;
  valor: number | string;
  unidad?: string;
  icono?: ReactNode;
  tendencia?: {
    valor: number;
    tipo: 'positivo' | 'negativo' | 'neutral';
    texto?: string;
  };
  estado?: 'normal' | 'alerta' | 'critico' | 'excelente';
  descripcion?: string;
  objetivo?: number;
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  titulo,
  valor,
  unidad,
  icono,
  tendencia,
  estado = 'normal',
  descripcion,
  objetivo,
  className,
  onClick,
}: KpiCardProps) {
  const getEstadoColor = () => {
    switch (estado) {
      case 'excelente':
        return 'bg-green-50 border-green-200';
      case 'alerta':
        return 'bg-amber-50 border-amber-200';
      case 'critico':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-slate-200';
    }
  };

  const getEstadoIcono = () => {
    switch (estado) {
      case 'excelente':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'alerta':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'critico':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getTendenciaIcono = () => {
    if (!tendencia) return null;

    switch (tendencia.tipo) {
      case 'positivo':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negativo':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTendenciaColor = () => {
    if (!tendencia) return '';
    switch (tendencia.tipo) {
      case 'positivo':
        return 'text-green-600 bg-green-50';
      case 'negativo':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-500 bg-slate-50';
    }
  };

  const porcentajeObjetivo =
    objetivo && typeof valor === 'number'
      ? Math.min(Math.round((valor / objetivo) * 100), 100)
      : null;

  return (
    <Card
      className={cn(
        'transition-all duration-200 border',
        getEstadoColor(),
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          {icono && <span className="text-slate-400">{icono}</span>}
          {titulo}
        </CardTitle>
        {getEstadoIcono()}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-slate-900">
            {typeof valor === 'number' ? valor.toLocaleString('es-ES') : valor}
          </div>
          {unidad && <span className="text-sm text-slate-500">{unidad}</span>}
        </div>

        {/* Tendencia */}
        {tendencia && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                getTendenciaColor()
              )}
            >
              {getTendenciaIcono()}
              {tendencia.valor > 0 ? '+' : ''}
              {tendencia.valor}%
            </span>
            {tendencia.texto && (
              <span className="text-xs text-slate-500">{tendencia.texto}</span>
            )}
          </div>
        )}

        {/* Barra de progreso hacia objetivo */}
        {porcentajeObjetivo !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Objetivo: {objetivo}</span>
              <span>{porcentajeObjetivo}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  porcentajeObjetivo >= 100
                    ? 'bg-green-500'
                    : porcentajeObjetivo >= 75
                    ? 'bg-blue-500'
                    : porcentajeObjetivo >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${porcentajeObjetivo}%` }}
              />
            </div>
          </div>
        )}

        {/* Descripción */}
        {descripcion && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {descripcion}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ================================
// Variantes especializadas
// ================================

interface KpiGaugeProps {
  titulo: string;
  valor: number;
  maximo?: number;
  unidad?: string;
  umbrales?: {
    bajo: number;
    medio: number;
    alto: number;
  };
  className?: string;
}

export function KpiGauge({
  titulo,
  valor,
  maximo = 100,
  unidad = '%',
  umbrales = { bajo: 50, medio: 75, alto: 90 },
  className,
}: KpiGaugeProps) {
  const porcentaje = Math.min((valor / maximo) * 100, 100);

  const getColor = () => {
    if (valor >= umbrales.alto) return 'text-green-600';
    if (valor >= umbrales.medio) return 'text-amber-600';
    if (valor >= umbrales.bajo) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradient = () => {
    if (valor >= umbrales.alto) return 'from-green-500 to-green-400';
    if (valor >= umbrales.medio) return 'from-amber-500 to-amber-400';
    if (valor >= umbrales.bajo) return 'from-orange-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };

  return (
    <Card className={cn('bg-white', className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center">
          {/* Gauge semicircular */}
          <div className="relative w-32 h-16 overflow-hidden">
            <div className="absolute inset-0">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                {/* Fondo */}
                <path
                  d="M 5 50 A 45 45 0 0 1 95 50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Valor */}
                <path
                  d="M 5 50 A 45 45 0 0 1 95 50"
                  fill="none"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${porcentaje * 1.41} 141.4`}
                />
                <defs>
                  <linearGradient
                    id="gaugeGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      className={cn(
                        'transition-all',
                        valor >= umbrales.alto
                          ? 'stop-color-green-500'
                          : valor >= umbrales.medio
                          ? 'stop-color-amber-500'
                          : 'stop-color-red-500'
                      )}
                      stopColor={
                        valor >= umbrales.alto
                          ? '#22c55e'
                          : valor >= umbrales.medio
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        valor >= umbrales.alto
                          ? '#4ade80'
                          : valor >= umbrales.medio
                          ? '#fbbf24'
                          : '#f87171'
                      }
                    />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Valor numérico */}
          <div className={cn('text-3xl font-bold mt-2', getColor())}>
            {valor}
            <span className="text-lg font-normal ml-1">{unidad}</span>
          </div>

          <div className="text-sm font-medium text-slate-600 mt-1">{titulo}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiMiniCardProps {
  titulo: string;
  valor: number | string;
  icono: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
  onClick?: () => void;
}

export function KpiMiniCard({
  titulo,
  valor,
  icono,
  color = 'blue',
  onClick,
}: KpiMiniCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        colorClasses[color],
        onClick && 'cursor-pointer hover:shadow-sm'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
          color === 'blue' && 'bg-blue-100',
          color === 'green' && 'bg-green-100',
          color === 'amber' && 'bg-amber-100',
          color === 'red' && 'bg-red-100',
          color === 'purple' && 'bg-purple-100',
          color === 'slate' && 'bg-slate-200'
        )}
      >
        {icono}
      </div>
      <div>
        <div className="text-lg font-bold">
          {typeof valor === 'number' ? valor.toLocaleString('es-ES') : valor}
        </div>
        <div className="text-xs font-medium opacity-80">{titulo}</div>
      </div>
    </div>
  );
}
