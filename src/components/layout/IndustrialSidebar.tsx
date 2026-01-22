'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/index';
import { ROL_LABELS } from '@/types';
import LurraldebusIcon from '@/components/ui/LurraldebusIcon';
import {
  LayoutDashboard,
  AlertTriangle,
  Package,
  Bus,
  Calendar,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Incidencias', href: '/incidencias', icon: AlertTriangle, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'incidencias' },
  { name: 'Activos', href: '/activos', icon: Bus, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Preventivo', href: '/preventivo', icon: Calendar, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'vencidos' },
  { name: 'Inventario', href: '/inventario', icon: Package, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'], badge: 'stockBajo' },
  { name: 'Informes', href: '/informes', icon: FileText, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento'] },
];

const adminNavigation = [
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
];

interface IndustrialSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  badges?: {
    incidencias?: number;
    vencidos?: number;
    stockBajo?: number;
  };
}

export default function IndustrialSidebar({ collapsed, onCollapsedChange, badges = {} }: IndustrialSidebarProps) {
  const pathname = usePathname();
  const { usuario, claims, signOut } = useAuth();

  const filteredNavigation = navigation.filter((item) =>
    claims?.rol ? item.roles.includes(claims.rol) : false
  );

  const filteredAdminNav = adminNavigation.filter((item) =>
    claims?.rol ? item.roles.includes(claims.rol) : false
  );

  const getBadgeCount = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined;
    return badges[badgeKey as keyof typeof badges];
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 border-r border-slate-700 transition-all duration-300 z-40',
        collapsed ? 'lg:w-16' : 'lg:w-56'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-slate-700 h-14',
        collapsed ? 'justify-center px-2' : 'gap-2 px-3'
      )}>
        {collapsed ? (
          <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <LurraldebusIcon size={26} />
          </div>
        ) : (
          <Image
            src="/logo-lurraldebus.png"
            alt="Lurraldebus"
            width={130}
            height={40}
            className="brightness-0 invert"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className={cn('space-y-1', collapsed ? 'px-2' : 'px-3')}>
          {/* Sección principal */}
          {!collapsed && (
            <p className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Operaciones
            </p>
          )}
          
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const badgeCount = getBadgeCount(item.badge);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'group flex items-center rounded-lg transition-all relative',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive && 'text-cyan-400'
                )} />
                {!collapsed && (
                  <>
                    <span className="font-medium text-sm flex-1">{item.name}</span>
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
                  </>
                )}
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r" />
                )}
                {/* Badge dot for collapsed */}
                {collapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
            );
          })}

          {/* Sección admin */}
          {filteredAdminNav.length > 0 && (
            <>
              {!collapsed && (
                <p className="px-3 py-2 mt-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Administración
                </p>
              )}
              {collapsed && <div className="h-4" />}
              {filteredAdminNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={cn(
                      'group flex items-center rounded-lg transition-all relative',
                      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive && 'text-cyan-400'
                    )} />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.name}</span>
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r" />
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </nav>

      {/* Bottom section */}
      <div className={cn('border-t border-slate-700', collapsed ? 'p-2' : 'p-3')}>
        {/* Collapse toggle */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={cn(
            'w-full flex items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors mb-2',
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Colapsar</span>
            </>
          )}
        </button>

        {/* User */}
        <div className={cn(
          'flex items-center rounded-lg bg-slate-800/50',
          collapsed ? 'justify-center p-2' : 'gap-3 p-2'
        )}>
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {usuario?.nombre?.[0]}{usuario?.apellidos?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {usuario?.nombre}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {claims?.rol ? ROL_LABELS[claims.rol] : ''}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={cn(
            'w-full flex items-center rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-2',
            collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
