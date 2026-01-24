/**
 * =============================================================================
 * CAPA DE LÓGICA PURA - ZaintzaBus
 * =============================================================================
 * 
 * Este módulo exporta toda la lógica de negocio pura de la aplicación.
 * 
 * CARACTERÍSTICAS:
 * - Sin dependencias de Firebase ni efectos secundarios
 * - Funciones puras: mismo input = mismo output
 * - Fácilmente testeable sin mocks
 * - Reutilizable en cualquier contexto (API, frontend, scripts)
 * 
 * USO:
 * ```typescript
 * import { calcularVencimientoSLA, esTransicionValidaIncidencia } from '@/lib/logic';
 * 
 * // Calcular fecha límite de SLA
 * const limite = calcularVencimientoSLA(fechaCreacion, 'alta');
 * 
 * // Validar transición de estado
 * const valido = esTransicionValidaIncidencia('abierta', 'en_progreso');
 * ```
 * =============================================================================
 */

// =============================================================================
// SLA - Cálculos de Acuerdo de Nivel de Servicio
// =============================================================================
export {
  // Funciones principales
  calcularVencimientoSLA,
  verificarEstadoSLA,
  calcularMetricasSLA,
  
  // Utilidades de tiempo
  calcularMinutosLaborables,
  calcularTiempoFueraServicio,
  esDiaLaborable,
  obtenerSiguienteDiaLaborable,
  formatearMinutos,
  
  // Visualización
  getColorEstadoSLA,
  
  // Constantes
  HORARIO_LABORAL,
  SLA_TARGETS,
  
  // Tipos
  type CriticidadSLA,
  type ConfiguracionSLA,
  type EstadoSLA,
  type MetricasSLA,
} from './sla';

// =============================================================================
// ESTADOS - Máquinas de estado y transiciones
// =============================================================================
export {
  // Validación de transiciones
  esTransicionValidaIncidencia,
  obtenerSiguientesEstadosIncidencia,
  puedeRealizarTransicionIncidencia,
  
  // Transiciones de inventario
  esTransicionValidaInventario,
  obtenerSiguientesEstadosInventario,
  
  // Transiciones de activos
  esTransicionValidaActivo,
  obtenerSiguientesEstadosActivo,
  
  // Visualización
  getColorEstadoIncidencia,
  getIconoEstadoIncidencia,
  getColorEstadoInventario,
  getColorEstadoActivo,
  
  // Validación de movimientos
  validarMovimientoEquipo,
  
  // Constantes
  TRANSICIONES_INCIDENCIA,
  PERMISOS_TRANSICION_INCIDENCIA,
  TRANSICIONES_INVENTARIO,
  TRANSICIONES_ACTIVO,
  
  // Tipos
  type TipoRol,
} from './estados';

// =============================================================================
// CÓDIGOS - Generación de identificadores
// =============================================================================
export {
  // Generación de códigos
  generarCodigoIncidencia,
  generarCodigoEquipo,
  generarCodigoOrdenTrabajo,
  generarCodigoPreventivo,
  generarCodigoContrato,
  generarCodigoFactura,
  generarCodigoAlmacen,
  
  // Extracción de información
  extraerCorrelativo,
  extraerAnio,
  extraerPrefijo,
  
  // Validación de códigos
  esCodigoIncidenciaValido,
  esCodigoEquipoValido,
  esCodigoOrdenTrabajoValido,
  
  // Utilidades
  padNumero,
  
  // Constantes
  PREFIJOS,
  
  // Tipos
  type TipoEquipo,
} from './codigos';

// =============================================================================
// VALIDACIONES - Validación de datos
// =============================================================================
export {
  // Validaciones de incidencia
  validarCrearIncidencia,
  validarCerrarIncidencia,
  
  // Validaciones de orden de trabajo
  validarCrearOrdenTrabajo,
  puedeCerrarOT,
  
  // Validaciones de inventario
  validarMovimientoInventario,
  validarAltaEquipo,
  
  // Validaciones de preventivo
  validarCrearPreventivo,
  puedeCerrarPreventivo,
  
  // Validaciones de usuario
  validarCrearUsuario,
  
  // Utilidades de validación
  esEmailValido,
  esMatriculaValida,
  esNumeroChasisValido,
  esTelefonoValido,
  limpiarString,
  combinarValidaciones,
  
  // Tipos
  type ResultadoValidacion,
  type DatosIncidencia,
  type DatosOrdenTrabajo,
  type DatosCierreOT,
} from './validaciones';
