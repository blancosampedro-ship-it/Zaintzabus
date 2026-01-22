'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { EquiposService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { EstadoEquipo } from '@/types';

interface UseCambiarEstadoEquipoResult {
  cambiarEstado: (equipoId: string, nuevoEstado: EstadoEquipo) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cambiar el estado de un equipo.
 */
export function useCambiarEstadoEquipo(): UseCambiarEstadoEquipoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiarEstado = useCallback(
    async (equipoId: string, nuevoEstado: EstadoEquipo): Promise<boolean> => {
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

        const service = new EquiposService(db);
        await service.cambiarEstado(ctx, equipoId, nuevoEstado);

        const etiquetasEstado: Record<EstadoEquipo, string> = {
          en_servicio: 'en servicio',
          en_almacen: 'en almacén',
          en_laboratorio: 'en laboratorio',
          averiado: 'averiado',
          baja: 'dado de baja',
        };
        success(`Equipo marcado como ${etiquetasEstado[nuevoEstado]}`);
        return true;
      } catch (err: any) {
        console.error('Error en useCambiarEstadoEquipo:', err);
        const mensaje = err.message || 'Error al cambiar estado del equipo';
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
