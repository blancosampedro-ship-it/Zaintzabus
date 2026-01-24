/**
 * =============================================================================
 * TESTS - LÓGICA DE GENERACIÓN DE CÓDIGOS
 * =============================================================================
 * 
 * Tests para validar la generación y extracción de códigos internos.
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  // Generación
  generarCodigoIncidencia,
  generarCodigoOrdenTrabajo,
  generarCodigoEquipo,
  generarCodigoPreventivo,
  generarCodigoEjecucionPreventivo,
  generarCodigoMovimiento,
  
  // Extracción
  extraerCorrelativo,
  extraerAnio,
  extraerPrefijo,
  determinarTipoEntidad,
  
  // Validación
  esCodigoIncidenciaValido,
  esCodigoOrdenTrabajoValido,
  esCodigoEquipoValido,
  
  // Constantes
  PREFIJOS,
} from '../codigos';

// =============================================================================
// TESTS: GENERACIÓN DE CÓDIGOS DE INCIDENCIA
// =============================================================================

describe('generarCodigoIncidencia', () => {
  it('genera formato INC-{AÑO}-{CORRELATIVO}', () => {
    const codigo = generarCodigoIncidencia(1, 2026);
    expect(codigo).toBe('INC-2026-00001');
  });

  it('rellena con ceros hasta 5 dígitos', () => {
    expect(generarCodigoIncidencia(1, 2026)).toBe('INC-2026-00001');
    expect(generarCodigoIncidencia(12, 2026)).toBe('INC-2026-00012');
    expect(generarCodigoIncidencia(123, 2026)).toBe('INC-2026-00123');
    expect(generarCodigoIncidencia(1234, 2026)).toBe('INC-2026-01234');
    expect(generarCodigoIncidencia(12345, 2026)).toBe('INC-2026-12345');
  });

  it('maneja números mayores a 5 dígitos', () => {
    expect(generarCodigoIncidencia(123456, 2026)).toBe('INC-2026-123456');
  });

  it('incrementa correctamente de 00005 a 00006', () => {
    const codigo5 = generarCodigoIncidencia(5, 2026);
    const codigo6 = generarCodigoIncidencia(6, 2026);
    
    expect(codigo5).toBe('INC-2026-00005');
    expect(codigo6).toBe('INC-2026-00006');
  });

  it('maneja cambio de año', () => {
    const codigo2025 = generarCodigoIncidencia(100, 2025);
    const codigo2026 = generarCodigoIncidencia(1, 2026);
    
    expect(codigo2025).toBe('INC-2025-00100');
    expect(codigo2026).toBe('INC-2026-00001');
  });

  it('usa año actual si no se especifica', () => {
    const codigo = generarCodigoIncidencia(1);
    const anioActual = new Date().getFullYear();
    expect(codigo).toBe(`INC-${anioActual}-00001`);
  });
});

// =============================================================================
// TESTS: GENERACIÓN DE CÓDIGOS DE ORDEN DE TRABAJO
// =============================================================================

describe('generarCodigoOrdenTrabajo', () => {
  it('genera formato OT-{AÑO}-{CORRELATIVO}', () => {
    const codigo = generarCodigoOrdenTrabajo(1, 2026);
    expect(codigo).toBe('OT-2026-00001');
  });

  it('rellena con ceros hasta 5 dígitos', () => {
    expect(generarCodigoOrdenTrabajo(42, 2026)).toBe('OT-2026-00042');
  });

  it('usa año actual si no se especifica', () => {
    const codigo = generarCodigoOrdenTrabajo(1);
    const anioActual = new Date().getFullYear();
    expect(codigo).toBe(`OT-${anioActual}-00001`);
  });
});

// =============================================================================
// TESTS: GENERACIÓN DE CÓDIGOS DE EQUIPO
// =============================================================================

describe('generarCodigoEquipo', () => {
  it('genera formato {PREFIJO}-{BUS}-{INDICE} para cámara', () => {
    const codigo = generarCodigoEquipo('camara', '321', 1);
    expect(codigo).toBe('CAM-321-001');
  });

  it('usa prefijo correcto para cada tipo', () => {
    expect(generarCodigoEquipo('cpu', '321', 1)).toBe('CPU-321-001');
    expect(generarCodigoEquipo('amplificador', '321', 1)).toBe('AMP-321-001');
    expect(generarCodigoEquipo('switch', '321', 1)).toBe('SWT-321-001');
    expect(generarCodigoEquipo('router', '321', 1)).toBe('RTR-321-001');
    expect(generarCodigoEquipo('modulo_wifi', '321', 1)).toBe('WIF-321-001');
    expect(generarCodigoEquipo('validadora', '321', 1)).toBe('VAL-321-001');
    expect(generarCodigoEquipo('dvr', '321', 1)).toBe('DVR-321-001');
    expect(generarCodigoEquipo('pantalla', '321', 1)).toBe('PAN-321-001');
  });

  it('rellena índice con ceros hasta 3 dígitos', () => {
    expect(generarCodigoEquipo('camara', '321', 1)).toBe('CAM-321-001');
    expect(generarCodigoEquipo('camara', '321', 12)).toBe('CAM-321-012');
    expect(generarCodigoEquipo('camara', '321', 123)).toBe('CAM-321-123');
  });

  it('usa prefijo default para tipos desconocidos', () => {
    const codigo = generarCodigoEquipo('tipo_inexistente', '321', 1);
    expect(codigo).toBe('EQP-321-001');
  });

  it('maneja diferentes códigos de bus', () => {
    expect(generarCodigoEquipo('camara', '100', 1)).toBe('CAM-100-001');
    expect(generarCodigoEquipo('camara', '999', 1)).toBe('CAM-999-001');
    expect(generarCodigoEquipo('camara', 'A01', 1)).toBe('CAM-A01-001');
  });
});

// =============================================================================
// TESTS: GENERACIÓN DE CÓDIGOS DE PREVENTIVO
// =============================================================================

describe('generarCodigoPreventivo', () => {
  it('genera formato PRV-{CORRELATIVO}', () => {
    const codigo = generarCodigoPreventivo(1);
    expect(codigo).toBe('PRV-0001');
  });

  it('rellena con ceros hasta 4 dígitos', () => {
    expect(generarCodigoPreventivo(1)).toBe('PRV-0001');
    expect(generarCodigoPreventivo(99)).toBe('PRV-0099');
    expect(generarCodigoPreventivo(999)).toBe('PRV-0999');
    expect(generarCodigoPreventivo(9999)).toBe('PRV-9999');
  });
});

describe('generarCodigoEjecucionPreventivo', () => {
  it('genera formato EPR-{AÑOMES}-{CORRELATIVO}', () => {
    const fecha = new Date('2026-01-15');
    const codigo = generarCodigoEjecucionPreventivo(1, fecha);
    expect(codigo).toBe('EPR-202601-0001');
  });

  it('maneja meses con un dígito', () => {
    const enero = new Date('2026-01-15');
    const diciembre = new Date('2026-12-15');
    
    expect(generarCodigoEjecucionPreventivo(1, enero)).toBe('EPR-202601-0001');
    expect(generarCodigoEjecucionPreventivo(1, diciembre)).toBe('EPR-202612-0001');
  });
});

describe('generarCodigoMovimiento', () => {
  it('genera formato MOV-{AÑOMESDIA}-{CORRELATIVO}', () => {
    const fecha = new Date('2026-01-24');
    const codigo = generarCodigoMovimiento(1, fecha);
    expect(codigo).toBe('MOV-20260124-0001');
  });

  it('maneja días y meses con un dígito', () => {
    const fecha = new Date('2026-03-05');
    expect(generarCodigoMovimiento(1, fecha)).toBe('MOV-20260305-0001');
  });
});

// =============================================================================
// TESTS: EXTRACCIÓN DE DATOS
// =============================================================================

describe('extraerCorrelativo', () => {
  it('extrae correlativo de código de incidencia', () => {
    expect(extraerCorrelativo('INC-2026-00123')).toBe(123);
  });

  it('extrae correlativo de código de OT', () => {
    expect(extraerCorrelativo('OT-2026-00042')).toBe(42);
  });

  it('extrae correlativo de código de equipo', () => {
    expect(extraerCorrelativo('CAM-321-002')).toBe(2);
  });

  it('extrae correlativo de código de preventivo', () => {
    expect(extraerCorrelativo('PRV-0099')).toBe(99);
  });

  it('maneja códigos con ceros a la izquierda', () => {
    expect(extraerCorrelativo('INC-2026-00001')).toBe(1);
    expect(extraerCorrelativo('INC-2026-00010')).toBe(10);
    expect(extraerCorrelativo('INC-2026-00100')).toBe(100);
  });

  it('devuelve null para código inválido', () => {
    expect(extraerCorrelativo('INVALIDO')).toBeNull();
    expect(extraerCorrelativo('')).toBeNull();
  });
});

describe('extraerAnio', () => {
  it('extrae año de código de incidencia', () => {
    expect(extraerAnio('INC-2026-00123')).toBe(2026);
  });

  it('extrae año de código de OT', () => {
    expect(extraerAnio('OT-2025-00001')).toBe(2025);
  });

  it('devuelve null si no hay año', () => {
    expect(extraerAnio('CAM-321-002')).toBeNull();
    expect(extraerAnio('PRV-0001')).toBeNull();
  });

  it('maneja códigos de ejecución preventivo', () => {
    // EPR-202601-0001 → el año está embebido en 202601
    expect(extraerAnio('EPR-202601-0001')).toBeNull(); // 202601 no es un año válido
  });
});

describe('extraerPrefijo', () => {
  it('extrae prefijo de incidencia', () => {
    expect(extraerPrefijo('INC-2026-00123')).toBe('INC');
  });

  it('extrae prefijo de OT', () => {
    expect(extraerPrefijo('OT-2026-00001')).toBe('OT');
  });

  it('extrae prefijo de equipo', () => {
    expect(extraerPrefijo('CAM-321-001')).toBe('CAM');
    expect(extraerPrefijo('CPU-321-001')).toBe('CPU');
  });

  it('extrae prefijo de preventivo', () => {
    expect(extraerPrefijo('PRV-0001')).toBe('PRV');
    expect(extraerPrefijo('EPR-202601-0001')).toBe('EPR');
  });

  it('devuelve string vacío para código vacío', () => {
    expect(extraerPrefijo('')).toBe('');
  });
});

describe('determinarTipoEntidad', () => {
  it('detecta incidencias', () => {
    expect(determinarTipoEntidad('INC-2026-00001')).toBe('incidencia');
  });

  it('detecta órdenes de trabajo', () => {
    expect(determinarTipoEntidad('OT-2026-00001')).toBe('orden_trabajo');
  });

  it('detecta preventivos', () => {
    expect(determinarTipoEntidad('PRV-0001')).toBe('preventivo');
    expect(determinarTipoEntidad('EPR-202601-0001')).toBe('preventivo');
  });

  it('detecta movimientos', () => {
    expect(determinarTipoEntidad('MOV-20260124-0001')).toBe('movimiento');
  });

  it('detecta equipos', () => {
    expect(determinarTipoEntidad('CAM-321-001')).toBe('equipo');
    expect(determinarTipoEntidad('CPU-321-001')).toBe('equipo');
    expect(determinarTipoEntidad('AMP-321-001')).toBe('equipo');
    expect(determinarTipoEntidad('DVR-321-001')).toBe('equipo');
  });

  it('devuelve desconocido para código inválido', () => {
    expect(determinarTipoEntidad('XXX-123-456')).toBe('desconocido');
    expect(determinarTipoEntidad('INVALIDO')).toBe('desconocido');
  });
});

// =============================================================================
// TESTS: VALIDACIÓN DE CÓDIGOS
// =============================================================================

describe('esCodigoIncidenciaValido', () => {
  it('acepta códigos válidos', () => {
    expect(esCodigoIncidenciaValido('INC-2026-00001')).toBe(true);
    expect(esCodigoIncidenciaValido('INC-2025-12345')).toBe(true);
    expect(esCodigoIncidenciaValido('INC-2030-99999')).toBe(true);
  });

  it('rechaza códigos inválidos', () => {
    expect(esCodigoIncidenciaValido('INC-2026-0001')).toBe(false);  // 4 dígitos
    expect(esCodigoIncidenciaValido('INC-26-00001')).toBe(false);   // Año 2 dígitos
    expect(esCodigoIncidenciaValido('OT-2026-00001')).toBe(false);  // Prefijo incorrecto
    expect(esCodigoIncidenciaValido('INC202600001')).toBe(false);   // Sin guiones
    expect(esCodigoIncidenciaValido('')).toBe(false);
  });
});

describe('esCodigoOrdenTrabajoValido', () => {
  it('acepta códigos válidos', () => {
    expect(esCodigoOrdenTrabajoValido('OT-2026-00001')).toBe(true);
    expect(esCodigoOrdenTrabajoValido('OT-2025-12345')).toBe(true);
  });

  it('rechaza códigos inválidos', () => {
    expect(esCodigoOrdenTrabajoValido('INC-2026-00001')).toBe(false); // Prefijo incorrecto
    expect(esCodigoOrdenTrabajoValido('OT-2026-0001')).toBe(false);   // 4 dígitos
    expect(esCodigoOrdenTrabajoValido('')).toBe(false);
  });
});

describe('esCodigoEquipoValido', () => {
  it('acepta códigos válidos', () => {
    expect(esCodigoEquipoValido('CAM-321-001')).toBe(true);
    expect(esCodigoEquipoValido('CPU-999-123')).toBe(true);
    expect(esCodigoEquipoValido('AMP-100-001')).toBe(true);
  });

  it('rechaza códigos inválidos', () => {
    expect(esCodigoEquipoValido('INC-2026-00001')).toBe(false); // No es equipo
    expect(esCodigoEquipoValido('CAM-321-01')).toBe(false);      // 2 dígitos
    expect(esCodigoEquipoValido('')).toBe(false);
  });
});

// =============================================================================
// TESTS: CONSTANTES
// =============================================================================

describe('PREFIJOS', () => {
  it('tiene prefijo de incidencia', () => {
    expect(PREFIJOS.INCIDENCIA).toBe('INC');
  });

  it('tiene prefijo de orden de trabajo', () => {
    expect(PREFIJOS.ORDEN_TRABAJO).toBe('OT');
  });

  it('tiene prefijos de equipos', () => {
    expect(PREFIJOS.EQUIPO.camara).toBe('CAM');
    expect(PREFIJOS.EQUIPO.cpu).toBe('CPU');
    expect(PREFIJOS.EQUIPO.amplificador).toBe('AMP');
    expect(PREFIJOS.EQUIPO.switch).toBe('SWT');
    expect(PREFIJOS.EQUIPO.router).toBe('RTR');
    expect(PREFIJOS.EQUIPO.modulo_wifi).toBe('WIF');
    expect(PREFIJOS.EQUIPO.validadora).toBe('VAL');
    expect(PREFIJOS.EQUIPO.dvr).toBe('DVR');
    expect(PREFIJOS.EQUIPO.pantalla).toBe('PAN');
    expect(PREFIJOS.EQUIPO.default).toBe('EQP');
  });

  it('tiene prefijo de preventivo', () => {
    expect(PREFIJOS.PREVENTIVO).toBe('PRV');
    expect(PREFIJOS.EJECUCION_PREVENTIVO).toBe('EPR');
  });

  it('tiene prefijo de movimiento', () => {
    expect(PREFIJOS.MOVIMIENTO).toBe('MOV');
  });
});

// =============================================================================
// TESTS: CASOS ESPECIALES
// =============================================================================

describe('Casos especiales de generación', () => {
  it('el primer código del año siempre es 00001', () => {
    expect(generarCodigoIncidencia(1, 2025)).toBe('INC-2025-00001');
    expect(generarCodigoIncidencia(1, 2026)).toBe('INC-2026-00001');
    expect(generarCodigoIncidencia(1, 2027)).toBe('INC-2027-00001');
  });

  it('correlativo 0 genera 00000', () => {
    expect(generarCodigoIncidencia(0, 2026)).toBe('INC-2026-00000');
  });

  it('correlativo negativo genera código con signo', () => {
    // Este es un edge case - la lógica debería validar antes
    const codigo = generarCodigoIncidencia(-1, 2026);
    expect(codigo).toBe('INC-2026-000-1');
  });
});
