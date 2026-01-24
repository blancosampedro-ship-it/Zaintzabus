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
  avanzarASiguienteLaborable,
  formatearMinutos,
  estaEnHorarioServicio,
  minutosLaborablesDia,
  horaAMinutos,
  
  // Visualización
  getColorEstadoSLA,
  
  // Constantes
  SLA_TIEMPOS_DEFAULT,
  HORARIO_SERVICIO_DEFAULT,
  
  // Tipos
  type HorarioServicio,
  type ResultadoSLA,
  type MetricasSLAIncidencia,
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
  getColorEstadoActivo,
  
  // Validación de movimientos
  validarMovimientoEquipo,
  
  // Utilidades de estado
  esIncidenciaAbierta,
  esIncidenciaCerrada,
  esActivoDisponible,
  esEquipoDisponible,
  
  // Constantes
  TRANSICIONES_INCIDENCIA,
  PERMISOS_TRANSICION_INCIDENCIA,
  TRANSICIONES_INVENTARIO,
  TRANSICIONES_ACTIVO,
  ETIQUETAS_ESTADO_INCIDENCIA,
  ETIQUETAS_ESTADO_INVENTARIO,
  ETIQUETAS_ESTADO_ACTIVO,
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
  generarCodigoEjecucionPreventivo,
  generarCodigoMovimiento,
  generarSiguienteCodigoIncidencia,
  generarSiguienteCodigoOrdenTrabajo,
  
  // Extracción de información
  extraerCorrelativo,
  extraerAnio,
  extraerPrefijo,
  determinarTipoEntidad,
  
  // Validación de códigos
  esCodigoIncidenciaValido,
  esCodigoEquipoValido,
  esCodigoOrdenTrabajoValido,
  
  // Utilidades
  calcularSiguienteCorrelativo,
  
  // Constantes
  PREFIJOS,
  
  // Tipos
  type ConfiguracionCodigo,
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
