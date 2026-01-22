'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { EquiposService, type ServiceContext, type CambiarUbicacionParams } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { TipoUbicacionEquipo, TipoMovimientoEquipo, UbicacionActualEquipo } from '@/types';

export interface MoverEquipoParams {
  equipoId: string;
  destino: UbicacionActualEquipo;
  tipoMovimiento: TipoMovimientoEquipo;
  motivo?: string;
  otId?: string;
  incidenciaId?: string;
  tecnicosIds?: string[];
  comentarios?: string;
}

interface UseMoverEquipoResult {
  mover: (params: MoverEquipoParams) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para mover equipos entre ubicaciones.
 * Crea automáticamente el movimiento en el histórico.
 */
export function useMoverEquipo(): UseMoverEquipoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mover = useCallback(
    async (params: MoverEquipoParams): Promise<string | null> => {
      if (!tenantId) {
        mostrarError('No hay operador seleccionado');
        return null;
      }

      if (!user) {
        mostrarError('Debes iniciar sesión');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const ctx: ServiceContext = {
          tenantId,
          actor: { uid: user.uid, email: user.email ?? undefined },
        };

        const equiposService = new EquiposService(db);

        const movimientoId = await equiposService.cambiarUbicacionRegistrandoMovimiento(ctx, params.equipoId, {
          destino: params.destino,
          tipoMovimiento: params.tipoMovimiento,
          motivo: params.motivo,
          otId: params.otId,
          incidenciaId: params.incidenciaId,
          tecnicosIds: params.tecnicosIds,
          comentarios: params.comentarios,
        });

        success(`Equipo movido a ${params.destino.nombre}`);
        return movimientoId;
      } catch (err: any) {
        console.error('Error en useMoverEquipo:', err);
        const mensaje = err.message || 'Error al mover equipo';
        setError(mensaje);
        mostrarError(mensaje);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, success, mostrarError]
  );

  return { mover, loading, error };
}
