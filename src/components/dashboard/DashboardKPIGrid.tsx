'use client';

import Link from 'next/link';
import {
  Bus,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Wrench,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { useDashboardMetrics, type IncidenciaSLAEnRiesgo } from '@/hooks/useDashboardMetrics';
import { ETIQUETAS_ESTADO_INCIDENCIA, getColorEstadoIncidencia } from '@/lib/logic/estados';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';

// =============================================================================
// TYPES
// =============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  href?: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  loading?: boolean;
}

// =============================================================================
// KPI CARD COMPONENT
// =============================================================================

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor,
  href,
  trend,
  status = 'neutral',
  loading = false,
}: KPICardProps) {
  const statusColors = {
    success: 'border-green-500/30',
    warning: 'border-amber-500/30',
    danger: 'border-red-500/30',
    neutral: 'border-slate-700/50',
  };

  const Content = (
    <div
      className={cn(
        'bg-slate-800/50 rounded-xl border p-5 transition-all',
        statusColors[status],
        href && 'hover:bg-slate-800/70 cursor-pointer group'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {href && (
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
        )}
      </div>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 w-20 bg-slate-700 rounded mb-1" />
          <div className="h-4 w-32 bg-slate-700/50 rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-400 mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={cn(
                  'w-3 h-3',
                  trend.positive ? 'text-green-400' : 'text-red-400 rotate-180'
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  trend.positive ? 'text-green-400' : 'text-red-400'
                )}
              >
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{Content}</Link>;
  }
  return Content;
}

// =============================================================================
// SLA EN RIESGO MEJORADO
// =============================================================================

interface SLAEnRiesgoGridProps {
  incidencias: IncidenciaSLAEnRiesgo[];
  loading?: boolean;
}

function formatTiempoRestante(minutos: number): string {
  if (minutos <= 0) return 'Vencido';
  if (minutos < 60) return `${minutos}m`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
}

export function SLAEnRiesgoGrid({ incidencias, loading }: SLAEnRiesgoGridProps) {
  const { hasPermission } = useAuth();
  
  if (!hasPermission('sla:ver')) return null;

  // Filtrar los que tienen menos de 1 hora
  const urgentes = incidencias.filter(i => i.tiempoRestante < 60);
  const enRiesgo = incidencias.filter(i => i.tiempoRestante >= 60);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-red-500/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500" />
          SLA en Riesgo
        </h3>
        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
          {incidencias.length} total
        </span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-slate-700/30 rounded-lg" />
          ))}
        </div>
      ) : incidencias.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-green-400 font-medium">Todo bajo control</p>
          <p className="text-xs text-slate-500 mt-1">Sin incidencias próximas a vencer</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {/* Urgentes (< 1h) */}
          {urgentes.length > 0 && (
            <>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                🔴 Urgentes (&lt; 1h)
              </p>
              {urgentes.map((inc) => (
                <SLAIncidenciaCard key={inc.id} incidencia={inc} variant="urgent" />
              ))}
            </>
          )}
          
          {/* En riesgo (1-2h) */}
          {enRiesgo.length > 0 && (
            <>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 mt-4">
                🟡 En riesgo (&lt; 2h)
              </p>
              {enRiesgo.map((inc) => (
                <SLAIncidenciaCard key={inc.id} incidencia={inc} variant="warning" />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SLAIncidenciaCardProps {
  incidencia: IncidenciaSLAEnRiesgo;
  variant: 'urgent' | 'warning';
}

function SLAIncidenciaCard({ incidencia, variant }: SLAIncidenciaCardProps) {
  const bgColor = variant === 'urgent' ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-amber-500/10 hover:bg-amber-500/20';
  const etiquetaLabel = ETIQUETAS_ESTADO_INCIDENCIA[incidencia.estado] || incidencia.estado;
  const colorEstado = getColorEstadoIncidencia(incidencia.estado);
  
  // Mapear colores del sistema a variants del Badge
  const badgeVariant = colorEstado === 'success' ? 'success' 
    : colorEstado === 'warning' ? 'warning'
    : colorEstado === 'danger' ? 'destructive'
    : colorEstado === 'info' ? 'info'
    : 'secondary';

  return (
    <Link
      href={`/incidencias/${incidencia.id}`}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-colors group',
        bgColor
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{incidencia.codigo}</p>
          <Badge variant={badgeVariant as any} className="text-[10px] px-1.5 py-0">
            {etiquetaLabel}
          </Badge>
        </div>
        <p className="text-xs text-slate-400 truncate">{incidencia.categoriaFallo}</p>
      </div>
      
      <div className="text-right ml-3 flex-shrink-0">
        <p className={cn(
          'text-sm font-bold',
          variant === 'urgent' ? 'text-red-400' : 'text-amber-400'
        )}>
          {formatTiempoRestante(incidencia.tiempoRestante)}
        </p>
        <p className="text-[10px] text-slate-500">
          {incidencia.criticidad === 'critica' ? '⚡ Crítica' : 'Normal'}
        </p>
      </div>
    </Link>
  );
}

// =============================================================================
// DASHBOARD KPI GRID PRINCIPAL
// =============================================================================

interface DashboardKPIGridProps {
  className?: string;
}

export function DashboardKPIGrid({ className }: DashboardKPIGridProps) {
  const {
    disponibilidadFlota,
    incidenciasActivas,
    incidenciasCriticas,
    cumplimientoSLA,
    flotaTotal,
    flotaOperativa,
    flotaEnTaller,
    flotaDeBaja,
    slaEnRiesgo,
    loading,
    error,
  } = useDashboardMetrics();

  const { hasPermission } = useAuth();

  // Determinar estado de disponibilidad
  const estadoDisponibilidad = disponibilidadFlota >= 95 ? 'success' 
    : disponibilidadFlota >= 85 ? 'warning' 
    : 'danger';

  // Determinar estado de SLA
  const estadoSLA = cumplimientoSLA >= 95 ? 'success' 
    : cumplimientoSLA >= 85 ? 'warning' 
    : 'danger';

  // Determinar estado de incidencias
  const estadoIncidencias = incidenciasCriticas === 0 ? 'success' 
    : incidenciasCriticas <= 2 ? 'warning' 
    : 'danger';

  if (error) {
    return (
      <div className={cn("bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400", className)}>
        <AlertTriangle className="w-5 h-5 inline-block mr-2" />
        Error al cargar métricas: {error}
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Grid principal de 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Disponibilidad de Flota */}
        <KPICard
          title="Disponibilidad Flota"
          value={`${disponibilidadFlota}%`}
          subtitle={`${flotaOperativa} de ${flotaTotal} operativos`}
          icon={Bus}
          iconColor="text-green-400"
          bgColor="bg-green-500/10"
          href="/autobuses"
          status={estadoDisponibilidad}
          loading={loading}
        />

        {/* 2. Incidencias Activas */}
        <KPICard
          title="Incidencias Activas"
          value={incidenciasActivas}
          subtitle={incidenciasCriticas > 0 ? `${incidenciasCriticas} críticas` : 'Sin críticas'}
          icon={AlertTriangle}
          iconColor={incidenciasCriticas > 0 ? 'text-red-400' : 'text-amber-400'}
          bgColor={incidenciasCriticas > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}
          href="/incidencias?estado=activas"
          status={estadoIncidencias}
          loading={loading}
        />

        {/* 3. Cumplimiento SLA */}
        {hasPermission('sla:ver') && (
          <KPICard
            title="Cumplimiento SLA"
            value={`${cumplimientoSLA}%`}
            subtitle={slaEnRiesgo.length > 0 ? `${slaEnRiesgo.length} en riesgo` : 'Todo dentro de SLA'}
            icon={Activity}
            iconColor="text-cyan-400"
            bgColor="bg-cyan-500/10"
            href="/informes"
            status={estadoSLA}
            loading={loading}
          />
        )}

        {/* 4. En Taller */}
        <KPICard
          title="En Taller"
          value={flotaEnTaller}
          subtitle={flotaDeBaja > 0 ? `+ ${flotaDeBaja} de baja` : 'Autobuses en mantenimiento'}
          icon={Wrench}
          iconColor="text-amber-400"
          bgColor="bg-amber-500/10"
          href="/autobuses?estado=en_taller"
          status={flotaEnTaller > 5 ? 'warning' : 'neutral'}
          loading={loading}
        />
      </div>

      {/* Widget de SLA en Riesgo (si hay permisos y datos) */}
      {hasPermission('sla:ver') && slaEnRiesgo.length > 0 && (
        <SLAEnRiesgoGrid incidencias={slaEnRiesgo} loading={loading} />
      )}
    </div>
  );
}

export default DashboardKPIGrid;
