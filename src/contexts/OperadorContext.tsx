'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { OperadoresService } from '@/lib/firebase/services';
import type { Tenant } from '@/types';

// ============================================
// TIPOS
// ============================================

interface OperadorContextType {
  /** Operador actual (para operadores es su tenant, para WINFIN es el seleccionado) */
  operadorActual: Tenant | null;
  /** ID del operador actual */
  operadorActualId: string | null;
  /** Lista de operadores disponibles (solo WINFIN ve todos) */
  operadores: Tenant[];
  /** True si el usuario es WINFIN y puede cambiar de operador */
  puedeSeleccionarOperador: boolean;
  /** Cambia el operador seleccionado (solo WINFIN) */
  seleccionarOperador: (operadorId: string) => void;
  /** Limpia la selección (solo WINFIN) */
  limpiarSeleccion: () => void;
  /** Loading mientras carga operadores */
  loading: boolean;
  /** Error si falla la carga */
  error: string | null;
}

// ============================================
// CONTEXTO
// ============================================

const OperadorContext = createContext<OperadorContextType | undefined>(undefined);

const STORAGE_KEY = 'zaintzabus_operador_seleccionado';

export function OperadorProvider({ children }: { children: React.ReactNode }) {
  const { claims, loading: authLoading, isDFG } = useAuth();
  
  const [operadores, setOperadores] = useState<Tenant[]>([]);
  const [operadorSeleccionadoId, setOperadorSeleccionadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const esWinfin = isDFG();
  const puedeSeleccionarOperador = esWinfin;

  // Cargar operadores al iniciar (si es WINFIN)
  useEffect(() => {
    if (authLoading) return;

    async function cargarOperadores() {
      if (!esWinfin) {
        // Usuario operador: no necesita lista, su operador es su tenantId
        setOperadores([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const service = new OperadoresService(db);
        const lista = await service.listActivos();
        setOperadores(lista);

        // Restaurar selección previa de localStorage
        const savedId = localStorage.getItem(STORAGE_KEY);
        if (savedId && lista.some((op) => op.id === savedId)) {
          setOperadorSeleccionadoId(savedId);
        } else if (lista.length > 0) {
          // Seleccionar el primero por defecto
          setOperadorSeleccionadoId(lista[0].id);
        }
      } catch (err) {
        console.error('Error cargando operadores:', err);
        setError('Error al cargar la lista de operadores');
      } finally {
        setLoading(false);
      }
    }

    cargarOperadores();
  }, [authLoading, esWinfin]);

  // Determinar operador actual
  const operadorActualId = esWinfin ? operadorSeleccionadoId : (claims?.tenantId ?? null);
  const operadorActual = esWinfin
    ? operadores.find((op) => op.id === operadorSeleccionadoId) ?? null
    : null; // Para operadores, el contexto no carga su propio Tenant (ya está en claims)

  const seleccionarOperador = useCallback(
    (operadorId: string) => {
      if (!puedeSeleccionarOperador) {
        console.warn('Usuario no puede seleccionar operador');
        return;
      }

      setOperadorSeleccionadoId(operadorId);
      localStorage.setItem(STORAGE_KEY, operadorId);
    },
    [puedeSeleccionarOperador]
  );

  const limpiarSeleccion = useCallback(() => {
    setOperadorSeleccionadoId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: OperadorContextType = {
    operadorActual,
    operadorActualId,
    operadores,
    puedeSeleccionarOperador,
    seleccionarOperador,
    limpiarSeleccion,
    loading,
    error,
  };

  return (
    <OperadorContext.Provider value={value}>
      {children}
    </OperadorContext.Provider>
  );
}

export function useOperadorContext() {
  const context = useContext(OperadorContext);
  if (context === undefined) {
    throw new Error('useOperadorContext must be used within an OperadorProvider');
  }
  return context;
}

/**
 * Hook helper que devuelve el tenantId actual para queries.
 * Útil en hooks de datos para no repetir lógica.
 */
export function useTenantId(): string | null {
  const { claims } = useAuth();
  const { operadorActualId, puedeSeleccionarOperador } = useOperadorContext();

  // DEBUG
  console.log('[useTenantId] claims:', claims, '| puedeSeleccionar:', puedeSeleccionarOperador, '| operadorActualId:', operadorActualId);

  // Si es WINFIN, usa el operador seleccionado; si no, usa su tenantId
  const result = puedeSeleccionarOperador ? operadorActualId : (claims?.tenantId ?? null);
  console.log('[useTenantId] resultado:', result);
  return result;
}
