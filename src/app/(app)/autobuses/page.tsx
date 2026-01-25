'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus,
  Plus,
  Cpu,
  Eye,
  Edit,
  Settings,
  ArrowRightLeft,
  Trash2,
  CheckCircle,
  Wrench,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  DataTable,
  Column,
  LoadingPage,
  EmptyState,
  ConfirmDialog,
  Dropdown,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  AutobusCard,
  FlotaGrid,
  FlotaLegend,
  FlotaStats,
  InstalacionStats,
  AutobusesToolbar,
  type AutobusesFilters,
} from '@/components/autobuses';
import {
  getAutobuses,
  getResumenFlota,
  darDeBajaAutobus,
  type ResumenFlota,
} from '@/lib/firebase/autobuses';
import { getActivos, getResumenActivos } from '@/lib/firebase/activos';
import { useTenantId } from '@/contexts/OperadorContext';
import { Autobus, Activo, ESTADOS_AUTOBUS, FASES_INSTALACION, FaseInstalacion, EstadoAutobus } from '@/types';
import { cn } from '@/lib/utils';

// Datos de operadores y marcas (se cargarán dinámicamente en el futuro)
const mockOperadores = [
  { id: 'lurraldebus-gipuzkoa', nombre: 'Lurraldebus Gipuzkoa' },
];

// Función para convertir Activo a formato Autobus para la UI
function activoToAutobus(activo: Activo): Autobus {
  // Determinar fase de instalación basándose en equipos instalados
  const numEquipos = activo.equipos?.length || 0;
  
  const getFaseInstalacion = (): FaseInstalacion => {
    if (numEquipos > 10) return 'completa';
    if (numEquipos > 0) return 'pre_instalacion';
    return 'pendiente';
  };

  // Mapear estado del activo al estado del autobús
  const getEstadoAutobus = (): EstadoAutobus => {
    if (activo.estado === 'en_taller' || activo.estado === 'averiado') return 'en_taller';
    if (activo.estado === 'baja') return 'baja';
    return 'operativo';
  };

  return {
    id: activo.id,
    codigo: activo.codigo,
    matricula: activo.matricula || '',
    numeroChasis: activo.numeroSerie,
    marca: activo.marca || 'MERCEDES',
    modelo: activo.modelo,
    anio: activo.anioFabricacion || activo.anyoFabricacion,
    operadorId: activo.tenantId,
    estado: getEstadoAutobus(),
    instalacion: { fase: getFaseInstalacion() },
    contadores: {
      totalEquipos: numEquipos,
      totalAverias: 0,
    },
    auditoria: {
      createdAt: activo.createdAt,
      updatedAt: activo.updatedAt,
    },
  };
}

export default function AutobusesPage() {
  const router = useRouter();
  const { ToastContainer, success, error: showError } = useToast();
  const tenantId = useTenantId();

  const [loading, setLoading] = React.useState(true);
  const [autobuses, setAutobuses] = React.useState<Autobus[]>([]);
  const [marcas, setMarcas] = React.useState<string[]>([]);
  const [resumen, setResumen] = React.useState<ResumenFlota | null>(null);
  const [filters, setFilters] = React.useState<AutobusesFilters>({});
  const [view, setView] = React.useState<'grid' | 'table'>('grid');
  const [busToDelete, setBusToDelete] = React.useState<Autobus | null>(null);

  // DEBUG: Ver qué tenantId tenemos
  console.log('[Autobuses] DEBUG tenantId:', tenantId, '| tipo:', typeof tenantId);

  React.useEffect(() => {
    console.log('[Autobuses] useEffect - tenantId:', tenantId);
    if (tenantId) {
      loadData();
    } else {
      console.warn('[Autobuses] No hay tenantId, no se cargan datos');
      setLoading(false);
    }
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    
    console.log('[Autobuses] Cargando datos para tenant:', tenantId);
    setLoading(true);
    try {
      // Cargar activos reales de Firestore
      const activos = await getActivos(tenantId);
      console.log('[Autobuses] getActivos retornó:', activos.length, 'items');
      
      // Todos los documentos en la colección 'autobuses' son autobuses por definición
      // Convertir Activos a formato Autobus para la UI
      const autobusesData = activos.map(activoToAutobus);
      setAutobuses(autobusesData);

      // Extraer marcas únicas para el filtro
      const marcasSet = new Set<string>();
      autobusesData.forEach(b => { if (b.marca) marcasSet.add(b.marca); });
      setMarcas(Array.from(marcasSet));

      // Calcular resumen
      setResumen({
        total: autobusesData.length,
        operativos: autobusesData.filter((b) => b.estado === ESTADOS_AUTOBUS.OPERATIVO).length,
        enTaller: autobusesData.filter((b) => b.estado === ESTADOS_AUTOBUS.EN_TALLER).length,
        baja: autobusesData.filter((b) => b.estado === ESTADOS_AUTOBUS.BAJA).length,
        porFaseInstalacion: {
          pendiente: autobusesData.filter((b) => b.instalacion?.fase === FASES_INSTALACION.PENDIENTE).length,
          preinstalacion: autobusesData.filter((b) => b.instalacion?.fase === FASES_INSTALACION.PREINSTALACION).length,
          completa: autobusesData.filter((b) => b.instalacion?.fase === FASES_INSTALACION.COMPLETA).length,
        },
        conEquiposAveriados: autobusesData.filter((b) => b.contadores.totalAverias > 0).length,
      });
      
      console.log(`✅ Cargados ${autobusesData.length} autobuses de Firestore`);
    } catch (err) {
      console.error('Error loading autobuses:', err);
      showError('Error al cargar los autobuses');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar autobuses
  const filteredAutobuses = React.useMemo(() => {
    return autobuses.filter((bus) => {
      if (filters.operadorId && bus.operadorId !== filters.operadorId) return false;
      if (filters.estado && bus.estado !== filters.estado) return false;
      if (filters.faseInstalacion && bus.instalacion?.fase !== filters.faseInstalacion) return false;
      if (filters.marca && bus.marca !== filters.marca) return false;
      if (filters.busqueda) {
        const search = filters.busqueda.toLowerCase();
        const matchCodigo = bus.codigo.toLowerCase().includes(search);
        const matchMatricula = bus.matricula.toLowerCase().includes(search);
        const matchMarca = bus.marca?.toLowerCase().includes(search);
        const matchModelo = bus.modelo?.toLowerCase().includes(search);
        if (!matchCodigo && !matchMatricula && !matchMarca && !matchModelo) return false;
      }
      return true;
    });
  }, [autobuses, filters]);

  // Equipos por bus (calculados desde los autobuses cargados)
  const equiposPorBus = React.useMemo(() => {
    const map = new Map<string, { total: number; operativos: number; averiados: number }>();
    autobuses.forEach((bus) => {
      map.set(bus.id, {
        total: bus.contadores.totalEquipos,
        operativos: bus.contadores.totalEquipos - bus.contadores.totalAverias,
        averiados: bus.contadores.totalAverias,
      });
    });
    return map;
  }, [autobuses]);

  const handleDeleteBus = async () => {
    if (!busToDelete) return;

    try {
      // En producción:
      // await darDeBajaAutobus(busToDelete.id, 'Baja manual', 'mover_almacen');
      
      // Mock
      setAutobuses((prev) =>
        prev.map((b) =>
          b.id === busToDelete.id ? { ...b, estado: ESTADOS_AUTOBUS.BAJA } : b
        )
      );
      success('Autobús dado de baja correctamente');
    } catch (err) {
      console.error('Error deleting bus:', err);
      showError('Error al dar de baja el autobús');
    } finally {
      setBusToDelete(null);
    }
  };

  // Columnas para vista tabla
  const columns: Column<Autobus>[] = [
    {
      id: 'codigo',
      header: 'Código',
      accessor: 'codigo',
      sortable: true,
      cell: (bus: Autobus) => (
        <Link
          href={`/autobuses/${bus.id}`}
          className="font-mono font-bold text-cyan-400 hover:text-cyan-300"
        >
          {bus.codigo}
        </Link>
      ),
    },
    {
      id: 'matricula',
      header: 'Matrícula',
      accessor: 'matricula',
      sortable: true,
    },
    {
      id: 'marca',
      header: 'Vehículo',
      accessor: (bus) => `${bus.marca || ''} ${bus.modelo || ''}`.trim() || '-',
    },
    {
      id: 'operador',
      header: 'Operador',
      accessor: (bus) => mockOperadores.find((o) => o.id === bus.operadorId)?.nombre || '-',
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: 'estado',
      cell: (bus: Autobus) => {
        const config = {
          [ESTADOS_AUTOBUS.OPERATIVO]: { variant: 'success' as const, icon: CheckCircle, label: 'Operativo' },
          [ESTADOS_AUTOBUS.EN_TALLER]: { variant: 'warning' as const, icon: Wrench, label: 'En taller' },
          [ESTADOS_AUTOBUS.BAJA]: { variant: 'danger' as const, icon: XCircle, label: 'Baja' },
        };
        const c = config[bus.estado];
        const Icon = c.icon;
        return (
          <Badge variant={c.variant} size="sm">
            <Icon className="h-3 w-3 mr-1" />
            {c.label}
          </Badge>
        );
      },
    },
    {
      id: 'instalacion',
      header: 'Instalación',
      accessor: (bus) => bus.instalacion?.fase || FASES_INSTALACION.PENDIENTE,
      cell: (bus: Autobus) => {
        const fase = bus.instalacion?.fase || FASES_INSTALACION.PENDIENTE;
        const config = {
          [FASES_INSTALACION.PENDIENTE]: { variant: 'secondary' as const, label: 'Pendiente' },
          [FASES_INSTALACION.PREINSTALACION]: { variant: 'warning' as const, label: 'Pre-inst.' },
          [FASES_INSTALACION.COMPLETA]: { variant: 'success' as const, label: 'Completa' },
        };
        const c = config[fase];
        return <Badge variant={c.variant} size="sm">{c.label}</Badge>;
      },
    },
    {
      id: 'equipos',
      header: 'Equipos',
      accessor: (bus) => bus.contadores.totalEquipos,
      cell: (bus: Autobus) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-300">{bus.contadores.totalEquipos}</span>
          {bus.contadores.totalAverias > 0 && (
            <span className="flex items-center gap-1 text-amber-500 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {bus.contadores.totalAverias}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      accessor: () => null,
      cell: (bus: Autobus) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm">
              •••
            </Button>
          }
          sections={[
            {
              items: [
                { label: 'Ver detalles', onClick: () => router.push(`/autobuses/${bus.id}`), icon: Eye },
                { label: 'Editar', onClick: () => router.push(`/autobuses/${bus.id}/editar`), icon: Edit },
                { label: 'Gestionar equipos', onClick: () => router.push(`/autobuses/${bus.id}/equipos`), icon: Settings },
              ],
            },
            {
              items: [
                { label: 'Dar de baja', onClick: () => setBusToDelete(bus), icon: Trash2, danger: true },
              ],
            },
          ]}
          align="right"
        />
      ),
    },
  ];

  if (loading) {
    return <LoadingPage message="Cargando flota..." />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: 'Autobuses' }]}
        showHome
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="h-7 w-7 text-cyan-400" />
            Gestión de Flota
          </h1>
          <p className="text-slate-400 mt-1">
            Administra los autobuses y sus equipos embarcados
          </p>
        </div>
        <Button onClick={() => router.push('/autobuses/nuevo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Autobús
        </Button>
      </div>

      {/* Estadísticas */}
      {resumen && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FlotaStats resumen={resumen} />
          </div>
          <InstalacionStats resumen={resumen} />
        </div>
      )}

      {/* Toolbar */}
      <AutobusesToolbar
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        operadores={mockOperadores}
        marcas={marcas}
        onCreateNew={() => router.push('/autobuses/nuevo')}
        totalResults={filteredAutobuses.length}
      />

      {/* Contenido principal */}
      {filteredAutobuses.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="No hay autobuses"
          description={
            Object.keys(filters).length > 0
              ? 'No se encontraron autobuses con los filtros aplicados'
              : 'Aún no hay autobuses registrados en el sistema'
          }
          action={
            Object.keys(filters).length > 0
              ? { label: 'Limpiar filtros', onClick: () => setFilters({}) }
              : { label: 'Crear autobús', onClick: () => router.push('/autobuses/nuevo') }
          }
        />
      ) : view === 'grid' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vista de Flota</CardTitle>
              <FlotaLegend />
            </div>
          </CardHeader>
          <CardContent>
            <FlotaGrid
              autobuses={filteredAutobuses}
              equiposPorBus={equiposPorBus}
              operadores={mockOperadores}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              data={filteredAutobuses}
              columns={columns}
              pagination={{
                page: 1,
                pageSize: 20,
                total: filteredAutobuses.length,
                onPageChange: () => {},
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Diálogo de confirmación de baja */}
      <ConfirmDialog
        isOpen={!!busToDelete}
        onClose={() => setBusToDelete(null)}
        onConfirm={handleDeleteBus}
        title="Dar de baja autobús"
        message={
          busToDelete
            ? `¿Estás seguro de dar de baja el autobús ${busToDelete.codigo}? ${
                busToDelete.contadores?.totalEquipos && busToDelete.contadores.totalEquipos > 0
                  ? `Los ${busToDelete.contadores.totalEquipos} equipos instalados serán movidos al almacén.`
                  : ''
              }`
            : ''
        }
        confirmText="Dar de baja"
        variant="danger"
      />
    </div>
  );
}
