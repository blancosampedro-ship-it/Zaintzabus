'use client';

import { useMemo } from 'react';
import { Preventivo, PERIODICIDAD_LABELS } from '@/types';
import { cn } from '@/lib/utils/index';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  Repeat
} from 'lucide-react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface PreventivoCardProps {
  preventivo: Preventivo;
  onClick?: () => void;
  compact?: boolean;
}

const PERIODICIDAD_COLORS: Record<string, string> = {
  '3M': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '6M': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  '1A': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  '2A': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export function PreventivoCard({ preventivo, onClick, compact = false }: PreventivoCardProps) {
  const proximaFecha = preventivo.proximaEjecucion?.toDate?.();
  
  const { diasRestantes, estado, urgencia } = useMemo(() => {
    if (!proximaFecha) {
      return { diasRestantes: null, estado: 'sin_fecha', urgencia: 'normal' as const };
    }

    const dias = differenceInDays(proximaFecha, new Date());
    
    if (isPast(proximaFecha) && !isToday(proximaFecha)) {
      return { diasRestantes: dias, estado: 'vencido', urgencia: 'critico' as const };
    }
    if (isToday(proximaFecha)) {
      return { diasRestantes: 0, estado: 'hoy', urgencia: 'critico' as const };
    }
    if (dias <= 7) {
      return { diasRestantes: dias, estado: 'proximo', urgencia: 'alto' as const };
    }
    if (dias <= 14) {
      return { diasRestantes: dias, estado: 'planificado', urgencia: 'medio' as const };
    }
    return { diasRestantes: dias, estado: 'futuro', urgencia: 'normal' as const };
  }, [proximaFecha]);

  const fechaFormateada = proximaFecha 
    ? format(proximaFecha, 'dd MMM', { locale: es })
    : '—';

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full p-3 rounded-lg border transition-all text-left group',
          'bg-slate-800/50 hover:bg-slate-700/50',
          'border-slate-700/50 hover:border-slate-600',
          urgencia === 'critico' && 'border-l-2 border-l-red-500',
          urgencia === 'alto' && 'border-l-2 border-l-amber-500'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Indicador urgencia */}
          <div className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            urgencia === 'critico' && 'bg-red-500 animate-pulse',
            urgencia === 'alto' && 'bg-amber-500',
            urgencia === 'medio' && 'bg-yellow-500',
            urgencia === 'normal' && 'bg-green-500'
          )} />

          {/* Código y nombre */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-white">
                {preventivo.codigo}
              </span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-xs border',
                PERIODICIDAD_COLORS[preventivo.periodicidad] || 'bg-slate-500/20 text-slate-400'
              )}>
                {preventivo.periodicidad}
              </span>
            </div>
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {preventivo.nombre}
            </p>
          </div>

          {/* Fecha */}
          <div className={cn(
            'text-right flex-shrink-0',
            urgencia === 'critico' && 'text-red-400',
            urgencia === 'alto' && 'text-amber-400',
            urgencia === 'medio' && 'text-yellow-400',
            urgencia === 'normal' && 'text-slate-400'
          )}>
            <p className="text-sm font-mono">{fechaFormateada}</p>
            {diasRestantes !== null && (
              <p className="text-xs">
                {diasRestantes < 0 
                  ? `${Math.abs(diasRestantes)}d atrás` 
                  : diasRestantes === 0 
                    ? 'HOY'
                    : `${diasRestantes}d`
                }
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-xl border transition-all text-left group',
        'bg-slate-800/50 hover:bg-slate-700/30',
        'border-slate-700/50 hover:border-slate-600',
        urgencia === 'critico' && 'border-l-4 border-l-red-500',
        urgencia === 'alto' && 'border-l-4 border-l-amber-500'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-white">
              {preventivo.codigo}
            </span>
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium border',
              PERIODICIDAD_COLORS[preventivo.periodicidad] || 'bg-slate-500/20 text-slate-400'
            )}>
              <Repeat className="w-3 h-3 inline mr-1" />
              {PERIODICIDAD_LABELS[preventivo.periodicidad]}
            </span>
            {!preventivo.activo && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-slate-600 text-slate-400">
                Inactivo
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-slate-200">
            {preventivo.nombre}
          </h3>
        </div>

        {/* Badge de fecha */}
        <div className={cn(
          'px-3 py-2 rounded-lg text-center min-w-[70px]',
          urgencia === 'critico' && 'bg-red-500/20 border border-red-500/30',
          urgencia === 'alto' && 'bg-amber-500/20 border border-amber-500/30',
          urgencia === 'medio' && 'bg-yellow-500/20 border border-yellow-500/30',
          urgencia === 'normal' && 'bg-slate-700/50 border border-slate-600'
        )}>
          <p className={cn(
            'text-lg font-mono font-bold',
            urgencia === 'critico' && 'text-red-400',
            urgencia === 'alto' && 'text-amber-400',
            urgencia === 'medio' && 'text-yellow-400',
            urgencia === 'normal' && 'text-slate-300'
          )}>
            {proximaFecha ? format(proximaFecha, 'dd', { locale: es }) : '—'}
          </p>
          <p className={cn(
            'text-xs uppercase',
            urgencia === 'critico' && 'text-red-400/70',
            urgencia === 'alto' && 'text-amber-400/70',
            urgencia === 'medio' && 'text-yellow-400/70',
            urgencia === 'normal' && 'text-slate-500'
          )}>
            {proximaFecha ? format(proximaFecha, 'MMM', { locale: es }) : ''}
          </p>
        </div>
      </div>

      {/* Descripción */}
      {preventivo.descripcion && (
        <p className="text-sm text-slate-400 mt-2 line-clamp-2">
          {preventivo.descripcion}
        </p>
      )}

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <CheckCircle className="w-3 h-3" />
          <span>{preventivo.tareas.length} tareas</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{preventivo.tipoActivo}</span>
        </div>
        {diasRestantes !== null && (
          <div className={cn(
            'ml-auto flex items-center gap-1 text-xs',
            urgencia === 'critico' && 'text-red-400',
            urgencia === 'alto' && 'text-amber-400',
            urgencia === 'medio' && 'text-yellow-400',
            urgencia === 'normal' && 'text-green-400'
          )}>
            {urgencia === 'critico' && <AlertTriangle className="w-3 h-3" />}
            {urgencia === 'alto' && <Clock className="w-3 h-3" />}
            <span>
              {diasRestantes < 0 
                ? `Vencido hace ${Math.abs(diasRestantes)} días` 
                : diasRestantes === 0 
                  ? '¡Programado para hoy!'
                  : `En ${diasRestantes} días`
              }
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
