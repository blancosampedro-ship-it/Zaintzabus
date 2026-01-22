'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { createIncidencia } from '@/lib/firebase/incidencias';
import { getActivos } from '@/lib/firebase/activos';
import { Activo, CATEGORIAS_FALLO, Criticidad } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const incidenciaSchema = z.object({
  criticidad: z.enum(['critica', 'normal']),
  categoriaFallo: z.string().min(1, 'Selecciona una categoría'),
  naturalezaFallo: z.string().min(10, 'Describe el fallo (mínimo 10 caracteres)'),
  activoPrincipalId: z.string().min(1, 'Selecciona un activo'),
  afectaTercerosEquipos: z.boolean(),
  equiposTercerosAfectados: z.string().optional(),
  afectaProcesos: z.boolean(),
  procesosAfectados: z.string().optional(),
  observaciones: z.string().optional(),
});

type IncidenciaFormData = z.infer<typeof incidenciaSchema>;

export default function NuevaIncidenciaPage() {
  const router = useRouter();
  const { claims, usuario } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IncidenciaFormData>({
    resolver: zodResolver(incidenciaSchema),
    defaultValues: {
      criticidad: 'normal',
      afectaTercerosEquipos: false,
      afectaProcesos: false,
    },
  });

  const afectaTerceros = watch('afectaTercerosEquipos');
  const afectaProcesos = watch('afectaProcesos');

  useEffect(() => {
    async function loadActivos() {
      if (!claims?.tenantId) return;

      try {
        const data = await getActivos(claims.tenantId);
        setActivos(data);
      } catch (error) {
        console.error('Error loading activos:', error);
      } finally {
        setLoadingActivos(false);
      }
    }

    loadActivos();
  }, [claims?.tenantId]);

  const onSubmit = async (data: IncidenciaFormData) => {
    if (!claims?.tenantId || !usuario) return;

    setLoading(true);
    try {
      const activo = activos.find((a) => a.id === data.activoPrincipalId);

      const incidenciaData = {
        tipo: 'correctiva' as const,
        criticidad: data.criticidad as Criticidad,
        criticidadDefinidaPor: {
          operador: claims.rol === 'operador',
          mantenimiento: claims.rol === 'jefe_mantenimiento' || claims.rol === 'tecnico',
        },
        categoriaFallo: data.categoriaFallo,
        naturalezaFallo: data.naturalezaFallo,
        activoPrincipalId: data.activoPrincipalId,
        activoPrincipalCodigo: activo?.codigo || '',
        equiposAfectados: [],
        afectaTercerosEquipos: data.afectaTercerosEquipos,
        equiposTercerosAfectados: data.equiposTercerosAfectados
          ? data.equiposTercerosAfectados.split(',').map((s) => s.trim())
          : undefined,
        afectaProcesos: data.afectaProcesos,
        procesosAfectados: data.procesosAfectados
          ? data.procesosAfectados.split(',').map((s) => s.trim())
          : undefined,
        estado: 'nueva' as const,
        sla: {},
        reportadoPor: usuario.id,
        tenantId: claims.tenantId,
        observaciones: data.observaciones,
      };

      const id = await createIncidencia(claims.tenantId, incidenciaData, usuario.id);
      router.push(`/incidencias/${id}`);
    } catch (error) {
      console.error('Error creating incidencia:', error);
      alert('Error al crear la incidencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/incidencias"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Incidencia</h1>
          <p className="text-gray-500 mt-1">Registrar una nueva incidencia o fallo</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Criticidad */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Clasificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Criticidad *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="normal"
                    {...register('criticidad')}
                    className="w-4 h-4 text-lurraldebus-primary"
                  />
                  <span className="badge badge-normal">Normal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="critica"
                    {...register('criticidad')}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="badge badge-critica">Crítica</span>
                </label>
              </div>
            </div>

            <div>
              <label className="label">Categoría del Fallo *</label>
              <select {...register('categoriaFallo')} className="input-field">
                <option value="">Seleccionar...</option>
                {CATEGORIAS_FALLO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.categoriaFallo && (
                <p className="mt-1 text-sm text-red-600">{errors.categoriaFallo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Activo */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Activo Afectado</h2>
          <div>
            <label className="label">Activo Principal *</label>
            <select
              {...register('activoPrincipalId')}
              className="input-field"
              disabled={loadingActivos}
            >
              <option value="">Seleccionar activo...</option>
              {activos.map((activo) => (
                <option key={activo.id} value={activo.id}>
                  {activo.codigo} - {activo.marca} {activo.modelo}
                </option>
              ))}
            </select>
            {errors.activoPrincipalId && (
              <p className="mt-1 text-sm text-red-600">{errors.activoPrincipalId.message}</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Descripción del Fallo</h2>
          <div>
            <label className="label">Naturaleza del Fallo *</label>
            <textarea
              {...register('naturalezaFallo')}
              rows={4}
              className="input-field"
              placeholder="Describe detalladamente el fallo observado..."
            />
            {errors.naturalezaFallo && (
              <p className="mt-1 text-sm text-red-600">{errors.naturalezaFallo.message}</p>
            )}
          </div>
        </div>

        {/* Afecciones */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Afecciones</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('afectaTercerosEquipos')}
                  className="w-4 h-4 text-lurraldebus-primary rounded"
                />
                <span className="text-gray-700">Afecta a otros equipos</span>
              </label>
              {afectaTerceros && (
                <input
                  type="text"
                  {...register('equiposTercerosAfectados')}
                  placeholder="Equipos afectados (separados por comas)"
                  className="input-field mt-2"
                />
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('afectaProcesos')}
                  className="w-4 h-4 text-lurraldebus-primary rounded"
                />
                <span className="text-gray-700">Afecta a procesos</span>
              </label>
              {afectaProcesos && (
                <input
                  type="text"
                  {...register('procesosAfectados')}
                  placeholder="Procesos afectados (separados por comas)"
                  className="input-field mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Observaciones</h2>
          <textarea
            {...register('observaciones')}
            rows={3}
            className="input-field"
            placeholder="Observaciones adicionales (opcional)"
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Link href="/incidencias" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Incidencia'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
