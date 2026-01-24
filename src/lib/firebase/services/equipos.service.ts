import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  increment,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type {
  Equipo,
  EstadoEquipo,
  TipoUbicacionEquipo,
  UbicacionActualEquipo,
  MovimientoEquipo,
  TipoMovimientoEquipo,
} from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';
import { buildSearchTerms, padNumber } from '@/lib/firebase/services/utils';

export interface CambiarUbicacionParams {
  /** Destino. */
  destino: UbicacionActualEquipo;
  /** Tipo de movimiento. */
  tipoMovimiento: TipoMovimientoEquipo;
  /** Motivo descriptivo. */
  motivo?: string;
  /** OT relacionada. */
  otId?: string;
  /** Incidencia relacionada. */
  incidenciaId?: string;
  /** Técnicos que ejecutan. */
  tecnicosIds?: string[];
  /** Comentarios. */
  comentarios?: string;
}

export class EquiposService extends BaseFirestoreService<Equipo> {
  constructor(db: Firestore) {
    super(
      db,
      (ctx) => {
        if (!ctx.tenantId) throw new Error('tenantId requerido');
        return `tenants/${ctx.tenantId}/equipos`;
      },
      { enabled: true, entidad: 'inventario' } // Auditoría habilitada
    );
  }

  private movimientosColPath(ctx: ServiceContext) {
    if (!ctx.tenantId) throw new Error('tenantId requerido');
    return `tenants/${ctx.tenantId}/movimientosEquipo`;
  }

  /**
   * Genera un código interno transaccional por prefijo.
   * Usa el doc: tenants/{tenantId}/counters/equipos_{prefijo}
   */
  async generarCodigoInterno(ctx: ServiceContext, prefijo: string): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const counterRef = doc(this.db, `tenants/${ctx.tenantId}/counters`, `equipos_${prefijo}`);

    const value = await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().value as number) : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
      return next;
    });

    return `${prefijo}-${padNumber(value, 6)}`;
  }

  /**
   * Crea equipo y autogenera `codigoInterno` + `searchTerms`.
   * Requiere que el caller pase `tipoEquipoId` y (opcional) `tipoEquipoNombre`.
   */
  async createEquipo(ctx: ServiceContext, data: Omit<Equipo, 'id' | 'codigoInterno' | 'estadisticas' | 'auditoria' | 'searchTerms'> & { prefijoCodigo: string }): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const codigoInterno = await this.generarCodigoInterno(ctx, data.prefijoCodigo);

    const equipo: Omit<Equipo, 'id'> = {
      ...(data as any),
      codigoInterno,
      estadisticas: {
        totalAverias: 0,
        totalMovimientos: 0,
        diasEnServicio: 0,
      },
      auditoria: {
        creadoPor: ctx.actor?.uid,
        actualizadoPor: ctx.actor?.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      },
      searchTerms: buildSearchTerms(
        codigoInterno,
        data.numeroSerieFabricante,
        data.tipoEquipoNombre,
        data.caracteristicas?.marca,
        data.caracteristicas?.modelo,
        data.sim?.iccid,
        data.sim?.telefono,
        data.red?.ip,
        data.red?.mac
      ),
    };

    return this.createAutoId(ctx, equipo);
  }

  /** Cambia estado con validaciones mínimas. */
  async cambiarEstado(ctx: ServiceContext, equipoId: string, nuevoEstado: EstadoEquipo): Promise<void> {
    const actual = await this.getById(ctx, equipoId);
    if (!actual) throw new FirestoreServiceError('not-found', 'Equipo no encontrado');

    if (actual.estado === 'baja') {
      throw new FirestoreServiceError('failed-precondition', 'No se puede cambiar el estado de un equipo dado de baja');
    }

    const patch: Partial<Equipo> = {
      estado: nuevoEstado,
    };

    // Si se da de baja, guardar fecha
    if (nuevoEstado === 'baja') {
      patch.fechas = {
        ...actual.fechas,
        baja: serverTimestamp() as any,
      };
    }

    await this.updatePartial(ctx, equipoId, patch);
  }

  /**
   * Cambia ubicación y crea un MovimientoEquipo de forma atómica.
   * Actualiza contador `estadisticas.totalMovimientos`.
   */
  async cambiarUbicacionRegistrandoMovimiento(ctx: ServiceContext, equipoId: string, params: CambiarUbicacionParams): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const equipoRef = doc(this.db, `tenants/${ctx.tenantId}/equipos`, equipoId);
    const movimientosCol = collection(this.db, this.movimientosColPath(ctx));

    const movimientoId = await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(equipoRef);
      if (!snap.exists()) throw new FirestoreServiceError('not-found', 'Equipo no encontrado');

      const equipo = { id: snap.id, ...(snap.data() as any) } as Equipo;
      if ((equipo as any).eliminado) throw new FirestoreServiceError('not-found', 'Equipo no encontrado');

      const origen = {
        tipo: equipo.ubicacionActual.tipo,
        id: equipo.ubicacionActual.id,
        nombre: equipo.ubicacionActual.nombre,
        posicionEnBus: equipo.ubicacionActual.posicionEnBus,
      };

      const destino = {
        tipo: params.destino.tipo,
        id: params.destino.id,
        nombre: params.destino.nombre,
        posicionEnBus: params.destino.posicionEnBus,
      };

      // Estado derivado por destino (heurística)
      const estadoDerivado: EstadoEquipo = deriveEstadoFromDestino(params.destino.tipo);

      tx.update(equipoRef, {
        ubicacionActual: params.destino,
        estado: estadoDerivado,
        'estadisticas.totalMovimientos': increment(1),
        actualizado_por: ctx.actor?.uid,
        updatedAt: serverTimestamp(),
      } as any);

      const movimiento: Omit<MovimientoEquipo, 'id'> = {
        equipoId: equipo.id,
        equipoCodigoInterno: equipo.codigoInterno,
        fecha: serverTimestamp() as any,
        origen,
        destino,
        tipoMovimiento: params.tipoMovimiento,
        motivo: params.motivo,
        otId: params.otId,
        incidenciaId: params.incidenciaId,
        tecnicosIds: params.tecnicosIds,
        comentarios: params.comentarios,
        fotos: [],
        auditoria: {
          creadoPor: ctx.actor?.uid,
          actualizadoPor: ctx.actor?.uid,
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        },
      };

      const movRef = doc(movimientosCol);
      tx.set(movRef, movimiento as any);

      return movRef.id;
    });

    return movimientoId;
  }

  async getPorAutobus(ctx: ServiceContext, autobusId: string, pageSize = 200): Promise<Equipo[]> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const q = query(
      collection(this.db, `tenants/${ctx.tenantId}/equipos`),
      where('ubicacionActual.tipo', '==', 'autobus'),
      where('ubicacionActual.id', '==', autobusId),
      orderBy('codigoInterno', 'asc'),
      limit(pageSize)
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((e) => !(e as any).eliminado) as Equipo[];
  }

  async getPorUbicacion(ctx: ServiceContext, tipo: Exclude<TipoUbicacionEquipo, 'autobus'>, ubicacionId: string, pageSize = 200): Promise<Equipo[]> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const q = query(
      collection(this.db, `tenants/${ctx.tenantId}/equipos`),
      where('ubicacionActual.tipo', '==', tipo),
      where('ubicacionActual.id', '==', ubicacionId),
      orderBy('codigoInterno', 'asc'),
      limit(pageSize)
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((e) => !(e as any).eliminado) as Equipo[];
  }

  async busquedaAvanzada(
    ctx: ServiceContext,
    params: {
      tipoEquipoId?: string;
      estado?: EstadoEquipo;
      operadorId?: string;
      numeroSerie?: string;
      pageSize?: number;
      lastDoc?: DocumentSnapshot<DocumentData>;
    }
  ) {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const constraints: any[] = [];

    if (params.tipoEquipoId) constraints.push(where('tipoEquipoId', '==', params.tipoEquipoId));
    if (params.estado) constraints.push(where('estado', '==', params.estado));
    if (params.operadorId) constraints.push(where('propiedad.operadorAsignadoId', '==', params.operadorId));
    if (params.numeroSerie) constraints.push(where('numeroSerieFabricante', '==', params.numeroSerie));

    constraints.push(orderBy('codigoInterno', 'asc'));
    constraints.push(limit((params.pageSize ?? 50) + 1));

    if (params.lastDoc) constraints.push(startAfter(params.lastDoc));

    const q = query(collection(this.db, `tenants/${ctx.tenantId}/equipos`), ...constraints);
    const snap = await getDocs(q);

    const pageSize = params.pageSize ?? 50;
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, -1) : snap.docs;

    return {
      items: (docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((e) => !(e as any).eliminado) as Equipo[]),
      lastDoc: docs.length ? docs[docs.length - 1] : null,
      hasMore,
    };
  }

  /** Estadísticas (aprox) por operador. */
  async statsPorOperador(ctx: ServiceContext, operadorId: string): Promise<{ total: number; porEstado: Record<string, number>; porTipo: Record<string, number> }> {
    const page = await this.list(ctx, {
      filters: [{ fieldPath: 'propiedad.operadorAsignadoId', op: '==', value: operadorId }],
      pageSize: 1000,
      orderBy: [{ fieldPath: 'codigoInterno', direction: 'asc' }],
    });

    const porEstado: Record<string, number> = {};
    const porTipo: Record<string, number> = {};

    for (const e of page.items) {
      porEstado[e.estado] = (porEstado[e.estado] ?? 0) + 1;
      porTipo[e.tipoEquipoId] = (porTipo[e.tipoEquipoId] ?? 0) + 1;
    }

    return { total: page.items.length, porEstado, porTipo };
  }
}

function deriveEstadoFromDestino(tipo: TipoUbicacionEquipo): EstadoEquipo {
  switch (tipo) {
    case 'autobus':
      return 'en_servicio';
    case 'ubicacion':
      return 'en_almacen';
    case 'laboratorio':
      return 'en_laboratorio';
  }
}
