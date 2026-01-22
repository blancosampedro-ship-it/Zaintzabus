'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Preventivo } from '@/types';
import { getPreventivos } from '@/lib/firebase/preventivos';
import { useTenantId } from '@/contexts';
import { Button, Select, Card } from '@/components/ui';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths,
  subMonths,
  getDay,
  isToday,
  isBefore,
  isAfter
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

// Estados calculados para visualización
type EstadoPreventivo = 'pendiente' | 'programado' | 'completado' | 'vencido';

interface PreventivoCalendario extends Preventivo {
  proximaEjecucionDate?: Date;
  estadoVisual: EstadoPreventivo;
}

export default function CalendarioPreventivoPage() {
  const router = useRouter();
  const tenantId = useTenantId();
  
  const [preventivos, setPreventivos] = useState<PreventivoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroActivo, setFiltroActivo] = useState<string>('');

  const cargarDatos = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const result = await getPreventivos(tenantId);
      const hoy = new Date();
      
      // Convertir fechas y calcular estado visual
      const preventivosConFecha: PreventivoCalendario[] = result.map(p => {
        const proximaEjecucionDate = p.proximaEjecucion 
          ? (p.proximaEjecucion as Timestamp).toDate?.() || new Date()
          : undefined;
        
        // Calcular estado visual
        let estadoVisual: EstadoPreventivo = 'programado';
        if (!p.activo) {
          estadoVisual = 'completado';
        } else if (proximaEjecucionDate && isBefore(proximaEjecucionDate, hoy)) {
          estadoVisual = 'vencido';
        } else if (proximaEjecucionDate && isAfter(proximaEjecucionDate, hoy)) {
          estadoVisual = 'pendiente';
        }
        
        return {
          ...p,
          proximaEjecucionDate,
          estadoVisual
        };
      });
      
      setPreventivos(preventivosConFecha);
    } catch (error) {
      console.error('Error cargando preventivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantId]);

  // Generar días del mes
  const diasMes = useMemo(() => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  // Filtrar preventivos
  const preventivosFiltrados = useMemo(() => {
    return preventivos.filter(p => {
      if (filtroEstado && p.estadoVisual !== filtroEstado) return false;
      if (filtroActivo === 'activo' && !p.activo) return false;
      if (filtroActivo === 'inactivo' && p.activo) return false;
      return true;
    });
  }, [preventivos, filtroEstado, filtroActivo]);

  // Agrupar preventivos por día
  const preventivosPorDia = useMemo(() => {
    const mapa = new Map<string, PreventivoCalendario[]>();
    
    preventivosFiltrados.forEach(p => {
      if (p.proximaEjecucionDate) {
        const clave = format(p.proximaEjecucionDate, 'yyyy-MM-dd');
        if (!mapa.has(clave)) {
          mapa.set(clave, []);
        }
        mapa.get(clave)!.push(p);
      }
    });
    
    return mapa;
  }, [preventivosFiltrados]);

  // Estadísticas del mes
  const estadisticasMes = useMemo(() => {
    const preventivosDelMes = preventivosFiltrados.filter(p => {
      if (!p.proximaEjecucionDate) return false;
      return p.proximaEjecucionDate >= startOfMonth(mesActual) && 
             p.proximaEjecucionDate <= endOfMonth(mesActual);
    });

    return {
      total: preventivosDelMes.length,
      pendientes: preventivosDelMes.filter(p => p.estadoVisual === 'pendiente').length,
      programados: preventivosDelMes.filter(p => p.estadoVisual === 'programado').length,
      completados: preventivosDelMes.filter(p => p.estadoVisual === 'completado').length,
      vencidos: preventivosDelMes.filter(p => p.estadoVisual === 'vencido').length,
    };
  }, [preventivosFiltrados, mesActual]);

  // Determinar día de inicio de semana (0 = domingo, 1 = lunes, etc.)
  const primerDiaSemana = getDay(startOfMonth(mesActual));
  const offsetDias = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1; // Ajustar para semana que empieza en lunes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Calendario de Preventivos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualización mensual de mantenimientos programados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={cargarDatos}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => router.push('/preventivo/nuevo')}>
            Nuevo Preventivo
          </Button>
        </div>
      </div>

      {/* Stats del mes */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{estadisticasMes.total}</p>
          <p className="text-xs text-slate-400 mt-1">Total mes</p>
        </Card>
        <Card className={cn('p-4 text-center', estadisticasMes.pendientes > 0 && 'bg-amber-500/10 border-amber-500/30')}>
          <p className={cn('text-3xl font-bold', estadisticasMes.pendientes > 0 ? 'text-amber-400' : 'text-white')}>
            {estadisticasMes.pendientes}
          </p>
          <p className="text-xs text-slate-400 mt-1">Pendientes</p>
        </Card>
        <Card className="p-4 text-center bg-blue-500/10 border-blue-500/30">
          <p className="text-3xl font-bold text-blue-400">{estadisticasMes.programados}</p>
          <p className="text-xs text-slate-400 mt-1">Programados</p>
        </Card>
        <Card className="p-4 text-center bg-green-500/10 border-green-500/30">
          <p className="text-3xl font-bold text-green-400">{estadisticasMes.completados}</p>
          <p className="text-xs text-slate-400 mt-1">Completados</p>
        </Card>
        <Card className={cn('p-4 text-center', estadisticasMes.vencidos > 0 && 'bg-red-500/10 border-red-500/30')}>
          <p className={cn('text-3xl font-bold', estadisticasMes.vencidos > 0 ? 'text-red-400' : 'text-white')}>
            {estadisticasMes.vencidos}
          </p>
          <p className="text-xs text-slate-400 mt-1">Vencidos</p>
        </Card>
      </div>

      {/* Controles del calendario */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'programado', label: 'Programado' },
              { value: 'completado', label: 'Completado' },
              { value: 'vencido', label: 'Vencido' },
            ]}
            className="w-48"
          />
          
          <Select
            value={filtroActivo}
            onChange={setFiltroActivo}
            options={[
              { value: '', label: 'Todos' },
              { value: 'activo', label: 'Activos' },
              { value: 'inactivo', label: 'Inactivos' },
            ]}
            className="w-32"
          />
          
          {(filtroEstado || filtroActivo) && (
            <button
              onClick={() => {
                setFiltroEstado('');
                setFiltroActivo('');
              }}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Navegación de mes */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setMesActual(prev => subMonths(prev, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg font-medium text-white min-w-48 text-center">
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </span>
          <Button
            variant="ghost"
            onClick={() => setMesActual(prev => addMonths(prev, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMesActual(new Date())}
          >
            Hoy
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <Card className="p-4">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Cabecera días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
                <div 
                  key={dia} 
                  className="text-center text-sm font-medium text-slate-400 py-2"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Grid del calendario */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos */}
              {Array.from({ length: offsetDias }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 bg-slate-800/30 rounded-lg" />
              ))}

              {/* Días del mes */}
              {diasMes.map(dia => {
                const clave = format(dia, 'yyyy-MM-dd');
                const preventivosDelDia = preventivosPorDia.get(clave) || [];
                const esHoy = isToday(dia);
                const esFinDeSemana = getDay(dia) === 0 || getDay(dia) === 6;
                
                const tieneVencidos = preventivosDelDia.some(p => p.estadoVisual === 'vencido');
                const tienePendientes = preventivosDelDia.some(p => p.estadoVisual === 'pendiente');

                return (
                  <div
                    key={clave}
                    className={cn(
                      'min-h-24 p-2 rounded-lg border transition-all',
                      esHoy 
                        ? 'bg-blue-500/10 border-blue-500' 
                        : esFinDeSemana 
                        ? 'bg-slate-800/50 border-slate-700/30' 
                        : 'bg-slate-800/30 border-slate-700/50',
                      tieneVencidos && 'ring-1 ring-red-500/50',
                      tienePendientes && !tieneVencidos && 'ring-1 ring-amber-500/50',
                      'hover:border-slate-600 cursor-pointer'
                    )}
                  >
                    {/* Número del día */}
                    <div className={cn(
                      'text-sm font-medium mb-1',
                      esHoy ? 'text-blue-400' : 'text-slate-300'
                    )}>
                      {format(dia, 'd')}
                    </div>

                    {/* Preventivos del día */}
                    <div className="space-y-1">
                      {preventivosDelDia.slice(0, 3).map(p => (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/preventivo/${p.id}`)}
                          className={cn(
                            'text-xs p-1 rounded truncate cursor-pointer',
                            p.estadoVisual === 'vencido' && 'bg-red-500/30 text-red-300',
                            p.estadoVisual === 'pendiente' && 'bg-amber-500/30 text-amber-300',
                            p.estadoVisual === 'programado' && 'bg-blue-500/30 text-blue-300',
                            p.estadoVisual === 'completado' && 'bg-green-500/30 text-green-300',
                            'hover:opacity-80'
                          )}
                          title={`${p.nombre} - ${p.estadoVisual}`}
                        >
                          {p.nombre || p.codigo || 'Preventivo'}
                        </div>
                      ))}
                      
                      {preventivosDelDia.length > 3 && (
                        <div className="text-xs text-slate-400 pl-1">
                          +{preventivosDelDia.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500/30" />
          <span className="text-slate-400">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500/30" />
          <span className="text-slate-400">Programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/30" />
          <span className="text-slate-400">En curso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500/30" />
          <span className="text-slate-400">Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span className="text-slate-400">Vencido</span>
        </div>
      </div>
    </div>
  );
}
