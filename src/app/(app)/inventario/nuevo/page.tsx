'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { createInventario } from '@/lib/firebase/inventario';
import { CATEGORIAS_INVENTARIO, EstadoInventario } from '@/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

const inventarioSchema = z.object({
  sku: z.string().min(3, 'SKU mínimo 3 caracteres'),
  descripcion: z.string().min(5, 'Descripción mínimo 5 caracteres'),
  tipo: z.enum(['componente', 'repuesto', 'consumible']),
  categoria: z.string().min(1, 'Selecciona una categoría'),
  fabricante: z.string().min(2, 'Fabricante requerido'),
  modelo: z.string().min(1, 'Modelo requerido'),
  numeroSerie: z.string().optional(),
  estado: z.enum(['instalado', 'almacen', 'reparacion', 'baja']),
  ubicacionTipo: z.enum(['activo', 'almacen', 'proveedor']),
  ubicacionDescripcion: z.string().min(1, 'Ubicación requerida'),
  cantidadDisponible: z.number().optional(),
  cantidadMinima: z.number().optional(),
});

type InventarioFormData = z.infer<typeof inventarioSchema>;

export default function NuevoInventarioPage() {
  const router = useRouter();
  const { claims } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InventarioFormData>({
    resolver: zodResolver(inventarioSchema),
    defaultValues: {
      tipo: 'componente',
      estado: 'almacen',
      ubicacionTipo: 'almacen',
    },
  });

  const tipo = watch('tipo');

  const onSubmit = async (data: InventarioFormData) => {
    if (!claims?.tenantId) return;

    setLoading(true);
    try {
      const inventarioData = {
        sku: data.sku.toUpperCase(),
        descripcion: data.descripcion,
        tipo: data.tipo,
        categoria: data.categoria,
        fabricante: data.fabricante,
        modelo: data.modelo,
        numeroSerie: data.numeroSerie,
        estado: data.estado as EstadoInventario,
        ubicacion: {
          tipo: data.ubicacionTipo,
          descripcion: data.ubicacionDescripcion,
        },
        compatibleCon: [],
        ultimoMovimiento: Timestamp.now(),
        cantidadDisponible: data.cantidadDisponible,
        cantidadMinima: data.cantidadMinima,
        tenantId: claims.tenantId,
      };

      const id = await createInventario(claims.tenantId, inventarioData);
      router.push(`/inventario/${id}`);
    } catch (error) {
      console.error('Error creating inventario:', error);
      alert('Error al crear el item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/inventario"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Componente</h1>
          <p className="text-gray-500 mt-1">Añadir un nuevo item al inventario</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificación */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Identificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">SKU *</label>
              <input
                {...register('sku')}
                className="input-field uppercase"
                placeholder="SAE-001"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
              )}
            </div>

            <div>
              <label className="label">Tipo *</label>
              <select {...register('tipo')} className="input-field">
                <option value="componente">Componente</option>
                <option value="repuesto">Repuesto</option>
                <option value="consumible">Consumible</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Descripción *</label>
              <input
                {...register('descripcion')}
                className="input-field"
                placeholder="Descripción del componente"
              />
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
              )}
            </div>

            <div>
              <label className="label">Categoría *</label>
              <select {...register('categoria')} className="input-field">
                <option value="">Seleccionar...</option>
                {CATEGORIAS_INVENTARIO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.categoria && (
                <p className="mt-1 text-sm text-red-600">{errors.categoria.message}</p>
              )}
            </div>

            <div>
              <label className="label">Número de Serie</label>
              <input
                {...register('numeroSerie')}
                className="input-field"
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        {/* Fabricante */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Fabricante</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Fabricante *</label>
              <input
                {...register('fabricante')}
                className="input-field"
                placeholder="Nombre del fabricante"
              />
              {errors.fabricante && (
                <p className="mt-1 text-sm text-red-600">{errors.fabricante.message}</p>
              )}
            </div>

            <div>
              <label className="label">Modelo *</label>
              <input
                {...register('modelo')}
                className="input-field"
                placeholder="Modelo"
              />
              {errors.modelo && (
                <p className="mt-1 text-sm text-red-600">{errors.modelo.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Estado y ubicación */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Estado y Ubicación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Estado *</label>
              <select {...register('estado')} className="input-field">
                <option value="almacen">En Almacén</option>
                <option value="instalado">Instalado</option>
                <option value="reparacion">En Reparación</option>
              </select>
            </div>

            <div>
              <label className="label">Tipo de Ubicación *</label>
              <select {...register('ubicacionTipo')} className="input-field">
                <option value="almacen">Almacén</option>
                <option value="activo">Activo/Vehículo</option>
                <option value="proveedor">Proveedor</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Descripción Ubicación *</label>
              <input
                {...register('ubicacionDescripcion')}
                className="input-field"
                placeholder="Ej: Almacén Central, Bus 1234-ABC, Proveedor XYZ"
              />
              {errors.ubicacionDescripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.ubicacionDescripcion.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stock (solo para repuestos y consumibles) */}
        {(tipo === 'repuesto' || tipo === 'consumible') && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Control de Stock</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Cantidad Disponible</label>
                <input
                  type="number"
                  {...register('cantidadDisponible', { valueAsNumber: true })}
                  className="input-field"
                  min={0}
                />
              </div>

              <div>
                <label className="label">Cantidad Mínima (alerta)</label>
                <input
                  type="number"
                  {...register('cantidadMinima', { valueAsNumber: true })}
                  className="input-field"
                  min={0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Link href="/inventario" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Item'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
