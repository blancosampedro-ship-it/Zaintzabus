import type { Firestore } from 'firebase/firestore';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import type { Contrato, Criticidad } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

export class ContratosService extends BaseFirestoreService<Contrato> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      return `tenants/${ctx.tenantId}/contratos`;
    });
  }

  /** Obtiene el contrato activo (por fechas) de un operador. */
  async getContratoActivo(ctx: ServiceContext, operadorId: string, fecha: Date = new Date()): Promise<Contrato | null> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const ts = Timestamp.fromDate(fecha);

    // contrato activo: fechaInicio <= ts y (fechaFin inexistente o >= ts)
    // Firestore no permite OR directo, así que hacemos dos queries y priorizamos el que tenga fechaFin.

    const base = [where('operadorId', '==', operadorId), where('fechaInicio', '<=', ts)];

    const q1 = query(
      collection(this.db, `tenants/${ctx.tenantId}/contratos`),
      ...base,
      where('fechaFin', '>=', ts),
      orderBy('fechaInicio', 'desc'),
      limit(1)
    );

    const s1 = await getDocs(q1);
    if (!s1.empty) {
      const d = s1.docs[0];
      return { id: d.id, ...(d.data() as any) } as Contrato;
    }

    const q2 = query(
      collection(this.db, `tenants/${ctx.tenantId}/contratos`),
      ...base,
      orderBy('fechaInicio', 'desc'),
      limit(10)
    );

    const s2 = await getDocs(q2);
    const candidates = s2.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }) as Contrato)
      .filter((c) => !c.fechaFin);

    return candidates.length ? candidates[0] : null;
  }

  /** Devuelve SLA aplicable (horas máximas) en función del contrato y criticidad. */
  calcularSLA(contrato: Contrato, criticidad: Criticidad): number {
    return criticidad === 'critica' ? contrato.slas.criticaHoras : contrato.slas.normalHoras;
  }
}
