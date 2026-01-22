'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/index';
import { useAuth } from '@/contexts/AuthContext';
import {
  LucideIcon,
  Plus,
  List,
  Grid,
  Calendar,
  BarChart2,
  Filter,
  Download,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Wrench,
  Users,
  FileText,
  Package,
  Bus,
  Kanban,
  Table,
  LayoutGrid,
  CalendarDays,
  History,
  Zap,
  Activity,
  QrCode,
} from 'lucide-react';

// Tipos de vistas disponibles
type ViewType = 'list' | 'grid' | 'kanban' | 'calendar' | 'timeline' | 'table';

interface NavAction {
  label: string;
  href?: string;
  icon: LucideIcon;
  onClick?: () => void;
  primary?: boolean;
  roles?: string[];
}

interface NavTab {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  roles?: string[];
}

interface NavFilter {
  label: string;
  value: string;
  active?: boolean;
}

interface ContextualNavConfig {
  tabs?: NavTab[];
  actions?: NavAction[];
  filters?: NavFilter[];
  views?: ViewType[];
  showBreadcrumb?: boolean;
}

// Configuración por ruta base
const routeConfigs: Record<string, ContextualNavConfig> = {
  '/incidencias': {
    tabs: [
      { label: 'Todas', href: '/incidencias', icon: List },
      { label: 'Pendientes', href: '/incidencias?estado=pendiente', icon: Clock },
      { label: 'En curso', href: '/incidencias?estado=en_curso', icon: Zap },
      { label: 'Resueltas', href: '/incidencias?estado=resuelta', icon: CheckCircle },
    ],
    actions: [
      { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus, primary: true },
      { label: 'Exportar', href: '#', icon: Download, roles: ['admin', 'dfg', 'jefe_mantenimiento'] },
    ],
    views: ['kanban', 'list', 'table'],
  },
  '/autobuses': {
    tabs: [
      { label: 'Todos', href: '/autobuses', icon: Grid },
      { label: 'Operativos', href: '/autobuses?estado=operativo', icon: CheckCircle },
      { label: 'En taller', href: '/autobuses?estado=en_taller', icon: Wrench },
      { label: 'Instalación', href: '/instalacion', icon: Settings },
    ],
    actions: [
      { label: 'Nuevo autobús', href: '/autobuses/nuevo', icon: Plus, primary: true, roles: ['admin', 'dfg'] },
      { label: 'Escanear QR', href: '#', icon: QrCode },
    ],
    views: ['grid', 'list', 'table'],
  },
  '/equipos': {
    tabs: [
      { label: 'Todos', href: '/equipos', icon: Grid },
      { label: 'Activos', href: '/equipos?estado=activo', icon: CheckCircle },
      { label: 'En reparación', href: '/equipos?estado=reparacion', icon: Wrench },
      { label: 'Baja', href: '/equipos?estado=baja', icon: XCircle },
    ],
    actions: [
      { label: 'Nuevo equipo', href: '/equipos/nuevo', icon: Plus, primary: true, roles: ['admin', 'dfg', 'jefe_mantenimiento'] },
    ],
    views: ['grid', 'list', 'table'],
  },
  '/preventivo': {
    tabs: [
      { label: 'Calendario', href: '/preventivo', icon: CalendarDays },
      { label: 'Pendientes', href: '/preventivo?estado=pendiente', icon: Clock },
      { label: 'Vencidos', href: '/preventivo?estado=vencido', icon: AlertTriangle },
      { label: 'Historial', href: '/preventivo?estado=completado', icon: History },
    ],
    actions: [
      { label: 'Nueva tarea', href: '/preventivo/nuevo', icon: Plus, primary: true, roles: ['admin', 'jefe_mantenimiento'] },
    ],
    views: ['calendar', 'timeline', 'list'],
  },
  '/ordenes-trabajo': {
    tabs: [
      { label: 'Todas', href: '/ordenes-trabajo', icon: List },
      { label: 'Sin asignar', href: '/ordenes-trabajo?estado=sin_asignar', icon: Users },
      { label: 'En progreso', href: '/ordenes-trabajo?estado=en_progreso', icon: Zap },
      { label: 'Completadas', href: '/ordenes-trabajo?estado=completada', icon: CheckCircle },
    ],
    actions: [
      { label: 'Nueva OT', href: '/ordenes-trabajo/nueva', icon: Plus, primary: true, roles: ['admin', 'jefe_mantenimiento'] },
      { label: 'Asignar técnicos', href: '#', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
    ],
    views: ['kanban', 'list', 'table'],
  },
  '/inventario': {
    tabs: [
      { label: 'Todos', href: '/inventario', icon: Package },
      { label: 'Stock bajo', href: '/inventario?stock=bajo', icon: AlertTriangle },
      { label: 'Pedidos pendientes', href: '/inventario?pedidos=pendiente', icon: Clock },
    ],
    actions: [
      { label: 'Nuevo artículo', href: '/inventario/nuevo', icon: Plus, primary: true, roles: ['admin', 'jefe_mantenimiento'] },
      { label: 'Entrada stock', href: '/inventario/entrada', icon: Package, roles: ['admin', 'jefe_mantenimiento', 'tecnico'] },
    ],
    views: ['table', 'grid'],
  },
  '/informes': {
    tabs: [
      { label: 'Dashboard', href: '/informes', icon: BarChart2 },
      { label: 'KPIs', href: '/informes/kpis', icon: Activity },
      { label: 'Histórico', href: '/informes/historico', icon: History },
    ],
    actions: [
      { label: 'Generar informe', href: '/informes/generar', icon: FileText, roles: ['admin', 'dfg', 'jefe_mantenimiento'] },
      { label: 'Exportar', href: '#', icon: Download },
    ],
  },
  '/contratos': {
    tabs: [
      { label: 'Todos', href: '/contratos', icon: List },
      { label: 'Activos', href: '/contratos?estado=activo', icon: CheckCircle },
      { label: 'Por renovar', href: '/contratos?estado=por_renovar', icon: Clock },
    ],
    actions: [
      { label: 'Nuevo contrato', href: '/contratos/nuevo', icon: Plus, primary: true, roles: ['admin', 'dfg'] },
    ],
    views: ['table', 'list'],
  },
  '/facturacion': {
    tabs: [
      { label: 'Resumen', href: '/facturacion', icon: BarChart2 },
      { label: 'Facturas', href: '/facturacion/facturas', icon: FileText },
      { label: 'Pendientes', href: '/facturacion?estado=pendiente', icon: Clock },
    ],
    actions: [
      { label: 'Nueva factura', href: '/facturacion/nueva', icon: Plus, primary: true, roles: ['admin', 'dfg'] },
      { label: 'Exportar', href: '#', icon: Download },
    ],
  },
  '/tecnicos': {
    tabs: [
      { label: 'Todos', href: '/tecnicos', icon: Users },
      { label: 'Disponibles', href: '/tecnicos?disponibilidad=disponible', icon: CheckCircle },
      { label: 'Ocupados', href: '/tecnicos?disponibilidad=ocupado', icon: Zap },
    ],
    actions: [
      { label: 'Nuevo técnico', href: '/tecnicos/nuevo', icon: Plus, primary: true, roles: ['admin', 'jefe_mantenimiento'] },
    ],
    views: ['grid', 'table'],
  },
};

// Mapeo de iconos de vista
const viewIcons: Record<ViewType, LucideIcon> = {
  list: List,
  grid: LayoutGrid,
  kanban: Kanban,
  calendar: CalendarDays,
  timeline: History,
  table: Table,
};

const viewLabels: Record<ViewType, string> = {
  list: 'Lista',
  grid: 'Cuadrícula',
  kanban: 'Kanban',
  calendar: 'Calendario',
  timeline: 'Línea de tiempo',
  table: 'Tabla',
};

interface ContextualNavProps {
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
  badges?: Record<string, number>;
  className?: string;
}

export default function ContextualNav({ 
  currentView = 'list', 
  onViewChange,
  badges = {},
  className,
}: ContextualNavProps) {
  const pathname = usePathname();
  const { claims } = useAuth();

  // Get config for current route
  const config = useMemo(() => {
    // Find exact match or base route match
    const baseRoute = '/' + pathname.split('/')[1];
    return routeConfigs[pathname] || routeConfigs[baseRoute];
  }, [pathname]);

  // Filter items by role
  const filterByRole = <T extends { roles?: string[] }>(items: T[]): T[] => {
    return items.filter(item => {
      if (!item.roles) return true;
      return claims?.rol && item.roles.includes(claims.rol);
    });
  };

  if (!config) return null;

  const { tabs, actions, views } = config;
  const filteredTabs = tabs ? filterByRole(tabs) : [];
  const filteredActions = actions ? filterByRole(actions) : [];

  return (
    <div className={cn(
      'bg-slate-800/50 border-b border-slate-700/50 sticky top-16 z-30',
      className
    )}>
      <div className="max-w-[1800px] mx-auto px-4">
        <div className="flex items-center justify-between h-12 gap-4">
          {/* Tabs/Navigation */}
          {filteredTabs.length > 0 && (
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
              {filteredTabs.map((tab) => {
                const isActive = pathname === tab.href || 
                  (tab.href.includes('?') && pathname + window?.location?.search === tab.href);
                const Icon = tab.icon;
                
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">
                        {tab.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side: View toggles + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggles */}
            {views && views.length > 1 && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {views.map((view) => {
                  const Icon = viewIcons[view];
                  const isActive = currentView === view;
                  
                  return (
                    <button
                      key={view}
                      onClick={() => onViewChange?.(view)}
                      title={viewLabels[view]}
                      className={cn(
                        'p-1.5 rounded-md transition-all',
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-slate-500 hover:text-white hover:bg-slate-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            {views && views.length > 1 && filteredActions.length > 0 && (
              <div className="hidden sm:block h-6 w-px bg-slate-700" />
            )}

            {/* Actions */}
            {filteredActions.map((action, index) => {
              const Icon = action.icon;
              const isPrimary = action.primary;
              
              if (action.href) {
                return (
                  <Link
                    key={index}
                    href={action.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      isPrimary
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Link>
                );
              }
              
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    isPrimary
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para usar la configuración de ruta
export function useContextualNavConfig() {
  const pathname = usePathname();
  const baseRoute = '/' + pathname.split('/')[1];
  return routeConfigs[pathname] || routeConfigs[baseRoute] || null;
}

// Componente wrapper para páginas
interface PageWithContextualNavProps {
  children: React.ReactNode;
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

export function PageWithContextualNav({ 
  children, 
  currentView, 
  onViewChange 
}: PageWithContextualNavProps) {
  return (
    <>
      <ContextualNav currentView={currentView} onViewChange={onViewChange} />
      {children}
    </>
  );
}
