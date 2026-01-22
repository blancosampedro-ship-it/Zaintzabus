'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getActivos } from '@/lib/firebase/activos';
import { Activo } from '@/types';
import { cn } from '@/lib/utils/index';
import { FlotaGrid } from '@/components/activos/FlotaGrid';
import { ActivoSidebar } from '@/components/activos/ActivoSidebar';
import {
  Plus,
  Search,
  Bus,
  RefreshCw,
  X,
  CheckCircle,
  Wrench,
  AlertTriangle,
} from 'lucide-react';

export default function ActivosPage() {
  const { claims, hasRole } = useAuth();
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [selectedActivo, setSelectedActivo] = useState<Activo | null>(null);

  async function loadActivos(showRefresh = false) {
    if (!claims?.tenantId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getActivos(claims.tenantId);
      setActivos(data);
    } catch (error) {
      console.error('Error loading activos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadActivos();
  }, [claims?.tenantId]);

  // Filtrar por búsqueda
  const activosFiltrados = useMemo(() => {
    if (!busqueda) return activos;
    const searchLower = busqueda.toLowerCase();
    return activos.filter(
      (activo) =>
        activo.codigo.toLowerCase().includes(searchLower) ||
        (activo.marca || '').toLowerCase().includes(searchLower) ||
        (activo.modelo || '').toLowerCase().includes(searchLower) ||
        (activo.matricula || '').toLowerCase().includes(searchLower)
    );
  }, [activos, busqueda]);

  // Stats rápidos
  const stats = useMemo(() => {
    const operativos = activos.filter(a => a.estado === 'operativo').length;
    const enTaller = activos.filter(a => a.estado === 'en_taller').length;
    const averiados = activos.filter(a => a.estado === 'averiado').length;
    const total = activos.length;
    const disponibilidad = total > 0 ? Math.round((operativos / total) * 100) : 0;
    return { operativos, enTaller, averiados, total, disponibilidad };
  }, [activos]);

  const canCreate = hasRole(['admin', 'jefe_mantenimiento', 'operador']);

  const handleSelectActivo = (activo: Activo) => {
    setSelectedActivo(activo);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all",
        selectedActivo && "lg:mr-96"
      )}>
        {/* Header industrial */}
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="px-4 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Título y stats */}
              <div className="flex items-center gap-6">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <Bus className="w-5 h-5 text-cyan-400" />
                    Matriz de Flota
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Control de activos y disponibilidad
                  </p>
                </div>

                {/* Stats rápidos */}
                <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-600">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'px-3 py-1 rounded font-mono text-lg font-bold',
                      stats.disponibilidad >= 90 ? 'bg-green-500/20 text-green-400' :
                      stats.disponibilidad >= 70 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {stats.disponibilidad}%
                    </div>
                    <span className="text-slate-400 text-sm">disponibilidad</span>
                  </div>

                  <div className="text-slate-400 text-sm">
                    <span className="text-green-400 font-mono font-bold">{stats.operativos}</span>
                    <span className="mx-1">op.</span>
                    {stats.enTaller > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-amber-400 font-mono font-bold">{stats.enTaller}</span>
                        <span className="mx-1">taller</span>
                      </>
                    )}
                    {stats.averiados > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-red-400 font-mono font-bold">{stats.averiados}</span>
                        <span className="mx-1">⚠</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-3">
                {/* Refresh */}
                <button
                  onClick={() => loadActivos(true)}
                  disabled={refreshing}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
                </button>

                {/* Nuevo activo */}
                {canCreate && (
                  <Link
                    href="/activos/nuevo"
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nuevo Activo</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="mt-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, marca, modelo o matrícula..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {busqueda && (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="text-white font-mono">{activosFiltrados.length}</span> resultado{activosFiltrados.length !== 1 ? 's' : ''} para &quot;{busqueda}&quot;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Grid de activos */}
        <div className="flex-1 p-4 overflow-auto">
          <FlotaGrid
            activos={activosFiltrados}
            selectedId={selectedActivo?.id}
            onSelect={handleSelectActivo}
            loading={loading}
          />
        </div>
      </div>

      {/* Sidebar de detalle */}
      {selectedActivo && (
        <div className="fixed right-0 top-0 h-full z-40 lg:z-0">
          <ActivoSidebar
            activo={selectedActivo}
            onClose={() => setSelectedActivo(null)}
          />
        </div>
      )}
    </div>
  );
}
