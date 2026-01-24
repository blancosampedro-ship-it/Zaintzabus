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
import type { Incidencia, EstadoIncidencia, Criticidad } from '@/types';
import { BaseFirestoreService, type ServiceContext } from '@/lib/firebase/services/base';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

// Lógica pura - sin dependencias de Firebase
import { generarCodigoIncidencia, extraerCorrelativo } from '@/lib/logic/codigos';
import { esTransicionValidaIncidencia } from '@/lib/logic/estados';

export class IncidenciasService extends BaseFirestoreService<Incidencia> {
  constructor(db: Firestore) {
    super(
      db,
      (ctx) => {
        if (!ctx.tenantId) throw new Error('tenantId requerido');
        return `tenants/${ctx.tenantId}/incidencias`;
      },
      { enabled: true, entidad: 'incidencia' } // Auditoría habilitada
    );
  }

  /**
   * Obtiene el último correlativo de incidencias del año actual.
   * Firebase se encarga de leer, la lógica pura genera el código.
   */
  private async generarCodigo(ctx: ServiceContext): Promise<string> {
    if (!ctx.tenantId) throw new FirestoreServiceError('invalid-argument', 'tenantId requerido');

    const year = new Date().getFullYear();
    const prefix = `INC-${year}-`;

    // Firebase: obtener último código
    const q = query(
      collection(this.db, `tenants/${ctx.tenantId}/incidencias`),
      where('codigo', '>=', prefix),
      where('codigo', '<', `INC-${year + 1}-`),
      orderBy('codigo', 'desc'),
      limit(1)
    );

    const snap = await getDocs(q);
    
    // Lógica pura: generar el siguiente código
    if (snap.empty) {
      return generarCodigoIncidencia(1, year);
    }

    const lastCodigo = (snap.docs[0].data() as Incidencia).codigo;
    const lastCorrelativo = extraerCorrelativo(lastCodigo) ?? 0;
    return generarCodigoIncidencia(lastCorrelativo + 1, year);
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
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((i) => !(i as any).eliminado) as Incidencia[];
  }

  async vincularOT(ctx: ServiceContext, incidenciaId: string, ordenTrabajoId: string): Promise<void> {
    await this.updatePartial(ctx, incidenciaId, { ordenTrabajoId } as any);
  }
}
