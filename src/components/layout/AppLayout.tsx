'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SlidePanel from '@/components/layout/SlidePanel';
import IndustrialHeader from '@/components/layout/IndustrialHeader';
import ContextualNav from '@/components/layout/ContextualNav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import CommandPalette from '@/components/layout/CommandPalette';
import { Loader2, Bus } from 'lucide-react';
import { cn } from '@/lib/utils/index';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [slidePanelOpen, setSlidePanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'grid' | 'kanban' | 'calendar' | 'timeline' | 'table'>('list');

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Command palette: Ctrl/Cmd + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      // Menu: Alt + M
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        setSlidePanelOpen(prev => !prev);
      }
      // Close on Escape
      if (e.key === 'Escape') {
        setSlidePanelOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="mt-3 text-slate-400">Cargando ZaintzaBus...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Badge counts - TODO: conectar con datos reales desde context/hooks
  const badgeCounts = {
    incidencias: 0,
    vencidos: 0,
    stockBajo: 0,
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Slide Panel (Navigation) */}
      <SlidePanel 
        isOpen={slidePanelOpen}
        onClose={() => setSlidePanelOpen(false)}
        badges={badgeCounts}
      />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Main content area - Now full width, no sidebar offset */}
      <div className="min-h-screen flex flex-col">
        {/* Header - Always visible, more prominent */}
        <IndustrialHeader
          onMenuClick={() => setSlidePanelOpen(true)}
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          isOnline={isOnline}
          notifications={[
            // TODO: conectar con datos reales
          ]}
        />

        {/* Contextual Navigation - Shows tabs, filters, actions per route */}
        <ContextualNav 
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Page content - Full width */}
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          onMenuOpen={() => setSlidePanelOpen(true)}
          badges={{
            incidencias: badgeCounts.incidencias,
            preventivo: badgeCounts.vencidos,
          }}
        />

        {/* Offline indicator bar */}
        {!isOnline && (
          <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-amber-500 text-amber-950 text-center py-2 text-sm font-medium z-50">
            Sin conexión - Los cambios se sincronizarán cuando vuelvas a estar online
          </div>
        )}
      </div>
    </div>
  );
}
