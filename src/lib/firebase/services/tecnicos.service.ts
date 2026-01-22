import type { Firestore } from 'firebase/firestore';
import type { Tecnico, EstadoTecnico } from '@/types';
import { BaseFirestoreService, type ServiceContext, type ListOptions } from '@/lib/firebase/services/base';

export class TecnicosService extends BaseFirestoreService<Tecnico> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      if (!ctx.tenantId) throw new Error('tenantId requerido');
      return `tenants/${ctx.tenantId}/tecnicos`;
    });
  }

  listByEstado(ctx: ServiceContext, estado: EstadoTecnico, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'estado', op: '==', value: estado }],
      orderBy: options.orderBy ?? [{ fieldPath: 'apellidos', direction: 'asc' }],
    });
  }

  listByZona(ctx: ServiceContext, zonaId: string, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'zonaPrincipalId', op: '==', value: zonaId }],
      orderBy: options.orderBy ?? [{ fieldPath: 'apellidos', direction: 'asc' }],
    });
  }

  async findByEspecialidad(ctx: ServiceContext, especialidad: string, limit = 50): Promise<Tecnico[]> {
    const page = await this.list(ctx, {
      filters: [{ fieldPath: 'especialidades', op: 'array-contains', value: especialidad }],
      pageSize: limit,
      orderBy: [{ fieldPath: 'apellidos', direction: 'asc' }],
    });

    return page.items;
  }
}
