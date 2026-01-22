'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui';

// Loading fallback component
function LoadingFallback({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="md" />
      <span className="ml-3 text-slate-400">{message}</span>
    </div>
  );
}

// Skeleton fallback for charts
function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-slate-800 rounded-lg" />
    </div>
  );
}

// Skeleton fallback for tables
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 bg-slate-800 rounded" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-800/50 rounded" />
      ))}
    </div>
  );
}

// Skeleton fallback for forms
function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
          <div className="h-10 bg-slate-800 rounded" />
        </div>
      ))}
      <div className="h-10 w-32 bg-cyan-900/50 rounded mt-6" />
    </div>
  );
}

// ============================================
// Lazy loaded heavy components
// ============================================

// Charts (heavy due to charting libraries)
export const LazyKpiGauge = dynamic(
  () => import('@/components/ui/KpiGauge').then(mod => ({ default: mod.KpiGauge })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Excel importer (heavy due to xlsx library)
export const LazyImportadorExcel = dynamic(
  () => import('@/components/importacion/ImportadorExcel').then(mod => ({ default: mod.ImportadorExcel })),
  { loading: () => <LoadingFallback message="Cargando importador..." />, ssr: false }
);

// Calendar components
export const LazyCalendarioPreventivo = dynamic(
  () => import('@/components/preventivo/CalendarioPreventivo').then(mod => ({ default: mod.CalendarioPreventivo })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

// Kanban board
export const LazyKanbanBoard = dynamic(
  () => import('@/components/incidencias/KanbanBoard').then(mod => ({ default: mod.KanbanBoard })),
  { loading: () => <TableSkeleton />, ssr: false }
);

// Command palette (only loaded when needed)
export const LazyCommandPalette = dynamic(
  () => import('@/components/layout/CommandPalette').then(mod => ({ default: mod.CommandPalette })),
  { loading: () => null, ssr: false }
);

// Fleet grid
export const LazyFlotaGrid = dynamic(
  () => import('@/components/activos/FlotaGrid').then(mod => ({ default: mod.FlotaGrid })),
  { loading: () => <TableSkeleton />, ssr: false }
);

// Inventory table
export const LazyInventarioTable = dynamic(
  () => import('@/components/inventario/InventarioTable').then(mod => ({ default: mod.InventarioTable })),
  { loading: () => <TableSkeleton />, ssr: false }
);

// Activity feed
export const LazyActivityFeed = dynamic(
  () => import('@/components/ui/ActivityFeed').then(mod => ({ default: mod.ActivityFeed })),
  { loading: () => <LoadingFallback message="Cargando actividad..." />, ssr: false }
);

// ============================================
// Utility for creating lazy components
// ============================================

interface LazyOptions {
  fallback?: ReactNode;
  ssr?: boolean;
}

export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
) {
  const { fallback = <LoadingFallback />, ssr = false } = options;
  
  return dynamic(importFn, { loading: () => <>{fallback}</>, ssr });
}

// ============================================
// Preload functions for critical routes
// ============================================

export function preloadDashboardComponents() {
  // Preload components that will be needed on dashboard
  import('@/components/ui/KpiGauge');
  import('@/components/ui/ActivityFeed');
}

export function preloadIncidenciasComponents() {
  import('@/components/incidencias/KanbanBoard');
  import('@/components/incidencias/IncidenciaCard');
}

export function preloadPreventivoComponents() {
  import('@/components/preventivo/CalendarioPreventivo');
  import('@/components/preventivo/PreventivoTimeline');
}

export function preloadActivosComponents() {
  import('@/components/activos/FlotaGrid');
  import('@/components/activos/ActivoCard');
}

export function preloadImportComponents() {
  import('@/components/importacion/ImportadorExcel');
}
