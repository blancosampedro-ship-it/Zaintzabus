'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils/index';
import {
  LayoutDashboard,
  AlertTriangle,
  Bus,
  Calendar,
  Package,
  Menu,
  Plus,
  X,
  ClipboardList,
  QrCode,
  Search,
  FileText,
  Settings,
} from 'lucide-react';

// Navegación principal del bottom nav (máximo 5 items)
const primaryNavItems = [
  { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Incidencias', href: '/incidencias', icon: AlertTriangle },
  { name: 'Flota', href: '/autobuses', icon: Bus },
  { name: 'Preventivo', href: '/preventivo', icon: Calendar },
];

// Acciones del FAB por rol
const fabActions: Record<string, Array<{ label: string; href?: string; icon: React.ComponentType<{ className?: string }>; action?: string; color: string }>> = {
  tecnico: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Escanear QR', action: 'scan-qr', icon: QrCode, color: 'bg-cyan-500' },
    { label: 'Buscar equipo', href: '/equipos', icon: Search, color: 'bg-purple-500' },
  ],
  jefe_mantenimiento: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Nueva OT', href: '/ordenes-trabajo/nueva', icon: ClipboardList, color: 'bg-cyan-500' },
    { label: 'Ver inventario', href: '/inventario', icon: Package, color: 'bg-blue-500' },
  ],
  admin: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Usuarios', href: '/admin/usuarios', icon: Settings, color: 'bg-purple-500' },
    { label: 'Informes', href: '/informes', icon: FileText, color: 'bg-green-500' },
  ],
  dfg: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Ver informes', href: '/informes', icon: FileText, color: 'bg-green-500' },
  ],
  operador: [
    { label: 'Nueva incidencia', href: '/incidencias/nueva', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Ver flota', href: '/autobuses', icon: Bus, color: 'bg-green-500' },
  ],
};

interface MobileBottomNavProps {
  onMenuOpen: () => void;
  badges?: {
    incidencias?: number;
    preventivo?: number;
  };
}

export default function MobileBottomNav({ onMenuOpen, badges = {} }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { claims } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const userRole = claims?.rol || 'tecnico';
  const actions = fabActions[userRole] || fabActions.tecnico;

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setFabOpen(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close FAB on route change
  useEffect(() => {
    setFabOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* FAB Overlay */}
      {fabOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB Actions */}
      <div className={cn(
        'fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 transition-all duration-300 lg:hidden',
        fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, index) => (
          action.href ? (
            <Link
              key={index}
              href={action.href}
              className={cn(
                'flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full shadow-lg transition-all',
                action.color,
                'text-white animate-in slide-in-from-right duration-200'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setFabOpen(false)}
            >
              <span className="text-sm font-medium">{action.label}</span>
              <action.icon className="w-5 h-5" />
            </Link>
          ) : (
            <button
              key={index}
              className={cn(
                'flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full shadow-lg transition-all',
                action.color,
                'text-white animate-in slide-in-from-right duration-200'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                setFabOpen(false);
                // Handle action
              }}
            >
              <span className="text-sm font-medium">{action.label}</span>
              <action.icon className="w-5 h-5" />
            </button>
          )
        ))}
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setFabOpen(!fabOpen)}
        className={cn(
          'fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 lg:hidden',
          'flex items-center justify-center',
          fabOpen 
            ? 'bg-slate-700 rotate-45' 
            : 'bg-gradient-to-br from-cyan-500 to-blue-600',
          !isVisible && '-translate-y-20 opacity-0'
        )}
      >
        {fabOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-7 h-7 text-white" />
        )}
      </button>

      {/* Bottom Navigation Bar */}
      <nav className={cn(
        'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
        'bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50',
        'transition-transform duration-300',
        !isVisible && 'translate-y-full'
      )}>
        {/* Safe area for notch/home indicator */}
        <div className="pb-safe">
          <div className="flex items-center justify-around h-16 px-2">
            {primaryNavItems.map((item) => {
              const active = isActive(item.href);
              const badgeCount = item.href === '/incidencias' ? badges.incidencias : 
                                 item.href === '/preventivo' ? badges.preventivo : undefined;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all',
                    active 
                      ? 'text-cyan-400' 
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <div className="relative">
                    <item.icon className={cn(
                      'w-6 h-6 transition-transform',
                      active && 'scale-110'
                    )} />
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] mt-1 font-medium',
                    active && 'text-cyan-400'
                  )}>
                    {item.name}
                  </span>
                  {active && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </Link>
              );
            })}
            
            {/* More / Menu button */}
            <button
              onClick={onMenuOpen}
              className="flex flex-col items-center justify-center w-16 h-14 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Menu className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">Más</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content being hidden behind bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
}

// Swipe gesture hook for navigation
export function useSwipeNavigation() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (!isHorizontalSwipe) return;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    return { isLeftSwipe, isRightSwipe };
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
