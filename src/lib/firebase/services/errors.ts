export type ServiceErrorCode =
  | 'invalid-argument'
  | 'not-found'
  | 'permission-denied'
  | 'failed-precondition'
  | 'conflict'
  | 'unknown';

/** Error de capa de servicios (independiente de UI/framework). */
export class FirestoreServiceError extends Error {
  public readonly code: ServiceErrorCode;
  public readonly cause?: unknown;

  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.code = code;
    this.cause = cause;
  }
}
