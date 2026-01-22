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
  OrdenTrabajo,
  OrdenTrabajoFormData,
  EstadoOT,
  TipoOT,
  MaterialOT,
  CostesOT,
  ESTADOS_OT,
} from '@/types';

const COLLECTION_NAME = 'ordenes_trabajo';

// ================================
// Generación de código único
// ================================

async function generarCodigoOT(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OT-${year}-`;

  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('codigo', '>=', prefix),
    where('codigo', '<', `OT-${year + 1}-`),
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

// ================================
// Tipos para parámetros y resultados
// ================================

export interface GetOrdenesTrabajoParams {
  tenantId: string;
  estado?: EstadoOT | EstadoOT[];
  tipo?: TipoOT;
  tecnicoId?: string;
  operadorId?: string;
  autobusId?: string;
  incidenciaId?: string;
  preventivoId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export interface GetOrdenesTrabajoResult {
  ordenes: OrdenTrabajo[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

// ================================
// Operaciones CRUD
// ================================

export async function getOrdenesTrabajo(
  params: GetOrdenesTrabajoParams
): Promise<GetOrdenesTrabajoResult> {
  const {
    tenantId,
    estado,
    tipo,
    tecnicoId,
    operadorId,
    autobusId,
    incidenciaId,
    preventivoId,
    fechaDesde,
    fechaHasta,
    pageSize = 20,
    lastDoc,
  } = params;

  const constraints: QueryConstraint[] = [];

  if (estado) {
    if (Array.isArray(estado)) {
      constraints.push(where('estado', 'in', estado));
    } else {
      constraints.push(where('estado', '==', estado));
    }
  }

  if (tipo) {
    constraints.push(where('tipo', '==', tipo));
  }

  if (tecnicoId) {
    constraints.push(where('tecnicoId', '==', tecnicoId));
  }

  if (operadorId) {
    constraints.push(where('operadorId', '==', operadorId));
  }

  if (autobusId) {
    constraints.push(where('autobusId', '==', autobusId));
  }

  if (incidenciaId) {
    constraints.push(where('incidenciaId', '==', incidenciaId));
  }

  if (preventivoId) {
    constraints.push(where('preventivoId', '==', preventivoId));
  }

  // Ordenación por defecto: más recientes primero
  constraints.push(orderBy('auditoria.createdAt', 'desc'));

  constraints.push(limit(pageSize + 1));

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

  const ordenes = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrdenTrabajo[];

  return {
    ordenes,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getOrdenTrabajoById(
  tenantId: string,
  ordenId: string
): Promise<OrdenTrabajo | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, ordenId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as OrdenTrabajo;
}

export async function createOrdenTrabajo(
  tenantId: string,
  data: Omit<OrdenTrabajoFormData, 'estado' | 'facturacion'>,
  userId: string
): Promise<string> {
  const codigo = await generarCodigoOT(tenantId);

  const orden: Omit<OrdenTrabajo, 'id'> = {
    ...data,
    codigo,
    estado: ESTADOS_OT.PENDIENTE,
    facturacion: {
      facturable: true,
    },
    auditoria: {
      creadoPor: userId,
      createdAt: serverTimestamp() as unknown as Timestamp,
      actualizadoPor: userId,
      updatedAt: serverTimestamp() as unknown as Timestamp,
    },
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    orden
  );

  return docRef.id;
}

export async function updateOrdenTrabajo(
  tenantId: string,
  ordenId: string,
  data: Partial<OrdenTrabajo>,
  userId: string
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, ordenId);

  await updateDoc(docRef, {
    ...data,
    'auditoria.actualizadoPor': userId,
    'auditoria.updatedAt': serverTimestamp(),
  });
}

export async function deleteOrdenTrabajo(
  tenantId: string,
  ordenId: string
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, ordenId);
  await deleteDoc(docRef);
}

// ================================
// Transiciones de estado
// ================================

const TRANSICIONES_OT: Record<EstadoOT, EstadoOT[]> = {
  [ESTADOS_OT.PENDIENTE]: [ESTADOS_OT.ASIGNADA],
  [ESTADOS_OT.ASIGNADA]: [ESTADOS_OT.EN_CURSO, ESTADOS_OT.PENDIENTE],
  [ESTADOS_OT.EN_CURSO]: [ESTADOS_OT.COMPLETADA],
  [ESTADOS_OT.COMPLETADA]: [ESTADOS_OT.VALIDADA, ESTADOS_OT.RECHAZADA],
  [ESTADOS_OT.VALIDADA]: [],
  [ESTADOS_OT.RECHAZADA]: [ESTADOS_OT.EN_CURSO],
};

export async function cambiarEstadoOT(
  tenantId: string,
  ordenId: string,
  nuevoEstado: EstadoOT,
  userId: string,
  datosAdicionales?: Partial<OrdenTrabajo>
): Promise<void> {
  const orden = await getOrdenTrabajoById(tenantId, ordenId);

  if (!orden) {
    throw new Error('Orden de trabajo no encontrada');
  }

  const transicionesValidas = TRANSICIONES_OT[orden.estado];
  if (!transicionesValidas.includes(nuevoEstado)) {
    throw new Error(
      `Transición de ${orden.estado} a ${nuevoEstado} no permitida`
    );
  }

  const updateData: Partial<OrdenTrabajo> = {
    estado: nuevoEstado,
    ...datosAdicionales,
  };

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

export async function asignarOT(
  tenantId: string,
  ordenId: string,
  tecnicoId: string,
  userId: string,
  fechaPrevista?: Date
): Promise<void> {
  const updateData: Partial<OrdenTrabajo> = {
    tecnicoId,
    estado: ESTADOS_OT.ASIGNADA,
    planificacion: {
      fechaPrevista: fechaPrevista 
        ? Timestamp.fromDate(fechaPrevista) 
        : undefined,
    },
  };

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

export async function iniciarOT(
  tenantId: string,
  ordenId: string,
  userId: string
): Promise<void> {
  const updateData: Partial<OrdenTrabajo> = {
    estado: ESTADOS_OT.EN_CURSO,
    ejecucion: {
      fechaInicioReal: serverTimestamp() as unknown as Timestamp,
    },
  };

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

export async function completarOT(
  tenantId: string,
  ordenId: string,
  userId: string,
  documentacion: {
    trabajosRealizados: string;
    materialesUsados?: MaterialOT[];
    tiempos?: {
      desplazamientoMinutos?: number;
      intervencionMinutos?: number;
    };
    firmaUrl?: string;
  }
): Promise<void> {
  const orden = await getOrdenTrabajoById(tenantId, ordenId);
  if (!orden) throw new Error('OT no encontrada');

  // Calcular costes
  const costes = calcularCostesOT(
    documentacion.materialesUsados || [],
    documentacion.tiempos?.intervencionMinutos || 0,
    documentacion.tiempos?.desplazamientoMinutos || 0
  );

  const updateData: Partial<OrdenTrabajo> = {
    estado: ESTADOS_OT.COMPLETADA,
    ejecucion: {
      ...orden.ejecucion,
      fechaFinReal: serverTimestamp() as unknown as Timestamp,
      tiempos: documentacion.tiempos,
    },
    documentacion: {
      trabajosRealizados: documentacion.trabajosRealizados,
      materialesUsados: documentacion.materialesUsados,
      firmaOperadorUrl: documentacion.firmaUrl,
    },
    costes,
  };

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

export async function validarOT(
  tenantId: string,
  ordenId: string,
  userId: string,
  observaciones?: string
): Promise<void> {
  const updateData: Partial<OrdenTrabajo> = {
    estado: ESTADOS_OT.VALIDADA,
  };

  if (observaciones) {
    const orden = await getOrdenTrabajoById(tenantId, ordenId);
    if (orden?.documentacion) {
      updateData.documentacion = {
        ...orden.documentacion,
      };
    }
  }

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

export async function rechazarOT(
  tenantId: string,
  ordenId: string,
  userId: string,
  motivo: string
): Promise<void> {
  const orden = await getOrdenTrabajoById(tenantId, ordenId);
  if (!orden) throw new Error('OT no encontrada');

  const updateData: Partial<OrdenTrabajo> = {
    estado: ESTADOS_OT.RECHAZADA,
    documentacion: {
      ...orden.documentacion,
      trabajosRealizados: orden.documentacion?.trabajosRealizados 
        ? `${orden.documentacion.trabajosRealizados}\n\n[RECHAZADA]: ${motivo}`
        : `[RECHAZADA]: ${motivo}`,
    },
  };

  await updateOrdenTrabajo(tenantId, ordenId, updateData, userId);
}

// ================================
// Cálculo de costes
// ================================

const TARIFA_HORA_INTERVENCION = 45; // €/h
const TARIFA_HORA_DESPLAZAMIENTO = 30; // €/h

function calcularCostesOT(
  materiales: MaterialOT[],
  minutosIntervencion: number,
  minutosDesplazamiento: number
): CostesOT {
  const costeMateriales = materiales.reduce((acc, mat) => {
    return acc + (mat.precioUnitario || 0) * mat.cantidad;
  }, 0);

  const costeManoObra = (minutosIntervencion / 60) * TARIFA_HORA_INTERVENCION;
  const costeDesplazamiento = (minutosDesplazamiento / 60) * TARIFA_HORA_DESPLAZAMIENTO;

  return {
    materiales: Math.round(costeMateriales * 100) / 100,
    manoObra: Math.round(costeManoObra * 100) / 100,
    desplazamiento: Math.round(costeDesplazamiento * 100) / 100,
    total: Math.round((costeMateriales + costeManoObra + costeDesplazamiento) * 100) / 100,
  };
}

// ================================
// Queries especializadas
// ================================

export async function getOTsPendientesAsignacion(
  tenantId: string
): Promise<OrdenTrabajo[]> {
  const result = await getOrdenesTrabajo({
    tenantId,
    estado: ESTADOS_OT.PENDIENTE,
    pageSize: 100,
  });

  return result.ordenes;
}

export async function getOTsAsignadasTecnico(
  tenantId: string,
  tecnicoId: string
): Promise<OrdenTrabajo[]> {
  const result = await getOrdenesTrabajo({
    tenantId,
    tecnicoId,
    estado: [ESTADOS_OT.ASIGNADA, ESTADOS_OT.EN_CURSO],
    pageSize: 50,
  });

  return result.ordenes;
}

export async function getOTsPorValidar(
  tenantId: string
): Promise<OrdenTrabajo[]> {
  const result = await getOrdenesTrabajo({
    tenantId,
    estado: ESTADOS_OT.COMPLETADA,
    pageSize: 100,
  });

  return result.ordenes;
}

export async function getOTsPorIncidencia(
  tenantId: string,
  incidenciaId: string
): Promise<OrdenTrabajo[]> {
  const result = await getOrdenesTrabajo({
    tenantId,
    incidenciaId,
    pageSize: 50,
  });

  return result.ordenes;
}

export async function getOTsPorAutobus(
  tenantId: string,
  autobusId: string
): Promise<OrdenTrabajo[]> {
  const result = await getOrdenesTrabajo({
    tenantId,
    autobusId,
    pageSize: 50,
  });

  return result.ordenes;
}

// ================================
// Estadísticas
// ================================

export interface EstadisticasOT {
  total: number;
  pendientes: number;
  enCurso: number;
  completadasHoy: number;
  costeTotal: number;
  tiempoPromedioResolucion: number;
  porEstado: Record<EstadoOT, number>;
  porTipo: Record<TipoOT, number>;
}

export async function getEstadisticasOT(
  tenantId: string
): Promise<EstadisticasOT> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const snapshot = await getDocs(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`)
  );

  const ordenes = snapshot.docs.map((doc) => doc.data() as OrdenTrabajo);

  const porEstado: Record<EstadoOT, number> = {
    pendiente: 0,
    asignada: 0,
    en_curso: 0,
    completada: 0,
    validada: 0,
    rechazada: 0,
  };

  const porTipo: Record<TipoOT, number> = {
    correctivo_urgente: 0,
    correctivo_programado: 0,
    preventivo: 0,
  };

  let pendientes = 0;
  let enCurso = 0;
  let completadasHoy = 0;
  let costeTotal = 0;
  let totalTiempoResolucion = 0;
  let countCompletadas = 0;

  ordenes.forEach((ot) => {
    porEstado[ot.estado]++;
    porTipo[ot.tipo]++;

    if (ot.estado === ESTADOS_OT.PENDIENTE) {
      pendientes++;
    }

    if (ot.estado === ESTADOS_OT.EN_CURSO) {
      enCurso++;
    }

    if (ot.costes?.total) {
      costeTotal += ot.costes.total;
    }

    if (
      ot.estado === ESTADOS_OT.COMPLETADA ||
      ot.estado === ESTADOS_OT.VALIDADA
    ) {
      if (ot.ejecucion?.fechaFinReal) {
        const fechaFin = (ot.ejecucion.fechaFinReal as Timestamp).toDate();
        if (fechaFin >= hoy) {
          completadasHoy++;
        }

        if (ot.ejecucion.fechaInicioReal) {
          const fechaInicio = (ot.ejecucion.fechaInicioReal as Timestamp).toDate();
          const tiempoResolucion = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60);
          totalTiempoResolucion += tiempoResolucion;
          countCompletadas++;
        }
      }
    }
  });

  return {
    total: ordenes.length,
    pendientes,
    enCurso,
    completadasHoy,
    costeTotal: Math.round(costeTotal * 100) / 100,
    tiempoPromedioResolucion:
      countCompletadas > 0 ? Math.round(totalTiempoResolucion / countCompletadas) : 0,
    porEstado,
    porTipo,
  };
}

// ================================
// Crear OT desde incidencia
// ================================

export async function crearOTDesdeIncidencia(
  tenantId: string,
  incidenciaId: string,
  incidenciaData: {
    codigo: string;
    criticidad: 'critica' | 'normal';
    autobusId?: string;
    equiposIds?: string[];
    operadorId?: string;
  },
  userId: string,
  esUrgente: boolean = false
): Promise<string> {
  const ordenData: Omit<OrdenTrabajoFormData, 'estado' | 'facturacion'> = {
    origen: 'incidencia',
    incidenciaId,
    tipo: esUrgente ? 'correctivo_urgente' : 'correctivo_programado',
    criticidad: incidenciaData.criticidad,
    autobusId: incidenciaData.autobusId,
    equiposIds: incidenciaData.equiposIds,
    operadorId: incidenciaData.operadorId,
  };

  return createOrdenTrabajo(tenantId, ordenData, userId);
}

// ================================
// Crear OT desde preventivo
// ================================

export async function crearOTDesdePreventivo(
  tenantId: string,
  preventivoId: string,
  preventivoData: {
    codigo: string;
    autobusId?: string;
    equiposIds?: string[];
    operadorId?: string;
  },
  userId: string
): Promise<string> {
  const ordenData: Omit<OrdenTrabajoFormData, 'estado' | 'facturacion'> = {
    origen: 'preventivo',
    preventivoId,
    tipo: 'preventivo',
    autobusId: preventivoData.autobusId,
    equiposIds: preventivoData.equiposIds,
    operadorId: preventivoData.operadorId,
  };

  return createOrdenTrabajo(tenantId, ordenData, userId);
}
