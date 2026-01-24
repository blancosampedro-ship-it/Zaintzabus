/**
 * =============================================================================
 * TIPOS PARA GENERACIÓN DE INFORMES - ZaintzaBus
 * =============================================================================
 */

import type { Criticidad, EstadoIncidencia } from '@/types';

// =============================================================================
// TIPOS DE FILA PARA EXCEL
// =============================================================================

/**
 * Fila del informe de histórico de incidencias.
 */
export interface FilaIncidenciaExcel {
  codigo: string;
  activoCodigo: string;
  tipo: 'correctiva' | 'preventiva';
  criticidad: Criticidad;
  categoriaFallo: string;
  estado: EstadoIncidencia;
  fechaRecepcion: string;       // ISO format
  fechaCierre: string | null;
  tiempoRespuestaMin: number | null;
  tiempoResolucionMin: number | null;
  tiempoRespuestaHoras: string;
  tiempoResolucionHoras: string;
  cumpleSLA: 'Sí' | 'No' | 'Pendiente';
  operador?: string;
}

/**
 * Fila del informe de estado de flota.
 */
export interface FilaFlotaExcel {
  codigo: string;
  matricula: string;
  operador: string;
  estado: string;
  fechaUltimaIncidencia: string | null;
  incidenciasAbiertas: number;
  incidenciasHistoricas: number;
  disponibilidadMes: number; // porcentaje
}

// =============================================================================
// TIPOS DE RESUMEN PARA PDF
// =============================================================================

/**
 * Datos para el resumen ejecutivo de SLA.
 */
export interface ResumenEjecutivoSLA {
  periodo: {
    desde: Date;
    hasta: Date;
  };
  operador?: {
    id: string;
    nombre: string;
  };
  kpis: {
    disponibilidadFlota: number;        // %
    cumplimientoSLA: number;            // %
    mttr: number;                       // minutos laborables
    mttrHoras: string;                  // formato legible
    totalIncidencias: number;
    incidenciasResueltas: number;
    incidenciasPendientes: number;
    incidenciasCriticas: number;
    incidenciasFueraSLA: number;
  };
  desglose: {
    porCriticidad: {
      criticas: { total: number; dentroDeSLA: number };
      normales: { total: number; dentroDeSLA: number };
    };
    porCategoria: Array<{
      categoria: string;
      cantidad: number;
      porcentaje: number;
    }>;
  };
  generadoPor: string;
  fechaGeneracion: Date;
}

/**
 * Resumen de flota para PDF.
 */
export interface ResumenFlota {
  periodo: {
    desde: Date;
    hasta: Date;
  };
  operador?: {
    id: string;
    nombre: string;
  };
  totales: {
    autobuses: number;
    operativos: number;
    enTaller: number;
    deBaja: number;
  };
  disponibilidad: number; // %
  incidenciasPorBus: number; // promedio
  busesConMasIncidencias: Array<{
    codigo: string;
    incidencias: number;
  }>;
  generadoPor: string;
  fechaGeneracion: Date;
}

// =============================================================================
// TIPOS DE FILTROS
// =============================================================================

export interface FiltrosInforme {
  fechaDesde: Date;
  fechaHasta: Date;
  operadorId?: string;
  criticidad?: Criticidad;
  estado?: EstadoIncidencia[];
  soloFueraSLA?: boolean;
}

// =============================================================================
// TIPOS DE CONFIGURACIÓN DE EXPORTACIÓN
// =============================================================================

export interface ConfigExportExcel {
  nombreArchivo: string;
  nombreHoja: string;
  incluirResumen?: boolean;
}

export interface ConfigExportPDF {
  nombreArchivo: string;
  titulo: string;
  subtitulo?: string;
  incluirLogo?: boolean;
  orientacion?: 'portrait' | 'landscape';
}
