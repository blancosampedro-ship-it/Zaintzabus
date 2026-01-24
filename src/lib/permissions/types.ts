/**
 * Sistema de Permisos - Tipos
 * 
 * Define los tipos fundamentales para el sistema de permisos granular.
 * Basado en recursos y acciones para máxima flexibilidad.
 */

// ============================================
// RECURSOS DEL SISTEMA
// ============================================

/**
 * Recursos sobre los que se pueden aplicar permisos.
 * Cada recurso representa una entidad o módulo del sistema.
 */
export const RESOURCES = {
  INCIDENCIAS: 'incidencias',
  ORDENES_TRABAJO: 'ordenes_trabajo',
  ACTIVOS: 'activos',
  INVENTARIO: 'inventario',
  PREVENTIVO: 'preventivo',
  TECNICOS: 'tecnicos',
  USUARIOS: 'usuarios',
  OPERADORES: 'operadores',
  CONTRATOS: 'contratos',
  INFORMES: 'informes',
  SLA: 'sla',
  FACTURACION: 'facturacion',
  SISTEMA: 'sistema',
  ALMACENES: 'almacenes',
  EQUIPOS: 'equipos',
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

// ============================================
// ACCIONES SOBRE RECURSOS
// ============================================

/**
 * Acciones que se pueden realizar sobre los recursos.
 */
export const ACTIONS = {
  // CRUD básico
  VER: 'ver',
  CREAR: 'crear',
  EDITAR: 'editar',
  ELIMINAR: 'eliminar',
  
  // Acciones específicas de workflow
  ASIGNAR: 'asignar',
  REASIGNAR: 'reasignar',
  CERRAR: 'cerrar',
  REABRIR: 'reabrir',
  VALIDAR: 'validar',
  APROBAR: 'aprobar',
  
  // Acciones de inventario
  MOVER: 'mover',
  CONSUMIR: 'consumir',
  INSTALAR: 'instalar',
  DESINSTALAR: 'desinstalar',
  
  // Acciones de informes
  EXPORTAR: 'exportar',
  
  // Acciones de configuración
  CONFIGURAR: 'configurar',
  
  // Acciones especiales
  VER_COSTES: 'ver_costes',
  VER_SLA: 'ver_sla',
  VER_TODOS: 'ver_todos', // Ver de todos los tenants (DFG)
  AUDITAR: 'auditar',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// ============================================
// PERMISOS
// ============================================

/**
 * Un permiso es la combinación de un recurso y una acción.
 * Formato: "recurso:accion"
 */
export type Permission = `${Resource}:${Action}`;

/**
 * Conjunto de permisos de un usuario.
 */
export type PermissionSet = Set<Permission>;

// ============================================
// ROLES Y SUS CARACTERÍSTICAS
// ============================================

/**
 * Roles del sistema con sus características funcionales.
 */
export const ROLE_DEFINITIONS = {
  admin: {
    key: 'admin',
    label: 'Administrador del Sistema',
    shortLabel: 'Admin',
    description: 'Gestión completa del sistema, usuarios, configuración y datos maestros',
    color: 'purple',
    icon: 'Settings',
    level: 100, // Máximo nivel de acceso
    detailLevel: 'tecnico-administrativo' as const,
    primaryDevice: 'desktop' as const,
  },
  dfg: {
    key: 'dfg',
    label: 'Consorcio / Administración Pública',
    shortLabel: 'DFG',
    description: 'Fiscalización del cumplimiento contractual, auditoría y reportes SLA',
    color: 'blue',
    icon: 'Building2',
    level: 80,
    detailLevel: 'contractual-estrategico' as const,
    primaryDevice: 'desktop' as const,
  },
  operador: {
    key: 'operador',
    label: 'Operador de Transporte',
    shortLabel: 'Operador',
    description: 'Gestión de flota, disponibilidad y decisiones operativas del día a día',
    color: 'green',
    icon: 'Bus',
    level: 60,
    detailLevel: 'funcional-tactico' as const,
    primaryDevice: 'desktop' as const,
  },
  jefe_mantenimiento: {
    key: 'jefe_mantenimiento',
    label: 'Jefe de Mantenimiento',
    shortLabel: 'Jefe Mant.',
    description: 'Supervisión de técnicos, asignación de trabajos y gestión del taller',
    color: 'cyan',
    icon: 'Users',
    level: 50,
    detailLevel: 'funcional-tactico' as const,
    primaryDevice: 'desktop' as const,
  },
  tecnico: {
    key: 'tecnico',
    label: 'Técnico de Mantenimiento',
    shortLabel: 'Técnico',
    description: 'Ejecución de intervenciones, documentación de trabajos y consumo de materiales',
    color: 'amber',
    icon: 'Wrench',
    level: 30,
    detailLevel: 'operativo' as const,
    primaryDevice: 'tablet' as const,
  },
} as const;

export type RoleKey = keyof typeof ROLE_DEFINITIONS;

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: string;
  level: number;
  detailLevel: 'operativo' | 'funcional-tactico' | 'contractual-estrategico' | 'tecnico-administrativo';
  primaryDevice: 'desktop' | 'tablet' | 'mobile';
}

// ============================================
// CONTEXTO DE PERMISOS
// ============================================

/**
 * Contexto adicional para evaluación de permisos.
 * Permite permisos condicionales basados en propiedad, tenant, etc.
 */
export interface PermissionContext {
  /** ID del tenant actual */
  tenantId?: string;
  /** ID del recurso específico */
  resourceId?: string;
  /** ID del propietario del recurso */
  ownerId?: string;
  /** Si el usuario es propietario del recurso */
  isOwner?: boolean;
  /** Datos adicionales para evaluación */
  metadata?: Record<string, unknown>;
}

// ============================================
// NIVELES DE DETALLE POR ROL
// ============================================

/**
 * Define qué nivel de información ve cada rol.
 * Útil para filtrar columnas, campos y métricas.
 */
export const DETAIL_LEVELS = {
  operativo: {
    showCosts: false,
    showSLAPenalties: false,
    showContractDetails: false,
    showOtherTenants: false,
    showTechnicianMetrics: false,
    showAuditTrail: false,
    maxHistoryDays: 30,
  },
  'funcional-tactico': {
    showCosts: true,
    showSLAPenalties: false,
    showContractDetails: false,
    showOtherTenants: false,
    showTechnicianMetrics: true,
    showAuditTrail: true,
    maxHistoryDays: 365,
  },
  'contractual-estrategico': {
    showCosts: false, // No ve costes internos del operador
    showSLAPenalties: true,
    showContractDetails: true,
    showOtherTenants: true,
    showTechnicianMetrics: false,
    showAuditTrail: true,
    maxHistoryDays: 1825, // 5 años
  },
  'tecnico-administrativo': {
    showCosts: true,
    showSLAPenalties: true,
    showContractDetails: true,
    showOtherTenants: true,
    showTechnicianMetrics: true,
    showAuditTrail: true,
    maxHistoryDays: 1825,
  },
} as const;

export type DetailLevel = keyof typeof DETAIL_LEVELS;
export type DetailLevelConfig = (typeof DETAIL_LEVELS)[DetailLevel];

// ============================================
// PREGUNTAS CLAVE POR ROL
// ============================================

/**
 * Las preguntas que cada rol quiere responder con el sistema.
 * Útil para diseño de dashboards y priorización de información.
 */
export const ROLE_KEY_QUESTIONS: Record<RoleKey, string[]> = {
  tecnico: [
    '¿Qué trabajos tengo asignados hoy?',
    '¿Dónde está el autobús que debo intervenir?',
    '¿Tengo los repuestos necesarios?',
    '¿Cuánto tiempo me queda para el SLA?',
    '¿Qué historial tiene este equipo?',
  ],
  jefe_mantenimiento: [
    '¿Qué técnicos están disponibles?',
    '¿Qué OTs están sin asignar?',
    '¿Hay incidencias críticas pendientes?',
    '¿Cómo va el preventivo de esta semana?',
    '¿Tenemos stock bajo en algún repuesto?',
  ],
  operador: [
    '¿Cuántos buses tengo disponibles para mañana?',
    '¿Qué vehículos están en taller?',
    '¿Estamos cumpliendo los SLAs?',
    '¿Hay patrones de fallo en algún equipo?',
    '¿Cuántas incidencias hemos cerrado este mes?',
  ],
  dfg: [
    '¿Se están cumpliendo los SLAs del contrato?',
    '¿Cuál es la disponibilidad real por operador?',
    '¿Hay operadores con peor rendimiento?',
    '¿Tengo evidencias para penalizaciones?',
    '¿Cómo evoluciona la calidad del servicio?',
  ],
  admin: [
    '¿El sistema está funcionando correctamente?',
    '¿Hay usuarios con problemas de acceso?',
    '¿Los datos maestros están actualizados?',
    '¿Quién hizo qué cambio y cuándo?',
    '¿Las integraciones están operativas?',
  ],
};
