/**
 * Sistema de Permisos - ZaintzaBus
 * 
 * Exportaciones centralizadas del sistema de permisos y roles.
 */

// Tipos
export {
  RESOURCES,
  ACTIONS,
  ROLE_DEFINITIONS,
  DETAIL_LEVELS,
  ROLE_KEY_QUESTIONS,
  type Resource,
  type Action,
  type Permission,
  type PermissionSet,
  type RoleKey,
  type RoleDefinition,
  type PermissionContext,
  type DetailLevel,
  type DetailLevelConfig,
} from './types';

// Permisos y matriz rol-permisos
export {
  ROLE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  roleHasPermission,
  getRolePermissions,
  getRoleDefinition,
  getRoleDetailLevel,
  canAccessAllTenants,
  isManagerRole,
  isReadOnlyRole,
  canViewCosts,
  canViewSLAPenalties,
  getMaxHistoryDays,
  getRolesWithPermission,
  getRoutePermissions,
} from './permissions';

// Guards, hooks y componentes
export {
  // Hooks
  usePermissions,
  useRoleInfo,
  useCanEditOwn,
  
  // Componentes
  RequirePermission,
  RequireRole,
  PermissionGate,
  RoleGate,
  ShowIfManager,
  ShowIfCanViewCosts,
  HideFromRole,
  
  // HOCs
  withPermission,
  withRole,
} from './guards';
