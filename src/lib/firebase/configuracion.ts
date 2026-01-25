'use strict';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  Ubicacion,
  Laboratorio,
  TipoEquipoConfig,
  ParametrosSistema,
  LogAuditoria,
  DocumentId,
  Auditoria,
} from '@/types';

// ============================================
// COLECCIONES
// ============================================

const getUbicacionesRef = (tenantId?: string) =>
  tenantId
    ? collection(db, `tenants/${tenantId}/ubicaciones`)
    : collection(db, 'ubicaciones');

const getLaboratoriosRef = () => collection(db, 'laboratorios');

const getTiposEquipoRef = () => collection(db, 'tipos_equipo');

const getConfigRef = () => doc(db, 'config/sistema');

const getLogsRef = () => collection(db, 'logs_auditoria');

// ============================================
// UBICACIONES
// ============================================

/**
 * Obtiene todas las ubicaciones
 */
export async function getUbicaciones(tenantId?: string): Promise<Ubicacion[]> {
  const q = query(getUbicacionesRef(tenantId), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Ubicacion[];
}

/**
 * Obtiene ubicaciones por tipo
 */
export async function getUbicacionesPorTipo(
  tipo: Ubicacion['tipo'],
  tenantId?: string
): Promise<Ubicacion[]> {
  const q = query(
    getUbicacionesRef(tenantId),
    where('tipo', '==', tipo),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Ubicacion[];
}

/**
 * Obtiene una ubicación por ID
 */
export async function getUbicacion(
  ubicacionId: string,
  tenantId?: string
): Promise<Ubicacion | null> {
  const docRef = doc(getUbicacionesRef(tenantId), ubicacionId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Ubicacion;
}

/**
 * Crea una ubicación
 */
export async function crearUbicacion(
  data: Omit<Ubicacion, 'id' | 'auditoria'>,
  userId: string,
  tenantId?: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getUbicacionesRef(tenantId), {
    ...data,
    auditoria,
  });

  return docRef.id;
}

/**
 * Actualiza una ubicación
 */
export async function actualizarUbicacion(
  ubicacionId: string,
  data: Partial<Omit<Ubicacion, 'id' | 'auditoria'>>,
  userId: string,
  tenantId?: string
): Promise<void> {
  const docRef = doc(getUbicacionesRef(tenantId), ubicacionId);
  await updateDoc(docRef, {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Elimina una ubicación
 */
export async function eliminarUbicacion(
  ubicacionId: string,
  tenantId?: string
): Promise<void> {
  const docRef = doc(getUbicacionesRef(tenantId), ubicacionId);
  await deleteDoc(docRef);
}

// ============================================
// LABORATORIOS
// ============================================

/**
 * Obtiene todos los laboratorios
 */
export async function getLaboratorios(): Promise<Laboratorio[]> {
  const q = query(getLaboratoriosRef(), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Laboratorio[];
}

/**
 * Obtiene laboratorios activos
 */
export async function getLaboratoriosActivos(): Promise<Laboratorio[]> {
  const q = query(
    getLaboratoriosRef(),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Laboratorio[];
}

/**
 * Crea un laboratorio
 */
export async function crearLaboratorio(
  data: Omit<Laboratorio, 'id' | 'auditoria'>,
  userId: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getLaboratoriosRef(), {
    ...data,
    auditoria,
  });

  return docRef.id;
}

/**
 * Actualiza un laboratorio
 */
export async function actualizarLaboratorio(
  laboratorioId: string,
  data: Partial<Omit<Laboratorio, 'id' | 'auditoria'>>,
  userId: string
): Promise<void> {
  const docRef = doc(getLaboratoriosRef(), laboratorioId);
  await updateDoc(docRef, {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Elimina un laboratorio
 */
export async function eliminarLaboratorio(laboratorioId: string): Promise<void> {
  const docRef = doc(getLaboratoriosRef(), laboratorioId);
  await deleteDoc(docRef);
}

// ============================================
// TIPOS DE EQUIPO
// ============================================

/**
 * Obtiene todos los tipos de equipo
 */
export async function getTiposEquipo(): Promise<TipoEquipoConfig[]> {
  const q = query(getTiposEquipoRef(), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TipoEquipoConfig[];
}

/**
 * Obtiene tipos de equipo activos
 */
export async function getTiposEquipoActivos(): Promise<TipoEquipoConfig[]> {
  const q = query(
    getTiposEquipoRef(),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TipoEquipoConfig[];
}

/**
 * Crea un tipo de equipo
 */
export async function crearTipoEquipo(
  data: Omit<TipoEquipoConfig, 'id' | 'auditoria'>,
  userId: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getTiposEquipoRef(), {
    ...data,
    auditoria,
  });

  return docRef.id;
}

/**
 * Actualiza un tipo de equipo
 */
export async function actualizarTipoEquipo(
  tipoId: string,
  data: Partial<Omit<TipoEquipoConfig, 'id' | 'auditoria'>>,
  userId: string
): Promise<void> {
  const docRef = doc(getTiposEquipoRef(), tipoId);
  await updateDoc(docRef, {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Elimina un tipo de equipo
 */
export async function eliminarTipoEquipo(tipoId: string): Promise<void> {
  const docRef = doc(getTiposEquipoRef(), tipoId);
  await deleteDoc(docRef);
}

// ============================================
// PARÁMETROS DEL SISTEMA
// ============================================

/**
 * Obtiene los parámetros del sistema
 */
export async function getParametrosSistema(): Promise<ParametrosSistema | null> {
  const snapshot = await getDoc(getConfigRef());
  if (!snapshot.exists()) return null;
  return { id: 'config', ...snapshot.data() } as ParametrosSistema;
}

/**
 * Actualiza los parámetros del sistema
 */
export async function actualizarParametrosSistema(
  data: Partial<Omit<ParametrosSistema, 'id' | 'updatedAt'>>
): Promise<void> {
  await setDoc(
    getConfigRef(),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Inicializa los parámetros del sistema con valores por defecto
 */
export async function inicializarParametrosSistema(): Promise<void> {
  const config = await getParametrosSistema();
  if (config) return; // Ya existe

  await setDoc(getConfigRef(), {
    ivaPorDefecto: 21,
    costeHoraPorDefecto: 45,
    diasVencimientoFactura: 30,
    prefijoFactura: 'FAC',
    siguienteNumeroFactura: 1,
    prefijoOT: 'OT',
    siguienteNumeroOT: 1,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// LOGS DE AUDITORÍA
// ============================================

/**
 * Registra una acción en el log de auditoría
 */
export async function registrarLogAuditoria(
  data: Omit<LogAuditoria, 'id' | 'timestamp'>
): Promise<void> {
  await addDoc(getLogsRef(), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

/**
 * Alias para getLogsAuditoria
 */
export async function getLogs(
  opciones?: {
    usuarioId?: string;
    entidad?: string;
    accion?: LogAuditoria['accion'];
    limite?: number;
  }
): Promise<LogAuditoria[]> {
  return getLogsAuditoria(opciones);
}

/**
 * Obtiene logs de auditoría
 */
export async function getLogsAuditoria(
  opciones?: {
    usuarioId?: string;
    entidad?: string;
    accion?: LogAuditoria['accion'];
    limite?: number;
  }
): Promise<LogAuditoria[]> {
  let q = query(getLogsRef(), orderBy('timestamp', 'desc'));

  if (opciones?.limite) {
    q = query(q, limit(opciones.limite));
  }

  const snapshot = await getDocs(q);
  let logs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LogAuditoria[];

  // Filtrar en cliente (Firestore no permite múltiples where en campos diferentes sin índice)
  if (opciones?.usuarioId) {
    logs = logs.filter((l) => l.usuarioId === opciones.usuarioId);
  }
  if (opciones?.entidad) {
    logs = logs.filter((l) => l.entidad === opciones.entidad);
  }
  if (opciones?.accion) {
    logs = logs.filter((l) => l.accion === opciones.accion);
  }

  return logs;
}

/**
 * Obtiene logs de una entidad específica
 */
export async function getLogsEntidad(
  entidad: string,
  entidadId: string
): Promise<LogAuditoria[]> {
  const q = query(
    getLogsRef(),
    where('entidad', '==', entidad),
    where('entidadId', '==', entidadId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LogAuditoria[];
}

// ============================================
// UTILIDADES DE ADMINISTRACIÓN
// ============================================

/**
 * Obtiene estadísticas generales del sistema
 */
export async function getEstadisticasSistema(tenantId: string): Promise<{
  usuarios: number;
  operadores: number;
  autobuses: number;
  equipos: number;
  incidencias: number;
  ordenesTrabajo: number;
}> {
  // Simplificado - en producción se usarían contadores agregados
  const [
    usuariosSnap,
    operadoresSnap,
    autobusesSnap,
    equiposSnap,
    incidenciasSnap,
    otsSnap,
  ] = await Promise.all([
    getDocs(collection(db, `tenants/${tenantId}/usuarios`)),
    getDocs(collection(db, 'tenants')),
    getDocs(collection(db, `tenants/${tenantId}/autobuses`)),
    getDocs(collection(db, `tenants/${tenantId}/equipos`)),
    getDocs(collection(db, `tenants/${tenantId}/incidencias`)),
    getDocs(collection(db, `tenants/${tenantId}/ordenes_trabajo`)),
  ]);

  return {
    usuarios: usuariosSnap.size,
    operadores: operadoresSnap.size,
    autobuses: autobusesSnap.size,
    equipos: equiposSnap.size,
    incidencias: incidenciasSnap.size,
    ordenesTrabajo: otsSnap.size,
  };
}
