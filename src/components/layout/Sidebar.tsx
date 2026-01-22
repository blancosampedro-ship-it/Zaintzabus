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
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Incidencias', href: '/incidencias', icon: AlertTriangle, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Inventario', href: '/inventario', icon: Package, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Activos', href: '/activos', icon: Bus, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Preventivo', href: '/preventivo', icon: Calendar, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'] },
  { name: 'Informes', href: '/informes', icon: FileText, roles: ['admin', 'dfg', 'operador', 'jefe_mantenimiento'] },
  { name: 'Usuarios', href: '/admin/usuarios', icon: Users, roles: ['admin', 'jefe_mantenimiento'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, claims, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const filteredNavigation = navigation.filter((item) =>
    claims?.rol ? item.roles.includes(claims.rol) : false
  );

  const NavLinks = () => (
    <>
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-lurraldebus-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-10 h-10 bg-lurraldebus-primary rounded-lg flex items-center justify-center">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">ZaintzaBus</h1>
            <p className="text-xs text-gray-500">Mantenimiento</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-lurraldebus-primary rounded-full flex items-center justify-center text-white font-medium">
                {usuario?.nombre?.[0]}{usuario?.apellidos?.[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {usuario?.nombre} {usuario?.apellidos}
                </p>
                <p className="text-xs text-gray-500">
                  {claims?.rol ? ROL_LABELS[claims.rol] : ''}
                </p>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-lurraldebus-primary rounded-lg flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">ZaintzaBus</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <NavLinks />
            <hr className="my-4" />
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
