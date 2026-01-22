'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import { createPreventivo } from '@/lib/firebase/preventivo';
import { PERIODICIDAD_LABELS, Periodicidad, PreventivoFormData, TIPO_ACTIVO_LABELS } from '@/types';
import {
  ArrowLeft,
  ClipboardList,
  Save,
  Plus,
  Trash2,
  ListChecks,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

const tareaSchema = z.object({
  descripcion: z.string().min(1, 'La descripción es requerida'),
  tiempoEstimado: z.number().min(1, 'El tiempo estimado debe ser mayor a 0'),
});

const planSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  tipoActivo: z.string().min(1, 'El tipo de activo es requerido'),
  periodicidad: z.enum(['3M', '6M', '1A', '2A']),
  tareas: z.array(tareaSchema).min(1, 'Debe incluir al menos una tarea'),
});

type PlanFormData = z.infer<typeof planSchema>;

export default function NuevoPreventivoPage() {
  const router = useRouter();
  const { user, claims, hasRole } = useAuth();
  const [saving, setSaving] = useState(false);

  // DFG es solo lectura; alta limitada a admin/jefe_mantenimiento
  const canCreate = hasRole(['admin', 'jefe_mantenimiento']);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      tipoActivo: 'autobus',
      periodicidad: '1A',
      tareas: [{ descripcion: '', tiempoEstimado: 30 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tareas',
  });

  function calcularProximaEjecucion(fecha: Date, periodicidad: Periodicidad): Date {
    const nueva = new Date(fecha);
    switch (periodicidad) {
      case '3M':
        nueva.setMonth(nueva.getMonth() + 3);
        break;
      case '6M':
        nueva.setMonth(nueva.getMonth() + 6);
        break;
      case '1A':
        nueva.setFullYear(nueva.getFullYear() + 1);
        break;
      case '2A':
        nueva.setFullYear(nueva.getFullYear() + 2);
        break;
    }
    return nueva;
  }

  const onSubmit = async (data: PlanFormData) => {
    if (!claims?.tenantId || !user) return;

    setSaving(true);
    try {
      const ahora = new Date();
      const proxima = calcularProximaEjecucion(ahora, data.periodicidad as Periodicidad);

      const planData: PreventivoFormData = {
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        tipoActivo: data.tipoActivo,
        periodicidad: data.periodicidad as Periodicidad,
        tareas: data.tareas.map((t, index) => ({
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${index}`,
          orden: index + 1,
          descripcion: t.descripcion,
          categoria: 'General',
          tiempoEstimado: t.tiempoEstimado,
          obligatoria: true,
        })),
        proximaEjecucion: Timestamp.fromDate(proxima),
        activo: true,
        tenantId: claims.tenantId,
      };

      const preventivoId = await createPreventivo(claims.tenantId, planData);

      await registrarAuditoria({
        tenantId: claims.tenantId,
        accion: 'create',
        coleccion: 'preventivo',
        documentoId: preventivoId,
        cambios: {
          antes: null,
          despues: planData,
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
        usuarioRol: claims.rol,
      });

      router.push(`/preventivo/${preventivoId}`);
    } catch (error) {
      console.error('Error creating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No tienes permisos para crear planes preventivos</p>
        <Link href="/preventivo" className="btn-primary mt-4 inline-block">
          Volver a Preventivo
        </Link>
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Plan Preventivo</h1>
          <p className="text-gray-500 mt-1">Crear un nuevo plan de mantenimiento preventivo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información General */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-lurraldebus-primary" />
            Información General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Activo *</label>
              <select {...register('tipoActivo')} className="input-field">
                {Object.entries(TIPO_ACTIVO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Nombre *</label>
              <input
                {...register('nombre')}
                className="input-field"
                placeholder="Ej: Revisión cada 15.000 km"
              />
              {errors.nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <textarea
                {...register('descripcion')}
                rows={3}
                className="input-field"
                placeholder="Descripción detallada del plan de mantenimiento..."
              />
            </div>
          </div>
        </div>

        {/* Periodicidad */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-lurraldebus-primary" />
            Periodicidad
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Periodicidad *</label>
              <select {...register('periodicidad')} className="input-field">
                {(Object.entries(PERIODICIDAD_LABELS) as Array<[Periodicidad, string]>).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="text-sm text-gray-500 flex items-end">
              El código se genera automáticamente.
            </div>
          </div>
        </div>

        {/* Tareas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-lurraldebus-primary" />
              Tareas
            </h3>
            <button
              type="button"
              onClick={() => append({ descripcion: '', tiempoEstimado: 30 })}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Añadir Tarea
            </button>
          </div>

          {errors.tareas && (
            <p className="text-red-500 text-sm mb-4">{errors.tareas.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-lurraldebus-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="label">Descripción *</label>
                    <input
                      {...register(`tareas.${index}.descripcion`)}
                      className="input-field"
                      placeholder="Descripción de la tarea"
                    />
                    {errors.tareas?.[index]?.descripcion && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.tareas[index]?.descripcion?.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label">Tiempo (min) *</label>
                    <input
                      type="number"
                      {...register(`tareas.${index}.tiempoEstimado`, { valueAsNumber: true })}
                      className="input-field"
                      placeholder="30"
                    />
                  </div>
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Tiempo total estimado:{' '}
              <span className="font-medium text-gray-900">
                {(watch('tareas') || []).reduce(
                  (acc, t) => acc + (t?.tiempoEstimado || 0),
                  0
                )}{' '}
                minutos
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/preventivo" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Guardando...' : 'Crear Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
