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
  type Column,
} from '@/components/ui';
import {
  getEquipos,
  getResumenEquipos,
  getTiposEquipo,
  moverEquipo,
  darDeBajaEquipo,
  type ResumenEquipos,
} from '@/lib/firebase/equipos';
import { Equipo, TipoEquipo, ESTADOS_EQUIPO } from '@/types';
import {
  Cpu,
  MapPin,
  Bus,
  Warehouse,
  Wrench,
  AlertTriangle,
  Trash2,
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

  const [loading, setLoading] = React.useState(true);
  const [equipos, setEquipos] = React.useState<Equipo[]>([]);
  const [resumen, setResumen] = React.useState<ResumenEquipos | null>(null);
  const [tiposEquipo, setTiposEquipo] = React.useState<TipoEquipo[]>([]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('table');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const [filters, setFilters] = React.useState<EquiposFilters>({
    busqueda: '',
    tipoEquipoId: '',
    estado: '',
    operadorId: '',
    ubicacionTipo: '',
  });

  // Modal states
  const [equipoToMove, setEquipoToMove] = React.useState<Equipo | null>(null);
  const [equipoToDelete, setEquipoToDelete] = React.useState<Equipo | null>(null);

  // Load initial data
  React.useEffect(() => {
    loadData();
  }, []);

  // Reload when filters change
  React.useEffect(() => {
    loadEquipos();
  }, [filters]);

  const loadData = async () => {
    try {
      const [tipos, resumenData] = await Promise.all([
        getTiposEquipo(),
        getResumenEquipos(),
      ]);
      setTiposEquipo(tipos);
      setResumen(resumenData);
      await loadEquipos();
    } catch (err) {
      console.error('Error loading data:', err);
      showError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadEquipos = async () => {
    try {
      const result = await getEquipos({
        tipoEquipoId: filters.tipoEquipoId || undefined,
        estado: filters.estado || undefined,
        operadorId: filters.operadorId || undefined,
        ubicacionTipo: filters.ubicacionTipo || undefined,
        pageSize: 100,
      });
      
      // Filter by search term client-side
      let filtered = result.items;
      if (filters.busqueda) {
        const search = filters.busqueda.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.codigoInterno.toLowerCase().includes(search) ||
            e.numeroSerieFabricante?.toLowerCase().includes(search) ||
            e.tipoEquipoNombre?.toLowerCase().includes(search)
        );
      }

      setEquipos(filtered);
    } catch (err) {
      console.error('Error loading equipos:', err);
    }
  };

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
    loadEquipos();
    loadData(); // Refresh stats
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
      loadEquipos();
      loadData();
    } catch (err) {
      showError('Error al dar de baja el equipo');
    }
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    success('Función de exportación en desarrollo');
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
      id: 'numeroSerie',
      header: 'Nº Serie',
      accessor: 'numeroSerieFabricante',
      cell: (equipo) => (
        <span className="text-slate-400">
          {equipo.numeroSerieFabricante || '-'}
        </span>
      ),
    },
    {
      id: 'marca',
      header: 'Marca/Modelo',
      accessor: (equipo) =>
        equipo.caracteristicas?.marca
          ? `${equipo.caracteristicas.marca} ${equipo.caracteristicas.modelo || ''}`
          : '-',
    },
    {
      id: 'ubicacion',
      header: 'Ubicación',
      accessor: (equipo) => equipo.ubicacionActual.nombre,
      cell: (equipo) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <span>{equipo.ubicacionActual.nombre}</span>
          {equipo.ubicacionActual.posicionEnBus && (
            <span className="text-xs text-slate-500">
              ({equipo.ubicacionActual.posicionEnBus})
            </span>
          )}
        </div>
      ),
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

  if (loading) {
    return <LoadingPage message="Cargando equipos..." />;
  }

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
      {equipos.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="No hay equipos"
          description="Comienza añadiendo el primer equipo al sistema"
          action={{
            label: 'Nuevo Equipo',
            onClick: () => router.push('/equipos/nuevo'),
          }}
        />
      ) : viewMode === 'table' ? (
        <DataTable
          data={equipos}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(equipo) => router.push(`/equipos/${equipo.id}`)}
          actions={(equipo) => (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEquipoToMove(equipo);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded"
                title="Mover"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      ) : (
        <CardGrid className="grid-cols-3">
          {equipos.map((equipo) => (
            <EquipoCard
              key={equipo.id}
              equipo={equipo}
              onEdit={(e) => router.push(`/equipos/${e.id}/editar`)}
              onMove={setEquipoToMove}
              onDelete={setEquipoToDelete}
            />
          ))}
        </CardGrid>
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
    </div>
  );
}
