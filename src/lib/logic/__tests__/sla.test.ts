/**
 * =============================================================================
 * TESTS - LÓGICA DE SLA
 * =============================================================================
 * 
 * Tests para validar los cálculos de SLA (Service Level Agreement).
 * Usamos fechas fijas para que los tests sean deterministas.
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calcularVencimientoSLA,
  calcularMinutosLaborables,
  esDiaLaborable,
  estaEnHorarioServicio,
  horaAMinutos,
  avanzarASiguienteLaborable,
  minutosLaborablesDia,
  verificarEstadoSLA,
  SLA_TIEMPOS_DEFAULT,
  HORARIO_SERVICIO_DEFAULT,
  type HorarioServicio,
} from '../sla';

// =============================================================================
// CONFIGURACIÓN DE TESTS
// =============================================================================

// Horario estándar: Lunes a Viernes, 08:00 a 20:00
const HORARIO_STANDARD: HorarioServicio = {
  inicio: '08:00',
  fin: '20:00',
  diasLaborables: [1, 2, 3, 4, 5], // L-V
};

// =============================================================================
// TESTS: FUNCIONES AUXILIARES
// =============================================================================

describe('horaAMinutos', () => {
  it('convierte 00:00 a 0 minutos', () => {
    expect(horaAMinutos('00:00')).toBe(0);
  });

  it('convierte 08:00 a 480 minutos', () => {
    expect(horaAMinutos('08:00')).toBe(480);
  });

  it('convierte 12:30 a 750 minutos', () => {
    expect(horaAMinutos('12:30')).toBe(750);
  });

  it('convierte 20:00 a 1200 minutos', () => {
    expect(horaAMinutos('20:00')).toBe(1200);
  });

  it('convierte 23:59 a 1439 minutos', () => {
    expect(horaAMinutos('23:59')).toBe(1439);
  });
});

describe('esDiaLaborable', () => {
  const diasLaborables = [1, 2, 3, 4, 5]; // Lunes a Viernes

  it('detecta lunes como laborable', () => {
    // 2026-01-26 es lunes
    const lunes = new Date('2026-01-26T10:00:00');
    expect(esDiaLaborable(lunes, diasLaborables)).toBe(true);
  });

  it('detecta viernes como laborable', () => {
    // 2026-01-30 es viernes
    const viernes = new Date('2026-01-30T10:00:00');
    expect(esDiaLaborable(viernes, diasLaborables)).toBe(true);
  });

  it('detecta sábado como NO laborable', () => {
    // 2026-01-31 es sábado
    const sabado = new Date('2026-01-31T10:00:00');
    expect(esDiaLaborable(sabado, diasLaborables)).toBe(false);
  });

  it('detecta domingo como NO laborable', () => {
    // 2026-02-01 es domingo
    const domingo = new Date('2026-02-01T10:00:00');
    expect(esDiaLaborable(domingo, diasLaborables)).toBe(false);
  });
});

describe('estaEnHorarioServicio', () => {
  it('devuelve true para hora dentro del horario en día laborable', () => {
    // Lunes 26 enero 2026 a las 10:00
    const fecha = new Date('2026-01-26T10:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(true);
  });

  it('devuelve false para hora antes del inicio', () => {
    // Lunes 26 enero 2026 a las 07:00
    const fecha = new Date('2026-01-26T07:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(false);
  });

  it('devuelve false para hora después del fin', () => {
    // Lunes 26 enero 2026 a las 21:00
    const fecha = new Date('2026-01-26T21:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(false);
  });

  it('devuelve false para día no laborable aunque esté en horario', () => {
    // Sábado 31 enero 2026 a las 10:00
    const fecha = new Date('2026-01-31T10:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(false);
  });

  it('devuelve true justo al inicio del horario', () => {
    const fecha = new Date('2026-01-26T08:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(true);
  });

  it('devuelve false justo al final del horario (borde exclusivo)', () => {
    const fecha = new Date('2026-01-26T20:00:00');
    expect(estaEnHorarioServicio(fecha, HORARIO_STANDARD)).toBe(false);
  });
});

describe('minutosLaborablesDia', () => {
  it('calcula correctamente para horario 08:00-20:00', () => {
    expect(minutosLaborablesDia(HORARIO_STANDARD)).toBe(720); // 12 horas
  });

  it('calcula correctamente para horario 09:00-18:00', () => {
    const horario: HorarioServicio = {
      inicio: '09:00',
      fin: '18:00',
      diasLaborables: [1, 2, 3, 4, 5],
    };
    expect(minutosLaborablesDia(horario)).toBe(540); // 9 horas
  });
});

describe('avanzarASiguienteLaborable', () => {
  it('no cambia fecha si ya está en horario laborable', () => {
    const fecha = new Date('2026-01-26T10:00:00'); // Lunes 10:00
    const resultado = avanzarASiguienteLaborable(fecha, HORARIO_STANDARD);
    expect(resultado.getTime()).toBe(fecha.getTime());
  });

  it('avanza de sábado a lunes 08:00', () => {
    const sabado = new Date('2026-01-31T10:00:00');
    const resultado = avanzarASiguienteLaborable(sabado, HORARIO_STANDARD);
    
    expect(resultado.getDay()).toBe(1); // Lunes
    expect(resultado.getHours()).toBe(8);
    expect(resultado.getMinutes()).toBe(0);
  });

  it('avanza de domingo a lunes 08:00', () => {
    const domingo = new Date('2026-02-01T15:00:00');
    const resultado = avanzarASiguienteLaborable(domingo, HORARIO_STANDARD);
    
    expect(resultado.getDay()).toBe(1); // Lunes
    expect(resultado.getHours()).toBe(8);
  });

  it('avanza de antes del horario al inicio del horario', () => {
    const fecha = new Date('2026-01-26T06:00:00'); // Lunes 06:00
    const resultado = avanzarASiguienteLaborable(fecha, HORARIO_STANDARD);
    
    expect(resultado.getHours()).toBe(8);
    expect(resultado.getMinutes()).toBe(0);
    expect(resultado.getDate()).toBe(26); // Mismo día
  });

  it('avanza de después del horario al siguiente día laborable', () => {
    const fecha = new Date('2026-01-26T21:00:00'); // Lunes 21:00
    const resultado = avanzarASiguienteLaborable(fecha, HORARIO_STANDARD);
    
    expect(resultado.getDate()).toBe(27); // Martes
    expect(resultado.getHours()).toBe(8);
  });

  it('viernes 22:00 avanza a lunes 08:00', () => {
    const viernes = new Date('2026-01-30T22:00:00');
    const resultado = avanzarASiguienteLaborable(viernes, HORARIO_STANDARD);
    
    expect(resultado.getDay()).toBe(1); // Lunes
    expect(resultado.getDate()).toBe(2); // 2 de febrero
    expect(resultado.getHours()).toBe(8);
  });
});

// =============================================================================
// TESTS: CÁLCULO DE VENCIMIENTO SLA
// =============================================================================

describe('calcularVencimientoSLA', () => {
  describe('Criticidad CRÍTICA (4h resolución, 30min atención)', () => {
    it('lunes 10:00 → vencimiento mismo día 14:00', () => {
      const fecha = new Date('2026-01-26T10:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'resolucion');
      
      // 4 horas después = 14:00
      expect(vencimiento.getHours()).toBe(14);
      expect(vencimiento.getDate()).toBe(26);
    });

    it('lunes 17:00 → vencimiento martes (cruza fin de día)', () => {
      const fecha = new Date('2026-01-26T17:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'resolucion');
      
      // 3h quedan hoy (17:00-20:00), 1h mañana → 09:00 martes
      expect(vencimiento.getDate()).toBe(27);
      expect(vencimiento.getHours()).toBe(9);
    });

    it('viernes 18:00 → vencimiento lunes (cruza fin de semana)', () => {
      const viernes = new Date('2026-01-30T18:00:00');
      const vencimiento = calcularVencimientoSLA(viernes, 'critica', 'resolucion');
      
      // 2h quedan viernes (18:00-20:00), 2h lunes → 10:00 lunes
      expect(vencimiento.getDay()).toBe(1); // Lunes
      expect(vencimiento.getHours()).toBe(10);
    });

    it('atención crítica: 30 minutos', () => {
      const fecha = new Date('2026-01-26T10:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'atencion');
      
      expect(vencimiento.getHours()).toBe(10);
      expect(vencimiento.getMinutes()).toBe(30);
    });
  });

  describe('Criticidad NORMAL (24h resolución, 2h atención)', () => {
    it('lunes 08:00 → vencimiento martes 20:00 (24h laborables)', () => {
      const fecha = new Date('2026-01-26T08:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'normal', 'resolucion');
      
      // 24h = 1440 min, día tiene 720 min → 2 días completos
      // Lunes 08:00 + 12h = Lunes 20:00 (fin día)
      // + 12h más = Martes 20:00
      expect(vencimiento.getDate()).toBe(27);
      expect(vencimiento.getHours()).toBe(20);
    });

    it('atención normal: 2 horas', () => {
      const fecha = new Date('2026-01-26T10:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'normal', 'atencion');
      
      expect(vencimiento.getHours()).toBe(12);
      expect(vencimiento.getDate()).toBe(26);
    });
  });

  describe('Casos de borde: fuera de horario', () => {
    it('sábado 15:00 → empieza a contar lunes 08:00', () => {
      const sabado = new Date('2026-01-31T15:00:00');
      const vencimiento = calcularVencimientoSLA(sabado, 'critica', 'atencion');
      
      // Debería ser lunes 08:30 (30min de atención crítica)
      expect(vencimiento.getDay()).toBe(1); // Lunes
      expect(vencimiento.getHours()).toBe(8);
      expect(vencimiento.getMinutes()).toBe(30);
    });

    it('viernes 22:00 → empieza a contar lunes 08:00', () => {
      const viernes = new Date('2026-01-30T22:00:00');
      const vencimiento = calcularVencimientoSLA(viernes, 'critica', 'atencion');
      
      // Debería ser lunes 08:30
      expect(vencimiento.getDay()).toBe(1);
      expect(vencimiento.getHours()).toBe(8);
      expect(vencimiento.getMinutes()).toBe(30);
    });

    it('lunes 06:00 (antes de horario) → empieza a contar 08:00', () => {
      const fecha = new Date('2026-01-26T06:00:00');
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'atencion');
      
      expect(vencimiento.getHours()).toBe(8);
      expect(vencimiento.getMinutes()).toBe(30);
    });
  });

  describe('Configuración personalizada', () => {
    it('usa tiempos personalizados cuando se proporcionan', () => {
      const fecha = new Date('2026-01-26T10:00:00');
      const config = {
        tiempos: {
          critica: { atencion: 15, resolucion: 60 }, // 15min, 1h
          normal: { atencion: 60, resolucion: 480 },
        },
      };
      
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'resolucion', config);
      
      // 1 hora después = 11:00
      expect(vencimiento.getHours()).toBe(11);
    });

    it('usa horario personalizado', () => {
      const fecha = new Date('2026-01-26T10:00:00');
      const config = {
        horario: {
          inicio: '09:00',
          fin: '17:00', // Jornada más corta
          diasLaborables: [1, 2, 3, 4, 5],
        },
      };
      
      const vencimiento = calcularVencimientoSLA(fecha, 'critica', 'resolucion', config);
      
      // Con fin a las 17:00, 4h desde 10:00 = 14:00
      expect(vencimiento.getHours()).toBe(14);
    });
  });
});

// =============================================================================
// TESTS: CÁLCULO DE MINUTOS LABORABLES
// =============================================================================

describe('calcularMinutosLaborables', () => {
  it('calcula correctamente dentro del mismo día', () => {
    const inicio = new Date('2026-01-26T10:00:00');
    const fin = new Date('2026-01-26T12:00:00');
    
    const minutos = calcularMinutosLaborables(inicio, fin, HORARIO_STANDARD);
    
    expect(minutos).toBe(120); // 2 horas
  });

  it('calcula correctamente cruzando días', () => {
    const inicio = new Date('2026-01-26T18:00:00'); // Lunes 18:00
    const fin = new Date('2026-01-27T10:00:00');     // Martes 10:00
    
    const minutos = calcularMinutosLaborables(inicio, fin, HORARIO_STANDARD);
    
    // Lunes: 18:00-20:00 = 2h = 120min
    // Martes: 08:00-10:00 = 2h = 120min
    expect(minutos).toBe(240);
  });

  it('calcula correctamente cruzando fin de semana', () => {
    const viernes = new Date('2026-01-30T18:00:00'); // Viernes 18:00
    const lunes = new Date('2026-02-02T10:00:00');   // Lunes 10:00
    
    const minutos = calcularMinutosLaborables(viernes, lunes, HORARIO_STANDARD);
    
    // Viernes: 18:00-20:00 = 2h = 120min
    // Lunes: 08:00-10:00 = 2h = 120min
    expect(minutos).toBe(240);
  });

  it('devuelve 0 si inicio y fin son iguales', () => {
    const fecha = new Date('2026-01-26T10:00:00');
    
    const minutos = calcularMinutosLaborables(fecha, fecha, HORARIO_STANDARD);
    
    expect(minutos).toBe(0);
  });

  it('ignora tiempo fuera de horario', () => {
    const inicio = new Date('2026-01-26T19:00:00'); // Lunes 19:00
    const fin = new Date('2026-01-26T21:00:00');     // Lunes 21:00
    
    const minutos = calcularMinutosLaborables(inicio, fin, HORARIO_STANDARD);
    
    // Solo cuenta 19:00-20:00 = 1h
    expect(minutos).toBe(60);
  });
});

// =============================================================================
// TESTS: VERIFICACIÓN DE ESTADO SLA
// =============================================================================

describe('verificarEstadoSLA', () => {
  it('devuelve dentroSLA=true si no ha vencido', () => {
    const fechaApertura = new Date('2026-01-26T10:00:00');
    const fechaActual = new Date('2026-01-26T11:00:00'); // 1h después
    
    const resultado = verificarEstadoSLA(
      fechaApertura,
      fechaActual,
      'critica',
      'resolucion',
      { horario: HORARIO_STANDARD }
    );
    
    expect(resultado.dentroSLA).toBe(true);
    expect(resultado.minutosRestantes).toBeGreaterThan(0);
  });

  it('devuelve dentroSLA=false si ha vencido', () => {
    const fechaApertura = new Date('2026-01-26T10:00:00');
    const fechaActual = new Date('2026-01-26T15:00:00'); // 5h después
    
    const resultado = verificarEstadoSLA(
      fechaApertura,
      fechaActual,
      'critica',
      'resolucion', // 4h
      { horario: HORARIO_STANDARD }
    );
    
    expect(resultado.dentroSLA).toBe(false);
    expect(resultado.minutosRestantes).toBeLessThan(0);
  });

  it('calcula porcentaje correctamente', () => {
    const fechaApertura = new Date('2026-01-26T10:00:00');
    const fechaActual = new Date('2026-01-26T12:00:00'); // 2h después
    
    const resultado = verificarEstadoSLA(
      fechaApertura,
      fechaActual,
      'critica',
      'resolucion', // 4h = 240min
      { horario: HORARIO_STANDARD }
    );
    
    // 2h de 4h = 50%
    expect(resultado.porcentajeUsado).toBe(50);
    expect(resultado.minutosTranscurridos).toBe(120);
  });
});

// =============================================================================
// TESTS: VALORES POR DEFECTO
// =============================================================================

describe('Constantes SLA', () => {
  it('SLA_TIEMPOS_DEFAULT tiene valores correctos para crítica', () => {
    expect(SLA_TIEMPOS_DEFAULT.critica.atencion).toBe(30);
    expect(SLA_TIEMPOS_DEFAULT.critica.resolucion).toBe(240);
  });

  it('SLA_TIEMPOS_DEFAULT tiene valores correctos para normal', () => {
    expect(SLA_TIEMPOS_DEFAULT.normal.atencion).toBe(120);
    expect(SLA_TIEMPOS_DEFAULT.normal.resolucion).toBe(1440);
  });

  it('HORARIO_SERVICIO_DEFAULT es Lunes a Viernes 08:00-20:00', () => {
    expect(HORARIO_SERVICIO_DEFAULT.inicio).toBe('08:00');
    expect(HORARIO_SERVICIO_DEFAULT.fin).toBe('20:00');
    expect(HORARIO_SERVICIO_DEFAULT.diasLaborables).toEqual([1, 2, 3, 4, 5]);
  });
});
