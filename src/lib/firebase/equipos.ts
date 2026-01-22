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
  Equipo,
  EquipoFormData,
  EstadoEquipo,
  MovimientoEquipo,
  MovimientoEquipoFormData,
  TipoEquipo,
  UbicacionActualEquipo,
  ESTADOS_EQUIPO,
} from '@/types';

const EQUIPOS_COLLECTION = 'equipos';
const MOVIMIENTOS_COLLECTION = 'movimientos_equipos';
const TIPOS_EQUIPO_COLLECTION = 'tipos_equipo';

// ============================================
// TIPOS EQUIPOS (Catálogo)
// ============================================

export async function getTiposEquipo(): Promise<TipoEquipo[]> {
  const q = query(
    collection(db, TIPOS_EQUIPO_COLLECTION),
    where('activo', '==', true),
    orderBy('nombre', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TipoEquipo[];
}

export async function getTipoEquipoById(tipoId: string): Promise<TipoEquipo | null> {
  const docRef = doc(db, TIPOS_EQUIPO_COLLECTION, tipoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as TipoEquipo;
}

// ============================================
// EQUIPOS - CONSULTAS
// ============================================

export interface GetEquiposParams {
  tipoEquipoId?: string;
  estado?: EstadoEquipo | EstadoEquipo[];
  operadorId?: string;
  ubicacionTipo?: 'autobus' | 'ubicacion' | 'laboratorio';
  ubicacionId?: string;
  busqueda?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
  orderByField?: 'codigoInterno' | 'fechas.alta' | 'tipoEquipoNombre';
  orderDirection?: 'asc' | 'desc';
}

export interface GetEquiposResult {
  items: Equipo[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  total?: number;
}

export async function getEquipos(params: GetEquiposParams): Promise<GetEquiposResult> {
  const {
    tipoEquipoId,
    estado,
    operadorId,
    ubicacionTipo,
    ubicacionId,
    pageSize = 20,
    lastDoc,
    orderByField = 'codigoInterno',
    orderDirection = 'asc',
  } = params;

  const constraints: QueryConstraint[] = [];

  if (tipoEquipoId) {
    constraints.push(where('tipoEquipoId', '==', tipoEquipoId));
  }

  if (estado) {
    if (Array.isArray(estado)) {
      constraints.push(where('estado', 'in', estado));
    } else {
      constraints.push(where('estado', '==', estado));
    }
  }

  if (operadorId) {
    constraints.push(where('propiedad.operadorAsignadoId', '==', operadorId));
  }

  if (ubicacionTipo) {
    constraints.push(where('ubicacionActual.tipo', '==', ubicacionTipo));
  }

  if (ubicacionId) {
    constraints.push(where('ubicacionActual.id', '==', ubicacionId));
  }

  constraints.push(orderBy(orderByField, orderDirection));
  constraints.push(limit(pageSize + 1));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, EQUIPOS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, -1) : snapshot.docs;

  const items = docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Equipo[];

  return {
    items,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getEquipoById(equipoId: string): Promise<Equipo | null> {
  const docRef = doc(db, EQUIPOS_COLLECTION, equipoId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Equipo;
}

export async function getEquipoByCodigoInterno(codigo: string): Promise<Equipo | null> {
  const q = query(
    collection(db, EQUIPOS_COLLECTION),
    where('codigoInterno', '==', codigo),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Equipo;
}

export async function getEquiposByAutobus(autobusId: string): Promise<Equipo[]> {
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

export async function getEquiposByUbicacion(ubicacionId: string): Promise<Equipo[]> {
  const q = query(
    collection(db, EQUIPOS_COLLECTION),
    where('ubicacionActual.tipo', '==', 'ubicacion'),
    where('ubicacionActual.id', '==', ubicacionId),
    orderBy('codigoInterno', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Equipo[];
}

export async function searchEquipos(
  searchTerm: string,
  limitResults: number = 10
): Promise<Equipo[]> {
  // Búsqueda por código interno o número de serie
  const searchLower = searchTerm.toLowerCase();

  // Buscar por código interno (prefijo)
  const qCodigo = query(
    collection(db, EQUIPOS_COLLECTION),
    where('codigoInterno', '>=', searchTerm.toUpperCase()),
    where('codigoInterno', '<=', searchTerm.toUpperCase() + '\uf8ff'),
    limit(limitResults)
  );

  // Buscar por número de serie
  const qSerie = query(
    collection(db, EQUIPOS_COLLECTION),
    where('numeroSerieFabricante', '>=', searchTerm),
    where('numeroSerieFabricante', '<=', searchTerm + '\uf8ff'),
    limit(limitResults)
  );

  const [snapCodigo, snapSerie] = await Promise.all([
    getDocs(qCodigo),
    getDocs(qSerie),
  ]);

  const resultsMap = new Map<string, Equipo>();

  snapCodigo.docs.forEach((d) => {
    resultsMap.set(d.id, { id: d.id, ...d.data() } as Equipo);
  });

  snapSerie.docs.forEach((d) => {
    if (!resultsMap.has(d.id)) {
      resultsMap.set(d.id, { id: d.id, ...d.data() } as Equipo);
    }
  });

  return Array.from(resultsMap.values()).slice(0, limitResults);
}

// ============================================
// EQUIPOS - CRUD
// ============================================

export async function generateCodigoInterno(tipoEquipoCodigo: string): Promise<string> {
  // Obtener el último código del tipo
  const q = query(
    collection(db, EQUIPOS_COLLECTION),
    where('codigoInterno', '>=', tipoEquipoCodigo + '-'),
    where('codigoInterno', '<=', tipoEquipoCodigo + '-\uf8ff'),
    orderBy('codigoInterno', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);

  let nextNumber = 1;
  if (!snapshot.empty) {
    const lastCodigo = snapshot.docs[0].data().codigoInterno as string;
    const parts = lastCodigo.split('-');
    if (parts.length === 2) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }

  return `${tipoEquipoCodigo}-${nextNumber.toString().padStart(6, '0')}`;
}

export async function createEquipo(
  data: Omit<EquipoFormData, 'codigoInterno'>,
  tipoEquipoCodigo: string
): Promise<string> {
  const codigoInterno = await generateCodigoInterno(tipoEquipoCodigo);

  const searchTerms = [
    codigoInterno.toLowerCase(),
    data.tipoEquipoNombre?.toLowerCase() || '',
    data.numeroSerieFabricante?.toLowerCase() || '',
    data.caracteristicas?.marca?.toLowerCase() || '',
    data.caracteristicas?.modelo?.toLowerCase() || '',
  ].filter(Boolean);

  const equipo = {
    ...data,
    codigoInterno,
    searchTerms,
    estadisticas: {
      totalAverias: 0,
      totalMovimientos: 0,
      diasEnServicio: 0,
    },
    auditoria: {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };

  const docRef = await addDoc(collection(db, EQUIPOS_COLLECTION), equipo);
  return docRef.id;
}

export async function updateEquipo(
  equipoId: string,
  data: Partial<Equipo>
): Promise<void> {
  const docRef = doc(db, EQUIPOS_COLLECTION, equipoId);

  const updateData = {
    ...data,
    'auditoria.updatedAt': serverTimestamp(),
  };

  // Actualizar searchTerms si se modifican campos relevantes
  if (data.numeroSerieFabricante || data.caracteristicas) {
    const currentDoc = await getDoc(docRef);
    if (currentDoc.exists()) {
      const current = currentDoc.data() as Equipo;
      const searchTerms = [
        current.codigoInterno.toLowerCase(),
        current.tipoEquipoNombre?.toLowerCase() || '',
        (data.numeroSerieFabricante || current.numeroSerieFabricante)?.toLowerCase() || '',
        (data.caracteristicas?.marca || current.caracteristicas?.marca)?.toLowerCase() || '',
        (data.caracteristicas?.modelo || current.caracteristicas?.modelo)?.toLowerCase() || '',
      ].filter(Boolean);
      (updateData as Record<string, unknown>).searchTerms = searchTerms;
    }
  }

  await updateDoc(docRef, updateData);
}

export async function cambiarEstadoEquipo(
  equipoId: string,
  nuevoEstado: EstadoEquipo
): Promise<void> {
  await updateEquipo(equipoId, { estado: nuevoEstado });
}

export async function darDeBajaEquipo(
  equipoId: string,
  motivo: string,
  userId: string
): Promise<void> {
  const batch = writeBatch(db);

  // Actualizar equipo
  const equipoRef = doc(db, EQUIPOS_COLLECTION, equipoId);
  batch.update(equipoRef, {
    estado: ESTADOS_EQUIPO.BAJA,
    'fechas.baja': serverTimestamp(),
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.actualizadoPor': userId,
  });

  // Registrar movimiento de baja
  const movRef = doc(collection(db, MOVIMIENTOS_COLLECTION));
  const equipoSnap = await getDoc(equipoRef);
  const equipo = equipoSnap.data() as Equipo;

  batch.set(movRef, {
    equipoId,
    equipoCodigoInterno: equipo.codigoInterno,
    fecha: serverTimestamp(),
    origen: equipo.ubicacionActual,
    destino: {
      tipo: 'ubicacion',
      id: 'baja',
      nombre: 'Dado de baja',
    },
    tipoMovimiento: 'baja',
    motivo,
    auditoria: {
      creadoPor: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  });

  await batch.commit();
}

// ============================================
// MOVIMIENTOS
// ============================================

export async function getMovimientosEquipo(
  equipoId: string,
  limitResults: number = 50
): Promise<MovimientoEquipo[]> {
  const q = query(
    collection(db, MOVIMIENTOS_COLLECTION),
    where('equipoId', '==', equipoId),
    orderBy('fecha', 'desc'),
    limit(limitResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MovimientoEquipo[];
}

export async function registrarMovimientoEquipo(
  data: MovimientoEquipoFormData,
  userId: string
): Promise<string> {
  const batch = writeBatch(db);

  // Crear movimiento
  const movRef = doc(collection(db, MOVIMIENTOS_COLLECTION));
  batch.set(movRef, {
    ...data,
    auditoria: {
      creadoPor: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  });

  // Actualizar ubicación del equipo
  const equipoRef = doc(db, EQUIPOS_COLLECTION, data.equipoId);
  
  const nuevoEstado = determinarEstadoPorUbicacion(data.destino.tipo);

  batch.update(equipoRef, {
    ubicacionActual: data.destino,
    estado: nuevoEstado,
    'estadisticas.totalMovimientos': increment(1),
    'auditoria.updatedAt': serverTimestamp(),
    'auditoria.actualizadoPor': userId,
    ...(data.destino.tipo === 'autobus'
      ? { 'fechas.instalacionActual': serverTimestamp() }
      : {}),
  });

  await batch.commit();
  return movRef.id;
}

export async function moverEquipo(
  equipoId: string,
  destino: UbicacionActualEquipo,
  tipoMovimiento: MovimientoEquipoFormData['tipoMovimiento'],
  motivo: string,
  userId: string,
  opciones?: {
    incidenciaId?: string;
    otId?: string;
    tecnicosIds?: string[];
    comentarios?: string;
  }
): Promise<string> {
  // Obtener equipo actual
  const equipo = await getEquipoById(equipoId);
  if (!equipo) {
    throw new Error('Equipo no encontrado');
  }

  // Validar posición única si es autobús
  if (destino.tipo === 'autobus' && destino.posicionEnBus) {
    const equiposEnBus = await getEquiposByAutobus(destino.id);
    const posicionOcupada = equiposEnBus.find(
      (e) =>
        e.id !== equipoId &&
        e.ubicacionActual.posicionEnBus === destino.posicionEnBus
    );
    if (posicionOcupada) {
      throw new Error(
        `La posición ${destino.posicionEnBus} ya está ocupada por ${posicionOcupada.codigoInterno}`
      );
    }
  }

  const movimientoData: MovimientoEquipoFormData = {
    equipoId,
    equipoCodigoInterno: equipo.codigoInterno,
    fecha: Timestamp.now(),
    origen: equipo.ubicacionActual,
    destino,
    tipoMovimiento,
    motivo,
    incidenciaId: opciones?.incidenciaId,
    otId: opciones?.otId,
    tecnicosIds: opciones?.tecnicosIds,
    comentarios: opciones?.comentarios,
  };

  return registrarMovimientoEquipo(movimientoData, userId);
}

function determinarEstadoPorUbicacion(
  tipoUbicacion: UbicacionActualEquipo['tipo']
): EstadoEquipo {
  switch (tipoUbicacion) {
    case 'autobus':
      return ESTADOS_EQUIPO.EN_SERVICIO;
    case 'ubicacion':
      return ESTADOS_EQUIPO.EN_ALMACEN;
    case 'laboratorio':
      return ESTADOS_EQUIPO.EN_LABORATORIO;
    default:
      return ESTADOS_EQUIPO.EN_ALMACEN;
  }
}

// ============================================
// ESTADÍSTICAS
// ============================================

export interface ResumenEquipos {
  total: number;
  porEstado: Record<EstadoEquipo, number>;
  porTipo: Record<string, number>;
  enServicio: number;
  enAlmacen: number;
  enLaboratorio: number;
  averiados: number;
  bajas: number;
}

export async function getResumenEquipos(): Promise<ResumenEquipos> {
  const q = query(collection(db, EQUIPOS_COLLECTION));
  const snapshot = await getDocs(q);

  const resumen: ResumenEquipos = {
    total: 0,
    porEstado: {
      en_servicio: 0,
      en_almacen: 0,
      en_laboratorio: 0,
      averiado: 0,
      baja: 0,
    },
    porTipo: {},
    enServicio: 0,
    enAlmacen: 0,
    enLaboratorio: 0,
    averiados: 0,
    bajas: 0,
  };

  snapshot.docs.forEach((d) => {
    const equipo = d.data() as Equipo;
    resumen.total++;
    
    // Por estado
    if (resumen.porEstado[equipo.estado] !== undefined) {
      resumen.porEstado[equipo.estado]++;
    }

    // Por tipo
    const tipoNombre = equipo.tipoEquipoNombre || 'Sin tipo';
    resumen.porTipo[tipoNombre] = (resumen.porTipo[tipoNombre] || 0) + 1;
  });

  resumen.enServicio = resumen.porEstado.en_servicio;
  resumen.enAlmacen = resumen.porEstado.en_almacen;
  resumen.enLaboratorio = resumen.porEstado.en_laboratorio;
  resumen.averiados = resumen.porEstado.averiado;
  resumen.bajas = resumen.porEstado.baja;

  return resumen;
}

// ============================================
// VERIFICACIONES
// ============================================

export async function verificarPosicionDisponible(
  autobusId: string,
  posicion: string,
  excludeEquipoId?: string
): Promise<boolean> {
  const equiposEnBus = await getEquiposByAutobus(autobusId);
  return !equiposEnBus.some(
    (e) =>
      e.ubicacionActual.posicionEnBus === posicion &&
      e.id !== excludeEquipoId
  );
}

export async function getEquiposDisponiblesParaInstalacion(
  tipoEquipoId?: string
): Promise<Equipo[]> {
  const constraints: QueryConstraint[] = [
    where('estado', '==', ESTADOS_EQUIPO.EN_ALMACEN),
    orderBy('codigoInterno', 'asc'),
  ];

  if (tipoEquipoId) {
    constraints.unshift(where('tipoEquipoId', '==', tipoEquipoId));
  }

  const q = query(collection(db, EQUIPOS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Equipo[];
}
