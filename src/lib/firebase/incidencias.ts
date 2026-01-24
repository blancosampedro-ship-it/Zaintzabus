import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Incidencia,
  IncidenciaFormData,
  EstadoIncidencia,
  TRANSICIONES_ESTADO,
} from '@/types';

const COLLECTION_NAME = 'incidencias';

// Genera código único para incidencia: INC-2024-00001
async function generarCodigoIncidencia(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;

  // Obtener última incidencia del año
  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('codigo', '>=', prefix),
    where('codigo', '<', `INC-${year + 1}-`),
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

export interface GetIncidenciasParams {
  tenantId: string;
  estado?: EstadoIncidencia | EstadoIncidencia[];
  criticidad?: 'critica' | 'normal';
  activoId?: string;
  asignadoA?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export interface GetIncidenciasResult {
  incidencias: Incidencia[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function getIncidencias(
  params: GetIncidenciasParams
): Promise<GetIncidenciasResult> {
  const {
    tenantId,
    estado,
    criticidad,
    activoId,
    asignadoA,
    pageSize = 20,
    lastDoc,
  } = params;

  const constraints: QueryConstraint[] = [];

  // Filtros
  if (estado) {
    if (Array.isArray(estado)) {
      constraints.push(where('estado', 'in', estado));
    } else {
      constraints.push(where('estado', '==', estado));
    }
  }

  if (criticidad) {
    constraints.push(where('criticidad', '==', criticidad));
  }

  if (activoId) {
    constraints.push(where('activoPrincipalId', '==', activoId));
  }

  if (asignadoA) {
    constraints.push(where('asignadoA', '==', asignadoA));
  }

  // Ordenación
  constraints.push(orderBy('timestamps.recepcion', 'desc'));

  // Paginación
  constraints.push(limit(pageSize + 1)); // +1 para saber si hay más

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    ...constraints
  );

  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

  const incidencias = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Incidencia[];

  return {
    incidencias,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getIncidenciaById(
  tenantId: string,
  incidenciaId: string
): Promise<Incidencia | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, incidenciaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Incidencia;
}

export async function createIncidencia(
  tenantId: string,
  data: IncidenciaFormData,
  userId: string
): Promise<string> {
  const codigo = await generarCodigoIncidencia(tenantId);

  const incidencia = {
    ...data,
    codigo,
    estado: 'nueva' as EstadoIncidencia,
    timestamps: {
      recepcion: serverTimestamp(),
    },
    sla: {},
    reportadoPor: userId,
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    incidencia
  );

  return docRef.id;
}

export async function updateIncidencia(
  tenantId: string,
  incidenciaId: string,
  data: Partial<Incidencia>
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, incidenciaId);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function cambiarEstadoIncidencia(
  tenantId: string,
  incidenciaId: string,
  nuevoEstado: EstadoIncidencia,
  userId: string,
  observaciones?: string
): Promise<void> {
  const incidencia = await getIncidenciaById(tenantId, incidenciaId);

  if (!incidencia) {
    throw new Error('Incidencia no encontrada');
  }

  // Validar transición
  const transicionesValidas = TRANSICIONES_ESTADO[incidencia.estado];
  if (!transicionesValidas.includes(nuevoEstado)) {
    throw new Error(
      `Transición de ${incidencia.estado} a ${nuevoEstado} no permitida`
    );
  }

  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, incidenciaId);

  // Los timestamps específicos se actualizan via Cloud Function
  const updateData: Partial<Incidencia> = {
    estado: nuevoEstado,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  if (observaciones) {
    updateData.observaciones = observaciones;
  }

  // Si se asigna, actualizar asignadoA
  if (nuevoEstado === 'en_analisis' && !incidencia.asignadoA) {
    updateData.asignadoA = userId;
  }

  await updateDoc(docRef, updateData);
}

export async function asignarIncidencia(
  tenantId: string,
  incidenciaId: string,
  tecnicoId: string
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, incidenciaId);

  await updateDoc(docRef, {
    asignadoA: tecnicoId,
    updatedAt: serverTimestamp(),
  });
}

export async function getIncidenciasAbiertas(tenantId: string): Promise<Incidencia[]> {
  const result = await getIncidencias({
    tenantId,
    estado: ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'],
    pageSize: 100,
  });

  return result.incidencias;
}

export async function getIncidenciasPorActivo(
  tenantId: string,
  activoId: string
): Promise<Incidencia[]> {
  const result = await getIncidencias({
    tenantId,
    activoId,
    pageSize: 50,
  });

  return result.incidencias;
}

// Estadísticas para dashboard
export interface EstadisticasIncidencias {
  total: number;
  abiertas: number;
  criticas: number;
  resueltasHoy: number;
  tiempoPromedioResolucion: number;
  porEstado: Record<EstadoIncidencia, number>;
}

export async function getEstadisticasIncidencias(
  tenantId: string
): Promise<EstadisticasIncidencias> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Obtener todas las incidencias (para MVP, optimizar después con agregaciones)
  const snapshot = await getDocs(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`)
  );

  const incidencias = snapshot.docs.map((doc) => doc.data() as Incidencia);

  const porEstado: Record<EstadoIncidencia, number> = {
    nueva: 0,
    en_analisis: 0,
    en_intervencion: 0,
    resuelta: 0,
    cerrada: 0,
    reabierta: 0,
  };

  let abiertas = 0;
  let criticas = 0;
  let resueltasHoy = 0;
  let totalTiempoResolucion = 0;
  let countResueltas = 0;

  incidencias.forEach((inc) => {
    // Proteger contra estados no válidos
    if (inc.estado && porEstado[inc.estado] !== undefined) {
      porEstado[inc.estado]++;
    }

    if (['nueva', 'en_analisis', 'en_intervencion', 'reabierta'].includes(inc.estado)) {
      abiertas++;
    }

    if (inc.criticidad === 'critica') {
      criticas++;
    }

    if (inc.estado === 'resuelta' || inc.estado === 'cerrada') {
      if (inc.timestamps.finReparacion) {
        const finRep = inc.timestamps.finReparacion.toDate();
        if (finRep >= hoy) {
          resueltasHoy++;
        }
      }

      if (inc.sla?.tiempoResolucion) {
        totalTiempoResolucion += inc.sla.tiempoResolucion;
        countResueltas++;
      }
    }
  });

  return {
    total: incidencias.length,
    abiertas,
    criticas,
    resueltasHoy,
    tiempoPromedioResolucion:
      countResueltas > 0 ? Math.round(totalTiempoResolucion / countResueltas) : 0,
    porEstado,
  };
}
