import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Preventivo,
  PreventivoFormData,
  EjecucionPreventivo,
  Periodicidad,
} from '@/types';

const COLLECTION_NAME = 'preventivos';

// Genera código único para preventivo
async function generarCodigoPreventivo(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PREV-${year}-`;

  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('codigo', '>=', prefix),
    where('codigo', '<', `PREV-${year + 1}-`),
    orderBy('codigo', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return `${prefix}00001`;
  }

  const lastCode = snapshot.docs[0].data().codigo;
  const lastNumber = parseInt(lastCode.split('-')[2], 10);
  const newNumber = (lastNumber + 1).toString().padStart(5, '0');

  return `${prefix}${newNumber}`;
}

export async function getPreventivos(
  tenantId: string,
  activo?: boolean
): Promise<Preventivo[]> {
  let q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    orderBy('proximaEjecucion', 'asc')
  );

  if (activo !== undefined) {
    q = query(
      collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
      where('activo', '==', activo),
      orderBy('proximaEjecucion', 'asc')
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Preventivo[];
}

export async function getPreventivoById(
  tenantId: string,
  preventivoId: string
): Promise<Preventivo | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, preventivoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Preventivo;
}

export async function createPreventivo(
  tenantId: string,
  data: PreventivoFormData
): Promise<string> {
  const codigo = await generarCodigoPreventivo(tenantId);

  const preventivo = {
    ...data,
    codigo,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    preventivo
  );

  return docRef.id;
}

export async function updatePreventivo(
  tenantId: string,
  preventivoId: string,
  data: Partial<Preventivo>
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, preventivoId);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Calcular próxima fecha según periodicidad
export function calcularProximaEjecucion(
  fecha: Date,
  periodicidad: Periodicidad
): Date {
  const nueva = new Date(fecha);

  switch (periodicidad) {
    case '3M':
      nueva.setMonth(nueva.getMonth() + 3);
      break;
    case '6M':
      nueva.setMonth(nueva.getMonth() + 6);
      break;
    case '1A':
      nueva.setFullYear(nueva.getFullYear() + 1);
      break;
    case '2A':
      nueva.setFullYear(nueva.getFullYear() + 2);
      break;
  }

  return nueva;
}

// Ejecuciones de preventivo
export async function getEjecuciones(
  tenantId: string,
  preventivoId: string,
  estado?: EjecucionPreventivo['estado']
): Promise<EjecucionPreventivo[]> {
  let q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}/${preventivoId}/ejecuciones`),
    orderBy('fechaProgramada', 'desc')
  );

  if (estado) {
    q = query(
      collection(db, `tenants/${tenantId}/${COLLECTION_NAME}/${preventivoId}/ejecuciones`),
      where('estado', '==', estado),
      orderBy('fechaProgramada', 'desc')
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EjecucionPreventivo[];
}

export async function createEjecucion(
  tenantId: string,
  preventivoId: string,
  data: Omit<EjecucionPreventivo, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ejecucion = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}/${preventivoId}/ejecuciones`),
    ejecucion
  );

  return docRef.id;
}

export async function updateEjecucion(
  tenantId: string,
  preventivoId: string,
  ejecucionId: string,
  data: Partial<EjecucionPreventivo>
): Promise<void> {
  const docRef = doc(
    db,
    `tenants/${tenantId}/${COLLECTION_NAME}/${preventivoId}/ejecuciones`,
    ejecucionId
  );

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Preventivos próximos a vencer
export async function getPreventivosPendientes(
  tenantId: string,
  diasAdelante: number = 7
): Promise<Preventivo[]> {
  const ahora = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + diasAdelante);

  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('activo', '==', true),
    where('proximaEjecucion', '>=', Timestamp.fromDate(ahora)),
    where('proximaEjecucion', '<=', Timestamp.fromDate(limite)),
    orderBy('proximaEjecucion', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Preventivo[];
}

export interface ResumenPreventivos {
  totalPlanes: number;
  planesActivos: number;
  pendientesProximaSemana: number;
  ejecutadosMesActual: number;
}

export async function getResumenPreventivos(
  tenantId: string
): Promise<ResumenPreventivos> {
  const preventivos = await getPreventivos(tenantId);
  const pendientes = await getPreventivosPendientes(tenantId, 7);

  // Contar ejecutados este mes
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  let ejecutadosMesActual = 0;

  for (const prev of preventivos) {
    const ejecuciones = await getEjecuciones(tenantId, prev.id, 'completada');
    ejecutadosMesActual += ejecuciones.filter((ej) => {
      if (!ej.fechaFin) return false;
      return ej.fechaFin.toDate() >= inicioMes;
    }).length;
  }

  return {
    totalPlanes: preventivos.length,
    planesActivos: preventivos.filter((p) => p.activo).length,
    pendientesProximaSemana: pendientes.length,
    ejecutadosMesActual,
  };
}
