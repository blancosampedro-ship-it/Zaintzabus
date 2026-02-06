'use client';

import { useState, useEffect, useCallback } from 'react';
import { IncidenciasService } from '@/lib/firebase/services';
import { useServiceContext } from '@/hooks/useServiceContext';
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
  const { ctx, db, isReady, tenantId } = useServiceContext();

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estabilizar filtros para evitar re-renders innecesarios
  const pageSize = filtros.pageSize ?? 50;
  const operadorId = filtros.operadorId;
  const criticidad = filtros.criticidad;
  // Serializar estado para comparación estable (puede ser array o string)
  const estadoKey = Array.isArray(filtros.estado)
    ? filtros.estado.sort().join(',')
    : filtros.estado ?? '';

  const fetch = useCallback(async () => {
    if (!isReady) {
      setIncidencias([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const service = new IncidenciasService(db);
      const result = await service.filtrar(ctx, {
        estado: filtros.estado,
        criticidad,
        operadorId,
        pageSize,
      });

      setIncidencias(result);
    } catch (err) {
      console.error('Error en useIncidencias:', err);
      setError('Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  }, [isReady, ctx, db, pageSize, operadorId, criticidad, estadoKey, filtros.estado]);

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
  const { ctx, db, isReady } = useServiceContext();

  const [incidencia, setIncidencia] = useState<Incidencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !isReady) {
      setIncidencia(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const service = new IncidenciasService(db);
      const data = await service.getById(ctx, id);
      setIncidencia(data);
    } catch (err) {
      console.error('Error en useIncidencia:', err);
      setError('Error al cargar incidencia');
    } finally {
      setLoading(false);
    }
  }, [id, isReady, ctx, db]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { incidencia, loading, error, refetch: fetch };
}
