import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Tenant } from '@/types';
import { FirestoreServiceError } from '@/lib/firebase/services/errors';

/**
 * OperadoresService
 *
 * Nota de diseño: en el esquema actual del proyecto, los "operadores" están modelados
 * como `tenants` (colección raíz). Por compatibilidad, este servicio opera sobre `Tenant`.
 */
export class OperadoresService {
  constructor(private readonly db: Firestore) {}

  private col() {
    return collection(this.db, 'tenants');
  }

  private ref(id: string) {
    return doc(this.db, 'tenants', id);
  }

  async list(): Promise<Tenant[]> {
    try {
      const q = query(this.col(), orderBy('nombre', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Tenant[];
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error listando operadores', err);
    }
  }

  async listActivos(): Promise<Tenant[]> {
    try {
      const q = query(this.col(), where('activo', '==', true), orderBy('nombre', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Tenant[];
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error listando operadores activos', err);
    }
  }

  async getById(id: string): Promise<Tenant | null> {
    try {
      const snap = await getDoc(this.ref(id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as any) } as Tenant;
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error obteniendo operador', err);
    }
  }

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(this.col(), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error creando operador', err);
    }
  }

  async createWithId(id: string, data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      await setDoc(this.ref(id), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error creando operador con ID', err);
    }
  }

  async update(id: string, patch: Partial<Tenant>): Promise<void> {
    try {
      await updateDoc(this.ref(id), {
        ...patch,
        updatedAt: serverTimestamp(),
      } as any);
    } catch (err) {
      throw new FirestoreServiceError('unknown', 'Error actualizando operador', err);
    }
  }
}
