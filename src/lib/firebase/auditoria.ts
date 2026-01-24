import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AuditLog, CambioAuditoria } from '@/types';

const COLLECTION_NAME = 'auditoria';

function auditCollectionRef(tenantId: string) {
  return collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`);
}

export interface CreateAuditLogParams {
  entidad: AuditLog['entidad'];
  entidadId: string;
  accion: AuditLog['accion'];
  usuarioId: string;
  usuarioEmail: string;
  usuarioRol: string;
  tenantId: string;
  cambios: CambioAuditoria[];
  motivoCambio?: string;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<string> {
  // Filtrar campos undefined para evitar errores de Firestore
  const auditLog: Record<string, unknown> = {
    entidad: params.entidad,
    entidadId: params.entidadId,
    accion: params.accion,
    usuarioId: params.usuarioId,
    usuarioEmail: params.usuarioEmail,
    usuarioRol: params.usuarioRol,
    tenantId: params.tenantId,
    cambios: params.cambios,
    timestamp: serverTimestamp(),
  };
  
  // Solo agregar motivoCambio si tiene valor
  if (params.motivoCambio) {
    auditLog.motivoCambio = params.motivoCambio;
  }

  const docRef = await addDoc(auditCollectionRef(params.tenantId), auditLog);

  return docRef.id;
}

export interface GetAuditLogsParams {
  entidad?: AuditLog['entidad'];
  entidadId?: string;
  usuarioId?: string;
  tenantId: string;
  desde?: Date;
  hasta?: Date;
  pageSize?: number;
}

export async function getAuditLogs(
  params: GetAuditLogsParams
): Promise<AuditLog[]> {
  const {
    entidad,
    entidadId,
    usuarioId,
    tenantId,
    desde,
    hasta,
    pageSize = 50,
  } = params;

  let q = query(auditCollectionRef(tenantId));

  const constraints = [];

  if (entidad) {
    constraints.push(where('entidad', '==', entidad));
  }

  if (entidadId) {
    constraints.push(where('entidadId', '==', entidadId));
  }

  if (usuarioId) {
    constraints.push(where('usuarioId', '==', usuarioId));
  }

  // tenantId ya está implícito por la ruta, pero lo dejamos por robustez.
  constraints.push(where('tenantId', '==', tenantId));

  if (desde) {
    constraints.push(where('timestamp', '>=', Timestamp.fromDate(desde)));
  }

  if (hasta) {
    constraints.push(where('timestamp', '<=', Timestamp.fromDate(hasta)));
  }

  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(limit(pageSize));

  q = query(auditCollectionRef(tenantId), ...constraints);

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as AuditLog[];
}

export async function getAuditLogsByEntity(
  entidad: AuditLog['entidad'],
  entidadId: string,
  tenantId: string
): Promise<AuditLog[]> {
  return getAuditLogs({ entidad, entidadId, tenantId });
}

// ---------------------------------------------------------------------------
// Compat: API legacy usada en varias pantallas
// ---------------------------------------------------------------------------

export interface RegistrarAuditoriaParams {
  tenantId: string;
  accion: 'create' | 'update' | 'delete';
  coleccion: string;
  documentoId: string;
  cambios: {
    antes: unknown;
    despues: unknown;
  };
  usuarioId: string;
  usuarioEmail: string;
  usuarioRol?: string;
  motivoCambio?: string;
}

function mapColeccionToEntidad(coleccion: string): AuditLog['entidad'] {
  const c = coleccion.toLowerCase();
  if (c.includes('incid')) return 'incidencia';
  if (c.includes('invent')) return 'inventario';
  if (c.includes('activo')) return 'activo';
  if (c.includes('prevent')) return 'preventivo';
  if (c.includes('usuario')) return 'usuario';
  return 'incidencia';
}

function mapAccionLegacy(accion: RegistrarAuditoriaParams['accion']): AuditLog['accion'] {
  switch (accion) {
    case 'create':
      return 'crear';
    case 'update':
      return 'actualizar';
    case 'delete':
      return 'eliminar';
  }
}

export async function registrarAuditoria(params: RegistrarAuditoriaParams): Promise<string> {
  const entidad = mapColeccionToEntidad(params.coleccion);
  const before = (params.cambios.antes ?? {}) as Record<string, unknown>;
  const after = (params.cambios.despues ?? {}) as Record<string, unknown>;

  const cambios = detectChanges(
    before,
    after,
    CAMPOS_AUDITORIA[entidad]
  );

  return createAuditLog({
    entidad,
    entidadId: params.documentoId,
    accion: mapAccionLegacy(params.accion),
    usuarioId: params.usuarioId,
    usuarioEmail: params.usuarioEmail,
    usuarioRol: params.usuarioRol || '',
    tenantId: params.tenantId,
    cambios,
    motivoCambio: params.motivoCambio,
  });
}

// Helper para detectar cambios entre objetos
export function detectChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldsToTrack?: string[]
): CambioAuditoria[] {
  const cambios: CambioAuditoria[] = [];
  const fields = fieldsToTrack || Object.keys(after);

  for (const field of fields) {
    const valorAnterior = before[field];
    const valorNuevo = after[field];

    // Comparación simple (no profunda)
    if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNuevo)) {
      cambios.push({
        campo: field,
        valorAnterior,
        valorNuevo,
      });
    }
  }

  return cambios;
}

// Campos críticos que siempre se deben auditar
export const CAMPOS_AUDITORIA = {
  incidencia: [
    'estado',
    'criticidad',
    'asignadoA',
    'diagnostico',
    'causaRaiz',
    'solucionAplicada',
    'materialesUtilizados',
  ],
  inventario: [
    'estado',
    'ubicacion',
    'cantidadDisponible',
  ],
  activo: [
    'estado',
    'equipos',
  ],
  preventivo: [
    'activo',
    'proximaEjecucion',
    'tareas',
  ],
  usuario: [
    'rol',
    'activo',
  ],
};
