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
  /** Operador actual (para usuarios normales es su tenant, para DFG/Admin es el seleccionado) */
  operadorActual: Tenant | null;
  /** ID del operador actual */
  operadorActualId: string | null;
  /** Lista de operadores disponibles (solo roles supervisores ven todos) */
  operadores: Tenant[];
  /** True si el usuario puede cambiar de operador (DFG o Admin) */
  puedeSeleccionarOperador: boolean;
  /** Cambia el operador seleccionado (solo DFG/Admin) */
  seleccionarOperador: (operadorId: string) => void;
  /** Limpia la selección (solo DFG/Admin) */
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
  const { claims, loading: authLoading, isDFG, hasRole } = useAuth();
  
  const [operadores, setOperadores] = useState<Tenant[]>([]);
  const [operadorSeleccionadoId, setOperadorSeleccionadoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Roles que pueden seleccionar operador: DFG (solo lectura) y Admin (gestión global)
  const esRolSupervisor = isDFG() || hasRole('admin');
  const puedeSeleccionarOperador = esRolSupervisor;

  // Cargar operadores al iniciar (si es rol supervisor: DFG o Admin)
  useEffect(() => {
    if (authLoading) return;

    async function cargarOperadores() {
      if (!esRolSupervisor) {
        // Usuario normal: no necesita lista, su operador es su tenantId
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
  }, [authLoading, esRolSupervisor]);

  // Determinar operador actual
  const operadorActualId = esRolSupervisor ? operadorSeleccionadoId : (claims?.tenantId ?? null);
  const operadorActual = esRolSupervisor
    ? operadores.find((op) => op.id === operadorSeleccionadoId) ?? null
    : null; // Para usuarios normales, el contexto no carga su propio Tenant (ya está en claims)

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
 * 
 * - Si el usuario es DFG/Admin: devuelve el operador seleccionado
 * - Si el usuario es de otro rol: devuelve su tenantId del claim
 */
export function useTenantId(): string | null {
  const { claims } = useAuth();
  const { operadorActualId, puedeSeleccionarOperador } = useOperadorContext();

  // Si es rol supervisor (DFG/Admin), usa el operador seleccionado; si no, usa su tenantId
  return puedeSeleccionarOperador ? operadorActualId : (claims?.tenantId ?? null);
}
