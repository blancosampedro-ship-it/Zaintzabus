'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import { TIPO_ACTIVO_LABELS, ESTADO_ACTIVO_LABELS, TipoActivo, EstadoActivo } from '@/types';
import {
  ArrowLeft,
  Bus,
  Save,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

const activoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  subtipo: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  matricula: z.string().optional(),
  numeroSerie: z.string().optional(),
  anyoFabricacion: z.number().optional(),
  fechaAdquisicion: z.string().optional(),
  estado: z.string().default('operativo'),
  ubicacionNombre: z.string().optional(),
  ubicacionDireccion: z.string().optional(),
  kilometraje: z.number().optional(),
  horasOperacion: z.number().optional(),
});

type ActivoFormData = z.infer<typeof activoSchema>;

export default function NuevoActivoPage() {
  const router = useRouter();
  const { user, claims, hasRole } = useAuth();
  const [saving, setSaving] = useState(false);

  const canCreate = hasRole(['admin', 'jefe_mantenimiento', 'operador']);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ActivoFormData>({
    resolver: zodResolver(activoSchema),
    defaultValues: {
      estado: 'operativo',
      tipo: 'autobus',
    },
  });

  const tipoActivo = watch('tipo');

  const onSubmit = async (data: ActivoFormData) => {
    if (!claims?.tenantId || !user) return;

    setSaving(true);
    try {
      const activosRef = collection(db, `tenants/${claims.tenantId}/activos`);
      
      const activoData = {
        codigo: data.codigo,
        tipo: data.tipo,
        subtipo: data.subtipo || null,
        marca: data.marca || null,
        modelo: data.modelo || null,
        matricula: data.matricula || null,
        numeroSerie: data.numeroSerie || null,
        anyoFabricacion: data.anyoFabricacion || null,
        fechaAdquisicion: data.fechaAdquisicion
          ? Timestamp.fromDate(new Date(data.fechaAdquisicion))
          : null,
        estado: data.estado,
        ubicacionBase: data.ubicacionNombre
          ? {
              id: `ub-${Date.now()}`,
              nombre: data.ubicacionNombre,
              direccion: data.ubicacionDireccion || null,
            }
          : null,
        kilometraje: data.kilometraje || 0,
        horasOperacion: data.horasOperacion || 0,
        tenantId: claims.tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(activosRef, activoData);

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'create',
        coleccion: 'activos',
        documentoId: docRef.id,
        cambios: {
          antes: null,
          despues: activoData,
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
      });

      router.push(`/activos/${docRef.id}`);
    } catch (error) {
      console.error('Error creating activo:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No tienes permisos para crear activos</p>
        <Link href="/activos" className="btn-primary mt-4 inline-block">
          Volver a Activos
        </Link>
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Activo</h1>
          <p className="text-gray-500 mt-1">Registrar un nuevo activo en la flota</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificación */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bus className="w-5 h-5 text-lurraldebus-primary" />
            Identificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Código *</label>
              <input
                {...register('codigo')}
                className="input-field"
                placeholder="Ej: LBG-001"
              />
              {errors.codigo && (
                <p className="text-red-500 text-sm mt-1">{errors.codigo.message}</p>
              )}
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select {...register('tipo')} className="input-field">
                {Object.entries(TIPO_ACTIVO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Subtipo</label>
              <input
                {...register('subtipo')}
                className="input-field"
                placeholder="Ej: Urbano, Interurbano"
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select {...register('estado')} className="input-field">
                {Object.entries(ESTADO_ACTIVO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Datos Técnicos */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Datos Técnicos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Marca</label>
              <input
                {...register('marca')}
                className="input-field"
                placeholder="Ej: Mercedes-Benz"
              />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input
                {...register('modelo')}
                className="input-field"
                placeholder="Ej: Citaro G"
              />
            </div>
            {(tipoActivo === 'autobus') && (
              <div>
                <label className="label">Matrícula</label>
                <input
                  {...register('matricula')}
                  className="input-field"
                  placeholder="Ej: 1234-ABC"
                />
              </div>
            )}
            <div>
              <label className="label">Número de Serie</label>
              <input
                {...register('numeroSerie')}
                className="input-field"
                placeholder="Número de serie del fabricante"
              />
            </div>
            <div>
              <label className="label">Año de Fabricación</label>
              <input
                type="number"
                {...register('anyoFabricacion', { valueAsNumber: true })}
                className="input-field"
                placeholder="Ej: 2020"
              />
            </div>
            <div>
              <label className="label">Fecha de Adquisición</label>
              <input
                type="date"
                {...register('fechaAdquisicion')}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Métricas (solo para autobuses) */}
        {tipoActivo === 'autobus' && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Métricas de Uso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Kilometraje Inicial</label>
                <input
                  type="number"
                  {...register('kilometraje', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Horas de Operación</label>
                <input
                  type="number"
                  {...register('horasOperacion', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ubicación */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Ubicación Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre de Ubicación</label>
              <input
                {...register('ubicacionNombre')}
                className="input-field"
                placeholder="Ej: Cocheras Donostia"
              />
            </div>
            <div>
              <label className="label">Dirección</label>
              <input
                {...register('ubicacionDireccion')}
                className="input-field"
                placeholder="Dirección completa"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/activos" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Crear Activo'}
          </button>
        </div>
      </form>
    </div>
  );
}
