/**
 * =============================================================================
 * LÓGICA DE VALIDACIONES - ZaintzaBus
 * =============================================================================
 * 
 * Funciones PURAS para validar datos de entrada.
 * Sin dependencias de Firebase ni efectos secundarios.
 * 
 * Todas las funciones retornan arrays de errores (vacío = válido).
 * =============================================================================
 */

import type { 
  Incidencia, 
  EstadoInventario,
  MaterialUtilizado 
} from '@/types';
import { esTransicionValidaInventario } from './estados';

// =============================================================================
// TIPOS
// =============================================================================

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}

export interface DatosIncidencia {
  descripcion?: string;
  activoId?: string;
  categoriaFallo?: string;
  criticidad?: string;
  equiposAfectados?: unknown[];
}

export interface DatosOrdenTrabajo {
  incidenciaId?: string;
  descripcion?: string;
  tecnicoAsignado?: string;
  materialesEstimados?: MaterialUtilizado[];
}

export interface DatosCierreOT {
  diagnostico?: string;
  solucionAplicada?: string;
  materialesUtilizados?: MaterialUtilizado[];
  firmaCliente?: boolean;
  pruebasRealizadas?: Array<{ resultado: string }>;
}

// =============================================================================
// VALIDACIONES DE INCIDENCIA
// =============================================================================

/**
 * Valida los datos para crear una incidencia.
 * 
 * @param datos - Datos de la incidencia
 * @returns Resultado de validación
 * 
 * @example
 * ```typescript
 * const resultado = validarCrearIncidencia({
 *   descripcion: 'Corta',
 *   activoId: 'bus-123',
 * });
 * // { valido: false, errores: ['La descripción debe tener al menos 10 caracteres'] }
 * ```
 */
export function validarCrearIncidencia(datos: DatosIncidencia): ResultadoValidacion {
  const errores: string[] = [];
  
  // Descripción obligatoria y mínimo 10 caracteres
  if (!datos.descripcion || datos.descripcion.trim().length < 10) {
    errores.push('La descripción debe tener al menos 10 caracteres');
  }
  
  // Activo obligatorio
  if (!datos.activoId) {
    errores.push('Debe seleccionar un activo');
  }
  
  // Categoría de fallo obligatoria
  if (!datos.categoriaFallo) {
    errores.push('Debe seleccionar una categoría de fallo');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Valida los datos para cerrar una incidencia.
 */
export function validarCerrarIncidencia(datos: {
  diagnostico?: string;
  solucionAplicada?: string;
}): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!datos.diagnostico || datos.diagnostico.trim().length < 10) {
    errores.push('Debe incluir un diagnóstico (mínimo 10 caracteres)');
  }
  
  if (!datos.solucionAplicada || datos.solucionAplicada.trim().length < 10) {
    errores.push('Debe describir la solución aplicada (mínimo 10 caracteres)');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// =============================================================================
// VALIDACIONES DE ORDEN DE TRABAJO
// =============================================================================

/**
 * Valida los datos para crear una orden de trabajo.
 */
export function validarCrearOrdenTrabajo(datos: DatosOrdenTrabajo): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!datos.incidenciaId) {
    errores.push('Debe asociar la OT a una incidencia');
  }
  
  if (!datos.descripcion || datos.descripcion.trim().length < 10) {
    errores.push('La descripción debe tener al menos 10 caracteres');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Valida si una orden de trabajo puede cerrarse.
 * Verifica que tenga toda la información requerida.
 * 
 * @param datos - Datos de cierre de la OT
 * @param requiereFirma - Si requiere firma del cliente/operador
 * @returns Resultado de validación
 * 
 * @example
 * ```typescript
 * const resultado = puedeCerrarOT({
 *   diagnostico: 'Fallo en CPU',
 *   solucionAplicada: 'Reemplazo de CPU',
 *   materialesUtilizados: [{ descripcion: 'CPU', cantidad: 1 }],
 *   pruebasRealizadas: [{ resultado: 'ok' }],
 * });
 * // { valido: true, errores: [] }
 * ```
 */
export function puedeCerrarOT(
  datos: DatosCierreOT,
  requiereFirma: boolean = false
): ResultadoValidacion {
  const errores: string[] = [];
  
  // Diagnóstico obligatorio
  if (!datos.diagnostico || datos.diagnostico.trim().length < 5) {
    errores.push('Debe incluir un diagnóstico');
  }
  
  // Solución obligatoria
  if (!datos.solucionAplicada || datos.solucionAplicada.trim().length < 5) {
    errores.push('Debe describir la solución aplicada');
  }
  
  // Al menos una prueba realizada
  if (!datos.pruebasRealizadas || datos.pruebasRealizadas.length === 0) {
    errores.push('Debe registrar al menos una prueba post-reparación');
  } else {
    // Verificar que todas las pruebas tengan resultado
    const sinResultado = datos.pruebasRealizadas.filter(p => !p.resultado);
    if (sinResultado.length > 0) {
      errores.push('Todas las pruebas deben tener un resultado');
    }
  }
  
  // Firma si es requerida
  if (requiereFirma && !datos.firmaCliente) {
    errores.push('Se requiere firma del cliente/operador');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// =============================================================================
// VALIDACIONES DE INVENTARIO
// =============================================================================

/**
 * Valida un movimiento de inventario.
 * 
 * @param equipo - Datos del equipo
 * @param destino - Datos del destino
 * @returns Resultado de validación
 */
export function validarMovimientoInventario(
  equipo: { estado: EstadoInventario; serie?: string },
  destino: { tipo: 'autobus' | 'almacen' | 'proveedor'; id?: string }
): ResultadoValidacion {
  const errores: string[] = [];
  
  // Verificar que el destino tenga ID
  if (!destino.id) {
    errores.push('Debe seleccionar un destino');
  }
  
  // Verificar reglas de transición según tipo de destino
  if (equipo.estado === 'baja') {
    errores.push('No se puede mover un equipo dado de baja');
  }
  
  if (equipo.estado === 'reparacion' && destino.tipo === 'autobus') {
    errores.push('Un equipo en reparación debe pasar por almacén antes de instalarse');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Valida los datos para dar de alta un equipo.
 */
export function validarAltaEquipo(datos: {
  tipoEquipo?: string;
  numeroSerie?: string;
  fabricante?: string;
  modelo?: string;
}): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!datos.tipoEquipo) {
    errores.push('Debe seleccionar un tipo de equipo');
  }
  
  if (!datos.numeroSerie || datos.numeroSerie.trim().length < 3) {
    errores.push('El número de serie debe tener al menos 3 caracteres');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// =============================================================================
// VALIDACIONES DE PREVENTIVO
// =============================================================================

/**
 * Valida los datos para crear un plan de preventivo.
 */
export function validarCrearPreventivo(datos: {
  nombre?: string;
  descripcion?: string;
  periodicidad?: string;
  tareas?: Array<{ descripcion?: string }>;
}): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!datos.nombre || datos.nombre.trim().length < 5) {
    errores.push('El nombre debe tener al menos 5 caracteres');
  }
  
  if (!datos.periodicidad) {
    errores.push('Debe seleccionar una periodicidad');
  }
  
  if (!datos.tareas || datos.tareas.length === 0) {
    errores.push('Debe incluir al menos una tarea');
  } else {
    const tareasSinDescripcion = datos.tareas.filter(t => !t.descripcion?.trim());
    if (tareasSinDescripcion.length > 0) {
      errores.push('Todas las tareas deben tener descripción');
    }
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

/**
 * Valida si una ejecución de preventivo puede cerrarse.
 */
export function puedeCerrarPreventivo(datos: {
  tareasEjecutadas?: Array<{ completada?: boolean; resultado?: string }>;
}): ResultadoValidacion {
  const errores: string[] = [];
  
  if (!datos.tareasEjecutadas || datos.tareasEjecutadas.length === 0) {
    errores.push('No hay tareas ejecutadas');
  } else {
    const tareasIncompletas = datos.tareasEjecutadas.filter(t => !t.completada);
    if (tareasIncompletas.length > 0) {
      errores.push(`Hay ${tareasIncompletas.length} tareas sin completar`);
    }
    
    const tareasSinResultado = datos.tareasEjecutadas.filter(t => !t.resultado);
    if (tareasSinResultado.length > 0) {
      errores.push('Todas las tareas deben tener un resultado');
    }
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// =============================================================================
// VALIDACIONES DE USUARIO
// =============================================================================

/**
 * Valida los datos para crear un usuario.
 */
export function validarCrearUsuario(datos: {
  email?: string;
  nombre?: string;
  password?: string;
  rol?: string;
}): ResultadoValidacion {
  const errores: string[] = [];
  
  // Email
  if (!datos.email) {
    errores.push('El email es obligatorio');
  } else if (!esEmailValido(datos.email)) {
    errores.push('El formato del email no es válido');
  }
  
  // Nombre
  if (!datos.nombre || datos.nombre.trim().length < 2) {
    errores.push('El nombre debe tener al menos 2 caracteres');
  }
  
  // Password
  if (!datos.password) {
    errores.push('La contraseña es obligatoria');
  } else if (datos.password.length < 6) {
    errores.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  // Rol
  const rolesValidos = ['admin', 'dfg', 'operador', 'jefe_mantenimiento', 'tecnico'];
  if (!datos.rol) {
    errores.push('Debe seleccionar un rol');
  } else if (!rolesValidos.includes(datos.rol)) {
    errores.push('El rol seleccionado no es válido');
  }
  
  return {
    valido: errores.length === 0,
    errores,
  };
}

// =============================================================================
// UTILIDADES DE VALIDACIÓN
// =============================================================================

/**
 * Valida formato de email.
 */
export function esEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida formato de matrícula española.
 */
export function esMatriculaValida(matricula: string): boolean {
  // Formato moderno: 0000 XXX
  const regexModerno = /^\d{4}\s?[A-Z]{3}$/;
  // Formato antiguo: X-0000-XX
  const regexAntiguo = /^[A-Z]{1,2}-?\d{4}-?[A-Z]{2}$/;
  
  return regexModerno.test(matricula.toUpperCase()) || regexAntiguo.test(matricula.toUpperCase());
}

/**
 * Valida formato de número de chasis (VIN).
 */
export function esNumeroChasisValido(chasis: string): boolean {
  // VIN tiene 17 caracteres alfanuméricos (sin I, O, Q)
  const regex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return regex.test(chasis.toUpperCase());
}

/**
 * Valida formato de número de teléfono español.
 */
export function esTelefonoValido(telefono: string): boolean {
  // Quitar espacios y guiones
  const limpio = telefono.replace(/[\s-]/g, '');
  // Debe empezar por 6, 7, 8 o 9 y tener 9 dígitos
  const regex = /^[6-9]\d{8}$/;
  return regex.test(limpio);
}

/**
 * Limpia y normaliza un string.
 */
export function limpiarString(valor: string | undefined | null): string {
  if (!valor) return '';
  return valor.trim().replace(/\s+/g, ' ');
}

/**
 * Combina múltiples resultados de validación.
 */
export function combinarValidaciones(...validaciones: ResultadoValidacion[]): ResultadoValidacion {
  const todosErrores = validaciones.flatMap(v => v.errores);
  return {
    valido: todosErrores.length === 0,
    errores: todosErrores,
  };
}
