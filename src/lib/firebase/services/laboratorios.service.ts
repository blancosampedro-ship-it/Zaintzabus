import type { Firestore } from 'firebase/firestore';
import type { Laboratorio, TipoLaboratorio } from '@/types';
import { BaseFirestoreService, type ServiceContext, type ListOptions } from '@/lib/firebase/services/base';

export class LaboratoriosService extends BaseFirestoreService<Laboratorio> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      if (!ctx.tenantId) throw new Error('tenantId requerido');
      return `tenants/${ctx.tenantId}/laboratorios`;
    });
  }

  listByTipo(ctx: ServiceContext, tipo: TipoLaboratorio, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'tipo', op: '==', value: tipo }],
      orderBy: options.orderBy ?? [{ fieldPath: 'nombre', direction: 'asc' }],
    });
  }

  /** Busca laboratorios que reparen un tipo de equipo (por id/código incluido en `tiposEquipoReparables`). */
  async findByTipoEquipo(ctx: ServiceContext, tipoEquipoIdOrCodigo: string, limit = 50): Promise<Laboratorio[]> {
    const page = await this.list(ctx, {
      filters: [{ fieldPath: 'tiposEquipoReparables', op: 'array-contains', value: tipoEquipoIdOrCodigo }],
      pageSize: limit,
      orderBy: [{ fieldPath: 'nombre', direction: 'asc' }],
    });

    return page.items;
  }
}
