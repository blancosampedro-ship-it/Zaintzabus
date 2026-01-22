'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { AutobusesService, EquiposService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Autobus, Equipo, EstadoAutobus } from '@/types';

// ============================================
// useAutobuses
// ============================================

export interface FiltrosAutobuses {
  operadorId?: string;
  estado?: EstadoAutobus;
  pageSize?: number;
}

interface UseAutobusesResult {
  autobuses: Autobus[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAutobuses(filtros: FiltrosAutobuses = {}): UseAutobusesResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const ctx: ServiceContext = {
    tenantId: tenantId ?? undefined,
    actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
  };

  const fetch = useCallback(
    async (append = false) => {
      if (!tenantId) {
        setAutobuses([]);
        setLoading(false);
        return;
      }

      try {
        if (!append) setLoading(true);
        setError(null);

        const service = new AutobusesService(db);

        let result;
        if (filtros.operadorId) {
          result = await service.listByOperador(ctx, filtros.operadorId, {
            pageSize: filtros.pageSize ?? 50,
            startAfter: append ? lastDoc : undefined,
          });
        } else if (filtros.estado) {
          result = await service.listByEstado(ctx, filtros.estado, {
            pageSize: filtros.pageSize ?? 50,
            startAfter: append ? lastDoc : undefined,
          });
        } else {
          result = await service.list(ctx, {
            pageSize: filtros.pageSize ?? 50,
            startAfter: append ? lastDoc : undefined,
            orderBy: [{ fieldPath: 'codigo', direction: 'asc' }],
          });
        }

        if (append) {
          setAutobuses((prev) => [...prev, ...result.items]);
        } else {
          setAutobuses(result.items);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Error en useAutobuses:', err);
        setError('Error al cargar autobuses');
      } finally {
        setLoading(false);
      }
    },
    [tenantId, filtros.operadorId, filtros.estado, filtros.pageSize, lastDoc]
  );

  useEffect(() => {
    fetch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filtros.operadorId, filtros.estado]);

  const loadMore = useCallback(() => fetch(true), [fetch]);
  const refetch = useCallback(() => fetch(false), [fetch]);

  return { autobuses, loading, error, hasMore, loadMore, refetch };
}

// ============================================
// useAutobus (con equipos)
// ============================================

interface UseAutobusResult {
  autobus: Autobus | null;
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAutobus(id: string | null | undefined): UseAutobusResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [autobus, setAutobus] = useState<Autobus | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !tenantId) {
      setAutobus(null);
      setEquipos([]);
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

      const autobusService = new AutobusesService(db);
      const equiposService = new EquiposService(db);

      const result = await autobusService.getConEquipos(ctx, id, equiposService);

      if (result) {
        setAutobus(result.autobus);
        setEquipos(result.equipos);
      } else {
        setAutobus(null);
        setEquipos([]);
      }
    } catch (err) {
      console.error('Error en useAutobus:', err);
      setError('Error al cargar autobús');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { autobus, equipos, loading, error, refetch: fetch };
}
