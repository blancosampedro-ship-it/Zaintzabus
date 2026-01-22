'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Inventario, CATEGORIA_INVENTARIO_LABELS, ESTADO_INVENTARIO_LABELS, EstadoInventario } from '@/types';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import { formatDate } from '@/lib/utils/index';
import {
  ArrowLeft,
  Package,
  Edit2,
  Save,
  X,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building2,
  Tag,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

export default function InventarioDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, claims, hasRole } = useAuth();
  const [item, setItem] = useState<Inventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Inventario>>({});

  const canEdit = hasRole(['admin', 'jefe_mantenimiento', 'tecnico']);

  useEffect(() => {
    loadItem();
  }, [id, claims?.tenantId]);

  const loadItem = async () => {
    if (!claims?.tenantId || !id) return;

    setLoading(true);
    try {
      const docRef = doc(db, `tenants/${claims.tenantId}/inventario`, id as string);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        setItem({ id: snapshot.id, ...snapshot.data() } as Inventario);
      }
    } catch (error) {
      console.error('Error loading item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (item) {
      setEditData({
        cantidadDisponible: item.cantidadDisponible,
        cantidadMinima: item.cantidadMinima,
        estado: item.estado,
      });
      setEditing(true);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!item || !claims?.tenantId || !user) return;

    setSaving(true);
    try {
      const docRef = doc(db, `tenants/${claims.tenantId}/inventario`, item.id);

      const nuevoEstado = editData.estado || item.estado;
      const nuevaCantidadDisponible = editData.cantidadDisponible ?? item.cantidadDisponible;
      const nuevaCantidadMinima = editData.cantidadMinima ?? item.cantidadMinima;

      await updateDoc(docRef, {
        ...editData,
        estado: nuevoEstado,
        updatedAt: Timestamp.now(),
      });

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'update',
        coleccion: 'inventario',
        documentoId: item.id,
        cambios: {
          antes: {
            cantidadDisponible: item.cantidadDisponible,
            cantidadMinima: item.cantidadMinima,
            estado: item.estado,
          },
          despues: {
            cantidadDisponible: nuevaCantidadDisponible,
            cantidadMinima: nuevaCantidadMinima,
            estado: nuevoEstado,
          },
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
      });

      await loadItem();
      setEditing(false);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const getEstadoBadgeClass = (estado: EstadoInventario) => {
    const classes: Record<EstadoInventario, string> = {
      almacen: 'bg-blue-100 text-blue-800',
      instalado: 'bg-green-100 text-green-800',
      reparacion: 'bg-yellow-100 text-yellow-800',
      baja: 'bg-gray-100 text-gray-800',
    };
    return classes[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoIcon = (estado: EstadoInventario) => {
    const icons: Record<EstadoInventario, React.ReactNode> = {
      almacen: <Building2 className="w-5 h-5 text-blue-600" />,
      instalado: <CheckCircle className="w-5 h-5 text-green-600" />,
      reparacion: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      baja: <X className="w-5 h-5 text-gray-600" />,
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

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Item no encontrado</p>
        <Link href="/inventario" className="btn-primary mt-4 inline-block">
          Volver a Inventario
        </Link>
      </div>
    );
  }

  const isStockControl = item.tipo === 'repuesto' || item.tipo === 'consumible';
  const cantidadDisponible = item.cantidadDisponible ?? 0;
  const cantidadMinima = item.cantidadMinima ?? 0;
  const isLowStock =
    isStockControl &&
    item.cantidadDisponible !== undefined &&
    item.cantidadMinima !== undefined &&
    cantidadDisponible <= cantidadMinima;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/inventario"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isLowStock ? 'bg-yellow-500' : 'bg-lurraldebus-primary'
            }`}>
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{item.sku}</h1>
              <p className="text-gray-500">{item.descripcion}</p>
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

      {/* Low Stock Warning */}
      {isLowStock && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-yellow-800 font-medium">Stock bajo</p>
            <p className="text-yellow-700 text-sm">
              Disponible: {cantidadDisponible} | Mínimo: {cantidadMinima}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado y Stock */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Estado y Stock</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                {editing ? (
                  <select
                    value={editData.estado || item.estado}
                    onChange={(e) => setEditData({ ...editData, estado: e.target.value as EstadoInventario })}
                    className="input-field mt-1"
                  >
                    {Object.entries(ESTADO_INVENTARIO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    {getEstadoIcon(item.estado)}
                    <span className={`badge ${getEstadoBadgeClass(item.estado)}`}>
                      {ESTADO_INVENTARIO_LABELS[item.estado]}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Cantidad Disponible</p>
                {editing ? (
                  <input
                    type="number"
                    value={editData.cantidadDisponible ?? item.cantidadDisponible ?? 0}
                    onChange={(e) =>
                      setEditData({ ...editData, cantidadDisponible: parseInt(e.target.value, 10) })
                    }
                    className="input-field mt-1"
                    min="0"
                  />
                ) : (
                  <p className={`font-bold text-2xl mt-1 ${isLowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {item.cantidadDisponible ?? '-'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Cantidad Mínima</p>
                {editing ? (
                  <input
                    type="number"
                    value={editData.cantidadMinima ?? item.cantidadMinima ?? 0}
                    onChange={(e) =>
                      setEditData({ ...editData, cantidadMinima: parseInt(e.target.value, 10) })
                    }
                    className="input-field mt-1"
                    min="0"
                  />
                ) : (
                  <p className="font-medium text-lg mt-1">{item.cantidadMinima ?? '-'}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo</p>
                <p className="font-medium text-lg mt-1">{item.tipo}</p>
              </div>
            </div>
          </div>

          {/* Información del Producto */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-lurraldebus-primary" />
              Información del Producto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-mono font-medium">{item.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Categoría</p>
                <p className="font-medium">{CATEGORIA_INVENTARIO_LABELS[item.categoria]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fabricante</p>
                <p className="font-medium">{item.fabricante || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Modelo</p>
                <p className="font-medium">{item.modelo || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="font-medium">{item.descripcion}</p>
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
              Ubicación
            </h3>
            {item.ubicacion ? (
              <div className="space-y-2">
                <p className="font-medium">{item.ubicacion.descripcion}</p>
              </div>
            ) : (
              <p className="text-gray-500">Sin ubicación asignada</p>
            )}
          </div>

          {/* Proveedor */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-lurraldebus-primary" />
              Proveedor Habitual
            </h3>
            <p className="text-gray-500">No disponible en el modelo actual</p>
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
                <span>{item.createdAt ? formatDate(item.createdAt) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Actualizado</span>
                <span>{item.updatedAt ? formatDate(item.updatedAt) : '-'}</span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              {canEdit && (
                <>
                  <button className="w-full btn-primary">Registrar Entrada</button>
                  <button className="w-full btn-secondary">Registrar Salida</button>
                </>
              )}
              <Link
                href={`/incidencias?repuesto=${item.sku}`}
                className="block w-full btn-secondary text-center"
              >
                Ver Incidencias
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
