/**
 * =============================================================================
 * LÓGICA DE SLA - ZaintzaBus
 * =============================================================================
 * 
 * Funciones PURAS para cálculos de SLA (Service Level Agreement).
 * Sin dependencias de Firebase ni efectos secundarios.
 * 
 * Estas funciones son el "cerebro" del sistema de SLA y son fácilmente testeables.
 * =============================================================================
 */

import type { Criticidad, SLAConfig, TiemposSLA } from '@/types';

// =============================================================================
// TIPOS LOCALES
// =============================================================================

export interface HorarioServicio {
  inicio: string; // "08:00"
  fin: string;    // "20:00"
  diasLaborables: number[]; // [1,2,3,4,5] = Lunes a Viernes
}

export interface ResultadoSLA {
  /** Fecha/hora de vencimiento del SLA */
  vencimiento: Date;
  /** Minutos objetivo según criticidad */
  minutosObjetivo: number;
  /** Minutos transcurridos (laborables) */
  minutosTranscurridos: number;
  /** Porcentaje del tiempo usado (0-100+) */
  porcentajeUsado: number;
  /** Si está dentro del SLA */
  dentroSLA: boolean;
  /** Minutos restantes (negativo si excedido) */
  minutosRestantes: number;
}

export interface MetricasSLAIncidencia {
  tiempoAtencion: number | null;    // minutos hasta primer análisis
  tiempoResolucion: number | null;  // minutos hasta resolución
  tiempoFueraServicio: number;      // minutos activo no operativo
  cumpleSLA: boolean;
  dentroTiempoAtencion: boolean;
  dentroTiempoResolucion: boolean;
}

// =============================================================================
// CONFIGURACIÓN POR DEFECTO
// =============================================================================

/**
 * Tiempos SLA por defecto (en minutos).
 * Basados en contrato típico DFG.
 */
export const SLA_TIEMPOS_DEFAULT: Record<Criticidad, TiemposSLA> = {
  critica: {
    atencion: 30,      // 30 minutos para empezar análisis
    resolucion: 240,   // 4 horas para resolver
  },
  normal: {
    atencion: 120,     // 2 horas para empezar análisis
    resolucion: 1440,  // 24 horas para resolver
  },
};

/**
 * Horario de servicio por defecto.
 * Lunes a Viernes, 8:00 a 20:00.
 */
export const HORARIO_SERVICIO_DEFAULT: HorarioServicio = {
  inicio: '08:00',
  fin: '20:00',
  diasLaborables: [1, 2, 3, 4, 5], // Lunes = 1, Domingo = 0
};

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Parsea una hora en formato "HH:MM" a minutos desde medianoche.
 */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica si una fecha cae en día laborable.
 */
export function esDiaLaborable(fecha: Date, diasLaborables: number[]): boolean {
  return diasLaborables.includes(fecha.getDay());
}

/**
 * Verifica si una hora está dentro del horario de servicio.
 */
export function estaEnHorarioServicio(fecha: Date, horario: HorarioServicio): boolean {
  if (!esDiaLaborable(fecha, horario.diasLaborables)) {
    return false;
  }
  
  const minutosActuales = fecha.getHours() * 60 + fecha.getMinutes();
  const inicio = horaAMinutos(horario.inicio);
  const fin = horaAMinutos(horario.fin);
  
  return minutosActuales >= inicio && minutosActuales < fin;
}

/**
 * Obtiene los minutos laborables de un día específico.
 */
export function minutosLaborablesDia(horario: HorarioServicio): number {
  return horaAMinutos(horario.fin) - horaAMinutos(horario.inicio);
}

/**
 * Avanza una fecha al siguiente momento laborable.
 * Si ya está en horario laborable, la devuelve sin cambios.
 */
export function avanzarASiguienteLaborable(fecha: Date, horario: HorarioServicio): Date {
  const resultado = new Date(fecha);
  
  // Si es fin de semana, avanzar al siguiente día laborable
  while (!esDiaLaborable(resultado, horario.diasLaborables)) {
    resultado.setDate(resultado.getDate() + 1);
    resultado.setHours(0, 0, 0, 0);
  }
  
  const minutosActuales = resultado.getHours() * 60 + resultado.getMinutes();
  const inicio = horaAMinutos(horario.inicio);
  const fin = horaAMinutos(horario.fin);
  
  // Si es antes del inicio, poner al inicio
  if (minutosActuales < inicio) {
    resultado.setHours(Math.floor(inicio / 60), inicio % 60, 0, 0);
  }
  
  // Si es después del fin, avanzar al siguiente día laborable
  if (minutosActuales >= fin) {
    resultado.setDate(resultado.getDate() + 1);
    resultado.setHours(0, 0, 0, 0);
    return avanzarASiguienteLaborable(resultado, horario);
  }
  
  return resultado;
}

// =============================================================================
// FUNCIONES PRINCIPALES DE SLA
// =============================================================================

/**
 * Calcula la fecha de vencimiento del SLA.
 * 
 * @param fechaApertura - Fecha/hora de apertura de la incidencia
 * @param criticidad - Nivel de criticidad
 * @param tipoTiempo - 'atencion' o 'resolucion'
 * @param config - Configuración SLA (opcional, usa defaults)
 * @returns Fecha de vencimiento
 * 
 * @example
 * ```typescript
 * const vencimiento = calcularVencimientoSLA(
 *   new Date('2026-01-24T10:00:00'),
 *   'critica',
 *   'resolucion'
 * );
 * // Retorna: 2026-01-24T14:00:00 (4h laborables después)
 * ```
 */
export function calcularVencimientoSLA(
  fechaApertura: Date,
  criticidad: Criticidad,
  tipoTiempo: 'atencion' | 'resolucion',
  config?: {
    tiempos?: Record<Criticidad, TiemposSLA>;
    horario?: HorarioServicio;
  }
): Date {
  const tiempos = config?.tiempos ?? SLA_TIEMPOS_DEFAULT;
  const horario = config?.horario ?? HORARIO_SERVICIO_DEFAULT;
  
  const minutosObjetivo = tiempos[criticidad][tipoTiempo];
  
  // Empezar desde el primer momento laborable
  let resultado = avanzarASiguienteLaborable(new Date(fechaApertura), horario);
  let minutosRestantes = minutosObjetivo;
  
  while (minutosRestantes > 0) {
    const minutosActuales = resultado.getHours() * 60 + resultado.getMinutes();
    const finDia = horaAMinutos(horario.fin);
    const minutosHastaFinDia = finDia - minutosActuales;
    
    if (minutosRestantes <= minutosHastaFinDia) {
      // Cabe en el día actual
      resultado.setMinutes(resultado.getMinutes() + minutosRestantes);
      minutosRestantes = 0;
    } else {
      // Consume el resto del día y pasa al siguiente
      minutosRestantes -= minutosHastaFinDia;
      resultado.setDate(resultado.getDate() + 1);
      resultado.setHours(0, 0, 0, 0);
      resultado = avanzarASiguienteLaborable(resultado, horario);
    }
  }
  
  return resultado;
}

/**
 * Calcula los minutos laborables transcurridos entre dos fechas.
 * 
 * @param inicio - Fecha de inicio
 * @param fin - Fecha de fin (null = ahora)
 * @param horario - Horario de servicio
 * @returns Minutos laborables transcurridos
 */
export function calcularMinutosLaborables(
  inicio: Date,
  fin: Date | null,
  horario: HorarioServicio = HORARIO_SERVICIO_DEFAULT
): number {
  const fechaFin = fin ?? new Date();
  
  // Ajustar inicio al primer momento laborable
  let actual = avanzarASiguienteLaborable(new Date(inicio), horario);
  let totalMinutos = 0;
  
  while (actual < fechaFin) {
    if (!esDiaLaborable(actual, horario.diasLaborables)) {
      actual.setDate(actual.getDate() + 1);
      actual.setHours(0, 0, 0, 0);
      continue;
    }
    
    const minutosActuales = actual.getHours() * 60 + actual.getMinutes();
    const inicioJornada = horaAMinutos(horario.inicio);
    const finJornada = horaAMinutos(horario.fin);
    
    // Si estamos antes de la jornada, saltar al inicio
    if (minutosActuales < inicioJornada) {
      actual.setHours(Math.floor(inicioJornada / 60), inicioJornada % 60, 0, 0);
      continue;
    }
    
    // Si estamos después de la jornada, pasar al siguiente día
    if (minutosActuales >= finJornada) {
      actual.setDate(actual.getDate() + 1);
      actual.setHours(0, 0, 0, 0);
      continue;
    }
    
    // Calcular minutos hasta fin de jornada o fecha fin
    const finDelDia = new Date(actual);
    finDelDia.setHours(Math.floor(finJornada / 60), finJornada % 60, 0, 0);
    
    const finReal = fechaFin < finDelDia ? fechaFin : finDelDia;
    const minutosEnEsteDia = Math.floor((finReal.getTime() - actual.getTime()) / (1000 * 60));
    
    totalMinutos += Math.max(0, minutosEnEsteDia);
    
    // Avanzar al siguiente día
    actual.setDate(actual.getDate() + 1);
    actual.setHours(0, 0, 0, 0);
  }
  
  return totalMinutos;
}

/**
 * Verifica el estado de SLA de una incidencia.
 * 
 * @param fechaApertura - Fecha de apertura
 * @param fechaResolucion - Fecha de resolución (null si no resuelta)
 * @param criticidad - Criticidad de la incidencia
 * @param config - Configuración SLA opcional
 * @returns Estado completo del SLA
 * 
 * @example
 * ```typescript
 * const estado = verificarEstadoSLA(
 *   new Date('2026-01-24T10:00:00'),
 *   null, // Sin resolver
 *   'critica'
 * );
 * // { dentroSLA: true, porcentajeUsado: 50, minutosRestantes: 120, ... }
 * ```
 */
export function verificarEstadoSLA(
  fechaApertura: Date,
  fechaResolucion: Date | null,
  criticidad: Criticidad,
  config?: {
    tiempos?: Record<Criticidad, TiemposSLA>;
    horario?: HorarioServicio;
  }
): ResultadoSLA {
  const tiempos = config?.tiempos ?? SLA_TIEMPOS_DEFAULT;
  const horario = config?.horario ?? HORARIO_SERVICIO_DEFAULT;
  
  const minutosObjetivo = tiempos[criticidad].resolucion;
  const vencimiento = calcularVencimientoSLA(fechaApertura, criticidad, 'resolucion', config);
  
  const fechaCalculo = fechaResolucion ?? new Date();
  const minutosTranscurridos = calcularMinutosLaborables(fechaApertura, fechaCalculo, horario);
  
  const porcentajeUsado = Math.round((minutosTranscurridos / minutosObjetivo) * 100);
  const minutosRestantes = minutosObjetivo - minutosTranscurridos;
  const dentroSLA = minutosTranscurridos <= minutosObjetivo;
  
  return {
    vencimiento,
    minutosObjetivo,
    minutosTranscurridos,
    porcentajeUsado,
    dentroSLA,
    minutosRestantes,
  };
}

/**
 * Calcula el tiempo que un activo ha estado fuera de servicio.
 * Excluye horarios no laborables.
 * 
 * @param historialEstados - Array de { estado, timestamp } ordenado cronológicamente
 * @param estadosNoOperativos - Estados que cuentan como "fuera de servicio"
 * @param horario - Horario de servicio
 * @returns Minutos fuera de servicio (laborables)
 */
export function calcularTiempoFueraServicio(
  historialEstados: Array<{ estado: string; timestamp: Date }>,
  estadosNoOperativos: string[] = ['en_taller', 'averiado'],
  horario: HorarioServicio = HORARIO_SERVICIO_DEFAULT
): number {
  if (historialEstados.length === 0) return 0;
  
  let totalMinutos = 0;
  let inicioFueraServicio: Date | null = null;
  
  for (const { estado, timestamp } of historialEstados) {
    const estaFueraServicio = estadosNoOperativos.includes(estado);
    
    if (estaFueraServicio && !inicioFueraServicio) {
      // Empieza periodo fuera de servicio
      inicioFueraServicio = timestamp;
    } else if (!estaFueraServicio && inicioFueraServicio) {
      // Termina periodo fuera de servicio
      totalMinutos += calcularMinutosLaborables(inicioFueraServicio, timestamp, horario);
      inicioFueraServicio = null;
    }
  }
  
  // Si aún está fuera de servicio, contar hasta ahora
  if (inicioFueraServicio) {
    totalMinutos += calcularMinutosLaborables(inicioFueraServicio, new Date(), horario);
  }
  
  return totalMinutos;
}

/**
 * Calcula métricas SLA completas para una incidencia.
 * 
 * @param timestamps - Timestamps de la incidencia
 * @param criticidad - Criticidad
 * @param config - Configuración SLA opcional
 * @returns Métricas SLA completas
 */
export function calcularMetricasSLA(
  timestamps: {
    recepcion: Date;
    inicioAnalisis?: Date;
    finReparacion?: Date;
  },
  criticidad: Criticidad,
  config?: {
    tiempos?: Record<Criticidad, TiemposSLA>;
    horario?: HorarioServicio;
  }
): MetricasSLAIncidencia {
  const tiempos = config?.tiempos ?? SLA_TIEMPOS_DEFAULT;
  const horario = config?.horario ?? HORARIO_SERVICIO_DEFAULT;
  
  const objetivoAtencion = tiempos[criticidad].atencion;
  const objetivoResolucion = tiempos[criticidad].resolucion;
  
  // Tiempo de atención
  const tiempoAtencion = timestamps.inicioAnalisis
    ? calcularMinutosLaborables(timestamps.recepcion, timestamps.inicioAnalisis, horario)
    : null;
  
  // Tiempo de resolución
  const tiempoResolucion = timestamps.finReparacion
    ? calcularMinutosLaborables(timestamps.recepcion, timestamps.finReparacion, horario)
    : null;
  
  // Evaluar cumplimiento
  const dentroTiempoAtencion = tiempoAtencion !== null && tiempoAtencion <= objetivoAtencion;
  const dentroTiempoResolucion = tiempoResolucion !== null && tiempoResolucion <= objetivoResolucion;
  
  // El SLA se cumple si ambos tiempos están dentro de objetivo
  const cumpleSLA = dentroTiempoAtencion && dentroTiempoResolucion;
  
  return {
    tiempoAtencion,
    tiempoResolucion,
    tiempoFueraServicio: tiempoResolucion ?? 0, // Simplificado: mismo que resolución
    cumpleSLA,
    dentroTiempoAtencion,
    dentroTiempoResolucion,
  };
}

// =============================================================================
// UTILIDADES DE FORMATEO
// =============================================================================

/**
 * Formatea minutos a texto legible.
 * 
 * @example
 * formatearMinutos(150) // "2h 30m"
 * formatearMinutos(1500) // "1d 1h"
 */
export function formatearMinutos(minutos: number): string {
  const absMinutos = Math.abs(minutos);
  
  if (absMinutos < 60) {
    return `${minutos}m`;
  }
  
  if (absMinutos < 1440) {
    const horas = Math.floor(absMinutos / 60);
    const mins = absMinutos % 60;
    return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
  }
  
  const dias = Math.floor(absMinutos / 1440);
  const horasRestantes = Math.floor((absMinutos % 1440) / 60);
  return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
}

/**
 * Obtiene el color de estado SLA para UI.
 */
export function getColorEstadoSLA(porcentajeUsado: number): 'success' | 'warning' | 'danger' {
  if (porcentajeUsado <= 50) return 'success';
  if (porcentajeUsado <= 80) return 'warning';
  return 'danger';
}
