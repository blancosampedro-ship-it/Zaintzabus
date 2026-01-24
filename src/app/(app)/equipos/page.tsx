'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  EquipoCard,
  EquiposStats,
  EquiposPorTipo,
  EquiposToolbar,
  MoverEquipoModal,
  type EquiposFilters,
  type MoverEquipoFormData,
} from '@/components/equipos';
import {
  DataTable,
  Breadcrumbs,
  Badge,
  LoadingPage,
  EmptyState,
  CardGrid,
  ConfirmDialog,
  Skeleton,
  type Column,
} from '@/components/ui';
import {
  getResumenEquipos,
  getTiposEquipo,
  moverEquipo,
  darDeBajaEquipo,
  type ResumenEquipos,
} from '@/lib/firebase/equipos';
import { useEquipos, type FiltrosEquipos } from '@/hooks/useEquipos';
import { useDebounce } from '@/hooks/useDebounce';
import { Equipo, TipoEquipo, ESTADOS_EQUIPO, type EstadoEquipo, type TipoUbicacionEquipo } from '@/types';
import {
  Cpu,
  MapPin,
  Bus,
  Warehouse,
  Wrench,
  AlertTriangle,
  Trash2,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

// Mock data para operadores y ubicaciones (reemplazar con datos reales)
const mockOperadores = [
  { id: 'op1', nombre: 'Dbus' },
  { id: 'op2', nombre: 'Lurraldebus' },
  { id: 'op3', nombre: 'Bizkaibus' },
];

const mockAutobuses = [
  { id: 'bus1', codigo: 'BUS-001', operadorNombre: 'Dbus' },
  { id: 'bus2', codigo: 'BUS-002', operadorNombre: 'Dbus' },
  { id: 'bus3', codigo: 'BUS-101', operadorNombre: 'Lurraldebus' },
];

const mockUbicaciones = [
  { id: 'alm1', nombre: 'Almacén Central Winfin', tipo: 'almacen_winfin' },
  { id: 'alm2', nombre: 'Almacén Dbus', tipo: 'almacen_operador' },
  { id: 'lab1', nombre: 'Lab Winfin', tipo: 'laboratorio' },
];

const mockLaboratorios = [
  { id: 'lab1', nombre: 'Laboratorio Winfin' },
  { id: 'lab2', nombre: 'SAT Fabricante' },
];

const estadoConfig = {
  [ESTADOS_EQUIPO.EN_SERVICIO]: {
    label: 'En Servicio',
    variant: 'success' as const,
    icon: <Bus className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.EN_ALMACEN]: {
    label: 'En Almacén',
    variant: 'info' as const,
    icon: <Warehouse className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.EN_LABORATORIO]: {
    label: 'En Laboratorio',
    variant: 'warning' as const,
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.AVERIADO]: {
    label: 'Averiado',
    variant: 'danger' as const,
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  [ESTADOS_EQUIPO.BAJA]: {
    label: 'Baja',
    variant: 'secondary' as const,
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
};

export default function EquiposPage() {
  const router = useRouter();
  const { success, error: showError, ToastContainer } = useToast();
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const [resumen, setResumen] = React.useState<ResumenEquipos | null>(null);
  const [tiposEquipo, setTiposEquipo] = React.useState<TipoEquipo[]>([]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('table');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [initialLoading, setInitialLoading] = React.useState(true);

  // Filtros UI (estado local)
  const [filters, setFilters] = React.useState<EquiposFilters>({
    busqueda: '',
    tipoEquipoId: '',
    estado: '',
    operadorId: '',
    ubicacionTipo: '',
  });

  // Debounce de la búsqueda (300ms)
  const debouncedSearch = useDebounce(filters.busqueda, 300);

  // Convertir filtros UI a filtros del hook
  const hookFiltros: FiltrosEquipos = React.useMemo(() => ({
    tipoEquipoId: filters.tipoEquipoId || undefined,
    estado: (filters.estado as EstadoEquipo) || undefined,
    operadorId: filters.operadorId || undefined,
    ubicacionTipo: (filters.ubicacionTipo as TipoUbicacionEquipo) || undefined,
    searchTerm: debouncedSearch || undefined,
    pageSize: 50,
  }), [filters.tipoEquipoId, filters.estado, filters.operadorId, filters.ubicacionTipo, debouncedSearch]);

  // Hook principal con búsqueda server-side
  const { 
    equipos, 
    loading, 
    searching, 
    hasMore, 
    loadMore, 
    refetch 
  } = useEquipos(hookFiltros);

  // Modal states
  const [equipoToMove, setEquipoToMove] = React.useState<Equipo | null>(null);
  const [equipoToDelete, setEquipoToDelete] = React.useState<Equipo | null>(null);
  const [equipoToReportAveria, setEquipoToReportAveria] = React.useState<Equipo | null>(null);

  // Load tipos y resumen (solo al inicio)
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [tipos, resumenData] = await Promise.all([
          getTiposEquipo(),
          getResumenEquipos(),
        ]);
        setTiposEquipo(tipos);
        setResumen(resumenData);
      } catch (err) {
        console.error('Error loading initial data:', err);
        showError('Error al cargar datos iniciales');
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Infinite scroll con Intersection Observer
  React.useEffect(() => {
    if (loading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMore]);

  // Refrescar resumen cuando cambian los equipos
  const refreshStats = React.useCallback(async () => {
    try {
      const resumenData = await getResumenEquipos();
      setResumen(resumenData);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, []);

  const handleMoveEquipo = async (data: MoverEquipoFormData) => {
    if (!equipoToMove) return;

    const destino = {
      tipo: data.destinoTipo,
      id: data.destinoId,
      nombre:
        data.destinoTipo === 'autobus'
          ? mockAutobuses.find((b) => b.id === data.destinoId)?.codigo || ''
          : data.destinoTipo === 'ubicacion'
          ? mockUbicaciones.find((u) => u.id === data.destinoId)?.nombre || ''
          : mockLaboratorios.find((l) => l.id === data.destinoId)?.nombre || '',
      posicionEnBus: data.posicionEnBus,
    };

    await moverEquipo(
      equipoToMove.id,
      destino,
      data.tipoMovimiento,
      data.motivo,
      'user-id', // TODO: Get from auth context
      { comentarios: data.comentarios }
    );

    success('Equipo movido correctamente');
    setEquipoToMove(null);
    refetch();
    refreshStats();
  };

  const handleDeleteEquipo = async () => {
    if (!equipoToDelete) return;

    try {
      await darDeBajaEquipo(
        equipoToDelete.id,
        'Baja desde listado de equipos',
        'user-id' // TODO: Get from auth context
      );
      success('Equipo dado de baja correctamente');
      setEquipoToDelete(null);
      refetch();
      refreshStats();
    } catch (err) {
      showError('Error al dar de baja el equipo');
    }
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    success('Función de exportación en desarrollo');
  };

  // Handler para reportar avería (quick action)
  const handleReportarAveria = async () => {
    if (!equipoToReportAveria) return;
    
    try {
      // Cambiar estado a averiado
      // TODO: Crear incidencia asociada
      await darDeBajaEquipo(
        equipoToReportAveria.id,
        'Avería reportada desde listado',
        'user-id' // TODO: Get from auth context
      );
      success(`Equipo ${equipoToReportAveria.codigoInterno} marcado como averiado`);
      setEquipoToReportAveria(null);
      refetch();
      refreshStats();
    } catch (err) {
      showError('Error al reportar avería');
    }
  };

  // Renderizar ubicación con badge especial para buses
  const renderUbicacionCell = (equipo: Equipo) => {
    const { ubicacionActual } = equipo;
    
    if (ubicacionActual.tipo === 'autobus') {
      return (
        <div className="flex items-center gap-2">
          <Bus className="h-4 w-4 text-cyan-400" />
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-sm">
            <span className="text-cyan-400 font-medium">[{ubicacionActual.nombre}]</span>
            {ubicacionActual.matricula && (
              <span className="text-white">{ubicacionActual.matricula}</span>
            )}
          </span>
          {ubicacionActual.posicionEnBus && (
            <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
              {ubicacionActual.posicionEnBus}
            </span>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        {ubicacionActual.tipo === 'laboratorio' ? (
          <Wrench className="h-4 w-4 text-amber-400" />
        ) : (
          <Warehouse className="h-4 w-4 text-slate-500" />
        )}
        <span>{ubicacionActual.nombre}</span>
      </div>
    );
  };

  // Renderizar "Power Fields" según tipo de equipo
  const renderPowerFieldsCell = (equipo: Equipo) => {
    const tipoNombre = (equipo.tipoEquipoNombre || '').toLowerCase();
    
    // IP para CPUs/Routers
    if ((tipoNombre.includes('cpu') || tipoNombre.includes('router') || tipoNombre.includes('sae')) && equipo.red?.ip) {
      return (
        <span className="text-green-400 font-mono text-xs">{equipo.red.ip}</span>
      );
    }
    
    // Teléfono para SIMs
    if (equipo.sim?.telefono) {
      return (
        <span className="text-blue-400 font-mono text-xs">{equipo.sim.telefono}</span>
      );
    }
    
    // Firmware como fallback
    if (equipo.caracteristicas?.firmware) {
      return (
        <span className="text-slate-400 text-xs">FW: {equipo.caracteristicas.firmware}</span>
      );
    }
    
    return <span className="text-slate-500">-</span>;
  };

  // Table columns
  const columns: Column<Equipo>[] = [
    {
      id: 'codigoInterno',
      header: 'Código',
      accessor: 'codigoInterno',
      sortable: true,
      cell: (equipo) => (
        <Link
          href={`/equipos/${equipo.id}`}
          className="font-medium text-cyan-400 hover:text-cyan-300"
        >
          {equipo.codigoInterno}
        </Link>
      ),
    },
    {
      id: 'tipoEquipo',
      header: 'Tipo',
      accessor: 'tipoEquipoNombre',
      sortable: true,
    },
    {
      id: 'powerField',
      header: 'IP / Teléfono',
      accessor: (equipo) => equipo.red?.ip || equipo.sim?.telefono || '-',
      cell: renderPowerFieldsCell,
    },
    {
      id: 'numeroSerie',
      header: 'Nº Serie',
      accessor: 'numeroSerieFabricante',
      cell: (equipo) => (
        <span className="text-slate-400 font-mono text-xs">
          {equipo.numeroSerieFabricante || '-'}
        </span>
      ),
    },
    {
      id: 'ubicacion',
      header: 'Ubicación',
      accessor: (equipo) => equipo.ubicacionActual.nombre,
      cell: renderUbicacionCell,
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: 'estado',
      sortable: true,
      cell: (equipo) => {
        const config = estadoConfig[equipo.estado];
        return (
          <Badge variant={config.variant} icon={config.icon} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
  ];

  if (initialLoading) {
    return <LoadingPage message="Cargando equipos..." />;
  }

  // Indicador de búsqueda en progreso
  const isSearching = searching || (filters.busqueda !== debouncedSearch);

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs
            items={[{ label: 'Equipos', href: '/equipos' }]}
            showHome
          />
          <h1 className="text-2xl font-bold text-white mt-2">
            Equipos Embarcados
          </h1>
          <p className="text-slate-400 mt-1">
            Gestión de equipos SAE, validadoras, cámaras y más
            {equipos.length > 0 && (
              <span className="ml-2 text-cyan-400">
                ({equipos.length}{hasMore ? '+' : ''} resultados)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      {resumen && <EquiposStats resumen={resumen} />}

      {/* Toolbar */}
      <EquiposToolbar
        filters={filters}
        onFiltersChange={setFilters}
        tiposEquipo={tiposEquipo}
        operadores={mockOperadores}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExport}
        onCreateNew={() => router.push('/equipos/nuevo')}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Content */}
      {loading && equipos.length === 0 ? (
        // Skeleton durante carga inicial
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : equipos.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title={filters.busqueda ? 'Sin resultados' : 'No hay equipos'}
          description={
            filters.busqueda 
              ? `No se encontraron equipos con "${filters.busqueda}"`
              : 'Comienza añadiendo el primer equipo al sistema'
          }
          action={
            filters.busqueda 
              ? { label: 'Limpiar búsqueda', onClick: () => setFilters(f => ({ ...f, busqueda: '' })) }
              : { label: 'Nuevo Equipo', onClick: () => router.push('/equipos/nuevo') }
          }
        />
      ) : viewMode === 'table' ? (
        <div className="relative">
          {/* Indicador de búsqueda */}
          {isSearching && (
            <div className="absolute inset-0 bg-slate-900/50 z-10 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-cyan-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Buscando...</span>
              </div>
            </div>
          )}
          <DataTable
            data={equipos}
            columns={columns}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(equipo) => router.push(`/equipos/${equipo.id}`)}
            actions={(equipo) => (
              <div className="flex items-center gap-1">
                {/* Quick Action: Mover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEquipoToMove(equipo);
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
                  title="Mover equipo"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
                {/* Quick Action: Reportar Avería */}
                {equipo.estado !== ESTADOS_EQUIPO.AVERIADO && equipo.estado !== ESTADOS_EQUIPO.BAJA && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEquipoToReportAveria(equipo);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded transition-colors"
                    title="Reportar avería"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          />
          {/* Trigger para infinite scroll */}
          <div ref={loadMoreRef} className="h-4" />
          {/* Indicador de carga de más */}
          {loading && equipos.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400 mr-2" />
              <span className="text-slate-400">Cargando más equipos...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {isSearching && (
            <div className="absolute inset-0 bg-slate-900/50 z-10 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-cyan-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Buscando...</span>
              </div>
            </div>
          )}
          <CardGrid className="grid-cols-3">
            {equipos.map((equipo) => (
              <EquipoCard
                key={equipo.id}
                equipo={equipo}
                onEdit={(e) => router.push(`/equipos/${e.id}/editar`)}
                onMove={setEquipoToMove}
                onDelete={setEquipoToDelete}
                onReportarAveria={setEquipoToReportAveria}
              />
            ))}
          </CardGrid>
          {/* Trigger para infinite scroll */}
          <div ref={loadMoreRef} className="h-4" />
          {loading && equipos.length > 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400 mr-2" />
              <span className="text-slate-400">Cargando más equipos...</span>
            </div>
          )}
        </div>
      )}

      {/* Sidebar con estadísticas por tipo */}
      {resumen && Object.keys(resumen.porTipo).length > 0 && (
        <EquiposPorTipo data={resumen.porTipo} className="mt-6" />
      )}

      {/* Modals */}
      <MoverEquipoModal
        isOpen={!!equipoToMove}
        onClose={() => setEquipoToMove(null)}
        equipo={equipoToMove}
        autobuses={mockAutobuses}
        ubicaciones={mockUbicaciones}
        laboratorios={mockLaboratorios}
        onSubmit={handleMoveEquipo}
      />

      <ConfirmDialog
        isOpen={!!equipoToDelete}
        onClose={() => setEquipoToDelete(null)}
        onConfirm={handleDeleteEquipo}
        title="Dar de baja equipo"
        message={`¿Estás seguro de que quieres dar de baja el equipo ${equipoToDelete?.codigoInterno}? Esta acción quedará registrada.`}
        variant="danger"
        confirmText="Dar de baja"
      />

      {/* Modal Reportar Avería (Quick Action) */}
      <ConfirmDialog
        isOpen={!!equipoToReportAveria}
        onClose={() => setEquipoToReportAveria(null)}
        onConfirm={handleReportarAveria}
        title="Reportar avería"
        message={`¿Confirmas que el equipo ${equipoToReportAveria?.codigoInterno} está averiado? Se creará una incidencia automática.`}
        variant="warning"
        confirmText="Confirmar avería"
      />
    </div>
  );
}
