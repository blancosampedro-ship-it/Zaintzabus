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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Tecnico,
  TecnicoFormData,
  EstadoTecnico,
  ESTADOS_TECNICO,
  OrdenTrabajo,
  ESTADOS_OT,
} from '@/types';

const COLLECTION_NAME = 'tecnicos';

// ================================
// Tipos para parámetros y resultados
// ================================

export interface GetTecnicosParams {
  tenantId: string;
  estado?: EstadoTecnico | EstadoTecnico[];
  zonaPrincipalId?: string;
  especialidad?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export interface GetTecnicosResult {
  tecnicos: Tecnico[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface CargaTecnico {
  tecnicoId: string;
  tecnico: Tecnico;
  otsAsignadas: number;
  otsPendientes: number;
  otsEnCurso: number;
  disponibilidad: 'alta' | 'media' | 'baja' | 'sin_disponibilidad';
}

// ================================
// Operaciones CRUD
// ================================

export async function getTecnicos(
  params: GetTecnicosParams
): Promise<GetTecnicosResult> {
  const {
    tenantId,
    estado,
    zonaPrincipalId,
    especialidad,
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

  if (zonaPrincipalId) {
    constraints.push(where('zonaPrincipalId', '==', zonaPrincipalId));
  }

  if (especialidad) {
    constraints.push(where('especialidades', 'array-contains', especialidad));
  }

  // Ordenación
  constraints.push(orderBy('apellidos', 'asc'));

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

  const tecnicos = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Tecnico[];

  return {
    tecnicos,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getTecnicoById(
  tenantId: string,
  tecnicoId: string
): Promise<Tecnico | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, tecnicoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Tecnico;
}

export async function createTecnico(
  tenantId: string,
  data: TecnicoFormData,
  userId: string
): Promise<string> {
  const tecnico = {
    ...data,
    estado: data.estado || ESTADOS_TECNICO.ACTIVO,
    estadisticas: {
      otsCompletadas: 0,
      tiempoMedioResolucionMinutos: 0,
    },
    auditoria: {
      creadoPor: userId,
      createdAt: serverTimestamp(),
      actualizadoPor: userId,
      updatedAt: serverTimestamp(),
    },
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    tecnico
  );

  return docRef.id;
}

export async function updateTecnico(
  tenantId: string,
  tecnicoId: string,
  data: Partial<Tecnico>,
  userId: string
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, tecnicoId);

  await updateDoc(docRef, {
    ...data,
    'auditoria.actualizadoPor': userId,
    'auditoria.updatedAt': serverTimestamp(),
  });
}

export async function deleteTecnico(
  tenantId: string,
  tecnicoId: string
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, tecnicoId);
  await deleteDoc(docRef);
}

// ================================
// Queries especializadas
// ================================

export async function getTecnicosActivos(tenantId: string): Promise<Tecnico[]> {
  const result = await getTecnicos({
    tenantId,
    estado: ESTADOS_TECNICO.ACTIVO,
    pageSize: 100,
  });

  return result.tecnicos;
}

export async function getTecnicosPorZona(
  tenantId: string,
  zonaId: string
): Promise<Tecnico[]> {
  const result = await getTecnicos({
    tenantId,
    zonaPrincipalId: zonaId,
    estado: ESTADOS_TECNICO.ACTIVO,
    pageSize: 50,
  });

  return result.tecnicos;
}

export async function getTecnicosPorEspecialidad(
  tenantId: string,
  especialidad: string
): Promise<Tecnico[]> {
  const result = await getTecnicos({
    tenantId,
    especialidad,
    estado: ESTADOS_TECNICO.ACTIVO,
    pageSize: 50,
  });

  return result.tecnicos;
}

// ================================
// Carga de trabajo
// ================================

export async function getCargaTecnicos(
  tenantId: string,
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<CargaTecnico[]> {
  // Obtener todos los técnicos activos
  const tecnicos = await getTecnicosActivos(tenantId);

  // Obtener OTs asignadas a técnicos
  const otsQuery = query(
    collection(db, `tenants/${tenantId}/ordenes_trabajo`),
    where('estado', 'in', [ESTADOS_OT.ASIGNADA, ESTADOS_OT.EN_CURSO])
  );

  const otsSnapshot = await getDocs(otsQuery);
  const ots = otsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrdenTrabajo[];

  // Calcular carga por técnico
  const cargaPorTecnico: CargaTecnico[] = tecnicos.map((tecnico) => {
    const otsTecnico = ots.filter((ot) => ot.tecnicoId === tecnico.id);
    const otsPendientes = otsTecnico.filter((ot) => ot.estado === ESTADOS_OT.ASIGNADA).length;
    const otsEnCurso = otsTecnico.filter((ot) => ot.estado === ESTADOS_OT.EN_CURSO).length;
    const otsAsignadas = otsTecnico.length;

    // Calcular disponibilidad
    let disponibilidad: CargaTecnico['disponibilidad'];
    if (tecnico.estado !== ESTADOS_TECNICO.ACTIVO) {
      disponibilidad = 'sin_disponibilidad';
    } else if (otsAsignadas === 0) {
      disponibilidad = 'alta';
    } else if (otsAsignadas <= 3) {
      disponibilidad = 'media';
    } else {
      disponibilidad = 'baja';
    }

    return {
      tecnicoId: tecnico.id,
      tecnico,
      otsAsignadas,
      otsPendientes,
      otsEnCurso,
      disponibilidad,
    };
  });

  return cargaPorTecnico;
}

// ================================
// Historial de intervenciones
// ================================

export interface HistorialIntervencion {
  otId: string;
  otCodigo: string;
  tipo: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  tiempoMinutos?: number;
  estado: string;
}

export async function getHistorialTecnico(
  tenantId: string,
  tecnicoId: string,
  limite: number = 50
): Promise<HistorialIntervencion[]> {
  const otsQuery = query(
    collection(db, `tenants/${tenantId}/ordenes_trabajo`),
    where('tecnicoId', '==', tecnicoId),
    orderBy('auditoria.createdAt', 'desc'),
    limit(limite)
  );

  const snapshot = await getDocs(otsQuery);
  const ots = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrdenTrabajo[];

  return ots.map((ot) => ({
    otId: ot.id,
    otCodigo: ot.codigo,
    tipo: ot.tipo,
    fechaInicio: ot.ejecucion?.fechaInicioReal
      ? (ot.ejecucion.fechaInicioReal as Timestamp).toDate()
      : undefined,
    fechaFin: ot.ejecucion?.fechaFinReal
      ? (ot.ejecucion.fechaFinReal as Timestamp).toDate()
      : undefined,
    tiempoMinutos: ot.ejecucion?.tiempos?.intervencionMinutos,
    estado: ot.estado,
  }));
}

// ================================
// Estadísticas
// ================================

export interface EstadisticasTecnicoDetalle {
  otsCompletadas: number;
  otsValidadas: number;
  otsRechazadas: number;
  tiempoMedioResolucion: number;
  tiempoTotalIntervencion: number;
  costeTotal: number;
  tasaReincidencia: number;
  porTipo: {
    correctivo_urgente: number;
    correctivo_programado: number;
    preventivo: number;
  };
}

export async function getEstadisticasTecnico(
  tenantId: string,
  tecnicoId: string
): Promise<EstadisticasTecnicoDetalle> {
  const otsQuery = query(
    collection(db, `tenants/${tenantId}/ordenes_trabajo`),
    where('tecnicoId', '==', tecnicoId)
  );

  const snapshot = await getDocs(otsQuery);
  const ots = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrdenTrabajo[];

  let otsCompletadas = 0;
  let otsValidadas = 0;
  let otsRechazadas = 0;
  let tiempoTotalResolucion = 0;
  let countResolucion = 0;
  let tiempoTotalIntervencion = 0;
  let costeTotal = 0;
  const porTipo = {
    correctivo_urgente: 0,
    correctivo_programado: 0,
    preventivo: 0,
  };

  ots.forEach((ot) => {
    if (ot.estado === ESTADOS_OT.COMPLETADA || ot.estado === ESTADOS_OT.VALIDADA) {
      otsCompletadas++;
    }
    if (ot.estado === ESTADOS_OT.VALIDADA) {
      otsValidadas++;
    }
    if (ot.estado === ESTADOS_OT.RECHAZADA) {
      otsRechazadas++;
    }

    // Tiempos
    if (ot.ejecucion?.fechaInicioReal && ot.ejecucion?.fechaFinReal) {
      const inicio = (ot.ejecucion.fechaInicioReal as Timestamp).toDate();
      const fin = (ot.ejecucion.fechaFinReal as Timestamp).toDate();
      tiempoTotalResolucion += (fin.getTime() - inicio.getTime()) / 60000;
      countResolucion++;
    }

    if (ot.ejecucion?.tiempos?.intervencionMinutos) {
      tiempoTotalIntervencion += ot.ejecucion.tiempos.intervencionMinutos;
    }

    // Costes
    if (ot.costes?.total) {
      costeTotal += ot.costes.total;
    }

    // Por tipo
    if (ot.tipo in porTipo) {
      porTipo[ot.tipo as keyof typeof porTipo]++;
    }
  });

  return {
    otsCompletadas,
    otsValidadas,
    otsRechazadas,
    tiempoMedioResolucion: countResolucion > 0 ? Math.round(tiempoTotalResolucion / countResolucion) : 0,
    tiempoTotalIntervencion,
    costeTotal: Math.round(costeTotal * 100) / 100,
    tasaReincidencia: otsRechazadas > 0 && otsCompletadas > 0
      ? Math.round((otsRechazadas / otsCompletadas) * 100)
      : 0,
    porTipo,
  };
}

// ================================
// Algoritmo de asignación automática
// ================================

export interface SugerenciaAsignacion {
  tecnicoId: string;
  tecnico: Tecnico;
  puntuacion: number;
  razon: string;
}

export async function sugerirTecnicoParaOT(
  tenantId: string,
  zonaId?: string,
  especialidadRequerida?: string,
  esCritica: boolean = false
): Promise<SugerenciaAsignacion[]> {
  // Obtener carga actual de técnicos
  const cargas = await getCargaTecnicos(tenantId);

  // Filtrar solo técnicos disponibles
  const tecnicosDisponibles = cargas.filter(
    (c) => c.disponibilidad !== 'sin_disponibilidad'
  );

  // Calcular puntuación para cada técnico
  const sugerencias: SugerenciaAsignacion[] = tecnicosDisponibles.map((carga) => {
    let puntuacion = 100;
    const razones: string[] = [];

    // Penalizar por carga actual
    puntuacion -= carga.otsAsignadas * 15;
    if (carga.otsAsignadas > 0) {
      razones.push(`${carga.otsAsignadas} OTs asignadas`);
    }

    // Bonus por zona correcta
    if (zonaId && carga.tecnico.zonaPrincipalId === zonaId) {
      puntuacion += 20;
      razones.push('Zona principal');
    } else if (zonaId && carga.tecnico.zonasSecundariasIds?.includes(zonaId)) {
      puntuacion += 10;
      razones.push('Zona secundaria');
    }

    // Bonus por especialidad
    if (
      especialidadRequerida &&
      carga.tecnico.especialidades?.includes(especialidadRequerida)
    ) {
      puntuacion += 25;
      razones.push(`Especialista en ${especialidadRequerida}`);
    }

    // Bonus por productividad (OTs completadas)
    const otsCompletadas = carga.tecnico.estadisticas.otsCompletadas || 0;
    if (otsCompletadas > 50) {
      puntuacion += 15;
      razones.push('Alta experiencia');
    } else if (otsCompletadas > 20) {
      puntuacion += 10;
      razones.push('Experiencia media');
    }

    // Priorizar disponibilidad alta para OTs críticas
    if (esCritica && carga.disponibilidad === 'alta') {
      puntuacion += 30;
      razones.push('Disponible inmediatamente');
    }

    return {
      tecnicoId: carga.tecnicoId,
      tecnico: carga.tecnico,
      puntuacion: Math.max(0, puntuacion),
      razon: razones.join(' • ') || 'Disponible',
    };
  });

  // Ordenar por puntuación descendente
  return sugerencias.sort((a, b) => b.puntuacion - a.puntuacion);
}

// ================================
// Calendario de disponibilidad
// ================================

export interface DisponibilidadDia {
  fecha: Date;
  disponible: boolean;
  motivo?: string;
  otsAsignadas: number;
}

export async function getDisponibilidadTecnico(
  tenantId: string,
  tecnicoId: string,
  mes: Date
): Promise<DisponibilidadDia[]> {
  const tecnico = await getTecnicoById(tenantId, tecnicoId);
  if (!tecnico) return [];

  // Obtener OTs del técnico para el mes
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);

  const otsQuery = query(
    collection(db, `tenants/${tenantId}/ordenes_trabajo`),
    where('tecnicoId', '==', tecnicoId),
    where('planificacion.fechaPrevista', '>=', Timestamp.fromDate(inicioMes)),
    where('planificacion.fechaPrevista', '<=', Timestamp.fromDate(finMes))
  );

  const snapshot = await getDocs(otsQuery);
  const ots = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as OrdenTrabajo[];

  // Crear calendario del mes
  const dias: DisponibilidadDia[] = [];
  const current = new Date(inicioMes);

  while (current <= finMes) {
    const fecha = new Date(current);
    const otsDelDia = ots.filter((ot) => {
      if (!ot.planificacion?.fechaPrevista) return false;
      const fechaOT = (ot.planificacion.fechaPrevista as Timestamp).toDate();
      return fechaOT.toDateString() === fecha.toDateString();
    });

    // Determinar disponibilidad
    let disponible = tecnico.estado === ESTADOS_TECNICO.ACTIVO;
    let motivo: string | undefined;

    if (tecnico.estado === ESTADOS_TECNICO.VACACIONES) {
      disponible = false;
      motivo = 'Vacaciones';
    } else if (tecnico.estado === ESTADOS_TECNICO.BAJA_TEMPORAL) {
      disponible = false;
      motivo = 'Baja temporal';
    } else if (otsDelDia.length >= 5) {
      disponible = false;
      motivo = 'Agenda completa';
    }

    dias.push({
      fecha,
      disponible,
      motivo,
      otsAsignadas: otsDelDia.length,
    });

    current.setDate(current.getDate() + 1);
  }

  return dias;
}
