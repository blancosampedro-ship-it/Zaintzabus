'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrdenTrabajoById,
  iniciarOT,
  completarOT,
} from '@/lib/firebase/ordenes-trabajo';
import { OrdenTrabajo, MaterialOT, ESTADOS_OT } from '@/types';
import { OTEjecucionForm } from '@/components/ordenes-trabajo';
import { Button, LoadingSpinner } from '@/components/ui';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function EjecutarOTPage() {
  const params = useParams();
  const router = useRouter();
  const { claims, usuario } = useAuth();
  const [orden, setOrden] = useState<OrdenTrabajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const ordenId = params.id as string;

  useEffect(() => {
    async function loadData() {
      if (!claims?.tenantId || !ordenId) return;

      try {
        const ot = await getOrdenTrabajoById(claims.tenantId, ordenId);
        setOrden(ot);
      } catch (error) {
        console.error('Error loading OT:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [claims?.tenantId, ordenId]);

  const handleIniciar = async () => {
    if (!claims?.tenantId || !usuario) return;

    setActionLoading(true);
    try {
      await iniciarOT(claims.tenantId, ordenId, usuario.id);
      const updated = await getOrdenTrabajoById(claims.tenantId, ordenId);
      setOrden(updated);
    } catch (error) {
      console.error('Error iniciando OT:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletar = async (data: {
    trabajosRealizados: string;
    materialesUsados: MaterialOT[];
    tiempos: {
      desplazamientoMinutos: number;
      intervencionMinutos: number;
    };
    firmaUrl?: string;
  }) => {
    if (!claims?.tenantId || !usuario) return;

    setActionLoading(true);
    try {
      await completarOT(claims.tenantId, ordenId, usuario.id, {
        trabajosRealizados: data.trabajosRealizados,
        materialesUsados: data.materialesUsados,
        tiempos: data.tiempos,
        firmaUrl: data.firmaUrl,
      });
      router.push(`/ordenes-trabajo/${ordenId}`);
    } catch (error) {
      console.error('Error completando OT:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/ordenes-trabajo/${ordenId}`);
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

  // Verificar que la OT esté en estado válido para ejecutar
  if (orden.estado !== ESTADOS_OT.ASIGNADA && orden.estado !== ESTADOS_OT.EN_CURSO) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">
          Esta OT no puede ejecutarse
        </h3>
        <p className="text-slate-400 mt-2">
          Solo las OTs asignadas o en curso pueden ser ejecutadas.
        </p>
        <Link href={`/ordenes-trabajo/${ordenId}`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al detalle
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header minimalista para tablets */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/ordenes-trabajo/${ordenId}`}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <h1 className="text-lg font-semibold text-white">Ejecutar Orden de Trabajo</h1>
      </div>

      {/* Formulario de ejecución */}
      <OTEjecucionForm
        orden={orden}
        onIniciar={handleIniciar}
        onCompletar={handleCompletar}
        onCancel={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
}
