'use client';

import { useMemo, useState } from 'react';
import { OrdenTrabajo, Tecnico, ESTADOS_OT, TIPOS_OT } from '@/types';
import { CargaTecnico } from '@/lib/firebase/tecnicos';
import { cn } from '@/lib/utils';
import { Button, Badge, Avatar } from '@/components/ui';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, User } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface PlanificadorSemanalProps {
  tecnicos: CargaTecnico[];
  ordenes: OrdenTrabajo[];
  loading?: boolean;
  onOTClick?: (orden: OrdenTrabajo) => void;
  onAsignarOT?: (orden: OrdenTrabajo, tecnicoId: string, fecha: Date) => void;
  onDragStart?: (orden: OrdenTrabajo) => void;
  onDragEnd?: () => void;
}

interface OTEnCalendario {
  orden: OrdenTrabajo;
  tecnicoId: string;
  fecha: Date;
}

const TIPO_COLORS: Record<string, string> = {
  [TIPOS_OT.CORRECTIVO_URGENTE]: 'bg-red-500/30 border-red-500/50 text-red-300',
  [TIPOS_OT.CORRECTIVO_PROGRAMADO]: 'bg-orange-500/30 border-orange-500/50 text-orange-300',
  [TIPOS_OT.PREVENTIVO]: 'bg-blue-500/30 border-blue-500/50 text-blue-300',
};

export function PlanificadorSemanal({
  tecnicos,
  ordenes,
  loading,
  onOTClick,
  onAsignarOT,
}: PlanificadorSemanalProps) {
  const [semanaActual, setSemanaActual] = useState(new Date());
  const [draggedOT, setDraggedOT] = useState<OrdenTrabajo | null>(null);

  const inicioSemana = startOfWeek(semanaActual, { locale: es, weekStartsOn: 1 });
  const finSemana = endOfWeek(semanaActual, { locale: es, weekStartsOn: 1 });
  const diasSemana = useMemo(() => {
    return eachDayOfInterval({ start: inicioSemana, end: finSemana });
  }, [inicioSemana, finSemana]);

  // Agrupar OTs por técnico y día
  const otsPorTecnicoYDia = useMemo(() => {
    const map = new Map<string, OTEnCalendario[]>();

    ordenes.forEach((ot) => {
      if (!ot.tecnicoId || !ot.planificacion?.fechaPrevista) return;

      const fecha = (ot.planificacion.fechaPrevista as Timestamp).toDate();
      const key = `${ot.tecnicoId}-${format(fecha, 'yyyy-MM-dd')}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, { orden: ot, tecnicoId: ot.tecnicoId, fecha }]);
    });

    return map;
  }, [ordenes]);

  // OTs sin asignar
  const otsSinAsignar = useMemo(() => {
    return ordenes.filter(
      (ot) => !ot.tecnicoId && ot.estado === ESTADOS_OT.PENDIENTE
    );
  }, [ordenes]);

  const handleDragStart = (e: React.DragEvent, ot: OrdenTrabajo) => {
    setDraggedOT(ot);
    e.dataTransfer.setData('text/plain', ot.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, tecnicoId: string, fecha: Date) => {
    e.preventDefault();
    if (draggedOT && onAsignarOT) {
      onAsignarOT(draggedOT, tecnicoId, fecha);
    }
    setDraggedOT(null);
  };

  const goToPrevWeek = () => setSemanaActual(subWeeks(semanaActual, 1));
  const goToNextWeek = () => setSemanaActual(addWeeks(semanaActual, 1));
  const goToToday = () => setSemanaActual(new Date());

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-6 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">
            Semana del {format(inicioSemana, "d 'de' MMMM", { locale: es })}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            <Calendar className="w-4 h-4 mr-1" />
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* OTs sin asignar */}
      {otsSinAsignar.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-amber-400">
              {otsSinAsignar.length} OT{otsSinAsignar.length !== 1 ? 's' : ''} pendientes de asignar
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {otsSinAsignar.map((ot) => (
              <div
                key={ot.id}
                draggable
                onDragStart={(e) => handleDragStart(e, ot)}
                onClick={() => onOTClick?.(ot)}
                className={cn(
                  'px-3 py-2 rounded border cursor-move',
                  TIPO_COLORS[ot.tipo],
                  'hover:opacity-80 transition-opacity'
                )}
              >
                <span className="font-mono text-sm">{ot.codigo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla del planificador */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Header con días */}
        <div className="grid grid-cols-8 bg-slate-900/50">
          <div className="p-3 border-r border-slate-700/50">
            <span className="text-sm font-medium text-slate-400">Técnico</span>
          </div>
          {diasSemana.map((dia) => (
            <div
              key={dia.toISOString()}
              className={cn(
                'p-3 text-center border-r border-slate-700/50 last:border-r-0',
                isToday(dia) && 'bg-blue-500/10'
              )}
            >
              <p className="text-xs text-slate-500 uppercase">
                {format(dia, 'EEE', { locale: es })}
              </p>
              <p
                className={cn(
                  'text-lg font-semibold',
                  isToday(dia) ? 'text-blue-400' : 'text-white'
                )}
              >
                {format(dia, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Filas de técnicos */}
        {tecnicos.map((carga) => {
          const tecnico = carga.tecnico;
          const iniciales = `${tecnico.nombre[0]}${tecnico.apellidos[0]}`.toUpperCase();
          const sobrecarga = carga.otsAsignadas > 5;

          return (
            <div
              key={tecnico.id}
              className={cn(
                'grid grid-cols-8 border-t border-slate-700/50',
                sobrecarga && 'bg-red-500/5'
              )}
            >
              {/* Info técnico */}
              <div className="p-3 border-r border-slate-700/50 flex items-center gap-3">
                <Avatar fallback={iniciales} alt={`${tecnico.nombre} ${tecnico.apellidos}`} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {tecnico.nombreCorto || tecnico.nombre}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">
                      {carga.otsAsignadas} OTs
                    </span>
                    {sobrecarga && (
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Celdas por día */}
              {diasSemana.map((dia) => {
                const key = `${tecnico.id}-${format(dia, 'yyyy-MM-dd')}`;
                const otsDelDia = otsPorTecnicoYDia.get(key) || [];

                return (
                  <div
                    key={dia.toISOString()}
                    className={cn(
                      'p-2 border-r border-slate-700/50 last:border-r-0 min-h-[80px]',
                      'transition-colors',
                      isToday(dia) && 'bg-blue-500/5',
                      draggedOT && 'hover:bg-slate-700/30'
                    )}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tecnico.id, dia)}
                  >
                    <div className="space-y-1">
                      {otsDelDia.map(({ orden }) => (
                        <div
                          key={orden.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, orden)}
                          onClick={() => onOTClick?.(orden)}
                          className={cn(
                            'px-2 py-1 rounded text-xs cursor-pointer border',
                            TIPO_COLORS[orden.tipo],
                            'hover:opacity-80 transition-opacity'
                          )}
                        >
                          <span className="font-mono">{orden.codigo.split('-').pop()}</span>
                          {orden.criticidad === 'critica' && (
                            <span className="ml-1 text-red-300">⚡</span>
                          )}
                        </div>
                      ))}
                      {otsDelDia.length === 0 && (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity">
                          <span className="text-xs text-slate-500">+</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>Leyenda:</span>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', 'bg-red-500/30 border border-red-500/50')} />
          <span>Urgente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', 'bg-orange-500/30 border border-orange-500/50')} />
          <span>Correctivo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-3 h-3 rounded', 'bg-blue-500/30 border border-blue-500/50')} />
          <span>Preventivo</span>
        </div>
      </div>
    </div>
  );
}
