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
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Autobus,
  AutobusFormData,
  EstadoAutobus,
  FaseInstalacion,
  ESTADOS_AUTOBUS,
  FASES_INSTALACION,
  Equipo,
} from '@/types';

const AUTOBUSES_COLLECTION = 'autobuses';
const EQUIPOS_COLLECTION = 'equipos';

// ============================================
// AUTOBUSES - CONSULTAS
// ============================================

export interface GetAutobusesParams {
  operadorId?: string;
  estado?: EstadoAutobus | EstadoAutobus[];
  faseInstalacion?: FaseInstalacion | FaseInstalacion[];
  marca?: string;
  modelo?: string;
  busqueda?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
  orderByField?: 'codigo' | 'matricula' | 'auditoria.createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface GetAutobusesResult {
  items: Autobus[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  total?: number;
}

export async function getAutobuses(params: GetAutobusesParams): Promise<GetAutobusesResult> {
  const {
    operadorId,
    estado,
    faseInstalacion,
    pageSize = 50,
    lastDoc,
    orderByField = 'codigo',
    orderDirection = 'asc',
  } = params;

  const constraints: QueryConstraint[] = [];

  if (operadorId) {
    constraints.push(where('operadorId', '==', operadorId));
  }

  if (estado) {
    if (Array.isArray(estado)) {
      constraints.push(where('estado', 'in', estado));
    } else {
      constraints.push(where('estado', '==', estado));
    }
  }

  if (faseInstalacion) {
    if (Array.isArray(faseInstalacion)) {
      constraints.push(where('instalacion.fase', 'in', faseInstalacion));
    } else {
      constraints.push(where('instalacion.fase', '==', faseInstalacion));
    }
  }

  constraints.push(orderBy(orderByField, orderDirection));
  constraints.push(limit(pageSize + 1));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, AUTOBUSES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

  const items = docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Autobus[];

  return {
    items,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getAutobusById(autobusId: string): Promise<Autobus | null> {
  const docRef = doc(db, AUTOBUSES_COLLECTION, autobusId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Autobus;
}

export async function getAutobusByCodigo(codigo: string): Promise<Autobus | null> {
  const q = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('codigo', '==', codigo),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Autobus;
}

export async function getAutobusesByOperador(operadorId: string): Promise<Autobus[]> {
  const q = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('operadorId', '==', operadorId),
    where('estado', '!=', ESTADOS_AUTOBUS.BAJA),
    orderBy('estado'),
    orderBy('codigo', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Autobus[];
}

export async function searchAutobuses(
  searchTerm: string,
  limitResults: number = 10
): Promise<Autobus[]> {
  // Buscar por código (prefijo)
  const qCodigo = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('codigo', '>=', searchTerm.toUpperCase()),
    where('codigo', '<=', searchTerm.toUpperCase() + '\uf8ff'),
    limit(limitResults)
  );

  // Buscar por matrícula
  const qMatricula = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('matricula', '>=', searchTerm.toUpperCase()),
    where('matricula', '<=', searchTerm.toUpperCase() + '\uf8ff'),
    limit(limitResults)
  );

  const [snapCodigo, snapMatricula] = await Promise.all([
    getDocs(qCodigo),
    getDocs(qMatricula),
  ]);

  const resultsMap = new Map<string, Autobus>();

  snapCodigo.docs.forEach((d) => {
    resultsMap.set(d.id, { id: d.id, ...d.data() } as Autobus);
  });

  snapMatricula.docs.forEach((d) => {
    if (!resultsMap.has(d.id)) {
      resultsMap.set(d.id, { id: d.id, ...d.data() } as Autobus);
    }
  });

  return Array.from(resultsMap.values()).slice(0, limitResults);
}

// ============================================
// AUTOBUSES - CRUD
// ============================================

export async function createAutobus(data: AutobusFormData): Promise<string> {
  const autobus = {
    ...data,
    instalacion: data.instalacion || {
      fase: FASES_INSTALACION.PENDIENTE,
    },
    contadores: {
      totalEquipos: 0,
      totalAverias: 0,
    },
    auditoria: {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };

  const docRef = await addDoc(collection(db, AUTOBUSES_COLLECTION), autobus);
  return docRef.id;
}

export async function updateAutobus(
  autobusId: string,
  data: Partial<Autobus>
): Promise<void> {
  const docRef = doc(db, AUTOBUSES_COLLECTION, autobusId);

  const updateData = {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
  };

  await updateDoc(docRef, updateData);
}

export async function cambiarEstadoAutobus(
  autobusId: string,
  nuevoEstado: EstadoAutobus,
  motivo?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    estado: nuevoEstado,
    'auditoria.updatedAt': serverTimestamp(),
  };

  if (motivo) {
    updateData['ultimoCambioEstado'] = {
      estado: nuevoEstado,
      motivo,
      fecha: serverTimestamp(),
    };
  }

  await updateDoc(doc(db, AUTOBUSES_COLLECTION, autobusId), updateData);
}

export async function darDeBajaAutobus(
  autobusId: string,
  motivo: string,
  accionEquipos: 'mover_almacen' | 'mantener'
): Promise<{ equiposMovidos: number }> {
  const batch = writeBatch(db);
  let equiposMovidos = 0;

  // Si hay que mover los equipos al almacén
  if (accionEquipos === 'mover_almacen') {
    // Buscar equipos del bus
    const qEquipos = query(
      collection(db, EQUIPOS_COLLECTION),
      where('ubicacionActual.tipo', '==', 'autobus'),
      where('ubicacionActual.id', '==', autobusId)
    );

    const equiposSnap = await getDocs(qEquipos);

    equiposSnap.docs.forEach((equipoDoc) => {
      batch.update(equipoDoc.ref, {
        'ubicacionActual.tipo': 'ubicacion',
        'ubicacionActual.id': 'almacen_central',
        'ubicacionActual.nombre': 'Almacén Central (Baja bus)',
        'ubicacionActual.posicionEnBus': null,
        estado: 'en_almacen',
        'auditoria.updatedAt': serverTimestamp(),
      });
      equiposMovidos++;
    });
  }

  // Actualizar estado del bus
  const autobusRef = doc(db, AUTOBUSES_COLLECTION, autobusId);
  batch.update(autobusRef, {
    estado: ESTADOS_AUTOBUS.BAJA,
    'contadores.totalEquipos': accionEquipos === 'mover_almacen' ? 0 : increment(0),
    motivoBaja: motivo,
    fechaBaja: serverTimestamp(),
    'auditoria.updatedAt': serverTimestamp(),
  });

  await batch.commit();

  return { equiposMovidos };
}

// ============================================
// INSTALACIÓN
// ============================================

export interface RegistrarInstalacionParams {
  autobusId: string;
  fase: FaseInstalacion;
  tecnicosIds?: string[];
  comentarios?: string;
  fotos?: string[];
  userId: string;
}

export async function registrarFaseInstalacion(
  params: RegistrarInstalacionParams
): Promise<void> {
  const { autobusId, fase, tecnicosIds, comentarios, fotos, userId } = params;

  const updateData: Record<string, unknown> = {
    'instalacion.fase': fase,
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.actualizadoPor': userId,
  };

  if (fase === FASES_INSTALACION.PREINSTALACION) {
    updateData['instalacion.fechaPreinstalacion'] = serverTimestamp();
  } else if (fase === FASES_INSTALACION.COMPLETA) {
    updateData['instalacion.fechaInstalacionCompleta'] = serverTimestamp();
  }

  if (tecnicosIds && tecnicosIds.length > 0) {
    updateData['instalacion.tecnicosIds'] = tecnicosIds;
  }

  if (comentarios) {
    updateData['instalacion.comentarios'] = comentarios;
  }

  if (fotos && fotos.length > 0) {
    updateData['instalacion.fotos'] = fotos;
  }

  await updateDoc(doc(db, AUTOBUSES_COLLECTION, autobusId), updateData);
}

// ============================================
// ESTADÍSTICAS Y RESÚMENES
// ============================================

export interface ResumenFlota {
  total: number;
  operativos: number;
  enTaller: number;
  baja: number;
  porFaseInstalacion: {
    pendiente: number;
    preinstalacion: number;
    completa: number;
  };
  conEquiposAveriados: number;
}

export async function getResumenFlota(operadorId?: string): Promise<ResumenFlota> {
  let q;
  
  if (operadorId) {
    q = query(
      collection(db, AUTOBUSES_COLLECTION),
      where('operadorId', '==', operadorId)
    );
  } else {
    q = query(collection(db, AUTOBUSES_COLLECTION));
  }

  const snapshot = await getDocs(q);
  const buses = snapshot.docs.map((d) => d.data() as Autobus);

  const resumen: ResumenFlota = {
    total: buses.length,
    operativos: 0,
    enTaller: 0,
    baja: 0,
    porFaseInstalacion: {
      pendiente: 0,
      preinstalacion: 0,
      completa: 0,
    },
    conEquiposAveriados: 0,
  };

  buses.forEach((bus) => {
    // Por estado
    switch (bus.estado) {
      case ESTADOS_AUTOBUS.OPERATIVO:
        resumen.operativos++;
        break;
      case ESTADOS_AUTOBUS.EN_TALLER:
        resumen.enTaller++;
        break;
      case ESTADOS_AUTOBUS.BAJA:
        resumen.baja++;
        break;
    }

    // Por fase de instalación
    const fase = bus.instalacion?.fase || FASES_INSTALACION.PENDIENTE;
    switch (fase) {
      case FASES_INSTALACION.PENDIENTE:
        resumen.porFaseInstalacion.pendiente++;
        break;
      case FASES_INSTALACION.PREINSTALACION:
        resumen.porFaseInstalacion.preinstalacion++;
        break;
      case FASES_INSTALACION.COMPLETA:
        resumen.porFaseInstalacion.completa++;
        break;
    }
  });

  return resumen;
}

export interface ResumenFlotaPorOperador {
  operadorId: string;
  operadorNombre: string;
  total: number;
  operativos: number;
  enTaller: number;
  instalacionCompleta: number;
}

export async function getResumenFlotaPorOperadores(): Promise<ResumenFlotaPorOperador[]> {
  const q = query(collection(db, AUTOBUSES_COLLECTION));
  const snapshot = await getDocs(q);

  const porOperador = new Map<string, ResumenFlotaPorOperador>();

  snapshot.docs.forEach((d) => {
    const bus = d.data() as Autobus;
    const opId = bus.operadorId;

    if (!porOperador.has(opId)) {
      porOperador.set(opId, {
        operadorId: opId,
        operadorNombre: '', // Se debe resolver después
        total: 0,
        operativos: 0,
        enTaller: 0,
        instalacionCompleta: 0,
      });
    }

    const resumen = porOperador.get(opId)!;
    resumen.total++;

    if (bus.estado === ESTADOS_AUTOBUS.OPERATIVO) {
      resumen.operativos++;
    } else if (bus.estado === ESTADOS_AUTOBUS.EN_TALLER) {
      resumen.enTaller++;
    }

    if (bus.instalacion?.fase === FASES_INSTALACION.COMPLETA) {
      resumen.instalacionCompleta++;
    }
  });

  return Array.from(porOperador.values());
}

// ============================================
// EQUIPOS DEL BUS
// ============================================

export async function getEquiposDeAutobus(autobusId: string): Promise<Equipo[]> {
  const q = query(
    collection(db, EQUIPOS_COLLECTION),
    where('ubicacionActual.tipo', '==', 'autobus'),
    where('ubicacionActual.id', '==', autobusId),
    orderBy('ubicacionActual.posicionEnBus', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Equipo[];
}

export async function contarEquiposPorEstadoEnBus(
  autobusId: string
): Promise<{ total: number; operativos: number; averiados: number }> {
  const equipos = await getEquiposDeAutobus(autobusId);

  return {
    total: equipos.length,
    operativos: equipos.filter((e) => e.estado === 'en_servicio').length,
    averiados: equipos.filter((e) => e.estado === 'averiado').length,
  };
}

// ============================================
// VALIDACIONES
// ============================================

export async function verificarCodigoDisponible(
  codigo: string,
  excludeId?: string
): Promise<boolean> {
  const q = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('codigo', '==', codigo),
    limit(1)
  );

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return true;
  if (excludeId && snapshot.docs[0].id === excludeId) return true;
  
  return false;
}

export async function verificarMatriculaDisponible(
  matricula: string,
  excludeId?: string
): Promise<boolean> {
  const q = query(
    collection(db, AUTOBUSES_COLLECTION),
    where('matricula', '==', matricula),
    limit(1)
  );

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return true;
  if (excludeId && snapshot.docs[0].id === excludeId) return true;
  
  return false;
}
