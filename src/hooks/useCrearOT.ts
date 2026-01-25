'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { OrdenesTrabajoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { TipoOT, Criticidad, FacturacionOT } from '@/types';

/** Datos mínimos para crear OT. */
export interface CrearOTData {
  /** Origen de la OT. */
  origen: 'incidencia' | 'preventivo';
  /** ID incidencia origen (si aplica). */
  incidenciaId?: string;
  /** ID preventivo origen (si aplica). */
  preventivoId?: string;
  /** Tipo de OT. */
  tipo: TipoOT;
  /** Criticidad. */
  criticidad?: Criticidad;
  /** Operador asignado. */
  operadorId?: string;
  /** Autobús afectado. */
  autobusId?: string;
  /** Equipos afectados. */
  equiposIds?: string[];
  /** Facturación. */
  facturacion?: FacturacionOT;
}

interface UseCrearOTResult {
  crear: (data: CrearOTData) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para crear órdenes de trabajo.
 */
export function useCrearOT(): UseCrearOTResult {
  const tenantId = useTenantId();
  const { user, claims } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (data: CrearOTData): Promise<string | null> => {
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
            tenantId: claims?.tenantId, // Tenant de origen del actor (para auditoría cross-tenant)
          },
        };

        const service = new OrdenesTrabajoService(db);
        const nuevaOTId = await service.createConCodigo(ctx, data as any);

        success(`Orden de trabajo creada correctamente`);
        return nuevaOTId;
      } catch (err: any) {
        console.error('Error en useCrearOT:', err);
        const mensaje = err.message || 'Error al crear orden de trabajo';
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
