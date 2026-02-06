/**
 * =============================================================================
 * HOOK: useServiceCall
 * =============================================================================
 *
 * Hook genérico que encapsula el patrón try/setLoading/catch/setError/finally
 * repetido en todos los hooks de datos. Además, inspecciona
 * `FirestoreServiceError.code` para dar mensajes de error significativos.
 *
 * @example
 * ```ts
 * const { execute, loading, error, data } = useServiceCall<Equipo[]>();
 *
 * const fetchEquipos = useCallback(() => {
 *   return execute(async () => {
 *     const service = new EquiposService(db);
 *     const page = await service.list(ctx, {});
 *     return page.items;
 *   });
 * }, [ctx, db, execute]);
 * ```
 * =============================================================================
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

export interface UseServiceCallReturn<T> {
  /** Ejecuta la función de servicio con manejo de estado automático. */
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  /** Estado de carga. */
  loading: boolean;
  /** Mensaje de error para la UI (inspecciona FirestoreServiceError.userMessage). */
  error: string | null;
  /** Último dato devuelto con éxito. */
  data: T | undefined;
  /** Limpia el estado de error. */
  clearError: () => void;
  /** Resetea todo el estado. */
  reset: () => void;
}

export function useServiceCall<T>(options?: {
  /** Si true, no establece loading=true al ejecutar (útil para background refresh). */
  silent?: boolean;
}): UseServiceCallReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | undefined>(undefined);
  
  // Versión para cancelar llamadas obsoletas
  const versionRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(undefined);
    versionRef.current += 1;
  }, []);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | undefined> => {
      const version = ++versionRef.current;

      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fn();

        // Solo actualizar si somos la versión más reciente
        if (version === versionRef.current) {
          setData(result);
          return result;
        }
        return undefined;
      } catch (err) {
        // Solo actualizar error si somos la versión más reciente
        if (version === versionRef.current) {
          if (err instanceof FirestoreServiceError) {
            // Usar el mensaje orientado al usuario
            setError(err.userMessage);
            console.error(`[ServiceCall] ${err.code}: ${err.message}`, err.cause);
          } else {
            setError('Ha ocurrido un error inesperado.');
            console.error('[ServiceCall] Error no tipado:', err);
          }
        }
        return undefined;
      } finally {
        if (version === versionRef.current) {
          setLoading(false);
        }
      }
    },
    [options?.silent]
  );

  return { execute, loading, error, data, clearError, reset };
}
