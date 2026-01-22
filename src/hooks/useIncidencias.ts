'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { IncidenciasService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Incidencia, EstadoIncidencia, Criticidad } from '@/types';

// ============================================
// useIncidencias (lista con filtros)
// ============================================

export interface FiltrosIncidencias {
  estado?: EstadoIncidencia | EstadoIncidencia[];
  criticidad?: Criticidad;
  operadorId?: string;
  pageSize?: number;
}

interface UseIncidenciasResult {
  incidencias: Incidencia[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useIncidencias(filtros: FiltrosIncidencias = {}): UseIncidenciasResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setIncidencias([]);
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

      const service = new IncidenciasService(db);
      const result = await service.filtrar(ctx, {
        estado: filtros.estado,
        criticidad: filtros.criticidad,
        operadorId: filtros.operadorId,
        pageSize: filtros.pageSize ?? 50,
      });

      setIncidencias(result);
    } catch (err) {
      console.error('Error en useIncidencias:', err);
      setError('Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, filtros]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { incidencias, loading, error, refetch: fetch };
}

// ============================================
// useIncidencia (detalle completo)
// ============================================

interface UseIncidenciaResult {
  incidencia: Incidencia | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useIncidencia(id: string | null | undefined): UseIncidenciaResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !tenantId) {
      setIncidencia(null);
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

      const service = new IncidenciasService(db);
      const data = await service.getById(ctx, id);
      setIncidencia(data);
    } catch (err) {
      console.error('Error en useIncidencia:', err);
      setError('Error al cargar incidencia');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { incidencia, loading, error, refetch: fetch };
}
