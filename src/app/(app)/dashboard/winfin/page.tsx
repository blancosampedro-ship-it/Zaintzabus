'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Select } from '@/components/ui';
import {
  KpiCard,
  KpiGauge,
  KpiMiniCard,
} from '@/components/dashboard/KpiCard';
import {
  AlertaPanel,
} from '@/components/dashboard/AlertaPanel';
import {
  GraficoTendencia,
  GraficoBarras,
  GraficoCircular,
  GraficoComparativa,
} from '@/components/dashboard/Graficos';
import {
  TablaOperadores,
  RankingOperadores,
} from '@/components/dashboard/TablaOperadores';
import {
  getKPIsGlobales,
  getMetricasPorOperador,
  getTendenciaTemporal,
  getIncidenciasPorTipoEquipo,
  getAlertasCriticas,
  getMetricasTecnicos,
  type KPIsGlobales,
  type MetricasOperador,
  type TendenciaTemporal,
  type MetricasPorTipo,
  type AlertaCritica,
  type MetricasTecnico,
} from '@/lib/firebase/metricas';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Bus,
  AlertTriangle,
  Wrench,
  Package,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardWINFINPage() {
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [periodoTendencia, setPeriodoTendencia] = useState<'7' | '15' | '30'>('30');
  const [kpis, setKpis] = useState<KPIsGlobales | null>(null);
  const [operadores, setOperadores] = useState<MetricasOperador[]>([]);
  const [tendenciaIncidencias, setTendenciaIncidencias] = useState<TendenciaTemporal[]>([]);
  const [tendenciaOTs, setTendenciaOTs] = useState<TendenciaTemporal[]>([]);
  const [incidenciasPorTipo, setIncidenciasPorTipo] = useState<MetricasPorTipo[]>([]);
  const [alertas, setAlertas] = useState<AlertaCritica[]>([]);
  const [tecnicosMetricas, setTecnicosMetricas] = useState<MetricasTecnico[]>([]);

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, [tenantId, periodoTendencia]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar todos los datos en paralelo
      const [
        kpisData,
        operadoresData,
        tendenciaIncData,
        tendenciaOTsData,
        incPorTipoData,
        alertasData,
        tecnicosData,
      ] = await Promise.all([
        getKPIsGlobales(tenantId || undefined),
        getMetricasPorOperador(),
        tenantId
          ? getTendenciaTemporal(tenantId, 'incidencias', parseInt(periodoTendencia))
          : Promise.resolve([]),
        tenantId
          ? getTendenciaTemporal(tenantId, 'ots_completadas', parseInt(periodoTendencia))
          : Promise.resolve([]),
        tenantId
          ? getIncidenciasPorTipoEquipo(tenantId)
          : Promise.resolve([]),
        tenantId
          ? getAlertasCriticas(tenantId)
          : Promise.resolve([]),
        tenantId
          ? getMetricasTecnicos(tenantId)
          : Promise.resolve([]),
      ]);

      setKpis(kpisData);
      setOperadores(operadoresData);
      setTendenciaIncidencias(tendenciaIncData);
      setTendenciaOTs(tendenciaOTsData);
      setIncidenciasPorTipo(incPorTipoData);
      setAlertas(alertasData);
      setTecnicosMetricas(tecnicosData);
    } catch (error) {
      console.error('Error cargando datos dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos para gráfico comparativa
  const datosComparativa = useMemo(() => {
    // Simular datos de comparativa temporal
    const dias = parseInt(periodoTendencia);
    const datos = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = subDays(new Date(), i);
      datos.push({
        nombre: format(fecha, 'dd/MM', { locale: es }),
        incidencias: tendenciaIncidencias[dias - 1 - i]?.valor || 0,
        otsCompletadas: tendenciaOTs[dias - 1 - i]?.valor || 0,
      });
    }
    return datos;
  }, [tendenciaIncidencias, tendenciaOTs, periodoTendencia]);

  // Datos para gráfico de técnicos
  const datosTecnicos = useMemo(() => {
    return tecnicosMetricas.slice(0, 8).map((t) => ({
      nombre: t.nombre.split(' ')[0], // Solo primer nombre
      valor: t.otsAsignadas,
    }));
  }, [tecnicosMetricas]);

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
            Dashboard WINFIN
          </h1>
          <p className="text-slate-500 mt-1">
            Visión global de la red de transporte •{' '}
            {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={periodoTendencia}
            onChange={(v) => setPeriodoTendencia(v as '7' | '15' | '30')}
            options={[
              { value: '7', label: 'Últimos 7 días' },
              { value: '15', label: 'Últimos 15 días' },
              { value: '30', label: 'Últimos 30 días' },
            ]}
            placeholder="Período"
            className="w-[150px]"
          />

          <Button variant="outline" onClick={cargarDatos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard
          titulo="Disponibilidad Flota"
          valor={kpis?.disponibilidadFlota || 0}
          unidad="%"
          icono={<Bus className="h-4 w-4" />}
          estado={
            (kpis?.disponibilidadFlota || 0) >= 95
              ? 'excelente'
              : (kpis?.disponibilidadFlota || 0) >= 85
              ? 'normal'
              : 'alerta'
          }
          descripcion={`${kpis?.autobusesOperativos || 0}/${kpis?.totalAutobuses || 0} operativos`}
        />

        <KpiCard
          titulo="Incidencias Abiertas"
          valor={kpis?.incidenciasAbiertas || 0}
          icono={<AlertTriangle className="h-4 w-4" />}
          estado={
            (kpis?.incidenciasAbiertas || 0) === 0
              ? 'excelente'
              : (kpis?.incidenciasAbiertas || 0) <= 10
              ? 'normal'
              : 'alerta'
          }
          descripcion={`${kpis?.incidenciasUrgentes || 0} urgentes`}
        />

        <KpiCard
          titulo="OTs Pendientes"
          valor={kpis?.otsPendientes || 0}
          icono={<Wrench className="h-4 w-4" />}
          descripcion={`${kpis?.otsEnCurso || 0} en curso`}
        />

        <KpiCard
          titulo="Cumplimiento SLA"
          valor={kpis?.cumplimientoSLA || 0}
          unidad="%"
          icono={<Clock className="h-4 w-4" />}
          estado={
            (kpis?.cumplimientoSLA || 0) >= 95
              ? 'excelente'
              : (kpis?.cumplimientoSLA || 0) >= 85
              ? 'normal'
              : 'critico'
          }
          descripcion={`${kpis?.slaEnRiesgo || 0} en riesgo`}
        />

        <KpiCard
          titulo="OTs Completadas (mes)"
          valor={kpis?.otsCompletadasMes || 0}
          icono={<TrendingUp className="h-4 w-4" />}
          tendencia={{ valor: 12, tipo: 'positivo', texto: 'vs mes anterior' }}
        />

        <KpiCard
          titulo="Stock Bajo"
          valor={kpis?.alertasStockBajo || 0}
          icono={<Package className="h-4 w-4" />}
          estado={(kpis?.alertasStockBajo || 0) > 5 ? 'alerta' : 'normal'}
        />
      </div>

      {/* Fila de gauges y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <KpiGauge
          titulo="Disponibilidad"
          valor={kpis?.disponibilidadFlota || 0}
          umbrales={{ bajo: 70, medio: 85, alto: 95 }}
        />
        <KpiGauge
          titulo="SLA"
          valor={kpis?.cumplimientoSLA || 0}
          umbrales={{ bajo: 70, medio: 85, alto: 92 }}
        />
        <div className="lg:col-span-2">
          <AlertaPanel
            alertas={alertas}
            maxAlertas={4}
            titulo="Alertas Críticas"
            onAlertaClick={(alerta) => {
              console.log('Navegar a:', alerta);
            }}
          />
        </div>
      </div>

      {/* Gráficos de tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoTendencia
          datos={tendenciaIncidencias}
          titulo={`Incidencias Reportadas (últimos ${periodoTendencia} días)`}
          tipo="area"
          color="#ef4444"
          altura={220}
        />
        <GraficoTendencia
          datos={tendenciaOTs}
          titulo={`OTs Completadas (últimos ${periodoTendencia} días)`}
          tipo="area"
          color="#22c55e"
          altura={220}
        />
      </div>

      {/* Comparativa y distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoComparativa
            datos={datosComparativa.slice(-14)}
            titulo="Comparativa: Incidencias vs OTs Completadas"
            series={[
              { key: 'incidencias', nombre: 'Incidencias', color: '#ef4444' },
              { key: 'otsCompletadas', nombre: 'OTs Completadas', color: '#22c55e' },
            ]}
            tipo="linea"
            altura={250}
          />
        </div>
        <GraficoCircular
          datos={incidenciasPorTipo}
          titulo="Incidencias por Tipo de Equipo"
          tipo="donut"
          altura={250}
        />
      </div>

      {/* Tabla comparativa de operadores */}
      {operadores.length > 0 && (
        <TablaOperadores
          operadores={operadores}
          titulo="Comparativa de Operadores de la Red"
          mostrarRentabilidad={claims?.rol === 'admin'}
          onOperadorClick={(id) => console.log('Ver operador:', id)}
        />
      )}

      {/* Rankings y técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RankingOperadores
          operadores={operadores}
          metrica="disponibilidad"
          titulo="🏆 Mejor Disponibilidad"
        />
        <RankingOperadores
          operadores={operadores}
          metrica="cumplimientoSLA"
          titulo="⏱️ Mejor SLA"
        />
        <RankingOperadores
          operadores={operadores}
          metrica="incidenciasAbiertas"
          titulo="✅ Menos Incidencias"
        />
        <GraficoBarras
          datos={datosTecnicos}
          titulo="Carga de Técnicos"
          orientacion="horizontal"
          altura={200}
        />
      </div>

      {/* Info de técnicos detallada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            Estado de Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiMiniCard
              titulo="Técnicos Activos"
              valor={kpis?.tecnicosActivos || 0}
              icono={<Users className="h-4 w-4" />}
              color="blue"
            />
            <KpiMiniCard
              titulo="Sobrecargados"
              valor={kpis?.tecnicosSobrecargados || 0}
              icono={<AlertTriangle className="h-4 w-4" />}
              color={(kpis?.tecnicosSobrecargados || 0) > 2 ? 'red' : 'amber'}
            />
            <KpiMiniCard
              titulo="Preventivos Semana"
              valor={kpis?.preventivosProgramadosSemana || 0}
              icono={<Calendar className="h-4 w-4" />}
              color="purple"
            />
            <KpiMiniCard
              titulo="Preventivos Vencidos"
              valor={kpis?.preventivosVencidos || 0}
              icono={<Clock className="h-4 w-4" />}
              color={(kpis?.preventivosVencidos || 0) > 0 ? 'red' : 'green'}
            />
            <KpiMiniCard
              titulo="Incidencias Hoy"
              valor={kpis?.incidenciasHoy || 0}
              icono={<AlertTriangle className="h-4 w-4" />}
              color={(kpis?.incidenciasHoy || 0) > 5 ? 'red' : 'slate'}
            />
            <KpiMiniCard
              titulo="Urgentes"
              valor={kpis?.incidenciasUrgentes || 0}
              icono={<AlertTriangle className="h-4 w-4" />}
              color={(kpis?.incidenciasUrgentes || 0) > 0 ? 'red' : 'green'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Última actualización */}
      <div className="text-center text-xs text-slate-400 py-2">
        Última actualización: {format(new Date(), "HH:mm:ss", { locale: es })}
      </div>
    </div>
  );
}
