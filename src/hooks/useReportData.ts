'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Incidencia, Autobus } from '@/types';

// =============================================================================
// TIPOS
// =============================================================================

export interface FiltrosReporte {
  fechaDesde: Date;
  fechaHasta: Date;
  operadorId?: string;       // Para DFG que puede ver múltiples operadores
  incluirCerradas?: boolean; // Por defecto true para informes históricos
}

export interface DatosReporte {
  incidencias: Incidencia[];
  autobuses: Autobus[];
  loading: boolean;
  error: string | null;
}

export interface UseReportDataResult extends DatosReporte {
  cargarDatos: (filtros: FiltrosReporte) => Promise<void>;
  limpiar: () => void;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para cargar datos de informes.
 * 
 * A diferencia de useDashboardMetrics (optimizado para tiempo real),
 * este hook permite cargar volúmenes mayores de datos históricos
 * con filtros de fecha.
 * 
 * @example
 * ```tsx
 * const { incidencias, autobuses, loading, cargarDatos } = useReportData();
 * 
 * const handleGenerar = async () => {
 *   await cargarDatos({
 *     fechaDesde: new Date('2026-01-01'),
 *     fechaHasta: new Date('2026-01-31'),
 *   });
 * };
 * ```
 */
export function useReportData(): UseReportDataResult {
  const tenantId = useTenantId();
  const { user, canAccessAllTenants } = useAuth();

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [autobuses, setAutobuses] = useState<Autobus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = useCallback(async (filtros: FiltrosReporte) => {
    // Determinar qué tenant usar
    const targetTenantId = filtros.operadorId || tenantId;
    
    if (!targetTenantId) {
      setError('No se ha seleccionado un operador');
      return;
    }

    // Verificar que el usuario puede acceder al tenant
    if (filtros.operadorId && !canAccessAllTenants) {
      setError('No tienes permisos para ver datos de otros operadores');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convertir fechas a Timestamps de Firestore
      const fechaDesdeTs = Timestamp.fromDate(filtros.fechaDesde);
      const fechaHastaTs = Timestamp.fromDate(filtros.fechaHasta);

      // === Cargar Incidencias ===
      const incidenciasRef = collection(db, `tenants/${targetTenantId}/incidencias`);
      
      // Query con filtro de fecha (por timestamps.recepcion)
      const incidenciasQuery = query(
        incidenciasRef,
        where('timestamps.recepcion', '>=', fechaDesdeTs),
        where('timestamps.recepcion', '<=', fechaHastaTs),
        orderBy('timestamps.recepcion', 'desc')
      );

      const incidenciasSnap = await getDocs(incidenciasQuery);
      const incidenciasData: Incidencia[] = incidenciasSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Incidencia));

      // === Cargar Autobuses ===
      const autobusesRef = collection(db, `tenants/${targetTenantId}/autobuses`);
      const autobusesQuery = query(autobusesRef, orderBy('codigo', 'asc'));
      const autobusesSnap = await getDocs(autobusesQuery);
      const autobusesData: Autobus[] = autobusesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Autobus));

      setIncidencias(incidenciasData);
      setAutobuses(autobusesData);

    } catch (err: any) {
      console.error('Error cargando datos del reporte:', err);
      
      // Manejar error de índice faltante
      if (err?.code === 'failed-precondition' && err?.message?.includes('index')) {
        setError('Se requiere crear un índice en Firestore. Por favor contacta al administrador.');
      } else {
        setError('Error al cargar datos para el informe');
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, canAccessAllTenants]);

  const limpiar = useCallback(() => {
    setIncidencias([]);
    setAutobuses([]);
    setError(null);
  }, []);

  return {
    incidencias,
    autobuses,
    loading,
    error,
    cargarDatos,
    limpiar,
  };
}

// =============================================================================
// HOOK PARA LISTAR OPERADORES (para selector DFG)
// =============================================================================

export interface Operador {
  id: string;
  nombre: string;
  codigo: string;
}

export interface UseOperadoresListResult {
  operadores: Operador[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook para cargar lista de operadores (para selector de DFG).
 */
export function useOperadoresList(): UseOperadoresListResult {
  const { canAccessAllTenants } = useAuth();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar operadores solo si tiene permisos multi-tenant
  useState(() => {
    if (!canAccessAllTenants) return;

    const cargar = async () => {
      try {
        setLoading(true);
        const operadoresRef = collection(db, 'tenants');
        const snap = await getDocs(operadoresRef);
        
        const data: Operador[] = snap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre || doc.id,
          codigo: doc.data().codigo || doc.id,
        }));
        
        setOperadores(data);
      } catch (err) {
        console.error('Error cargando operadores:', err);
        setError('Error al cargar lista de operadores');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  });

  return { operadores, loading, error };
}
