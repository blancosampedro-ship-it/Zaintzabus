'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { MovimientosEquipoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { MovimientoEquipo, TipoMovimientoEquipo } from '@/types';

// ============================================
// useMovimientosEquipo (histórico de un equipo)
// ============================================

interface UseMovimientosEquipoResult {
  movimientos: MovimientoEquipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMovimientosEquipo(
  equipoId: string | null | undefined,
  pageSize = 50
): UseMovimientosEquipoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [movimientos, setMovimientos] = useState<MovimientoEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!equipoId || !tenantId) {
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

      const service = new MovimientosEquipoService(db);
      const result = await service.getHistoricoEquipo(ctx, equipoId, pageSize);
      setMovimientos(result);
    } catch (err) {
      console.error('Error en useMovimientosEquipo:', err);
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [equipoId, tenantId, user, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { movimientos, loading, error, refetch: fetch };
}

// ============================================
// useMovimientosPorFiltros (búsqueda general)
// ============================================

export interface FiltrosMovimientos {
  desde?: Date;
  hasta?: Date;
  tecnicoId?: string;
  tipoMovimiento?: TipoMovimientoEquipo;
  pageSize?: number;
}

interface UseMovimientosPorFiltrosResult {
  movimientos: MovimientoEquipo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMovimientosPorFiltros(filtros: FiltrosMovimientos = {}): UseMovimientosPorFiltrosResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [movimientos, setMovimientos] = useState<MovimientoEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
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

      const service = new MovimientosEquipoService(db);
      const result = await service.getMovimientos(ctx, {
        desde: filtros.desde,
        hasta: filtros.hasta,
        tecnicoId: filtros.tecnicoId,
        tipoMovimiento: filtros.tipoMovimiento,
        pageSize: filtros.pageSize ?? 100,
      });

      setMovimientos(result);
    } catch (err) {
      console.error('Error en useMovimientosPorFiltros:', err);
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, filtros]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { movimientos, loading, error, refetch: fetch };
}
