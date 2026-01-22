import { Timestamp } from 'firebase/firestore';

/**
 * Convierte un Timestamp Firestore a Date, si existe.
 */
export function timestampToDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  return ts.toDate();
}

/**
 * Convierte un Date a Timestamp Firestore.
 */
export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Normaliza un valor que podría ser Date/Timestamp a Date.
 * Útil cuando recibimos datos de SDK cliente o Admin.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === 'function') {
    return maybeTs.toDate();
  }

  return null;
}
