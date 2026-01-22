'use client';

import { Package, MapPin, AlertTriangle, Wrench, CheckCircle, XCircle, Archive } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { Inventario, ESTADO_INVENTARIO_LABELS, EstadoInventario } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InventarioCardProps {
  item: Inventario;
  onClick?: () => void;
  showStock?: boolean;
}

const ESTADO_CONFIG: Record<EstadoInventario, { icon: React.ElementType; color: string; bg: string }> = {
  instalado: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  almacen: { icon: Archive, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  reparacion: { icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  baja: { icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/20' },
};

export function InventarioCard({ item, onClick, showStock = true }: InventarioCardProps) {
  const estadoConfig = ESTADO_CONFIG[item.estado];
  const IconEstado = estadoConfig.icon;

  const stockBajo = item.cantidadMinima !== undefined && 
    item.cantidadDisponible !== undefined && 
    item.cantidadDisponible < item.cantidadMinima;

  const stockCritico = item.cantidadMinima !== undefined && 
    item.cantidadDisponible !== undefined && 
    item.cantidadDisponible === 0;

  const ultimoMov = item.ultimoMovimiento?.toDate?.();
  const tiempoUltimoMov = ultimoMov 
    ? formatDistanceToNow(ultimoMov, { locale: es, addSuffix: true })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border transition-all text-left group',
        'bg-slate-800/50 hover:bg-slate-700/30',
        'border-slate-700/50 hover:border-slate-600',
        stockCritico && 'border-l-4 border-l-red-500',
        stockBajo && !stockCritico && 'border-l-4 border-l-amber-500'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icono */}
        <div className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
          'bg-slate-700/50 border border-slate-600/50'
        )}>
          <Package className="w-6 h-6 text-cyan-400" />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono font-bold text-white">
                {item.sku}
              </p>
              <p className="text-sm text-slate-300 truncate">
                {item.descripcion}
              </p>
            </div>

            {/* Badge estado */}
            <div className={cn(
              'px-2 py-1 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0',
              estadoConfig.bg, estadoConfig.color
            )}>
              <IconEstado className="w-3 h-3" />
              {ESTADO_INVENTARIO_LABELS[item.estado]}
            </div>
          </div>

          {/* Detalles */}
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>{item.fabricante} {item.modelo}</span>
            <span className="text-slate-600">•</span>
            <span>{item.categoria}</span>
          </div>

          {/* Ubicación y stock */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-slate-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{item.ubicacion.descripcion}</span>
            </div>

            {showStock && item.cantidadDisponible !== undefined && (
              <div className={cn(
                'flex items-center gap-2',
                stockCritico && 'text-red-400',
                stockBajo && !stockCritico && 'text-amber-400',
                !stockBajo && 'text-slate-400'
              )}>
                {(stockBajo || stockCritico) && <AlertTriangle className="w-3 h-3" />}
                <span className="text-sm font-mono">
                  {item.cantidadDisponible}
                  {item.cantidadMinima !== undefined && (
                    <span className="text-slate-600">/{item.cantidadMinima}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {tiempoUltimoMov && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
          Último movimiento: {tiempoUltimoMov}
        </div>
      )}
    </button>
  );
}
