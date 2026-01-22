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
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Preventivo,
  PreventivoFormData,
  Periodicidad,
} from '@/types';

const COLLECTION_NAME = 'preventivo';

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
  const lastNumber = parseInt(String(lastCode).split('-')[2], 10);
  const newNumber = (lastNumber + 1).toString().padStart(5, '0');
  return `${prefix}${newNumber}`;
}

export interface GetPreventivoParams {
  tenantId: string;
  activo?: boolean;
  desde?: Date;
  hasta?: Date;
  pageSize?: number;
}

export async function getPreventivoList(params: GetPreventivoParams): Promise<Preventivo[]> {
  const { tenantId, activo, desde, hasta, pageSize = 200 } = params;

  const constraints: QueryConstraint[] = [];

  if (activo !== undefined) {
    constraints.push(where('activo', '==', activo));
  }

  if (desde) {
    constraints.push(where('createdAt', '>=', Timestamp.fromDate(desde)));
  }

  if (hasta) {
    constraints.push(where('createdAt', '<=', Timestamp.fromDate(hasta)));
  }

  constraints.push(orderBy('proximaEjecucion', 'asc'));
  constraints.push(limit(pageSize));

  const q = query(collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Preventivo[];
}

export async function getPreventivoById(
  tenantId: string,
  preventivoId: string
): Promise<Preventivo | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, preventivoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
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

export async function getPreventivoPendientes(
  tenantId: string,
  dias = 14
): Promise<Preventivo[]> {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + dias);

  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('activo', '==', true),
    where('proximaEjecucion', '>=', Timestamp.fromDate(hoy)),
    where('proximaEjecucion', '<=', Timestamp.fromDate(limite)),
    orderBy('proximaEjecucion', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Preventivo[];
}

export interface ResumenPreventivo {
  totalPlanes: number;
  planesActivos: number;
  pendientesProximaSemana: number;
  porPeriodicidad: Record<Periodicidad, number>;
}

export async function getResumenPreventivo(tenantId: string): Promise<ResumenPreventivo> {
  const preventivos = await getPreventivoList({ tenantId });
  const pendientes = await getPreventivoPendientes(tenantId, 7);

  const porPeriodicidad: Record<Periodicidad, number> = {
    '3M': 0,
    '6M': 0,
    '1A': 0,
    '2A': 0,
  };

  for (const prev of preventivos) {
    if (porPeriodicidad[prev.periodicidad] !== undefined) {
      porPeriodicidad[prev.periodicidad]++;
    }
  }

  return {
    totalPlanes: preventivos.length,
    planesActivos: preventivos.filter((p) => p.activo).length,
    pendientesProximaSemana: pendientes.length,
    porPeriodicidad,
  };
}
