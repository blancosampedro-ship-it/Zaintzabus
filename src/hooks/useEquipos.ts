'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { EquiposService, MovimientosEquipoService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Equipo, EstadoEquipo, MovimientoEquipo, TipoUbicacionEquipo } from '@/types';

// ============================================
// useEquipos (lista con filtros y búsqueda server-side)
// ============================================

export interface FiltrosEquipos {
  tipoEquipoId?: string;
  estado?: EstadoEquipo;
  operadorId?: string;
  ubicacionTipo?: TipoUbicacionEquipo;
  ubicacionId?: string;
  /** Término de búsqueda para searchTerms (código, serie, ICCID, etc.) */
  searchTerm?: string;
  pageSize?: number;
}

interface UseEquiposResult {
  equipos: Equipo[];
  loading: boolean;
  searching: boolean; // Estado separado para búsquedas (evita parpadeo)
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
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Ref para cancelar búsquedas obsoletas (debounce)
  const searchVersionRef = useRef(0);

  // Estabilizar filtros para evitar re-renders innecesarios
  const pageSize = filtros.pageSize ?? 50;
  const tipoEquipoId = filtros.tipoEquipoId;
  const estado = filtros.estado;
  const operadorId = filtros.operadorId;
  const ubicacionTipo = filtros.ubicacionTipo;
  const ubicacionId = filtros.ubicacionId;
  const searchTerm = filtros.searchTerm;

  const fetch = useCallback(
    async (append = false, startAfterDoc?: any) => {
      if (!tenantId) {
        setEquipos([]);
        setLoading(false);
        return;
      }

      // Incrementar versión para cancelar búsquedas anteriores
      const currentVersion = ++searchVersionRef.current;

      try {
        // Usar searching en vez de loading para búsquedas (evita parpadeo)
        if (!append) {
          if (searchTerm) {
            setSearching(true);
          } else {
            setLoading(true);
          }
        }
        setError(null);

        const ctx: ServiceContext = {
          tenantId,
          actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
        };

        const service = new EquiposService(db);

        const result = await service.busquedaAvanzada(ctx, {
          tipoEquipoId,
          estado,
          operadorId,
          ubicacionTipo,
          ubicacionId,
          searchTerm,
          pageSize,
          lastDoc: startAfterDoc,
        });

        // Ignorar si hay una búsqueda más reciente
        if (currentVersion !== searchVersionRef.current) return;

        if (append) {
          setEquipos((prev) => [...prev, ...result.items]);
        } else {
          setEquipos(result.items);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        // Ignorar errores de búsquedas obsoletas
        if (currentVersion !== searchVersionRef.current) return;
        
        console.error('Error en useEquipos:', err);
        setError('Error al cargar equipos');
      } finally {
        if (currentVersion === searchVersionRef.current) {
          setLoading(false);
          setSearching(false);
        }
      }
    },
    [tenantId, user, pageSize, tipoEquipoId, estado, operadorId, ubicacionTipo, ubicacionId, searchTerm]
  );

  useEffect(() => {
    fetch(false);
  }, [fetch]);

  const loadMore = useCallback(() => fetch(true, lastDoc), [fetch, lastDoc]);
  const refetch = useCallback(() => fetch(false), [fetch]);

  return { equipos, loading, searching, error, hasMore, loadMore, refetch };
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

// ============================================
// useBusquedaRapidaEquipos (para autocompletar)
// ============================================

interface UseBusquedaRapidaResult {
  resultados: Equipo[];
  searching: boolean;
  search: (term: string) => void;
  clear: () => void;
}

/**
 * Hook para búsqueda rápida con debounce.
 * Ideal para input de autocompletar.
 * @param debounceMs - Tiempo de debounce en ms (default 300)
 */
export function useBusquedaRapidaEquipos(debounceMs = 300): UseBusquedaRapidaResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [resultados, setResultados] = useState<Equipo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const versionRef = useRef(0);

  const doSearch = useCallback(async (term: string) => {
    if (!tenantId || term.trim().length < 2) {
      setResultados([]);
      setSearching(false);
      return;
    }

    const currentVersion = ++versionRef.current;
    setSearching(true);

    try {
      const ctx: ServiceContext = {
        tenantId,
        actor: user ? { uid: user.uid, email: user.email ?? undefined } : undefined,
      };

      const service = new EquiposService(db);
      const items = await service.busquedaRapida(ctx, term, 10);

      // Solo actualizar si es la búsqueda más reciente
      if (currentVersion === versionRef.current) {
        setResultados(items);
      }
    } catch (err) {
      console.error('Error en búsqueda rápida:', err);
      if (currentVersion === versionRef.current) {
        setResultados([]);
      }
    } finally {
      if (currentVersion === versionRef.current) {
        setSearching(false);
      }
    }
  }, [tenantId, user]);

  const search = useCallback((term: string) => {
    setSearchTerm(term);
    
    // Cancelar búsqueda anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (term.trim().length < 2) {
      setResultados([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(() => {
      doSearch(term);
    }, debounceMs);
  }, [doSearch, debounceMs]);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchTerm('');
    setResultados([]);
    setSearching(false);
  }, []);

  // Cleanup en unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { resultados, searching, search, clear };
}

// ============================================
// useEquiposEnStock (equipos en almacén/lab)
// ============================================

interface UseEquiposEnStockResult {
  equipos: Equipo[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener equipos en stock (almacén o laboratorio).
 * Útil para técnicos buscando equipos disponibles.
 */
export function useEquiposEnStock(pageSize = 50): UseEquiposEnStockResult {
  const tenantId = useTenantId();
  const { user } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const fetch = useCallback(async (append = false, startAfterDoc?: any) => {
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
      const result = await service.getEquiposEnStock(ctx, pageSize, startAfterDoc);

      if (append) {
        setEquipos((prev) => [...prev, ...result.items]);
      } else {
        setEquipos(result.items);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error en useEquiposEnStock:', err);
      setError('Error al cargar equipos en stock');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, pageSize]);

  useEffect(() => {
    fetch(false);
  }, [fetch]);

  const loadMore = useCallback(() => fetch(true, lastDoc), [fetch, lastDoc]);
  const refetch = useCallback(() => fetch(false), [fetch]);

  return { equipos, loading, error, hasMore, loadMore, refetch };
}