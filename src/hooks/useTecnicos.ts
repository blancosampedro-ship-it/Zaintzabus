'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { TecnicosService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Tecnico, EstadoTecnico } from '@/types';

// ============================================
// useTecnicos (lista con filtros)
// ============================================

export interface FiltrosTecnicos {
  estado?: EstadoTecnico;
  zonaId?: string;
  especialidad?: string;
  pageSize?: number;
}

interface UseTecnicosResult {
  tecnicos: Tecnico[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTecnicos(filtros: FiltrosTecnicos = {}): UseTecnicosResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setTecnicos([]);
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

      const service = new TecnicosService(db);

      let result;
      if (filtros.estado) {
        result = await service.listByEstado(ctx, filtros.estado, {
          pageSize: filtros.pageSize ?? 100,
        });
      } else if (filtros.zonaId) {
        result = await service.listByZona(ctx, filtros.zonaId, {
          pageSize: filtros.pageSize ?? 100,
        });
      } else if (filtros.especialidad) {
        const items = await service.findByEspecialidad(ctx, filtros.especialidad, filtros.pageSize ?? 100);
        result = { items, hasMore: false, lastDoc: null };
      } else {
        result = await service.list(ctx, {
          pageSize: filtros.pageSize ?? 100,
          orderBy: [{ fieldPath: 'apellidos', direction: 'asc' }],
        });
      }

      setTecnicos(result.items);
    } catch (err) {
      console.error('Error en useTecnicos:', err);
      setError('Error al cargar técnicos');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, filtros]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tecnicos, loading, error, refetch: fetch };
}

// ============================================
// useTecnico (detalle)
// ============================================

interface UseTecnicoResult {
  tecnico: Tecnico | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTecnico(id: string | null | undefined): UseTecnicoResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [tecnico, setTecnico] = useState<Tecnico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id || !tenantId) {
      setTecnico(null);
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

      const service = new TecnicosService(db);
      const data = await service.getById(ctx, id);
      setTecnico(data);
    } catch (err) {
      console.error('Error en useTecnico:', err);
      setError('Error al cargar técnico');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tecnico, loading, error, refetch: fetch };
}
