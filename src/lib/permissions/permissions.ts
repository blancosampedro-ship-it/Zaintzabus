/**
 * Sistema de Permisos - Matriz Rol-Permisos
 * 
 * Define qué permisos tiene cada rol del sistema.
 * Esta es la fuente de verdad para autorización.
 */

import {
  Permission,
  RoleKey,
  RESOURCES,
  ACTIONS,
  ROLE_DEFINITIONS,
  DETAIL_LEVELS,
  DetailLevelConfig,
} from './types';

// ============================================
// MATRIZ DE PERMISOS POR ROL
// ============================================

/**
 * Permisos asignados a cada rol.
 * Formato: recurso:accion
 */
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  // ==========================================
  // TÉCNICO DE MANTENIMIENTO
  // ==========================================
  // Foco: Ejecutar intervenciones, documentar, consumir materiales
  // NO ve: costes, otros tenants, métricas de rendimiento individual
  tecnico: [
    // Incidencias: ver asignadas, crear nuevas detectadas
    'incidencias:ver',
    'incidencias:crear',
    'incidencias:editar', // Solo las propias o asignadas
    
    // Órdenes de trabajo: ejecutar las asignadas
    'ordenes_trabajo:ver',
    'ordenes_trabajo:editar', // Registrar tiempos, notas
    'ordenes_trabajo:cerrar', // Cerrar las propias
    
    // Activos: consulta para saber dónde intervenir
    'activos:ver',
    
    // Equipos: consulta de fichas técnicas
    'equipos:ver',
    
    // Inventario: consultar y consumir materiales
    'inventario:ver',
    'inventario:consumir',
    'inventario:instalar',
    'inventario:desinstalar',
    'inventario:mover', // Traspasos entre bus/almacén
    
    // Preventivo: ver tareas asignadas
    'preventivo:ver',
    'preventivo:editar', // Completar checklist
    
    // Almacenes: consultar stock
    'almacenes:ver',
  ],

  // ==========================================
  // JEFE DE MANTENIMIENTO
  // ==========================================
  // Foco: Supervisar técnicos, asignar trabajos, gestionar recursos
  // VE: métricas del equipo, costes internos
  // NO ve: información de otros tenants, penalizaciones contractuales
  jefe_mantenimiento: [
    // Incidencias: gestión completa dentro del tenant
    'incidencias:ver',
    'incidencias:crear',
    'incidencias:editar',
    'incidencias:asignar',
    'incidencias:reasignar',
    'incidencias:cerrar',
    'incidencias:reabrir',
    'incidencias:validar',
    
    // Órdenes de trabajo: gestión completa
    'ordenes_trabajo:ver',
    'ordenes_trabajo:crear',
    'ordenes_trabajo:editar',
    'ordenes_trabajo:asignar',
    'ordenes_trabajo:reasignar',
    'ordenes_trabajo:cerrar',
    'ordenes_trabajo:validar',
    'ordenes_trabajo:ver_costes',
    
    // Activos: gestión de flota
    'activos:ver',
    'activos:editar',
    
    // Equipos: gestión completa
    'equipos:ver',
    'equipos:crear',
    'equipos:editar',
    
    // Inventario: gestión completa
    'inventario:ver',
    'inventario:crear',
    'inventario:editar',
    'inventario:mover',
    'inventario:consumir',
    'inventario:instalar',
    'inventario:desinstalar',
    
    // Preventivo: planificación
    'preventivo:ver',
    'preventivo:crear',
    'preventivo:editar',
    'preventivo:asignar',
    
    // Técnicos: gestionar equipo
    'tecnicos:ver',
    'tecnicos:asignar',
    
    // Almacenes: gestión
    'almacenes:ver',
    'almacenes:editar',
    
    // Usuarios: ver equipo propio
    'usuarios:ver',
    
    // Informes: operativos
    'informes:ver',
    'informes:exportar',
    
    // SLA: ver cumplimiento
    'sla:ver',
  ],

  // ==========================================
  // OPERADOR DE TRANSPORTE
  // ==========================================
  // Foco: Disponibilidad de flota, decisiones operativas, reporting interno
  // VE: estado de sus activos, métricas de servicio
  // NO ve: detalle técnico de intervenciones, asignación de técnicos
  operador: [
    // Incidencias: declarar y seguimiento
    'incidencias:ver',
    'incidencias:crear',
    'incidencias:editar', // Solo las propias
    
    // Órdenes de trabajo: solo consulta
    'ordenes_trabajo:ver',
    
    // Activos: su flota
    'activos:ver',
    
    // Equipos: consulta
    'equipos:ver',
    
    // Inventario: solo consulta
    'inventario:ver',
    
    // Preventivo: ver planificación
    'preventivo:ver',
    
    // Almacenes: consulta
    'almacenes:ver',
    
    // Informes: acceso completo a sus datos
    'informes:ver',
    'informes:exportar',
    
    // SLA: ver cumplimiento propio
    'sla:ver',
  ],

  // ==========================================
  // CONSORCIO / DFG (ADMINISTRACIÓN PÚBLICA)
  // ==========================================
  // Foco: Fiscalización, cumplimiento contractual, auditoría
  // VE: datos de TODOS los operadores, métricas SLA, evidencias
  // NO ve: costes internos del operador, asignación de recursos
  // NO puede: modificar datos operativos
  dfg: [
    // Incidencias: solo lectura de todos los tenants
    'incidencias:ver',
    'incidencias:ver_todos',
    'incidencias:auditar',
    
    // Órdenes de trabajo: solo lectura
    'ordenes_trabajo:ver',
    'ordenes_trabajo:ver_todos',
    'ordenes_trabajo:auditar',
    
    // Activos: ver flota de todos
    'activos:ver',
    'activos:ver_todos',
    
    // Equipos: consulta
    'equipos:ver',
    'equipos:ver_todos',
    
    // Inventario: consulta general
    'inventario:ver',
    
    // Preventivo: ver planificación
    'preventivo:ver',
    'preventivo:ver_todos',
    
    // Operadores: ver todos
    'operadores:ver',
    
    // Contratos: gestión contractual
    'contratos:ver',
    'contratos:editar',
    
    // Informes: acceso completo multi-tenant
    'informes:ver',
    'informes:ver_todos',
    'informes:exportar',
    
    // SLA: visión completa
    'sla:ver',
    'sla:ver_todos',
    
    // Facturación: solo consulta
    'facturacion:ver',
  ],

  // ==========================================
  // ADMINISTRADOR DEL SISTEMA
  // ==========================================
  // Foco: Configuración, usuarios, datos maestros, auditoría
  // VE: todo
  // PUEDE: todo excepto operar (no es su función)
  admin: [
    // Incidencias: acceso completo
    'incidencias:ver',
    'incidencias:crear',
    'incidencias:editar',
    'incidencias:eliminar',
    'incidencias:asignar',
    'incidencias:reasignar',
    'incidencias:cerrar',
    'incidencias:reabrir',
    'incidencias:validar',
    'incidencias:ver_todos',
    'incidencias:auditar',
    
    // Órdenes de trabajo: acceso completo
    'ordenes_trabajo:ver',
    'ordenes_trabajo:crear',
    'ordenes_trabajo:editar',
    'ordenes_trabajo:eliminar',
    'ordenes_trabajo:asignar',
    'ordenes_trabajo:reasignar',
    'ordenes_trabajo:cerrar',
    'ordenes_trabajo:validar',
    'ordenes_trabajo:ver_todos',
    'ordenes_trabajo:ver_costes',
    'ordenes_trabajo:auditar',
    
    // Activos: gestión completa
    'activos:ver',
    'activos:crear',
    'activos:editar',
    'activos:eliminar',
    'activos:ver_todos',
    
    // Equipos: gestión completa
    'equipos:ver',
    'equipos:crear',
    'equipos:editar',
    'equipos:eliminar',
    'equipos:ver_todos',
    
    // Inventario: gestión completa
    'inventario:ver',
    'inventario:crear',
    'inventario:editar',
    'inventario:eliminar',
    'inventario:mover',
    'inventario:consumir',
    'inventario:instalar',
    'inventario:desinstalar',
    
    // Preventivo: gestión completa
    'preventivo:ver',
    'preventivo:crear',
    'preventivo:editar',
    'preventivo:eliminar',
    'preventivo:asignar',
    'preventivo:ver_todos',
    
    // Técnicos: gestión completa
    'tecnicos:ver',
    'tecnicos:crear',
    'tecnicos:editar',
    'tecnicos:eliminar',
    'tecnicos:asignar',
    
    // Usuarios: gestión completa
    'usuarios:ver',
    'usuarios:crear',
    'usuarios:editar',
    'usuarios:eliminar',
    
    // Operadores: gestión completa
    'operadores:ver',
    'operadores:crear',
    'operadores:editar',
    'operadores:eliminar',
    
    // Almacenes: gestión completa
    'almacenes:ver',
    'almacenes:crear',
    'almacenes:editar',
    'almacenes:eliminar',
    
    // Contratos: gestión completa
    'contratos:ver',
    'contratos:crear',
    'contratos:editar',
    'contratos:eliminar',
    
    // Informes: acceso completo
    'informes:ver',
    'informes:ver_todos',
    'informes:exportar',
    
    // SLA: configuración completa
    'sla:ver',
    'sla:ver_todos',
    'sla:configurar',
    
    // Facturación: gestión completa
    'facturacion:ver',
    'facturacion:crear',
    'facturacion:editar',
    
    // Sistema: configuración
    'sistema:ver',
    'sistema:configurar',
  ],
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Verifica si un rol tiene un permiso específico.
 */
export function roleHasPermission(role: RoleKey, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Obtiene todos los permisos de un rol.
 */
export function getRolePermissions(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Obtiene la definición de un rol.
 */
export function getRoleDefinition(role: RoleKey) {
  return ROLE_DEFINITIONS[role];
}

/**
 * Obtiene el nivel de detalle configurado para un rol.
 */
export function getRoleDetailLevel(role: RoleKey): DetailLevelConfig {
  const definition = ROLE_DEFINITIONS[role];
  if (!definition) return DETAIL_LEVELS.operativo;
  return DETAIL_LEVELS[definition.detailLevel];
}

/**
 * Verifica si un rol puede ver información de otros tenants.
 */
export function canAccessAllTenants(role: RoleKey): boolean {
  return role === 'admin' || role === 'dfg';
}

/**
 * Verifica si un rol tiene capacidad de gestión (crear, editar, asignar).
 */
export function isManagerRole(role: RoleKey): boolean {
  return ['admin', 'jefe_mantenimiento'].includes(role);
}

/**
 * Verifica si un rol es de solo lectura para datos operativos.
 */
export function isReadOnlyRole(role: RoleKey): boolean {
  return role === 'dfg';
}

/**
 * Obtiene los roles que tienen un permiso específico.
 */
export function getRolesWithPermission(permission: Permission): RoleKey[] {
  return (Object.keys(ROLE_PERMISSIONS) as RoleKey[]).filter(role =>
    roleHasPermission(role, permission)
  );
}

/**
 * Verifica si un rol puede ver costes.
 */
export function canViewCosts(role: RoleKey): boolean {
  const detailLevel = getRoleDetailLevel(role);
  return detailLevel.showCosts;
}

/**
 * Verifica si un rol puede ver información de SLA y penalizaciones.
 */
export function canViewSLAPenalties(role: RoleKey): boolean {
  const detailLevel = getRoleDetailLevel(role);
  return detailLevel.showSLAPenalties;
}

/**
 * Obtiene el número máximo de días de histórico que puede ver un rol.
 */
export function getMaxHistoryDays(role: RoleKey): number {
  const detailLevel = getRoleDetailLevel(role);
  return detailLevel.maxHistoryDays;
}

// ============================================
// PERMISOS POR RUTA
// ============================================

/**
 * Mapeo de rutas a permisos requeridos.
 * Usado por los guards de ruta.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [], // Todos los autenticados
  '/incidencias': ['incidencias:ver'],
  '/incidencias/nueva': ['incidencias:crear'],
  '/ordenes-trabajo': ['ordenes_trabajo:ver'],
  '/ordenes-trabajo/nueva': ['ordenes_trabajo:crear'],
  '/autobuses': ['activos:ver'],
  '/equipos': ['equipos:ver'],
  '/inventario': ['inventario:ver'],
  '/preventivo': ['preventivo:ver'],
  '/preventivo/nuevo': ['preventivo:crear'],
  '/tecnicos': ['tecnicos:ver'],
  '/almacenes': ['almacenes:ver'],
  '/informes': ['informes:ver'],
  '/contratos': ['contratos:ver'],
  '/facturacion': ['facturacion:ver'],
  '/admin/usuarios': ['usuarios:ver'],
  '/admin/operadores': ['operadores:ver'],
  '/admin/configuracion': ['sistema:configurar'],
};

/**
 * Obtiene los permisos requeridos para una ruta.
 */
export function getRoutePermissions(path: string): Permission[] {
  // Buscar coincidencia exacta
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }
  
  // Buscar coincidencia parcial (para rutas dinámicas)
  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    if (path.startsWith(route)) {
      return ROUTE_PERMISSIONS[route];
    }
  }
  
  return [];
}
