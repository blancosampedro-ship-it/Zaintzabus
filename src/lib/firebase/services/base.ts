import {
  type Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type QueryConstraint,
  type WhereFilterOp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { FirestoreServiceError, mapFirebaseError } from '@/lib/firebase/services/errors';
import { type Result, ok, fail } from '@/lib/firebase/services/result';
import { getAuditService, calcularCambios, type TipoEntidad } from './audit.service';

export interface ActorContext {
  /** UID del actor. */
  uid: string;
  /** Email del actor (opcional). */
  email?: string;
  /** Rol del actor (opcional). */
  rol?: string;
  /** Tenant de origen del actor (para auditoría cross-tenant). */
  tenantId?: string;
}

export interface ServiceContext {
  /** Tenant actual (si aplica). */
  tenantId?: string;
  /** Actor que ejecuta la operación (para auditoría). */
  actor?: ActorContext;
}

export interface AuditConfig {
  /** Si true, habilita auditoría automática en operaciones CRUD */
  enabled: boolean;
  /** Tipo de entidad para la auditoría */
  entidad: TipoEntidad;
}

export interface ListPage<T> {
  items: T[];
  lastDoc: DocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export interface WhereFilter {
  fieldPath: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface OrderBySpec {
  fieldPath: string;
  direction?: 'asc' | 'desc';
}

export interface ListOptions {
  filters?: WhereFilter[];
  orderBy?: OrderBySpec[];
  pageSize?: number;
  startAfter?: DocumentSnapshot<DocumentData>;
  includeDeleted?: boolean;
}

export interface SearchOptions {
  /** Campo array para búsqueda (por defecto `searchTerms`). */
  field?: string;
  /** Número máximo de resultados. */
  limit?: number;
  /** Incluye eliminados. */
  includeDeleted?: boolean;
}

export type CollectionPathBuilder = (ctx: Required<Pick<ServiceContext, 'tenantId'>> | ServiceContext) => string;

/**
 * Servicio base genérico (SDK cliente) con:
 * - CRUD
 * - Soft delete (eliminado + fecha_eliminacion)
 * - Auditoría (creado_por, actualizado_por, createdAt, updatedAt)
 * - Auditoría automática en colección `auditoria` (opcional)
 * - Listado paginado + filtros
 * - Búsqueda por términos (array-contains-any)
 * - Listener realtime
 * - Validación centralizada de tenantId (configurable)
 */
export class BaseFirestoreService<T extends { id: string }> {
  protected readonly db: Firestore;
  protected readonly collectionPath: CollectionPathBuilder;
  protected readonly auditConfig?: AuditConfig;
  /** Si true (default), lanza si falta tenantId al construir col/ref. */
  protected readonly requiresTenant: boolean;

  constructor(
    db: Firestore,
    collectionPath: CollectionPathBuilder,
    auditConfig?: AuditConfig,
    options?: { requiresTenant?: boolean }
  ) {
    this.db = db;
    this.collectionPath = collectionPath;
    this.auditConfig = auditConfig;
    this.requiresTenant = options?.requiresTenant ?? true;
  }

  /**
   * Valida que el contexto tenga tenantId si el servicio lo requiere.
   * Centraliza la validación para evitar repetirla en cada servicio hijo.
   */
  protected validateContext(ctx: ServiceContext): void {
    if (this.requiresTenant && !ctx.tenantId) {
      throw new FirestoreServiceError(
        'invalid-argument',
        'tenantId es requerido para esta operación'
      );
    }
  }

  /**
   * Registra auditoría de forma silenciosa (no interrumpe si falla).
   */
  protected async auditarAccion(
    ctx: ServiceContext,
    accion: 'crear' | 'actualizar' | 'eliminar' | 'cambio_estado',
    entidadId: string,
    datosAnteriores?: Record<string, unknown> | null,
    datosNuevos?: Record<string, unknown>
  ): Promise<void> {
    if (!this.auditConfig?.enabled) return;

    try {
      const auditService = getAuditService(this.db);

      switch (accion) {
        case 'crear':
          if (datosNuevos) {
            await auditService.logCreacion(ctx, this.auditConfig.entidad, entidadId, datosNuevos);
          }
          break;
        case 'actualizar':
          if (datosAnteriores && datosNuevos) {
            await auditService.logActualizacion(
              ctx,
              this.auditConfig.entidad,
              entidadId,
              datosAnteriores,
              datosNuevos
            );
          }
          break;
        case 'eliminar':
          await auditService.logEliminacion(ctx, this.auditConfig.entidad, entidadId);
          break;
      }
    } catch (error) {
      // Silencioso: solo logea el error
      console.error('[BaseService] Error en auditoría:', error);
    }
  }

  protected col(ctx: ServiceContext) {
    this.validateContext(ctx);
    const path = this.collectionPath(ctx);
    return collection(this.db, path);
  }

  protected ref(ctx: ServiceContext, id: string) {
    this.validateContext(ctx);
    return doc(this.db, this.collectionPath(ctx), id);
  }

  protected withAuditOnCreate(data: Record<string, unknown>, ctx?: ServiceContext): Record<string, unknown> {
    return {
      ...data,
      eliminado: false,
      creado_por: ctx?.actor?.uid,
      actualizado_por: ctx?.actor?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  protected withAuditOnUpdate(data: Record<string, unknown>, ctx?: ServiceContext): Record<string, unknown> {
    return {
      ...data,
      actualizado_por: ctx?.actor?.uid,
      updatedAt: serverTimestamp(),
    };
  }

  async createAutoId(ctx: ServiceContext, data: Omit<T, 'id'>): Promise<string> {
    try {
      const auditedData = this.withAuditOnCreate(data as unknown as Record<string, unknown>, ctx);
      const docRef = await addDoc(this.col(ctx), auditedData);
      
      // Auditoría automática
      await this.auditarAccion(ctx, 'crear', docRef.id, null, auditedData);
      
      return docRef.id;
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  async createWithId(ctx: ServiceContext, id: string, data: Omit<T, 'id'>): Promise<void> {
    try {
      const auditedData = this.withAuditOnCreate(data as unknown as Record<string, unknown>, ctx);
      await setDoc(this.ref(ctx, id), auditedData, { merge: false });
      
      // Auditoría automática
      await this.auditarAccion(ctx, 'crear', id, null, auditedData);
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  async getById(ctx: ServiceContext, id: string): Promise<T | null> {
    try {
      const snap = await getDoc(this.ref(ctx, id));
      if (!snap.exists()) return null;

      const data = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as T;

      if ((data as any).eliminado) {
        return null;
      }

      return data;
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  async updatePartial(ctx: ServiceContext, id: string, patch: Partial<T>): Promise<void> {
    try {
      const snap = await getDoc(this.ref(ctx, id));
      if (!snap.exists()) throw new FirestoreServiceError('not-found', 'Documento no encontrado');

      // Guardar datos anteriores para auditoría
      const datosAnteriores = snap.data() as Record<string, unknown>;
      const datosNuevos = { ...datosAnteriores, ...patch };

      await updateDoc(this.ref(ctx, id), this.withAuditOnUpdate(patch as unknown as Record<string, unknown>, ctx));
      
      // Auditoría automática
      await this.auditarAccion(ctx, 'actualizar', id, datosAnteriores, datosNuevos);
    } catch (err) {
      if (err instanceof FirestoreServiceError) throw err;
      throw mapFirebaseError(err);
    }
  }

  /** Soft delete: marca `eliminado=true` y `fecha_eliminacion` en lugar de borrar. */
  async softDelete(ctx: ServiceContext, id: string): Promise<void> {
    try {
      const snap = await getDoc(this.ref(ctx, id));
      if (!snap.exists()) throw new FirestoreServiceError('not-found', 'Documento no encontrado');

      await updateDoc(
        this.ref(ctx, id),
        this.withAuditOnUpdate(
          {
            eliminado: true,
            fecha_eliminacion: serverTimestamp(),
            eliminado_por: ctx.actor?.uid,
          },
          ctx
        )
      );
      
      // Auditoría automática
      await this.auditarAccion(ctx, 'eliminar', id);
    } catch (err) {
      if (err instanceof FirestoreServiceError) throw err;
      throw mapFirebaseError(err);
    }
  }

  /** Borrado físico (usar solo para mantenimiento). */
  async hardDelete(ctx: ServiceContext, id: string): Promise<void> {
    try {
      await deleteDoc(this.ref(ctx, id));
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  async list(ctx: ServiceContext, options: ListOptions = {}): Promise<ListPage<T>> {
    try {
      const constraints: QueryConstraint[] = [];

      // Filtro de soft delete a nivel de query (evita traer docs eliminados)
      if (!options.includeDeleted) {
        constraints.push(where('eliminado', '==', false));
      }

      for (const f of options.filters ?? []) {
        constraints.push(where(f.fieldPath as any, f.op, f.value as any));
      }

      for (const o of options.orderBy ?? []) {
        constraints.push(orderBy(o.fieldPath as any, o.direction ?? 'asc'));
      }

      const pageSize = options.pageSize ?? 20;
      constraints.push(limit(pageSize + 1));

      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      const q = query(this.col(ctx), ...constraints);
      const snapshot = await getDocs(q);
      const hasMore = snapshot.docs.length > pageSize;
      const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

      const items = docs.map(
        (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T
      );

      return {
        items,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
        hasMore,
      };
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  /**
   * Búsqueda por términos usando `array-contains-any` (OR) sobre un array de tokens.
   * Requiere un campo `searchTerms: string[]` precomputado.
   */
  async searchByTerms(ctx: ServiceContext, terms: string[], options: SearchOptions = {}): Promise<T[]> {
    try {
      if (!terms.length) return [];

      const field = options.field ?? 'searchTerms';
      const max = options.limit ?? 20;

      const constraints: QueryConstraint[] = [];

      // Filtro de soft delete a nivel de query
      if (!options.includeDeleted) {
        constraints.push(where('eliminado', '==', false));
      }

      constraints.push(where(field as any, 'array-contains-any', terms.slice(0, 10) as any));
      constraints.push(limit(max));

      const q = query(this.col(ctx), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T
      );
    } catch (err) {
      throw mapFirebaseError(err);
    }
  }

  /** Listener realtime por ID. Devuelve `unsubscribe`. */
  listenById(ctx: ServiceContext, id: string, cb: (doc: T | null) => void, onError?: (err: unknown) => void): Unsubscribe {
    return onSnapshot(
      this.ref(ctx, id),
      (snap) => {
        if (!snap.exists()) {
          cb(null);
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Record<string, unknown>) } as T;
        if ((data as any).eliminado) {
          cb(null);
          return;
        }
        cb(data);
      },
      (err) => {
        onError?.(err);
      }
    );
  }

  /** Listener realtime para un listado (query). */
  listenList(ctx: ServiceContext, options: ListOptions, cb: (items: T[]) => void, onError?: (err: unknown) => void): Unsubscribe {
    const constraints: QueryConstraint[] = [];

    // Filtro de soft delete a nivel de query
    if (!options.includeDeleted) {
      constraints.push(where('eliminado', '==', false));
    }

    for (const f of options.filters ?? []) {
      constraints.push(where(f.fieldPath as any, f.op, f.value as any));
    }

    for (const o of options.orderBy ?? []) {
      constraints.push(orderBy(o.fieldPath as any, o.direction ?? 'asc'));
    }

    const pageSize = options.pageSize ?? 50;
    constraints.push(limit(pageSize));

    const q = query(this.col(ctx), ...constraints);

    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T
        );
        cb(items);
      },
      (err) => onError?.(err)
    );
  }

  // ===========================================================================
  // Result<T> wrappers — opt-in, sin romper firmas existentes
  // ===========================================================================

  /**
   * Versión segura de `getById` que devuelve `Result<T | null>` en lugar de lanzar.
   * Útil en flujos donde se quiere inspeccionar el error sin try/catch.
   */
  async safeGetById(ctx: ServiceContext, id: string): Promise<Result<T | null>> {
    try {
      const data = await this.getById(ctx, id);
      return ok(data);
    } catch (err) {
      return fail(err instanceof FirestoreServiceError ? err : mapFirebaseError(err));
    }
  }

  /**
   * Versión segura de `list` que devuelve `Result<ListPage<T>>`.
   */
  async safeList(ctx: ServiceContext, options: ListOptions = {}): Promise<Result<ListPage<T>>> {
    try {
      const page = await this.list(ctx, options);
      return ok(page);
    } catch (err) {
      return fail(err instanceof FirestoreServiceError ? err : mapFirebaseError(err));
    }
  }

  /**
   * Versión segura de `createAutoId` que devuelve `Result<string>` (el ID generado).
   */
  async safeCreate(ctx: ServiceContext, data: Omit<T, 'id'>): Promise<Result<string>> {
    try {
      const id = await this.createAutoId(ctx, data);
      return ok(id);
    } catch (err) {
      return fail(err instanceof FirestoreServiceError ? err : mapFirebaseError(err));
    }
  }
}
