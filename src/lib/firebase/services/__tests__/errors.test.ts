/**
 * Tests para errors.ts y result.ts — capa de errores del service layer.
 * Lógica pura, sin Firebase.
 */

import { describe, it, expect } from 'vitest';
import {
  FirestoreServiceError,
  mapFirebaseError,
  ERROR_HTTP_STATUS,
  ERROR_USER_MESSAGES,
  type ServiceErrorCode,
} from '../errors';
import {
  ok,
  fail,
  failWith,
  unwrapOr,
  unwrapOrThrow,
  mapResult,
  tryCatch,
  type Result,
} from '../result';

// =============================================================================
// FirestoreServiceError
// =============================================================================

describe('FirestoreServiceError', () => {
  it('debe construirse con code, message y propiedades derivadas', () => {
    const err = new FirestoreServiceError('not-found', 'Doc no existe');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FirestoreServiceError);
    expect(err.code).toBe('not-found');
    expect(err.message).toBe('Doc no existe');
    expect(err.name).toBe('FirestoreServiceError');
    expect(err.httpStatus).toBe(404);
    expect(err.userMessage).toBe(ERROR_USER_MESSAGES['not-found']);
  });

  it('debe preservar la causa original', () => {
    const original = new Error('Firestore SDK failure');
    const err = new FirestoreServiceError('unknown', 'Error', original);
    expect(err.cause).toBe(original);
  });

  it('toJSON() debe devolver serialización segura', () => {
    const err = new FirestoreServiceError('permission-denied', 'Sin permisos');
    const json = err.toJSON();

    expect(json).toEqual({
      code: 'permission-denied',
      message: 'Sin permisos',
      userMessage: ERROR_USER_MESSAGES['permission-denied'],
      httpStatus: 403,
    });
  });

  it('debe tener HTTP status correcto para todos los códigos', () => {
    const expectation: Record<ServiceErrorCode, number> = {
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

    for (const [code, status] of Object.entries(expectation)) {
      expect(ERROR_HTTP_STATUS[code as ServiceErrorCode]).toBe(status);
    }
  });
});

// =============================================================================
// mapFirebaseError
// =============================================================================

describe('mapFirebaseError', () => {
  it('debe devolver el mismo error si ya es FirestoreServiceError', () => {
    const original = new FirestoreServiceError('not-found', 'ya tipado');
    const mapped = mapFirebaseError(original);
    expect(mapped).toBe(original);
  });

  it('debe mapear códigos Firebase SDK con namespace/', () => {
    const firebaseErr = { code: 'firestore/permission-denied', message: 'No access' };
    const mapped = mapFirebaseError(firebaseErr);

    expect(mapped).toBeInstanceOf(FirestoreServiceError);
    expect(mapped.code).toBe('permission-denied');
    expect(mapped.message).toBe('No access');
  });

  it('debe mapear códigos cortos (sin namespace)', () => {
    const firebaseErr = { code: 'not-found', message: 'Missing' };
    const mapped = mapFirebaseError(firebaseErr);
    expect(mapped.code).toBe('not-found');
  });

  it('debe mapear unauthenticated a permission-denied', () => {
    const mapped = mapFirebaseError({ code: 'auth/unauthenticated', message: 'No auth' });
    expect(mapped.code).toBe('permission-denied');
  });

  it('debe mapear aborted a conflict', () => {
    const mapped = mapFirebaseError({ code: 'aborted', message: 'Transaction conflict' });
    expect(mapped.code).toBe('conflict');
  });

  it('debe mapear códigos desconocidos a unknown', () => {
    const mapped = mapFirebaseError({ code: 'some-weird-code', message: 'wat' });
    expect(mapped.code).toBe('unknown');
  });

  it('debe manejar errores genéricos de JS', () => {
    const mapped = mapFirebaseError(new TypeError('Cannot read property'));
    expect(mapped.code).toBe('unknown');
    expect(mapped.message).toBe('Cannot read property');
  });

  it('debe manejar valores no-Error', () => {
    const mapped = mapFirebaseError('string error');
    expect(mapped.code).toBe('unknown');
    expect(mapped.message).toBe('Error desconocido');
  });

  it('debe manejar null/undefined', () => {
    expect(mapFirebaseError(null).code).toBe('unknown');
    expect(mapFirebaseError(undefined).code).toBe('unknown');
  });
});

// =============================================================================
// Result<T>
// =============================================================================

describe('Result<T>', () => {
  describe('ok()', () => {
    it('debe crear un resultado exitoso', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.data).toBe(42);
    });

    it('debe funcionar con objetos complejos', () => {
      const data = { id: '1', name: 'Test' };
      const result = ok(data);
      expect(result.ok).toBe(true);
      expect(result.data).toEqual(data);
    });
  });

  describe('fail()', () => {
    it('debe crear un resultado fallido', () => {
      const err = new FirestoreServiceError('not-found', 'No existe');
      const result = fail(err);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(err);
    });
  });

  describe('failWith()', () => {
    it('debe crear un Fail con FirestoreServiceError inline', () => {
      const result = failWith('invalid-argument', 'Campo vacío');
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(FirestoreServiceError);
      expect(result.error.code).toBe('invalid-argument');
      expect(result.error.message).toBe('Campo vacío');
    });
  });

  describe('unwrapOr()', () => {
    it('debe devolver data si ok', () => {
      expect(unwrapOr(ok(10), 0)).toBe(10);
    });

    it('debe devolver fallback si fail', () => {
      const r = failWith('unknown', 'Error');
      expect(unwrapOr(r, 0)).toBe(0);
    });
  });

  describe('unwrapOrThrow()', () => {
    it('debe devolver data si ok', () => {
      expect(unwrapOrThrow(ok('hello'))).toBe('hello');
    });

    it('debe lanzar el error si fail', () => {
      const err = new FirestoreServiceError('not-found', 'Boom');
      expect(() => unwrapOrThrow(fail(err))).toThrow(FirestoreServiceError);
    });
  });

  describe('mapResult()', () => {
    it('debe transformar data si ok', () => {
      const result = mapResult(ok(5), (n) => n * 2);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(10);
    });

    it('debe propagar error si fail', () => {
      const original = failWith('unknown', 'Nope');
      const result = mapResult(original, (_n: never) => 42);
      expect(result.ok).toBe(false);
    });
  });

  describe('tryCatch()', () => {
    it('debe devolver Ok si la promesa resuelve', async () => {
      const result = await tryCatch(async () => 42);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data).toBe(42);
    });

    it('debe devolver Fail si la promesa lanza FirestoreServiceError', async () => {
      const result = await tryCatch(async () => {
        throw new FirestoreServiceError('conflict', 'Race condition');
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('conflict');
      }
    });

    it('debe devolver Fail con unknown si lanza Error genérico', async () => {
      const result = await tryCatch(async () => {
        throw new Error('Kaboom');
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('unknown');
        expect(result.error.message).toBe('Kaboom');
      }
    });

    it('debe devolver Fail con unknown si lanza string', async () => {
      const result = await tryCatch(async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('unknown');
      }
    });
  });
});
