/**
 * =============================================================================
 * GENERACIÓN DE PDF - ZaintzaBus
 * =============================================================================
 * 
 * Exportación de informes a formato PDF usando jspdf + jspdf-autotable.
 * Incluye logo oficial de Lurraldebus para informes institucionales.
 * Ejecución client-side.
 * =============================================================================
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResumenEjecutivoSLA, ResumenFlota, ConfigExportPDF, FilaIncidenciaExcel } from './types';
import { ETIQUETAS_ESTADO_INCIDENCIA } from '@/lib/logic/estados';

// =============================================================================
// CONSTANTES DE DISEÑO
// =============================================================================

const COLORS = {
  primary: '#0D3B66',       // Azul Lurraldebus
  secondary: '#1E5C97',
  accent: '#F4A261',        // Naranja/ámbar
  success: '#2A9D8F',
  danger: '#E63946',
  text: '#333333',
  textLight: '#666666',
  background: '#F8F9FA',
  white: '#FFFFFF',
};

const MARGINS = {
  top: 20,
  left: 20,
  right: 20,
  bottom: 20,
};

// =============================================================================
// FUNCIONES AUXILIARES
// =============================================================================

/**
 * Carga una imagen y la convierte a base64 para usar en PDF.
 */
async function cargarLogoBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('No se pudo crear contexto de canvas'));
      }
    };
    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = src;
  });
}

/**
 * Formatea fecha para mostrar en PDF.
 */
function formatFechaPDF(fecha: Date): string {
  return fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Dibuja el header institucional del PDF.
 */
async function dibujarHeaderInstitucional(
  doc: jsPDF,
  titulo: string,
  subtitulo?: string,
  incluirLogo: boolean = true
): Promise<number> {
  let yPos = MARGINS.top;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo de Lurraldebus
  if (incluirLogo) {
    try {
      const logoBase64 = await cargarLogoBase64('/logo-lurraldebus.png');
      // Logo a la izquierda, tamaño proporcional
      doc.addImage(logoBase64, 'PNG', MARGINS.left, yPos, 50, 20);
      yPos += 25;
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
      yPos += 5;
    }
  }
  
  // Línea divisoria
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGINS.left, yPos, pageWidth - MARGINS.right, yPos);
  yPos += 10;
  
  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLORS.primary);
  doc.text(titulo, MARGINS.left, yPos);
  yPos += 8;
  
  // Subtítulo
  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(COLORS.textLight);
    doc.text(subtitulo, MARGINS.left, yPos);
    yPos += 10;
  }
  
  return yPos;
}

/**
 * Dibuja una tarjeta KPI en el PDF.
 */
function dibujarKPICard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  valor: string,
  color: string = COLORS.primary
): void {
  // Fondo
  doc.setFillColor(COLORS.background);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
  
  // Borde superior de color
  doc.setFillColor(color);
  doc.rect(x, y, width, 3, 'F');
  
  // Valor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(color);
  doc.text(valor, x + width / 2, y + height / 2, { align: 'center' });
  
  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  doc.text(label, x + width / 2, y + height - 8, { align: 'center' });
}

/**
 * Dibuja el footer del documento.
 */
function dibujarFooter(doc: jsPDF, generadoPor: string, fechaGeneracion: Date): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(MARGINS.left, pageHeight - 15, pageWidth - MARGINS.right, pageHeight - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textLight);
  
  const fechaTexto = fechaGeneracion.toLocaleString('es-ES');
  doc.text(`Generado por: ${generadoPor}`, MARGINS.left, pageHeight - 10);
  doc.text(`Fecha: ${fechaTexto}`, pageWidth - MARGINS.right, pageHeight - 10, { align: 'right' });
  doc.text('ZaintzaBus - Sistema de Gestión de Mantenimiento', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

// =============================================================================
// EXPORTACIÓN DE RESUMEN EJECUTIVO SLA
// =============================================================================

/**
 * Genera y descarga el PDF del Resumen Ejecutivo de SLA.
 */
export async function exportarResumenEjecutivoPDF(
  resumen: ResumenEjecutivoSLA,
  config: ConfigExportPDF = {
    nombreArchivo: 'resumen-ejecutivo-sla',
    titulo: 'Resumen Ejecutivo de SLA',
    incluirLogo: true,
    orientacion: 'portrait',
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: config.orientacion || 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  const periodoTexto = `${formatFechaPDF(resumen.periodo.desde)} - ${formatFechaPDF(resumen.periodo.hasta)}`;
  const subtitulo = resumen.operador 
    ? `${resumen.operador.nombre} | ${periodoTexto}`
    : `Todos los operadores | ${periodoTexto}`;
  
  let yPos = await dibujarHeaderInstitucional(doc, config.titulo, subtitulo, config.incluirLogo);
  yPos += 5;
  
  // === SECCIÓN: KPIs Principales ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text('KPIs Principales', MARGINS.left, yPos);
  yPos += 8;
  
  // Grid de 4 KPIs
  const kpiWidth = (pageWidth - MARGINS.left - MARGINS.right - 15) / 4;
  const kpiHeight = 35;
  
  // Determinar colores según valores
  const colorDisponibilidad = resumen.kpis.disponibilidadFlota >= 90 ? COLORS.success 
    : resumen.kpis.disponibilidadFlota >= 80 ? COLORS.accent : COLORS.danger;
  
  const colorSLA = resumen.kpis.cumplimientoSLA >= 95 ? COLORS.success 
    : resumen.kpis.cumplimientoSLA >= 85 ? COLORS.accent : COLORS.danger;
  
  dibujarKPICard(doc, MARGINS.left, yPos, kpiWidth, kpiHeight, 
    'Disponibilidad', `${resumen.kpis.disponibilidadFlota}%`, colorDisponibilidad);
  
  dibujarKPICard(doc, MARGINS.left + kpiWidth + 5, yPos, kpiWidth, kpiHeight, 
    'Cumplimiento SLA', `${resumen.kpis.cumplimientoSLA}%`, colorSLA);
  
  dibujarKPICard(doc, MARGINS.left + (kpiWidth + 5) * 2, yPos, kpiWidth, kpiHeight, 
    'MTTR', resumen.kpis.mttrHoras, COLORS.secondary);
  
  dibujarKPICard(doc, MARGINS.left + (kpiWidth + 5) * 3, yPos, kpiWidth, kpiHeight, 
    'Total Incidencias', `${resumen.kpis.totalIncidencias}`, COLORS.primary);
  
  yPos += kpiHeight + 15;
  
  // === SECCIÓN: Detalle de Incidencias ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text('Detalle de Incidencias', MARGINS.left, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Resueltas en período', resumen.kpis.incidenciasResueltas.toString()],
      ['Pendientes', resumen.kpis.incidenciasPendientes.toString()],
      ['Críticas', resumen.kpis.incidenciasCriticas.toString()],
      ['Fuera de SLA', resumen.kpis.incidenciasFueraSLA.toString()],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'center', cellWidth: 50 },
    },
    margin: { left: MARGINS.left },
    tableWidth: 130,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // === SECCIÓN: Desglose por Criticidad ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Desglose por Criticidad', MARGINS.left, yPos);
  yPos += 8;
  
  const { criticas, normales } = resumen.desglose.porCriticidad;
  const pctCriticasSLA = criticas.total > 0 
    ? Math.round((criticas.dentroDeSLA / criticas.total) * 100) 
    : 100;
  const pctNormalesSLA = normales.total > 0 
    ? Math.round((normales.dentroDeSLA / normales.total) * 100) 
    : 100;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Criticidad', 'Total', 'Dentro SLA', '% Cumplimiento']],
    body: [
      ['Críticas', criticas.total.toString(), criticas.dentroDeSLA.toString(), `${pctCriticasSLA}%`],
      ['Normales', normales.total.toString(), normales.dentroDeSLA.toString(), `${pctNormalesSLA}%`],
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.secondary,
      textColor: COLORS.white,
      fontStyle: 'bold',
    },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: MARGINS.left },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // === SECCIÓN: Top Categorías de Fallo ===
  if (resumen.desglose.porCategoria.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Top Categorías de Fallo', MARGINS.left, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Categoría', 'Cantidad', '%']],
      body: resumen.desglose.porCategoria.slice(0, 5).map(cat => [
        cat.categoria,
        cat.cantidad.toString(),
        `${cat.porcentaje}%`,
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: COLORS.primary,
        textColor: COLORS.white,
      },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: MARGINS.left },
    });
  }
  
  // Footer
  dibujarFooter(doc, resumen.generadoPor, resumen.fechaGeneracion);
  
  // Descargar
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`${config.nombreArchivo}_${fecha}.pdf`);
}

// =============================================================================
// EXPORTACIÓN DE LISTADO DE INCIDENCIAS A PDF
// =============================================================================

/**
 * Genera PDF con listado de incidencias.
 */
export async function exportarIncidenciasPDF(
  filas: FilaIncidenciaExcel[],
  config: ConfigExportPDF = {
    nombreArchivo: 'listado-incidencias',
    titulo: 'Listado de Incidencias',
    incluirLogo: true,
    orientacion: 'landscape',
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: config.orientacion || 'landscape',
    unit: 'mm',
    format: 'a4',
  });
  
  // Header
  let yPos = await dibujarHeaderInstitucional(doc, config.titulo, config.subtitulo, config.incluirLogo);
  yPos += 5;
  
  // Tabla de incidencias
  const tableBody = filas.map(fila => [
    fila.codigo,
    fila.activoCodigo,
    fila.criticidad === 'critica' ? 'Crítica' : 'Normal',
    ETIQUETAS_ESTADO_INCIDENCIA[fila.estado] || fila.estado,
    fila.fechaRecepcion,
    fila.tiempoRespuestaHoras,
    fila.tiempoResolucionHoras,
    fila.cumpleSLA,
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [[
      'Código',
      'Activo',
      'Criticidad',
      'Estado',
      'Fecha Recepción',
      'T. Respuesta',
      'T. Resolución',
      'Cumple SLA',
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2,
      overflow: 'ellipsize',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: MARGINS.left, right: MARGINS.right },
    didDrawPage: (data) => {
      // Footer en cada página
      dibujarFooter(doc, 'Sistema', new Date());
    },
  });
  
  // Descargar
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`${config.nombreArchivo}_${fecha}.pdf`);
}

// =============================================================================
// EXPORTACIÓN DE RESUMEN DE FLOTA
// =============================================================================

/**
 * Genera PDF con resumen de estado de flota.
 */
export async function exportarResumenFlotaPDF(
  resumen: ResumenFlota,
  config: ConfigExportPDF = {
    nombreArchivo: 'resumen-flota',
    titulo: 'Estado de la Flota',
    incluirLogo: true,
    orientacion: 'portrait',
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: config.orientacion || 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  const periodoTexto = `${formatFechaPDF(resumen.periodo.desde)} - ${formatFechaPDF(resumen.periodo.hasta)}`;
  const subtitulo = resumen.operador 
    ? `${resumen.operador.nombre} | ${periodoTexto}`
    : `Todos los operadores | ${periodoTexto}`;
  
  let yPos = await dibujarHeaderInstitucional(doc, config.titulo, subtitulo, config.incluirLogo);
  yPos += 5;
  
  // KPIs de flota
  const kpiWidth = (pageWidth - MARGINS.left - MARGINS.right - 10) / 3;
  const kpiHeight = 35;
  
  const colorDisp = resumen.disponibilidad >= 90 ? COLORS.success 
    : resumen.disponibilidad >= 80 ? COLORS.accent : COLORS.danger;
  
  dibujarKPICard(doc, MARGINS.left, yPos, kpiWidth, kpiHeight, 
    'Disponibilidad', `${resumen.disponibilidad}%`, colorDisp);
  
  dibujarKPICard(doc, MARGINS.left + kpiWidth + 5, yPos, kpiWidth, kpiHeight, 
    'Total Autobuses', `${resumen.totales.autobuses}`, COLORS.primary);
  
  dibujarKPICard(doc, MARGINS.left + (kpiWidth + 5) * 2, yPos, kpiWidth, kpiHeight, 
    'Inc/Bus Promedio', `${resumen.incidenciasPorBus}`, COLORS.secondary);
  
  yPos += kpiHeight + 15;
  
  // Tabla de estado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Estado de Autobuses', MARGINS.left, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Estado', 'Cantidad', '%']],
    body: [
      ['Operativos', resumen.totales.operativos.toString(), 
        `${Math.round((resumen.totales.operativos / resumen.totales.autobuses) * 100)}%`],
      ['En Taller', resumen.totales.enTaller.toString(),
        `${Math.round((resumen.totales.enTaller / resumen.totales.autobuses) * 100)}%`],
      ['De Baja', resumen.totales.deBaja.toString(),
        `${Math.round((resumen.totales.deBaja / resumen.totales.autobuses) * 100)}%`],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: MARGINS.left },
    tableWidth: 120,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Top buses con más incidencias
  if (resumen.busesConMasIncidencias.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Autobuses con más Incidencias', MARGINS.left, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Código Bus', 'Nº Incidencias']],
      body: resumen.busesConMasIncidencias.map(bus => [
        bus.codigo,
        bus.incidencias.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, textColor: COLORS.white },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: MARGINS.left },
      tableWidth: 100,
    });
  }
  
  // Footer
  dibujarFooter(doc, resumen.generadoPor, resumen.fechaGeneracion);
  
  // Descargar
  const fecha = new Date().toISOString().slice(0, 10);
  doc.save(`${config.nombreArchivo}_${fecha}.pdf`);
}
