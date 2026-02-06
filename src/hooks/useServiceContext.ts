/**
 * =============================================================================
 * HOOK: useServiceContext
 * =============================================================================
 *
 * Hook que unifica la obtención de db, user, tenantId y ServiceContext
 * para eliminar boilerplate repetido en todos los hooks de datos.
 *
 * @example
 * ```ts
 * const { ctx, db, isReady } = useServiceContext();
 * if (!isReady) return; // aún cargando auth / sin tenantId
 * const service = new EquiposService(db);
 * const result = await service.list(ctx, {});
 * ```
 * =============================================================================
 */

'use client';

import { useMemo } from 'react';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/contexts/OperadorContext';
import { buildServiceContext } from '@/lib/firebase/services/context';
import type { ServiceContext } from '@/lib/firebase/services/base';

export interface ServiceContextValue {
  /** ServiceContext listo para pasar a cualquier servicio. */
  ctx: ServiceContext;
  /** Instancia de Firestore. */
  db: Firestore;
  /** true cuando tenemos user + tenantId (listo para llamar servicios). */
  isReady: boolean;
  /** tenantId actual (puede ser undefined si aún carga). */
  tenantId: string | undefined;
}

export function useServiceContext(): ServiceContextValue {
  const { user } = useAuth();
  const rawTenantId = useTenantId();
  const db = getFirestore();

  // useTenantId() devuelve string | null; normalizamos a string | undefined
  const tenantId = rawTenantId ?? undefined;

  const ctx = useMemo(
    () => buildServiceContext(user, tenantId),
    [user, tenantId]
  );

  const isReady = !!user && !!tenantId;

  return { ctx, db, isReady, tenantId };
}
