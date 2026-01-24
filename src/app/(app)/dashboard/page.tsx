'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { RequirePermission, PermissionGate, RoleGate } from '@/lib/permissions';
import { getEstadisticasIncidencias, EstadisticasIncidencias, getIncidencias } from '@/lib/firebase/incidencias';
import { getResumenInventario, ResumenInventario } from '@/lib/firebase/inventario';
import { getResumenActivos, ResumenActivos } from '@/lib/firebase/activos';
import { getResumenPreventivo, ResumenPreventivo } from '@/lib/firebase/preventivo';
import { Incidencia } from '@/types';
import StatusBar from '@/components/ui/StatusBar';
import KpiGauge from '@/components/ui/KpiGauge';
import AlertPanel from '@/components/ui/AlertPanel';
import ActivityFeed, { ActivityItem } from '@/components/ui/ActivityFeed';
import { ReadOnlyBanner } from '@/components/ui/PermissionUI';
import { DashboardKPIGrid } from '@/components/dashboard/DashboardKPIGrid';
import {
  RoleDashboardHeader,
  RoleQuickActions,
  MisOTsWidget,
  TecnicosDisponiblesWidget,
  useRoleWidgets,
  RoleKeyQuestionsWidget,
  ResumenCostesWidget,
  ComparativaOperadoresWidget,
  ActividadRecienteWidget,
} from '@/components/dashboard/RoleDashboard';
import {
  AlertTriangle,
  CheckCircle,
  Bus,
  Calendar,
  Package,
  Wrench,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface DashboardStats {
  incidencias: EstadisticasIncidencias | null;
  inventario: ResumenInventario | null;
  activos: ResumenActivos | null;
  preventivo: ResumenPreventivo | null;
}

export default function DashboardPage() {
  const { claims, isReadOnly, canViewCosts, canAccessAllTenants, hasPermission } = useAuth();
  const widgets = useRoleWidgets();
  const [stats, setStats] = useState<DashboardStats>({
    incidencias: null,
    inventario: null,
    activos: null,
    preventivo: null,
  });
  const [incidenciasAbiertas, setIncidenciasAbiertas] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!claims?.tenantId) return;

      try {
        const [incidencias, inventario, activos, preventivo, incidenciasData] = await Promise.all([
          getEstadisticasIncidencias(claims.tenantId),
          getResumenInventario(claims.tenantId),
          getResumenActivos(claims.tenantId),
          getResumenPreventivo(claims.tenantId),
          getIncidencias({ 
            tenantId: claims.tenantId, 
            estado: ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'],
            pageSize: 10 
          }),
        ]);

        setStats({ incidencias, inventario, activos, preventivo });
        setIncidenciasAbiertas(incidenciasData.incidencias);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [claims?.tenantId]);

  // Generar actividad reciente desde incidencias (en producción vendría de auditoría)
  const actividadReciente: ActivityItem[] = incidenciasAbiertas
    .filter((inc) => inc.timestamps?.recepcion)
    .slice(0, 5)
    .map((inc) => ({
      id: inc.id,
      tipo: 'incidencia' as const,
      accion: inc.estado === 'nueva' ? 'Nueva incidencia' : `Incidencia en ${inc.estado.replace('_', ' ')}`,
      descripcion: `${inc.codigo} - ${inc.activoPrincipalCodigo}`,
      fecha: inc.timestamps.recepcion.toDate(),
      status: inc.criticidad === 'critica' ? 'warning' as const : 'info' as const,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="animate-pulse p-6 space-y-6">
          <div className="h-24 bg-slate-800/50 rounded-none w-full"></div>
          <div className="px-4">
            <div className="h-32 bg-slate-800 rounded-xl w-full mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const disponibilidad = (stats.activos?.total ?? 0) > 0
    ? Math.round(((stats.activos?.operativos ?? 0) / (stats.activos?.total ?? 1)) * 100) || 0
    : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Role-based Header */}
      <RoleDashboardHeader 
        stats={{
          incidenciasAbiertas: stats.incidencias?.abiertas,
          incidenciasCriticas: stats.incidencias?.criticas,
          flotaOperativa: stats.activos?.operativos,
          flotaTotal: stats.activos?.total,
        }}
      />

      {/* Banner de solo lectura para DFG */}
      {isReadOnly && (
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pt-4">
          <ReadOnlyBanner />
        </div>
      )}

      {/* Status Bar Global - Solo para roles de supervisión con permiso */}
      <RequirePermission permission="sla:ver">
        <StatusBar
          flotaOperativa={stats.activos?.operativos ?? 0}
          flotaTotal={stats.activos?.total ?? 0}
          incidenciasCriticas={stats.incidencias?.criticas ?? 0}
          incidenciasAbiertas={stats.incidencias?.abiertas ?? 0}
          enTaller={stats.activos?.enTaller ?? 0}
        />
      </RequirePermission>

      <div className="max-w-[1800px] mx-auto p-4 sm:p-6 space-y-6">
        {/* Quick Actions - Role specific */}
        <RoleQuickActions />

        {/* === KPI GRID PRINCIPAL - Datos en tiempo real desde useDashboardMetrics === */}
        <DashboardKPIGrid />

        {/* Role-specific widgets grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Widget: Mis OTs - para técnicos */}
          {claims?.rol === 'tecnico' && (
            <MisOTsWidget ordenes={[]} />
          )}

          {/* Widget: Técnicos - para jefe_mantenimiento y admin */}
          <RequirePermission permission="tecnicos:ver">
            <TecnicosDisponiblesWidget tecnicos={[]} />
          </RequirePermission>

          {/* Widget: Comparativa Operadores - solo DFG/admin */}
          {canAccessAllTenants && (
            <ComparativaOperadoresWidget operadores={[]} />
          )}

          {/* Widget: Costes - solo si puede ver costes */}
          {canViewCosts && (
            <ResumenCostesWidget
              costesMes={12500}
              costesAcumulado={85000}
              presupuesto={120000}
            />
          )}

          {/* Alertas - visible para quien puede ver incidencias */}
          <RequirePermission permission="incidencias:ver">
            <AlertPanel incidencias={incidenciasAbiertas} maxItems={5} />
          </RequirePermission>

          {/* Preguntas clave del rol */}
          <RoleKeyQuestionsWidget />

          {/* Actividad reciente */}
          <ActivityFeed items={actividadReciente} maxItems={5} />
        </div>

        {/* KPIs principales - Grid industrial (solo para roles con permiso de SLA) */}
        <RequirePermission permission="sla:ver">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiGauge
              label="Incidencias Abiertas"
              value={stats.incidencias?.abiertas ?? 0}
              subtitle={`${stats.incidencias?.criticas ?? 0} críticas`}
              icon={AlertTriangle}
              status={
                (stats.incidencias?.criticas ?? 0) > 0 ? 'danger' :
                (stats.incidencias?.abiertas ?? 0) > 5 ? 'warning' : 'success'
              }
            />

            <KpiGauge
              label="Resueltas Hoy"
              value={stats.incidencias?.resueltasHoy ?? 0}
              subtitle="Tiempo medio: --"
              icon={CheckCircle}
              trend={(stats.incidencias?.resueltasHoy ?? 0) > 0 ? 'up' : 'stable'}
              status="success"
            />

            <KpiGauge
              label="Flota Operativa"
              value={`${stats.activos?.operativos ?? 0}/${stats.activos?.total ?? 0}`}
              subtitle={`${disponibilidad}% disponibilidad`}
              icon={Bus}
              status={
                disponibilidad >= 90 ? 'success' :
                disponibilidad >= 80 ? 'warning' : 'danger'
              }
            />

            <KpiGauge
              label="Preventivo Pendiente"
              value={stats.preventivo?.pendientesProximaSemana ?? 0}
              subtitle="Próximos 7 días"
              icon={Calendar}
              status={
                (stats.preventivo?.pendientesProximaSemana ?? 0) > 5 ? 'warning' : 'neutral'
              }
            />
          </div>
        </RequirePermission>

        {/* Resúmenes detallados - solo para admin/jefe (quien tiene permiso de técnicos) */}
        <RequirePermission permission="tecnicos:ver">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incidencias por estado */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Incidencias por Estado
              </h3>
              <div className="space-y-3">
                {stats.incidencias?.porEstado && Object.entries(stats.incidencias.porEstado).map(([estado, count]) => (
                  <div key={estado} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 capitalize">
                      {estado.replace('_', ' ')}
                    </span>
                    <span className="font-mono font-medium text-white">{count || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventario */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                Estado del Inventario
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Instalados</span>
                  <span className="font-mono font-medium text-green-400">
                    {stats.inventario?.porEstado?.instalado ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">En Almacén</span>
                  <span className="font-mono font-medium text-blue-400">
                    {stats.inventario?.porEstado?.almacen ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">En Reparación</span>
                  <span className="font-mono font-medium text-yellow-400">
                    {stats.inventario?.porEstado?.reparacion ?? 0}
                  </span>
                </div>
                {(stats.inventario?.alertasStockBajo ?? 0) > 0 && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-400">
                      {stats.inventario?.alertasStockBajo} items stock bajo
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Activos */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Bus className="w-4 h-4 text-green-500" />
                Estado de Flota
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-400">Operativos</span>
                  </div>
                  <span className="font-mono font-medium text-green-400">
                    {stats.activos?.operativos ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-slate-400">En Taller</span>
                  </div>
                  <span className="font-mono font-medium text-yellow-400">
                    {stats.activos?.enTaller ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                    <span className="text-sm text-slate-400">Baja</span>
                  </div>
                  <span className="font-mono font-medium text-slate-400">
                    {stats.activos?.baja ?? 0}
                  </span>
                </div>
              </div>
              
              {/* Barra de disponibilidad */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Disponibilidad</span>
                  <span>{disponibilidad}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      disponibilidad >= 90 ? 'bg-green-500' :
                      disponibilidad >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${disponibilidad}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </RequirePermission>
      </div>
    </div>
  );
}
