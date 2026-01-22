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
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Inventario,
  InventarioFormData,
  MovimientoInventario,
  EstadoInventario,
} from '@/types';

const COLLECTION_NAME = 'inventario';

export interface GetInventarioParams {
  tenantId: string;
  estado?: EstadoInventario | EstadoInventario[];
  categoria?: string;
  tipo?: 'componente' | 'repuesto' | 'consumible';
  busqueda?: string;
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export interface GetInventarioResult {
  items: Inventario[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function getInventario(
  params: GetInventarioParams
): Promise<GetInventarioResult> {
  const {
    tenantId,
    estado,
    categoria,
    tipo,
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

  if (categoria) {
    constraints.push(where('categoria', '==', categoria));
  }

  if (tipo) {
    constraints.push(where('tipo', '==', tipo));
  }

  constraints.push(orderBy('sku', 'asc'));
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

  const items = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Inventario[];

  return {
    items,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

export async function getInventarioById(
  tenantId: string,
  itemId: string
): Promise<Inventario | null> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, itemId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as Inventario;
}

export async function createInventario(
  tenantId: string,
  data: InventarioFormData
): Promise<string> {
  const inventario = {
    ...data,
    historialMovimientos: [],
    ultimoMovimiento: serverTimestamp(),
    tenantId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    inventario
  );

  return docRef.id;
}

export async function updateInventario(
  tenantId: string,
  itemId: string,
  data: Partial<Inventario>
): Promise<void> {
  const docRef = doc(db, `tenants/${tenantId}/${COLLECTION_NAME}`, itemId);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function registrarMovimiento(
  tenantId: string,
  itemId: string,
  movimiento: Omit<MovimientoInventario, 'id' | 'createdAt'>
): Promise<string> {
  // Crear movimiento en subcolección
  const movRef = await addDoc(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}/${itemId}/movimientos`),
    {
      ...movimiento,
      createdAt: serverTimestamp(),
    }
  );

  // Actualizar estado del item
  const nuevoEstado = determinarEstadoPorMovimiento(movimiento.tipo);

  const updateData: Partial<Inventario> = {
    ultimoMovimiento: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  if (nuevoEstado) {
    updateData.estado = nuevoEstado;
    updateData.ubicacion = {
      tipo: movimiento.destinoTipo,
      referenciaId: movimiento.destinoId,
      descripcion: movimiento.destinoDescripcion,
    };
  }

  await updateInventario(tenantId, itemId, updateData);

  return movRef.id;
}

function determinarEstadoPorMovimiento(
  tipoMovimiento: MovimientoInventario['tipo']
): EstadoInventario | null {
  switch (tipoMovimiento) {
    case 'instalacion':
      return 'instalado';
    case 'desinstalacion':
    case 'entrada':
    case 'reparacion_retorno':
      return 'almacen';
    case 'reparacion_envio':
      return 'reparacion';
    default:
      return null;
  }
}

export async function getMovimientosInventario(
  tenantId: string,
  itemId: string,
  pageSize = 20
): Promise<MovimientoInventario[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}/${itemId}/movimientos`),
    orderBy('fecha', 'desc'),
    limit(pageSize)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MovimientoInventario[];
}

// Resumen de inventario para dashboard
export interface ResumenInventario {
  total: number;
  porEstado: Record<EstadoInventario, number>;
  porCategoria: Record<string, number>;
  alertasStockBajo: number;
}

export async function getResumenInventario(
  tenantId: string
): Promise<ResumenInventario> {
  const snapshot = await getDocs(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`)
  );

  const items = snapshot.docs.map((doc) => doc.data() as Inventario);

  const porEstado: Record<EstadoInventario, number> = {
    instalado: 0,
    almacen: 0,
    reparacion: 0,
    baja: 0,
  };

  const porCategoria: Record<string, number> = {};
  let alertasStockBajo = 0;

  items.forEach((item) => {
    porEstado[item.estado]++;

    if (!porCategoria[item.categoria]) {
      porCategoria[item.categoria] = 0;
    }
    porCategoria[item.categoria]++;

    if (
      item.cantidadMinima &&
      item.cantidadDisponible !== undefined &&
      item.cantidadDisponible < item.cantidadMinima
    ) {
      alertasStockBajo++;
    }
  });

  return {
    total: items.length,
    porEstado,
    porCategoria,
    alertasStockBajo,
  };
}

export async function getInventarioPorActivo(
  tenantId: string,
  activoId: string
): Promise<Inventario[]> {
  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('estado', '==', 'instalado'),
    where('ubicacion.referenciaId', '==', activoId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Inventario[];
}

export async function buscarInventario(
  tenantId: string,
  termino: string
): Promise<Inventario[]> {
  // Firestore no soporta búsqueda full-text nativa
  // Búsqueda simple por SKU (exacta o prefijo)
  const q = query(
    collection(db, `tenants/${tenantId}/${COLLECTION_NAME}`),
    where('sku', '>=', termino.toUpperCase()),
    where('sku', '<=', termino.toUpperCase() + '\uf8ff'),
    limit(20)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Inventario[];
}
