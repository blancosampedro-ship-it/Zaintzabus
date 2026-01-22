'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Select } from '@/components/ui';
import {
  KpiCard,
  KpiMiniCard,
} from '@/components/dashboard/KpiCard';
import { AlertaPanel } from '@/components/dashboard/AlertaPanel';
import { GraficoBarras } from '@/components/dashboard/Graficos';
import {
  getKPIsGlobales,
  getAlertasCriticas,
  getMetricasTecnicos,
  type KPIsGlobales,
  type AlertaCritica,
  type MetricasTecnico,
} from '@/lib/firebase/metricas';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Wrench,
  Calendar,
  Clock,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Play,
  Pause,
  User2,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface OTPendiente {
  id: string;
  codigo: string;
  titulo: string;
  prioridad: 'alta' | 'media' | 'baja';
  tiempoEspera: number; // minutos
  autobus: string;
}

interface PreventivoSemana {
  id: string;
  nombre: string;
  autobus: string;
  fecha: Date;
  tecnico?: string;
}

export default function DashboardJefeMantenimientoPage() {
  const router = useRouter();
  const { claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIsGlobales | null>(null);
  const [alertas, setAlertas] = useState<AlertaCritica[]>([]);
  const [tecnicos, setTecnicos] = useState<MetricasTecnico[]>([]);
  const [otsPendientes, setOtsPendientes] = useState<OTPendiente[]>([]);
  const [preventivosSemana, setPreventivosSemana] = useState<PreventivoSemana[]>([]);

  useEffect(() => {
    if (tenantId) {
      cargarDatos();
    }
  }, [tenantId]);

  const cargarDatos = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const [kpisData, alertasData, tecnicosData] = await Promise.all([
        getKPIsGlobales(tenantId),
        getAlertasCriticas(tenantId),
        getMetricasTecnicos(tenantId),
      ]);

      setKpis(kpisData);
      setAlertas(alertasData);
      setTecnicos(tecnicosData);

      // Mock OTs pendientes de asignar
      setOtsPendientes([
        {
          id: '1',
          codigo: 'OT-2024-0089',
          titulo: 'Revisión sistema frenos',
          prioridad: 'alta',
          tiempoEspera: 120,
          autobus: 'Bus #245',
        },
        {
          id: '2',
          codigo: 'OT-2024-0090',
          titulo: 'Cambio filtro de aire',
          prioridad: 'media',
          tiempoEspera: 45,
          autobus: 'Bus #312',
        },
        {
          id: '3',
          codigo: 'OT-2024-0091',
          titulo: 'Reparación puerta trasera',
          prioridad: 'baja',
          tiempoEspera: 30,
          autobus: 'Bus #189',
        },
      ]);

      // Mock preventivos de la semana
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 });
      setPreventivosSemana([
        {
          id: '1',
          nombre: 'Cambio de aceite',
          autobus: 'Bus #245',
          fecha: addDays(inicioSemana, 1),
          tecnico: 'Juan García',
        },
        {
          id: '2',
          nombre: 'Revisión 50.000km',
          autobus: 'Bus #312',
          fecha: addDays(inicioSemana, 2),
        },
        {
          id: '3',
          nombre: 'Inspección neumáticos',
          autobus: 'Bus #189',
          fecha: addDays(inicioSemana, 3),
          tecnico: 'Pedro López',
        },
        {
          id: '4',
          nombre: 'Revisión AC',
          autobus: 'Bus #421',
          fecha: addDays(inicioSemana, 4),
        },
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos para gráfico de carga de técnicos
  const datosCargaTecnicos = useMemo(() => {
    return tecnicos.slice(0, 8).map((t) => ({
      nombre: t.nombre.split(' ')[0],
      valor: t.otsAsignadas,
      color:
        t.disponibilidad === 'alta'
          ? '#22c55e'
          : t.disponibilidad === 'media'
          ? '#f59e0b'
          : t.disponibilidad === 'baja'
          ? '#ef4444'
          : '#94a3b8',
    }));
  }, [tecnicos]);

  // Técnicos disponibles
  const tecnicosDisponibles = tecnicos.filter(
    (t) => t.disponibilidad === 'alta' || t.disponibilidad === 'media'
  );

  const getPrioridadColor = (prioridad: OTPendiente['prioridad']) => {
    switch (prioridad) {
      case 'alta':
        return 'bg-red-100 text-red-700';
      case 'media':
        return 'bg-amber-100 text-amber-700';
      case 'baja':
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getDisponibilidadColor = (disponibilidad: MetricasTecnico['disponibilidad']) => {
    switch (disponibilidad) {
      case 'alta':
        return 'bg-green-100 text-green-700';
      case 'media':
        return 'bg-amber-100 text-amber-700';
      case 'baja':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Jefe de Mantenimiento
          </h1>
          <p className="text-slate-500 mt-1">
            Gestión de técnicos y planificación •{' '}
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Link href="/planificacion">
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Planificador
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KpiCard
          titulo="OTs Pendientes"
          valor={kpis?.otsPendientes || 0}
          icono={<Wrench className="h-4 w-4" />}
          estado={(kpis?.otsPendientes || 0) > 10 ? 'alerta' : 'normal'}
          descripcion="Sin asignar"
          onClick={() => router.push('/ordenes-trabajo')}
        />

        <KpiCard
          titulo="OTs en Curso"
          valor={kpis?.otsEnCurso || 0}
          icono={<Play className="h-4 w-4" />}
          descripcion="Trabajos activos"
        />

        <KpiCard
          titulo="Técnicos Activos"
          valor={kpis?.tecnicosActivos || 0}
          icono={<Users className="h-4 w-4" />}
          descripcion={`${tecnicosDisponibles.length} disponibles`}
          onClick={() => router.push('/tecnicos')}
        />

        <KpiCard
          titulo="Preventivos Semana"
          valor={kpis?.preventivosProgramadosSemana || 0}
          icono={<Calendar className="h-4 w-4" />}
          estado={(kpis?.preventivosVencidos || 0) > 0 ? 'alerta' : 'normal'}
          descripcion={`${kpis?.preventivosVencidos || 0} vencidos`}
          onClick={() => router.push('/preventivo/calendario')}
        />

        <KpiCard
          titulo="Stock Crítico"
          valor={kpis?.alertasStockBajo || 0}
          icono={<Package className="h-4 w-4" />}
          estado={(kpis?.alertasStockBajo || 0) > 5 ? 'critico' : 'normal'}
          onClick={() => router.push('/inventario')}
        />
      </div>

      {/* Alertas y OTs pendientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas SLA y críticas */}
        <AlertaPanel
          alertas={alertas.filter((a) => a.tipo === 'sla' || a.severidad === 'alta')}
          maxAlertas={5}
          titulo="Alertas SLA y Críticas"
          onAlertaClick={(alerta) => {
            if (alerta.entidadTipo === 'incidencia') {
              router.push(`/incidencias/${alerta.entidadId}`);
            }
          }}
        />

        {/* OTs pendientes de asignar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-slate-400" />
                OTs Pendientes de Asignar
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {otsPendientes.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {otsPendientes.map((ot) => (
              <div
                key={ot.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => router.push(`/ordenes-trabajo/${ot.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Badge className={getPrioridadColor(ot.prioridad)}>
                    {ot.prioridad}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {ot.codigo}
                    </p>
                    <p className="text-xs text-slate-500">{ot.titulo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{ot.autobus}</p>
                  <p className="text-xs text-amber-600">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {ot.tiempoEspera}min
                  </p>
                </div>
              </div>
            ))}
            <Link href="/ordenes-trabajo">
              <Button variant="outline" className="w-full mt-2">
                Ver todas las OTs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Técnicos y carga de trabajo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de técnicos disponibles */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Técnicos Disponibles
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {tecnicosDisponibles.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tecnicos.slice(0, 6).map((tec) => (
              <div
                key={tec.tecnicoId}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <User2 className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {tec.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tec.otsAsignadas} OTs asignadas
                    </p>
                  </div>
                </div>
                <Badge className={getDisponibilidadColor(tec.disponibilidad)}>
                  {tec.disponibilidad === 'alta'
                    ? 'Libre'
                    : tec.disponibilidad === 'media'
                    ? 'Ocupado'
                    : tec.disponibilidad === 'baja'
                    ? 'Cargado'
                    : 'No disp'}
                </Badge>
              </div>
            ))}
            <Link href="/tecnicos">
              <Button variant="outline" className="w-full mt-2">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Gráfico de carga */}
        <GraficoBarras
          datos={datosCargaTecnicos}
          titulo="Carga de Trabajo por Técnico"
          orientacion="horizontal"
          altura={280}
          className="lg:col-span-2"
        />
      </div>

      {/* Calendario preventivos de la semana */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Preventivos de la Semana
            </CardTitle>
            <Link href="/preventivo/calendario">
              <Button variant="outline" size="sm">
                Ver calendario completo
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
              const fecha = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOffset);
              const preventivosDelDia = preventivosSemana.filter(
                (p) => format(p.fecha, 'yyyy-MM-dd') === format(fecha, 'yyyy-MM-dd')
              );
              const esHoy = format(fecha, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <div
                  key={dayOffset}
                  className={`p-3 rounded-lg border ${
                    esHoy
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-slate-500 uppercase">
                      {format(fecha, 'EEE', { locale: es })}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        esHoy ? 'text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      {format(fecha, 'd')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {preventivosDelDia.map((prev) => (
                      <div
                        key={prev.id}
                        className="text-xs p-1.5 bg-white rounded border border-slate-100 hover:border-blue-200 cursor-pointer"
                        onClick={() => router.push(`/preventivo/${prev.id}`)}
                      >
                        <p className="font-medium text-slate-700 truncate">
                          {prev.nombre}
                        </p>
                        <p className="text-slate-400 truncate">{prev.autobus}</p>
                        {prev.tecnico && (
                          <p className="text-green-600 truncate text-[10px]">
                            ✓ {prev.tecnico}
                          </p>
                        )}
                        {!prev.tecnico && (
                          <p className="text-amber-600 truncate text-[10px]">
                            ⚠ Sin asignar
                          </p>
                        )}
                      </div>
                    ))}
                    {preventivosDelDia.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        Sin preventivos
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mini KPIs adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiMiniCard
          titulo="OTs Completadas Hoy"
          valor={3}
          icono={<CheckCircle2 className="h-4 w-4" />}
          color="green"
        />
        <KpiMiniCard
          titulo="Tiempo Medio OT"
          valor="2.5h"
          icono={<Clock className="h-4 w-4" />}
          color="blue"
        />
        <KpiMiniCard
          titulo="Eficiencia Técnicos"
          valor="87%"
          icono={<Users className="h-4 w-4" />}
          color="purple"
        />
        <KpiMiniCard
          titulo="OTs Este Mes"
          valor={kpis?.otsCompletadasMes || 0}
          icono={<Wrench className="h-4 w-4" />}
          color="slate"
        />
        <KpiMiniCard
          titulo="Técnicos Sobrecargados"
          valor={kpis?.tecnicosSobrecargados || 0}
          icono={<AlertTriangle className="h-4 w-4" />}
          color={(kpis?.tecnicosSobrecargados || 0) > 2 ? 'red' : 'amber'}
        />
        <KpiMiniCard
          titulo="SLA en Riesgo"
          valor={kpis?.slaEnRiesgo || 0}
          icono={<Clock className="h-4 w-4" />}
          color={(kpis?.slaEnRiesgo || 0) > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Stock crítico */}
      {(kpis?.alertasStockBajo || 0) > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {kpis?.alertasStockBajo} artículos con stock bajo
                  </p>
                  <p className="text-xs text-amber-600">
                    Revisar inventario para evitar interrupciones en reparaciones
                  </p>
                </div>
              </div>
              <Link href="/inventario">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  Ver inventario
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-2">
        Última actualización: {format(new Date(), "HH:mm:ss", { locale: es })}
      </div>
    </div>
  );
}
