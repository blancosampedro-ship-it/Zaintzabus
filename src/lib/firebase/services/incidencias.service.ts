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
import type { Incidencia, EstadoIncidencia, Criticidad } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

// Lógica pura - sin dependencias de Firebase
import { generarCodigoIncidencia } from '@/lib/logic/codigos';
import { esTransicionValidaIncidencia } from '@/lib/logic/estados';

export class IncidenciasService extends BaseFirestoreService<Incidencia> {
  constructor(db: Firestore) {
    super(
      db,
      (ctx) => {
        return `tenants/${ctx.tenantId}/incidencias`;
      },
      { enabled: true, entidad: 'incidencia' } // Auditoría habilitada
    );
  }

  /**
   * Genera código correlativo de incidencia de forma transaccional.
   * Usa un counter document para evitar condiciones de carrera.
   * Doc: tenants/{tenantId}/counters/incidencias_{year}
   */
  private async generarCodigo(ctx: ServiceContext): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const year = new Date().getFullYear();
    const counterRef = doc(this.db, `tenants/${ctx.tenantId}/counters`, `incidencias_${year}`);

    const nextValue = await runTransaction(this.db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data().value as number) : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
      return next;
    });

    return generarCodigoIncidencia(nextValue, year);
  }

  async createConCodigo(ctx: ServiceContext, data: Omit<Incidencia, 'id' | 'codigo' | 'createdAt' | 'updatedAt' | 'timestamps' | 'sla' | 'estado'>): Promise<string> {
    const codigo = await this.generarCodigo(ctx);

    // Nota: Los vencimientos SLA se calculan bajo demanda con calcularVencimientoSLA()
    // No se almacenan en el documento para evitar datos desactualizados.
    // Ver: src/lib/logic/sla.ts

    const incidencia: Omit<Incidencia, 'id'> = {
      ...(data as any),
      codigo,
      estado: 'nueva',
      timestamps: {
        recepcion: serverTimestamp() as any,
      },
      sla: {},
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    return this.createAutoId(ctx, incidencia);
  }

  async cambiarEstado(ctx: ServiceContext, incidenciaId: string, nuevoEstado: EstadoIncidencia, observaciones?: string): Promise<void> {
    const incidencia = await this.getById(ctx, incidenciaId);
    if (!incidencia) throw new FirestoreServiceError('not-found', 'Incidencia no encontrada');

    // Lógica pura: validar transición
    if (!esTransicionValidaIncidencia(incidencia.estado, nuevoEstado)) {
      throw new FirestoreServiceError('failed-precondition', `Transición de ${incidencia.estado} a ${nuevoEstado} no permitida`);
    }

    // Firebase: timestamps automáticos por fase
    const timestampPatch: Record<string, unknown> = {};
    switch (nuevoEstado) {
      case 'en_analisis':
        timestampPatch['timestamps.inicioAnalisis'] = serverTimestamp();
        break;
      case 'en_intervencion':
        timestampPatch['timestamps.inicioReparacion'] = serverTimestamp();
        break;
      case 'resuelta':
        timestampPatch['timestamps.finReparacion'] = serverTimestamp();
        break;
      case 'cerrada':
        timestampPatch['timestamps.cierre'] = serverTimestamp();
        break;
      case 'reabierta':
        timestampPatch['timestamps.reapertura'] = serverTimestamp();
        break;
    }

    // Firebase: persistir cambio
    await this.updatePartial(ctx, incidenciaId, {
      estado: nuevoEstado,
      ...(observaciones ? { observaciones } : {}),
      ...(timestampPatch as any),
    } as any);
  }

  async filtrar(
    ctx: ServiceContext,
    params: {
      operadorId?: string;
      estado?: EstadoIncidencia | EstadoIncidencia[];
      criticidad?: Criticidad;
      desdeCodigo?: string;
      pageSize?: number;
    }
  ): Promise<Incidencia[]> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const constraints: any[] = [];

    // Filtro de soft delete a nivel de query
    constraints.push(where('eliminado', '==', false));

    if (params.estado) {
      constraints.push(Array.isArray(params.estado) ? where('estado', 'in', params.estado) : where('estado', '==', params.estado));
    }

    if (params.criticidad) constraints.push(where('criticidad', '==', params.criticidad));

    if (params.desdeCodigo) {
      constraints.push(where('codigo', '>=', params.desdeCodigo));
      constraints.push(orderBy('codigo', 'asc'));
    } else {
      constraints.push(orderBy('timestamps.recepcion', 'desc'));
    }

    constraints.push(limit(params.pageSize ?? 50));

    const q = query(collection(this.db, `tenants/${ctx.tenantId}/incidencias`), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Incidencia[];
  }

  async vincularOT(ctx: ServiceContext, incidenciaId: string, ordenTrabajoId: string): Promise<void> {
    await this.updatePartial(ctx, incidenciaId, { ordenTrabajoId } as any);
  }
}
