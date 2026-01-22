'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Preventivo, PERIODICIDAD_LABELS } from '@/types';
import { getPreventivoById, updatePreventivo } from '@/lib/firebase/preventivo';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import { formatDate } from '@/lib/utils/index';
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Edit2,
  Save,
  X,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  Settings,
  ListChecks,
} from 'lucide-react';
import Link from 'next/link';

export default function PreventivoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, claims, hasRole } = useAuth();
  const [plan, setPlan] = useState<Preventivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Preventivo>>({});

  // DFG es solo lectura; edición limitada a admin/jefe_mantenimiento
  const canEdit = hasRole(['admin', 'jefe_mantenimiento']);

  useEffect(() => {
    loadPlan();
  }, [id, claims?.tenantId]);

  const loadPlan = async () => {
    if (!claims?.tenantId || !id) return;

    setLoading(true);
    try {
      const preventivo = await getPreventivoById(claims.tenantId, id as string);
      if (preventivo) setPlan(preventivo);
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (plan) {
      setEditData({
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        activo: plan.activo,
      });
      setEditing(true);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!plan || !claims?.tenantId || !user) return;

    setSaving(true);
    try {
      await updatePreventivo(claims.tenantId, plan.id, {
        nombre: (editData.nombre ?? plan.nombre) as Preventivo['nombre'],
        descripcion: (editData.descripcion ?? plan.descripcion) as Preventivo['descripcion'],
      });

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'update',
        coleccion: 'preventivo',
        documentoId: plan.id,
        cambios: {
          antes: { nombre: plan.nombre, descripcion: plan.descripcion },
          despues: {
            nombre: editData.nombre ?? plan.nombre,
            descripcion: editData.descripcion ?? plan.descripcion,
          },
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
        usuarioRol: claims.rol,
      });

      await loadPlan();
      setEditing(false);
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async () => {
    if (!plan || !claims?.tenantId || !user) return;

    try {
      await updatePreventivo(claims.tenantId, plan.id, {
        activo: !plan.activo,
      });

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'update',
        coleccion: 'preventivo',
        documentoId: plan.id,
        cambios: {
          antes: { activo: plan.activo },
          despues: { activo: !plan.activo },
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
        usuarioRol: claims.rol,
      });

      await loadPlan();
    } catch (error) {
      console.error('Error toggling plan:', error);
    }
  };

  const getPeriodicidadText = (plan: Preventivo) => {
    return PERIODICIDAD_LABELS[plan.periodicidad] || plan.periodicidad;
  };

  const isOverdue = (plan: Preventivo) => {
    if (!plan.proximaEjecucion) return false;
    const proxima = plan.proximaEjecucion.toDate();
    return proxima < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lurraldebus-primary"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Plan preventivo no encontrado</p>
        <Link href="/preventivo" className="btn-primary mt-4 inline-block">
          Volver a Preventivo
        </Link>
      </div>
    );
  }

  const overdue = isOverdue(plan);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/preventivo"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              plan.activo ? 'bg-lurraldebus-primary' : 'bg-gray-400'
            }`}>
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{plan.codigo}</h1>
              <p className="text-gray-500">{plan.nombre}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={toggleActivo}
                className={`btn-secondary flex items-center gap-2 ${
                  plan.activo ? 'text-yellow-600' : 'text-green-600'
                }`}
              >
                {plan.activo ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Activar
                  </>
                )}
              </button>
              {!editing ? (
                <button onClick={handleEdit} className="btn-secondary flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
              ) : (
                <>
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
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {!plan.activo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <Pause className="w-5 h-5 text-yellow-600" />
          <p className="text-yellow-800">Este plan de mantenimiento está pausado</p>
        </div>
      )}

      {overdue && plan.activo && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">Este mantenimiento está vencido</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Descripción</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Nombre</label>
                  <input
                    type="text"
                    value={editData.nombre || plan.nombre}
                    onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea
                    value={editData.descripcion || plan.descripcion}
                    onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                    rows={3}
                    className="input-field"
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-600">{plan.descripcion || 'Sin descripción'}</p>
            )}
          </div>

          {/* Periodicidad */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-lurraldebus-primary" />
              Periodicidad
            </h3>
            <div>
              <p className="text-sm text-gray-500">Frecuencia</p>
              <p className="font-medium text-lg">{getPeriodicidadText(plan)}</p>
            </div>
          </div>

          {/* Tareas */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-lurraldebus-primary" />
              Tareas ({plan.tareas?.length || 0})
            </h3>
            {plan.tareas && plan.tareas.length > 0 ? (
              <div className="space-y-3">
                {plan.tareas.map((tarea, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-lurraldebus-primary text-white flex items-center justify-center text-sm font-medium">
                      {tarea.orden || index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{tarea.descripcion}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {tarea.tiempoEstimado} min
                        </span>
                        {((tarea as any).materiales?.length || tarea.materialesRequeridos?.length) ? (
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {((tarea as any).materiales?.length ?? tarea.materialesRequeridos?.length) || 0}{' '}
                            materiales
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay tareas definidas</p>
            )}
          </div>

          {/* Activos Asociados */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-lurraldebus-primary" />
              Activos Asociados ({((plan as any).activosAsociados as string[] | undefined)?.length || 0})
            </h3>
            {((plan as any).activosAsociados as string[] | undefined)?.length ? (
              <div className="flex flex-wrap gap-2">
                {((plan as any).activosAsociados as string[]).map((activoId) => (
                  <Link
                    key={activoId}
                    href={`/activos/${activoId}`}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"
                  >
                    {activoId}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay activos asociados</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estado */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Estado</h3>
            <div className="flex items-center gap-2">
              {plan.activo ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="badge bg-green-100 text-green-800">Activo</span>
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 text-yellow-600" />
                  <span className="badge bg-yellow-100 text-yellow-800">Pausado</span>
                </>
              )}
            </div>
          </div>

          {/* Tipo de Activo */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Tipo de Activo</h3>
            <p className="font-medium">
              {plan.tipoActivo || '-'}
            </p>
          </div>

          {/* Fechas de Ejecución */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-lurraldebus-primary" />
              Ejecuciones
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Última Ejecución</p>
                <p className="font-medium">
                  {plan.ultimaEjecucion ? formatDate(plan.ultimaEjecucion) : 'Nunca'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Próxima Ejecución</p>
                <p className={`font-medium ${overdue ? 'text-red-600' : ''}`}>
                  {plan.proximaEjecucion ? formatDate(plan.proximaEjecucion) : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Tiempo Estimado */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Tiempo Total Estimado</h3>
            <p className="text-2xl font-bold text-lurraldebus-primary">
              {plan.tareas?.reduce((acc, t) => acc + (t.tiempoEstimado || 0), 0) || 0} min
            </p>
          </div>

          {/* Acciones */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
            <button className="w-full btn-primary">
              Ejecutar Mantenimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
