'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { EquiposService, MovimientosEquipoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Equipo, EstadoEquipo, MovimientoEquipo, TipoUbicacionEquipo } from '@/types';

// ============================================
// useEquipos (lista con filtros)
// ============================================

export interface FiltrosEquipos {
  tipoEquipoId?: string;
  estado?: EstadoEquipo;
  operadorId?: string;
  numeroSerie?: string;
  pageSize?: number;
}

interface UseEquiposResult {
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useEquipos(filtros: FiltrosEquipos = {}): UseEquiposResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const fetch = useCallback(
    async (append = false) => {
      if (!tenantId) {
        setEquipos([]);
        setLoading(false);
        return;
      }

      try {
        if (!append) setLoading(true);
        setError(null);

        const ctx: ServiceContext = {
          tenantId,
          actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
        };

        const service = new EquiposService(db);

        const result = await service.busquedaAvanzada(ctx, {
          tipoEquipoId: filtros.tipoEquipoId,
          estado: filtros.estado,
          operadorId: filtros.operadorId,
          numeroSerie: filtros.numeroSerie,
          pageSize: filtros.pageSize ?? 50,
          lastDoc: append ? lastDoc : undefined,
        });

        if (append) {
          setEquipos((prev) => [...prev, ...result.items]);
        } else {
          setEquipos(result.items);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Error en useEquipos:', err);
        setError('Error al cargar equipos');
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, filtros, lastDoc]
  );

  useEffect(() => {
    fetch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filtros.tipoEquipoId, filtros.estado, filtros.operadorId, filtros.numeroSerie]);

  const loadMore = useCallback(() => fetch(true), [fetch]);
  const refetch = useCallback(() => fetch(false), [fetch]);

  return { equipos, loading, error, hasMore, loadMore, refetch };
}

// ============================================
// useEquipo (con histórico de movimientos)
// ============================================

interface UseEquipoResult {
  equipo: Equipo | null;
  movimientos: MovimientoEquipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEquipo(id: string | null | undefined): UseEquipoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !tenantId) {
      setEquipo(null);
      setMovimientos([]);
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

      const equiposService = new EquiposService(db);
      const movimientosService = new MovimientosEquipoService(db);

      const [equipoData, historial] = await Promise.all([
        equiposService.getById(ctx, id),
        movimientosService.getHistoricoEquipo(ctx, id, 50),
      ]);

      setEquipo(equipoData);
      setMovimientos(historial);
    } catch (err) {
      console.error('Error en useEquipo:', err);
      setError('Error al cargar equipo');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { equipo, movimientos, loading, error, refetch: fetch };
}

// ============================================
// useEquiposPorAutobus
// ============================================

interface UseEquiposPorAutobusResult {
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEquiposPorAutobus(autobusId: string | null | undefined): UseEquiposPorAutobusResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!autobusId || !tenantId) {
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

      const service = new EquiposService(db);
      const result = await service.getPorAutobus(ctx, autobusId);
      setEquipos(result);
    } catch (err) {
      console.error('Error en useEquiposPorAutobus:', err);
      setError('Error al cargar equipos del autobús');
    } finally {
      setLoading(false);
    }
  }, [autobusId, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { equipos, loading, error, refetch: fetch };
}

// ============================================
// useEquiposPorUbicacion
// ============================================

interface UseEquiposPorUbicacionResult {
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEquiposPorUbicacion(
  tipo: Exclude<TipoUbicacionEquipo, 'autobus'>,
  ubicacionId: string | null | undefined
): UseEquiposPorUbicacionResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!ubicacionId || !tenantId) {
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

      const service = new EquiposService(db);
      const result = await service.getPorUbicacion(ctx, tipo, ubicacionId);
      setEquipos(result);
    } catch (err) {
      console.error('Error en useEquiposPorUbicacion:', err);
      setError('Error al cargar equipos de la ubicación');
    } finally {
      setLoading(false);
    }
  }, [tipo, ubicacionId, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { equipos, loading, error, refetch: fetch };
}
