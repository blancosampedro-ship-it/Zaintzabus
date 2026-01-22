'use client';

import { 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  Package, 
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ActivityItem {
  id: string;
  tipo: 'incidencia' | 'activo' | 'inventario' | 'preventivo' | 'usuario';
  accion: string;
  descripcion: string;
  usuario?: string;
  fecha: Date;
  status?: 'success' | 'warning' | 'info';
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

export default function ActivityFeed({ items, maxItems = 10 }: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  const getIcon = (tipo: ActivityItem['tipo']) => {
    switch (tipo) {
      case 'incidencia':
        return AlertTriangle;
      case 'activo':
        return Wrench;
      case 'inventario':
        return Package;
      case 'preventivo':
        return Calendar;
      case 'usuario':
        return User;
      default:
        return CheckCircle;
    }
  };

  const getIconColor = (status?: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-500 bg-green-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-500/10">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="font-semibold text-white">Actividad Reciente</h3>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Sin actividad reciente</p>
          </div>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-700/50" />

            {/* Items */}
            <div className="space-y-4">
              {displayItems.map((item) => {
                const Icon = getIcon(item.tipo);
                return (
                  <div key={item.id} className="flex gap-4 relative">
                    {/* Icono */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                      getIconColor(item.status)
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm text-white">
                        <span className="font-medium">{item.accion}</span>
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {item.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        {item.usuario && (
                          <>
                            <span>{item.usuario}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {formatDistanceToNow(item.fecha, { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
