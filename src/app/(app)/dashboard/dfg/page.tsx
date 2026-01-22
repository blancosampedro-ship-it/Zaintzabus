'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Select } from '@/components/ui';
import {
  KpiCard,
  KpiGauge,
} from '@/components/dashboard/KpiCard';
import {
  GraficoTendencia,
  GraficoBarras,
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
  type KPIsGlobales,
  type MetricasOperador,
  type TendenciaTemporal,
} from '@/lib/firebase/metricas';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Bus,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Eye,
  FileText,
  Shield,
  Lock,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardDFGPage() {
  const { claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [periodoTendencia, setPeriodoTendencia] = useState<'7' | '15' | '30'>('30');
  const [kpis, setKpis] = useState<KPIsGlobales | null>(null);
  const [operadores, setOperadores] = useState<MetricasOperador[]>([]);
  const [tendenciaDisponibilidad, setTendenciaDisponibilidad] = useState<TendenciaTemporal[]>([]);
  const [tendenciaSLA, setTendenciaSLA] = useState<TendenciaTemporal[]>([]);

  // Cargar datos
  useEffect(() => {
    cargarDatos();
  }, [tenantId, periodoTendencia]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [kpisData, operadoresData, tendenciaDispData, tendenciaSLAData] =
        await Promise.all([
          getKPIsGlobales(tenantId || undefined),
          getMetricasPorOperador(),
          tenantId
            ? getTendenciaTemporal(tenantId, 'disponibilidad', parseInt(periodoTendencia))
            : Promise.resolve([]),
          tenantId
            ? getTendenciaTemporal(tenantId, 'cumplimiento_sla', parseInt(periodoTendencia))
            : Promise.resolve([]),
        ]);

      setKpis(kpisData);
      setOperadores(operadoresData);
      setTendenciaDisponibilidad(tendenciaDispData);
      setTendenciaSLA(tendenciaSLAData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Datos para gráfico comparativa operadores
  const datosComparativaOperadores = operadores.slice(0, 10).map((op) => ({
    nombre: op.operadorNombre.length > 12 
      ? op.operadorNombre.slice(0, 12) + '...' 
      : op.operadorNombre,
    disponibilidad: op.disponibilidad,
    sla: op.cumplimientoSLA,
  }));

  // Calcular métricas agregadas
  const metricasAgregadas = {
    disponibilidadMedia:
      operadores.length > 0
        ? Math.round(
            operadores.reduce((sum, op) => sum + op.disponibilidad, 0) /
              operadores.length
          )
        : 0,
    slaMedia:
      operadores.length > 0
        ? Math.round(
            operadores.reduce((sum, op) => sum + op.cumplimientoSLA, 0) /
              operadores.length
          )
        : 0,
    totalFlota: operadores.reduce((sum, op) => sum + op.totalAutobuses, 0),
    totalOperativos: operadores.reduce(
      (sum, op) => sum + op.autobusesOperativos,
      0
    ),
    operadoresConAlerta: operadores.filter((op) => op.disponibilidad < 90)
      .length,
  };

  const exportarInforme = () => {
    // Aquí iría la lógica de exportación oficial
    console.log('Exportando informe oficial DFG...');
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Dashboard DFG
            </h1>
            <Badge className="bg-blue-100 text-blue-700">
              <Eye className="h-3 w-3 mr-1" />
              Solo lectura
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Panel de auditoría y supervisión •{' '}
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

          <Button onClick={exportarInforme}>
            <FileText className="h-4 w-4 mr-2" />
            Informe Oficial
          </Button>
        </div>
      </div>

      {/* Aviso de modo auditor */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Modo Auditor - Datos Agregados de la Red
              </p>
              <p className="text-xs text-blue-600">
                Visualización de métricas consolidadas para supervisión y auditoría pública.
                Los datos son de solo lectura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs agregados de la red */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          titulo="Operadores en Red"
          valor={operadores.length}
          icono={<Building2 className="h-4 w-4" />}
          descripcion="Total de operadores"
        />

        <KpiCard
          titulo="Flota Total"
          valor={metricasAgregadas.totalFlota}
          icono={<Bus className="h-4 w-4" />}
          descripcion={`${metricasAgregadas.totalOperativos} operativos`}
        />

        <KpiCard
          titulo="Disponibilidad Media"
          valor={metricasAgregadas.disponibilidadMedia}
          unidad="%"
          estado={
            metricasAgregadas.disponibilidadMedia >= 95
              ? 'excelente'
              : metricasAgregadas.disponibilidadMedia >= 85
              ? 'normal'
              : 'alerta'
          }
        />

        <KpiCard
          titulo="Cumplimiento SLA"
          valor={metricasAgregadas.slaMedia}
          unidad="%"
          icono={<Clock className="h-4 w-4" />}
          estado={
            metricasAgregadas.slaMedia >= 95
              ? 'excelente'
              : metricasAgregadas.slaMedia >= 85
              ? 'normal'
              : 'critico'
          }
        />

        <KpiCard
          titulo="Operadores en Alerta"
          valor={metricasAgregadas.operadoresConAlerta}
          estado={metricasAgregadas.operadoresConAlerta > 0 ? 'alerta' : 'excelente'}
          descripcion="Disponibilidad < 90%"
        />
      </div>

      {/* Gauges de cumplimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiGauge
          titulo="Disponibilidad Red"
          valor={metricasAgregadas.disponibilidadMedia}
          umbrales={{ bajo: 70, medio: 85, alto: 95 }}
        />
        <KpiGauge
          titulo="Cumplimiento SLA"
          valor={metricasAgregadas.slaMedia}
          umbrales={{ bajo: 70, medio: 85, alto: 92 }}
        />
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900">
                {Math.round(
                  (metricasAgregadas.totalOperativos / metricasAgregadas.totalFlota) *
                    100
                ) || 0}%
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Vehículos Operativos
              </div>
              <div className="text-xs text-slate-400 mt-2">
                {metricasAgregadas.totalOperativos} de {metricasAgregadas.totalFlota}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900">
                {operadores.filter((op) => op.cumplimientoSLA >= 90).length}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Operadores OK
              </div>
              <div className="text-xs text-slate-400 mt-2">
                SLA ≥ 90% de {operadores.length} totales
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparativa visual de operadores */}
      <GraficoComparativa
        datos={datosComparativaOperadores}
        titulo="Comparativa de Disponibilidad y SLA por Operador"
        series={[
          { key: 'disponibilidad', nombre: 'Disponibilidad %', color: '#3b82f6' },
          { key: 'sla', nombre: 'SLA %', color: '#22c55e' },
        ]}
        tipo="barra"
        altura={300}
      />

      {/* Rankings lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RankingOperadores
          operadores={operadores}
          metrica="disponibilidad"
          titulo="🏆 Mayor Disponibilidad"
          limite={5}
        />
        <RankingOperadores
          operadores={operadores}
          metrica="cumplimientoSLA"
          titulo="⏱️ Mejor Cumplimiento SLA"
          limite={5}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">
              ⚠️ Operadores en Vigilancia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {operadores
              .filter((op) => op.disponibilidad < 90 || op.cumplimientoSLA < 85)
              .slice(0, 5)
              .map((op, index) => (
                <div
                  key={op.operadorId}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm text-slate-700">{op.operadorNombre}</span>
                  </div>
                  <div className="flex gap-2">
                    {op.disponibilidad < 90 && (
                      <Badge className="bg-amber-50 text-amber-700 text-xs">
                        {op.disponibilidad}% disp
                      </Badge>
                    )}
                    {op.cumplimientoSLA < 85 && (
                      <Badge className="bg-red-50 text-red-700 text-xs">
                        {op.cumplimientoSLA}% SLA
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            {operadores.filter(
              (op) => op.disponibilidad < 90 || op.cumplimientoSLA < 85
            ).length === 0 && (
              <p className="text-sm text-green-600 text-center py-4">
                ✓ Todos los operadores cumplen estándares
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla completa de operadores (solo lectura) */}
      <TablaOperadores
        operadores={operadores}
        titulo="Detalle de Operadores de la Red (Solo Lectura)"
        mostrarRentabilidad={false}
      />

      {/* Tendencias históricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoTendencia
          datos={tendenciaDisponibilidad}
          titulo={`Evolución Disponibilidad (${periodoTendencia} días)`}
          tipo="linea"
          color="#3b82f6"
          unidad="%"
          altura={200}
        />
        <GraficoTendencia
          datos={tendenciaSLA}
          titulo={`Evolución Cumplimiento SLA (${periodoTendencia} días)`}
          tipo="linea"
          color="#22c55e"
          unidad="%"
          altura={200}
        />
      </div>

      {/* Información de auditoría */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Datos certificados para auditoría
                </p>
                <p className="text-xs text-slate-500">
                  Última sincronización:{' '}
                  {format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar Certificado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
