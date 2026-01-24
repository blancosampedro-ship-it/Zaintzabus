/**
 * =============================================================================
 * LÓGICA DE GENERACIÓN DE CÓDIGOS - ZaintzaBus
 * =============================================================================
 * 
 * Funciones PURAS para generar códigos internos consistentes.
 * Sin dependencias de Firebase ni efectos secundarios.
 * 
 * Los códigos generados aquí son deterministas dado un input.
 * =============================================================================
 */

// =============================================================================
// TIPOS
// =============================================================================

export interface ConfiguracionCodigo {
  prefijo: string;
  digitosCorrelativo: number;
  separador: string;
  incluirAnio: boolean;
}

// =============================================================================
// CONFIGURACIONES DE CÓDIGOS POR ENTIDAD
// =============================================================================

/**
 * Prefijos estándar para cada tipo de entidad.
 */
export const PREFIJOS = {
  // Incidencias
  INCIDENCIA: 'INC',
  
  // Órdenes de trabajo
  ORDEN_TRABAJO: 'OT',
  
  // Equipos por tipo
  EQUIPO: {
    amplificador: 'AMP',
    cpu: 'CPU',
    licencia_software: 'LIC',
    switch: 'SWT',
    router: 'RTR',
    modulo_wifi: 'WIF',
    comunicacion: 'COM',
    camara: 'CAM',
    pupitre: 'PUP',
    validadora: 'VAL',
    ip_fija: 'IPF',
    sim_card: 'SIM',
    dvr: 'DVR',
    pantalla: 'PAN',
    contador_pasajeros: 'CNT',
    default: 'EQP',
  },
  
  // Preventivo
  PREVENTIVO: 'PRV',
  EJECUCION_PREVENTIVO: 'EPR',
  
  // Movimientos
  MOVIMIENTO: 'MOV',
  
  // Activos
  AUTOBUS: 'BUS',
  ACTIVO: 'ACT',
} as const;

// =============================================================================
// FUNCIONES DE GENERACIÓN DE CÓDIGOS
// =============================================================================

/**
 * Genera un código de incidencia.
 * Formato: INC-{AÑO}-{CORRELATIVO}
 * 
 * @param correlativo - Número correlativo
 * @param anio - Año (opcional, usa actual)
 * @returns Código formateado
 * 
 * @example
 * ```typescript
 * generarCodigoIncidencia(1, 2026)    // "INC-2026-00001"
 * generarCodigoIncidencia(123, 2026)  // "INC-2026-00123"
 * ```
 */
export function generarCodigoIncidencia(
  correlativo: number,
  anio: number = new Date().getFullYear()
): string {
  const correlativoStr = correlativo.toString().padStart(5, '0');
  return `${PREFIJOS.INCIDENCIA}-${anio}-${correlativoStr}`;
}

/**
 * Genera un código de orden de trabajo.
 * Formato: OT-{AÑO}-{CORRELATIVO}
 */
export function generarCodigoOrdenTrabajo(
  correlativo: number,
  anio: number = new Date().getFullYear()
): string {
  const correlativoStr = correlativo.toString().padStart(5, '0');
  return `${PREFIJOS.ORDEN_TRABAJO}-${anio}-${correlativoStr}`;
}

/**
 * Genera un código interno de equipo.
 * Formato: {PREFIJO_TIPO}-{BUS}-{INDICE}
 * 
 * @param tipoEquipo - Tipo de equipo (debe existir en PREFIJOS.EQUIPO)
 * @param codigoBus - Código del bus (ej: "321")
 * @param indice - Índice del equipo de ese tipo en el bus (1, 2, 3...)
 * @returns Código formateado
 * 
 * @example
 * ```typescript
 * generarCodigoEquipo('camara', '321', 1)  // "CAM-321-001"
 * generarCodigoEquipo('camara', '321', 2)  // "CAM-321-002"
 * generarCodigoEquipo('cpu', '321', 1)     // "CPU-321-001"
 * ```
 */
export function generarCodigoEquipo(
  tipoEquipo: string,
  codigoBus: string,
  indice: number
): string {
  const prefijos = PREFIJOS.EQUIPO as Record<string, string>;
  const prefijo = prefijos[tipoEquipo] || prefijos.default;
  const indiceStr = indice.toString().padStart(3, '0');
  return `${prefijo}-${codigoBus}-${indiceStr}`;
}

/**
 * Genera un código de preventivo.
 * Formato: PRV-{CORRELATIVO}
 */
export function generarCodigoPreventivo(correlativo: number): string {
  const correlativoStr = correlativo.toString().padStart(4, '0');
  return `${PREFIJOS.PREVENTIVO}-${correlativoStr}`;
}

/**
 * Genera un código de ejecución de preventivo.
 * Formato: EPR-{AÑO}{MES}-{CORRELATIVO}
 */
export function generarCodigoEjecucionPreventivo(
  correlativo: number,
  fecha: Date = new Date()
): string {
  const anio = fecha.getFullYear();
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const correlativoStr = correlativo.toString().padStart(4, '0');
  return `${PREFIJOS.EJECUCION_PREVENTIVO}-${anio}${mes}-${correlativoStr}`;
}

/**
 * Genera un código de movimiento de inventario.
 * Formato: MOV-{AÑO}{MES}{DIA}-{CORRELATIVO}
 */
export function generarCodigoMovimiento(
  correlativo: number,
  fecha: Date = new Date()
): string {
  const anio = fecha.getFullYear();
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const dia = fecha.getDate().toString().padStart(2, '0');
  const correlativoStr = correlativo.toString().padStart(4, '0');
  return `${PREFIJOS.MOVIMIENTO}-${anio}${mes}${dia}-${correlativoStr}`;
}

// =============================================================================
// FUNCIONES DE EXTRACCIÓN DE DATOS DE CÓDIGOS
// =============================================================================

/**
 * Extrae el correlativo de un código.
 * 
 * @example
 * ```typescript
 * extraerCorrelativo('INC-2026-00123')  // 123
 * extraerCorrelativo('CAM-321-002')     // 2
 * ```
 */
export function extraerCorrelativo(codigo: string): number | null {
  const partes = codigo.split('-');
  const ultimaParte = partes[partes.length - 1];
  const numero = parseInt(ultimaParte, 10);
  return isNaN(numero) ? null : numero;
}

/**
 * Extrae el año de un código (si lo tiene).
 * 
 * @example
 * ```typescript
 * extraerAnio('INC-2026-00123')  // 2026
 * extraerAnio('CAM-321-002')     // null
 * ```
 */
export function extraerAnio(codigo: string): number | null {
  const partes = codigo.split('-');
  
  // Buscar una parte que sea un año (4 dígitos entre 2020 y 2099)
  for (const parte of partes) {
    const numero = parseInt(parte, 10);
    if (!isNaN(numero) && numero >= 2020 && numero <= 2099) {
      return numero;
    }
  }
  
  return null;
}

/**
 * Extrae el prefijo de un código.
 * 
 * @example
 * ```typescript
 * extraerPrefijo('INC-2026-00123')  // "INC"
 * extraerPrefijo('CAM-321-002')     // "CAM"
 * ```
 */
export function extraerPrefijo(codigo: string): string {
  return codigo.split('-')[0] || '';
}

/**
 * Determina el tipo de entidad basándose en el prefijo.
 */
export function determinarTipoEntidad(
  codigo: string
): 'incidencia' | 'orden_trabajo' | 'equipo' | 'preventivo' | 'movimiento' | 'desconocido' {
  const prefijo = extraerPrefijo(codigo);
  
  switch (prefijo) {
    case PREFIJOS.INCIDENCIA:
      return 'incidencia';
    case PREFIJOS.ORDEN_TRABAJO:
      return 'orden_trabajo';
    case PREFIJOS.PREVENTIVO:
    case PREFIJOS.EJECUCION_PREVENTIVO:
      return 'preventivo';
    case PREFIJOS.MOVIMIENTO:
      return 'movimiento';
    default:
      // Verificar si es un tipo de equipo
      const prefijosEquipo = Object.values(PREFIJOS.EQUIPO);
      if (prefijosEquipo.includes(prefijo)) {
        return 'equipo';
      }
      return 'desconocido';
  }
}

// =============================================================================
// FUNCIONES DE VALIDACIÓN DE CÓDIGOS
// =============================================================================

/**
 * Valida el formato de un código de incidencia.
 */
export function esCodigoIncidenciaValido(codigo: string): boolean {
  const regex = /^INC-\d{4}-\d{5}$/;
  return regex.test(codigo);
}

/**
 * Valida el formato de un código de orden de trabajo.
 */
export function esCodigoOrdenTrabajoValido(codigo: string): boolean {
  const regex = /^OT-\d{4}-\d{5}$/;
  return regex.test(codigo);
}

/**
 * Valida el formato de un código de equipo.
 */
export function esCodigoEquipoValido(codigo: string): boolean {
  const regex = /^[A-Z]{3}-\d+-\d{3}$/;
  return regex.test(codigo);
}

// =============================================================================
// FUNCIONES PARA OBTENER SIGUIENTE CORRELATIVO
// =============================================================================

/**
 * Calcula el siguiente correlativo basándose en el último código.
 * 
 * @param ultimoCodigo - Último código generado (o null si no hay ninguno)
 * @returns Siguiente número correlativo
 * 
 * @example
 * ```typescript
 * calcularSiguienteCorrelativo('INC-2026-00123')  // 124
 * calcularSiguienteCorrelativo(null)              // 1
 * ```
 */
export function calcularSiguienteCorrelativo(ultimoCodigo: string | null): number {
  if (!ultimoCodigo) return 1;
  
  const correlativo = extraerCorrelativo(ultimoCodigo);
  return correlativo !== null ? correlativo + 1 : 1;
}

/**
 * Genera el siguiente código de incidencia basándose en el último.
 */
export function generarSiguienteCodigoIncidencia(
  ultimoCodigo: string | null,
  anio: number = new Date().getFullYear()
): string {
  // Si el año es diferente, reiniciar correlativo
  const anioUltimo = ultimoCodigo ? extraerAnio(ultimoCodigo) : null;
  
  if (anioUltimo !== anio) {
    return generarCodigoIncidencia(1, anio);
  }
  
  const siguienteCorrelativo = calcularSiguienteCorrelativo(ultimoCodigo);
  return generarCodigoIncidencia(siguienteCorrelativo, anio);
}

/**
 * Genera el siguiente código de orden de trabajo basándose en el último.
 */
export function generarSiguienteCodigoOrdenTrabajo(
  ultimoCodigo: string | null,
  anio: number = new Date().getFullYear()
): string {
  const anioUltimo = ultimoCodigo ? extraerAnio(ultimoCodigo) : null;
  
  if (anioUltimo !== anio) {
    return generarCodigoOrdenTrabajo(1, anio);
  }
  
  const siguienteCorrelativo = calcularSiguienteCorrelativo(ultimoCodigo);
  return generarCodigoOrdenTrabajo(siguienteCorrelativo, anio);
}
