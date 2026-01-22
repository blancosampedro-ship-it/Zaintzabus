'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cpu,
  MapPin,
  Calendar,
  Pencil,
  ArrowRightLeft,
  AlertTriangle,
  Trash2,
  Bus,
  Warehouse,
  Wrench,
  ChevronRight,
  Settings,
  Wifi,
  Smartphone,
  Shield,
  Clock,
  FileText,
  History,
  ExternalLink,
} from 'lucide-react';
import {
  MovimientosTimeline,
  MoverEquipoModal,
  type MoverEquipoFormData,
} from '@/components/equipos';
import {
  Breadcrumbs,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  LoadingPage,
  NotFoundState,
  ConfirmDialog,
  Tabs,
  type TabItem,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import {
  getEquipoById,
  getMovimientosEquipo,
  moverEquipo,
  darDeBajaEquipo,
} from '@/lib/firebase/equipos';
import { Equipo, MovimientoEquipo, ESTADOS_EQUIPO } from '@/types';
import { formatDate, formatDistanceToNow } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Mock data (reemplazar con datos reales)
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

const estadoConfig = {
  [ESTADOS_EQUIPO.EN_SERVICIO]: {
    label: 'En Servicio',
    variant: 'success' as const,
    icon: Bus,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  [ESTADOS_EQUIPO.EN_ALMACEN]: {
    label: 'En Almacén',
    variant: 'info' as const,
    icon: Warehouse,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  [ESTADOS_EQUIPO.EN_LABORATORIO]: {
    label: 'En Laboratorio',
    variant: 'warning' as const,
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  [ESTADOS_EQUIPO.AVERIADO]: {
    label: 'Averiado',
    variant: 'danger' as const,
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  [ESTADOS_EQUIPO.BAJA]: {
    label: 'Baja',
    variant: 'secondary' as const,
    icon: Trash2,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
};

export default function EquipoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const equipoId = params.id as string;
  const { success, error: showError, ToastContainer } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [equipo, setEquipo] = React.useState<Equipo | null>(null);
  const [movimientos, setMovimientos] = React.useState<MovimientoEquipo[]>([]);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  React.useEffect(() => {
    loadEquipo();
  }, [equipoId]);

  const loadEquipo = async () => {
    try {
      const [equipoData, movimientosData] = await Promise.all([
        getEquipoById(equipoId),
        getMovimientosEquipo(equipoId),
      ]);

      setEquipo(equipoData);
      setMovimientos(movimientosData);
    } catch (err) {
      console.error('Error loading equipo:', err);
      showError('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveEquipo = async (data: MoverEquipoFormData) => {
    if (!equipo) return;

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
      equipo.id,
      destino,
      data.tipoMovimiento,
      data.motivo,
      'user-id',
      { comentarios: data.comentarios }
    );

    success('Equipo movido correctamente');
    setShowMoveModal(false);
    loadEquipo();
  };

  const handleDeleteEquipo = async () => {
    if (!equipo) return;

    try {
      await darDeBajaEquipo(equipo.id, 'Baja desde detalle de equipo', 'user-id');
      success('Equipo dado de baja correctamente');
      router.push('/equipos');
    } catch (err) {
      showError('Error al dar de baja el equipo');
    }
  };

  if (loading) {
    return <LoadingPage message="Cargando equipo..." />;
  }

  if (!equipo) {
    return (
      <NotFoundState
        entityName="Equipo"
        onGoBack={() => router.push('/equipos')}
      />
    );
  }

  const estado = estadoConfig[equipo.estado];
  const EstadoIcon = estado.icon;

  const tabs: TabItem[] = [
    {
      id: 'info',
      label: 'Información',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Datos técnicos */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Settings className="h-5 w-5 inline mr-2 text-cyan-400" />
                Datos Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Tipo de equipo</dt>
                  <dd className="text-white font-medium">{equipo.tipoEquipoNombre}</dd>
                </div>
                {equipo.numeroSerieFabricante && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Número de serie</dt>
                    <dd className="text-white font-mono">{equipo.numeroSerieFabricante}</dd>
                  </div>
                )}
                {equipo.caracteristicas?.marca && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Marca</dt>
                    <dd className="text-white">{equipo.caracteristicas.marca}</dd>
                  </div>
                )}
                {equipo.caracteristicas?.modelo && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Modelo</dt>
                    <dd className="text-white">{equipo.caracteristicas.modelo}</dd>
                  </div>
                )}
                {equipo.caracteristicas?.firmware && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Firmware</dt>
                    <dd className="text-white font-mono text-sm">
                      {equipo.caracteristicas.firmware}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Datos de red (si aplica) */}
          {(equipo.red?.ip || equipo.red?.mac) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Wifi className="h-5 w-5 inline mr-2 text-blue-400" />
                  Conectividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {equipo.red?.ip && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Dirección IP</dt>
                      <dd className="text-white font-mono">{equipo.red.ip}</dd>
                    </div>
                  )}
                  {equipo.red?.mac && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">MAC Address</dt>
                      <dd className="text-white font-mono">{equipo.red.mac}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Datos SIM (si aplica) */}
          {equipo.sim && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Smartphone className="h-5 w-5 inline mr-2 text-purple-400" />
                  SIM / Telefonía
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {equipo.sim.iccid && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">ICCID</dt>
                      <dd className="text-white font-mono text-sm">{equipo.sim.iccid}</dd>
                    </div>
                  )}
                  {equipo.sim.telefono && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Teléfono</dt>
                      <dd className="text-white">{equipo.sim.telefono}</dd>
                    </div>
                  )}
                  {equipo.sim.operador && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Operador</dt>
                      <dd className="text-white">{equipo.sim.operador}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Garantía */}
          {equipo.garantia && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Shield className="h-5 w-5 inline mr-2 text-green-400" />
                  Garantía
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Estado</dt>
                    <dd>
                      {equipo.garantia.enGarantia ? (
                        <Badge variant="success" size="sm">En garantía</Badge>
                      ) : (
                        <Badge variant="secondary" size="sm">Sin garantía</Badge>
                      )}
                    </dd>
                  </div>
                  {equipo.garantia.fechaFin && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Fecha fin</dt>
                      <dd className="text-white">
                        {formatDate(equipo.garantia.fechaFin)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Clock className="h-5 w-5 inline mr-2 text-slate-400" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Alta en sistema</dt>
                  <dd className="text-white">{formatDate(equipo.fechas.alta)}</dd>
                </div>
                {equipo.fechas.instalacionActual && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Instalación actual</dt>
                    <dd className="text-white">
                      {formatDate(equipo.fechas.instalacionActual)}
                    </dd>
                  </div>
                )}
                {equipo.fechas.ultimaRevision && (
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Última revisión</dt>
                    <dd className="text-white">
                      {formatDate(equipo.fechas.ultimaRevision)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-2xl font-bold text-white">
                    {equipo.estadisticas.totalMovimientos}
                  </p>
                  <p className="text-xs text-slate-400">Movimientos</p>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-2xl font-bold text-white">
                    {equipo.estadisticas.totalAverias}
                  </p>
                  <p className="text-xs text-slate-400">Averías</p>
                </div>
                <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-2xl font-bold text-white">
                    {equipo.estadisticas.diasEnServicio || 0}
                  </p>
                  <p className="text-xs text-slate-400">Días servicio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      id: 'movimientos',
      label: 'Historial',
      icon: <History className="h-4 w-4" />,
      badge: movimientos.length,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <MovimientosTimeline movimientos={movimientos} />
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'incidencias',
      label: 'Incidencias',
      icon: <AlertTriangle className="h-4 w-4" />,
      badge: equipo.estadisticas.totalAverias,
      content: (
        <Card>
          <CardHeader>
            <CardTitle>Incidencias Relacionadas</CardTitle>
          </CardHeader>
          <CardContent>
            {equipo.estadisticas.totalAverias === 0 ? (
              <p className="text-center py-8 text-slate-400">
                No hay incidencias registradas para este equipo
              </p>
            ) : (
              <p className="text-slate-400">
                Lista de incidencias (pendiente de implementar)
              </p>
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Equipos', href: '/equipos' },
          { label: equipo.codigoInterno },
        ]}
        showHome
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <Cpu className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{equipo.codigoInterno}</h1>
            <p className="text-slate-400 mt-1">{equipo.tipoEquipoNombre}</p>
            {equipo.numeroSerieFabricante && (
              <p className="text-sm text-slate-500 mt-1">
                S/N: {equipo.numeroSerieFabricante}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => router.push(`/equipos/${equipo.id}/editar`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={() => setShowMoveModal(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Mover
          </Button>
          {equipo.estado !== ESTADOS_EQUIPO.BAJA && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Baja
            </Button>
          )}
        </div>
      </div>

      {/* Estado y ubicación destacados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estado */}
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center gap-4',
            estado.bgColor,
            estado.borderColor
          )}
        >
          <div className={cn('p-3 rounded-lg', estado.bgColor)}>
            <EstadoIcon className={cn('h-6 w-6', estado.color)} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Estado actual</p>
            <p className={cn('text-lg font-semibold', estado.color)}>
              {estado.label}
            </p>
          </div>
        </div>

        {/* Ubicación */}
        <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-slate-700/50">
            <MapPin className="h-6 w-6 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-400">Ubicación actual</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-white">
                {equipo.ubicacionActual.nombre}
              </p>
              {equipo.ubicacionActual.posicionEnBus && (
                <Badge variant="primary" size="sm">
                  {equipo.ubicacionActual.posicionEnBus}
                </Badge>
              )}
            </div>
          </div>
          {equipo.ubicacionActual.tipo === 'autobus' && (
            <Link
              href={`/autobuses/${equipo.ubicacionActual.id}/equipos`}
              className="p-2 text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Tabs con contenido */}
      <Tabs tabs={tabs} />

      {/* Modals */}
      <MoverEquipoModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        equipo={equipo}
        autobuses={mockAutobuses}
        ubicaciones={mockUbicaciones}
        laboratorios={mockLaboratorios}
        onSubmit={handleMoveEquipo}
      />

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteEquipo}
        title="Dar de baja equipo"
        message={`¿Estás seguro de que quieres dar de baja el equipo ${equipo.codigoInterno}? Esta acción quedará registrada en el historial.`}
        variant="danger"
        confirmText="Dar de baja"
      />
    </div>
  );
}
