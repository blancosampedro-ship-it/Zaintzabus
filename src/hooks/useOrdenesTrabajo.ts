'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { OrdenesTrabajoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { OrdenTrabajo, EstadoOT } from '@/types';

// ============================================
// useOrdenesTrabajo (lista con filtros)
// ============================================

export interface FiltrosOT {
  tecnicoId?: string;
  operadorId?: string;
  estado?: EstadoOT;
  pageSize?: number;
}

interface UseOrdenesTrabajoResult {
  ordenes: OrdenTrabajo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrdenesTrabajo(filtros: FiltrosOT = {}): UseOrdenesTrabajoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estabilizar filtros para evitar re-renders innecesarios
  const pageSize = filtros.pageSize ?? 50;
  const tecnicoId = filtros.tecnicoId;
  const operadorId = filtros.operadorId;
  const estado = filtros.estado;

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setOrdenes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ctx: ServiceContext = {
        tenantId,
        actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
      };

      const service = new OrdenesTrabajoService(db);
      const result = await service.filtrar(ctx, {
        tecnicoId,
        operadorId,
        estado,
        pageSize,
      });

      setOrdenes(result);
    } catch (err) {
      console.error('Error en useOrdenesTrabajo:', err);
      setError('Error al cargar órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, pageSize, tecnicoId, operadorId, estado]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ordenes, loading, error, refetch: fetch };
}

// ============================================
// useOrdenTrabajo (detalle completo)
// ============================================

interface UseOrdenTrabajoResult {
  orden: OrdenTrabajo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrdenTrabajo(id: string | null | undefined): UseOrdenTrabajoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [orden, setOrden] = useState<OrdenTrabajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !tenantId) {
      setOrden(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ctx: ServiceContext = {
        tenantId,
        actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
      };

      const service = new OrdenesTrabajoService(db);
      const data = await service.getById(ctx, id);
      setOrden(data);
    } catch (err) {
      console.error('Error en useOrdenTrabajo:', err);
      setError('Error al cargar orden de trabajo');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { orden, loading, error, refetch: fetch };
}
