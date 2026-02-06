/**
 * =============================================================================
 * RESULT TYPE — Patrón funcional para manejo de errores
 * =============================================================================
 *
 * Alternativa a throw/catch para flujos donde interesa inspeccionar el error
 * sin propagación implícita. Convive con las firmas actuales (que lanzan
 * excepciones) y permite migración gradual.
 *
 * @example
 * ```ts
 * const result = await service.safeGetById(ctx, id);
 * if (!result.ok) {
 *   console.error(result.error.userMessage);
 *   return;
 * }
 * // result.data está tipado como T
 * ```
 */

import { FirestoreServiceError, type ServiceErrorCode } from './errors';

// =============================================================================
// TIPO PRINCIPAL
// =============================================================================

/** Resultado exitoso. */
export interface Ok<T> {
  readonly ok: true;
  readonly data: T;
}

/** Resultado fallido. */
export interface Fail<E = FirestoreServiceError> {
  readonly ok: false;
  readonly error: E;
}

/** Union discriminada: éxito o fallo. */
export type Result<T, E = FirestoreServiceError> = Ok<T> | Fail<E>;

// =============================================================================
// CONSTRUCTORES
// =============================================================================

/** Crea un Result exitoso. */
export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

/** Crea un Result fallido a partir de un FirestoreServiceError. */
export function fail<E = FirestoreServiceError>(error: E): Fail<E> {
  return { ok: false, error };
}

/** Crea un Result fallido rápido a partir de código + mensaje. */
export function failWith(code: ServiceErrorCode, message: string, cause?: unknown): Fail<FirestoreServiceError> {
  return fail(new FirestoreServiceError(code, message, cause));
}

// =============================================================================
// HELPERS
// =============================================================================

/** Extrae el dato o devuelve un fallback. */
export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

/** Extrae el dato o lanza la excepción contenida. */
export function unwrapOrThrow<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw result.error;
}

/** Transforma el dato si es Ok, propaga el error si es Fail. */
export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  return result.ok ? ok(fn(result.data)) : result;
}

/** Envuelve una promesa que puede lanzar en un Result. */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof FirestoreServiceError) {
      return fail(err);
    }
    return failWith('unknown', err instanceof Error ? err.message : 'Error desconocido', err);
  }
}
