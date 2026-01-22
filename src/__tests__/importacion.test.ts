/**
 * Tests para utilidades de importación de Excel
 */

import { describe, it, expect } from 'vitest';

describe('Excel Parser Utils', () => {
  describe('Column Name Normalization', () => {
    const normalizeColumnName = (name: string): string => {
      return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]/g, '') // Remove special chars
        .trim();
    };

    it('should normalize column names', () => {
      expect(normalizeColumnName('Matrícula')).toBe('matricula');
      expect(normalizeColumnName('Año Fabricación')).toBe('anofabricacion');
      expect(normalizeColumnName('Número de Serie')).toBe('numerodeserie');
      expect(normalizeColumnName('CÓDIGO')).toBe('codigo');
    });

    it('should handle special characters', () => {
      expect(normalizeColumnName('Nº Serie')).toBe('nserie');
      expect(normalizeColumnName('Fecha Alta')).toBe('fechaalta');
    });
  });

  describe('Auto-mapping Detection', () => {
    const columnMappings: Record<string, string[]> = {
      matricula: ['matricula', 'placa', 'patente', 'plate'],
      marca: ['marca', 'brand', 'fabricante'],
      modelo: ['modelo', 'model'],
      codigo: ['codigo', 'code', 'id', 'codigointerno'],
    };

    const detectMapping = (columnName: string): string | null => {
      const normalized = columnName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      for (const [field, patterns] of Object.entries(columnMappings)) {
        if (patterns.some(p => normalized.includes(p))) {
          return field;
        }
      }
      return null;
    };

    it('should detect matricula variations', () => {
      expect(detectMapping('Matrícula')).toBe('matricula');
      expect(detectMapping('Placa')).toBe('matricula');
      expect(detectMapping('License Plate')).toBe('matricula');
    });

    it('should detect marca variations', () => {
      expect(detectMapping('Marca')).toBe('marca');
      expect(detectMapping('Brand')).toBe('marca');
      expect(detectMapping('Fabricante')).toBe('marca');
    });

    it('should return null for unknown columns', () => {
      expect(detectMapping('Unknown Column')).toBe(null);
      expect(detectMapping('Random')).toBe(null);
    });
  });

  describe('Value Transformation', () => {
    const transformValue = (
      value: unknown,
      tipo: 'texto' | 'numero' | 'fecha' | 'booleano'
    ): unknown => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      switch (tipo) {
        case 'texto':
          return String(value).trim();

        case 'numero':
          const num = Number(value);
          return isNaN(num) ? null : num;

        case 'fecha':
          if (value instanceof Date) return value;
          const date = new Date(value as string);
          return isNaN(date.getTime()) ? null : date;

        case 'booleano':
          const str = String(value).toLowerCase();
          if (['true', '1', 'si', 'sí', 'yes', 'activo'].includes(str)) return true;
          if (['false', '0', 'no', 'inactivo'].includes(str)) return false;
          return null;

        default:
          return value;
      }
    };

    it('should transform text values', () => {
      expect(transformValue('  hello  ', 'texto')).toBe('hello');
      expect(transformValue(123, 'texto')).toBe('123');
    });

    it('should transform number values', () => {
      expect(transformValue('123', 'numero')).toBe(123);
      expect(transformValue('123.45', 'numero')).toBe(123.45);
      expect(transformValue('abc', 'numero')).toBe(null);
    });

    it('should transform boolean values', () => {
      expect(transformValue('si', 'booleano')).toBe(true);
      expect(transformValue('Sí', 'booleano')).toBe(true);
      expect(transformValue('1', 'booleano')).toBe(true);
      expect(transformValue('no', 'booleano')).toBe(false);
      expect(transformValue('0', 'booleano')).toBe(false);
    });

    it('should handle null values', () => {
      expect(transformValue(null, 'texto')).toBe(null);
      expect(transformValue('', 'numero')).toBe(null);
      expect(transformValue(undefined, 'booleano')).toBe(null);
    });
  });

  describe('Duplicate Detection', () => {
    const findDuplicates = <T extends Record<string, unknown>>(
      data: T[],
      field: string
    ): Set<string> => {
      const seen = new Map<string, number>();
      const duplicates = new Set<string>();

      data.forEach((item, index) => {
        const value = String(item[field] || '').toLowerCase().trim();
        if (value && seen.has(value)) {
          duplicates.add(value);
        } else if (value) {
          seen.set(value, index);
        }
      });

      return duplicates;
    };

    it('should detect duplicates', () => {
      const data = [
        { matricula: 'ABC-123' },
        { matricula: 'DEF-456' },
        { matricula: 'abc-123' }, // Duplicate (case insensitive)
        { matricula: 'GHI-789' },
      ];

      const duplicates = findDuplicates(data, 'matricula');
      expect(duplicates.has('abc-123')).toBe(true);
      expect(duplicates.size).toBe(1);
    });

    it('should ignore empty values', () => {
      const data = [
        { matricula: '' },
        { matricula: '' },
        { matricula: 'ABC-123' },
      ];

      const duplicates = findDuplicates(data, 'matricula');
      expect(duplicates.size).toBe(0);
    });
  });

  describe('Sequential Code Generation', () => {
    const generateCodes = (
      prefix: string,
      count: number,
      startFrom: number = 1
    ): string[] => {
      return Array.from({ length: count }, (_, i) => {
        const num = startFrom + i;
        return `${prefix}-${String(num).padStart(3, '0')}`;
      });
    };

    it('should generate sequential codes', () => {
      const codes = generateCodes('BUS', 3);
      expect(codes).toEqual(['BUS-001', 'BUS-002', 'BUS-003']);
    });

    it('should start from specified number', () => {
      const codes = generateCodes('EKI', 3, 10);
      expect(codes).toEqual(['EKI-010', 'EKI-011', 'EKI-012']);
    });

    it('should handle large numbers', () => {
      const codes = generateCodes('BUS', 2, 999);
      expect(codes).toEqual(['BUS-999', 'BUS-1000']);
    });
  });
});

describe('Validation Rules', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('Matricula Validation', () => {
    const isValidMatricula = (matricula: string): boolean => {
      // Spanish plate format: 1234-ABC or 1234 ABC or similar
      const patterns = [
        /^\d{4}[-\s]?[A-Z]{3}$/i, // Spanish new format
        /^[A-Z]{1,2}[-\s]?\d{4}[-\s]?[A-Z]{1,2}$/i, // Spanish old format
        /^[A-Z0-9]{2,8}$/i, // Generic
      ];
      return patterns.some(p => p.test(matricula.trim()));
    };

    it('should validate Spanish matriculas', () => {
      expect(isValidMatricula('1234-ABC')).toBe(true);
      expect(isValidMatricula('1234 ABC')).toBe(true);
      expect(isValidMatricula('1234ABC')).toBe(true);
    });

    it('should validate generic plates', () => {
      expect(isValidMatricula('ABC123')).toBe(true);
      expect(isValidMatricula('EKI001')).toBe(true);
    });
  });
});
