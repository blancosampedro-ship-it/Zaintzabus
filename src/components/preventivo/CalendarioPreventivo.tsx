'use client';

import { useMemo, useState } from 'react';
import { Preventivo } from '@/types';
import { cn } from '@/lib/utils/index';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  getDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarioPreventivoProps {
  preventivos: Preventivo[];
  onDayClick?: (date: Date, preventivos: Preventivo[]) => void;
  onPreventivoClick?: (preventivo: Preventivo) => void;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function CalendarioPreventivo({ 
  preventivos, 
  onDayClick,
  onPreventivoClick 
}: CalendarioPreventivoProps) {
  const [mesActual, setMesActual] = useState(new Date());

  // Obtener días del mes con padding para semanas completas
  const diasCalendario = useMemo(() => {
    const inicioMes = startOfMonth(mesActual);
    const finMes = endOfMonth(mesActual);
    const inicioCalendario = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const finCalendario = endOfWeek(finMes, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: inicioCalendario, end: finCalendario });
  }, [mesActual]);

  // Mapear preventivos por fecha
  const preventivosPorDia = useMemo(() => {
    const mapa = new Map<string, Preventivo[]>();
    
    preventivos.forEach(prev => {
      if (prev.proximaEjecucion) {
        const fecha = prev.proximaEjecucion.toDate?.();
        if (fecha) {
          const key = format(fecha, 'yyyy-MM-dd');
          if (!mapa.has(key)) {
            mapa.set(key, []);
          }
          mapa.get(key)!.push(prev);
        }
      }
    });

    return mapa;
  }, [preventivos]);

  // Stats del mes
  const statsMes = useMemo(() => {
    let total = 0;
    let vencidos = 0;
    let proximos = 0; // próximos 7 días

    const hoy = new Date();
    
    preventivos.forEach(prev => {
      if (prev.proximaEjecucion) {
        const fecha = prev.proximaEjecucion.toDate?.();
        if (fecha && isSameMonth(fecha, mesActual)) {
          total++;
          if (fecha < hoy && !isToday(fecha)) {
            vencidos++;
          } else if (fecha <= addMonths(hoy, 0) && fecha >= hoy) {
            const diasHasta = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (diasHasta <= 7) proximos++;
          }
        }
      }
    });

    return { total, vencidos, proximos };
  }, [preventivos, mesActual]);

  const irMesAnterior = () => setMesActual(prev => subMonths(prev, 1));
  const irMesSiguiente = () => setMesActual(prev => addMonths(prev, 1));
  const irHoy = () => setMesActual(new Date());

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header del calendario */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white capitalize">
              {format(mesActual, 'MMMM yyyy', { locale: es })}
            </h2>
            
            {/* Stats rápidos */}
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-600">
              <span className="text-sm text-slate-400">
                <span className="font-mono text-cyan-400">{statsMes.total}</span> programados
              </span>
              {statsMes.vencidos > 0 && (
                <span className="text-sm text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {statsMes.vencidos} vencidos
                </span>
              )}
              {statsMes.proximos > 0 && (
                <span className="text-sm text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {statsMes.proximos} próximos
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={irHoy}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={irMesAnterior}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={irMesSiguiente}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-slate-700/50">
        {DIAS_SEMANA.map(dia => (
          <div 
            key={dia}
            className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7">
        {diasCalendario.map((dia, idx) => {
          const key = format(dia, 'yyyy-MM-dd');
          const preventivosDia = preventivosPorDia.get(key) || [];
          const esHoy = isToday(dia);
          const esMesActual = isSameMonth(dia, mesActual);
          const tieneVencido = preventivosDia.some(p => {
            const fecha = p.proximaEjecucion?.toDate?.();
            return fecha && fecha < new Date() && !isToday(fecha);
          });

          return (
            <button
              key={idx}
              onClick={() => {
                if (preventivosDia.length === 1 && onPreventivoClick) {
                  onPreventivoClick(preventivosDia[0]);
                } else if (preventivosDia.length > 0 && onDayClick) {
                  onDayClick(dia, preventivosDia);
                }
              }}
              disabled={preventivosDia.length === 0}
              className={cn(
                'min-h-[80px] p-2 border-b border-r border-slate-700/30 transition-colors text-left',
                esMesActual ? 'bg-slate-800/30' : 'bg-slate-900/50',
                preventivosDia.length > 0 && 'hover:bg-slate-700/50 cursor-pointer',
                esHoy && 'ring-2 ring-inset ring-cyan-500/50'
              )}
            >
              {/* Número del día */}
              <div className={cn(
                'text-sm font-medium mb-1',
                esHoy && 'text-cyan-400',
                !esHoy && esMesActual && 'text-slate-300',
                !esMesActual && 'text-slate-600'
              )}>
                {format(dia, 'd')}
              </div>

              {/* Preventivos del día */}
              <div className="space-y-1">
                {preventivosDia.slice(0, 2).map((prev, i) => {
                  const fechaPrev = prev.proximaEjecucion?.toDate?.();
                  const vencido = fechaPrev && fechaPrev < new Date() && !isToday(fechaPrev);

                  return (
                    <div
                      key={i}
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded truncate',
                        vencido 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-cyan-500/20 text-cyan-400'
                      )}
                      title={prev.nombre}
                    >
                      {prev.codigo}
                    </div>
                  );
                })}
                {preventivosDia.length > 2 && (
                  <div className="text-xs text-slate-500 pl-1">
                    +{preventivosDia.length - 2} más
                  </div>
                )}
              </div>

              {/* Indicador de vencido */}
              {tieneVencido && (
                <div className="absolute top-1 right-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="p-3 border-t border-slate-700/50 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/50" />
          <span>Programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
          <span>Vencido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded ring-2 ring-cyan-500/50" />
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
}
