/**
 * =============================================================================
 * HOOK: useAuditHistory
 * =============================================================================
 * 
 * Hook para consumir el historial de auditoría de una entidad.
 * Proporciona datos en tiempo real y funciones de utilidad.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { getFirestore } from 'firebase/firestore';
import type { AuditLog } from '@/types';
import {
  getAuditService,
  formatearValorAuditoria,
  traducirCampo,
  traducirAccion,
  type TipoEntidad,
  type AuditQueryOptions,
} from '@/lib/firebase/services/audit.service';

export interface UseAuditHistoryOptions extends AuditQueryOptions {
  /** Si true, usa listener en tiempo real */
  realtime?: boolean;
}

export interface UseAuditHistoryReturn {
  /** Lista de logs de auditoría */
  logs: AuditLog[];
  /** Estado de carga */
  loading: boolean;
  /** Error si existe */
  error: string | null;
  /** Recargar manualmente */
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener el historial de auditoría de una entidad específica.
 */
export function useAuditHistory(
  entidadId: string | undefined,
  options: UseAuditHistoryOptions = {}
): UseAuditHistoryReturn {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { realtime = false, limit: maxResults = 50, accion } = options;

  const fetchLogs = useCallback(async () => {
    if (!entidadId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();
      const auditService = getAuditService(db);
      const historial = await auditService.getHistorial(entidadId, { limit: maxResults, accion });
      setLogs(historial);
    } catch (err) {
      console.error('[useAuditHistory] Error cargando historial:', err);
      setError('Error cargando historial de cambios');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entidadId, maxResults, accion]);

  useEffect(() => {
    if (!entidadId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    if (realtime) {
      // Modo realtime con listener
      setLoading(true);
      const db = getFirestore();
      const auditService = getAuditService(db);
      
      const unsubscribe = auditService.listenHistorial(
        entidadId,
        (newLogs) => {
          setLogs(newLogs);
          setLoading(false);
        },
        { limit: maxResults, accion }
      );

      return () => unsubscribe();
    } else {
      // Modo fetch único
      fetchLogs();
    }
  }, [entidadId, realtime, fetchLogs, maxResults, accion]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}

/**
 * Hook para obtener historial por tipo de entidad (para vistas globales).
 */
export function useAuditHistoryByType(
  entidad: TipoEntidad,
  tenantId: string | undefined,
  options: AuditQueryOptions = {}
): UseAuditHistoryReturn {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit: maxResults = 100, accion } = options;

  const fetchLogs = useCallback(async () => {
    if (!tenantId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();
      const auditService = getAuditService(db);
      const historial = await auditService.getHistorialPorTipo(entidad, tenantId, { limit: maxResults, accion });
      setLogs(historial);
    } catch (err) {
      console.error('[useAuditHistoryByType] Error cargando historial:', err);
      setError('Error cargando historial de cambios');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entidad, tenantId, maxResults, accion]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}

// Re-exportar utilidades para uso en componentes
export { formatearValorAuditoria, traducirCampo, traducirAccion };
