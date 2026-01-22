'use client';

import Link from 'next/link';
import { Inventario, ESTADO_INVENTARIO_LABELS, EstadoInventario } from '@/types';
import { cn } from '@/lib/utils/index';
import { 
  Package, 
  MapPin, 
  AlertTriangle, 
  ChevronRight,
  CheckCircle,
  Archive,
  Wrench,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface InventarioTableProps {
  items: Inventario[];
  loading?: boolean;
  onRowClick?: (item: Inventario) => void;
}

const ESTADO_CONFIG: Record<EstadoInventario, { icon: React.ElementType; color: string; bg: string }> = {
  instalado: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  almacen: { icon: Archive, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  reparacion: { icon: Wrench, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  baja: { icon: XCircle, color: 'text-slate-500', bg: 'bg-slate-500/20' },
};

const DEFAULT_ESTADO_CONFIG = { icon: Package, color: 'text-slate-400', bg: 'bg-slate-500/20' };

export function InventarioTable({ items, loading, onRowClick }: InventarioTableProps) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-slate-700/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
        <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">Sin resultados</h3>
        <p className="text-slate-400 mt-1">No hay items que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header de tabla */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-700/30 text-xs font-medium text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
        <div className="col-span-3">SKU / Descripción</div>
        <div className="col-span-2">Categoría</div>
        <div className="col-span-2">Estado</div>
        <div className="col-span-2">Ubicación</div>
        <div className="col-span-2">Stock</div>
        <div className="col-span-1"></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-700/30">
        {items.map((item) => {
          const estadoConfig = ESTADO_CONFIG[item.estado] || DEFAULT_ESTADO_CONFIG;
          const IconEstado = estadoConfig.icon;
          
          const stockBajo = item.cantidadMinima !== undefined && 
            item.cantidadDisponible !== undefined && 
            item.cantidadDisponible < item.cantidadMinima;
          
          const stockCritico = item.cantidadDisponible === 0;

          const ultimoMov = item.ultimoMovimiento?.toDate?.();

          return (
            <button
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'w-full grid grid-cols-12 gap-4 px-4 py-3 items-center text-left',
                'hover:bg-slate-700/30 transition-colors group',
                stockCritico && 'bg-red-500/5',
                stockBajo && !stockCritico && 'bg-amber-500/5'
              )}
            >
              {/* SKU / Descripción */}
              <div className="col-span-3">
                <p className="font-mono font-medium text-white group-hover:text-cyan-400 transition-colors">
                  {item.sku}
                </p>
                <p className="text-sm text-slate-400 truncate">
                  {item.descripcion}
                </p>
                <p className="text-xs text-slate-500">
                  {item.fabricante} {item.modelo}
                </p>
              </div>

              {/* Categoría */}
              <div className="col-span-2">
                <span className="text-sm text-slate-300">{item.categoria}</span>
              </div>

              {/* Estado */}
              <div className="col-span-2">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                  estadoConfig.bg, estadoConfig.color
                )}>
                  <IconEstado className="w-3 h-3" />
                  {ESTADO_INVENTARIO_LABELS[item.estado]}
                </span>
              </div>

              {/* Ubicación */}
              <div className="col-span-2">
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.ubicacion.descripcion}</span>
                </div>
                {ultimoMov && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistanceToNow(ultimoMov, { locale: es, addSuffix: true })}
                  </p>
                )}
              </div>

              {/* Stock */}
              <div className="col-span-2">
                {item.cantidadDisponible !== undefined ? (
                  <div className="flex items-center gap-2">
                    {(stockBajo || stockCritico) && (
                      <AlertTriangle className={cn(
                        'w-4 h-4 flex-shrink-0',
                        stockCritico ? 'text-red-400' : 'text-amber-400'
                      )} />
                    )}
                    <div>
                      <p className={cn(
                        'font-mono font-bold',
                        stockCritico && 'text-red-400',
                        stockBajo && !stockCritico && 'text-amber-400',
                        !stockBajo && 'text-white'
                      )}>
                        {item.cantidadDisponible}
                        {item.cantidadMinima !== undefined && (
                          <span className="text-slate-600 font-normal">
                            /{item.cantidadMinima}
                          </span>
                        )}
                      </p>
                      {stockBajo && (
                        <p className="text-xs text-slate-500">
                          {stockCritico ? 'Sin stock' : 'Stock bajo'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </div>

              {/* Acción */}
              <div className="col-span-1 text-right">
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 inline-block" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
