'use client';

import { useMemo } from 'react';
import { useIncidencias } from './useIncidencias';
import { useAutobuses } from './useAutobuses';
import { useTenantId } from '@/contexts/OperadorContext';
import type { Incidencia, Autobus, EstadoIncidencia } from '@/types';

// Importar lógica pura de SLA
import {
  calcularVencimientoSLA,
  verificarEstadoSLA,
} from '@/lib/logic/sla';

// =============================================================================
// TIPOS
// =============================================================================

export interface IncidenciaSLAEnRiesgo {
  id: string;
  codigo: string;
  categoriaFallo: string;
  criticidad: 'critica' | 'normal';
  tiempoRestante: number; // minutos
  vencimiento: Date;
  estado: EstadoIncidencia;
}

export interface MetricasDashboard {
  // KPIs principales
  disponibilidadFlota: number;        // % de autobuses operativos
  incidenciasActivas: number;         // Total de incidencias abiertas
  incidenciasCriticas: number;        // Incidencias con criticidad 'critica'
  cumplimientoSLA: number;            // % de incidencias dentro de SLA
  
  // Detalle flota
  flotaTotal: number;
  flotaOperativa: number;
  flotaEnTaller: number;
  flotaDeBaja: number;
  
  // SLA en riesgo (vencen en < 2 horas)
  slaEnRiesgo: IncidenciaSLAEnRiesgo[];
  
  // Estado de carga
  loading: boolean;
  error: string | null;
}

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Convierte un Timestamp de Firestore a Date.
 */
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp === 'number') return new Date(timestamp);
  return null;
}

/**
 * Calcula el tiempo restante en minutos para el SLA de una incidencia.
 */
function calcularTiempoRestanteSLA(incidencia: Incidencia): number | null {
  const fechaRecepcion = toDate(incidencia.timestamps?.recepcion);
  if (!fechaRecepcion || !incidencia.criticidad) return null;
  
  const ahora = new Date();
  
  // Calcular vencimiento usando lógica pura
  const vencimiento = calcularVencimientoSLA(
    fechaRecepcion,
    incidencia.criticidad,
    'resolucion'
  );
  
  // Calcular diferencia en minutos
  const diffMs = vencimiento.getTime() - ahora.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Verifica si una incidencia está dentro del SLA.
 */
function estaDentroSLA(incidencia: Incidencia): boolean {
  const fechaRecepcion = toDate(incidencia.timestamps?.recepcion);
  if (!fechaRecepcion || !incidencia.criticidad) return true; // Sin datos, asumimos ok
  
  const ahora = new Date();
  const resultado = verificarEstadoSLA(
    fechaRecepcion,
    ahora,
    incidencia.criticidad
  );
  
  return resultado.dentroSLA;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook que orquesta los datos del dashboard.
 * Combina datos de incidencias, autobuses y cálculos SLA.
 * 
 * @example
 * ```tsx
 * const { disponibilidadFlota, slaEnRiesgo, loading } = useDashboardMetrics();
 * ```
 */
export function useDashboardMetrics(): MetricasDashboard {
  const tenantId = useTenantId();
  
  // Cargar incidencias activas (no cerradas)
  const { 
    incidencias, 
    loading: loadingIncidencias, 
    error: errorIncidencias 
  } = useIncidencias({
    estado: ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'],
    pageSize: 100,
  });
  
  // Cargar autobuses
  const { 
    autobuses, 
    loading: loadingAutobuses, 
    error: errorAutobuses 
  } = useAutobuses({
    pageSize: 200,
  });
  
  // Calcular métricas (memoizado para performance)
  const metricas = useMemo(() => {
    // --- Métricas de flota ---
    const flotaTotal = autobuses.length;
    const flotaOperativa = autobuses.filter(a => a.estado === 'operativo').length;
    const flotaEnTaller = autobuses.filter(a => a.estado === 'en_taller').length;
    const flotaDeBaja = autobuses.filter(a => a.estado === 'baja').length;
    
    const disponibilidadFlota = flotaTotal > 0 
      ? Math.round((flotaOperativa / flotaTotal) * 100) 
      : 0;
    
    // --- Métricas de incidencias ---
    const incidenciasActivas = incidencias.length;
    const incidenciasCriticas = incidencias.filter(i => i.criticidad === 'critica').length;
    
    // Calcular cumplimiento SLA
    const incidenciasConSLA = incidencias.filter(i => i.timestamps?.recepcion && i.criticidad);
    const dentroSLA = incidenciasConSLA.filter(i => estaDentroSLA(i)).length;
    const cumplimientoSLA = incidenciasConSLA.length > 0
      ? Math.round((dentroSLA / incidenciasConSLA.length) * 100)
      : 100;
    
    // --- SLA en riesgo (< 2 horas) ---
    const UMBRAL_RIESGO_MINUTOS = 120; // 2 horas
    
    const slaEnRiesgoItems = incidencias
      .map(inc => {
        const tiempoRestante = calcularTiempoRestanteSLA(inc);
        if (tiempoRestante === null) return null;
        
        const fechaRecepcion = toDate(inc.timestamps?.recepcion);
        if (!fechaRecepcion) return null;
        
        const vencimiento = calcularVencimientoSLA(
          fechaRecepcion,
          inc.criticidad!,
          'resolucion'
        );
        
        return {
          id: inc.id,
          codigo: inc.codigo,
          categoriaFallo: inc.categoriaFallo || 'Sin categoría',
          criticidad: inc.criticidad as 'critica' | 'normal',
          tiempoRestante,
          vencimiento,
          estado: inc.estado,
        };
      })
      .filter((item): item is IncidenciaSLAEnRiesgo => 
        item !== null && item.tiempoRestante < UMBRAL_RIESGO_MINUTOS
      );
    
    // Ordenar por urgencia
    const slaEnRiesgo = slaEnRiesgoItems.sort((a, b) => a.tiempoRestante - b.tiempoRestante);
    
    return {
      disponibilidadFlota,
      incidenciasActivas,
      incidenciasCriticas,
      cumplimientoSLA,
      flotaTotal,
      flotaOperativa,
      flotaEnTaller,
      flotaDeBaja,
      slaEnRiesgo,
    };
  }, [incidencias, autobuses]);
  
  return {
    ...metricas,
    loading: loadingIncidencias || loadingAutobuses,
    error: errorIncidencias || errorAutobuses,
  };
}

// =============================================================================
// HOOK PARA MÉTRICAS DE UN OPERADOR ESPECÍFICO (para DFG)
// =============================================================================

export interface MetricasOperador extends MetricasDashboard {
  operadorId: string;
  operadorNombre?: string;
}

/**
 * Hook para obtener métricas de un operador específico.
 * Útil para el rol DFG que supervisa múltiples operadores.
 */
export function useDashboardMetricsOperador(operadorId: string): MetricasDashboard {
  // Cargar incidencias del operador
  const { 
    incidencias, 
    loading: loadingIncidencias, 
    error: errorIncidencias 
  } = useIncidencias({
    estado: ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'],
    operadorId,
    pageSize: 100,
  });
  
  // Cargar autobuses del operador
  const { 
    autobuses, 
    loading: loadingAutobuses, 
    error: errorAutobuses 
  } = useAutobuses({
    operadorId,
    pageSize: 200,
  });
  
  // Reutilizar la misma lógica de cálculo
  const metricas = useMemo(() => {
    const flotaTotal = autobuses.length;
    const flotaOperativa = autobuses.filter(a => a.estado === 'operativo').length;
    const flotaEnTaller = autobuses.filter(a => a.estado === 'en_taller').length;
    const flotaDeBaja = autobuses.filter(a => a.estado === 'baja').length;
    
    const disponibilidadFlota = flotaTotal > 0 
      ? Math.round((flotaOperativa / flotaTotal) * 100) 
      : 0;
    
    const incidenciasActivas = incidencias.length;
    const incidenciasCriticas = incidencias.filter(i => i.criticidad === 'critica').length;
    
    const incidenciasConSLA = incidencias.filter(i => i.timestamps?.recepcion && i.criticidad);
    const dentroSLA = incidenciasConSLA.filter(i => estaDentroSLA(i)).length;
    const cumplimientoSLA = incidenciasConSLA.length > 0
      ? Math.round((dentroSLA / incidenciasConSLA.length) * 100)
      : 100;
    
    const UMBRAL_RIESGO_MINUTOS = 120;
    
    const slaEnRiesgoItems = incidencias
      .map(inc => {
        const tiempoRestante = calcularTiempoRestanteSLA(inc);
        if (tiempoRestante === null) return null;
        
        const fechaRecepcion = toDate(inc.timestamps?.recepcion);
        if (!fechaRecepcion) return null;
        
        const vencimiento = calcularVencimientoSLA(
          fechaRecepcion,
          inc.criticidad!,
          'resolucion'
        );
        
        return {
          id: inc.id,
          codigo: inc.codigo,
          categoriaFallo: inc.categoriaFallo || 'Sin categoría',
          criticidad: inc.criticidad as 'critica' | 'normal',
          tiempoRestante,
          vencimiento,
          estado: inc.estado,
        };
      })
      .filter((item): item is IncidenciaSLAEnRiesgo => 
        item !== null && item.tiempoRestante < UMBRAL_RIESGO_MINUTOS
      );
    
    const slaEnRiesgo = slaEnRiesgoItems.sort((a, b) => a.tiempoRestante - b.tiempoRestante);
    
    return {
      disponibilidadFlota,
      incidenciasActivas,
      incidenciasCriticas,
      cumplimientoSLA,
      flotaTotal,
      flotaOperativa,
      flotaEnTaller,
      flotaDeBaja,
      slaEnRiesgo,
    };
  }, [incidencias, autobuses]);
  
  return {
    ...metricas,
    loading: loadingIncidencias || loadingAutobuses,
    error: errorIncidencias || errorAutobuses,
  };
}
