import type { Firestore } from 'firebase/firestore';
import type { Ubicacion, TipoUbicacion } from '@/types';
import { BaseFirestoreService, type ServiceContext, type ListOptions } from '@/lib/firebase/services/base';

export class UbicacionesService extends BaseFirestoreService<Ubicacion> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      return `tenants/${ctx.tenantId}/ubicaciones`;
    });
  }

  listByTipo(ctx: ServiceContext, tipo: TipoUbicacion, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'tipo', op: '==', value: tipo }],
      orderBy: options.orderBy ?? [{ fieldPath: 'nombre', direction: 'asc' }],
    });
  }

  listByOperador(ctx: ServiceContext, operadorId: string, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'operadorId', op: '==', value: operadorId }],
      orderBy: options.orderBy ?? [{ fieldPath: 'nombre', direction: 'asc' }],
    });
  }
}
