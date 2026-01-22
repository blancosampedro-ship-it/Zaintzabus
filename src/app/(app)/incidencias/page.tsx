'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getIncidencias } from '@/lib/firebase/incidencias';
import { Incidencia, ESTADO_LABELS, CRITICIDAD_LABELS, EstadoIncidencia, Criticidad } from '@/types';
import { cn } from '@/lib/utils/index';
import { KanbanBoard } from '@/components/incidencias/KanbanBoard';
import { IncidenciaCard } from '@/components/incidencias/IncidenciaCard';
import { FilterChips, FilterChip } from '@/components/incidencias/FilterChips';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  Zap,
  Filter,
  X,
} from 'lucide-react';

type ViewMode = 'kanban' | 'list';

const CRITICIDAD_OPTIONS: { value: Criticidad; label: string }[] = [
  { value: 'critica', label: 'Crítica' },
  { value: 'normal', label: 'Normal' },
];

export default function IncidenciasPage() {
  const { claims, hasRole } = useAuth();
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [criticidadFiltro, setCriticidadFiltro] = useState<Criticidad | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadIncidencias(showRefresh = false) {
    if (!claims?.tenantId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getIncidencias({
        tenantId: claims.tenantId,
        pageSize: 100, // Load more for kanban view
      });
      setIncidencias(result.incidencias);
    } catch (error) {
      console.error('Error loading incidencias:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadIncidencias();
  }, [claims?.tenantId]);

  // Filtrar incidencias
  const incidenciasFiltradas = useMemo(() => {
    let filtered = incidencias;

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter(
        (inc) =>
          inc.codigo.toLowerCase().includes(searchLower) ||
          inc.activoPrincipalCodigo.toLowerCase().includes(searchLower) ||
          inc.naturalezaFallo.toLowerCase().includes(searchLower)
      );
    }

    if (criticidadFiltro) {
      filtered = filtered.filter((inc) => inc.criticidad === criticidadFiltro);
    }

    return filtered;
  }, [incidencias, busqueda, criticidadFiltro]);

  // Stats rápidos
  const stats = useMemo(() => {
    const criticas = incidencias.filter(i => i.criticidad === 'critica' && i.estado !== 'cerrada').length;
    const enProgreso = incidencias.filter(i => ['en_analisis', 'en_intervencion'].includes(i.estado)).length;
    const nuevas = incidencias.filter(i => i.estado === 'nueva').length;
    return { criticas, enProgreso, nuevas };
  }, [incidencias]);

  // Chips de filtros activos
  const activeFilters: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    if (busqueda) {
      chips.push({ key: 'busqueda', label: `"${busqueda}"`, onRemove: () => setBusqueda('') });
    }
    if (criticidadFiltro) {
      chips.push({ 
        key: 'criticidad', 
        label: `Criticidad: ${CRITICIDAD_LABELS[criticidadFiltro]}`, 
        onRemove: () => setCriticidadFiltro(null) 
      });
    }
    return chips;
  }, [busqueda, criticidadFiltro]);

  const canCreate = hasRole(['admin', 'operador', 'jefe_mantenimiento', 'tecnico']);

  const handleIncidenciaClick = (incidencia: Incidencia) => {
    router.push(`/incidencias/${incidencia.id}`);
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
                  <Zap className="w-5 h-5 text-amber-400" />
                  Panel de Operaciones
                </h1>
                <p className="text-slate-400 text-sm">Gestión de incidencias en tiempo real</p>
              </div>
              
              {/* Stats rápidos */}
              <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-600">
                {stats.criticas > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-mono font-bold">{stats.criticas}</span>
                    <span className="text-red-400/70 text-sm">críticas</span>
                  </div>
                )}
                <div className="text-slate-400 text-sm">
                  <span className="text-cyan-400 font-mono font-bold">{stats.nuevas}</span> nuevas
                  <span className="mx-2">•</span>
                  <span className="text-amber-400 font-mono font-bold">{stats.enProgreso}</span> en progreso
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3">
              {/* Refresh */}
              <button
                onClick={() => loadIncidencias(true)}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
              </button>

              {/* Toggle vista */}
              <div className="flex items-center bg-slate-700 rounded p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'kanban' 
                      ? "bg-cyan-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Kanban"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'list' 
                      ? "bg-cyan-600 text-white" 
                      : "text-slate-400 hover:text-white"
                  )}
                  title="Vista Lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Nueva incidencia */}
              {canCreate && (
                <Link 
                  href="/incidencias/nueva" 
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nueva</span>
                </Link>
              )}
            </div>
          </div>

          {/* Barra de búsqueda y filtros */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, activo o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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

            {/* Botón filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 border rounded transition-colors",
                showFilters || activeFilters.length > 0
                  ? "bg-cyan-600/20 border-cyan-500 text-cyan-400"
                  : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFilters.length > 0 && (
                <span className="px-1.5 py-0.5 bg-cyan-600 text-white text-xs rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Panel de filtros expandible */}
          {showFilters && (
            <div className="mt-3 p-4 bg-slate-700/50 border border-slate-600 rounded">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Criticidad</label>
                  <div className="flex gap-2">
                    {CRITICIDAD_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setCriticidadFiltro(criticidadFiltro === value ? null : value)}
                        className={cn(
                          "px-3 py-1 text-sm rounded border transition-colors",
                          criticidadFiltro === value
                            ? value === 'critica' ? "bg-red-600 border-red-500 text-white" 
                              : "bg-green-600 border-green-500 text-white"
                            : "border-slate-500 text-slate-300 hover:border-slate-400"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chips de filtros activos */}
          {activeFilters.length > 0 && (
            <div className="mt-3">
              <FilterChips filters={activeFilters} resultCount={incidenciasFiltradas.length} />
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Cargando incidencias...</p>
            </div>
          </div>
        ) : incidenciasFiltradas.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No hay incidencias</h3>
              <p className="text-slate-400 mt-1">
                {busqueda || criticidadFiltro 
                  ? 'No se encontraron resultados con los filtros aplicados' 
                  : 'No hay incidencias registradas'}
              </p>
              {(busqueda || criticidadFiltro) && (
                <button
                  onClick={() => { setBusqueda(''); setCriticidadFiltro(null); }}
                  className="mt-4 px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard 
            incidencias={incidenciasFiltradas} 
            onIncidenciaClick={handleIncidenciaClick}
          />
        ) : (
          /* Vista lista */
          <div className="space-y-2">
            {incidenciasFiltradas.map((incidencia) => (
              <IncidenciaCard
                key={incidencia.id}
                incidencia={incidencia}
                onClick={() => handleIncidenciaClick(incidencia)}
                mode="full"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
