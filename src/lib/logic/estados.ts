/**
 * =============================================================================
 * LÓGICA DE ESTADOS Y TRANSICIONES - ZaintzaBus
 * =============================================================================
 * 
 * Funciones PURAS para validar transiciones de estado.
 * Sin dependencias de Firebase ni efectos secundarios.
 * 
 * Centraliza las reglas de negocio de máquinas de estado.
 * =============================================================================
 */

import type { 
  EstadoIncidencia, 
  EstadoInventario, 
  EstadoActivo,
  Rol 
} from '@/types';

// =============================================================================
// TRANSICIONES DE INCIDENCIAS
// =============================================================================

/**
 * Matriz de transiciones válidas para incidencias.
 * Fuente de verdad para la máquina de estados.
 */
export const TRANSICIONES_INCIDENCIA: Record<EstadoIncidencia, EstadoIncidencia[]> = {
  nueva: ['en_analisis', 'cerrada'],
  en_analisis: ['en_intervencion', 'nueva'],
  en_intervencion: ['resuelta', 'en_analisis'],
  resuelta: ['cerrada', 'reabierta'],
  cerrada: ['reabierta'],
  reabierta: ['en_analisis'],
};

/**
 * Roles que pueden realizar cada transición.
 */
export const PERMISOS_TRANSICION_INCIDENCIA: Record<string, Rol[]> = {
  'nueva->en_analisis': ['admin', 'jefe_mantenimiento', 'tecnico'],
  'nueva->cerrada': ['admin', 'jefe_mantenimiento'], // Cerrar sin intervenir (falsa alarma)
  'en_analisis->en_intervencion': ['admin', 'jefe_mantenimiento', 'tecnico'],
  'en_analisis->nueva': ['admin', 'jefe_mantenimiento'], // Devolver para reasignar
  'en_intervencion->resuelta': ['admin', 'jefe_mantenimiento', 'tecnico'],
  'en_intervencion->en_analisis': ['admin', 'jefe_mantenimiento', 'tecnico'], // Requiere más análisis
  'resuelta->cerrada': ['admin', 'jefe_mantenimiento', 'operador'],
  'resuelta->reabierta': ['admin', 'jefe_mantenimiento', 'operador'],
  'cerrada->reabierta': ['admin', 'jefe_mantenimiento'],
  'reabierta->en_analisis': ['admin', 'jefe_mantenimiento', 'tecnico'],
};

/**
 * Verifica si una transición de estado es válida.
 * 
 * @param estadoActual - Estado actual de la incidencia
 * @param estadoNuevo - Estado al que se quiere transicionar
 * @returns true si la transición es válida
 * 
 * @example
 * ```typescript
 * esTransicionValida('nueva', 'en_analisis') // true
 * esTransicionValida('nueva', 'resuelta')    // false
 * ```
 */
export function esTransicionValidaIncidencia(
  estadoActual: EstadoIncidencia,
  estadoNuevo: EstadoIncidencia
): boolean {
  const transicionesPermitidas = TRANSICIONES_INCIDENCIA[estadoActual];
  return transicionesPermitidas?.includes(estadoNuevo) ?? false;
}

/**
 * Obtiene los estados a los que se puede transicionar desde el estado actual.
 * 
 * @param estadoActual - Estado actual
 * @param rol - Rol del usuario (opcional, filtra por permisos)
 * @returns Array de estados posibles
 */
export function obtenerSiguientesEstadosIncidencia(
  estadoActual: EstadoIncidencia,
  rol?: Rol
): EstadoIncidencia[] {
  const transicionesPosibles = TRANSICIONES_INCIDENCIA[estadoActual] || [];
  
  if (!rol) {
    return transicionesPosibles;
  }
  
  // Filtrar por permisos del rol
  return transicionesPosibles.filter(estadoNuevo => {
    const key = `${estadoActual}->${estadoNuevo}`;
    const rolesPermitidos = PERMISOS_TRANSICION_INCIDENCIA[key] || [];
    return rolesPermitidos.includes(rol);
  });
}

/**
 * Verifica si un usuario puede realizar una transición específica.
 */
export function puedeRealizarTransicionIncidencia(
  estadoActual: EstadoIncidencia,
  estadoNuevo: EstadoIncidencia,
  rol: Rol
): boolean {
  // Primero verificar que la transición es válida
  if (!esTransicionValidaIncidencia(estadoActual, estadoNuevo)) {
    return false;
  }
  
  // Luego verificar permisos
  const key = `${estadoActual}->${estadoNuevo}`;
  const rolesPermitidos = PERMISOS_TRANSICION_INCIDENCIA[key] || [];
  return rolesPermitidos.includes(rol);
}

// =============================================================================
// TRANSICIONES DE INVENTARIO/EQUIPOS
// =============================================================================

/**
 * Matriz de transiciones válidas para inventario.
 */
export const TRANSICIONES_INVENTARIO: Record<EstadoInventario, EstadoInventario[]> = {
  instalado: ['almacen', 'reparacion', 'baja'],
  almacen: ['instalado', 'reparacion', 'baja'],
  reparacion: ['almacen', 'baja'], // No puede ir directamente a instalado
  baja: [], // Estado final
};

/**
 * Verifica si una transición de inventario es válida.
 */
export function esTransicionValidaInventario(
  estadoActual: EstadoInventario,
  estadoNuevo: EstadoInventario
): boolean {
  const transicionesPermitidas = TRANSICIONES_INVENTARIO[estadoActual];
  return transicionesPermitidas?.includes(estadoNuevo) ?? false;
}

/**
 * Obtiene los estados a los que puede transicionar un equipo.
 */
export function obtenerSiguientesEstadosInventario(
  estadoActual: EstadoInventario
): EstadoInventario[] {
  return TRANSICIONES_INVENTARIO[estadoActual] || [];
}

/**
 * Valida si un movimiento de equipo es válido.
 * 
 * @param estadoActual - Estado actual del equipo
 * @param tipoDestino - Tipo de destino ('autobus' | 'almacen' | 'proveedor')
 * @returns Objeto con validación y mensaje de error si aplica
 */
export function validarMovimientoEquipo(
  estadoActual: EstadoInventario,
  tipoDestino: 'autobus' | 'almacen' | 'proveedor'
): { valido: boolean; error?: string; estadoResultante: EstadoInventario } {
  // Reglas de negocio para movimientos
  switch (estadoActual) {
    case 'reparacion':
      if (tipoDestino === 'autobus') {
        return {
          valido: false,
          error: 'Un equipo en reparación debe pasar por almacén antes de instalarse',
          estadoResultante: estadoActual,
        };
      }
      if (tipoDestino === 'almacen') {
        return { valido: true, estadoResultante: 'almacen' };
      }
      break;
    
    case 'baja':
      return {
        valido: false,
        error: 'Un equipo dado de baja no puede moverse',
        estadoResultante: 'baja',
      };
    
    case 'almacen':
      if (tipoDestino === 'autobus') {
        return { valido: true, estadoResultante: 'instalado' };
      }
      if (tipoDestino === 'proveedor') {
        return { valido: true, estadoResultante: 'reparacion' };
      }
      break;
    
    case 'instalado':
      if (tipoDestino === 'almacen') {
        return { valido: true, estadoResultante: 'almacen' };
      }
      if (tipoDestino === 'proveedor') {
        return { valido: true, estadoResultante: 'reparacion' };
      }
      break;
  }
  
  return { valido: true, estadoResultante: estadoActual };
}

// =============================================================================
// TRANSICIONES DE ACTIVOS (AUTOBUSES)
// =============================================================================

/**
 * Matriz de transiciones válidas para activos.
 */
export const TRANSICIONES_ACTIVO: Record<EstadoActivo, EstadoActivo[]> = {
  operativo: ['en_taller', 'averiado', 'baja'],
  en_taller: ['operativo', 'averiado', 'baja'],
  averiado: ['en_taller', 'baja'],
  baja: [], // Estado final
};

/**
 * Verifica si una transición de activo es válida.
 */
export function esTransicionValidaActivo(
  estadoActual: EstadoActivo,
  estadoNuevo: EstadoActivo
): boolean {
  const transicionesPermitidas = TRANSICIONES_ACTIVO[estadoActual];
  return transicionesPermitidas?.includes(estadoNuevo) ?? false;
}

/**
 * Obtiene los estados a los que puede transicionar un activo.
 */
export function obtenerSiguientesEstadosActivo(
  estadoActual: EstadoActivo
): EstadoActivo[] {
  return TRANSICIONES_ACTIVO[estadoActual] || [];
}

// =============================================================================
// UTILIDADES DE ESTADO
// =============================================================================

/**
 * Determina si una incidencia está "abierta" (requiere acción).
 */
export function esIncidenciaAbierta(estado: EstadoIncidencia): boolean {
  return ['nueva', 'en_analisis', 'en_intervencion', 'reabierta'].includes(estado);
}

/**
 * Determina si una incidencia está "cerrada" (finalizada).
 */
export function esIncidenciaCerrada(estado: EstadoIncidencia): boolean {
  return ['resuelta', 'cerrada'].includes(estado);
}

/**
 * Determina si un activo está "disponible" para servicio.
 */
export function esActivoDisponible(estado: EstadoActivo): boolean {
  return estado === 'operativo';
}

/**
 * Determina si un equipo está "disponible" para instalar.
 */
export function esEquipoDisponible(estado: EstadoInventario): boolean {
  return estado === 'almacen';
}

/**
 * Obtiene el color asociado a un estado de incidencia (para UI).
 */
export function getColorEstadoIncidencia(
  estado: EstadoIncidencia
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (estado) {
    case 'cerrada':
    case 'resuelta':
      return 'success';
    case 'en_intervencion':
      return 'warning';
    case 'nueva':
    case 'reabierta':
      return 'danger';
    case 'en_analisis':
      return 'info';
    default:
      return 'neutral';
  }
}

/**
 * Obtiene el color asociado a un estado de activo (para UI).
 */
export function getColorEstadoActivo(
  estado: EstadoActivo
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (estado) {
    case 'operativo':
      return 'success';
    case 'en_taller':
      return 'warning';
    case 'averiado':
      return 'danger';
    case 'baja':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Obtiene el ícono sugerido para un estado de incidencia.
 */
export function getIconoEstadoIncidencia(estado: EstadoIncidencia): string {
  switch (estado) {
    case 'nueva':
      return 'AlertTriangle';
    case 'en_analisis':
      return 'Search';
    case 'en_intervencion':
      return 'Wrench';
    case 'resuelta':
      return 'CheckCircle';
    case 'cerrada':
      return 'Archive';
    case 'reabierta':
      return 'RotateCcw';
    default:
      return 'Circle';
  }
}
