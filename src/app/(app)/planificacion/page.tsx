'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tecnico, OrdenTrabajo, ESTADOS_OT } from '@/types';
import { 
  getTecnicosActivos, 
  getCargaTecnicos, 
  CargaTecnico,
  sugerirTecnicoParaOT 
} from '@/lib/firebase/tecnicos';
import { getOrdenesTrabajo } from '@/lib/firebase/ordenes-trabajo';
import { useTenantId } from '@/contexts';
import { PlanificadorSemanal, CargaTrabajoGrid } from '@/components/tecnicos';
import { Button, Select, Badge, Card } from '@/components/ui';
import { 
  CalendarDays, 
  LayoutGrid,
  Users,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Filter,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

type VistaActiva = 'semanal' | 'carga';

export default function PlanificacionPage() {
  const router = useRouter();
  const tenantId = useTenantId();
  
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargas, setCargas] = useState<CargaTecnico[]>([]);
  const [otsPendientes, setOtsPendientes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('semanal');
  const [semanaActual, setSemanaActual] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  const cargarDatos = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const [tecnicosData, cargasData, otsResult] = await Promise.all([
        getTecnicosActivos(tenantId),
        getCargaTecnicos(tenantId),
        getOrdenesTrabajo({
          tenantId,
          estado: [ESTADOS_OT.PENDIENTE, ESTADOS_OT.ASIGNADA, ESTADOS_OT.EN_CURSO],
          pageSize: 100,
        }),
      ]);
      
      setTecnicos(tecnicosData);
      setCargas(cargasData);
      setOtsPendientes(otsResult.ordenes);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tenantId]);

  // Calcular alertas
  const alertas = useMemo(() => {
    const sobrecargados = cargas.filter(c => c.otsAsignadas > 5);
    const sinAsignar = otsPendientes.filter(ot => !ot.tecnicoId);
    const urgentes = sinAsignar.filter(ot => ot.tipo === 'correctivo_urgente');
    
    return {
      sobrecargados: sobrecargados.length,
      sinAsignar: sinAsignar.length,
      urgentes: urgentes.length,
    };
  }, [cargas, otsPendientes]);

  // OTs filtradas para el planificador
  const otsFiltradas = useMemo(() => {
    let resultado = otsPendientes;
    
    if (filtroTipo) {
      resultado = resultado.filter(ot => ot.tipo === filtroTipo);
    }
    
    return resultado;
  }, [otsPendientes, filtroTipo]);

  // Callbacks del planificador
  const handleAsignarOT = async (orden: OrdenTrabajo, tecnicoId: string, fecha: Date) => {
    console.log('Asignar OT', orden.id, 'a técnico', tecnicoId, 'fecha', fecha);
    // TODO: Implementar asignación
    // await asignarOrdenTrabajo(tenantId, orden.id, tecnicoId, fecha);
    // await cargarDatos();
  };

  const handleSugerirAsignacion = async () => {
    if (!tenantId) return;
    
    const otsSinAsignar = otsPendientes.filter(ot => !ot.tecnicoId);
    if (otsSinAsignar.length === 0) {
      alert('No hay OTs pendientes de asignación');
      return;
    }

    // Sugerir técnicos para las primeras 5 OTs sin asignar
    for (const ot of otsSinAsignar.slice(0, 5)) {
      const esCritica = ot.tipo === 'correctivo_urgente';
      const sugerencias = await sugerirTecnicoParaOT(tenantId, undefined, undefined, esCritica);
      console.log(`Sugerencias para OT ${ot.id}:`, sugerencias);
    }
    
    alert('Revisa la consola para ver las sugerencias de asignación');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6" />
            Planificación
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestiona la asignación de trabajo del equipo
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
          <Button
            variant="outline"
            onClick={handleSugerirAsignacion}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Sugerir Asignaciones
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {(alertas.sobrecargados > 0 || alertas.urgentes > 0) && (
        <div className="flex items-center gap-4">
          {alertas.sobrecargados > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">
                {alertas.sobrecargados} técnico{alertas.sobrecargados > 1 ? 's' : ''} con sobrecarga
              </span>
            </div>
          )}
          {alertas.urgentes > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400">
                {alertas.urgentes} OT{alertas.urgentes > 1 ? 's' : ''} urgente{alertas.urgentes > 1 ? 's' : ''} sin asignar
              </span>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-white">{tecnicos.length}</p>
          <p className="text-xs text-slate-400 mt-1">Técnicos activos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{otsPendientes.length}</p>
          <p className="text-xs text-slate-400 mt-1">OTs en cola</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={cn(
            'text-3xl font-bold',
            alertas.sinAsignar > 0 ? 'text-amber-400' : 'text-green-400'
          )}>
            {alertas.sinAsignar}
          </p>
          <p className="text-xs text-slate-400 mt-1">Sin asignar</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={cn(
            'text-3xl font-bold',
            alertas.sobrecargados > 0 ? 'text-red-400' : 'text-green-400'
          )}>
            {alertas.sobrecargados}
          </p>
          <p className="text-xs text-slate-400 mt-1">Sobrecargados</p>
        </Card>
      </div>

      {/* Filtros y Vista */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={filtroTipo}
            onChange={setFiltroTipo}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'preventivo', label: 'Preventivo' },
              { value: 'correctivo', label: 'Correctivo' },
              { value: 'urgente', label: 'Urgente' },
            ]}
            className="w-48"
          />
          
          {filtroTipo && (
            <Badge variant="default" className="cursor-pointer" onClick={() => setFiltroTipo('')}>
              Tipo: {filtroTipo} ×
            </Badge>
          )}
        </div>

        {/* Toggle de vista */}
        <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
          <button
            onClick={() => setVistaActiva('semanal')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
              vistaActiva === 'semanal' 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-400 hover:text-white'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Semanal
          </button>
          <button
            onClick={() => setVistaActiva('carga')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
              vistaActiva === 'carga' 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-400 hover:text-white'
            )}
          >
            <Users className="w-4 h-4" />
            Carga
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="h-96 bg-slate-800/50 rounded-lg animate-pulse" />
      ) : vistaActiva === 'semanal' ? (
        <PlanificadorSemanal
          tecnicos={cargas}
          ordenes={otsFiltradas}
          onAsignarOT={handleAsignarOT}
        />
      ) : (
        <CargaTrabajoGrid
          cargas={cargas}
          onTecnicoClick={(id) => router.push(`/tecnicos/${id}`)}
        />
      )}

      {/* Footer con info */}
      <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-700 pt-4">
        <div>
          Semana del {format(startOfWeek(semanaActual, { weekStartsOn: 1 }), 'dd/MM', { locale: es })} al {format(endOfWeek(semanaActual, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: es })}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Urgente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Correctivo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Preventivo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
