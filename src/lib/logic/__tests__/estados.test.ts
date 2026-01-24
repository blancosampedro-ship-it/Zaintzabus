/**
 * =============================================================================
 * TESTS - LÓGICA DE ESTADOS Y TRANSICIONES
 * =============================================================================
 * 
 * Tests para validar las máquinas de estado de incidencias, inventario y activos.
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
  // Incidencias
  esTransicionValidaIncidencia,
  obtenerSiguientesEstadosIncidencia,
  puedeRealizarTransicionIncidencia,
  TRANSICIONES_INCIDENCIA,
  PERMISOS_TRANSICION_INCIDENCIA,
  ETIQUETAS_ESTADO_INCIDENCIA,
  getColorEstadoIncidencia,
  getIconoEstadoIncidencia,
  
  // Inventario
  esTransicionValidaInventario,
  obtenerSiguientesEstadosInventario,
  validarMovimientoEquipo,
  TRANSICIONES_INVENTARIO,
  ETIQUETAS_ESTADO_INVENTARIO,
  
  // Activos
  esTransicionValidaActivo,
  obtenerSiguientesEstadosActivo,
  TRANSICIONES_ACTIVO,
  ETIQUETAS_ESTADO_ACTIVO,
} from '../estados';

// =============================================================================
// TESTS: TRANSICIONES DE INCIDENCIAS
// =============================================================================

describe('esTransicionValidaIncidencia', () => {
  describe('Transiciones permitidas', () => {
    it('permite nueva → en_analisis', () => {
      expect(esTransicionValidaIncidencia('nueva', 'en_analisis')).toBe(true);
    });

    it('permite nueva → cerrada (falsa alarma)', () => {
      expect(esTransicionValidaIncidencia('nueva', 'cerrada')).toBe(true);
    });

    it('permite en_analisis → en_intervencion', () => {
      expect(esTransicionValidaIncidencia('en_analisis', 'en_intervencion')).toBe(true);
    });

    it('permite en_analisis → nueva (devolver)', () => {
      expect(esTransicionValidaIncidencia('en_analisis', 'nueva')).toBe(true);
    });

    it('permite en_intervencion → resuelta', () => {
      expect(esTransicionValidaIncidencia('en_intervencion', 'resuelta')).toBe(true);
    });

    it('permite en_intervencion → en_analisis (necesita más análisis)', () => {
      expect(esTransicionValidaIncidencia('en_intervencion', 'en_analisis')).toBe(true);
    });

    it('permite resuelta → cerrada', () => {
      expect(esTransicionValidaIncidencia('resuelta', 'cerrada')).toBe(true);
    });

    it('permite resuelta → reabierta', () => {
      expect(esTransicionValidaIncidencia('resuelta', 'reabierta')).toBe(true);
    });

    it('permite cerrada → reabierta', () => {
      expect(esTransicionValidaIncidencia('cerrada', 'reabierta')).toBe(true);
    });

    it('permite reabierta → en_analisis', () => {
      expect(esTransicionValidaIncidencia('reabierta', 'en_analisis')).toBe(true);
    });
  });

  describe('Transiciones NO permitidas', () => {
    it('NO permite nueva → resuelta (saltar pasos)', () => {
      expect(esTransicionValidaIncidencia('nueva', 'resuelta')).toBe(false);
    });

    it('NO permite nueva → en_intervencion (saltar análisis)', () => {
      expect(esTransicionValidaIncidencia('nueva', 'en_intervencion')).toBe(false);
    });

    it('NO permite en_analisis → resuelta (saltar intervención)', () => {
      expect(esTransicionValidaIncidencia('en_analisis', 'resuelta')).toBe(false);
    });

    it('NO permite en_analisis → cerrada (debe resolver primero)', () => {
      expect(esTransicionValidaIncidencia('en_analisis', 'cerrada')).toBe(false);
    });

    it('NO permite en_intervencion → cerrada (debe resolver primero)', () => {
      expect(esTransicionValidaIncidencia('en_intervencion', 'cerrada')).toBe(false);
    });

    it('NO permite cerrada → nueva (flujo incorrecto)', () => {
      expect(esTransicionValidaIncidencia('cerrada', 'nueva')).toBe(false);
    });

    it('NO permite resuelta → nueva (debe reabrir)', () => {
      expect(esTransicionValidaIncidencia('resuelta', 'nueva')).toBe(false);
    });

    it('NO permite mismo estado', () => {
      expect(esTransicionValidaIncidencia('nueva', 'nueva')).toBe(false);
      expect(esTransicionValidaIncidencia('en_analisis', 'en_analisis')).toBe(false);
    });
  });
});

describe('obtenerSiguientesEstadosIncidencia', () => {
  it('desde nueva puede ir a [en_analisis, cerrada]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('nueva');
    expect(estados).toContain('en_analisis');
    expect(estados).toContain('cerrada');
    expect(estados).toHaveLength(2);
  });

  it('desde en_analisis puede ir a [en_intervencion, nueva]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('en_analisis');
    expect(estados).toContain('en_intervencion');
    expect(estados).toContain('nueva');
    expect(estados).toHaveLength(2);
  });

  it('desde en_intervencion puede ir a [resuelta, en_analisis]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('en_intervencion');
    expect(estados).toContain('resuelta');
    expect(estados).toContain('en_analisis');
    expect(estados).toHaveLength(2);
  });

  it('desde resuelta puede ir a [cerrada, reabierta]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('resuelta');
    expect(estados).toContain('cerrada');
    expect(estados).toContain('reabierta');
    expect(estados).toHaveLength(2);
  });

  it('desde cerrada solo puede ir a [reabierta]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('cerrada');
    expect(estados).toEqual(['reabierta']);
  });

  it('desde reabierta puede ir a [en_analisis]', () => {
    const estados = obtenerSiguientesEstadosIncidencia('reabierta');
    expect(estados).toEqual(['en_analisis']);
  });

  describe('filtrado por rol', () => {
    it('tecnico puede: nueva → en_analisis', () => {
      const estados = obtenerSiguientesEstadosIncidencia('nueva', 'tecnico');
      expect(estados).toContain('en_analisis');
      expect(estados).not.toContain('cerrada'); // Solo admin/jefe
    });

    it('admin puede: nueva → en_analisis y cerrada', () => {
      const estados = obtenerSiguientesEstadosIncidencia('nueva', 'admin');
      expect(estados).toContain('en_analisis');
      expect(estados).toContain('cerrada');
    });

    it('operador puede: resuelta → cerrada', () => {
      const estados = obtenerSiguientesEstadosIncidencia('resuelta', 'operador');
      expect(estados).toContain('cerrada');
    });
  });
});

describe('puedeRealizarTransicionIncidencia', () => {
  describe('Permisos de técnico', () => {
    it('técnico PUEDE: nueva → en_analisis', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'en_analisis', 'tecnico')).toBe(true);
    });

    it('técnico PUEDE: en_intervencion → resuelta', () => {
      expect(puedeRealizarTransicionIncidencia('en_intervencion', 'resuelta', 'tecnico')).toBe(true);
    });

    it('técnico NO PUEDE: nueva → cerrada', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'cerrada', 'tecnico')).toBe(false);
    });

    it('técnico NO PUEDE: resuelta → cerrada', () => {
      expect(puedeRealizarTransicionIncidencia('resuelta', 'cerrada', 'tecnico')).toBe(false);
    });
  });

  describe('Permisos de operador', () => {
    it('operador PUEDE: resuelta → cerrada', () => {
      expect(puedeRealizarTransicionIncidencia('resuelta', 'cerrada', 'operador')).toBe(true);
    });

    it('operador PUEDE: resuelta → reabierta', () => {
      expect(puedeRealizarTransicionIncidencia('resuelta', 'reabierta', 'operador')).toBe(true);
    });

    it('operador NO PUEDE: nueva → en_analisis', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'en_analisis', 'operador')).toBe(false);
    });
  });

  describe('Permisos de admin', () => {
    it('admin PUEDE hacer cualquier transición válida', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'en_analisis', 'admin')).toBe(true);
      expect(puedeRealizarTransicionIncidencia('nueva', 'cerrada', 'admin')).toBe(true);
      expect(puedeRealizarTransicionIncidencia('resuelta', 'cerrada', 'admin')).toBe(true);
      expect(puedeRealizarTransicionIncidencia('cerrada', 'reabierta', 'admin')).toBe(true);
    });

    it('admin NO PUEDE hacer transiciones inválidas', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'resuelta', 'admin')).toBe(false);
    });
  });

  describe('Permisos de jefe_mantenimiento', () => {
    it('jefe_mantenimiento tiene mismos permisos que admin', () => {
      expect(puedeRealizarTransicionIncidencia('nueva', 'cerrada', 'jefe_mantenimiento')).toBe(true);
      expect(puedeRealizarTransicionIncidencia('cerrada', 'reabierta', 'jefe_mantenimiento')).toBe(true);
    });
  });
});

// =============================================================================
// TESTS: TRANSICIONES DE INVENTARIO
// =============================================================================

describe('esTransicionValidaInventario', () => {
  describe('Desde instalado', () => {
    it('permite instalado → almacen', () => {
      expect(esTransicionValidaInventario('instalado', 'almacen')).toBe(true);
    });

    it('permite instalado → reparacion', () => {
      expect(esTransicionValidaInventario('instalado', 'reparacion')).toBe(true);
    });

    it('permite instalado → baja', () => {
      expect(esTransicionValidaInventario('instalado', 'baja')).toBe(true);
    });
  });

  describe('Desde almacen', () => {
    it('permite almacen → instalado', () => {
      expect(esTransicionValidaInventario('almacen', 'instalado')).toBe(true);
    });

    it('permite almacen → reparacion', () => {
      expect(esTransicionValidaInventario('almacen', 'reparacion')).toBe(true);
    });

    it('permite almacen → baja', () => {
      expect(esTransicionValidaInventario('almacen', 'baja')).toBe(true);
    });
  });

  describe('Desde reparacion', () => {
    it('permite reparacion → almacen', () => {
      expect(esTransicionValidaInventario('reparacion', 'almacen')).toBe(true);
    });

    it('NO permite reparacion → instalado (debe pasar por almacén)', () => {
      expect(esTransicionValidaInventario('reparacion', 'instalado')).toBe(false);
    });

    it('permite reparacion → baja', () => {
      expect(esTransicionValidaInventario('reparacion', 'baja')).toBe(true);
    });
  });

  describe('Desde baja', () => {
    it('baja es estado final - no permite ninguna transición', () => {
      expect(esTransicionValidaInventario('baja', 'instalado')).toBe(false);
      expect(esTransicionValidaInventario('baja', 'almacen')).toBe(false);
      expect(esTransicionValidaInventario('baja', 'reparacion')).toBe(false);
    });
  });
});

describe('validarMovimientoEquipo', () => {
  it('equipo en almacén puede ir a autobús', () => {
    const resultado = validarMovimientoEquipo('almacen', 'autobus');
    expect(resultado.valido).toBe(true);
    expect(resultado.estadoResultante).toBe('instalado');
  });

  it('equipo instalado puede ir a almacén', () => {
    const resultado = validarMovimientoEquipo('instalado', 'almacen');
    expect(resultado.valido).toBe(true);
    expect(resultado.estadoResultante).toBe('almacen');
  });

  it('equipo instalado puede ir a proveedor (reparación)', () => {
    const resultado = validarMovimientoEquipo('instalado', 'proveedor');
    expect(resultado.valido).toBe(true);
    expect(resultado.estadoResultante).toBe('reparacion');
  });

  it('equipo en reparación NO puede ir directo a autobús', () => {
    const resultado = validarMovimientoEquipo('reparacion', 'autobus');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toContain('almacén');
  });

  it('equipo en reparación puede volver a almacén', () => {
    const resultado = validarMovimientoEquipo('reparacion', 'almacen');
    expect(resultado.valido).toBe(true);
    expect(resultado.estadoResultante).toBe('almacen');
  });

  it('equipo dado de baja NO puede moverse', () => {
    const resultado = validarMovimientoEquipo('baja', 'almacen');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toContain('baja');
  });
});

// =============================================================================
// TESTS: TRANSICIONES DE ACTIVOS
// =============================================================================

describe('esTransicionValidaActivo', () => {
  describe('Desde operativo', () => {
    it('permite operativo → en_taller', () => {
      expect(esTransicionValidaActivo('operativo', 'en_taller')).toBe(true);
    });

    it('permite operativo → averiado', () => {
      expect(esTransicionValidaActivo('operativo', 'averiado')).toBe(true);
    });

    it('permite operativo → baja', () => {
      expect(esTransicionValidaActivo('operativo', 'baja')).toBe(true);
    });
  });

  describe('Desde en_taller', () => {
    it('permite en_taller → operativo', () => {
      expect(esTransicionValidaActivo('en_taller', 'operativo')).toBe(true);
    });

    it('permite en_taller → averiado', () => {
      expect(esTransicionValidaActivo('en_taller', 'averiado')).toBe(true);
    });
  });

  describe('Desde averiado', () => {
    it('permite averiado → en_taller', () => {
      expect(esTransicionValidaActivo('averiado', 'en_taller')).toBe(true);
    });

    it('NO permite averiado → operativo directamente', () => {
      expect(esTransicionValidaActivo('averiado', 'operativo')).toBe(false);
    });
  });

  describe('Desde baja', () => {
    it('baja es estado final', () => {
      expect(esTransicionValidaActivo('baja', 'operativo')).toBe(false);
      expect(esTransicionValidaActivo('baja', 'en_taller')).toBe(false);
    });
  });
});

// =============================================================================
// TESTS: ETIQUETAS Y VISUALIZACIÓN
// =============================================================================

describe('ETIQUETAS_ESTADO_INCIDENCIA', () => {
  it('tiene etiquetas para todos los estados', () => {
    expect(ETIQUETAS_ESTADO_INCIDENCIA.nueva).toBe('Nueva');
    expect(ETIQUETAS_ESTADO_INCIDENCIA.en_analisis).toBe('En análisis');
    expect(ETIQUETAS_ESTADO_INCIDENCIA.en_intervencion).toBe('En intervención');
    expect(ETIQUETAS_ESTADO_INCIDENCIA.resuelta).toBe('Resuelta');
    expect(ETIQUETAS_ESTADO_INCIDENCIA.cerrada).toBe('Cerrada');
    expect(ETIQUETAS_ESTADO_INCIDENCIA.reabierta).toBe('Reabierta');
  });
});

describe('ETIQUETAS_ESTADO_INVENTARIO', () => {
  it('tiene etiquetas para todos los estados', () => {
    expect(ETIQUETAS_ESTADO_INVENTARIO.instalado).toBe('Instalado');
    expect(ETIQUETAS_ESTADO_INVENTARIO.almacen).toBe('En almacén');
    expect(ETIQUETAS_ESTADO_INVENTARIO.reparacion).toBe('En reparación');
    expect(ETIQUETAS_ESTADO_INVENTARIO.baja).toBe('Baja');
  });
});

describe('ETIQUETAS_ESTADO_ACTIVO', () => {
  it('tiene etiquetas para todos los estados', () => {
    expect(ETIQUETAS_ESTADO_ACTIVO.operativo).toBe('Operativo');
    expect(ETIQUETAS_ESTADO_ACTIVO.en_taller).toBe('En taller');
    expect(ETIQUETAS_ESTADO_ACTIVO.averiado).toBe('Averiado');
    expect(ETIQUETAS_ESTADO_ACTIVO.baja).toBe('Baja');
  });
});

describe('getColorEstadoIncidencia', () => {
  it('devuelve success para estados finalizados', () => {
    expect(getColorEstadoIncidencia('cerrada')).toBe('success');
    expect(getColorEstadoIncidencia('resuelta')).toBe('success');
  });

  it('devuelve danger para estados urgentes', () => {
    expect(getColorEstadoIncidencia('nueva')).toBe('danger');
    expect(getColorEstadoIncidencia('reabierta')).toBe('danger');
  });

  it('devuelve warning para en_intervencion', () => {
    expect(getColorEstadoIncidencia('en_intervencion')).toBe('warning');
  });

  it('devuelve info para en_analisis', () => {
    expect(getColorEstadoIncidencia('en_analisis')).toBe('info');
  });
});

describe('getIconoEstadoIncidencia', () => {
  it('devuelve iconos apropiados', () => {
    expect(getIconoEstadoIncidencia('nueva')).toBe('AlertTriangle');
    expect(getIconoEstadoIncidencia('en_analisis')).toBe('Search');
    expect(getIconoEstadoIncidencia('en_intervencion')).toBe('Wrench');
    expect(getIconoEstadoIncidencia('resuelta')).toBe('CheckCircle');
    expect(getIconoEstadoIncidencia('cerrada')).toBe('Archive');
    expect(getIconoEstadoIncidencia('reabierta')).toBe('RotateCcw');
  });
});

// =============================================================================
// TESTS: CONSTANTES
// =============================================================================

describe('TRANSICIONES_INCIDENCIA', () => {
  it('cubre todos los estados', () => {
    const estados = ['nueva', 'en_analisis', 'en_intervencion', 'resuelta', 'cerrada', 'reabierta'];
    estados.forEach(estado => {
      expect(TRANSICIONES_INCIDENCIA).toHaveProperty(estado);
    });
  });
});

describe('PERMISOS_TRANSICION_INCIDENCIA', () => {
  it('tiene permisos definidos para transiciones importantes', () => {
    expect(PERMISOS_TRANSICION_INCIDENCIA['nueva->en_analisis']).toBeDefined();
    expect(PERMISOS_TRANSICION_INCIDENCIA['nueva->cerrada']).toBeDefined();
    expect(PERMISOS_TRANSICION_INCIDENCIA['resuelta->cerrada']).toBeDefined();
  });
});
