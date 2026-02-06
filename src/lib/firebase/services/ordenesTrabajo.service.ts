import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import type { OrdenTrabajo, EstadoOT, TipoOT, MaterialOT, Contrato } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

// Lógica pura - sin dependencias de Firebase
import { esTransicionValidaOT } from '@/lib/logic/estados';

export class OrdenesTrabajoService extends BaseFirestoreService<OrdenTrabajo> {
  constructor(db: Firestore) {
    super(
      db,
      (ctx) => {
        return `tenants/${ctx.tenantId}/ordenesTrabajo`;
      },
      { enabled: true, entidad: 'ordenTrabajo' } // Auditoría habilitada
    );
  }

  /**
   * Genera código correlativo de OT de forma transaccional.
   * Usa un counter document para evitar condiciones de carrera.
   * Doc: tenants/{tenantId}/counters/ordenesTrabajo_{year}
   */
  private async generarCodigo(ctx: ServiceContext): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const year = new Date().getFullYear();
    const counterRef = doc(this.db, `tenants/${ctx.tenantId}/counters`, `ordenesTrabajo_${year}`);

    const nextValue = await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().value as number) : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
      return next;
    });

    const correlativoStr = String(nextValue).padStart(5, '0');
    return `OT-${year}-${correlativoStr}`;
  }

  async createConCodigo(
    ctx: ServiceContext,
    data: Omit<OrdenTrabajo, 'id' | 'codigo' | 'auditoria' | 'estado' | 'createdAt' | 'updatedAt'> & {
      tipo: TipoOT;
    }
  ): Promise<string> {
    const codigo = await this.generarCodigo(ctx);

    const ot: Omit<OrdenTrabajo, 'id'> = {
      ...(data as any),
      codigo,
      estado: 'pendiente',
      auditoria: {
        creadoPor: ctx.actor?.uid,
        actualizadoPor: ctx.actor?.uid,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      },
      facturacion: data.facturacion ?? { facturable: true },
    };

    return this.createAutoId(ctx, ot);
  }

  async cambiarEstado(ctx: ServiceContext, otId: string, nuevoEstado: EstadoOT): Promise<void> {
    const ot = await this.getById(ctx, otId);
    if (!ot) throw new FirestoreServiceError('not-found', 'OT no encontrada');

    if (!esTransicionValidaOT(ot.estado, nuevoEstado)) {
      throw new FirestoreServiceError('failed-precondition', `Transición de ${ot.estado} a ${nuevoEstado} no permitida`);
    }

    await this.updatePartial(ctx, otId, { estado: nuevoEstado } as any);
  }

  async asignarTecnico(ctx: ServiceContext, otId: string, tecnicoId: string): Promise<void> {
    await this.updatePartial(ctx, otId, { tecnicoId, estado: 'asignada' } as any);
  }

  async registrarEjecucion(
    ctx: ServiceContext,
    otId: string,
    patch: {
      fechaInicioReal?: unknown;
      fechaFinReal?: unknown;
      desplazamientoMinutos?: number;
      intervencionMinutos?: number;
      trabajosRealizados?: string;
      materialesUsados?: MaterialOT[];
      fotos?: any[];
      firmaOperadorUrl?: string;
    }
  ): Promise<void> {
    await this.updatePartial(ctx, otId, {
      ejecucion: {
        fechaInicioReal: patch.fechaInicioReal as any,
        fechaFinReal: patch.fechaFinReal as any,
        tiempos: {
          desplazamientoMinutos: patch.desplazamientoMinutos,
          intervencionMinutos: patch.intervencionMinutos,
        },
      },
      documentacion: {
        trabajosRealizados: patch.trabajosRealizados,
        materialesUsados: patch.materialesUsados,
        fotos: patch.fotos as any,
        firmaOperadorUrl: patch.firmaOperadorUrl,
      },
    } as any);
  }

  /** Coste aproximado calculado con contrato (si aplica). */
  calcularCoste(contrato: Contrato, params: { desplazamientoMinutos?: number; intervencionMinutos?: number; materiales?: MaterialOT[] }): number {
    const materialesCoste = (params.materiales ?? []).reduce((acc, m) => acc + (m.precioUnitario ?? 0) * m.cantidad, 0);

    if (contrato.tipo === 'fijo') {
      // En fijo, el coste de OT puede ser 0 contable o solo materiales. Dejamos solo materiales.
      return materialesCoste;
    }

    const variable = contrato.tarifas?.variable;
    if (!variable) return materialesCoste;

    const horasDespl = (params.desplazamientoMinutos ?? 0) / 60;
    const horasInt = (params.intervencionMinutos ?? 0) / 60;

    const manoObra = horasInt * variable.horaIntervencion;
    const desplazamiento = horasDespl * variable.horaDesplazamiento;
    const materialesConMargen = materialesCoste * (1 + variable.margenMateriales);

    const subtotal = manoObra + desplazamiento + materialesConMargen;
    if (variable.minimoPorSalida != null) {
      return Math.max(subtotal, variable.minimoPorSalida);
    }

    return subtotal;
  }

  async filtrar(
    ctx: ServiceContext,
    params: { tecnicoId?: string; operadorId?: string; estado?: EstadoOT; desde?: unknown; hasta?: unknown; pageSize?: number }
  ): Promise<OrdenTrabajo[]> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const constraints: any[] = [];

    // Filtro de soft delete a nivel de query
    constraints.push(where('eliminado', '==', false));

    if (params.tecnicoId) constraints.push(where('tecnicoId', '==', params.tecnicoId));
    if (params.operadorId) constraints.push(where('operadorId', '==', params.operadorId));
    if (params.estado) constraints.push(where('estado', '==', params.estado));

    constraints.push(orderBy('auditoria.createdAt', 'desc'));
    constraints.push(limit(params.pageSize ?? 50));

    const q = query(collection(this.db, `tenants/${ctx.tenantId}/ordenesTrabajo`), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrdenTrabajo[];
  }
}
