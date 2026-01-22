'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Warehouse,
  Cpu,
  Plus,
  ArrowRightLeft,
  Eye,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Package,
  BarChart3,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Select,
  LoadingPage,
  NotFoundState,
  EmptyState,
  DataTable,
  type Column,
} from '@/components/ui';
import { MoverEquipoModal, type MoverEquipoFormData, EquipoCard } from '@/components/equipos';
import { useToast } from '@/components/ui/Toast';
import { getEquiposByUbicacion, getTiposEquipo, moverEquipo } from '@/lib/firebase/equipos';
import { Equipo, TipoEquipo, ESTADOS_EQUIPO } from '@/types';
import { formatDate } from '@/lib/utils';

// Mock data (reemplazar con datos reales)
const mockAlmacen = {
  id: 'alm1',
  nombre: 'Almacén Central Winfin',
  tipo: 'almacen_winfin',
  direccion: 'Polígono Industrial Zubieta, 12',
  ciudad: 'Donostia',
};

const mockAutobuses = [
  { id: 'bus1', codigo: 'BUS-001', operadorNombre: 'Dbus' },
  { id: 'bus2', codigo: 'BUS-002', operadorNombre: 'Dbus' },
];

const mockUbicaciones = [
  { id: 'alm1', nombre: 'Almacén Central Winfin', tipo: 'almacen_winfin' },
  { id: 'alm2', nombre: 'Almacén Dbus', tipo: 'almacen_operador' },
];

const mockLaboratorios = [
  { id: 'lab1', nombre: 'Laboratorio Winfin' },
  { id: 'lab2', nombre: 'SAT Fabricante' },
];

export default function AlmacenPage() {
  const params = useParams();
  const router = useRouter();
  const almacenId = params.id as string;
  const { success, error: showError, ToastContainer } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [equipos, setEquipos] = React.useState<Equipo[]>([]);
  const [tiposEquipo, setTiposEquipo] = React.useState<TipoEquipo[]>([]);
  const [selectedEquipo, setSelectedEquipo] = React.useState<Equipo | null>(null);
  const [showMoveModal, setShowMoveModal] = React.useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterTipo, setFilterTipo] = React.useState<string>('');
  const [filterEstado, setFilterEstado] = React.useState<string>('');

  // Simular carga de almacén (reemplazar con datos reales)
  const almacen = mockAlmacen;

  React.useEffect(() => {
    loadData();
  }, [almacenId]);

  const loadData = async () => {
    try {
      const [equiposData, tipos] = await Promise.all([
        getEquiposByUbicacion(almacenId),
        getTiposEquipo(),
      ]);

      setEquipos(equiposData);
      setTiposEquipo(tipos);
    } catch (err) {
      console.error('Error loading data:', err);
      showError('Error al cargar los datos del almacén');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar equipos
  const filteredEquipos = React.useMemo(() => {
    return equipos.filter((equipo) => {
      const matchesSearch =
        !searchTerm ||
        equipo.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.numeroSerieFabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (equipo.tipoEquipoNombre || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = !filterTipo || equipo.tipoEquipoId === filterTipo;
      const matchesEstado = !filterEstado || equipo.estado === filterEstado;

      return matchesSearch && matchesTipo && matchesEstado;
    });
  }, [equipos, searchTerm, filterTipo, filterEstado]);

  // Agrupar por tipo para resumen
  const equiposPorTipo = React.useMemo(() => {
    const grupos: Record<string, number> = {};
    equipos.forEach((e) => {
      const tipoNombre = e.tipoEquipoNombre || 'Sin tipo';
      grupos[tipoNombre] = (grupos[tipoNombre] || 0) + 1;
    });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  }, [equipos]);

  // Estadísticas por estado
  const stats = React.useMemo(() => {
    const byState = equipos.reduce((acc, e) => {
      acc[e.estado] = (acc[e.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: equipos.length,
      disponibles: byState[ESTADOS_EQUIPO.EN_ALMACEN] || 0,
      enRevision: byState[ESTADOS_EQUIPO.EN_LABORATORIO] || 0,
      averiados: byState[ESTADOS_EQUIPO.AVERIADO] || 0,
    };
  }, [equipos]);

  const handleMoverEquipo = async (data: MoverEquipoFormData) => {
    if (!selectedEquipo) return;

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
      selectedEquipo.id,
      destino,
      data.tipoMovimiento,
      data.motivo,
      'user-id',
      { comentarios: data.comentarios }
    );

    success('Equipo movido correctamente');
    setShowMoveModal(false);
    setSelectedEquipo(null);
    loadData();
  };

  const columns: Column<Equipo>[] = [
    {
      id: 'codigoInterno',
      header: 'Código',
      accessor: 'codigoInterno',
      sortable: true,
      cell: (equipo: Equipo) => (
        <Link
          href={`/equipos/${equipo.id}`}
          className="font-mono text-cyan-400 hover:text-cyan-300"
        >
          {equipo.codigoInterno}
        </Link>
      ),
    },
    {
      id: 'tipoEquipoNombre',
      header: 'Tipo',
      accessor: 'tipoEquipoNombre',
      sortable: true,
    },
    {
      id: 'numeroSerieFabricante',
      header: 'Nº Serie',
      accessor: 'numeroSerieFabricante',
      cell: (equipo: Equipo) => (
        <span className="font-mono text-sm text-slate-400">
          {equipo.numeroSerieFabricante || '-'}
        </span>
      ),
    },
    {
      id: 'caracteristicas',
      header: 'Marca / Modelo',
      accessor: (equipo) => equipo.caracteristicas?.marca || '-',
      cell: (equipo: Equipo) => (
        <span className="text-slate-300">
          {equipo.caracteristicas?.marca || '-'}
          {equipo.caracteristicas?.modelo && ` / ${equipo.caracteristicas.modelo}`}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      accessor: 'estado',
      cell: (equipo: Equipo) => {
        const variants = {
          [ESTADOS_EQUIPO.EN_ALMACEN]: 'info',
          [ESTADOS_EQUIPO.EN_LABORATORIO]: 'warning',
          [ESTADOS_EQUIPO.AVERIADO]: 'danger',
        } as const;
        return (
          <Badge
            variant={variants[equipo.estado as keyof typeof variants] || 'secondary'}
            size="sm"
          >
            {equipo.estado.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      accessor: () => null,
      cell: (equipo: Equipo) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/equipos/${equipo.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEquipo(equipo);
              setShowMoveModal(true);
            }}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingPage message="Cargando almacén..." />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Almacenes', href: '/inventario' },
          { label: almacen.nombre },
        ]}
        showHome
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <Warehouse className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{almacen.nombre}</h1>
            <p className="text-slate-400">
              {almacen.direccion} • {almacen.ciudad}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => router.push(`/equipos/nuevo?ubicacionId=${almacenId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Equipo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700/50 rounded-lg">
                <Package className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Total en almacén</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.disponibles}</p>
                <p className="text-xs text-slate-400">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Wrench className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.enRevision}</p>
                <p className="text-xs text-slate-400">En revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.averiados}</p>
                <p className="text-xs text-slate-400">Averiados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>
              <BarChart3 className="h-5 w-5 inline mr-2 text-cyan-400" />
              Stock por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equiposPorTipo.length === 0 ? (
              <p className="text-center text-slate-400 py-4">Sin equipos</p>
            ) : (
              <div className="space-y-3">
                {equiposPorTipo.map(([tipo, cantidad]) => (
                  <div key={tipo} className="flex items-center justify-between">
                    <span className="text-slate-300">{tipo}</span>
                    <Badge variant="primary" size="sm">
                      {cantidad}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de equipos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por código, nº serie..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select
                  options={[
                    { value: '', label: 'Todos los tipos' },
                    ...tiposEquipo.map((tipo) => ({ value: tipo.id, label: tipo.nombre })),
                  ]}
                  value={filterTipo}
                  onChange={(v) => setFilterTipo(v)}
                />

                <Select
                  options={[
                    { value: '', label: 'Todos los estados' },
                    { value: ESTADOS_EQUIPO.EN_ALMACEN, label: 'Disponible' },
                    { value: ESTADOS_EQUIPO.EN_LABORATORIO, label: 'En revisión' },
                    { value: ESTADOS_EQUIPO.AVERIADO, label: 'Averiado' },
                  ]}
                  value={filterEstado}
                  onChange={(v) => setFilterEstado(v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla de equipos */}
          <Card>
            <CardContent className="p-0">
              {filteredEquipos.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    title="Sin equipos"
                    description={
                      searchTerm || filterTipo || filterEstado
                        ? 'No se encontraron equipos con los filtros aplicados'
                        : 'Este almacén no tiene equipos registrados'
                    }
                    icon={Cpu}
                  />
                </div>
              ) : (
                <DataTable
                  data={filteredEquipos}
                  columns={columns}
                  pagination={{
                    page: 1,
                    pageSize: 10,
                    total: filteredEquipos.length,
                    onPageChange: () => {},
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal mover equipo */}
      {selectedEquipo && (
        <MoverEquipoModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedEquipo(null);
          }}
          equipo={selectedEquipo}
          autobuses={mockAutobuses}
          ubicaciones={mockUbicaciones.filter((u) => u.id !== almacenId)}
          laboratorios={mockLaboratorios}
          onSubmit={handleMoverEquipo}
        />
      )}
    </div>
  );
}
