'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getIncidenciaById,
  cambiarEstadoIncidencia,
  updateIncidencia,
} from '@/lib/firebase/incidencias';
import { getAuditLogsByEntity } from '@/lib/firebase/auditoria';
import {
  Incidencia,
  AuditLog,
  ESTADO_LABELS,
  CRITICIDAD_LABELS,
  TRANSICIONES_ESTADO,
  EstadoIncidencia,
} from '@/types';
import { formatDateTime, formatMinutes } from '@/lib/utils/index';
import { cn } from '@/lib/utils/index';
import {
  ArrowLeft,
  Clock,
  User,
  Bus,
  AlertTriangle,
  CheckCircle,
  Edit,
  History,
  Loader2,
  ChevronRight,
  FileText,
  Wrench,
  TestTube,
  Package,
} from 'lucide-react';

export default function IncidenciaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { claims, usuario, hasRole } = useAuth();
  const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingState, setChangingState] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const incidenciaId = params.id as string;

  useEffect(() => {
    async function loadData() {
      if (!claims?.tenantId || !incidenciaId) return;

      try {
        const [inc, logs] = await Promise.all([
          getIncidenciaById(claims.tenantId, incidenciaId),
          getAuditLogsByEntity('incidencia', incidenciaId, claims.tenantId),
        ]);

        setIncidencia(inc);
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error loading incidencia:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [claims?.tenantId, incidenciaId]);

  const handleCambiarEstado = async (nuevoEstado: EstadoIncidencia) => {
    if (!claims?.tenantId || !usuario || !incidencia) return;

    setChangingState(true);
    try {
      await cambiarEstadoIncidencia(
        claims.tenantId,
        incidenciaId,
        nuevoEstado,
        usuario.id
      );

      // Recargar datos
      const updated = await getIncidenciaById(claims.tenantId, incidenciaId);
      setIncidencia(updated);
    } catch (error) {
      console.error('Error changing state:', error);
      alert('Error al cambiar el estado');
    } finally {
      setChangingState(false);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!claims?.tenantId || !incidencia) return;

    try {
      await updateIncidencia(claims.tenantId, incidenciaId, {
        [field]: editValue,
      });

      setIncidencia({ ...incidencia, [field]: editValue });
      setEditMode(null);
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-lurraldebus-primary" />
      </div>
    );
  }

  if (!incidencia) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Incidencia no encontrada</h3>
        <Link href="/incidencias" className="text-lurraldebus-primary hover:underline mt-2 inline-block">
          Volver a incidencias
        </Link>
      </div>
    );
  }

  const transicionesDisponibles = TRANSICIONES_ESTADO[incidencia.estado];
  const canEdit = hasRole(['admin', 'jefe_mantenimiento', 'tecnico']);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/incidencias"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {incidencia.codigo}
              </h1>
              <span className={cn('badge', `badge-${incidencia.estado}`)}>
                {ESTADO_LABELS[incidencia.estado]}
              </span>
              <span className={cn('badge', `badge-${incidencia.criticidad}`)}>
                {CRITICIDAD_LABELS[incidencia.criticidad]}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{incidencia.naturalezaFallo}</p>
          </div>
        </div>

        {/* Acciones de estado */}
        {canEdit && transicionesDisponibles.length > 0 && (
          <div className="flex gap-2">
            {transicionesDisponibles.map((estado) => (
              <button
                key={estado}
                onClick={() => handleCambiarEstado(estado)}
                disabled={changingState}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  estado === 'resuelta' || estado === 'cerrada'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {changingState ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  `→ ${ESTADO_LABELS[estado]}`
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información general */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Información General
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Activo</dt>
                <dd className="font-medium flex items-center gap-2">
                  <Bus className="w-4 h-4 text-gray-400" />
                  {incidencia.activoPrincipalCodigo}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Categoría</dt>
                <dd className="font-medium">{incidencia.categoriaFallo}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Reportado por</dt>
                <dd className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {incidencia.reportadoPor}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Asignado a</dt>
                <dd className="font-medium">
                  {incidencia.asignadoA || (
                    <span className="text-gray-400">Sin asignar</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Diagnóstico y solución */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Diagnóstico y Solución
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 flex items-center justify-between">
                  Diagnóstico
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditMode('diagnostico');
                        setEditValue(incidencia.diagnostico || '');
                      }}
                      className="text-lurraldebus-primary hover:underline"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </label>
                {editMode === 'diagnostico' ? (
                  <div className="mt-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input-field"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveField('diagnostico')}
                        className="btn-primary text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditMode(null)}
                        className="btn-secondary text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-gray-900">
                    {incidencia.diagnostico || (
                      <span className="text-gray-400 italic">Sin diagnóstico</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500 flex items-center justify-between">
                  Causa Raíz
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditMode('causaRaiz');
                        setEditValue(incidencia.causaRaiz || '');
                      }}
                      className="text-lurraldebus-primary hover:underline"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </label>
                {editMode === 'causaRaiz' ? (
                  <div className="mt-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input-field"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveField('causaRaiz')}
                        className="btn-primary text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditMode(null)}
                        className="btn-secondary text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-gray-900">
                    {incidencia.causaRaiz || (
                      <span className="text-gray-400 italic">Sin determinar</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500 flex items-center justify-between">
                  Solución Aplicada
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditMode('solucionAplicada');
                        setEditValue(incidencia.solucionAplicada || '');
                      }}
                      className="text-lurraldebus-primary hover:underline"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </label>
                {editMode === 'solucionAplicada' ? (
                  <div className="mt-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input-field"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveField('solucionAplicada')}
                        className="btn-primary text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditMode(null)}
                        className="btn-secondary text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-gray-900">
                    {incidencia.solucionAplicada || (
                      <span className="text-gray-400 italic">Sin solución registrada</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pruebas post-reparación */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Pruebas Post-Reparación
            </h2>
            {incidencia.pruebasRealizadas && incidencia.pruebasRealizadas.length > 0 ? (
              <div className="space-y-3">
                {incidencia.pruebasRealizadas.map((prueba, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{prueba.descripcion}</span>
                      <span
                        className={cn(
                          'badge',
                          prueba.resultado === 'ok'
                            ? 'bg-green-100 text-green-800'
                            : prueba.resultado === 'fallo'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        )}
                      >
                        {prueba.resultado.toUpperCase()}
                      </span>
                    </div>
                    {prueba.observaciones && (
                      <p className="text-sm text-gray-500 mt-1">{prueba.observaciones}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Sin pruebas registradas</p>
            )}
          </div>

          {/* Materiales utilizados */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Materiales Utilizados
            </h2>
            {incidencia.materialesUtilizados && incidencia.materialesUtilizados.length > 0 ? (
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Descripción</th>
                    <th className="table-header-cell">Cantidad</th>
                    <th className="table-header-cell">Tipo</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {incidencia.materialesUtilizados.map((mat, idx) => (
                    <tr key={idx} className="table-row">
                      <td className="table-cell">{mat.descripcion}</td>
                      <td className="table-cell">{mat.cantidad}</td>
                      <td className="table-cell capitalize">{mat.tipo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic">Sin materiales registrados</p>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Tiempos y SLA */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Tiempos
            </h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Recepción</dt>
                <dd className="font-medium">
                  {formatDateTime(incidencia.timestamps.recepcion)}
                </dd>
              </div>
              {incidencia.timestamps.inicioAnalisis && (
                <div>
                  <dt className="text-sm text-gray-500">Inicio Análisis</dt>
                  <dd className="font-medium">
                    {formatDateTime(incidencia.timestamps.inicioAnalisis)}
                  </dd>
                </div>
              )}
              {incidencia.timestamps.inicioReparacion && (
                <div>
                  <dt className="text-sm text-gray-500">Inicio Reparación</dt>
                  <dd className="font-medium">
                    {formatDateTime(incidencia.timestamps.inicioReparacion)}
                  </dd>
                </div>
              )}
              {incidencia.timestamps.finReparacion && (
                <div>
                  <dt className="text-sm text-gray-500">Fin Reparación</dt>
                  <dd className="font-medium">
                    {formatDateTime(incidencia.timestamps.finReparacion)}
                  </dd>
                </div>
              )}

              <hr />

              {/* SLA */}
              <div>
                <dt className="text-sm text-gray-500">Tiempo de Atención</dt>
                <dd className="font-medium flex items-center gap-2">
                  {formatMinutes(incidencia.sla.tiempoAtencion)}
                  {incidencia.sla.dentroTiempoAtencion !== undefined && (
                    incidencia.sla.dentroTiempoAtencion ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Tiempo de Resolución</dt>
                <dd className="font-medium flex items-center gap-2">
                  {formatMinutes(incidencia.sla.tiempoResolucion)}
                  {incidencia.sla.dentroTiempoResolucion !== undefined && (
                    incidencia.sla.dentroTiempoResolucion ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Fuera de Servicio</dt>
                <dd className="font-medium">
                  {formatMinutes(incidencia.sla.fueraDeServicio)}
                </dd>
              </div>
            </div>
          </div>

          {/* Auditoría */}
          <div className="card">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Cambios
              </h2>
              <ChevronRight
                className={cn(
                  'w-5 h-5 text-gray-400 transition-transform',
                  showAudit && 'rotate-90'
                )}
              />
            </button>
            {showAudit && (
              <div className="mt-4 space-y-3">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="text-sm border-l-2 border-gray-200 pl-3">
                      <p className="text-gray-500">
                        {formatDateTime(log.timestamp)}
                      </p>
                      <p className="font-medium">
                        {log.accion === 'cambio_estado' ? 'Cambio de estado' : log.accion}
                      </p>
                      {log.cambios.map((cambio, idx) => (
                        <p key={idx} className="text-gray-600">
                          {cambio.campo}: {String(cambio.valorAnterior)} → {String(cambio.valorNuevo)}
                        </p>
                      ))}
                      <p className="text-gray-400">{log.usuarioEmail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic">Sin historial</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
