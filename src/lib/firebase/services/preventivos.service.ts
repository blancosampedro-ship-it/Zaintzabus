import type { Firestore } from 'firebase/firestore';
import { addMonths } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import type { Preventivo, Periodicidad, OrdenTrabajo } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

export class PreventivosService extends BaseFirestoreService<Preventivo> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      if (!ctx.tenantId) throw new Error('tenantId requerido');
      return `tenants/${ctx.tenantId}/preventivos`;
    });
  }

  /** Calcula próxima ejecución a partir de periodicidad y una fecha base. */
  calcularProximaEjecucion(periodicidad: Periodicidad, desde: Date): Date {
    switch (periodicidad) {
      case '3M':
        return addMonths(desde, 3);
      case '6M':
        return addMonths(desde, 6);
      case '1A':
        return addMonths(desde, 12);
      case '2A':
        return addMonths(desde, 24);
      default:
        return addMonths(desde, 12);
    }
  }

  /** Recalcula `proximaEjecucion` y lo persiste. */
  async actualizarProximaEjecucion(ctx: ServiceContext, preventivoId: string, baseDate: Date): Promise<void> {
    const prev = await this.getById(ctx, preventivoId);
    if (!prev) throw new FirestoreServiceError('not-found', 'Preventivo no encontrado');

    const next = this.calcularProximaEjecucion(prev.periodicidad, baseDate);

    await this.updatePartial(ctx, preventivoId, {
      proximaEjecucion: Timestamp.fromDate(next) as any,
      ultimaEjecucion: Timestamp.fromDate(baseDate) as any,
    } as any);
  }

  /**
   * Genera una OT programada (objeto) para un preventivo.
   * Nota: no la persiste; el caller debería usar `OrdenesTrabajoService.createConCodigo`.
   */
  buildOTProgramada(params: {
    tenantId: string;
    preventivoId: string;
    operadorId?: string;
    autobusId?: string;
    equiposIds?: string[];
  }): Omit<OrdenTrabajo, 'id' | 'codigo' | 'auditoria'> {
    return {
      origen: 'preventivo',
      preventivoId: params.preventivoId,
      tipo: 'preventivo',
      operadorId: params.operadorId,
      autobusId: params.autobusId,
      equiposIds: params.equiposIds,
      estado: 'pendiente',
      facturacion: { facturable: true },
      // resto se completa en el servicio de OTs
    } as any;
  }
}
