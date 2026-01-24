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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Activo, ActivoFormData } from '@/types';

const COLLECTION_NAME = 'autobuses';

export async function getActivos(
  tenantId: string,
  estado?: Activo['estado']
): Promise<Activo[]> {
  let q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    orderBy('codigo', 'asc')
  );

  if (estado) {
    q = query(
      collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
      where('estado', '==', estado),
      orderBy('codigo', 'asc')
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Activo[];
}

export async function getActivoById(
  tenantId: string,
  activoId: string
): Promise<Activo | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, activoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Activo;
}

export async function createActivo(
  tenantId: string,
  data: ActivoFormData
): Promise<string> {
  const activo = {
    ...data,
    equipos: data.equipos || [],
    horasOperacion: data.horasOperacion || 0,
    kmTotales: data.kmTotales || 0,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    activo
  );

  return docRef.id;
}

export async function updateActivo(
  tenantId: string,
  activoId: string,
  data: Partial<Activo>
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, activoId);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export interface ResumenActivos {
  total: number;
  operativos: number;
  enTaller: number;
  baja: number;
  porTipo: Record<string, number>;
}

export async function getResumenActivos(tenantId: string): Promise<ResumenActivos> {
  const activos = await getActivos(tenantId);

  const porTipo: Record<string, number> = {};
  let operativos = 0;
  let enTaller = 0;
  let baja = 0;

  activos.forEach((activo) => {
    if (!porTipo[activo.tipo]) {
      porTipo[activo.tipo] = 0;
    }
    porTipo[activo.tipo]++;

    switch (activo.estado) {
      case 'operativo':
        operativos++;
        break;
      case 'en_taller':
        enTaller++;
        break;
      case 'baja':
        baja++;
        break;
    }
  });

  return {
    total: activos.length,
    operativos,
    enTaller,
    baja,
    porTipo,
  };
}

export async function buscarActivos(
  tenantId: string,
  termino: string
): Promise<Activo[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('codigo', '>=', termino.toUpperCase()),
    where('codigo', '<=', termino.toUpperCase() + '\uf8ff'),
    limit(20)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Activo[];
}
