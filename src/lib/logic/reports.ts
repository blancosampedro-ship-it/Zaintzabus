/**
 * =============================================================================
 * LÓGICA DE TRANSFORMACIÓN PARA INFORMES - ZaintzaBus
 * =============================================================================
 * 
 * Funciones PURAS que transforman datos de incidencias y activos
 * al formato requerido para Excel y PDF.
 * 
 * Sin dependencias de Firebase. Reutiliza calcularMinutosLaborables de sla.ts.
 * =============================================================================
 */

import type { Incidencia, Autobus, Criticidad } from '@/types';
import { 
  calcularMinutosLaborables, 
  verificarEstadoSLA,
  HORARIO_SERVICIO_DEFAULT,
  type HorarioServicio 
} from './sla';
import type {
  FilaIncidenciaExcel,
  FilaFlotaExcel,
  ResumenEjecutivoSLA,
  ResumenFlota,
  FiltrosInforme,
} from '../reports/types';

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
 * Formatea minutos a string legible "Xh Ym".
 */
export function formatMinutosAHoras(minutos: number | null): string {
  if (minutos === null || minutos < 0) return '-';
  if (minutos === 0) return '0m';
  
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  
  if (horas === 0) return `${mins}m`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}m`;
}

/**
 * Formatea una fecha a string ISO (YYYY-MM-DD).
 */
function formatFechaISO(fecha: Date | null): string {
  if (!fecha) return '';
  return fecha.toISOString().slice(0, 10);
}

/**
 * Formatea una fecha a string legible "DD/MM/YYYY HH:mm".
 */
export function formatFechaLegible(fecha: Date | null): string {
  if (!fecha) return '-';
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// CÁLCULO DE MTTR (Mean Time To Repair)
// =============================================================================

/**
 * Calcula el MTTR (Mean Time To Repair) en minutos laborables.
 * Solo considera incidencias con finReparacion o cierre.
 * 
 * @param incidencias - Array de incidencias (puede incluir abiertas)
 * @param horario - Horario de servicio para cálculo laborable
 * @returns MTTR en minutos laborables, o null si no hay datos
 */
export function calcularMTTR(
  incidencias: Incidencia[],
  horario: HorarioServicio = HORARIO_SERVICIO_DEFAULT
): number | null {
  // Filtrar solo incidencias con tiempo de reparación medible
  const incidenciasConCierre = incidencias.filter(inc => {
    const recepcion = toDate(inc.timestamps?.recepcion);
    const finReparacion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
    return recepcion && finReparacion;
  });

  if (incidenciasConCierre.length === 0) return null;

  let totalMinutos = 0;

  for (const inc of incidenciasConCierre) {
    const recepcion = toDate(inc.timestamps?.recepcion)!;
    const finReparacion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre)!;
    
    const minutosLaborables = calcularMinutosLaborables(recepcion, finReparacion, horario);
    totalMinutos += minutosLaborables;
  }

  return Math.round(totalMinutos / incidenciasConCierre.length);
}

// =============================================================================
// TRANSFORMACIÓN A FILAS DE EXCEL
// =============================================================================

/**
 * Transforma una incidencia a fila de Excel.
 */
export function incidenciaAFilaExcel(
  incidencia: Incidencia,
  operadorNombre?: string,
  horario: HorarioServicio = HORARIO_SERVICIO_DEFAULT
): FilaIncidenciaExcel {
  const recepcion = toDate(incidencia.timestamps?.recepcion);
  const inicioAnalisis = toDate(incidencia.timestamps?.inicioAnalisis);
  const finReparacion = toDate(incidencia.timestamps?.finReparacion);
  const cierre = toDate(incidencia.timestamps?.cierre);
  
  // Tiempo de respuesta: desde recepción hasta inicio de análisis
  let tiempoRespuestaMin: number | null = null;
  if (recepcion && inicioAnalisis) {
    tiempoRespuestaMin = calcularMinutosLaborables(recepcion, inicioAnalisis, horario);
  }
  
  // Tiempo de resolución: desde recepción hasta fin de reparación o cierre
  let tiempoResolucionMin: number | null = null;
  const fechaResolucion = finReparacion || cierre;
  if (recepcion && fechaResolucion) {
    tiempoResolucionMin = calcularMinutosLaborables(recepcion, fechaResolucion, horario);
  }
  
  // Verificar cumplimiento SLA
  let cumpleSLA: 'Sí' | 'No' | 'Pendiente' = 'Pendiente';
  if (recepcion && incidencia.criticidad) {
    if (fechaResolucion) {
      const resultado = verificarEstadoSLA(recepcion, fechaResolucion, incidencia.criticidad);
      cumpleSLA = resultado.dentroSLA ? 'Sí' : 'No';
    } else {
      // Incidencia abierta - verificar si ya está fuera de SLA
      const resultado = verificarEstadoSLA(recepcion, null, incidencia.criticidad);
      if (!resultado.dentroSLA) {
        cumpleSLA = 'No';
      }
    }
  }

  return {
    codigo: incidencia.codigo,
    activoCodigo: incidencia.activoPrincipalCodigo,
    tipo: incidencia.tipo,
    criticidad: incidencia.criticidad,
    categoriaFallo: incidencia.categoriaFallo || '-',
    estado: incidencia.estado,
    fechaRecepcion: recepcion ? formatFechaISO(recepcion) : '-',
    fechaCierre: cierre ? formatFechaISO(cierre) : null,
    tiempoRespuestaMin,
    tiempoResolucionMin,
    tiempoRespuestaHoras: formatMinutosAHoras(tiempoRespuestaMin),
    tiempoResolucionHoras: formatMinutosAHoras(tiempoResolucionMin),
    cumpleSLA,
    operador: operadorNombre,
  };
}

/**
 * Transforma array de incidencias a filas de Excel.
 */
export function incidenciasAFilasExcel(
  incidencias: Incidencia[],
  operadorNombre?: string
): FilaIncidenciaExcel[] {
  return incidencias.map(inc => incidenciaAFilaExcel(inc, operadorNombre));
}

// =============================================================================
// GENERACIÓN DE RESUMEN EJECUTIVO
// =============================================================================

/**
 * Genera el resumen ejecutivo de SLA a partir de incidencias y autobuses.
 */
export function generarResumenEjecutivoSLA(
  incidencias: Incidencia[],
  autobuses: Autobus[],
  filtros: FiltrosInforme,
  operadorNombre?: string,
  usuarioGenerador?: string
): ResumenEjecutivoSLA {
  // Calcular métricas de flota
  const flotaTotal = autobuses.length;
  const flotaOperativa = autobuses.filter(a => a.estado === 'operativo').length;
  const disponibilidadFlota = flotaTotal > 0 
    ? Math.round((flotaOperativa / flotaTotal) * 100) 
    : 0;

  // Filtrar incidencias en el período
  const incidenciasEnPeriodo = incidencias.filter(inc => {
    const fechaRecepcion = toDate(inc.timestamps?.recepcion);
    if (!fechaRecepcion) return false;
    return fechaRecepcion >= filtros.fechaDesde && fechaRecepcion <= filtros.fechaHasta;
  });

  // Clasificar incidencias
  const incidenciasResueltas = incidenciasEnPeriodo.filter(
    inc => inc.estado === 'resuelta' || inc.estado === 'cerrada'
  );
  const incidenciasPendientes = incidenciasEnPeriodo.filter(
    inc => inc.estado !== 'resuelta' && inc.estado !== 'cerrada'
  );
  const incidenciasCriticas = incidenciasEnPeriodo.filter(
    inc => inc.criticidad === 'critica'
  );

  // Calcular cumplimiento SLA
  let dentroDeSLA = 0;
  let fueraDeSLA = 0;

  for (const inc of incidenciasEnPeriodo) {
    const recepcion = toDate(inc.timestamps?.recepcion);
    const fechaResolucion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
    
    if (recepcion && inc.criticidad) {
      const resultado = verificarEstadoSLA(recepcion, fechaResolucion, inc.criticidad);
      if (resultado.dentroSLA) {
        dentroDeSLA++;
      } else {
        fueraDeSLA++;
      }
    }
  }

  const cumplimientoSLA = incidenciasEnPeriodo.length > 0
    ? Math.round((dentroDeSLA / incidenciasEnPeriodo.length) * 100)
    : 100;

  // Calcular MTTR
  const mttr = calcularMTTR(incidenciasResueltas) ?? 0;

  // Desglose por criticidad
  const criticas = incidenciasEnPeriodo.filter(i => i.criticidad === 'critica');
  const normales = incidenciasEnPeriodo.filter(i => i.criticidad === 'normal');

  const criticasDentroSLA = criticas.filter(inc => {
    const recepcion = toDate(inc.timestamps?.recepcion);
    const fechaResolucion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
    if (!recepcion) return false;
    return verificarEstadoSLA(recepcion, fechaResolucion, 'critica').dentroSLA;
  }).length;

  const normalesDentroSLA = normales.filter(inc => {
    const recepcion = toDate(inc.timestamps?.recepcion);
    const fechaResolucion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
    if (!recepcion) return false;
    return verificarEstadoSLA(recepcion, fechaResolucion, 'normal').dentroSLA;
  }).length;

  // Desglose por categoría
  const categoriaCount: Record<string, number> = {};
  for (const inc of incidenciasEnPeriodo) {
    const cat = inc.categoriaFallo || 'Sin categoría';
    categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
  }

  const porCategoria = Object.entries(categoriaCount)
    .map(([categoria, cantidad]) => ({
      categoria,
      cantidad,
      porcentaje: Math.round((cantidad / incidenciasEnPeriodo.length) * 100),
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10); // Top 10 categorías

  return {
    periodo: {
      desde: filtros.fechaDesde,
      hasta: filtros.fechaHasta,
    },
    operador: operadorNombre ? { id: filtros.operadorId || '', nombre: operadorNombre } : undefined,
    kpis: {
      disponibilidadFlota,
      cumplimientoSLA,
      mttr,
      mttrHoras: formatMinutosAHoras(mttr),
      totalIncidencias: incidenciasEnPeriodo.length,
      incidenciasResueltas: incidenciasResueltas.length,
      incidenciasPendientes: incidenciasPendientes.length,
      incidenciasCriticas: incidenciasCriticas.length,
      incidenciasFueraSLA: fueraDeSLA,
    },
    desglose: {
      porCriticidad: {
        criticas: { total: criticas.length, dentroDeSLA: criticasDentroSLA },
        normales: { total: normales.length, dentroDeSLA: normalesDentroSLA },
      },
      porCategoria,
    },
    generadoPor: usuarioGenerador || 'Sistema',
    fechaGeneracion: new Date(),
  };
}

/**
 * Genera resumen de flota.
 */
export function generarResumenFlota(
  autobuses: Autobus[],
  incidencias: Incidencia[],
  filtros: FiltrosInforme,
  operadorNombre?: string,
  usuarioGenerador?: string
): ResumenFlota {
  const operativos = autobuses.filter(a => a.estado === 'operativo').length;
  const enTaller = autobuses.filter(a => a.estado === 'en_taller').length;
  const deBaja = autobuses.filter(a => a.estado === 'baja').length;
  
  const disponibilidad = autobuses.length > 0
    ? Math.round((operativos / autobuses.length) * 100)
    : 0;

  // Contar incidencias por bus
  const incidenciasPorBus: Record<string, number> = {};
  for (const inc of incidencias) {
    const codigo = inc.activoPrincipalCodigo;
    incidenciasPorBus[codigo] = (incidenciasPorBus[codigo] || 0) + 1;
  }

  const promedioIncidencias = autobuses.length > 0
    ? Math.round((incidencias.length / autobuses.length) * 10) / 10
    : 0;

  // Top buses con más incidencias
  const busesConMasIncidencias = Object.entries(incidenciasPorBus)
    .map(([codigo, cantidad]) => ({ codigo, incidencias: cantidad }))
    .sort((a, b) => b.incidencias - a.incidencias)
    .slice(0, 5);

  return {
    periodo: {
      desde: filtros.fechaDesde,
      hasta: filtros.fechaHasta,
    },
    operador: operadorNombre ? { id: filtros.operadorId || '', nombre: operadorNombre } : undefined,
    totales: {
      autobuses: autobuses.length,
      operativos,
      enTaller,
      deBaja,
    },
    disponibilidad,
    incidenciasPorBus: promedioIncidencias,
    busesConMasIncidencias,
    generadoPor: usuarioGenerador || 'Sistema',
    fechaGeneracion: new Date(),
  };
}

// =============================================================================
// FILTROS HELPERS
// =============================================================================

/**
 * Filtra incidencias según los criterios del informe.
 */
export function filtrarIncidenciasParaInforme(
  incidencias: Incidencia[],
  filtros: FiltrosInforme
): Incidencia[] {
  return incidencias.filter(inc => {
    const fechaRecepcion = toDate(inc.timestamps?.recepcion);
    
    // Filtro por fecha
    if (fechaRecepcion) {
      if (fechaRecepcion < filtros.fechaDesde || fechaRecepcion > filtros.fechaHasta) {
        return false;
      }
    }
    
    // Filtro por criticidad
    if (filtros.criticidad && inc.criticidad !== filtros.criticidad) {
      return false;
    }
    
    // Filtro por estado
    if (filtros.estado && filtros.estado.length > 0 && !filtros.estado.includes(inc.estado)) {
      return false;
    }
    
    // Filtro solo fuera de SLA
    if (filtros.soloFueraSLA && fechaRecepcion && inc.criticidad) {
      const fechaResolucion = toDate(inc.timestamps?.finReparacion) || toDate(inc.timestamps?.cierre);
      const resultado = verificarEstadoSLA(fechaRecepcion, fechaResolucion, inc.criticidad);
      if (resultado.dentroSLA) {
        return false;
      }
    }
    
    return true;
  });
}
