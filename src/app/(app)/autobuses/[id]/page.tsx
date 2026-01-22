'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bus, 
  ArrowLeft, 
  Edit, 
  Settings, 
  AlertTriangle,
  Wrench,
  Calendar,
  Cpu,
  Monitor,
  Radio,
  Clock,
  CheckCircle,
  ChevronRight,
  MoreVertical,
  Download,
  History,
  Package,
  Play,
  Ban,
  Eye
} from 'lucide-react';
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  LoadingPage,
  NotFoundState,
  Breadcrumbs,
  Dropdown,
  ConfirmDialog,
  Skeleton,
} from '@/components/ui';
import { Separator } from '@/components/ui/separator';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs-radix';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Autobus, 
  Equipo, 
  Incidencia, 
  Preventivo,
  ESTADOS_AUTOBUS,
  FASES_INSTALACION,
  ESTADOS_EQUIPO,
  EstadoAutobus
} from '@/types';
import { BusSchema, EquiposList } from '@/components/autobuses';
import { formatDate, formatDistanceToNow, cn } from '@/lib/utils';

// ==================== CONFIGURACIÓN ====================

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  [ESTADOS_AUTOBUS.OPERATIVO]: { 
    label: 'Operativo', 
    color: 'bg-green-500', 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  [ESTADOS_AUTOBUS.EN_TALLER]: { 
    label: 'En Taller', 
    color: 'bg-amber-500', 
    icon: <Wrench className="h-4 w-4" /> 
  },
  [ESTADOS_AUTOBUS.BAJA]: { 
    label: 'Baja', 
    color: 'bg-red-500', 
    icon: <Ban className="h-4 w-4" /> 
  },
};

const FASE_CONFIG: Record<string, { label: string; color: string; progress: number }> = {
  [FASES_INSTALACION.PENDIENTE]: { label: 'Pendiente', color: 'bg-slate-400', progress: 0 },
  [FASES_INSTALACION.PREINSTALACION]: { label: 'Pre-instalación', color: 'bg-blue-500', progress: 50 },
  [FASES_INSTALACION.COMPLETA]: { label: 'Completa', color: 'bg-green-500', progress: 100 },
};

// ==================== TIPOS LOCALES ====================

interface AutobusDetalle extends Autobus {
  operadorNombre?: string;
}

interface EquipoConEstado extends Equipo {
  tieneIncidencias?: boolean;
}

// ==================== COMPONENTES AUXILIARES ====================

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function AutobusNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Bus className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">Autobús no encontrado</h2>
      <p className="text-muted-foreground mb-4">
        El autobús que buscas no existe o ha sido eliminado.
      </p>
      <Button asChild>
        <Link href="/autobuses">Volver al listado</Link>
      </Button>
    </div>
  );
}

// Componente de información del vehículo
function VehiculoInfo({ autobus }: { autobus: AutobusDetalle }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bus className="h-5 w-5" />
          Datos del Vehículo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Marca</p>
            <p className="font-medium">{autobus.marca}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Modelo</p>
            <p className="font-medium">{autobus.modelo}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Carrocería</p>
            <p className="font-medium">{autobus.carroceria || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Año</p>
            <p className="font-medium">{autobus.anio || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Matrícula</p>
            <p className="font-medium font-mono">{autobus.matricula}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nº Chasis</p>
            <p className="font-medium font-mono text-sm">{autobus.numeroChasis || 'N/A'}</p>
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-sm text-muted-foreground">Operador</p>
          <p className="font-medium">{autobus.operadorNombre || autobus.operadorId}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de estado e instalación
function EstadoInstalacion({ autobus }: { autobus: AutobusDetalle }) {
  const estadoConfig = ESTADO_CONFIG[autobus.estado];
  const faseConfig = FASE_CONFIG[autobus.instalacion?.fase || FASES_INSTALACION.PENDIENTE];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Estado e Instalación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estado actual */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Estado Actual</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${estadoConfig.color}`} />
            <span className="font-medium">{estadoConfig.label}</span>
          </div>
        </div>

        {/* Fase de instalación */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Fase de Instalación</p>
            <Badge variant="outline" className={faseConfig.color === 'bg-green-500' ? 'border-green-500 text-green-600' : ''}>
              {faseConfig.label}
            </Badge>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${faseConfig.color} transition-all`}
              style={{ width: `${faseConfig.progress}%` }}
            />
          </div>
          {autobus.instalacion?.fechaInstalacionCompleta && (
            <p className="text-xs text-muted-foreground mt-1">
              Completada el {formatDate(autobus.instalacion.fechaInstalacionCompleta)}
            </p>
          )}
        </div>

        <Separator />

        {/* Sistemas */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Sistemas Instalados</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Telemetría/FMS</span>
            </div>
            {autobus.telemetria ? (
              <Badge variant="default" className="bg-green-500">Activo</Badge>
            ) : (
              <Badge variant="secondary">No instalado</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cartelería</span>
            </div>
            {autobus.carteleria ? (
              <Badge variant="default" className="bg-green-500">Activo</Badge>
            ) : (
              <Badge variant="secondary">No instalado</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de contadores
function Contadores({ autobus }: { autobus: AutobusDetalle }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Contadores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">Averías</span>
          </div>
          <span className="font-bold text-lg">{autobus.contadores?.totalAverias || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            <span className="text-sm">Equipos instalados</span>
          </div>
          <span className="font-bold text-lg">{autobus.contadores?.totalEquipos || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Tarjeta de incidencia mini
function IncidenciaMiniCard({ incidencia }: { incidencia: Incidencia }) {
  const criticidadColors: Record<string, string> = {
    critica: 'bg-red-500',
    alta: 'bg-orange-500',
    media: 'bg-amber-500',
    baja: 'bg-blue-500',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <div className={`w-2 h-2 rounded-full mt-2 ${criticidadColors[incidencia.criticidad] || 'bg-slate-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{incidencia.codigo}</p>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(incidencia.createdAt)}
        </p>
      </div>
      <Badge variant="outline" className="shrink-0">
        {incidencia.estado}
      </Badge>
    </div>
  );
}

// Tarjeta de preventivo mini
function PreventivoMiniCard({ preventivo }: { preventivo: Preventivo }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
      <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{preventivo.nombre}</p>
        <p className="text-sm text-muted-foreground">
          Próxima: {formatDate(preventivo.proximaEjecucion)}
        </p>
      </div>
      <Badge variant={preventivo.activo ? 'default' : 'secondary'}>
        {preventivo.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    </div>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function AutobusDetallePage() {
  const params = useParams();
  const router = useRouter();
  const autobusId = params.id as string;

  // Estados
  const [autobus, setAutobus] = useState<AutobusDetalle | null>(null);
  const [equipos, setEquipos] = useState<EquipoConEstado[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [preventivos, setPreventivos] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCambiarEstadoDialog, setShowCambiarEstadoDialog] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState<string | null>(null);

  // Cargar datos
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Simulación de carga de datos
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data - en producción usar Firebase
        const mockAutobus: AutobusDetalle = {
          id: autobusId,
          codigo: 'BUS-001',
          matricula: '1234-ABC',
          numeroChasis: 'WDB1234567890',
          marca: 'Mercedes-Benz',
          modelo: 'Citaro K',
          carroceria: 'Urbano',
          anio: 2020,
          operadorId: 'op-001',
          operadorNombre: 'Bizkaibus',
          estado: ESTADOS_AUTOBUS.OPERATIVO,
          telemetria: { tieneFms: true, fmsConectado: true },
          carteleria: { tiene: true, tipo: 'LED' },
          instalacion: {
            fase: FASES_INSTALACION.COMPLETA,
            fechaPreinstalacion: new Date('2024-01-15') as any,
            fechaInstalacionCompleta: new Date('2024-02-01') as any,
          },
          contadores: {
            totalAverias: 5,
            totalEquipos: 8,
          },
          auditoria: {
            createdAt: new Date('2024-01-01') as any,
            creadoPor: 'admin',
            updatedAt: new Date('2024-06-15') as any,
            actualizadoPor: 'tecnico1',
          },
        };

        // Mock equipos - simplificado para desarrollo
        const mockEquipos = [
          {
            id: 'eq-1',
            codigo: 'FMS-001',
            tipo: 'FMS',
            estado: 'OPERATIVO',
            ubicacionActual: {
              tipo: 'AUTOBUS',
              autobusId: autobusId,
              posicionEnBus: 'CABINA_CONDUCTOR',
            },
          },
          {
            id: 'eq-2',
            codigo: 'MON-001',
            tipo: 'MONITOR',
            estado: 'OPERATIVO',
            ubicacionActual: {
              tipo: 'AUTOBUS',
              autobusId: autobusId,
              posicionEnBus: 'FRONTAL',
            },
          },
          {
            id: 'eq-3',
            codigo: 'VAL-001',
            tipo: 'VALIDADORA',
            estado: 'AVERIADO',
            tieneIncidencias: true,
            ubicacionActual: {
              tipo: 'AUTOBUS',
              autobusId: autobusId,
              posicionEnBus: 'PUERTA_DELANTERA',
            },
          },
          {
            id: 'eq-4',
            codigo: 'CAM-001',
            tipo: 'CAMARA',
            estado: 'OPERATIVO',
            ubicacionActual: {
              tipo: 'AUTOBUS',
              autobusId: autobusId,
              posicionEnBus: 'TECHO_DELANTERO',
            },
          },
          {
            id: 'eq-5',
            codigo: 'CAM-002',
            tipo: 'CAMARA',
            estado: 'OPERATIVO',
            ubicacionActual: {
              tipo: 'AUTOBUS',
              autobusId: autobusId,
              posicionEnBus: 'TECHO_TRASERO',
            },
          },
        ] as any[];

        // Mock incidencias - simplificado para desarrollo  
        const mockIncidencias = [
          {
            id: 'inc-1',
            codigo: 'INC-2024-001',
            criticidad: 'alta',
            estado: 'abierta',
            createdAt: new Date('2024-06-10'),
          },
          {
            id: 'inc-2',
            codigo: 'INC-2024-002',
            criticidad: 'media',
            estado: 'en_progreso',
            createdAt: new Date('2024-06-12'),
          },
        ] as any[];

        // Mock preventivos - simplificado para desarrollo
        const mockPreventivos = [
          {
            id: 'prev-1',
            nombre: 'Revisión mensual FMS',
            descripcion: 'Revisión del sistema de telemetría',
            activo: true,
            proximaEjecucion: new Date('2024-07-15'),
          },
        ] as any[];

        setAutobus(mockAutobus);
        setEquipos(mockEquipos);
        setIncidencias(mockIncidencias);
        setPreventivos(mockPreventivos);
      } catch (error) {
        console.error('Error loading autobus:', error);
      } finally {
        setLoading(false);
      }
    }

    if (autobusId) {
      loadData();
    }
  }, [autobusId]);

  // Handlers
  const handleDelete = async () => {
    // En producción: llamar a darDeBajaAutobus
    console.log('Eliminando autobús:', autobusId);
    setShowDeleteDialog(false);
    router.push('/autobuses');
  };

  const handleCambiarEstado = async () => {
    if (!nuevoEstado) return;
    // En producción: llamar a cambiarEstadoAutobus
    console.log('Cambiando estado a:', nuevoEstado);
    setAutobus(prev => prev ? { ...prev, estado: nuevoEstado as EstadoAutobus } : null);
    setShowCambiarEstadoDialog(false);
    setNuevoEstado(null);
  };

  const equiposConProblemas = equipos.filter(e => 
    e.estado === ESTADOS_EQUIPO.AVERIADO || e.estado === ESTADOS_EQUIPO.EN_LABORATORIO || e.tieneIncidencias
  );

  // Render
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingState />
      </div>
    );
  }

  if (!autobus) {
    return (
      <div className="container mx-auto p-6">
        <NotFoundState />
      </div>
    );
  }

  const estadoConfig = ESTADO_CONFIG[autobus.estado];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/autobuses">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${estadoConfig.color} text-white`}>
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{autobus.codigo}</h1>
                <Badge variant={autobus.estado === ESTADOS_AUTOBUS.OPERATIVO ? 'default' : 'secondary'}>
                  {estadoConfig.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {autobus.marca} {autobus.modelo} • {autobus.matricula}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/autobuses/${autobusId}/equipos`}>
              <Package className="h-4 w-4 mr-2" />
              Gestionar Equipos
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/autobuses/${autobusId}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/autobuses/${autobusId}/instalacion`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Registro Instalación
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Exportar Ficha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setNuevoEstado(ESTADOS_AUTOBUS.EN_TALLER);
                  setShowCambiarEstadoDialog(true);
                }}
                disabled={autobus.estado === ESTADOS_AUTOBUS.EN_TALLER}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Enviar a Taller
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setNuevoEstado(ESTADOS_AUTOBUS.OPERATIVO);
                  setShowCambiarEstadoDialog(true);
                }}
                disabled={autobus.estado === ESTADOS_AUTOBUS.OPERATIVO}
              >
                <Play className="h-4 w-4 mr-2" />
                Poner Operativo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Dar de Baja
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alerta de equipos con problemas */}
      {equiposConProblemas.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {equiposConProblemas.length} equipo(s) con problemas
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {equiposConProblemas.map(e => e.codigoInterno).join(', ')}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/autobuses/${autobusId}/equipos`}>
              Ver Equipos
            </Link>
          </Button>
        </div>
      )}

      {/* Grid principal */}
      <div className="grid gap-6 md:grid-cols-3">
        <VehiculoInfo autobus={autobus} />
        <EstadoInstalacion autobus={autobus} />
        <Contadores autobus={autobus} />
      </div>

      {/* Tabs de contenido */}
      <TabsRoot defaultValue="equipos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipos" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Equipos ({equipos.length})
          </TabsTrigger>
          <TabsTrigger value="incidencias" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Incidencias ({incidencias.length})
          </TabsTrigger>
          <TabsTrigger value="preventivos" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Preventivos ({preventivos.length})
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab Equipos */}
        <TabsContent value="equipos" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Esquema del bus */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Equipos</CardTitle>
                <CardDescription>
                  Visualización de la posición de equipos en el vehículo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BusSchema equipos={equipos} />
              </CardContent>
            </Card>

            {/* Lista de equipos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Equipos Instalados</CardTitle>
                  <CardDescription>
                    {equipos.length} equipos en este autobús
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/autobuses/${autobusId}/equipos`}>
                    Gestionar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <EquiposList equipos={equipos} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Incidencias */}
        <TabsContent value="incidencias">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Incidencias del Vehículo</CardTitle>
                <CardDescription>
                  Historial de incidencias reportadas
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/incidencias/nueva?autobusId=${autobusId}`}>
                  Nueva Incidencia
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {incidencias.length > 0 ? (
                <div className="space-y-2">
                  {incidencias.map(inc => (
                    <Link 
                      key={inc.id} 
                      href={`/incidencias/${inc.id}`}
                      className="block"
                    >
                      <IncidenciaMiniCard incidencia={inc} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No hay incidencias registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Preventivos */}
        <TabsContent value="preventivos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mantenimiento Preventivo</CardTitle>
                <CardDescription>
                  Tareas programadas para este vehículo
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/preventivo/nuevo?autobusId=${autobusId}`}>
                  Programar Tarea
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {preventivos.length > 0 ? (
                <div className="space-y-2">
                  {preventivos.map(prev => (
                    <Link 
                      key={prev.id} 
                      href={`/preventivo/${prev.id}`}
                      className="block"
                    >
                      <PreventivoMiniCard preventivo={prev} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay tareas preventivas programadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividad</CardTitle>
              <CardDescription>
                Registro de cambios y eventos del vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <div>
                    <p className="font-medium">Instalación completada</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(autobus.instalacion?.fechaInstalacionCompleta)} por tecnico1
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="font-medium">Pre-instalación realizada</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(autobus.instalacion?.fechaPreinstalacion)} por tecnico1
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400 mt-2" />
                  <div>
                    <p className="font-medium">Vehículo registrado</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(autobus.auditoria?.createdAt)} por {autobus.auditoria?.creadoPor}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </TabsRoot>

      {/* Dialog de confirmación de baja */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja este autobús?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta acción marcará el autobús <strong>{autobus.codigo}</strong> como dado de baja.
              </p>
              {equipos.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mt-2">
                  <p className="text-amber-800 font-medium">
                    ⚠️ Este autobús tiene {equipos.length} equipos instalados
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    Los equipos se moverán automáticamente al almacén antes de dar de baja el vehículo.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Dar de Baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de cambio de estado */}
      <AlertDialog open={showCambiarEstadoDialog} onOpenChange={setShowCambiarEstadoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cambiar estado del autobús
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desea cambiar el estado de <strong>{autobus.codigo}</strong> a{' '}
              <strong>{nuevoEstado && ESTADO_CONFIG[nuevoEstado]?.label}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNuevoEstado(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCambiarEstado}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
