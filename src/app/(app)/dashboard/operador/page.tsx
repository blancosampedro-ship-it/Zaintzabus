'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import {
  KpiCard,
  KpiGauge,
  KpiMiniCard,
} from '@/components/dashboard/KpiCard';
import { AlertaPanel } from '@/components/dashboard/AlertaPanel';
import {
  GraficoTendencia,
  GraficoCircular,
} from '@/components/dashboard/Graficos';
import {
  getKPIsGlobales,
  getTendenciaTemporal,
  getIncidenciasPorTipoEquipo,
  getAlertasCriticas,
  type KPIsGlobales,
  type TendenciaTemporal,
  type MetricasPorTipo,
  type AlertaCritica,
} from '@/lib/firebase/metricas';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bus,
  AlertTriangle,
  Wrench,
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileWarning,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface ActividadReciente {
  id: string;
  tipo: 'incidencia' | 'ot' | 'preventivo';
  titulo: string;
  descripcion: string;
  fecha: Date;
  estado: string;
}

export default function DashboardOperadorPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIsGlobales | null>(null);
  const [tendenciaIncidencias, setTendenciaIncidencias] = useState<TendenciaTemporal[]>([]);
  const [incidenciasPorTipo, setIncidenciasPorTipo] = useState<MetricasPorTipo[]>([]);
  const [alertas, setAlertas] = useState<AlertaCritica[]>([]);
  const [actividades, setActividades] = useState<ActividadReciente[]>([]);

  useEffect(() => {
    if (tenantId) {
      cargarDatos();
    }
  }, [tenantId]);

  const cargarDatos = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const [kpisData, tendenciaData, incPorTipoData, alertasData] =
        await Promise.all([
          getKPIsGlobales(tenantId),
          getTendenciaTemporal(tenantId, 'incidencias', 7),
          getIncidenciasPorTipoEquipo(tenantId),
          getAlertasCriticas(tenantId),
        ]);

      setKpis(kpisData);
      setTendenciaIncidencias(tendenciaData);
      setIncidenciasPorTipo(incPorTipoData);
      setAlertas(alertasData);

      // Mock actividades recientes
      setActividades([
        {
          id: '1',
          tipo: 'incidencia',
          titulo: 'Fallo en sistema de frenado',
          descripcion: 'Bus #245 reportado por conductor',
          fecha: new Date(),
          estado: 'reportada',
        },
        {
          id: '2',
          tipo: 'ot',
          titulo: 'OT #1234 completada',
          descripcion: 'Reparación motor Bus #312',
          fecha: new Date(Date.now() - 3600000),
          estado: 'completada',
        },
        {
          id: '3',
          tipo: 'preventivo',
          titulo: 'Cambio de aceite programado',
          descripcion: 'Bus #189 - mañana 09:00',
          fecha: new Date(Date.now() - 7200000),
          estado: 'programado',
        },
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActividadIcon = (tipo: ActividadReciente['tipo']) => {
    switch (tipo) {
      case 'incidencia':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'ot':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'preventivo':
        return <Calendar className="h-4 w-4 text-purple-500" />;
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
      {/* Header con acciones rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mi Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Estado de tu flota •{' '}
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: es })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Link href="/incidencias/nueva">
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Incidencia
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs principales del operador */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          titulo="Mi Flota"
          valor={kpis?.totalAutobuses || 0}
          icono={<Bus className="h-4 w-4" />}
          descripcion={`${kpis?.autobusesOperativos || 0} operativos`}
          onClick={() => router.push('/activos')}
        />

        <KpiCard
          titulo="Disponibilidad"
          valor={kpis?.disponibilidadFlota || 0}
          unidad="%"
          icono={<Activity className="h-4 w-4" />}
          estado={
            (kpis?.disponibilidadFlota || 0) >= 95
              ? 'excelente'
              : (kpis?.disponibilidadFlota || 0) >= 85
              ? 'normal'
              : 'alerta'
          }
        />

        <KpiCard
          titulo="Incidencias Abiertas"
          valor={kpis?.incidenciasAbiertas || 0}
          icono={<AlertTriangle className="h-4 w-4" />}
          estado={
            (kpis?.incidenciasAbiertas || 0) === 0
              ? 'excelente'
              : (kpis?.incidenciasAbiertas || 0) <= 5
              ? 'normal'
              : 'alerta'
          }
          descripcion={`${kpis?.incidenciasUrgentes || 0} urgentes`}
          onClick={() => router.push('/incidencias')}
        />

        <KpiCard
          titulo="OTs en Curso"
          valor={(kpis?.otsPendientes || 0) + (kpis?.otsEnCurso || 0)}
          icono={<Wrench className="h-4 w-4" />}
          descripcion={`${kpis?.otsEnCurso || 0} activas`}
          onClick={() => router.push('/ordenes-trabajo')}
        />
      </div>

      {/* Fila principal: Gauge + Alertas + Acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gauge de disponibilidad */}
        <KpiGauge
          titulo="Disponibilidad de Flota"
          valor={kpis?.disponibilidadFlota || 0}
          umbrales={{ bajo: 70, medio: 85, alto: 95 }}
        />

        {/* Alertas */}
        <AlertaPanel
          alertas={alertas}
          maxAlertas={3}
          titulo="Alertas Activas"
          onAlertaClick={(alerta) => {
            if (alerta.entidadTipo === 'incidencia') {
              router.push(`/incidencias/${alerta.entidadId}`);
            } else if (alerta.entidadTipo === 'preventivo') {
              router.push(`/preventivo/${alerta.entidadId}`);
            }
          }}
        />

        {/* Acciones rápidas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/incidencias/nueva" className="block">
              <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Reportar Incidencia
              </Button>
            </Link>
            <Link href="/activos" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Bus className="h-4 w-4 mr-2" />
                Ver Mi Flota
              </Button>
            </Link>
            <Link href="/preventivo" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Preventivos Próximos
              </Button>
            </Link>
            <Link href="/inventario" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileWarning className="h-4 w-4 mr-2" />
                Solicitar Repuesto
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Mini KPIs adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiMiniCard
          titulo="Incidencias Hoy"
          valor={kpis?.incidenciasHoy || 0}
          icono={<AlertTriangle className="h-4 w-4" />}
          color={(kpis?.incidenciasHoy || 0) > 3 ? 'red' : 'slate'}
        />
        <KpiMiniCard
          titulo="OTs Completadas"
          valor={kpis?.otsCompletadasMes || 0}
          icono={<CheckCircle2 className="h-4 w-4" />}
          color="green"
        />
        <KpiMiniCard
          titulo="Preventivos Semana"
          valor={kpis?.preventivosProgramadosSemana || 0}
          icono={<Calendar className="h-4 w-4" />}
          color="purple"
        />
        <KpiMiniCard
          titulo="Prev. Vencidos"
          valor={kpis?.preventivosVencidos || 0}
          icono={<Clock className="h-4 w-4" />}
          color={(kpis?.preventivosVencidos || 0) > 0 ? 'red' : 'green'}
        />
        <KpiMiniCard
          titulo="SLA Cumplimiento"
          valor={`${kpis?.cumplimientoSLA || 0}%`}
          icono={<Activity className="h-4 w-4" />}
          color={(kpis?.cumplimientoSLA || 0) >= 90 ? 'green' : 'amber'}
        />
        <KpiMiniCard
          titulo="Stock Bajo"
          valor={kpis?.alertasStockBajo || 0}
          icono={<FileWarning className="h-4 w-4" />}
          color={(kpis?.alertasStockBajo || 0) > 3 ? 'amber' : 'slate'}
        />
      </div>

      {/* Gráficos y actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tendencia de incidencias */}
        <GraficoTendencia
          datos={tendenciaIncidencias}
          titulo="Incidencias (últimos 7 días)"
          tipo="area"
          color="#ef4444"
          altura={180}
          className="lg:col-span-1"
        />

        {/* Distribución de incidencias */}
        <GraficoCircular
          datos={incidenciasPorTipo}
          titulo="Incidencias por Tipo"
          tipo="donut"
          altura={180}
          mostrarLeyenda={false}
          className="lg:col-span-1"
        />

        {/* Actividad reciente */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
              Actividad Reciente
              <Link href="/incidencias">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Ver todo
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actividades.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
              >
                <div className="mt-0.5">{getActividadIcon(act.tipo)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {act.titulo}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {act.descripcion}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(act.fecha, "HH:mm", { locale: es })}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    act.estado === 'completada'
                      ? 'bg-green-50 text-green-700'
                      : act.estado === 'reportada'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }
                >
                  {act.estado}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Resumen de flota */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Bus className="h-4 w-4 text-slate-400" />
              Resumen de Flota
            </CardTitle>
            <Link href="/activos">
              <Button variant="outline" size="sm">
                Ver todos
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {kpis?.autobusesOperativos || 0}
              </div>
              <div className="text-sm text-green-600">Operativos</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">
                {(kpis?.totalAutobuses || 0) - (kpis?.autobusesOperativos || 0) - 2}
              </div>
              <div className="text-sm text-amber-600">En Mantenimiento</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">
                2
              </div>
              <div className="text-sm text-red-600">Fuera de Servicio</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {kpis?.totalAutobuses || 0}
              </div>
              <div className="text-sm text-blue-600">Total Flota</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-2">
        Última actualización: {format(new Date(), "HH:mm:ss", { locale: es })}
      </div>
    </div>
  );
}
