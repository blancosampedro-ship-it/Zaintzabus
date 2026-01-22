'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { IncidenciasService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { EstadoIncidencia } from '@/types';

interface UseCambiarEstadoIncidenciaResult {
  cambiarEstado: (
    incidenciaId: string,
    nuevoEstado: EstadoIncidencia,
    observacion?: string
  ) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cambiar el estado de una incidencia.
 */
export function useCambiarEstadoIncidencia(): UseCambiarEstadoIncidenciaResult {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiarEstado = useCallback(
    async (
      incidenciaId: string,
      nuevoEstado: EstadoIncidencia,
      observacion?: string
    ): Promise<boolean> => {
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
          actor: { uid: user.uid, email: user.email ?? undefined },
        };

        const service = new IncidenciasService(db);
        await service.cambiarEstado(ctx, incidenciaId, nuevoEstado, observacion);

        const etiquetasEstado: Record<EstadoIncidencia, string> = {
          nueva: 'Nueva',
          en_analisis: 'En análisis',
          en_intervencion: 'En intervención',
          resuelta: 'Resuelta',
          cerrada: 'Cerrada',
          reabierta: 'Reabierta',
        };
        success(`Incidencia marcada como "${etiquetasEstado[nuevoEstado]}"`);
        return true;
      } catch (err: any) {
        console.error('Error en useCambiarEstadoIncidencia:', err);
        const mensaje = err.message || 'Error al cambiar estado de la incidencia';
        setError(mensaje);
        mostrarError(mensaje);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, success, mostrarError]
  );

  return { cambiarEstado, loading, error };
}
