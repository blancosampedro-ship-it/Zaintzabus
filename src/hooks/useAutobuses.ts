'use client';

import { useState, useEffect, useCallback } from 'react';
import { AutobusesService, EquiposService } from '@/lib/firebase/services';
import { useServiceContext } from '@/hooks/useServiceContext';
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
  const { ctx, db, isReady } = useServiceContext();

  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Estabilizar filtros para evitar re-renders innecesarios
  const pageSize = filtros.pageSize ?? 50;
  const operadorId = filtros.operadorId;
  const estado = filtros.estado;

  const fetch = useCallback(
    async (append = false, startAfterDoc?: any) => {
      if (!isReady) {
        setAutobuses([]);
        setLoading(false);
        return;
      }

      try {
        if (!append) setLoading(true);
        setError(null);

        const service = new AutobusesService(db);

        let result;
        if (operadorId) {
          result = await service.listByOperador(ctx, operadorId, {
            pageSize,
            startAfter: startAfterDoc,
          });
        } else if (estado) {
          result = await service.listByEstado(ctx, estado, {
            pageSize,
            startAfter: startAfterDoc,
          });
        } else {
          result = await service.list(ctx, {
            pageSize,
            startAfter: startAfterDoc,
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
    [isReady, ctx, db, operadorId, estado, pageSize]
  );

  useEffect(() => {
    fetch(false);
  }, [fetch]);

  const loadMore = useCallback(() => fetch(true, lastDoc), [fetch, lastDoc]);
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
  const { ctx, db, isReady } = useServiceContext();

  const [autobus, setAutobus] = useState<Autobus | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !isReady) {
      setAutobus(null);
      setEquipos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
  }, [id, isReady, ctx, db]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { autobus, equipos, loading, error, refetch: fetch };
}
