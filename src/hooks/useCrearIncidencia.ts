'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { IncidenciasService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { Criticidad } from '@/types';

/** Datos mínimos para crear incidencia. */
export interface CrearIncidenciaData {
  /** Tipo de incidencia (correctiva, preventiva). */
  tipo: 'correctiva' | 'preventiva';
  /** Criticidad. */
  criticidad: Criticidad;
  /** Categoría del fallo. */
  categoriaFallo: string;
  /** Naturaleza del fallo. */
  naturalezaFallo: string;
  /** ID del activo principal afectado. */
  activoPrincipalId: string;
  /** Código del activo principal. */
  activoPrincipalCodigo: string;
  /** Quién define la criticidad. */
  criticidadDefinidaPor: {
    operador: boolean;
    mantenimiento: boolean;
  };
  /** Información del reportador. */
  reportadoPor?: string;
  /** Equipos afectados. */
  equiposAfectados?: Array<{
    inventarioId: string;
    descripcion: string;
  }>;
  /** Afecta a equipos de terceros. */
  afectaTercerosEquipos?: boolean;
  /** Afecta procesos. */
  afectaProcesos?: boolean;
}

interface UseCrearIncidenciaResult {
  crear: (data: CrearIncidenciaData) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para crear incidencias.
 */
export function useCrearIncidencia(): UseCrearIncidenciaResult {
  const tenantId = useTenantId();
  const { user, claims } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (data: CrearIncidenciaData): Promise<string | null> => {
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
          actor: { 
            uid: user.uid, 
            email: user.email ?? undefined,
            tenantId: claims?.tenantId,
          },
        };

        const service = new IncidenciasService(db);
        const nuevaIncidenciaId = await service.createConCodigo(ctx, {
          ...data,
          equiposAfectados: data.equiposAfectados ?? [],
          afectaTercerosEquipos: data.afectaTercerosEquipos ?? false,
          afectaProcesos: data.afectaProcesos ?? false,
          reportadoPor: data.reportadoPor ?? user.email ?? 'desconocido',
          tenantId,
        });

        success(`Incidencia creada correctamente`);
        return nuevaIncidenciaId;
      } catch (err: any) {
        console.error('Error en useCrearIncidencia:', err);
        const mensaje = err.message || 'Error al crear incidencia';
        setError(mensaje);
        mostrarError(mensaje);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, claims, success, mostrarError]
  );

  return { crear, loading, error };
}
