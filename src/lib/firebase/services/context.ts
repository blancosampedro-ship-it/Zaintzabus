/**
 * =============================================================================
 * SERVICE CONTEXT BUILDER
 * =============================================================================
 *
 * Función pura que construye un `ServiceContext` a partir de `user` y `tenantId`.
 * Elimina la repetición de ~20 hooks que lo hacen manualmente.
 *
 * @example
 * ```ts
 * import { buildServiceContext } from '@/lib/firebase/services/context';
 * const ctx = buildServiceContext(user, tenantId);
 * ```
 * =============================================================================
 */

import type { User } from 'firebase/auth';
import type { ServiceContext, ActorContext } from './base';

/**
 * Construye un ServiceContext estándar a partir del usuario de Firebase
 * y el tenantId actual.
 */
export function buildServiceContext(
  user: User | null | undefined,
  tenantId: string | undefined
): ServiceContext {
  const actor: ActorContext | undefined = user
    ? {
        uid: user.uid,
        email: user.email ?? undefined,
      }
    : undefined;

  return {
    tenantId,
    actor,
  };
}
