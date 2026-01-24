/**
 * =============================================================================
 * SERVICIO DE AUDITORÍA - ZaintzaBus
 * =============================================================================
 * 
 * Sistema de logging automático que registra operaciones críticas:
 * - Quién realizó la acción (usuario, rol)
 * - Cuándo se realizó (timestamp)
 * - Qué cambió (valores anteriores vs nuevos)
 * 
 * CARACTERÍSTICAS:
 * - "Silencioso": no interrumpe operaciones si falla el log
 * - Soporta diff automático de cambios
 * - Consulta por entidad/entidadId
 * =============================================================================
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type Firestore,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import type { AuditLog, CambioAuditoria } from '@/types';
import type { ActorContext, ServiceContext } from './base';

// =============================================================================
// TIPOS
// =============================================================================

export type TipoEntidad = AuditLog['entidad'];
export type TipoAccion = AuditLog['accion'];

export interface LogActionParams {
  /** Tipo de entidad afectada */
  entidad: TipoEntidad;
  /** ID de la entidad afectada */
  entidadId: string;
  /** Tipo de acción realizada */
  accion: TipoAccion;
  /** Lista de cambios (campo, valor anterior, valor nuevo) */
  cambios?: CambioAuditoria[];
  /** Motivo del cambio (opcional) */
  motivoCambio?: string;
  /** Datos adicionales de contexto */
  metadata?: Record<string, unknown>;
}

export interface AuditQueryOptions {
  /** Número máximo de registros */
  limit?: number;
  /** Filtrar por tipo de acción */
  accion?: TipoAccion;
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Calcula las diferencias entre dos objetos.
 * Útil para generar automáticamente la lista de cambios.
 */
export function calcularCambios(
  anterior: Record<string, unknown> | null,
  nuevo: Record<string, unknown>
): CambioAuditoria[] {
  const cambios: CambioAuditoria[] = [];
  
  // Campos a ignorar en la auditoría (metadatos internos)
  const camposIgnorados = new Set([
    'id',
    'createdAt',
    'updatedAt',
    'creado_por',
    'actualizado_por',
    'eliminado',
    'fecha_eliminacion',
    'eliminado_por',
    'searchTerms',
  ]);

  const todasLasClaves = new Set([
    ...Object.keys(nuevo),
    ...(anterior ? Object.keys(anterior) : []),
  ]);

  for (const campo of todasLasClaves) {
    if (camposIgnorados.has(campo)) continue;

    const valorAnterior = anterior?.[campo];
    const valorNuevo = nuevo[campo];

    // Comparación profunda simplificada
    const anteriorStr = JSON.stringify(valorAnterior);
    const nuevoStr = JSON.stringify(valorNuevo);

    if (anteriorStr !== nuevoStr) {
      cambios.push({
        campo,
        valorAnterior: valorAnterior ?? null,
        valorNuevo: valorNuevo ?? null,
      });
    }
  }

  return cambios;
}

/**
 * Formatea un valor para mostrar en el historial.
 */
export function formatearValorAuditoria(valor: unknown): string {
  if (valor === null || valor === undefined) return '(vacío)';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'number') return valor.toString();
  if (typeof valor === 'string') return valor || '(vacío)';
  if (Array.isArray(valor)) return `[${valor.length} elementos]`;
  if (typeof valor === 'object') {
    // Manejar Timestamps de Firebase
    if ('toDate' in valor && typeof (valor as any).toDate === 'function') {
      try {
        return (valor as any).toDate().toLocaleString('es-ES');
      } catch {
        return String(valor);
      }
    }
    return JSON.stringify(valor);
  }
  return String(valor);
}

/**
 * Traduce nombres de campos a español para el historial.
 */
export function traducirCampo(campo: string): string {
  const traducciones: Record<string, string> = {
    // Incidencias
    estado: 'Estado',
    criticidad: 'Criticidad',
    descripcion: 'Descripción',
    titulo: 'Título',
    autobusId: 'Autobús',
    equipoId: 'Equipo',
    tecnicoAsignado: 'Técnico asignado',
    observaciones: 'Observaciones',
    diagnostico: 'Diagnóstico',
    solucion: 'Solución',
    
    // Inventario/Equipos
    nombre: 'Nombre',
    cantidad: 'Cantidad',
    ubicacionId: 'Ubicación',
    stockMinimo: 'Stock mínimo',
    stockActual: 'Stock actual',
    numeroSerie: 'Número de serie',
    
    // Órdenes de trabajo
    tipo: 'Tipo',
    prioridad: 'Prioridad',
    fechaProgramada: 'Fecha programada',
    fechaCierre: 'Fecha de cierre',
    
    // Timestamps
    'timestamps.recepcion': 'Fecha recepción',
    'timestamps.asignacion': 'Fecha asignación',
    'timestamps.inicioReparacion': 'Inicio reparación',
    'timestamps.finReparacion': 'Fin reparación',
    'timestamps.cierre': 'Fecha cierre',
    
    // General
    activo: 'Activo',
    notas: 'Notas',
    motivo: 'Motivo',
  };

  return traducciones[campo] || campo;
}

/**
 * Traduce acciones a español.
 */
export function traducirAccion(accion: TipoAccion): string {
  const traducciones: Record<TipoAccion, string> = {
    crear: 'Creación',
    actualizar: 'Actualización',
    eliminar: 'Eliminación',
    cambio_estado: 'Cambio de estado',
  };
  return traducciones[accion] || accion;
}

// =============================================================================
// SERVICIO DE AUDITORÍA
// =============================================================================

export class AuditService {
  private readonly db: Firestore;
  private readonly collectionName = 'auditoria';

  constructor(db: Firestore) {
    this.db = db;
  }

  /**
   * Registra una acción en el log de auditoría.
   * Es "silencioso": no lanza errores, solo los logea en consola.
   */
  async logAction(
    ctx: ServiceContext,
    params: LogActionParams
  ): Promise<string | null> {
    try {
      const { entidad, entidadId, accion, cambios = [], motivoCambio, metadata } = params;

      // Validar que tenemos actor
      if (!ctx.actor?.uid) {
        console.warn('[Audit] No se pudo registrar: falta actor en contexto');
        return null;
      }

      const logEntry: Omit<AuditLog, 'id'> = {
        entidad,
        entidadId,
        accion,
        usuarioId: ctx.actor.uid,
        usuarioEmail: ctx.actor.email || 'desconocido',
        usuarioRol: ctx.actor.rol || 'desconocido',
        timestamp: serverTimestamp() as any,
        tenantId: ctx.tenantId || 'global',
        cambios,
        motivoCambio,
        // Metadata adicional si existe
        ...(metadata && { metadata }),
      };

      const colRef = collection(this.db, this.collectionName);
      const docRef = await addDoc(colRef, logEntry);

      console.debug(`[Audit] ${accion} en ${entidad}/${entidadId} por ${ctx.actor.email}`);
      return docRef.id;
    } catch (error) {
      // Silencioso: solo logea el error, no interrumpe la operación principal
      console.error('[Audit] Error guardando log de auditoría:', error);
      return null;
    }
  }

  /**
   * Registra un cambio de estado (caso especial común).
   */
  async logCambioEstado(
    ctx: ServiceContext,
    entidad: TipoEntidad,
    entidadId: string,
    estadoAnterior: string,
    estadoNuevo: string,
    motivoCambio?: string
  ): Promise<string | null> {
    return this.logAction(ctx, {
      entidad,
      entidadId,
      accion: 'cambio_estado',
      cambios: [
        {
          campo: 'estado',
          valorAnterior: estadoAnterior,
          valorNuevo: estadoNuevo,
        },
      ],
      motivoCambio,
    });
  }

  /**
   * Registra una creación de entidad.
   */
  async logCreacion(
    ctx: ServiceContext,
    entidad: TipoEntidad,
    entidadId: string,
    datos: Record<string, unknown>
  ): Promise<string | null> {
    const cambios = calcularCambios(null, datos);
    return this.logAction(ctx, {
      entidad,
      entidadId,
      accion: 'crear',
      cambios,
    });
  }

  /**
   * Registra una actualización de entidad.
   */
  async logActualizacion(
    ctx: ServiceContext,
    entidad: TipoEntidad,
    entidadId: string,
    datosAnteriores: Record<string, unknown>,
    datosNuevos: Record<string, unknown>,
    motivoCambio?: string
  ): Promise<string | null> {
    const cambios = calcularCambios(datosAnteriores, datosNuevos);
    
    // Si no hay cambios reales, no registrar
    if (cambios.length === 0) {
      console.debug(`[Audit] Sin cambios detectados para ${entidad}/${entidadId}`);
      return null;
    }

    return this.logAction(ctx, {
      entidad,
      entidadId,
      accion: 'actualizar',
      cambios,
      motivoCambio,
    });
  }

  /**
   * Registra una eliminación (soft delete).
   */
  async logEliminacion(
    ctx: ServiceContext,
    entidad: TipoEntidad,
    entidadId: string,
    motivoCambio?: string
  ): Promise<string | null> {
    return this.logAction(ctx, {
      entidad,
      entidadId,
      accion: 'eliminar',
      cambios: [
        {
          campo: 'eliminado',
          valorAnterior: false,
          valorNuevo: true,
        },
      ],
      motivoCambio,
    });
  }

  /**
   * Obtiene el historial de auditoría de una entidad específica.
   */
  async getHistorial(
    entidadId: string,
    options: AuditQueryOptions = {}
  ): Promise<AuditLog[]> {
    try {
      const constraints = [
        where('entidadId', '==', entidadId),
        orderBy('timestamp', 'desc'),
        limit(options.limit || 50),
      ];

      if (options.accion) {
        constraints.push(where('accion', '==', options.accion));
      }

      const q = query(collection(this.db, this.collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('[Audit] Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Obtiene el historial de auditoría por tipo de entidad.
   */
  async getHistorialPorTipo(
    entidad: TipoEntidad,
    tenantId: string,
    options: AuditQueryOptions = {}
  ): Promise<AuditLog[]> {
    try {
      const constraints = [
        where('entidad', '==', entidad),
        where('tenantId', '==', tenantId),
        orderBy('timestamp', 'desc'),
        limit(options.limit || 100),
      ];

      const q = query(collection(this.db, this.collectionName), ...constraints);
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('[Audit] Error obteniendo historial por tipo:', error);
      return [];
    }
  }

  /**
   * Listener en tiempo real para el historial de una entidad.
   */
  listenHistorial(
    entidadId: string,
    callback: (logs: AuditLog[]) => void,
    options: AuditQueryOptions = {}
  ): Unsubscribe {
    const constraints = [
      where('entidadId', '==', entidadId),
      orderBy('timestamp', 'desc'),
      limit(options.limit || 50),
    ];

    const q = query(collection(this.db, this.collectionName), ...constraints);

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLog[];
        callback(logs);
      },
      (error) => {
        console.error('[Audit] Error en listener:', error);
        callback([]);
      }
    );
  }
}

// =============================================================================
// INSTANCIA SINGLETON
// =============================================================================

let auditServiceInstance: AuditService | null = null;

export function getAuditService(db: Firestore): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService(db);
  }
  return auditServiceInstance;
}

export default AuditService;
