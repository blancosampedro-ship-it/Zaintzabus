'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/index';
import { ROL_LABELS } from '@/types';
import {
  Search,
  Bell,
  Menu,
  X,
  Command,
  Bus,
  LayoutDashboard,
  AlertTriangle,
  Package,
  Calendar,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  Home,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface IndustrialHeaderProps {
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
  notifications?: Notification[];
  isOnline?: boolean;
}

export default function IndustrialHeader({ 
  onMenuClick, 
  onCommandPaletteOpen,
  notifications = [],
  isOnline = true,
}: IndustrialHeaderProps) {
  const pathname = usePathname();
  const { usuario, claims, signOut } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Breadcrumb con más secciones
  const getBreadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean);
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      incidencias: 'Incidencias',
      activos: 'Activos',
      autobuses: 'Autobuses',
      equipos: 'Equipos',
      preventivo: 'Preventivo',
      inventario: 'Inventario',
      informes: 'Informes',
      admin: 'Admin',
      usuarios: 'Usuarios',
      operadores: 'Operadores',
      tecnicos: 'Técnicos',
      contratos: 'Contratos',
      facturacion: 'Facturación',
      nuevo: 'Nuevo',
      nueva: 'Nueva',
      'ordenes-trabajo': 'Órdenes de Trabajo',
      instalacion: 'Instalación',
    };
    return segments.map(s => labels[s] || s);
  };

  const breadcrumb = getBreadcrumb();

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 sticky top-0 z-40 shadow-lg">
      {/* Left side - Menu + Logo */}
      <div className="flex items-center gap-3">
        {/* Menu hamburger - Always visible */}
        <button
          onClick={onMenuClick}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all active:scale-95 group"
          title="Abrir menú (Alt+M)"
        >
          <Menu className="w-6 h-6 group-hover:text-cyan-400 transition-colors" />
        </button>

        {/* Logo - siempre visible */}
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-white text-base">ZaintzaBus</span>
            <p className="text-[10px] text-cyan-400/80 -mt-0.5 font-medium">CMMS</p>
          </div>
        </Link>

        {/* Divider */}
        <div className="hidden md:block h-8 w-px bg-slate-700 mx-1" />

        {/* Breadcrumb - Desktop */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm">
          <Link href="/dashboard" className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          {breadcrumb.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className={cn(
                'px-2 py-1 rounded-md transition-colors',
                index === breadcrumb.length - 1 
                  ? 'text-white font-medium bg-slate-800' 
                  : 'text-slate-400 hover:text-slate-300'
              )}>
                {item}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Center - Search (expandido en desktop) */}
      <div className="hidden lg:flex flex-1 max-w-lg mx-8">
        <button
          onClick={onCommandPaletteOpen}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-400 hover:text-white transition-all group"
        >
          <Search className="w-5 h-5 text-slate-500 group-hover:text-cyan-400" />
          <span className="flex-1 text-left text-sm">Buscar autobuses, equipos, incidencias...</span>
          <kbd className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-lg text-[11px] font-mono text-slate-400 group-hover:bg-slate-600">
            <Command className="w-3 h-3" />K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Online status indicator */}
        <div className={cn(
          'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
          isOnline 
            ? 'text-emerald-400 bg-emerald-500/10' 
            : 'text-amber-400 bg-amber-500/10'
        )}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden xl:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Mobile search */}
        <button
          onClick={onCommandPaletteOpen}
          className="lg:hidden p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        'px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer',
                        !notif.read && 'bg-slate-700/30'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-2',
                          notif.type === 'error' && 'bg-red-400',
                          notif.type === 'warning' && 'bg-amber-400',
                          notif.type === 'info' && 'bg-cyan-400'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{notif.title}</p>
                          <p className="text-xs text-slate-400 truncate">{notif.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-700">
                  <button className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300">
                    Ver todas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-cyan-500/20 ring-2 ring-slate-700">
              {usuario?.nombre?.[0]}{usuario?.apellidos?.[0]}
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                <p className="font-semibold text-white truncate">
                  {usuario?.nombre} {usuario?.apellidos}
                </p>
                <p className="text-xs text-cyan-400 font-medium">
                  {claims?.rol ? ROL_LABELS[claims.rol] : ''}
                </p>
                {usuario?.email && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{usuario.email}</p>
                )}
              </div>
              <div className="p-2">
                <Link 
                  href="/perfil" 
                  className="flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Mi perfil</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
