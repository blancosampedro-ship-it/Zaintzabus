'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrdenTrabajoById,
  cambiarEstadoOT,
  asignarOT,
  validarOT,
  rechazarOT,
} from '@/lib/firebase/ordenes-trabajo';
import { getIncidenciaById } from '@/lib/firebase/incidencias';
import {
  OrdenTrabajo,
  Incidencia,
  ESTADOS_OT,
  TIPOS_OT,
  EstadoOT,
} from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  LoadingSpinner,
  Modal,
  Input,
  TextArea,
} from '@/components/ui';
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Wrench,
  FileText,
  Package,
  Euro,
  ChevronRight,
  Edit,
} from 'lucide-react';

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  [ESTADOS_OT.PENDIENTE]: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  [ESTADOS_OT.ASIGNADA]: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  [ESTADOS_OT.EN_CURSO]: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  [ESTADOS_OT.COMPLETADA]: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  [ESTADOS_OT.VALIDADA]: { bg: 'bg-green-500/20', text: 'text-green-400' },
  [ESTADOS_OT.RECHAZADA]: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const ESTADO_LABELS: Record<string, string> = {
  [ESTADOS_OT.PENDIENTE]: 'Pendiente',
  [ESTADOS_OT.ASIGNADA]: 'Asignada',
  [ESTADOS_OT.EN_CURSO]: 'En curso',
  [ESTADOS_OT.COMPLETADA]: 'Completada',
  [ESTADOS_OT.VALIDADA]: 'Validada',
  [ESTADOS_OT.RECHAZADA]: 'Rechazada',
};

const TIPO_LABELS: Record<string, string> = {
  [TIPOS_OT.CORRECTIVO_URGENTE]: 'Correctivo Urgente',
  [TIPOS_OT.CORRECTIVO_PROGRAMADO]: 'Correctivo Programado',
  [TIPOS_OT.PREVENTIVO]: 'Preventivo',
};

export default function OrdenTrabajoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { claims, usuario, hasRole } = useAuth();
  const [orden, setOrden] = useState<OrdenTrabajo | null>(null);
  const [incidenciaOrigen, setIncidenciaOrigen] = useState<Incidencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showRechazarModal, setShowRechazarModal] = useState(false);
  const [tecnicoAsignar, setTecnicoAsignar] = useState('');
  const [fechaPrevista, setFechaPrevista] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');

  const ordenId = params.id as string;

  useEffect(() => {
    async function loadData() {
      if (!claims?.tenantId || !ordenId) return;

      try {
        const ot = await getOrdenTrabajoById(claims.tenantId, ordenId);
        setOrden(ot);

        // Cargar incidencia origen si existe
        if (ot?.incidenciaId) {
          const inc = await getIncidenciaById(claims.tenantId, ot.incidenciaId);
          setIncidenciaOrigen(inc);
        }
      } catch (error) {
        console.error('Error loading OT:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [claims?.tenantId, ordenId]);

  const handleAsignar = async () => {
    if (!claims?.tenantId || !usuario || !tecnicoAsignar) return;

    setActionLoading(true);
    try {
      await asignarOT(
        claims.tenantId,
        ordenId,
        tecnicoAsignar,
        usuario.id,
        fechaPrevista ? new Date(fechaPrevista) : undefined
      );
      const updated = await getOrdenTrabajoById(claims.tenantId, ordenId);
      setOrden(updated);
      setShowAsignarModal(false);
    } catch (error) {
      console.error('Error asignando OT:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidar = async () => {
    if (!claims?.tenantId || !usuario) return;

    setActionLoading(true);
    try {
      await validarOT(claims.tenantId, ordenId, usuario.id);
      const updated = await getOrdenTrabajoById(claims.tenantId, ordenId);
      setOrden(updated);
    } catch (error) {
      console.error('Error validando OT:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!claims?.tenantId || !usuario || !motivoRechazo) return;

    setActionLoading(true);
    try {
      await rechazarOT(claims.tenantId, ordenId, usuario.id, motivoRechazo);
      const updated = await getOrdenTrabajoById(claims.tenantId, ordenId);
      setOrden(updated);
      setShowRechazarModal(false);
    } catch (error) {
      console.error('Error rechazando OT:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getTimestamp = (ts: Timestamp | undefined): Date | null => {
    if (!ts) return null;
    return ts.toDate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">OT no encontrada</h3>
        <Link href="/ordenes-trabajo" className="text-blue-400 hover:underline mt-2 inline-block">
          Volver a órdenes de trabajo
        </Link>
      </div>
    );
  }

  const colors = ESTADO_COLORS[orden.estado];
  const canEdit = hasRole(['admin', 'jefe_mantenimiento']);
  const canValidate = hasRole(['admin', 'jefe_mantenimiento']) && orden.estado === ESTADOS_OT.COMPLETADA;
  const canExecute = hasRole(['admin', 'jefe_mantenimiento', 'tecnico']) && 
    (orden.estado === ESTADOS_OT.ASIGNADA || orden.estado === ESTADOS_OT.EN_CURSO);
  const canAssign = hasRole(['admin', 'jefe_mantenimiento']) && orden.estado === ESTADOS_OT.PENDIENTE;

  const fechaCreacion = getTimestamp(orden.auditoria?.createdAt as Timestamp);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/ordenes-trabajo"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">
                {orden.codigo}
              </h1>
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium', colors.bg, colors.text)}>
                {ESTADO_LABELS[orden.estado]}
              </span>
            </div>
            <p className="text-slate-400 mt-1">
              {TIPO_LABELS[orden.tipo]} • Creada{' '}
              {fechaCreacion ? format(fechaCreacion, "d MMM yyyy 'a las' HH:mm", { locale: es }) : '-'}
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          {canAssign && (
            <Button onClick={() => setShowAsignarModal(true)}>
              <User className="w-4 h-4 mr-2" />
              Asignar
            </Button>
          )}
          {canExecute && (
            <Link href={`/ordenes-trabajo/${ordenId}/ejecutar`}>
              <Button variant="primary">
                <PlayCircle className="w-4 h-4 mr-2" />
                Ejecutar
              </Button>
            </Link>
          )}
          {canValidate && (
            <>
              <Button onClick={handleValidar} disabled={actionLoading} variant="secondary">
                <CheckCircle className="w-4 h-4 mr-2" />
                Validar
              </Button>
              <Button onClick={() => setShowRechazarModal(true)} variant="danger">
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información general */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Origen</p>
                  <p className="text-white font-medium capitalize">{orden.origen}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tipo</p>
                  <p className="text-white font-medium">{TIPO_LABELS[orden.tipo]}</p>
                </div>
                {orden.criticidad && (
                  <div>
                    <p className="text-sm text-slate-400">Criticidad</p>
                    <Badge variant={orden.criticidad === 'critica' ? 'danger' : 'default'}>
                      {orden.criticidad === 'critica' ? 'Crítica' : 'Normal'}
                    </Badge>
                  </div>
                )}
                {orden.tecnicoId && (
                  <div>
                    <p className="text-sm text-slate-400">Técnico asignado</p>
                    <p className="text-white font-medium">{orden.tecnicoId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Incidencia origen */}
          {incidenciaOrigen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Incidencia Origen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/incidencias/${incidenciaOrigen.id}`}
                  className="block p-4 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-white">{incidenciaOrigen.codigo}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {incidenciaOrigen.naturalezaFallo}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Documentación (si completada) */}
          {orden.documentacion?.trabajosRealizados && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Trabajos Realizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap">
                  {orden.documentacion.trabajosRealizados}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Materiales usados */}
          {orden.documentacion?.materialesUsados && orden.documentacion.materialesUsados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  Materiales Utilizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orden.documentacion.materialesUsados.map((mat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{mat.descripcion}</p>
                        <p className="text-sm text-slate-400">
                          {mat.cantidad} x {mat.precioUnitario ? `${mat.precioUnitario}€` : '-'} •{' '}
                          <span className="capitalize">{mat.tipo}</span>
                        </p>
                      </div>
                      {mat.precioUnitario && (
                        <span className="font-mono text-green-400">
                          {(mat.cantidad * mat.precioUnitario).toFixed(2)} €
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Timeline de estado */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Trabajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Planificación */}
                {orden.planificacion?.fechaPrevista && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-sm text-slate-400">Fecha prevista</p>
                      <p className="text-white">
                        {format(
                          getTimestamp(orden.planificacion.fechaPrevista as Timestamp)!,
                          "d MMM yyyy",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ejecución */}
                {orden.ejecucion?.fechaInicioReal && (
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-sm text-slate-400">Inicio real</p>
                      <p className="text-white">
                        {format(
                          getTimestamp(orden.ejecucion.fechaInicioReal as Timestamp)!,
                          "d MMM yyyy HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {orden.ejecucion?.fechaFinReal && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-sm text-slate-400">Fin real</p>
                      <p className="text-white">
                        {format(
                          getTimestamp(orden.ejecucion.fechaFinReal as Timestamp)!,
                          "d MMM yyyy HH:mm",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tiempos */}
                {orden.ejecucion?.tiempos && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm text-slate-400">Tiempos</p>
                      <p className="text-white text-sm">
                        Intervención: {orden.ejecucion.tiempos.intervencionMinutos || 0} min
                        <br />
                        Desplazamiento: {orden.ejecucion.tiempos.desplazamientoMinutos || 0} min
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Costes */}
          {orden.costes && orden.costes.total !== undefined && (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-green-400" />
                  Costes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Materiales</span>
                    <span className="font-mono text-white">
                      {(orden.costes.materiales || 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Mano de obra</span>
                    <span className="font-mono text-white">
                      {(orden.costes.manoObra || 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Desplazamiento</span>
                    <span className="font-mono text-white">
                      {(orden.costes.desplazamiento || 0).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                    <span className="font-semibold text-white">Total</span>
                    <span className="font-mono font-bold text-green-400">
                      {orden.costes.total.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Facturación */}
          <Card>
            <CardHeader>
              <CardTitle>Facturación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {orden.facturacion.facturable ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Facturable</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-400">No facturable</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Asignar */}
      <Modal
        isOpen={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        title="Asignar Orden de Trabajo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Técnico
            </label>
            <Input
              value={tecnicoAsignar}
              onChange={(e) => setTecnicoAsignar(e.target.value)}
              placeholder="ID o nombre del técnico"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Fecha prevista (opcional)
            </label>
            <Input
              type="date"
              value={fechaPrevista}
              onChange={(e) => setFechaPrevista(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAsignarModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleAsignar} disabled={!tecnicoAsignar || actionLoading} className="flex-1">
              Asignar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Rechazar */}
      <Modal
        isOpen={showRechazarModal}
        onClose={() => setShowRechazarModal(false)}
        title="Rechazar Orden de Trabajo"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Motivo del rechazo
            </label>
            <TextArea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Describe el motivo del rechazo..."
              rows={4}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowRechazarModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleRechazar}
              disabled={!motivoRechazo || actionLoading}
              variant="danger"
              className="flex-1"
            >
              Rechazar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
