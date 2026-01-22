'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { OrdenesTrabajoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';

interface UseAsignarOTResult {
  asignar: (ordenId: string, tecnicoId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para asignar órdenes de trabajo a técnicos.
 */
export function useAsignarOT(): UseAsignarOTResult {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asignar = useCallback(
    async (ordenId: string, tecnicoId: string): Promise<boolean> => {
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

        const ordenesService = new OrdenesTrabajoService(db);
        await ordenesService.asignarTecnico(ctx, ordenId, tecnicoId);

        success('OT asignada correctamente');
        return true;
      } catch (err: any) {
        console.error('Error en useAsignarOT:', err);
        const mensaje = err.message || 'Error al asignar orden de trabajo';
        setError(mensaje);
        mostrarError(mensaje);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, success, mostrarError]
  );

  return { asignar, loading, error };
}
