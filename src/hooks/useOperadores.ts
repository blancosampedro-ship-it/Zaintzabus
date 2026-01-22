'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { OperadoresService } from '@/lib/firebase/services';
import type { Tenant } from '@/types';

interface UseOperadoresResult {
  operadores: Tenant[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener la lista de operadores (tenants).
 * @param soloActivos Si true, filtra solo los activos (default true)
 */
export function useOperadores(soloActivos = true): UseOperadoresResult {
  const [operadores, setOperadores] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const service = new OperadoresService(db);
      const lista = soloActivos ? await service.listActivos() : await service.list();
      setOperadores(lista);
    } catch (err) {
      console.error('Error en useOperadores:', err);
      setError('Error al cargar operadores');
    } finally {
      setLoading(false);
    }
  }, [soloActivos]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { operadores, loading, error, refetch: fetch };
}

interface UseOperadorResult {
  operador: Tenant | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener un operador por ID.
 */
export function useOperador(id: string | null | undefined): UseOperadorResult {
  const [operador, setOperador] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setOperador(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const service = new OperadoresService(db);
      const data = await service.getById(id);
      setOperador(data);
    } catch (err) {
      console.error('Error en useOperador:', err);
      setError('Error al cargar operador');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { operador, loading, error, refetch: fetch };
}
