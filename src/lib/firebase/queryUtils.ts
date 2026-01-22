/**
 * Utilidades para optimizar queries de Firestore
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
  Firestore,
  getCountFromServer,
  Query,
} from 'firebase/firestore';
import { db } from './config';

// ============================================
// Paginación con cursores
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  lastCursor: string | null;
  totalCount?: number;
}

export interface PaginationOptions {
  pageSize?: number;
  cursor?: string;
  includeCount?: boolean;
}

/**
 * Ejecuta una query paginada con cursor
 */
export async function paginatedQuery<T extends { id: string }>(
  collectionPath: string,
  constraints: QueryConstraint[],
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const { pageSize = 20, cursor, includeCount = false } = options;

  // Build query
  let queryConstraints = [...constraints, limit(pageSize + 1)];

  // Add cursor if provided
  if (cursor) {
    const cursorDoc = await getDocs(
      query(collection(db, collectionPath), where('__name__', '==', cursor))
    );
    if (!cursorDoc.empty) {
      queryConstraints = [...constraints, startAfter(cursorDoc.docs[0]), limit(pageSize + 1)];
    }
  }

  const q = query(collection(db, collectionPath), ...queryConstraints);
  const snapshot = await getDocs(q);

  const docs = snapshot.docs.slice(0, pageSize);
  const hasMore = snapshot.docs.length > pageSize;

  const data = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as T[];

  const result: PaginatedResult<T> = {
    data,
    hasMore,
    lastCursor: docs.length > 0 ? docs[docs.length - 1].id : null,
  };

  // Optionally get total count
  if (includeCount) {
    const countQuery = query(collection(db, collectionPath), ...constraints);
    const countSnapshot = await getCountFromServer(countQuery);
    result.totalCount = countSnapshot.data().count;
  }

  return result;
}

// ============================================
// Batch fetching para relaciones
// ============================================

/**
 * Fetch múltiples documentos por IDs en lotes
 * Firestore limita a 10 IDs por query "in"
 */
export async function batchFetchByIds<T extends { id: string }>(
  collectionPath: string,
  ids: string[]
): Promise<T[]> {
  if (ids.length === 0) return [];

  const uniqueIds = [...new Set(ids)];
  const batches: string[][] = [];
  
  // Split into batches of 10
  for (let i = 0; i < uniqueIds.length; i += 10) {
    batches.push(uniqueIds.slice(i, i + 10));
  }

  const results: T[] = [];

  for (const batch of batches) {
    const q = query(collection(db, collectionPath), where('__name__', 'in', batch));
    const snapshot = await getDocs(q);
    
    snapshot.docs.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as T);
    });
  }

  return results;
}

// ============================================
// Query builders
// ============================================

export type FilterOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';

export interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Build query constraints from config
 */
export function buildQueryConstraints(
  filters: FilterConfig[],
  sorts: SortConfig[] = [],
  limitCount?: number
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  // Add filters
  for (const filter of filters) {
    if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
      constraints.push(where(filter.field, filter.operator, filter.value));
    }
  }

  // Add sorts
  for (const sort of sorts) {
    constraints.push(orderBy(sort.field, sort.direction));
  }

  // Add limit
  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  return constraints;
}

// ============================================
// Index hints (documentación para crear índices)
// ============================================

export const RECOMMENDED_INDEXES = {
  incidencias: [
    { fields: ['tenantId', 'estado', 'fechaCreacion'], order: 'desc' },
    { fields: ['tenantId', 'activoId', 'fechaCreacion'], order: 'desc' },
    { fields: ['tenantId', 'asignadoA', 'estado'], order: 'asc' },
    { fields: ['tenantId', 'criticidad', 'fechaCreacion'], order: 'desc' },
  ],
  activos: [
    { fields: ['tenantId', 'tipo', 'estado'], order: 'asc' },
    { fields: ['tenantId', 'operadorId', 'estado'], order: 'asc' },
    { fields: ['tenantId', 'fechaCreacion'], order: 'desc' },
  ],
  preventivos: [
    { fields: ['tenantId', 'proximaEjecucion'], order: 'asc' },
    { fields: ['tenantId', 'activoId', 'proximaEjecucion'], order: 'asc' },
    { fields: ['tenantId', 'activo', 'proximaEjecucion'], order: 'asc' },
  ],
  inventario: [
    { fields: ['tenantId', 'categoriaId', 'cantidad'], order: 'asc' },
    { fields: ['tenantId', 'stockBajo'], order: 'desc' },
  ],
  ordenesTrabajo: [
    { fields: ['tenantId', 'estado', 'fechaCreacion'], order: 'desc' },
    { fields: ['tenantId', 'tecnicoId', 'estado'], order: 'asc' },
  ],
};

/**
 * Log query performance for debugging
 */
export function logQueryPerformance(
  queryName: string,
  startTime: number,
  resultCount: number
) {
  const duration = Date.now() - startTime;
  if (duration > 500) {
    console.warn(`[Slow Query] ${queryName}: ${duration}ms, ${resultCount} results`);
  } else if (process.env.NODE_ENV === 'development') {
    console.debug(`[Query] ${queryName}: ${duration}ms, ${resultCount} results`);
  }
}

// ============================================
// Query cache key generators
// ============================================

export function generateCacheKey(
  collection: string,
  tenantId: string,
  filters: Record<string, unknown> = {}
): string {
  const filterStr = Object.entries(filters)
    .filter(([_, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  
  return `${collection}:${tenantId}:${filterStr}`;
}
