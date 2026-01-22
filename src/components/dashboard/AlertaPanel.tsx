'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Package,
  Wrench,
  Bus,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AlertaCritica } from '@/lib/firebase/metricas';

interface AlertaPanelProps {
  alertas: AlertaCritica[];
  maxAlertas?: number;
  titulo?: string;
  onAlertaClick?: (alerta: AlertaCritica) => void;
  className?: string;
}

export function AlertaPanel({
  alertas,
  maxAlertas = 5,
  titulo = 'Alertas Críticas',
  onAlertaClick,
  className,
}: AlertaPanelProps) {
  const alertasMostradas = alertas.slice(0, maxAlertas);
  const hayMas = alertas.length > maxAlertas;

  const getIcono = (tipo: AlertaCritica['tipo']) => {
    switch (tipo) {
      case 'sla':
        return <Clock className="h-4 w-4" />;
      case 'stock':
        return <Package className="h-4 w-4" />;
      case 'preventivo':
        return <Wrench className="h-4 w-4" />;
      case 'incidencia':
        return <Bus className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSeveridadStyles = (severidad: AlertaCritica['severidad']) => {
    switch (severidad) {
      case 'alta':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600 bg-red-100',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-700',
        };
      case 'media':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600 bg-amber-100',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-700',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600 bg-blue-100',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-700',
        };
    }
  };

  if (alertas.length === 0) {
    return (
      <Card className={cn('bg-green-50 border-green-200', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600">
            ✓ No hay alertas críticas activas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-white', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {titulo}
          </CardTitle>
          <Badge variant="secondary" className="bg-slate-100">
            {alertas.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertasMostradas.map((alerta) => {
          const styles = getSeveridadStyles(alerta.severidad);

          return (
            <div
              key={alerta.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-all',
                styles.bg,
                styles.border,
                onAlertaClick && 'cursor-pointer hover:shadow-sm'
              )}
              onClick={() => onAlertaClick?.(alerta)}
            >
              <div className={cn('p-1.5 rounded-md', styles.icon)}>
                {getIcono(alerta.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium', styles.text)}>
                    {alerta.titulo}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', styles.badge)}>
                    {alerta.severidad}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate">
                  {alerta.descripcion}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {format(alerta.fechaCreacion, "dd MMM, HH:mm", { locale: es })}
                </p>
              </div>
              {onAlertaClick && (
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
              )}
            </div>
          );
        })}

        {hayMas && (
          <div className="text-center pt-2">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todas las alertas ({alertas.length})
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ================================
// Resumen de alertas compacto
// ================================

interface AlertasResumenProps {
  alertas: AlertaCritica[];
  className?: string;
}

export function AlertasResumen({ alertas, className }: AlertasResumenProps) {
  const porSeveridad = alertas.reduce(
    (acc, alerta) => {
      acc[alerta.severidad] = (acc[alerta.severidad] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const porTipo = alertas.reduce(
    (acc, alerta) => {
      acc[alerta.tipo] = (acc[alerta.tipo] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Por severidad */}
      <div className="flex gap-2">
        {porSeveridad.alta && (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            {porSeveridad.alta} críticas
          </Badge>
        )}
        {porSeveridad.media && (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            {porSeveridad.media} medias
          </Badge>
        )}
        {porSeveridad.baja && (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            {porSeveridad.baja} bajas
          </Badge>
        )}
      </div>

      {/* Por tipo */}
      <div className="flex gap-2 text-xs text-slate-500">
        {porTipo.sla && <span>🕐 {porTipo.sla} SLA</span>}
        {porTipo.stock && <span>📦 {porTipo.stock} Stock</span>}
        {porTipo.preventivo && <span>🔧 {porTipo.preventivo} Preventivos</span>}
      </div>
    </div>
  );
}
