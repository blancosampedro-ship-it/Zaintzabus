import type { Firestore } from 'firebase/firestore';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { OrdenTrabajo, EstadoOT, TipoOT, MaterialOT, Contrato } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  pendiente: ['asignada', 'rechazada'],
  asignada: ['en_curso', 'rechazada'],
  en_curso: ['completada', 'rechazada'],
  completada: ['validada', 'rechazada'],
  validada: [],
  rechazada: [],
};

export class OrdenesTrabajoService extends BaseFirestoreService<OrdenTrabajo> {
  constructor(db: Firestore) {
    super(db, (ctx) => {
      if (!ctx.tenantId) throw new Error('tenantId requerido');
      return `tenants/${ctx.tenantId}/ordenesTrabajo`;
    });
  }

  private async generarCodigo(ctx: ServiceContext): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const year = new Date().getFullYear();
    const prefix = `OT-${year}-`;

    const q = query(
      collection(this.db, `tenants/${ctx.tenantId}/ordenesTrabajo`),
      where('codigo', '>=', prefix),
      where('codigo', '<', `OT-${year + 1}-`),
      orderBy('codigo', 'desc'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return `${prefix}00001`;

    const last = (snap.docs[0].data() as any).codigo as string;
    const lastNumber = parseInt(last.split('-')[2], 10);
    const next = String(lastNumber + 1).padStart(5, '0');
    return `${prefix}${next}`;
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

    const validas = TRANSICIONES_OT[ot.estado];
    if (!validas.includes(nuevoEstado)) {
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

    if (params.tecnicoId) constraints.push(where('tecnicoId', '==', params.tecnicoId));
    if (params.operadorId) constraints.push(where('operadorId', '==', params.operadorId));
    if (params.estado) constraints.push(where('estado', '==', params.estado));

    constraints.push(orderBy('auditoria.createdAt', 'desc'));
    constraints.push(limit(params.pageSize ?? 50));

    const q = query(collection(this.db, `tenants/${ctx.tenantId}/ordenesTrabajo`), ...constraints);
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((ot) => !(ot as any).eliminado) as OrdenTrabajo[];
  }
}
