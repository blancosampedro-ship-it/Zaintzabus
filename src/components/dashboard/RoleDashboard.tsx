'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/lib/permissions';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  Bus,
  Calendar,
  Package,
  Wrench,
  Clock,
  Users,
  FileText,
  TrendingUp,
  MapPin,
  Zap,
  ClipboardList,
  BarChart2,
  ArrowRight,
  Activity,
  Shield,
  Eye,
  DollarSign,
  Target,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils/index';
import { ROL_LABELS, ROL_COLORS, Rol } from '@/types';
import { ROLE_KEY_QUESTIONS, RoleKey } from '@/lib/permissions/types';

// Widget types for different roles
interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description?: string;
}

interface StatCard {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  href?: string;
}

// Quick actions per role
const roleQuickActions: Record<string, QuickAction[]> = {
  tecnico: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' },
    { label: 'Mis OTs asignadas', href: '/ordenes-trabajo?asignado=me', icon: ClipboardList, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30' },
    { label: 'Buscar equipo', href: '/equipos', icon: Wrench, color: 'text-purple-500', bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30' },
    { label: 'Ver inventario', href: '/inventario', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' },
  ],
  jefe_mantenimiento: [
    { label: 'Asignar técnico', href: '/ordenes-trabajo?estado=sin_asignar', icon: Users, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30' },
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' },
    { label: 'Preventivo hoy', href: '/preventivo?fecha=hoy', icon: Calendar, color: 'text-purple-500', bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30' },
    { label: 'Stock bajo', href: '/inventario?stock=bajo', icon: Package, color: 'text-amber-500', bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30' },
  ],
  admin: [
    { label: 'Gestionar usuarios', href: '/admin/usuarios', icon: Users, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30' },
    { label: 'Informes SLA', href: '/informes', icon: BarChart2, color: 'text-green-500', bgColor: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30' },
    { label: 'Contratos', href: '/contratos', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' },
    { label: 'Facturación', href: '/facturacion', icon: TrendingUp, color: 'text-purple-500', bgColor: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30' },
  ],
  dfg: [
    { label: 'Ver incidencias', href: '/incidencias', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' },
    { label: 'Estado flota', href: '/autobuses', icon: Bus, color: 'text-green-500', bgColor: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30' },
    { label: 'Informes SLA', href: '/informes', icon: BarChart2, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30' },
    { label: 'Contratos', href: '/contratos', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30' },
  ],
  operador: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30' },
    { label: 'Mi flota', href: '/autobuses', icon: Bus, color: 'text-green-500', bgColor: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30' },
    { label: 'Ver informes', href: '/informes', icon: BarChart2, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30' },
    { label: 'Incidencias activas', href: '/incidencias?estado=activas', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30' },
  ],
};

// Role-specific titles and descriptions
const roleTitles: Record<string, { title: string; subtitle: string; icon: typeof Shield }> = {
  tecnico: { 
    title: 'Panel de Técnico', 
    subtitle: 'Gestiona tus órdenes de trabajo y reporta incidencias',
    icon: Wrench,
  },
  jefe_mantenimiento: { 
    title: 'Centro de Control', 
    subtitle: 'Supervisión del equipo y gestión de mantenimiento',
    icon: Users,
  },
  admin: { 
    title: 'Panel de Administración', 
    subtitle: 'Gestión completa del sistema',
    icon: Shield,
  },
  dfg: { 
    title: 'Panel de Fiscalización', 
    subtitle: 'Supervisión del cumplimiento contractual y SLAs',
    icon: Building2,
  },
  operador: { 
    title: 'Mi Flota', 
    subtitle: 'Estado y disponibilidad de tus autobuses',
    icon: Bus,
  },
};

// Widgets que muestra cada rol
const roleWidgets: Record<string, string[]> = {
  tecnico: ['mis_ots', 'incidencias_urgentes', 'preventivo_hoy'],
  jefe_mantenimiento: ['resumen_operaciones', 'tecnicos_disponibles', 'alertas_criticas', 'preventivo_semana'],
  admin: ['kpis_globales', 'alertas_sistema', 'facturacion_mes', 'usuarios_activos'],
  dfg: ['estado_flota', 'incidencias_activas', 'cumplimiento_sla', 'proximas_visitas'],
  operador: ['estado_flota', 'incidencias_activas', 'cumplimiento_sla'],
};

// Props for the dashboard header
interface RoleDashboardHeaderProps {
  stats?: {
    incidenciasAbiertas?: number;
    incidenciasCriticas?: number;
    flotaOperativa?: number;
    flotaTotal?: number;
  };
}

export function RoleDashboardHeader({ stats }: RoleDashboardHeaderProps) {
  const { claims, usuario, isReadOnly, canViewSLAPenalties } = useAuth();
  const rol = claims?.rol || 'tecnico';
  const titleConfig = roleTitles[rol] || roleTitles.tecnico;
  const roleColors = ROL_COLORS[rol as Rol] || ROL_COLORS.tecnico;
  const IconComponent = titleConfig.icon;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-b border-slate-700/50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              roleColors.bg,
              "border",
              roleColors.border
            )}>
              <IconComponent className={cn("w-6 h-6", roleColors.text)} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{titleConfig.title}</h1>
              <p className="text-slate-400 mt-1">{titleConfig.subtitle}</p>
              {isReadOnly && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400">Modo solo lectura</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick status badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {stats?.incidenciasCriticas !== undefined && stats.incidenciasCriticas > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{stats.incidenciasCriticas} críticas</span>
              </div>
            )}
            {stats?.flotaOperativa !== undefined && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                <Bus className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  {stats.flotaOperativa}/{stats.flotaTotal || 0} operativos
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick actions grid
export function RoleQuickActions() {
  const { claims } = useAuth();
  const rol = claims?.rol || 'tecnico';
  const actions = roleQuickActions[rol] || roleQuickActions.tecnico;

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Acciones rápidas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'flex flex-col items-center p-4 rounded-xl border transition-all group',
              action.bgColor
            )}
          >
            <action.icon className={cn('w-7 h-7 mb-2 group-hover:scale-110 transition-transform', action.color)} />
            <span className="text-sm font-medium text-white text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Widget: Mis OTs (para técnicos)
interface MisOTsWidgetProps {
  ordenes?: Array<{
    id: string;
    codigo: string;
    descripcion: string;
    prioridad: string;
    activoCodigo: string;
  }>;
}

export function MisOTsWidget({ ordenes = [] }: MisOTsWidgetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-cyan-500" />
          Mis Órdenes de Trabajo
        </h3>
        <Link href="/ordenes-trabajo?asignado=me" className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      
      {ordenes.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tienes OTs asignadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenes.slice(0, 4).map((ot) => (
            <Link
              key={ot.id}
              href={`/ordenes-trabajo/${ot.id}`}
              className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors group"
            >
              <div className={cn(
                'w-2 h-2 rounded-full',
                ot.prioridad === 'alta' ? 'bg-red-500' :
                ot.prioridad === 'media' ? 'bg-amber-500' : 'bg-green-500'
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{ot.codigo}</p>
                <p className="text-xs text-slate-400 truncate">{ot.activoCodigo} - {ot.descripcion}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Widget: Técnicos Disponibles (para jefe_mantenimiento)
interface TecnicosDisponiblesWidgetProps {
  tecnicos?: Array<{
    id: string;
    nombre: string;
    estado: 'disponible' | 'ocupado' | 'ausente';
    otsActivas: number;
  }>;
}

export function TecnicosDisponiblesWidget({ tecnicos = [] }: TecnicosDisponiblesWidgetProps) {
  const disponibles = tecnicos.filter(t => t.estado === 'disponible').length;
  const ocupados = tecnicos.filter(t => t.estado === 'ocupado').length;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-500" />
          Equipo Técnico
        </h3>
        <Link href="/tecnicos" className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
          Gestionar <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <p className="text-2xl font-bold text-green-400">{disponibles}</p>
          <p className="text-xs text-green-400/70">Disponibles</p>
        </div>
        <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-2xl font-bold text-amber-400">{ocupados}</p>
          <p className="text-xs text-amber-400/70">Ocupados</p>
        </div>
      </div>

      {tecnicos.length > 0 && (
        <div className="space-y-2">
          {tecnicos.slice(0, 3).map((tecnico) => (
            <div key={tecnico.id} className="flex items-center justify-between p-2 bg-slate-700/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  tecnico.estado === 'disponible' ? 'bg-green-500' :
                  tecnico.estado === 'ocupado' ? 'bg-amber-500' : 'bg-slate-500'
                )} />
                <span className="text-sm text-white">{tecnico.nombre}</span>
              </div>
              <span className="text-xs text-slate-400">{tecnico.otsActivas} OTs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Widget: Estado de Flota (para operador/dfg)
interface EstadoFlotaWidgetProps {
  operativos?: number;
  enTaller?: number;
  total?: number;
}

export function EstadoFlotaWidget({ operativos = 0, enTaller = 0, total = 0 }: EstadoFlotaWidgetProps) {
  const safeOperativos = operativos ?? 0;
  const safeTotal = total ?? 0;
  const disponibilidad = safeTotal > 0 ? Math.round((safeOperativos / safeTotal) * 100) : 0;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bus className="w-5 h-5 text-green-500" />
          Estado de Flota
        </h3>
        <Link href="/autobuses" className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
          Ver flota <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Disponibilidad gauge */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64" cy="64" r="56"
            className="fill-none stroke-slate-700 stroke-[8]"
          />
          <circle
            cx="64" cy="64" r="56"
            className={cn(
              'fill-none stroke-[8] transition-all duration-500',
              disponibilidad >= 90 ? 'stroke-green-500' :
              disponibilidad >= 80 ? 'stroke-amber-500' : 'stroke-red-500'
            )}
            strokeLinecap="round"
            strokeDasharray={`${(disponibilidad / 100) * 351.86} 351.86`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{disponibilidad}%</span>
          <span className="text-xs text-slate-400">disponibilidad</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <p className="text-lg font-bold text-green-400">{operativos ?? 0}</p>
          <p className="text-[10px] text-green-400/70">Operativos</p>
        </div>
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <p className="text-lg font-bold text-amber-400">{enTaller ?? 0}</p>
          <p className="text-[10px] text-amber-400/70">En taller</p>
        </div>
        <div className="p-2 bg-slate-500/10 rounded-lg">
          <p className="text-lg font-bold text-slate-400">{Math.max(0, (total ?? 0) - (operativos ?? 0) - (enTaller ?? 0))}</p>
          <p className="text-[10px] text-slate-400/70">Otros</p>
        </div>
      </div>
    </div>
  );
}

// Widget: Cumplimiento SLA (para dfg/operador)
interface CumplimientoSLAWidgetProps {
  porcentaje?: number;
  incidenciasTotales?: number;
  dentroDeSLA?: number;
}

export function CumplimientoSLAWidget({ porcentaje = 0, incidenciasTotales = 0, dentroDeSLA = 0 }: CumplimientoSLAWidgetProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-500" />
          Cumplimiento SLA
        </h3>
        <Link href="/informes" className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
          Ver informes <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="text-center mb-4">
        <p className={cn(
          'text-4xl font-bold',
          porcentaje >= 95 ? 'text-green-400' :
          porcentaje >= 85 ? 'text-amber-400' : 'text-red-400'
        )}>
          {porcentaje}%
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {dentroDeSLA} de {incidenciasTotales} incidencias dentro de SLA
        </p>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            porcentaje >= 95 ? 'bg-green-500' :
            porcentaje >= 85 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

// Hook para obtener widgets según el rol
export function useRoleWidgets() {
  const { claims } = useAuth();
  const rol = claims?.rol || 'tecnico';
  return roleWidgets[rol] || roleWidgets.tecnico;
}

// ============================================
// WIDGETS ADICIONALES ESPECÍFICOS POR ROL
// ============================================

// Widget: Preguntas Clave del Rol
interface RoleKeyQuestionsWidgetProps {
  className?: string;
}

export function RoleKeyQuestionsWidget({ className }: RoleKeyQuestionsWidgetProps) {
  const { claims } = useAuth();
  const rol = (claims?.rol as RoleKey) || 'tecnico';
  const questions = ROLE_KEY_QUESTIONS[rol] || [];

  return (
    <div className={cn("bg-slate-800/30 rounded-xl border border-slate-700/50 p-5", className)}>
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-purple-500" />
        ¿Qué necesitas saber?
      </h3>
      <ul className="space-y-2">
        {questions.slice(0, 5).map((question, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="text-purple-400 mt-0.5">•</span>
            <span className="text-slate-300">{question}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Widget: SLA en Riesgo (para jefe_mantenimiento y admin)
interface SLAEnRiesgoWidgetProps {
  incidencias?: Array<{
    id: string;
    codigo: string;
    tiempoRestante: number; // minutos
    criticidad: string;
  }>;
}

export function SLAEnRiesgoWidget({ incidencias = [] }: SLAEnRiesgoWidgetProps) {
  const { hasPermission } = useAuth();
  
  if (!hasPermission('sla:ver')) return null;

  const enRiesgo = incidencias.filter(i => i.tiempoRestante < 60); // menos de 1 hora

  return (
    <div className="bg-slate-800/50 rounded-xl border border-red-500/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500" />
          SLA en Riesgo
        </h3>
        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
          {enRiesgo.length} urgentes
        </span>
      </div>

      {enRiesgo.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-green-400">Todo bajo control</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enRiesgo.slice(0, 4).map((inc) => (
            <Link
              key={inc.id}
              href={`/incidencias/${inc.id}`}
              className="flex items-center justify-between p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white">{inc.codigo}</p>
                <p className="text-xs text-red-400">{inc.criticidad}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-400">{inc.tiempoRestante}m</p>
                <p className="text-[10px] text-slate-500">restantes</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Widget: Resumen Costes (solo para roles que pueden ver costes)
interface ResumenCostesWidgetProps {
  costesMes?: number;
  costesAcumulado?: number;
  presupuesto?: number;
}

export function ResumenCostesWidget({ costesMes = 0, costesAcumulado = 0, presupuesto = 0 }: ResumenCostesWidgetProps) {
  const { canViewCosts } = useAuth();
  
  if (!canViewCosts) return null;

  const porcentajePresupuesto = presupuesto > 0 ? Math.round((costesAcumulado / presupuesto) * 100) : 0;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Costes de Mantenimiento
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Este mes</span>
            <span className="text-white font-medium">{costesMes.toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-400">Acumulado anual</span>
            <span className="text-white font-medium">{costesAcumulado.toLocaleString('es-ES')} €</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                porcentajePresupuesto < 70 ? 'bg-green-500' :
                porcentajePresupuesto < 90 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(porcentajePresupuesto, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {porcentajePresupuesto}% del presupuesto ({presupuesto.toLocaleString('es-ES')} €)
          </p>
        </div>
      </div>
    </div>
  );
}

// Widget: Comparativa Operadores (solo para DFG)
interface ComparativaOperadoresWidgetProps {
  operadores?: Array<{
    id: string;
    nombre: string;
    disponibilidad: number;
    cumplimientoSLA: number;
    incidenciasAbiertas: number;
  }>;
}

export function ComparativaOperadoresWidget({ operadores = [] }: ComparativaOperadoresWidgetProps) {
  const { canAccessAllTenants } = useAuth();
  
  if (!canAccessAllTenants) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          Comparativa Operadores
        </h3>
        <Link href="/admin/operadores" className="text-cyan-400 text-sm hover:underline flex items-center gap-1">
          Ver todos <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {operadores.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Sin datos de operadores</p>
      ) : (
        <div className="space-y-3">
          {operadores.slice(0, 4).map((op) => (
            <div key={op.id} className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{op.nombre}</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  op.cumplimientoSLA >= 95 ? "bg-green-500/20 text-green-400" :
                  op.cumplimientoSLA >= 85 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                )}>
                  SLA {op.cumplimientoSLA}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Disponibilidad:</span>
                  <span className="ml-1 text-slate-300">{op.disponibilidad}%</span>
                </div>
                <div>
                  <span className="text-slate-500">Inc. abiertas:</span>
                  <span className="ml-1 text-slate-300">{op.incidenciasAbiertas}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Widget: Actividad Reciente (genérico, filtrado por permisos)
interface ActividadRecienteWidgetProps {
  actividades?: Array<{
    id: string;
    tipo: 'incidencia' | 'ot' | 'preventivo' | 'inventario';
    descripcion: string;
    fecha: Date;
    usuario: string;
  }>;
}

export function ActividadRecienteWidget({ actividades = [] }: ActividadRecienteWidgetProps) {
  const tipoIcons = {
    incidencia: AlertTriangle,
    ot: ClipboardList,
    preventivo: Calendar,
    inventario: Package,
  };

  const tipoColors = {
    incidencia: 'text-red-400',
    ot: 'text-cyan-400',
    preventivo: 'text-purple-400',
    inventario: 'text-amber-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-cyan-500" />
        Actividad Reciente
      </h3>

      {actividades.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Sin actividad reciente</p>
      ) : (
        <div className="space-y-3">
          {actividades.slice(0, 5).map((act) => {
            const IconComponent = tipoIcons[act.tipo];
            return (
              <div key={act.id} className="flex items-start gap-3">
                <IconComponent className={cn("w-4 h-4 mt-0.5", tipoColors[act.tipo])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{act.descripcion}</p>
                  <p className="text-xs text-slate-500">
                    {act.usuario} • {act.fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
