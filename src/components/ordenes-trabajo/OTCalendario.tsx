'use client';

import { useMemo, useState } from 'react';
import { OrdenTrabajo, EstadoOT, ESTADOS_OT, TIPOS_OT } from '@/types';
import { OTCard } from './OTCard';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';
import { Timestamp } from 'firebase/firestore';

interface OTCalendarioProps {
  ordenes: OrdenTrabajo[];
  loading?: boolean;
  onOTClick?: (orden: OrdenTrabajo) => void;
  onDayClick?: (date: Date) => void;
}

export function OTCalendario({ ordenes, loading, onOTClick, onDayClick }: OTCalendarioProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const otsPorDia = useMemo(() => {
    const map = new Map<string, OrdenTrabajo[]>();

    ordenes.forEach((ot) => {
      const fechaPrevista = ot.planificacion?.fechaPrevista;
      if (fechaPrevista) {
        const fecha = (fechaPrevista as Timestamp).toDate();
        const key = format(fecha, 'yyyy-MM-dd');
        const existing = map.get(key) || [];
        map.set(key, [...existing, ot]);
      }
    });

    return map;
  }, [ordenes]);

  const selectedDayOTs = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return otsPorDia.get(key) || [];
  }, [selectedDate, otsPorDia]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    onDayClick?.(day);
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-7 gap-2">
          {Array(35)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Calendario */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              <Calendar className="w-4 h-4 mr-1" />
              Hoy
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayOTs = otsPorDia.get(key) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const hasUrgent = dayOTs.some(
              (ot) => ot.tipo === TIPOS_OT.CORRECTIVO_URGENTE || ot.criticidad === 'critica'
            );

            return (
              <button
                key={key}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'min-h-[80px] p-2 rounded-lg border transition-all text-left',
                  'hover:bg-slate-700/50 hover:border-slate-600',
                  isCurrentMonth
                    ? 'border-slate-700/50 bg-slate-800/30'
                    : 'border-slate-800/30 bg-slate-900/30 opacity-50',
                  isSelected && 'ring-2 ring-blue-500 border-blue-500',
                  isToday(day) && 'border-blue-500/50'
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isToday(day) ? 'text-blue-400' : isCurrentMonth ? 'text-white' : 'text-slate-600'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayOTs.length > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono',
                        hasUrgent ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                      )}
                    >
                      {dayOTs.length}
                    </span>
                  )}
                </div>

                {/* Mini preview de OTs */}
                {dayOTs.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayOTs.slice(0, 2).map((ot) => (
                      <div
                        key={ot.id}
                        className={cn(
                          'text-xs truncate px-1 py-0.5 rounded',
                          ot.tipo === TIPOS_OT.CORRECTIVO_URGENTE
                            ? 'bg-red-500/20 text-red-400'
                            : ot.tipo === TIPOS_OT.PREVENTIVO
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-orange-500/20 text-orange-400'
                        )}
                      >
                        {ot.codigo}
                      </div>
                    ))}
                    {dayOTs.length > 2 && (
                      <div className="text-xs text-slate-500 px-1">
                        +{dayOTs.length - 2} más
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel lateral - OTs del día seleccionado */}
      <div className="w-80 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-white">
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM", { locale: es })
              : 'Selecciona un día'}
          </h3>
          {selectedDate && (
            <p className="text-sm text-slate-400 mt-1">
              {selectedDayOTs.length} orden{selectedDayOTs.length !== 1 ? 'es' : ''} programada
              {selectedDayOTs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
          {selectedDayOTs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {selectedDate ? 'Sin órdenes para este día' : 'Selecciona un día del calendario'}
            </div>
          ) : (
            selectedDayOTs.map((ot) => (
              <OTCard
                key={ot.id}
                orden={ot}
                mode="full"
                onClick={() => onOTClick?.(ot)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
