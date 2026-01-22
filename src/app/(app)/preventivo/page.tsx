'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPreventivoList, getPreventivoPendientes } from '@/lib/firebase/preventivo';
import { Preventivo, PERIODICIDAD_LABELS } from '@/types';
import { cn } from '@/lib/utils/index';
import { CalendarioPreventivo } from '@/components/preventivo/CalendarioPreventivo';
import { PreventivoCard } from '@/components/preventivo/PreventivoCard';
import { PreventivoTimeline } from '@/components/preventivo/PreventivoTimeline';
import {
  Plus,
  Calendar,
  List,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';

type ViewMode = 'calendario' | 'lista';

export default function PreventivoPage() {
  const { claims, hasRole } = useAuth();
  const router = useRouter();
  const [preventivos, setPreventivos] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendario');
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);

  async function loadData(showRefresh = false) {
    if (!claims?.tenantId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const allPreventivos = await getPreventivoList({ 
        tenantId: claims.tenantId, 
        activo: soloActivos ? true : undefined 
      });
      setPreventivos(allPreventivos);
    } catch (error) {
      console.error('Error loading preventivos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [claims?.tenantId, soloActivos]);

  // Filtrar por búsqueda
  const preventivosFiltrados = useMemo(() => {
    if (!busqueda) return preventivos;
    const searchLower = busqueda.toLowerCase();
    return preventivos.filter(
      (p) =>
        p.codigo.toLowerCase().includes(searchLower) ||
        p.nombre.toLowerCase().includes(searchLower) ||
        p.descripcion?.toLowerCase().includes(searchLower) ||
        p.tipoActivo.toLowerCase().includes(searchLower)
    );
  }, [preventivos, busqueda]);

  // Stats
  const stats = useMemo(() => {
    const hoy = new Date();
    let vencidos = 0;
    let proximos7 = 0;
    let proximos14 = 0;

    preventivos.forEach(p => {
      if (!p.proximaEjecucion || !p.activo) return;
      const fecha = p.proximaEjecucion.toDate?.();
      if (!fecha) return;

      const dias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dias < 0) vencidos++;
      else if (dias <= 7) proximos7++;
      else if (dias <= 14) proximos14++;
    });

    return { 
      total: preventivos.filter(p => p.activo).length, 
      vencidos, 
      proximos7,
      proximos14
    };
  }, [preventivos]);

  const canCreate = hasRole(['admin', 'jefe_mantenimiento']);

  const handlePreventivoClick = (preventivo: Preventivo) => {
    router.push(`/preventivo/${preventivo.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header industrial */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título y stats */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Calendario Preventivo
                </h1>
                <p className="text-slate-400 text-sm">
                  Planificación de mantenimiento programado
                </p>
              </div>

              {/* Stats rápidos */}
              <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-600">
                {stats.vencidos > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-mono font-bold">{stats.vencidos}</span>
                    <span className="text-red-400/70 text-sm">vencidos</span>
                  </div>
                )}
                <div className="text-slate-400 text-sm">
                  <span className="text-amber-400 font-mono font-bold">{stats.proximos7}</span>
                  <span className="mx-1">en 7d</span>
                  <span className="mx-2">•</span>
                  <span className="text-cyan-400 font-mono font-bold">{stats.total}</span>
                  <span className="mx-1">activos</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              {/* Refresh */}
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
              </button>

              {/* Toggle vista */}
              <div className="flex items-center bg-slate-700 rounded p-1">
                <button
                  onClick={() => setViewMode('calendario')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'calendario' 
                      ? "bg-purple-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Calendario"
                >
                  <Calendar className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('lista')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'lista' 
                      ? "bg-purple-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Nuevo preventivo */}
              {canCreate && (
                <Link
                  href="/preventivo/nuevo"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Plan</span>
                </Link>
              )}
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, nombre o tipo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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

            {/* Toggle solo activos */}
            <button
              onClick={() => setSoloActivos(!soloActivos)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border rounded transition-colors',
                soloActivos
                  ? 'bg-green-600/20 border-green-500 text-green-400'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500'
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Solo activos
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Cargando preventivos...</p>
            </div>
          </div>
        ) : preventivosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No hay planes de preventivo</h3>
              <p className="text-slate-400 mt-1">
                {busqueda 
                  ? 'No se encontraron resultados' 
                  : 'Crea un nuevo plan para comenzar'
                }
              </p>
            </div>
          </div>
        ) : viewMode === 'calendario' ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Calendario principal */}
            <div className="xl:col-span-3">
              <CalendarioPreventivo
                preventivos={preventivosFiltrados}
                onPreventivoClick={handlePreventivoClick}
              />
            </div>

            {/* Panel lateral - timeline */}
            <div className="xl:col-span-1">
              <PreventivoTimeline
                preventivos={preventivosFiltrados}
                dias={14}
                onPreventivoClick={handlePreventivoClick}
              />
            </div>
          </div>
        ) : (
          /* Vista lista */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {preventivosFiltrados.map((preventivo) => (
              <PreventivoCard
                key={preventivo.id}
                preventivo={preventivo}
                onClick={() => handlePreventivoClick(preventivo)}
              />
            ))}
          </div>
        )}

        {/* Leyenda de periodicidades */}
        {!loading && preventivosFiltrados.length > 0 && (
          <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-medium text-white mb-3">Periodicidades Estándar</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="font-mono font-bold text-blue-400">3M</p>
                <p className="text-slate-400 text-xs mt-1">Trimestral - Revisiones básicas</p>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="font-mono font-bold text-purple-400">6M</p>
                <p className="text-slate-400 text-xs mt-1">Semestral - Inspección completa</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="font-mono font-bold text-amber-400">1A</p>
                <p className="text-slate-400 text-xs mt-1">Anual - Mantenimiento mayor</p>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="font-mono font-bold text-orange-400">2A</p>
                <p className="text-slate-400 text-xs mt-1">Bianual - Revisión exhaustiva</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
