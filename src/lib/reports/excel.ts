/**
 * =============================================================================
 * GENERACIÓN DE EXCEL - ZaintzaBus
 * =============================================================================
 * 
 * Exportación de informes a formato Excel usando xlsx.
 * Ejecución client-side para ahorrar carga al servidor.
 * =============================================================================
 */

import * as XLSX from 'xlsx';
import type { FilaIncidenciaExcel, ConfigExportExcel, ResumenEjecutivoSLA } from './types';
import { ETIQUETAS_ESTADO_INCIDENCIA } from '@/lib/logic/estados';

// =============================================================================
// TIPOS INTERNOS
// =============================================================================

interface ColumnaDef<T> {
  header: string;
  key: keyof T;
  width: number;
}

// =============================================================================
// CONFIGURACIÓN DE COLUMNAS
// =============================================================================

const COLUMNAS_INCIDENCIAS: ColumnaDef<FilaIncidenciaExcel>[] = [
  { header: 'Código', key: 'codigo', width: 15 },
  { header: 'Activo', key: 'activoCodigo', width: 15 },
  { header: 'Tipo', key: 'tipo', width: 12 },
  { header: 'Criticidad', key: 'criticidad', width: 12 },
  { header: 'Categoría Fallo', key: 'categoriaFallo', width: 25 },
  { header: 'Estado', key: 'estado', width: 15 },
  { header: 'Fecha Recepción', key: 'fechaRecepcion', width: 15 },
  { header: 'Fecha Cierre', key: 'fechaCierre', width: 15 },
  { header: 'Tiempo Respuesta', key: 'tiempoRespuestaHoras', width: 18 },
  { header: 'Tiempo Resolución', key: 'tiempoResolucionHoras', width: 18 },
  { header: 'Cumple SLA', key: 'cumpleSLA', width: 12 },
  { header: 'Operador', key: 'operador', width: 20 },
];

// =============================================================================
// FUNCIONES DE EXPORTACIÓN
// =============================================================================

/**
 * Exporta el histórico de incidencias a Excel.
 */
export function exportarIncidenciasExcel(
  filas: FilaIncidenciaExcel[],
  config: ConfigExportExcel = {
    nombreArchivo: 'historico-incidencias',
    nombreHoja: 'Incidencias',
  }
): void {
  // Crear workbook y worksheet
  const workbook = XLSX.utils.book_new();
  
  // Preparar datos con headers traducidos
  const headers = COLUMNAS_INCIDENCIAS.map(col => col.header);
  const data = filas.map(fila => 
    COLUMNAS_INCIDENCIAS.map(col => {
      const valor = fila[col.key];
      
      // Traducir estado si es necesario
      if (col.key === 'estado' && typeof valor === 'string') {
        return ETIQUETAS_ESTADO_INCIDENCIA[valor as keyof typeof ETIQUETAS_ESTADO_INCIDENCIA] || valor;
      }
      
      // Traducir criticidad
      if (col.key === 'criticidad') {
        return valor === 'critica' ? 'Crítica' : 'Normal';
      }
      
      // Traducir tipo
      if (col.key === 'tipo') {
        return valor === 'correctiva' ? 'Correctiva' : 'Preventiva';
      }
      
      return valor ?? '-';
    })
  );
  
  // Crear worksheet con headers y datos
  const worksheetData = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Configurar anchos de columna
  worksheet['!cols'] = COLUMNAS_INCIDENCIAS.map(col => ({ wch: col.width }));
  
  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, config.nombreHoja);
  
  // Si se solicita resumen, agregar hoja adicional
  if (config.incluirResumen) {
    const resumenSheet = crearHojaResumen(filas);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');
  }
  
  // Generar nombre de archivo con fecha
  const fecha = new Date().toISOString().slice(0, 10);
  const nombreFinal = `${config.nombreArchivo}_${fecha}.xlsx`;
  
  // Descargar archivo
  XLSX.writeFile(workbook, nombreFinal);
}

/**
 * Crea una hoja de resumen estadístico.
 */
function crearHojaResumen(filas: FilaIncidenciaExcel[]): XLSX.WorkSheet {
  const total = filas.length;
  const resueltas = filas.filter(f => f.estado === 'cerrada' || f.estado === 'resuelta').length;
  const criticas = filas.filter(f => f.criticidad === 'critica').length;
  const cumpleSLA = filas.filter(f => f.cumpleSLA === 'Sí').length;
  const fueraSLA = filas.filter(f => f.cumpleSLA === 'No').length;
  
  // Calcular MTTR promedio
  const tiemposResolucion = filas
    .filter(f => f.tiempoResolucionMin !== null)
    .map(f => f.tiempoResolucionMin!);
  
  const mttrPromedio = tiemposResolucion.length > 0
    ? Math.round(tiemposResolucion.reduce((a, b) => a + b, 0) / tiemposResolucion.length)
    : 0;
  
  const mttrHoras = Math.floor(mttrPromedio / 60);
  const mttrMinutos = mttrPromedio % 60;
  const mttrFormatted = mttrPromedio > 0 ? `${mttrHoras}h ${mttrMinutos}m` : '-';
  
  const resumenData = [
    ['RESUMEN ESTADÍSTICO'],
    [],
    ['Métrica', 'Valor'],
    ['Total Incidencias', total],
    ['Incidencias Resueltas', resueltas],
    ['Incidencias Críticas', criticas],
    [],
    ['CUMPLIMIENTO SLA'],
    ['Dentro de SLA', cumpleSLA],
    ['Fuera de SLA', fueraSLA],
    ['% Cumplimiento', total > 0 ? `${Math.round((cumpleSLA / total) * 100)}%` : '-'],
    [],
    ['TIEMPOS'],
    ['MTTR Promedio', mttrFormatted],
    [],
    ['Generado', new Date().toLocaleString('es-ES')],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(resumenData);
  worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  
  return worksheet;
}

/**
 * Exporta el resumen ejecutivo a Excel (alternativa al PDF).
 */
export function exportarResumenEjecutivoExcel(
  resumen: ResumenEjecutivoSLA,
  config: ConfigExportExcel = {
    nombreArchivo: 'resumen-ejecutivo-sla',
    nombreHoja: 'Resumen SLA',
  }
): void {
  const workbook = XLSX.utils.book_new();
  
  const desde = resumen.periodo.desde.toLocaleDateString('es-ES');
  const hasta = resumen.periodo.hasta.toLocaleDateString('es-ES');
  
  const data = [
    ['RESUMEN EJECUTIVO DE SLA'],
    [`Período: ${desde} - ${hasta}`],
    [resumen.operador ? `Operador: ${resumen.operador.nombre}` : 'Todos los operadores'],
    [],
    ['KPIs PRINCIPALES'],
    ['Disponibilidad Flota', `${resumen.kpis.disponibilidadFlota}%`],
    ['Cumplimiento SLA', `${resumen.kpis.cumplimientoSLA}%`],
    ['MTTR (Mean Time To Repair)', resumen.kpis.mttrHoras],
    [],
    ['INCIDENCIAS'],
    ['Total en período', resumen.kpis.totalIncidencias],
    ['Resueltas', resumen.kpis.incidenciasResueltas],
    ['Pendientes', resumen.kpis.incidenciasPendientes],
    ['Críticas', resumen.kpis.incidenciasCriticas],
    ['Fuera de SLA', resumen.kpis.incidenciasFueraSLA],
    [],
    ['DESGLOSE POR CRITICIDAD'],
    ['Críticas - Total', resumen.desglose.porCriticidad.criticas.total],
    ['Críticas - Dentro SLA', resumen.desglose.porCriticidad.criticas.dentroDeSLA],
    ['Normales - Total', resumen.desglose.porCriticidad.normales.total],
    ['Normales - Dentro SLA', resumen.desglose.porCriticidad.normales.dentroDeSLA],
    [],
    ['TOP CATEGORÍAS DE FALLO'],
    ...resumen.desglose.porCategoria.map(cat => 
      [cat.categoria, `${cat.cantidad} (${cat.porcentaje}%)`]
    ),
    [],
    ['Generado por:', resumen.generadoPor],
    ['Fecha generación:', resumen.fechaGeneracion.toLocaleString('es-ES')],
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, config.nombreHoja);
  
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${config.nombreArchivo}_${fecha}.xlsx`);
}

/**
 * Exporta datos genéricos a Excel.
 */
export function exportarDatosExcel<T extends Record<string, unknown>>(
  datos: T[],
  columnas: { header: string; key: keyof T; width?: number }[],
  config: ConfigExportExcel
): void {
  const workbook = XLSX.utils.book_new();
  
  const headers = columnas.map(col => col.header);
  const data = datos.map(fila => 
    columnas.map(col => {
      const valor = fila[col.key];
      return valor ?? '-';
    })
  );
  
  const worksheetData = [headers, ...data];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  worksheet['!cols'] = columnas.map(col => ({ wch: col.width || 15 }));
  
  XLSX.utils.book_append_sheet(workbook, worksheet, config.nombreHoja);
  
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${config.nombreArchivo}_${fecha}.xlsx`);
}
