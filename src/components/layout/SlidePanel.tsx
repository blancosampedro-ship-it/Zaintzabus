'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/index';
import { ROL_LABELS } from '@/types';
import {
  X,
  Bus,
  LayoutDashboard,
  AlertTriangle,
  Package,
  Calendar,
  FileText,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  QrCode,
  Wrench,
  Building2,
  FileSpreadsheet,
  ClipboardList,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

// Acciones rápidas según rol
const quickActions = {
  tecnico: [
    { name: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus },
    { name: 'Buscar equipo', href: '/equipos', icon: Search },
    { name: 'Escanear QR', action: 'scan-qr', icon: QrCode },
  ],
  jefe_mantenimiento: [
    { name: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus },
    { name: 'Asignar técnico', href: '/ordenes-trabajo', icon: Users },
    { name: 'Ver alertas', href: '/dashboard', icon: AlertTriangle },
  ],
  admin: [
    { name: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus },
    { name: 'Gestionar usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
  ],
  dfg: [
    { name: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus },
    { name: 'Ver informes', href: '/informes', icon: FileText },
    { name: 'Contratos', href: '/contratos', icon: FileSpreadsheet },
  ],
  operador: [
    { name: 'Nueva incidencia', href: '/incidencias/nueva', icon: Plus },
    { name: 'Mi flota', href: '/autobuses', icon: Bus },
    { name: 'Ver informes', href: '/informes', icon: FileText },
  ],
};

// Navegación principal por secciones
const navigationSections = [
  {
    title: 'Operaciones',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
      { name: 'Incidencias', href: '/incidencias', icon: AlertTriangle, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'incidencias' },
      { name: 'Órdenes de Trabajo', href: '/ordenes-trabajo', icon: ClipboardList, roles: ['admin', 'dfg', 'jefe_mantenimiento', 'tecnico'] },
      { name: 'Preventivo', href: '/preventivo', icon: Calendar, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'vencidos' },
    ],
  },
  {
    title: 'Activos',
    items: [
      { name: 'Flota / Autobuses', href: '/autobuses', icon: Bus, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
      { name: 'Equipos', href: '/equipos', icon: Wrench, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
      { name: 'Inventario', href: '/inventario', icon: Package, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'stockBajo' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { name: 'Técnicos', href: '/tecnicos', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
      { name: 'Operadores', href: '/admin/operadores', icon: Building2, roles: ['admin', 'dfg'] },
      { name: 'Contratos', href: '/contratos', icon: FileSpreadsheet, roles: ['admin', 'dfg'] },
      { name: 'Facturación', href: '/facturacion', icon: FileText, roles: ['admin', 'dfg'] },
      { name: 'Informes', href: '/informes', icon: FileText, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento'] },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { name: 'Usuarios', href: '/admin/usuarios', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
      { name: 'Sistema', href: '/admin/configuracion', icon: Settings, roles: ['admin'] },
    ],
  },
];

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  badges?: {
    incidencias?: number;
    vencidos?: number;
    stockBajo?: number;
  };
}

export default function SlidePanel({ isOpen, onClose, badges = {} }: SlidePanelProps) {
  const pathname = usePathname();
  const { usuario, claims, signOut } = useAuth();

  const userRole = claims?.rol || 'tecnico';
  const roleQuickActions = quickActions[userRole as keyof typeof quickActions] || quickActions.tecnico;

  const getBadgeCount = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined;
    return badges[badgeKey as keyof typeof badges];
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-xs">
                  <div className="flex h-full flex-col bg-slate-900 shadow-2xl border-r border-slate-700">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                          <Bus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white">ZaintzaBus</h2>
                          <p className="text-xs text-cyan-400 font-medium">Mantenimiento</p>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto py-4">
                      {/* Quick Actions */}
                      <div className="px-4 mb-6">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Acciones rápidas
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {roleQuickActions.map((action) => (
                            'href' in action ? (
                              <Link
                                key={action.name}
                                href={action.href}
                                onClick={handleNavClick}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/50 transition-all group"
                              >
                                <action.icon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                                <span className="text-[10px] text-slate-400 group-hover:text-white text-center leading-tight">
                                  {action.name}
                                </span>
                              </Link>
                            ) : (
                              <button
                                key={action.name}
                                onClick={() => {
                                  // Handle scan QR action
                                  onClose();
                                }}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/50 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/50 transition-all group"
                              >
                                <action.icon className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                                <span className="text-[10px] text-slate-400 group-hover:text-white text-center leading-tight">
                                  {action.name}
                                </span>
                              </button>
                            )
                          ))}
                        </div>
                      </div>

                      {/* Navigation Sections */}
                      {navigationSections.map((section) => {
                        const visibleItems = section.items.filter(
                          (item) => claims?.rol && item.roles.includes(claims.rol)
                        );

                        if (visibleItems.length === 0) return null;

                        return (
                          <div key={section.title} className="px-4 mb-4">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
                              {section.title}
                            </p>
                            <div className="space-y-0.5">
                              {visibleItems.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                const badgeCount = getBadgeCount(item.badge);

                                return (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={handleNavClick}
                                    className={cn(
                                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                                      isActive
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    )}
                                  >
                                    <item.icon className={cn(
                                      'w-5 h-5 flex-shrink-0',
                                      isActive && 'text-cyan-400'
                                    )} />
                                    <span className="flex-1 font-medium text-sm">{item.name}</span>
                                    {badgeCount !== undefined && badgeCount > 0 && (
                                      <span className={cn(
                                        'px-1.5 py-0.5 text-[10px] font-bold rounded',
                                        item.badge === 'incidencias' && 'bg-red-500/20 text-red-400',
                                        item.badge === 'vencidos' && 'bg-amber-500/20 text-amber-400',
                                        item.badge === 'stockBajo' && 'bg-orange-500/20 text-orange-400'
                                      )}>
                                        {badgeCount}
                                      </span>
                                    )}
                                    <ChevronRight className={cn(
                                      'w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity',
                                      isActive && 'opacity-100'
                                    )} />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer - User Info */}
                    <div className="border-t border-slate-700 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {usuario?.nombre?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {usuario?.nombre || 'Usuario'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {claims?.rol ? ROL_LABELS[claims.rol] : 'Sin rol'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href="/ayuda"
                          onClick={handleNavClick}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Ayuda
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Salir
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
