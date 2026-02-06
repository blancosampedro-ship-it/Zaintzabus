import type { Firestore } from 'firebase/firestore';
import type { Autobus, EstadoAutobus } from '@/types';
import { BaseFirestoreService, type ServiceContext, type ListOptions } from '@/lib/firebase/services/base';
import type { Equipo } from '@/types';
import type { EquiposService } from '@/lib/firebase/services/equipos.service';

export class AutobusesService extends BaseFirestoreService<Autobus> {
  constructor(db: Firestore) {
    super(
      db,
      (ctx) => {
        return `tenants/${ctx.tenantId}/autobuses`;
      },
      { enabled: true, entidad: 'autobus' } // Auditoría habilitada
    );
  }

  listByOperador(ctx: ServiceContext, operadorId: string, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'operadorId', op: '==', value: operadorId }],
      orderBy: options.orderBy ?? [{ fieldPath: 'codigo', direction: 'asc' }],
    });
  }

  listByEstado(ctx: ServiceContext, estado: EstadoAutobus, options: Omit<ListOptions, 'filters'> = {}) {
    return this.list(ctx, {
      ...options,
      filters: [{ fieldPath: 'estado', op: '==', value: estado }],
      orderBy: options.orderBy ?? [{ fieldPath: 'codigo', direction: 'asc' }],
    });
  }

  /** Obtiene un autobús y sus equipos actuales (consulta adicional a `equipos`). */
  async getConEquipos(
    ctx: ServiceContext,
    autobusId: string,
    equiposService: EquiposService
  ): Promise<{ autobus: Autobus; equipos: Equipo[] } | null> {
    const autobus = await this.getById(ctx, autobusId);
    if (!autobus) return null;
    const equipos = await equiposService.getPorAutobus(ctx, autobusId);
    return { autobus, equipos };
  }
}
