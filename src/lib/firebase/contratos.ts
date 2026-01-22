'use strict';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import type {
  Contrato,
  ContratoFormData,
  Operador,
  DocumentId,
  Auditoria,
} from '@/types';

// ============================================
// COLECCIONES
// ============================================

const getContratosRef = (tenantId: string) =>
  collection(db, `tenants/${tenantId}/contratos`);

const getOperadoresRef = () => collection(db, 'operadores');

// ============================================
// CONTRATOS - CRUD
// ============================================

/**
 * Obtiene todos los contratos de un tenant
 */
export async function getContratos(tenantId: string): Promise<Contrato[]> {
  const q = query(
    getContratosRef(tenantId),
    orderBy('auditoria.createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contrato[];
}

/**
 * Obtiene contratos por operador
 */
export async function getContratosPorOperador(
  tenantId: string,
  operadorId: string
): Promise<Contrato[]> {
  const q = query(
    getContratosRef(tenantId),
    where('operadorId', '==', operadorId),
    orderBy('fechaInicio', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contrato[];
}

/**
 * Obtiene el contrato activo de un operador
 */
export async function getContratoActivo(
  tenantId: string,
  operadorId: string
): Promise<Contrato | null> {
  const ahora = Timestamp.now();
  const q = query(
    getContratosRef(tenantId),
    where('operadorId', '==', operadorId),
    where('fechaInicio', '<=', ahora)
  );
  const snapshot = await getDocs(q);
  
  // Filtrar contratos vigentes (sin fecha fin o fecha fin >= ahora)
  const contratosVigentes = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Contrato))
    .filter((c) => !c.fechaFin || c.fechaFin.toMillis() >= ahora.toMillis());
  
  // Retornar el más reciente
  return contratosVigentes.length > 0
    ? contratosVigentes.sort((a, b) => 
        b.fechaInicio.toMillis() - a.fechaInicio.toMillis()
      )[0]
    : null;
}

/**
 * Obtiene un contrato por ID
 */
export async function getContrato(
  tenantId: string,
  contratoId: string
): Promise<Contrato | null> {
  const docRef = doc(getContratosRef(tenantId), contratoId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Contrato;
}

/**
 * Crea un nuevo contrato
 */
export async function crearContrato(
  tenantId: string,
  data: ContratoFormData,
  userId: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getContratosRef(tenantId), {
    ...data,
    auditoria,
  });

  return docRef.id;
}

/**
 * Actualiza un contrato existente
 */
export async function actualizarContrato(
  tenantId: string,
  contratoId: string,
  data: Partial<ContratoFormData>,
  userId: string
): Promise<void> {
  const docRef = doc(getContratosRef(tenantId), contratoId);
  await updateDoc(docRef, {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Elimina un contrato
 */
export async function eliminarContrato(
  tenantId: string,
  contratoId: string
): Promise<void> {
  const docRef = doc(getContratosRef(tenantId), contratoId);
  
  // Primero obtener el contrato para eliminar el documento adjunto si existe
  const contrato = await getContrato(tenantId, contratoId);
  if (contrato?.documentoUrl) {
    try {
      const storageRef = ref(storage, contrato.documentoUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn('No se pudo eliminar el documento adjunto:', error);
    }
  }
  
  await deleteDoc(docRef);
}

/**
 * Sube el documento del contrato
 */
export async function subirDocumentoContrato(
  tenantId: string,
  contratoId: string,
  file: File,
  userId: string
): Promise<string> {
  const extension = file.name.split('.').pop();
  const fileName = `contratos/${tenantId}/${contratoId}/documento.${extension}`;
  const storageRef = ref(storage, fileName);
  
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  
  // Actualizar el contrato con la URL del documento
  await actualizarContrato(tenantId, contratoId, { documentoUrl: url }, userId);
  
  return url;
}

// ============================================
// OPERADORES - CRUD
// ============================================

/**
 * Obtiene todos los operadores
 */
export async function getOperadores(): Promise<Operador[]> {
  const q = query(getOperadoresRef(), orderBy('nombre', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Operador[];
}

/**
 * Obtiene operadores activos
 */
export async function getOperadoresActivos(): Promise<Operador[]> {
  const q = query(
    getOperadoresRef(),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Operador[];
}

/**
 * Obtiene un operador por ID
 */
export async function getOperador(operadorId: string): Promise<Operador | null> {
  const docRef = doc(getOperadoresRef(), operadorId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Operador;
}

/**
 * Crea un nuevo operador
 */
export async function crearOperador(
  data: Omit<Operador, 'id' | 'auditoria' | 'fechaAlta'>,
  userId: string
): Promise<string> {
  const auditoria: Auditoria = {
    createdAt: serverTimestamp() as Timestamp,
    createdBy: userId,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId,
  };

  const docRef = await addDoc(getOperadoresRef(), {
    ...data,
    fechaAlta: serverTimestamp(),
    auditoria,
  });

  return docRef.id;
}

/**
 * Actualiza un operador
 */
export async function actualizarOperador(
  operadorId: string,
  data: Partial<Omit<Operador, 'id' | 'auditoria' | 'fechaAlta'>>,
  userId: string
): Promise<void> {
  const docRef = doc(getOperadoresRef(), operadorId);
  await updateDoc(docRef, {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.updatedBy': userId,
  });
}

/**
 * Desactiva un operador (soft delete)
 */
export async function desactivarOperador(
  operadorId: string,
  userId: string
): Promise<void> {
  await actualizarOperador(operadorId, { activo: false }, userId);
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Genera un código único para contrato
 */
export function generarCodigoContrato(operadorCodigo: string, año: number): string {
  return `CTR-${operadorCodigo}-${año}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/**
 * Calcula si un contrato está vigente
 */
export function contratoVigente(contrato: Contrato): boolean {
  const ahora = Date.now();
  const inicio = contrato.fechaInicio.toMillis();
  const fin = contrato.fechaFin?.toMillis() || Infinity;
  return ahora >= inicio && ahora <= fin;
}

/**
 * Calcula los días restantes de un contrato
 */
export function diasRestantesContrato(contrato: Contrato): number | null {
  if (!contrato.fechaFin) return null;
  const ahora = Date.now();
  const fin = contrato.fechaFin.toMillis();
  const diff = fin - ahora;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene resumen de contratos por estado
 */
export async function getResumenContratos(tenantId: string): Promise<{
  total: number;
  vigentes: number;
  porVencer: number;
  vencidos: number;
}> {
  const contratos = await getContratos(tenantId);
  const ahora = Date.now();
  const treintaDias = 30 * 24 * 60 * 60 * 1000;

  let vigentes = 0;
  let porVencer = 0;
  let vencidos = 0;

  for (const contrato of contratos) {
    const fin = contrato.fechaFin?.toMillis() || Infinity;
    const inicio = contrato.fechaInicio.toMillis();

    if (ahora < inicio || ahora > fin) {
      vencidos++;
    } else if (fin !== Infinity && fin - ahora < treintaDias) {
      porVencer++;
    } else {
      vigentes++;
    }
  }

  return {
    total: contratos.length,
    vigentes,
    porVencer,
    vencidos,
  };
}
