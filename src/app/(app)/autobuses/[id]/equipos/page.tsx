'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus,
  Cpu,
  Plus,
  ArrowRightLeft,
  Eye,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Wifi,
  Video,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  Breadcrumbs,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  LoadingPage,
  NotFoundState,
  EmptyState,
  ConfirmDialog,
} from '@/components/ui';
import { MoverEquipoModal, type MoverEquipoFormData } from '@/components/equipos';
import { useToast } from '@/components/ui/Toast';
import { getEquiposByAutobus, moverEquipo } from '@/lib/firebase/equipos';
import { Equipo, ESTADOS_EQUIPO } from '@/types';
import { cn } from '@/lib/utils';

// Mock data (reemplazar con datos reales)
const mockAutobus = {
  id: 'bus1',
  codigo: 'BUS-001',
  matricula: '1234-ABC',
  operadorId: 'op1',
  operadorNombre: 'Dbus',
  modelo: 'Mercedes Citaro',
  linea: 'L28',
};

const mockUbicaciones = [
  { id: 'alm1', nombre: 'Almacén Central Winfin', tipo: 'almacen_winfin' },
  { id: 'alm2', nombre: 'Almacén Dbus', tipo: 'almacen_operador' },
];

const mockLaboratorios = [
  { id: 'lab1', nombre: 'Laboratorio Winfin' },
  { id: 'lab2', nombre: 'SAT Fabricante' },
];

// Iconos según tipo de equipo
const tipoIconos: Record<string, React.ComponentType<{ className?: string }>> = {
  SAE: Monitor,
  RADIO: Wifi,
  DVR: Video,
  ROUTER: Wifi,
  MODEM: Smartphone,
  DEFAULT: Cpu,
};

// Posiciones disponibles en el bus
const POSICIONES_BUS = {
  CABINA_CONDUCTOR: 'Cabina del conductor',
  SALPICADERO: 'Salpicadero',
  TECHO_DELANTERO: 'Techo delantero',
  TECHO_CENTRAL: 'Techo central',
  TECHO_TRASERO: 'Techo trasero',
  LATERAL_IZQUIERDO: 'Lateral izquierdo',
  LATERAL_DERECHO: 'Lateral derecho',
  ZONA_PASAJEROS_DELANTERA: 'Zona pasajeros delantera',
  ZONA_PASAJEROS_CENTRAL: 'Zona pasajeros central',
  ZONA_PASAJEROS_TRASERA: 'Zona pasajeros trasera',
  MALETERO: 'Maletero',
} as const;

// Posiciones en el bus con coordenadas para el esquema visual
const posicionesSchema: Record<
  string,
  { x: number; y: number; width: number; height: number; label: string }
> = {
  CABINA_CONDUCTOR: { x: 10, y: 10, width: 80, height: 60, label: 'Cabina' },
  SALPICADERO: { x: 100, y: 15, width: 60, height: 50, label: 'Salpicadero' },
  TECHO_DELANTERO: { x: 10, y: 80, width: 150, height: 30, label: 'Techo Delantero' },
  TECHO_CENTRAL: { x: 170, y: 80, width: 160, height: 30, label: 'Techo Central' },
  TECHO_TRASERO: { x: 340, y: 80, width: 150, height: 30, label: 'Techo Trasero' },
  LATERAL_IZQUIERDO: { x: 10, y: 120, width: 480, height: 25, label: 'Lateral Izquierdo' },
  LATERAL_DERECHO: { x: 10, y: 180, width: 480, height: 25, label: 'Lateral Derecho' },
  ZONA_PASAJEROS_DELANTERA: { x: 100, y: 150, width: 120, height: 25, label: 'Pasajeros Delantera' },
  ZONA_PASAJEROS_CENTRAL: { x: 230, y: 150, width: 120, height: 25, label: 'Pasajeros Central' },
  ZONA_PASAJEROS_TRASERA: { x: 360, y: 150, width: 120, height: 25, label: 'Pasajeros Trasera' },
  MALETERO: { x: 340, y: 210, width: 150, height: 40, label: 'Maletero' },
};

export default function AutobusEquiposPage() {
  const params = useParams();
  const router = useRouter();
  const autobusId = params.id as string;
  const { success, error: showError, ToastContainer } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [equipos, setEquipos] = React.useState<Equipo[]>([]);
  const [selectedEquipo, setSelectedEquipo] = React.useState<Equipo | null>(null);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [hoveredPosition, setHoveredPosition] = React.useState<string | null>(null);

  // Simular carga de autobus (reemplazar con datos reales)
  const autobus = mockAutobus;

  React.useEffect(() => {
    loadEquipos();
  }, [autobusId]);

  const loadEquipos = async () => {
    try {
      const equiposData = await getEquiposByAutobus(autobusId);
      setEquipos(equiposData);
    } catch (err) {
      console.error('Error loading equipos:', err);
      showError('Error al cargar los equipos del autobús');
    } finally {
      setLoading(false);
    }
  };

  const getEquiposByPosition = (posicion: string) => {
    return equipos.filter((e) => e.ubicacionActual.posicionEnBus === posicion);
  };

  const getTotalByState = (estado: string) => {
    return equipos.filter((e) => e.estado === estado).length;
  };

  const handleMoverEquipo = async (data: MoverEquipoFormData) => {
    if (!selectedEquipo) return;

    const destino = {
      tipo: data.destinoTipo,
      id: data.destinoId,
      nombre:
        data.destinoTipo === 'ubicacion'
          ? mockUbicaciones.find((u) => u.id === data.destinoId)?.nombre || ''
          : mockLaboratorios.find((l) => l.id === data.destinoId)?.nombre || '',
    };

    await moverEquipo(
      selectedEquipo.id,
      destino,
      data.tipoMovimiento,
      data.motivo,
      'user-id',
      { comentarios: data.comentarios }
    );

    success('Equipo desinstalado correctamente');
    setShowMoveModal(false);
    setSelectedEquipo(null);
    loadEquipos();
  };

  const getPositionColor = (posicion: string) => {
    const equiposEnPosicion = getEquiposByPosition(posicion);
    if (equiposEnPosicion.length === 0) return 'bg-slate-700/50 border-slate-600';

    const hasAveriado = equiposEnPosicion.some((e) => e.estado === ESTADOS_EQUIPO.AVERIADO);
    if (hasAveriado) return 'bg-red-500/20 border-red-500/50';

    return 'bg-green-500/20 border-green-500/50';
  };

  const getIconForEquipo = (equipo: Equipo) => {
    const tipoCodigo = equipo.tipoEquipoNombre?.toUpperCase() || '';
    for (const [key, Icon] of Object.entries(tipoIconos)) {
      if (tipoCodigo.includes(key)) {
        return Icon;
      }
    }
    return tipoIconos.DEFAULT;
  };

  if (loading) {
    return <LoadingPage message="Cargando equipos del autobús..." />;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Autobuses', href: '/activos' },
          { label: autobus.codigo },
          { label: 'Equipos embarcados' },
        ]}
        showHome
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
            <Bus className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{autobus.codigo}</h1>
            <p className="text-slate-400">
              {autobus.modelo} • {autobus.matricula} • Línea {autobus.linea}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.push(`/activos/${autobusId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Ficha
          </Button>
          <Button onClick={() => router.push(`/equipos/nuevo?autobusId=${autobusId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Instalar Equipo
          </Button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700/50 rounded-lg">
                <Cpu className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{equipos.length}</p>
                <p className="text-xs text-slate-400">Total equipos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {getTotalByState(ESTADOS_EQUIPO.EN_SERVICIO)}
                </p>
                <p className="text-xs text-slate-400">Operativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Settings className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">
                  {getTotalByState(ESTADOS_EQUIPO.EN_LABORATORIO)}
                </p>
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
                <p className="text-2xl font-bold text-red-400">
                  {getTotalByState(ESTADOS_EQUIPO.AVERIADO)}
                </p>
                <p className="text-xs text-slate-400">Averiados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Esquema visual del bus */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          {equipos.length === 0 ? (
            <EmptyState
              title="Sin equipos instalados"
              description="Este autobús no tiene equipos embarcados registrados"
              icon={Cpu}
              action={{
                label: 'Instalar primer equipo',
                onClick: () => router.push(`/equipos/nuevo?autobusId=${autobusId}`),
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          ) : (
            <div className="relative">
              {/* Esquema SVG del bus */}
              <div className="w-full overflow-x-auto">
                <svg viewBox="0 0 500 260" className="w-full min-w-[500px] h-auto">
                  {/* Contorno del bus */}
                  <rect
                    x="5"
                    y="5"
                    width="490"
                    height="250"
                    rx="20"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="2"
                  />

                  {/* Cabina (frontal) */}
                  <rect
                    x="5"
                    y="5"
                    width="90"
                    height="250"
                    rx="20"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />

                  {/* Ruedas */}
                  <ellipse cx="60" cy="255" rx="30" ry="8" fill="#1e293b" stroke="#475569" />
                  <ellipse cx="440" cy="255" rx="30" ry="8" fill="#1e293b" stroke="#475569" />

                  {/* Posiciones */}
                  {Object.entries(posicionesSchema).map(([key, pos]) => {
                    const equiposEnPos = getEquiposByPosition(key);
                    const isHovered = hoveredPosition === key;

                    return (
                      <g key={key}>
                        <rect
                          x={pos.x}
                          y={pos.y}
                          width={pos.width}
                          height={pos.height}
                          rx="4"
                          className={cn(
                            'cursor-pointer transition-all duration-200',
                            equiposEnPos.length > 0
                              ? equiposEnPos.some((e) => e.estado === ESTADOS_EQUIPO.AVERIADO)
                                ? 'fill-red-500/30 stroke-red-500'
                                : 'fill-green-500/30 stroke-green-500'
                              : 'fill-slate-700/50 stroke-slate-600',
                            isHovered && 'fill-cyan-500/30 stroke-cyan-400'
                          )}
                          strokeWidth={isHovered ? 2 : 1}
                          onMouseEnter={() => setHoveredPosition(key)}
                          onMouseLeave={() => setHoveredPosition(null)}
                        />

                        {/* Contador de equipos */}
                        {equiposEnPos.length > 0 && (
                          <g>
                            <circle
                              cx={pos.x + pos.width - 12}
                              cy={pos.y + 12}
                              r="10"
                              fill="#0ea5e9"
                            />
                            <text
                              x={pos.x + pos.width - 12}
                              y={pos.y + 16}
                              textAnchor="middle"
                              className="fill-white text-xs font-bold"
                            >
                              {equiposEnPos.length}
                            </text>
                          </g>
                        )}

                        {/* Etiqueta */}
                        <text
                          x={pos.x + pos.width / 2}
                          y={pos.y + pos.height / 2 + 4}
                          textAnchor="middle"
                          className="fill-slate-400 text-[8px] pointer-events-none"
                        >
                          {pos.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Leyenda */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500" />
                  <span className="text-sm text-slate-400">Equipo operativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500" />
                  <span className="text-sm text-slate-400">Equipo averiado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600" />
                  <span className="text-sm text-slate-400">Sin equipos</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle de posición seleccionada */}
      {hoveredPosition && getEquiposByPosition(hoveredPosition).length > 0 && (
        <Card className="border-cyan-500/50">
          <CardHeader>
            <CardTitle className="text-cyan-400">
              {POSICIONES_BUS[hoveredPosition as keyof typeof POSICIONES_BUS]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getEquiposByPosition(hoveredPosition).map((equipo) => {
                const Icon = getIconForEquipo(equipo);
                return (
                  <div
                    key={equipo.id}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700 rounded-lg">
                          <Icon className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <Link
                            href={`/equipos/${equipo.id}`}
                            className="text-white font-medium hover:text-cyan-400 transition-colors"
                          >
                            {equipo.codigoInterno}
                          </Link>
                          <p className="text-sm text-slate-400">{equipo.tipoEquipoNombre}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          equipo.estado === ESTADOS_EQUIPO.AVERIADO
                            ? 'danger'
                            : equipo.estado === ESTADOS_EQUIPO.EN_SERVICIO
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {equipo.estado.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/equipos/${equipo.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipo(equipo);
                          setShowMoveModal(true);
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        Desinstalar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista completa de equipos */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Equipos ({equipos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {equipos.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              No hay equipos instalados en este autobús
            </p>
          ) : (
            <div className="space-y-3">
              {equipos.map((equipo) => {
                const Icon = getIconForEquipo(equipo);
                return (
                  <div
                    key={equipo.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-700 rounded-lg">
                        <Icon className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <Link
                          href={`/equipos/${equipo.id}`}
                          className="text-white font-medium hover:text-cyan-400 transition-colors"
                        >
                          {equipo.codigoInterno}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span>{equipo.tipoEquipoNombre}</span>
                          {equipo.ubicacionActual.posicionEnBus && (
                            <>
                              <span>•</span>
                              <span>
                                {
                                  POSICIONES_BUS[
                                    equipo.ubicacionActual.posicionEnBus as keyof typeof POSICIONES_BUS
                                  ]
                                }
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          equipo.estado === ESTADOS_EQUIPO.AVERIADO
                            ? 'danger'
                            : equipo.estado === ESTADOS_EQUIPO.EN_SERVICIO
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {equipo.estado.replace(/_/g, ' ')}
                      </Badge>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal mover equipo */}
      {selectedEquipo && (
        <MoverEquipoModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedEquipo(null);
          }}
          equipo={selectedEquipo}
          autobuses={[]} // No permitir mover a otro bus directamente
          ubicaciones={mockUbicaciones}
          laboratorios={mockLaboratorios}
          onSubmit={handleMoverEquipo}
        />
      )}
    </div>
  );
}
