'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getOrdenesTrabajo, getEstadisticasOT, EstadisticasOT } from '@/lib/firebase/ordenes-trabajo';
import { OrdenTrabajo, ESTADOS_OT, TIPOS_OT, EstadoOT, TipoOT } from '@/types';
import { cn } from '@/lib/utils';
import { OTKanban, OTCalendario, OTCard } from '@/components/ordenes-trabajo';
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  CardContent,
  StatsCard,
  LoadingSpinner,
  EmptyState,
  Tabs,
} from '@/components/ui';
import {
  Plus,
  Search,
  LayoutGrid,
  Calendar,
  List,
  RefreshCw,
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  Filter,
  X,
} from 'lucide-react';

type ViewMode = 'kanban' | 'calendario' | 'lista';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: TIPOS_OT.CORRECTIVO_URGENTE, label: 'Correctivo Urgente' },
  { value: TIPOS_OT.CORRECTIVO_PROGRAMADO, label: 'Correctivo Programado' },
  { value: TIPOS_OT.PREVENTIVO, label: 'Preventivo' },
];

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADOS_OT.PENDIENTE, label: 'Pendiente' },
  { value: ESTADOS_OT.ASIGNADA, label: 'Asignada' },
  { value: ESTADOS_OT.EN_CURSO, label: 'En curso' },
  { value: ESTADOS_OT.COMPLETADA, label: 'Completada' },
  { value: ESTADOS_OT.VALIDADA, label: 'Validada' },
  { value: ESTADOS_OT.RECHAZADA, label: 'Rechazada' },
];

export default function OrdenesTrabajosPage() {
  const { claims, hasRole } = useAuth();
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [stats, setStats] = useState<EstadisticasOT | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  async function loadData(showRefresh = false) {
    if (!claims?.tenantId) return;

    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [ordenesResult, estadisticas] = await Promise.all([
        getOrdenesTrabajo({
          tenantId: claims.tenantId,
          pageSize: 100,
        }),
        getEstadisticasOT(claims.tenantId),
      ]);
      setOrdenes(ordenesResult.ordenes);
      setStats(estadisticas);
    } catch (error) {
      console.error('Error loading ordenes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [claims?.tenantId]);

  // Filtrar órdenes
  const ordenesFiltradas = useMemo(() => {
    let filtered = ordenes;

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      filtered = filtered.filter((ot) =>
        ot.codigo.toLowerCase().includes(searchLower)
      );
    }

    if (tipoFiltro) {
      filtered = filtered.filter((ot) => ot.tipo === tipoFiltro);
    }

    if (estadoFiltro) {
      filtered = filtered.filter((ot) => ot.estado === estadoFiltro);
    }

    return filtered;
  }, [ordenes, busqueda, tipoFiltro, estadoFiltro]);

  const handleOTClick = (orden: OrdenTrabajo) => {
    router.push(`/ordenes-trabajo/${orden.id}`);
  };

  const clearFilters = () => {
    setBusqueda('');
    setTipoFiltro('');
    setEstadoFiltro('');
  };

  const hasActiveFilters = busqueda || tipoFiltro || estadoFiltro;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-slate-400 mt-1">
            Gestión y seguimiento de órdenes de trabajo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          {hasRole(['admin', 'jefe_mantenimiento']) && (
            <Link href="/ordenes-trabajo/nueva">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva OT
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Pendientes"
            value={stats.pendientes}
            icon={Clock}
            iconColor="text-amber-400"
          />
          <StatsCard
            title="En Curso"
            value={stats.enCurso}
            icon={Wrench}
            iconColor="text-purple-400"
          />
          <StatsCard
            title="Completadas Hoy"
            value={stats.completadasHoy}
            icon={CheckCircle}
            iconColor="text-green-400"
          />
          <StatsCard
            title="Coste Total"
            value={`${stats.costeTotal.toFixed(0)}€`}
            icon={AlertTriangle}
            iconColor="text-cyan-400"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && 'border-blue-500 text-blue-500')}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 rounded text-xs">
              {[busqueda, tipoFiltro, estadoFiltro].filter(Boolean).length}
            </span>
          )}
        </Button>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'kanban'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            )}
            title="Vista Kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('calendario')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'calendario'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            )}
            title="Vista Calendario"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('lista')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'lista'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            )}
            title="Vista Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filtros expandidos */}
      {showFilters && (
        <Card className="bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Tipo
                </label>
                <Select
                  value={tipoFiltro}
                  onChange={(value) => setTipoFiltro(value)}
                  options={TIPO_OPTIONS}
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Estado
                </label>
                <Select
                  value={estadoFiltro}
                  onChange={(value) => setEstadoFiltro(value)}
                  options={ESTADO_OPTIONS}
                />
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido principal */}
      {ordenesFiltradas.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No hay órdenes de trabajo"
          description={
            hasActiveFilters
              ? 'No se encontraron órdenes con los filtros aplicados'
              : 'Crea una nueva orden de trabajo para empezar'
          }
          action={
            hasActiveFilters
              ? { label: 'Limpiar filtros', onClick: clearFilters }
              : hasRole(['admin', 'jefe_mantenimiento'])
              ? { label: 'Nueva OT', onClick: () => router.push('/ordenes-trabajo/nueva') }
              : undefined
          }
        />
      ) : (
        <>
          {viewMode === 'kanban' && (
            <OTKanban
              ordenes={ordenesFiltradas}
              onOTClick={handleOTClick}
            />
          )}

          {viewMode === 'calendario' && (
            <OTCalendario
              ordenes={ordenesFiltradas}
              onOTClick={handleOTClick}
            />
          )}

          {viewMode === 'lista' && (
            <div className="space-y-3">
              {ordenesFiltradas.map((ot) => (
                <OTCard
                  key={ot.id}
                  orden={ot}
                  mode="full"
                  onClick={() => handleOTClick(ot)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
