export type ServiceErrorCode =
  | 'invalid-argument'
  | 'not-found'
  | 'permission-denied'
  | 'failed-precondition'
  | 'conflict'
  | 'already-exists'
  | 'resource-exhausted'
  | 'unavailable'
  | 'unknown';

/**
 * Mapa de código de error → HTTP status (útil para API routes / logging).
 */
export const ERROR_HTTP_STATUS: Record<ServiceErrorCode, number> = {
  'invalid-argument': 400,
  'not-found': 404,
  'permission-denied': 403,
  'failed-precondition': 412,
  'conflict': 409,
  'already-exists': 409,
  'resource-exhausted': 429,
  'unavailable': 503,
  'unknown': 500,
};

/**
 * Mensajes por defecto orientados al usuario (i18n-ready).
 * Los componentes UI pueden usar `error.userMessage` directamente.
 */
export const ERROR_USER_MESSAGES: Record<ServiceErrorCode, string> = {
  'invalid-argument': 'Los datos proporcionados no son válidos.',
  'not-found': 'El recurso solicitado no existe.',
  'permission-denied': 'No tienes permisos para realizar esta acción.',
  'failed-precondition': 'La operación no se puede realizar en el estado actual.',
  'conflict': 'El recurso fue modificado por otro usuario. Recarga e inténtalo de nuevo.',
  'already-exists': 'Ya existe un recurso con esos datos.',
  'resource-exhausted': 'Se ha superado el límite de operaciones. Inténtalo más tarde.',
  'unavailable': 'El servicio no está disponible temporalmente. Inténtalo más tarde.',
  'unknown': 'Ha ocurrido un error inesperado.',
};

/** Error de capa de servicios (independiente de UI/framework). */
export class FirestoreServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly cause?: unknown;
  /** Mensaje orientado al usuario final. */
  public readonly userMessage: string;
  /** HTTP status equivalente. */
  public readonly httpStatus: number;

  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.code = code;
    this.cause = cause;
    this.userMessage = ERROR_USER_MESSAGES[code];
    this.httpStatus = ERROR_HTTP_STATUS[code];
  }

  /** Serialización segura para logs / respuestas API. */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      httpStatus: this.httpStatus,
    };
  }
}

/**
 * Mapea errores nativos de Firebase a `FirestoreServiceError`.
 * Usar en catch blocks para normalizar cualquier error.
 *
 * @example
 * ```ts
 * try { ... } catch (err) { throw mapFirebaseError(err); }
 * ```
 */
export function mapFirebaseError(err: unknown): FirestoreServiceError {
  if (err instanceof FirestoreServiceError) return err;

  // Errores de Firebase SDK tienen `code` como string (e.g. "auth/permission-denied")
  const firebaseCode = (err as any)?.code as string | undefined;

  if (typeof firebaseCode === 'string') {
    // Firebase codes vienen como "namespace/code", extraemos la parte relevante
    const rawCode = firebaseCode.includes('/') ? firebaseCode.split('/').pop()! : firebaseCode;

    const mapping: Record<string, ServiceErrorCode> = {
      'not-found': 'not-found',
      'permission-denied': 'permission-denied',
      'unauthenticated': 'permission-denied',
      'invalid-argument': 'invalid-argument',
      'failed-precondition': 'failed-precondition',
      'already-exists': 'already-exists',
      'resource-exhausted': 'resource-exhausted',
      'unavailable': 'unavailable',
      'aborted': 'conflict',
      'cancelled': 'unavailable',
      'deadline-exceeded': 'unavailable',
      'data-loss': 'unknown',
      'internal': 'unknown',
      'unimplemented': 'unknown',
    };

    const code = mapping[rawCode] ?? 'unknown';
    const message = (err as any)?.message ?? `Firebase error: ${firebaseCode}`;
    return new FirestoreServiceError(code, message, err);
  }

  // Error genérico
  const message = err instanceof Error ? err.message : 'Error desconocido';
  return new FirestoreServiceError('unknown', message, err);
}
