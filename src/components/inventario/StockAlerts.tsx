'use client';

import { useMemo } from 'react';
import { Inventario } from '@/types';
import { cn } from '@/lib/utils/index';
import { AlertTriangle, TrendingDown, Package, AlertCircle } from 'lucide-react';

interface StockAlertsProps {
  items: Inventario[];
  onItemClick?: (item: Inventario) => void;
}

interface AlertItem {
  item: Inventario;
  tipo: 'critico' | 'bajo';
  porcentaje: number;
}

export function StockAlerts({ items, onItemClick }: StockAlertsProps) {
  const alertas = useMemo(() => {
    const alerts: AlertItem[] = [];

    items.forEach(item => {
      if (item.cantidadMinima === undefined || item.cantidadDisponible === undefined) return;

      if (item.cantidadDisponible === 0) {
        alerts.push({ 
          item, 
          tipo: 'critico', 
          porcentaje: 0 
        });
      } else if (item.cantidadDisponible < item.cantidadMinima) {
        const pct = Math.round((item.cantidadDisponible / item.cantidadMinima) * 100);
        alerts.push({ 
          item, 
          tipo: 'bajo', 
          porcentaje: pct 
        });
      }
    });

    // Ordenar: críticos primero, luego por porcentaje
    return alerts.sort((a, b) => {
      if (a.tipo === 'critico' && b.tipo !== 'critico') return -1;
      if (b.tipo === 'critico' && a.tipo !== 'critico') return 1;
      return a.porcentaje - b.porcentaje;
    });
  }, [items]);

  const criticos = alertas.filter(a => a.tipo === 'critico').length;
  const bajos = alertas.filter(a => a.tipo === 'bajo').length;

  if (alertas.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 text-green-400 mb-2">
          <Package className="w-5 h-5" />
          <h3 className="font-medium">Stock OK</h3>
        </div>
        <p className="text-sm text-slate-400">
          No hay alertas de stock bajo
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-medium text-white">Alertas de Stock</h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {criticos > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                {criticos} sin stock
              </span>
            )}
            {bajos > 0 && (
              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                {bajos} bajo mínimo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="max-h-[400px] overflow-y-auto">
        {alertas.map((alerta) => (
          <button
            key={alerta.item.id}
            onClick={() => onItemClick?.(alerta.item)}
            className={cn(
              'w-full p-3 flex items-center gap-3 border-b border-slate-700/30',
              'hover:bg-slate-700/30 transition-colors text-left',
              alerta.tipo === 'critico' && 'bg-red-500/5'
            )}
          >
            {/* Indicador */}
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              alerta.tipo === 'critico' 
                ? 'bg-red-500/20' 
                : 'bg-amber-500/20'
            )}>
              {alerta.tipo === 'critico' ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-amber-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm font-medium text-white truncate">
                {alerta.item.sku}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {alerta.item.descripcion}
              </p>
            </div>

            {/* Stock */}
            <div className="text-right flex-shrink-0">
              <p className={cn(
                'font-mono font-bold',
                alerta.tipo === 'critico' ? 'text-red-400' : 'text-amber-400'
              )}>
                {alerta.item.cantidadDisponible}/{alerta.item.cantidadMinima}
              </p>
              <p className="text-xs text-slate-500">
                {alerta.tipo === 'critico' ? 'Sin stock' : `${alerta.porcentaje}%`}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="w-16 flex-shrink-0">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all',
                    alerta.tipo === 'critico' ? 'bg-red-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${alerta.porcentaje}%` }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      {alertas.length > 5 && (
        <div className="p-3 border-t border-slate-700/50 text-center">
          <span className="text-xs text-slate-500">
            Mostrando {alertas.length} alertas
          </span>
        </div>
      )}
    </div>
  );
}
