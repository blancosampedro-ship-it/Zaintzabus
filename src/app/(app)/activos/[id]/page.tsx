'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Activo, TIPO_ACTIVO_LABELS, ESTADO_ACTIVO_LABELS, EstadoActivo } from '@/types';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import { formatDate } from '@/lib/utils/index';
import {
  ArrowLeft,
  Bus,
  CreditCard,
  Monitor,
  Wifi,
  Edit2,
  Save,
  X,
  MapPin,
  Calendar,
  Gauge,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  autobus: Bus,
  validadora: CreditCard,
  pantalla_info: Monitor,
  router_wifi: Wifi,
  otro: Settings,
};

export default function ActivoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, claims, hasRole } = useAuth();
  const [activo, setActivo] = useState<Activo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Activo>>({});

  const canEdit = hasRole(['admin', 'jefe_mantenimiento', 'tecnico']);

  useEffect(() => {
    loadActivo();
  }, [id, claims?.tenantId]);

  const loadActivo = async () => {
    if (!claims?.tenantId || !id) return;

    setLoading(true);
    try {
      const docRef = doc(db, `tenants/${claims.tenantId}/activos`, id as string);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        setActivo({ id: snapshot.id, ...snapshot.data() } as Activo);
      }
    } catch (error) {
      console.error('Error loading activo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (activo) {
      setEditData({
        estado: activo.estado,
        kilometraje: activo.kilometraje,
        horasOperacion: activo.horasOperacion,
      });
      setEditing(true);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!activo || !claims?.tenantId || !user) return;

    setSaving(true);
    try {
      const docRef = doc(db, `tenants/${claims.tenantId}/activos`, activo.id);
      await updateDoc(docRef, {
        ...editData,
        updatedAt: Timestamp.now(),
      });

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'update',
        coleccion: 'activos',
        documentoId: activo.id,
        cambios: {
          antes: { estado: activo.estado, kilometraje: activo.kilometraje },
          despues: editData,
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
      });

      await loadActivo();
      setEditing(false);
    } catch (error) {
      console.error('Error saving activo:', error);
    } finally {
      setSaving(false);
    }
  };

  const getEstadoBadgeClass = (estado: EstadoActivo) => {
    const classes: Record<EstadoActivo, string> = {
      operativo: 'bg-green-100 text-green-800',
      en_taller: 'bg-yellow-100 text-yellow-800',
      averiado: 'bg-red-100 text-red-800',
      baja: 'bg-gray-100 text-gray-800',
    };
    return classes[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoIcon = (estado: EstadoActivo) => {
    const icons: Record<EstadoActivo, React.ReactNode> = {
      operativo: <CheckCircle className="w-5 h-5 text-green-600" />,
      en_taller: <Wrench className="w-5 h-5 text-yellow-600" />,
      averiado: <AlertTriangle className="w-5 h-5 text-red-600" />,
      baja: <XCircle className="w-5 h-5 text-gray-600" />,
    };
    return icons[estado];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lurraldebus-primary"></div>
      </div>
    );
  }

  if (!activo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Activo no encontrado</p>
        <Link href="/activos" className="btn-primary mt-4 inline-block">
          Volver a Activos
        </Link>
      </div>
    );
  }

  const IconComponent = ICON_MAP[activo.tipo] || Settings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/activos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-lurraldebus-primary flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{activo.codigo}</h1>
              <p className="text-gray-500">{TIPO_ACTIVO_LABELS[activo.tipo]}</p>
            </div>
          </div>
        </div>
        {canEdit && !editing && (
          <button onClick={handleEdit} className="btn-secondary flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Estado Actual</h3>
            {editing ? (
              <select
                value={editData.estado || activo.estado}
                onChange={(e) => setEditData({ ...editData, estado: e.target.value as EstadoActivo })}
                className="input-field"
              >
                {Object.entries(ESTADO_ACTIVO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                {getEstadoIcon(activo.estado)}
                <span className={`badge ${getEstadoBadgeClass(activo.estado)}`}>
                  {ESTADO_ACTIVO_LABELS[activo.estado]}
                </span>
              </div>
            )}
          </div>

          {/* Identificación */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Identificación</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Código</p>
                <p className="font-medium">{activo.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium">{TIPO_ACTIVO_LABELS[activo.tipo]}</p>
              </div>
              {activo.subtipo && (
                <div>
                  <p className="text-sm text-gray-500">Subtipo</p>
                  <p className="font-medium capitalize">{activo.subtipo}</p>
                </div>
              )}
              {activo.matricula && (
                <div>
                  <p className="text-sm text-gray-500">Matrícula</p>
                  <p className="font-medium">{activo.matricula}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Marca</p>
                <p className="font-medium">{activo.marca || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Modelo</p>
                <p className="font-medium">{activo.modelo || '-'}</p>
              </div>
            </div>
          </div>

          {/* Métricas de Uso */}
          {(activo.tipo === 'autobus') && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Métricas de Uso</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kilometraje</p>
                    {editing ? (
                      <input
                        type="number"
                        value={editData.kilometraje || activo.kilometraje || 0}
                        onChange={(e) =>
                          setEditData({ ...editData, kilometraje: parseInt(e.target.value) })
                        }
                        className="input-field w-32"
                      />
                    ) : (
                      <p className="font-medium">
                        {activo.kilometraje?.toLocaleString('es-ES')} km
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Horas de Operación</p>
                    {editing ? (
                      <input
                        type="number"
                        value={editData.horasOperacion || activo.horasOperacion || 0}
                        onChange={(e) =>
                          setEditData({ ...editData, horasOperacion: parseInt(e.target.value) })
                        }
                        className="input-field w-32"
                      />
                    ) : (
                      <p className="font-medium">
                        {activo.horasOperacion?.toLocaleString('es-ES')} h
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historial reciente */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Información Adicional</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Año de Fabricación</span>
                <span className="font-medium">{activo.anyoFabricacion || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha de Adquisición</span>
                <span className="font-medium">
                  {activo.fechaAdquisicion ? formatDate(activo.fechaAdquisicion) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Número de Serie</span>
                <span className="font-medium">{activo.numeroSerie || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ubicación */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lurraldebus-primary" />
              Ubicación Base
            </h3>
            {activo.ubicacionBase ? (
              <div className="space-y-2">
                <p className="font-medium">{activo.ubicacionBase.nombre}</p>
                {activo.ubicacionBase.direccion && (
                  <p className="text-sm text-gray-500">{activo.ubicacionBase.direccion}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Sin ubicación asignada</p>
            )}
          </div>

          {/* Fechas */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lurraldebus-primary" />
              Fechas
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Creado</span>
                <span>{activo.createdAt ? formatDate(activo.createdAt) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actualizado</span>
                <span>{activo.updatedAt ? formatDate(activo.updatedAt) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <Link
                href={`/incidencias?activo=${activo.codigo}`}
                className="block w-full btn-secondary text-center"
              >
                Ver Incidencias
              </Link>
              <Link
                href={`/preventivo?activo=${activo.id}`}
                className="block w-full btn-secondary text-center"
              >
                Ver Mantenimientos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
