'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  FormField,
  FormActions,
  TabsRoot,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  Textarea,
} from '@/components/ui';
import {
  getUbicaciones,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion,
  getLaboratorios,
  crearLaboratorio,
  actualizarLaboratorio,
  eliminarLaboratorio,
  getTiposEquipo,
  crearTipoEquipo,
  actualizarTipoEquipo,
  eliminarTipoEquipo,
  getParametrosSistema,
  actualizarParametrosSistema,
  getLogs,
} from '@/lib/firebase/configuracion';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Ubicacion,
  Laboratorio,
  TipoEquipoConfig,
  ParametrosSistema,
  LogAuditoria,
} from '@/types';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building,
  Cog,
  FileText,
  Save,
  RefreshCw,
  Wrench,
  Bus,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos de ubicación
const TIPOS_UBICACION = [
  { value: 'almacen', label: 'Almacén' },
  { value: 'taller', label: 'Taller' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'cochera', label: 'Cochera' },
];

// Tipos de log
const TIPOS_LOG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  crear: { label: 'Creación', color: 'text-green-400', icon: <Plus className="h-3 w-3" /> },
  editar: { label: 'Actualización', color: 'text-blue-400', icon: <Edit className="h-3 w-3" /> },
  eliminar: { label: 'Eliminación', color: 'text-red-400', icon: <Trash2 className="h-3 w-3" /> },
  login: { label: 'Login', color: 'text-cyan-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  logout: { label: 'Logout', color: 'text-yellow-400', icon: <XCircle className="h-3 w-3" /> },
  exportar: { label: 'Exportación', color: 'text-purple-400', icon: <Info className="h-3 w-3" /> },
  importar: { label: 'Importación', color: 'text-orange-400', icon: <Info className="h-3 w-3" /> },
  configurar: { label: 'Configuración', color: 'text-slate-400', icon: <Settings className="h-3 w-3" /> },
};

export default function AdminConfiguracionPage() {
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId || 'default';

  const [tabActiva, setTabActiva] = useState('ubicaciones');
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoConfig[]>([]);
  const [parametros, setParametros] = useState<ParametrosSistema | null>(null);
  const [logs, setLogs] = useState<LogAuditoria[]>([]);

  // Modales
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [showLaboratorioModal, setShowLaboratorioModal] = useState(false);
  const [showTipoEquipoModal, setShowTipoEquipoModal] = useState(false);

  // Items editando
  const [editandoUbicacion, setEditandoUbicacion] = useState<Ubicacion | null>(null);
  const [editandoLaboratorio, setEditandoLaboratorio] = useState<Laboratorio | null>(null);
  const [editandoTipoEquipo, setEditandoTipoEquipo] = useState<TipoEquipoConfig | null>(null);

  // Confirmar eliminar
  const [eliminandoUbicacion, setEliminandoUbicacion] = useState<Ubicacion | null>(null);
  const [eliminandoLaboratorio, setEliminandoLaboratorio] = useState<Laboratorio | null>(null);
  const [eliminandoTipoEquipo, setEliminandoTipoEquipo] = useState<TipoEquipoConfig | null>(null);

  // Guardando
  const [guardando, setGuardando] = useState(false);
  const [guardandoParametros, setGuardandoParametros] = useState(false);

  // Form data
  const [ubicacionForm, setUbicacionForm] = useState({
    codigo: '',
    nombre: '',
    tipo: 'almacen',
    direccion: '',
    descripcion: '',
    activo: true,
  });

  const [laboratorioForm, setLaboratorioForm] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    especialidades: '',
    activo: true,
  });

  const [tipoEquipoForm, setTipoEquipoForm] = useState<{
    codigo: string;
    nombre: string;
    descripcion: string;
    categoria: 'telemetria' | 'validacion' | 'video' | 'informacion' | 'otro';
    camposPersonalizados: string;
    activo: boolean;
  }>({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'otro',
    camposPersonalizados: '',
    activo: true,
  });

  const [parametrosForm, setParametrosForm] = useState({
    ivaPorDefecto: 21,
    costeHoraPorDefecto: 45,
    prefijoOT: 'OT',
    prefijoFactura: 'FAC',
    diasVencimientoFactura: 30,
    emailNotificaciones: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ubicacionesData, laboratoriosData, tiposEquipoData, parametrosData, logsData] =
        await Promise.all([
          getUbicaciones(tenantId),
          getLaboratorios(),
          getTiposEquipo(),
          getParametrosSistema(),
          getLogs({ limite: 50 }),
        ]);

      setUbicaciones(ubicacionesData);
      setLaboratorios(laboratoriosData);
      setTiposEquipo(tiposEquipoData);
      setParametros(parametrosData);
      setLogs(logsData);

      if (parametrosData) {
        setParametrosForm({
          ivaPorDefecto: parametrosData.ivaPorDefecto,
          costeHoraPorDefecto: parametrosData.costeHoraPorDefecto,
          prefijoOT: parametrosData.prefijoOT,
          prefijoFactura: parametrosData.prefijoFactura,
          diasVencimientoFactura: parametrosData.diasVencimientoFactura,
          emailNotificaciones: parametrosData.emailNotificaciones || '',
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // UBICACIONES
  // ============================================

  const abrirModalUbicacion = (ubicacion?: Ubicacion) => {
    if (ubicacion) {
      setEditandoUbicacion(ubicacion);
      setUbicacionForm({
        codigo: ubicacion.codigo,
        nombre: ubicacion.nombre,
        tipo: ubicacion.tipo,
        direccion: ubicacion.direccion?.linea1 || '',
        descripcion: '',
        activo: ubicacion.activo,
      });
    } else {
      setEditandoUbicacion(null);
      setUbicacionForm({
        codigo: '',
        nombre: '',
        tipo: 'almacen',
        direccion: '',
        descripcion: '',
        activo: true,
      });
    }
    setShowUbicacionModal(true);
  };

  const guardarUbicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setGuardando(true);
    try {
      const data = {
        codigo: ubicacionForm.codigo,
        nombre: ubicacionForm.nombre,
        tipo: ubicacionForm.tipo as Ubicacion['tipo'],
        direccion: { linea1: ubicacionForm.direccion },
        esPuntoStock: false,
        activo: ubicacionForm.activo,
      };

      if (editandoUbicacion) {
        await actualizarUbicacion(editandoUbicacion.id, data, user.uid, tenantId);
      } else {
        await crearUbicacion(data, user.uid, tenantId);
      }

      setShowUbicacionModal(false);
      const ubicacionesData = await getUbicaciones(tenantId);
      setUbicaciones(ubicacionesData);
    } catch (error) {
      console.error('Error guardando ubicación:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarUbicacion = async () => {
    if (!eliminandoUbicacion) return;
    try {
      await eliminarUbicacion(eliminandoUbicacion.id, tenantId);
      setEliminandoUbicacion(null);
      const ubicacionesData = await getUbicaciones(tenantId);
      setUbicaciones(ubicacionesData);
    } catch (error) {
      console.error('Error eliminando ubicación:', error);
    }
  };

  // ============================================
  // LABORATORIOS
  // ============================================

  const abrirModalLaboratorio = (laboratorio?: Laboratorio) => {
    if (laboratorio) {
      setEditandoLaboratorio(laboratorio);
      setLaboratorioForm({
        codigo: laboratorio.codigo || '',
        nombre: laboratorio.nombre,
        direccion: '',
        telefono: laboratorio.contacto?.telefono || '',
        email: laboratorio.contacto?.email || '',
        especialidades: laboratorio.especialidades?.join(', ') || '',
        activo: laboratorio.activo,
      });
    } else {
      setEditandoLaboratorio(null);
      setLaboratorioForm({
        codigo: '',
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        especialidades: '',
        activo: true,
      });
    }
    setShowLaboratorioModal(true);
  };

  const guardarLaboratorio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setGuardando(true);
    try {
      const especialidades = laboratorioForm.especialidades
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
        
      const data = {
        tipo: 'interno' as const,
        codigo: laboratorioForm.codigo || laboratorioForm.nombre.substring(0, 10).toUpperCase().replace(/\s/g, ''),
        nombre: laboratorioForm.nombre,
        contacto: {
          nombre: laboratorioForm.nombre,
          email: laboratorioForm.email,
          telefono: laboratorioForm.telefono,
        },
        especialidades,
        tiposEquipoReparables: especialidades,
        activo: laboratorioForm.activo,
      };

      if (editandoLaboratorio) {
        await actualizarLaboratorio(editandoLaboratorio.id, data, user.uid);
      } else {
        await crearLaboratorio(data, user.uid);
      }

      setShowLaboratorioModal(false);
      const laboratoriosData = await getLaboratorios();
      setLaboratorios(laboratoriosData);
    } catch (error) {
      console.error('Error guardando laboratorio:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarLaboratorio = async () => {
    if (!eliminandoLaboratorio) return;
    try {
      await eliminarLaboratorio(eliminandoLaboratorio.id);
      setEliminandoLaboratorio(null);
      const laboratoriosData = await getLaboratorios();
      setLaboratorios(laboratoriosData);
    } catch (error) {
      console.error('Error eliminando laboratorio:', error);
    }
  };

  // ============================================
  // TIPOS DE EQUIPO
  // ============================================

  const abrirModalTipoEquipo = (tipo?: TipoEquipoConfig) => {
    if (tipo) {
      setEditandoTipoEquipo(tipo);
      setTipoEquipoForm({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        descripcion: tipo.descripcion || '',
        categoria: tipo.categoria || 'otro',
        camposPersonalizados: JSON.stringify(tipo.camposPersonalizados || [], null, 2),
        activo: tipo.activo,
      });
    } else {
      setEditandoTipoEquipo(null);
      setTipoEquipoForm({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: 'otro',
        camposPersonalizados: '[]',
        activo: true,
      });
    }
    setShowTipoEquipoModal(true);
  };

  const guardarTipoEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setGuardando(true);
    try {
      let camposPersonalizados = [];
      try {
        camposPersonalizados = JSON.parse(tipoEquipoForm.camposPersonalizados);
      } catch {
        camposPersonalizados = [];
      }

      const data = {
        codigo: tipoEquipoForm.codigo,
        nombre: tipoEquipoForm.nombre,
        descripcion: tipoEquipoForm.descripcion,
        categoria: tipoEquipoForm.categoria,
        camposPersonalizados,
        activo: tipoEquipoForm.activo,
      };

      if (editandoTipoEquipo) {
        await actualizarTipoEquipo(editandoTipoEquipo.id, data, user.uid);
      } else {
        await crearTipoEquipo(data, user.uid);
      }

      setShowTipoEquipoModal(false);
      const tiposEquipoData = await getTiposEquipo();
      setTiposEquipo(tiposEquipoData);
    } catch (error) {
      console.error('Error guardando tipo de equipo:', error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarTipoEquipo = async () => {
    if (!eliminandoTipoEquipo) return;
    try {
      await eliminarTipoEquipo(eliminandoTipoEquipo.id);
      setEliminandoTipoEquipo(null);
      const tiposEquipoData = await getTiposEquipo();
      setTiposEquipo(tiposEquipoData);
    } catch (error) {
      console.error('Error eliminando tipo de equipo:', error);
    }
  };

  // ============================================
  // PARÁMETROS DEL SISTEMA
  // ============================================

  const guardarParametros = async () => {
    if (!user) return;

    setGuardandoParametros(true);
    try {
      await actualizarParametrosSistema(parametrosForm);
      const parametrosData = await getParametrosSistema();
      setParametros(parametrosData);
    } catch (error) {
      console.error('Error guardando parámetros:', error);
    } finally {
      setGuardandoParametros(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Configuración del Sistema</h1>
          <p className="text-slate-400 mt-1">
            Administra ubicaciones, laboratorios y parámetros generales
          </p>
        </div>
        <Button variant="outline" onClick={cargarDatos}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <TabsRoot value={tabActiva} onValueChange={setTabActiva}>
        <TabsList>
          <TabsTrigger value="ubicaciones">
            <MapPin className="h-4 w-4 mr-2" />
            Ubicaciones
          </TabsTrigger>
          <TabsTrigger value="laboratorios">
            <Wrench className="h-4 w-4 mr-2" />
            Laboratorios
          </TabsTrigger>
          <TabsTrigger value="tipos-equipo">
            <Bus className="h-4 w-4 mr-2" />
            Tipos de Equipo
          </TabsTrigger>
          <TabsTrigger value="parametros">
            <Settings className="h-4 w-4 mr-2" />
            Parámetros
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* UBICACIONES */}
        {/* ============================================ */}
        <TabsContent value="ubicaciones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => abrirModalUbicacion()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Ubicación
            </Button>
          </div>

          {ubicaciones.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="No hay ubicaciones"
              description="Añade ubicaciones para almacenes, talleres, laboratorios y cocheras"
              action={
                <Button onClick={() => abrirModalUbicacion()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Ubicación
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3">
              {ubicaciones.map((ubicacion) => (
                <Card
                  key={ubicacion.id}
                  className={`hover:border-slate-600 ${!ubicacion.activo ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          <MapPin className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100">{ubicacion.nombre}</span>
                            <Badge variant="outline">{ubicacion.codigo}</Badge>
                            <Badge variant="secondary">
                              {TIPOS_UBICACION.find((t) => t.value === ubicacion.tipo)?.label}
                            </Badge>
                          </div>
                          {ubicacion.direccion && (
                            <p className="text-sm text-slate-400 mt-1">{ubicacion.direccion.linea1}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => abrirModalUbicacion(ubicacion)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEliminandoUbicacion(ubicacion)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* LABORATORIOS */}
        {/* ============================================ */}
        <TabsContent value="laboratorios" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => abrirModalLaboratorio()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Laboratorio
            </Button>
          </div>

          {laboratorios.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-12 w-12" />}
              title="No hay laboratorios"
              description="Añade laboratorios externos de reparación"
              action={
                <Button onClick={() => abrirModalLaboratorio()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Laboratorio
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3">
              {laboratorios.map((laboratorio) => (
                <Card
                  key={laboratorio.id}
                  className={`hover:border-slate-600 ${!laboratorio.activo ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          <Wrench className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100">{laboratorio.nombre}</span>
                            <Badge variant="outline">{laboratorio.codigo}</Badge>
                          </div>
                          {laboratorio.especialidades && laboratorio.especialidades.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {laboratorio.especialidades.slice(0, 3).map((esp) => (
                                <Badge key={esp} variant="secondary" className="text-xs">
                                  {esp}
                                </Badge>
                              ))}
                              {laboratorio.especialidades.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{laboratorio.especialidades.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-slate-400">
                          {laboratorio.contacto?.telefono && <p>{laboratorio.contacto.telefono}</p>}
                          {laboratorio.contacto?.email && <p>{laboratorio.contacto.email}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModalLaboratorio(laboratorio)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEliminandoLaboratorio(laboratorio)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TIPOS DE EQUIPO */}
        {/* ============================================ */}
        <TabsContent value="tipos-equipo" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => abrirModalTipoEquipo()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Tipo
            </Button>
          </div>

          {tiposEquipo.length === 0 ? (
            <EmptyState
              icon={<Bus className="h-12 w-12" />}
              title="No hay tipos de equipo"
              description="Define tipos de equipo con campos personalizados"
              action={
                <Button onClick={() => abrirModalTipoEquipo()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Tipo
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3">
              {tiposEquipo.map((tipo) => (
                <Card
                  key={tipo.id}
                  className={`hover:border-slate-600 ${!tipo.activo ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          <Bus className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100">{tipo.nombre}</span>
                            <Badge variant="outline">{tipo.codigo}</Badge>
                          </div>
                          {tipo.descripcion && (
                            <p className="text-sm text-slate-400 mt-1">{tipo.descripcion}</p>
                          )}
                          {tipo.camposPersonalizados && tipo.camposPersonalizados.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {tipo.camposPersonalizados.length} campos personalizados
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalTipoEquipo(tipo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEliminandoTipoEquipo(tipo)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* PARÁMETROS DEL SISTEMA */}
        {/* ============================================ */}
        <TabsContent value="parametros">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Parámetros Generales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Facturación */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Facturación</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="% IVA">
                    <Input
                      type="number"
                      value={parametrosForm.ivaPorDefecto}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          ivaPorDefecto: parseFloat(e.target.value) || 0,
                        })
                      }
                      min={0}
                      max={100}
                    />
                  </FormField>

                  <FormField label="Coste por Hora (€)">
                    <Input
                      type="number"
                      value={parametrosForm.costeHoraPorDefecto}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          costeHoraPorDefecto: parseFloat(e.target.value) || 0,
                        })
                      }
                      min={0}
                      step={0.01}
                    />
                  </FormField>

                  <FormField label="Prefijo Facturas">
                    <Input
                      value={parametrosForm.prefijoFactura}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          prefijoFactura: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="FAC"
                    />
                  </FormField>
                </div>
              </div>

              {/* OTs */}
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Órdenes de Trabajo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Prefijo OT">
                    <Input
                      value={parametrosForm.prefijoOT}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          prefijoOT: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="OT"
                    />
                  </FormField>
                </div>
              </div>

              {/* Alertas */}
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Alertas y Vencimientos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Días para vencimiento de factura">
                    <Input
                      type="number"
                      value={parametrosForm.diasVencimientoFactura}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          diasVencimientoFactura: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                    />
                  </FormField>

                  <FormField label="Email de notificaciones">
                    <Input
                      type="email"
                      value={parametrosForm.emailNotificaciones}
                      onChange={(e) =>
                        setParametrosForm({
                          ...parametrosForm,
                          emailNotificaciones: e.target.value,
                        })
                      }
                      placeholder="notificaciones@empresa.com"
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={guardarParametros} disabled={guardandoParametros}>
                  {guardandoParametros ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Parámetros
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* LOGS DE AUDITORÍA */}
        {/* ============================================ */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs de Auditoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay logs registrados</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => {
                    const tipoInfo = TIPOS_LOG[log.accion] || TIPOS_LOG.configurar;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                      >
                        <div className={`mt-0.5 ${tipoInfo.color}`}>{tipoInfo.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {tipoInfo.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.entidad}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {log.timestamp?.toDate
                                ? format(log.timestamp.toDate(), 'dd/MM/yyyy HH:mm:ss', {
                                    locale: es,
                                  })
                                : '-'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1">{log.descripcion}</p>
                          {log.datosNuevos && (
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {JSON.stringify(log.datosNuevos)}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 text-right">
                          <p>{log.usuarioEmail}</p>
                          {log.ip && <p className="text-slate-600">{log.ip}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </TabsRoot>

      {/* ============================================ */}
      {/* MODALES */}
      {/* ============================================ */}

      {/* Modal Ubicación */}
      <Modal
        isOpen={showUbicacionModal}
        onClose={() => setShowUbicacionModal(false)}
        title={editandoUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
      >
        <form onSubmit={guardarUbicacion} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código" required>
              <Input
                value={ubicacionForm.codigo}
                onChange={(e) =>
                  setUbicacionForm({ ...ubicacionForm, codigo: e.target.value.toUpperCase() })
                }
                placeholder="ALM01"
              />
            </FormField>

            <FormField label="Tipo" required>
              <Select
                value={ubicacionForm.tipo}
                onChange={(v) => setUbicacionForm({ ...ubicacionForm, tipo: v })}
                options={TIPOS_UBICACION}
              />
            </FormField>
          </div>

          <FormField label="Nombre" required>
            <Input
              value={ubicacionForm.nombre}
              onChange={(e) => setUbicacionForm({ ...ubicacionForm, nombre: e.target.value })}
              placeholder="Nombre de la ubicación"
            />
          </FormField>

          <FormField label="Dirección">
            <Input
              value={ubicacionForm.direccion}
              onChange={(e) =>
                setUbicacionForm({ ...ubicacionForm, direccion: e.target.value })
              }
              placeholder="Dirección completa"
            />
          </FormField>

          <FormField label="Descripción">
            <Textarea
              value={ubicacionForm.descripcion}
              onChange={(e) =>
                setUbicacionForm({ ...ubicacionForm, descripcion: e.target.value })
              }
              placeholder="Descripción opcional"
              rows={2}
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ubicacionForm.activo}
              onChange={(e) => setUbicacionForm({ ...ubicacionForm, activo: e.target.checked })}
              className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-300">Ubicación activa</span>
          </label>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setShowUbicacionModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!ubicacionForm.codigo || !ubicacionForm.nombre || guardando}>
              {guardando && <LoadingSpinner size="sm" className="mr-2" />}
              {editandoUbicacion ? 'Guardar' : 'Crear'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Modal Laboratorio */}
      <Modal
        isOpen={showLaboratorioModal}
        onClose={() => setShowLaboratorioModal(false)}
        title={editandoLaboratorio ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}
      >
        <form onSubmit={guardarLaboratorio} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código" required>
              <Input
                value={laboratorioForm.codigo}
                onChange={(e) =>
                  setLaboratorioForm({ ...laboratorioForm, codigo: e.target.value.toUpperCase() })
                }
                placeholder="LAB01"
              />
            </FormField>

            <FormField label="Nombre" required>
              <Input
                value={laboratorioForm.nombre}
                onChange={(e) =>
                  setLaboratorioForm({ ...laboratorioForm, nombre: e.target.value })
                }
                placeholder="Nombre del laboratorio"
              />
            </FormField>
          </div>

          <FormField label="Dirección">
            <Input
              value={laboratorioForm.direccion}
              onChange={(e) =>
                setLaboratorioForm({ ...laboratorioForm, direccion: e.target.value })
              }
              placeholder="Dirección"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Teléfono">
              <Input
                value={laboratorioForm.telefono}
                onChange={(e) =>
                  setLaboratorioForm({ ...laboratorioForm, telefono: e.target.value })
                }
                placeholder="944 000 000"
              />
            </FormField>

            <FormField label="Email">
              <Input
                type="email"
                value={laboratorioForm.email}
                onChange={(e) =>
                  setLaboratorioForm({ ...laboratorioForm, email: e.target.value })
                }
                placeholder="lab@ejemplo.com"
              />
            </FormField>
          </div>

          <FormField label="Especialidades (separadas por coma)">
            <Input
              value={laboratorioForm.especialidades}
              onChange={(e) =>
                setLaboratorioForm({ ...laboratorioForm, especialidades: e.target.value })
              }
              placeholder="Electrónica, Neumática, Hidráulica"
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={laboratorioForm.activo}
              onChange={(e) =>
                setLaboratorioForm({ ...laboratorioForm, activo: e.target.checked })
              }
              className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-300">Laboratorio activo</span>
          </label>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLaboratorioModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!laboratorioForm.codigo || !laboratorioForm.nombre || guardando}
            >
              {guardando && <LoadingSpinner size="sm" className="mr-2" />}
              {editandoLaboratorio ? 'Guardar' : 'Crear'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Modal Tipo de Equipo */}
      <Modal
        isOpen={showTipoEquipoModal}
        onClose={() => setShowTipoEquipoModal(false)}
        title={editandoTipoEquipo ? 'Editar Tipo de Equipo' : 'Nuevo Tipo de Equipo'}
      >
        <form onSubmit={guardarTipoEquipo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código" required>
              <Input
                value={tipoEquipoForm.codigo}
                onChange={(e) =>
                  setTipoEquipoForm({ ...tipoEquipoForm, codigo: e.target.value.toUpperCase() })
                }
                placeholder="BUS"
              />
            </FormField>

            <FormField label="Nombre" required>
              <Input
                value={tipoEquipoForm.nombre}
                onChange={(e) =>
                  setTipoEquipoForm({ ...tipoEquipoForm, nombre: e.target.value })
                }
                placeholder="Autobús"
              />
            </FormField>
          </div>

          <FormField label="Descripción">
            <Textarea
              value={tipoEquipoForm.descripcion}
              onChange={(e) =>
                setTipoEquipoForm({ ...tipoEquipoForm, descripcion: e.target.value })
              }
              placeholder="Descripción del tipo de equipo"
              rows={2}
            />
          </FormField>

          <FormField label="Campos Personalizados (JSON)">
            <Textarea
              value={tipoEquipoForm.camposPersonalizados}
              onChange={(e) =>
                setTipoEquipoForm({ ...tipoEquipoForm, camposPersonalizados: e.target.value })
              }
              placeholder='[{"nombre": "plazas", "tipo": "number", "requerido": true}]'
              rows={4}
              className="font-mono text-xs"
            />
          </FormField>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tipoEquipoForm.activo}
              onChange={(e) =>
                setTipoEquipoForm({ ...tipoEquipoForm, activo: e.target.checked })
              }
              className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-300">Tipo activo</span>
          </label>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTipoEquipoModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!tipoEquipoForm.codigo || !tipoEquipoForm.nombre || guardando}
            >
              {guardando && <LoadingSpinner size="sm" className="mr-2" />}
              {editandoTipoEquipo ? 'Guardar' : 'Crear'}
            </Button>
          </FormActions>
        </form>
      </Modal>

      {/* Confirmar eliminar ubicación */}
      <ConfirmDialog
        isOpen={!!eliminandoUbicacion}
        onClose={() => setEliminandoUbicacion(null)}
        onConfirm={handleEliminarUbicacion}
        title="Eliminar Ubicación"
        message={`¿Estás seguro de que deseas eliminar la ubicación "${eliminandoUbicacion?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Confirmar eliminar laboratorio */}
      <ConfirmDialog
        isOpen={!!eliminandoLaboratorio}
        onClose={() => setEliminandoLaboratorio(null)}
        onConfirm={handleEliminarLaboratorio}
        title="Eliminar Laboratorio"
        message={`¿Estás seguro de que deseas eliminar el laboratorio "${eliminandoLaboratorio?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Confirmar eliminar tipo de equipo */}
      <ConfirmDialog
        isOpen={!!eliminandoTipoEquipo}
        onClose={() => setEliminandoTipoEquipo(null)}
        onConfirm={handleEliminarTipoEquipo}
        title="Eliminar Tipo de Equipo"
        message={`¿Estás seguro de que deseas eliminar el tipo "${eliminandoTipoEquipo?.nombre}"?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
