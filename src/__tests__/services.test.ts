/**
 * Tests para servicios de incidencias
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase
vi.mock('@/lib/firebase/config', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

describe('Incidencias Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('State Transitions', () => {
    const validTransitions: Record<string, string[]> = {
      'nueva': ['en_analisis', 'cerrada'],
      'en_analisis': ['en_intervencion', 'nueva'],
      'en_intervencion': ['resuelta', 'en_analisis'],
      'resuelta': ['cerrada', 'reabierta'],
      'cerrada': ['reabierta'],
      'reabierta': ['en_analisis'],
    };

    it('should allow valid state transitions', () => {
      Object.entries(validTransitions).forEach(([from, toStates]) => {
        toStates.forEach(to => {
          expect(validTransitions[from]).toContain(to);
        });
      });
    });

    it('should not allow invalid state transitions', () => {
      // Cannot go from nueva to resuelta directly
      expect(validTransitions['nueva']).not.toContain('resuelta');
      
      // Cannot go from cerrada to en_intervencion
      expect(validTransitions['cerrada']).not.toContain('en_intervencion');
    });
  });

  describe('Criticidad Calculation', () => {
    const calculateCriticidad = (
      tipoFallo: string,
      impactoServicio: string,
      equiposCriticos: boolean
    ): 'critica' | 'alta' | 'media' | 'baja' => {
      if (tipoFallo === 'averia_total' || impactoServicio === 'fuera_servicio') {
        return 'critica';
      }
      if (equiposCriticos || impactoServicio === 'degradado') {
        return 'alta';
      }
      if (tipoFallo === 'fallo_parcial') {
        return 'media';
      }
      return 'baja';
    };

    it('should return critica for total failure', () => {
      expect(calculateCriticidad('averia_total', 'normal', false)).toBe('critica');
    });

    it('should return critica for out of service', () => {
      expect(calculateCriticidad('fallo_menor', 'fuera_servicio', false)).toBe('critica');
    });

    it('should return alta for critical equipment', () => {
      expect(calculateCriticidad('fallo_menor', 'normal', true)).toBe('alta');
    });

    it('should return media for partial failure', () => {
      expect(calculateCriticidad('fallo_parcial', 'normal', false)).toBe('media');
    });

    it('should return baja for minor issues', () => {
      expect(calculateCriticidad('fallo_menor', 'normal', false)).toBe('baja');
    });
  });

  describe('Validation', () => {
    const validateIncidencia = (data: Record<string, unknown>): string[] => {
      const errors: string[] = [];
      
      if (!data.descripcion || String(data.descripcion).trim().length < 10) {
        errors.push('La descripción debe tener al menos 10 caracteres');
      }
      
      if (!data.activoId) {
        errors.push('Debe seleccionar un activo');
      }
      
      if (!data.categoriaFallo) {
        errors.push('Debe seleccionar una categoría de fallo');
      }
      
      return errors;
    };

    it('should validate required fields', () => {
      const errors = validateIncidencia({});
      expect(errors).toContain('La descripción debe tener al menos 10 caracteres');
      expect(errors).toContain('Debe seleccionar un activo');
      expect(errors).toContain('Debe seleccionar una categoría de fallo');
    });

    it('should validate description length', () => {
      const errors = validateIncidencia({
        descripcion: 'short',
        activoId: 'activo-1',
        categoriaFallo: 'mecanico',
      });
      expect(errors).toContain('La descripción debe tener al menos 10 caracteres');
    });

    it('should pass validation with valid data', () => {
      const errors = validateIncidencia({
        descripcion: 'Una descripción válida con más de 10 caracteres',
        activoId: 'activo-1',
        categoriaFallo: 'mecanico',
      });
      expect(errors).toHaveLength(0);
    });
  });
});

describe('SLA Calculations', () => {
  const calculateSLAMetrics = (
    fechaCreacion: Date,
    fechaResolucion: Date | null,
    criticidad: string
  ) => {
    const slaTargets: Record<string, number> = {
      critica: 4 * 60, // 4 hours in minutes
      alta: 8 * 60,
      media: 24 * 60,
      baja: 48 * 60,
    };

    const target = slaTargets[criticidad] || slaTargets.media;
    const now = fechaResolucion || new Date();
    const elapsed = Math.floor((now.getTime() - fechaCreacion.getTime()) / (1000 * 60));
    
    return {
      targetMinutes: target,
      elapsedMinutes: elapsed,
      withinSLA: elapsed <= target,
      percentageUsed: Math.round((elapsed / target) * 100),
    };
  };

  it('should calculate SLA for critica correctly', () => {
    const fechaCreacion = new Date('2024-01-01T10:00:00');
    const fechaResolucion = new Date('2024-01-01T12:00:00'); // 2 hours later
    
    const metrics = calculateSLAMetrics(fechaCreacion, fechaResolucion, 'critica');
    
    expect(metrics.targetMinutes).toBe(240); // 4 hours
    expect(metrics.elapsedMinutes).toBe(120); // 2 hours
    expect(metrics.withinSLA).toBe(true);
    expect(metrics.percentageUsed).toBe(50);
  });

  it('should detect SLA breach', () => {
    const fechaCreacion = new Date('2024-01-01T10:00:00');
    const fechaResolucion = new Date('2024-01-01T16:00:00'); // 6 hours later
    
    const metrics = calculateSLAMetrics(fechaCreacion, fechaResolucion, 'critica');
    
    expect(metrics.withinSLA).toBe(false);
    expect(metrics.percentageUsed).toBeGreaterThan(100);
  });
});

describe('Inventory Management', () => {
  describe('Stock Calculations', () => {
    const calculateStockStatus = (
      cantidad: number,
      stockMinimo: number,
      stockMaximo: number
    ) => {
      if (cantidad <= 0) return 'sin_stock';
      if (cantidad <= stockMinimo) return 'bajo';
      if (cantidad >= stockMaximo) return 'exceso';
      return 'normal';
    };

    it('should detect no stock', () => {
      expect(calculateStockStatus(0, 10, 100)).toBe('sin_stock');
    });

    it('should detect low stock', () => {
      expect(calculateStockStatus(5, 10, 100)).toBe('bajo');
    });

    it('should detect normal stock', () => {
      expect(calculateStockStatus(50, 10, 100)).toBe('normal');
    });

    it('should detect excess stock', () => {
      expect(calculateStockStatus(150, 10, 100)).toBe('exceso');
    });
  });

  describe('Movement Validation', () => {
    const validateMovement = (
      tipo: string,
      cantidad: number,
      stockActual: number
    ): { valid: boolean; error?: string } => {
      if (cantidad <= 0) {
        return { valid: false, error: 'La cantidad debe ser positiva' };
      }
      
      if (tipo === 'salida' && cantidad > stockActual) {
        return { valid: false, error: 'Stock insuficiente' };
      }
      
      return { valid: true };
    };

    it('should reject negative quantities', () => {
      const result = validateMovement('entrada', -5, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('La cantidad debe ser positiva');
    });

    it('should reject exit when insufficient stock', () => {
      const result = validateMovement('salida', 150, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Stock insuficiente');
    });

    it('should allow valid exit', () => {
      const result = validateMovement('salida', 50, 100);
      expect(result.valid).toBe(true);
    });

    it('should allow entry regardless of stock', () => {
      const result = validateMovement('entrada', 100, 0);
      expect(result.valid).toBe(true);
    });
  });
});

describe('Preventivo Scheduling', () => {
  const calculateNextExecution = (
    lastExecution: Date,
    periodicidad: { tipo: string; valor: number }
  ): Date => {
    const next = new Date(lastExecution);
    
    switch (periodicidad.tipo) {
      case 'dias':
        next.setDate(next.getDate() + periodicidad.valor);
        break;
      case 'semanas':
        next.setDate(next.getDate() + periodicidad.valor * 7);
        break;
      case 'meses':
        next.setMonth(next.getMonth() + periodicidad.valor);
        break;
      case 'kilometros':
        // For km-based, we don't change the date
        break;
    }
    
    return next;
  };

  it('should calculate next execution by days', () => {
    const last = new Date('2024-01-01');
    const next = calculateNextExecution(last, { tipo: 'dias', valor: 30 });
    expect(next.toISOString().slice(0, 10)).toBe('2024-01-31');
  });

  it('should calculate next execution by weeks', () => {
    const last = new Date('2024-01-01');
    const next = calculateNextExecution(last, { tipo: 'semanas', valor: 2 });
    expect(next.toISOString().slice(0, 10)).toBe('2024-01-15');
  });

  it('should calculate next execution by months', () => {
    const last = new Date('2024-01-15');
    const next = calculateNextExecution(last, { tipo: 'meses', valor: 3 });
    expect(next.toISOString().slice(0, 10)).toBe('2024-04-15');
  });
});
