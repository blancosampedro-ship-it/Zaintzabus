import type { Firestore } from 'firebase/firestore';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import type { MovimientoEquipo, TipoMovimientoEquipo } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';

export class MovimientosEquipoService extends BaseFirestoreService<MovimientoEquipo> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      return `tenants/${ctx.tenantId}/movimientosEquipo`;
    });
  }

  /** Histórico de un equipo. */
  async getHistoricoEquipo(ctx: ServiceContext, equipoId: string, pageSize = 100): Promise<MovimientoEquipo[]> {
    const q = query(
      collection(this.db, `tenants/${ctx.tenantId}/movimientosEquipo`),
      where('equipoId', '==', equipoId),
      orderBy('fecha', 'desc'),
      limit(pageSize)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MovimientoEquipo[];
  }

  async getMovimientos(
    ctx: ServiceContext,
    params: {
      desde?: Date;
      hasta?: Date;
      tecnicoId?: string;
      tipoMovimiento?: TipoMovimientoEquipo;
      pageSize?: number;
    }
  ): Promise<MovimientoEquipo[]> {
    const constraints: QueryConstraint[] = [];

    if (params.desde) constraints.push(where('fecha', '>=', Timestamp.fromDate(params.desde)));
    if (params.hasta) constraints.push(where('fecha', '<=', Timestamp.fromDate(params.hasta)));

    if (params.tecnicoId) constraints.push(where('tecnicosIds', 'array-contains', params.tecnicoId));
    if (params.tipoMovimiento) constraints.push(where('tipoMovimiento', '==', params.tipoMovimiento));

    constraints.push(orderBy('fecha', 'desc'));
    constraints.push(limit(params.pageSize ?? 200));

    const q = query(collection(this.db, `tenants/${ctx.tenantId}/movimientosEquipo`), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MovimientoEquipo[];
  }
}
