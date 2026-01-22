'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/index';
import { ROL_LABELS } from '@/types';
import {
  LayoutDashboard,
  AlertTriangle,
  Package,
  Bus,
  Calendar,
  FileText,
  Users,
  LogOut,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Incidencias', href: '/incidencias', icon: AlertTriangle, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Activos', href: '/activos', icon: Bus, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Preventivo', href: '/preventivo', icon: Calendar, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Inventario', href: '/inventario', icon: Package, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Informes', href: '/informes', icon: FileText, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento'] },
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { usuario, claims, signOut } = useAuth();

  const filteredNavigation = navigation.filter((item) =>
    claims?.rol ? item.roles.includes(claims.rol) : false
  );

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu panel */}
      <div className="absolute inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">ZaintzaBus</h1>
              <p className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase">Mantenimiento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5',
                    isActive && 'text-cyan-400'
                  )} />
                  <span className="font-medium text-sm">{item.name}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-700 p-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {usuario?.nombre?.[0]}{usuario?.apellidos?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {usuario?.nombre} {usuario?.apellidos}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {claims?.rol ? ROL_LABELS[claims.rol] : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              signOut();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
