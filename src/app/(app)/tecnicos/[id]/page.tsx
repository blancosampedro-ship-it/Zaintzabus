'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Tecnico } from '@/types';
import { 
  getTecnicoById, 
  getHistorialTecnico, 
  getEstadisticasTecnico,
  getDisponibilidadTecnico,
  EstadisticasTecnicoDetalle,
  HistorialIntervencion,
  DisponibilidadDia as DisponibilidadDiaType
} from '@/lib/firebase/tecnicos';
import { useTenantId } from '@/contexts';
import { Button, Badge, Avatar, Card } from '@/components/ui';
import { 
  ArrowLeft, 
  Edit, 
  Phone,
  Mail,
  Calendar,
  Wrench,
  Award,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

// Tipos de especialidades con etiquetas
const ESPECIALIDADES_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  electricidad: 'Electricidad',
  carroceria: 'Carrocería',
  neumaticos: 'Neumáticos',
  climatizacion: 'Climatización',
  electronica: 'Electrónica',
};

export default function TecnicoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const tecnicoId = params?.id as string;
  const tenantId = useTenantId();

  const [tecnico, setTecnico] = useState<Tecnico | null>(null);
  const [historial, setHistorial] = useState<HistorialIntervencion[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasTecnicoDetalle | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadDiaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());

  useEffect(() => {
    const cargarDatos = async () => {
      if (!tenantId || !tecnicoId) return;
      
      setLoading(true);
      try {
        const [tecnicoData, historialData, estadisticasData] = await Promise.all([
          getTecnicoById(tenantId, tecnicoId),
          getHistorialTecnico(tenantId, tecnicoId, 20),
          getEstadisticasTecnico(tenantId, tecnicoId),
        ]);
        
        setTecnico(tecnicoData);
        setHistorial(historialData);
        setEstadisticas(estadisticasData);
        
        // Cargar disponibilidad del mes actual
        const dispData = await getDisponibilidadTecnico(tenantId, tecnicoId, mesActual);
        setDisponibilidad(dispData);
      } catch (error) {
        console.error('Error cargando técnico:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [tenantId, tecnicoId, mesActual]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!tecnico) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-400">Técnico no encontrado</p>
        <Button
          variant="ghost"
          onClick={() => router.push('/tecnicos')}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al listado
        </Button>
      </div>
    );
  }

  const iniciales = `${tecnico.nombre[0]}${tecnico.apellidos[0]}`.toUpperCase();
  const nombreCompleto = `${tecnico.nombre} ${tecnico.apellidos}`;

  // Generar días del mes para calendario
  const diasMes = eachDayOfInterval({
    start: startOfMonth(mesActual),
    end: endOfMonth(mesActual),
  });

  const getDisponibilidadDia = (dia: Date) => {
    return disponibilidad.find(d => isSameDay(d.fecha, dia));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/tecnicos')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{nombreCompleto}</h1>
            <p className="text-sm text-slate-400">
              {tecnico.codigoEmpleado && `#${tecnico.codigoEmpleado} · `}
              Técnico de mantenimiento
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/tecnicos/${tecnicoId}/editar`)}>
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Info principal */}
      <div className="grid grid-cols-12 gap-6">
        {/* Columna izquierda - Datos */}
        <div className="col-span-4 space-y-6">
          {/* Tarjeta de perfil */}
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar 
                fallback={iniciales} 
                alt={nombreCompleto} 
                size="lg"
              />
              <h2 className="mt-4 text-xl font-bold text-white">{nombreCompleto}</h2>
              <p className="text-sm text-slate-400">{tecnico.nombreCorto || ''}</p>
              
              <Badge
                variant={
                  tecnico.estado === 'activo' ? 'success' :
                  tecnico.estado === 'vacaciones' ? 'warning' : 'danger'
                }
                className="mt-2"
              >
                {tecnico.estado.charAt(0).toUpperCase() + tecnico.estado.slice(1).replace('_', ' ')}
              </Badge>
            </div>

            {/* Datos de contacto */}
            <div className="mt-6 space-y-3 border-t border-slate-700 pt-4">
              {tecnico.contacto?.telefono && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{tecnico.contacto.telefono}</span>
                </div>
              )}
              {tecnico.contacto?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{tecnico.contacto.email}</span>
                </div>
              )}
              {tecnico.fechaAlta && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">
                    Alta: {format(
                      tecnico.fechaAlta instanceof Date 
                        ? tecnico.fechaAlta 
                        : (tecnico.fechaAlta as Timestamp).toDate?.() || new Date(),
                      'dd/MM/yyyy',
                      { locale: es }
                    )}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Especialidades */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5" />
              Especialidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {tecnico.especialidades?.map((esp) => (
                <Badge key={esp} variant="default">
                  {ESPECIALIDADES_LABELS[esp] || esp}
                </Badge>
              )) || <p className="text-slate-400 text-sm">Sin especialidades definidas</p>}
            </div>
          </Card>

          {/* Certificaciones */}
          {tecnico.certificaciones && tecnico.certificaciones.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Award className="w-5 h-5" />
                Certificaciones
              </h3>
              <ul className="space-y-2">
                {tecnico.certificaciones.map((cert, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    {cert}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Columna central - Estadísticas y calendario */}
        <div className="col-span-5 space-y-6">
          {/* Estadísticas */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              Estadísticas de Rendimiento
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">
                  {estadisticas?.otsCompletadas || tecnico.estadisticas?.otsCompletadas || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">OTs completadas</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">
                  {estadisticas?.tiempoMedioResolucion ? 
                    `${Math.round(estadisticas.tiempoMedioResolucion)}m` : 
                    'N/A'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Tiempo medio resolución</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-400">
                  {estadisticas?.otsValidadas && estadisticas.otsCompletadas 
                    ? `${Math.round((estadisticas.otsValidadas / estadisticas.otsCompletadas) * 100)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Tasa de validación</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-400">
                  {estadisticas?.tiempoTotalIntervencion 
                    ? `${Math.round(estadisticas.tiempoTotalIntervencion / 60)}h` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Tiempo total intervención</p>
              </div>
            </div>

            {/* Desglose por tipo */}
            {estadisticas?.porTipo && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Desglose por tipo:</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-sm text-slate-300">
                      Urgente: {estadisticas.porTipo.correctivo_urgente || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="text-sm text-slate-300">
                      Programado: {estadisticas.porTipo.correctivo_programado || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-sm text-slate-300">
                      Preventivo: {estadisticas.porTipo.preventivo || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Calendario de disponibilidad */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendario de Disponibilidad
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMesActual(prev => {
                    const newDate = new Date(prev);
                    newDate.setMonth(prev.getMonth() - 1);
                    return newDate;
                  })}
                >
                  ←
                </Button>
                <span className="text-sm text-slate-300 w-32 text-center">
                  {format(mesActual, 'MMMM yyyy', { locale: es })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMesActual(prev => {
                    const newDate = new Date(prev);
                    newDate.setMonth(prev.getMonth() + 1);
                    return newDate;
                  })}
                >
                  →
                </Button>
              </div>
            </div>

            {/* Grid del calendario */}
            <div className="grid grid-cols-7 gap-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(dia => (
                <div key={dia} className="text-center text-xs text-slate-500 py-1">
                  {dia}
                </div>
              ))}
              
              {/* Espacios vacíos al inicio */}
              {Array.from({ length: (diasMes[0]?.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              
              {diasMes.map(dia => {
                const dispDia = getDisponibilidadDia(dia);
                const esHoy = isSameDay(dia, new Date());
                
                return (
                  <div
                    key={dia.toISOString()}
                    className={cn(
                      'aspect-square rounded text-center text-sm p-1 relative',
                      esHoy && 'ring-2 ring-blue-500',
                      dispDia?.disponible === false 
                        ? 'bg-red-500/20 text-red-400' 
                        : dispDia?.otsAsignadas && dispDia.otsAsignadas > 3
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700/50 text-slate-300'
                    )}
                    title={dispDia?.motivo || `${dispDia?.otsAsignadas || 0} OTs asignadas`}
                  >
                    {format(dia, 'd')}
                    {dispDia?.otsAsignadas && dispDia.otsAsignadas > 0 && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px]">
                        {dispDia.otsAsignadas}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-slate-700/50" />
                Disponible
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500/20" />
                Alta carga
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500/20" />
                No disponible
              </div>
            </div>
          </Card>
        </div>

        {/* Columna derecha - Historial */}
        <div className="col-span-3">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              Historial Reciente
            </h3>
            
            {historial.length === 0 ? (
              <p className="text-slate-400 text-sm">Sin intervenciones recientes</p>
            ) : (
              <div className="space-y-3">
                {historial.slice(0, 10).map((item) => (
                  <div 
                    key={item.otId}
                    className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => router.push(`/ordenes-trabajo/${item.otId}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          OT #{item.otCodigo || item.otId.slice(0, 8)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {item.tipo} · {item.estado}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.estado === 'completada' || item.estado === 'validada' ? 'success' :
                          item.estado === 'en_curso' ? 'warning' : 'default'
                        }
                        className="text-xs ml-2"
                      >
                        {item.estado}
                      </Badge>
                    </div>
                    {item.fechaFin && (
                      <p className="text-xs text-slate-500 mt-2">
                        {format(item.fechaFin, 'dd/MM/yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {historial.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4"
                onClick={() => {/* TODO: Ver historial completo */}}
              >
                Ver historial completo ({historial.length})
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
