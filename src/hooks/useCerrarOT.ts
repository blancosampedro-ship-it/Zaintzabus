'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { OrdenesTrabajoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { EstadoOT, MaterialOT } from '@/types';
import { serverTimestamp } from 'firebase/firestore';

export interface CerrarOTParams {
  ordenId: string;
  /** Trabajos realizados (descripción). */
  trabajosRealizados: string;
  /** Estado final: 'completada', 'validada' o 'rechazada'. */
  estadoFinal?: Extract<EstadoOT, 'completada' | 'validada' | 'rechazada'>;
  /** Materiales utilizados (opcional). */
  materialesUsados?: MaterialOT[];
  /** Tiempo de desplazamiento en minutos. */
  desplazamientoMinutos?: number;
  /** Tiempo de intervención en minutos. */
  intervencionMinutos?: number;
  /** URL de la firma del operador. */
  firmaOperadorUrl?: string;
}

interface UseCerrarOTResult {
  cerrar: (params: CerrarOTParams) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cerrar órdenes de trabajo (completar o rechazar).
 */
export function useCerrarOT(): UseCerrarOTResult {
  const tenantId = useTenantId();
  const { user, claims } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = useCallback(
    async (params: CerrarOTParams): Promise<boolean> => {
      if (!tenantId) {
        mostrarError('No hay operador seleccionado');
        return false;
      }

      if (!user) {
        mostrarError('Debes iniciar sesión');
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        const ctx: ServiceContext = {
          tenantId,
          actor: { 
            uid: user.uid, 
            email: user.email ?? undefined,
            tenantId: claims?.tenantId,
          },
        };

        const service = new OrdenesTrabajoService(db);

        // Primero registrar la ejecución
        await service.registrarEjecucion(ctx, params.ordenId, {
          fechaFinReal: serverTimestamp(),
          desplazamientoMinutos: params.desplazamientoMinutos,
          intervencionMinutos: params.intervencionMinutos,
          trabajosRealizados: params.trabajosRealizados,
          materialesUsados: params.materialesUsados,
          firmaOperadorUrl: params.firmaOperadorUrl,
        });

        // Cambiar estado
        const estadoFinal = params.estadoFinal ?? 'completada';
        await service.cambiarEstado(ctx, params.ordenId, estadoFinal);

        const mensaje = estadoFinal === 'completada' ? 'OT completada correctamente' : estadoFinal === 'validada' ? 'OT validada' : 'OT rechazada';
        success(mensaje);
        return true;
      } catch (err: any) {
        console.error('Error en useCerrarOT:', err);
        const mensaje = err.message || 'Error al cerrar orden de trabajo';
        setError(mensaje);
        mostrarError(mensaje);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, claims, success, mostrarError]
  );

  return { cerrar, loading, error };
}
