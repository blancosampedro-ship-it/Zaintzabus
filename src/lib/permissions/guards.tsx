/**
 * Sistema de Permisos - Guards y Hooks
 * 
 * Proporciona componentes y hooks para proteger UI basándose en permisos.
 */

'use client';

import React, { ComponentType, ReactNode, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission, RoleKey, PermissionContext } from './types';
import {
  roleHasPermission,
  getRolePermissions,
  getRoleDetailLevel,
  canAccessAllTenants,
  isManagerRole,
  isReadOnlyRole,
  canViewCosts,
  canViewSLAPenalties,
  getMaxHistoryDays,
  getRoutePermissions,
} from './permissions';

// ============================================
// HOOK: usePermissions
// ============================================

interface UsePermissionsReturn {
  /** Rol actual del usuario */
  role: RoleKey | null;
  /** Lista de todos los permisos del usuario */
  permissions: Permission[];
  /** Verifica si tiene un permiso específico */
  hasPermission: (permission: Permission) => boolean;
  /** Verifica si tiene todos los permisos de una lista */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  /** Verifica si tiene al menos uno de los permisos */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  /** Verifica si puede acceder a todos los tenants */
  canAccessAllTenants: boolean;
  /** Verifica si es un rol de gestión */
  isManager: boolean;
  /** Verifica si es un rol de solo lectura */
  isReadOnly: boolean;
  /** Verifica si puede ver costes */
  canViewCosts: boolean;
  /** Verifica si puede ver penalizaciones SLA */
  canViewSLAPenalties: boolean;
  /** Días máximos de histórico que puede ver */
  maxHistoryDays: number;
  /** Configuración de nivel de detalle */
  detailLevel: ReturnType<typeof getRoleDetailLevel>;
  /** Verifica si puede acceder a una ruta */
  canAccessRoute: (path: string) => boolean;
}

/**
 * Hook principal para acceder al sistema de permisos.
 * Proporciona todas las funciones de verificación de permisos.
 */
export function usePermissions(): UsePermissionsReturn {
  const { claims } = useAuth();
  const role = (claims?.rol as RoleKey) || null;

  return useMemo(() => {
    if (!role) {
      return {
        role: null,
        permissions: [],
        hasPermission: () => false,
        hasAllPermissions: () => false,
        hasAnyPermission: () => false,
        canAccessAllTenants: false,
        isManager: false,
        isReadOnly: true,
        canViewCosts: false,
        canViewSLAPenalties: false,
        maxHistoryDays: 0,
        detailLevel: getRoleDetailLevel('tecnico'),
        canAccessRoute: () => false,
      };
    }

    const permissions = getRolePermissions(role);
    const detailLevel = getRoleDetailLevel(role);

    return {
      role,
      permissions,
      hasPermission: (permission: Permission) => roleHasPermission(role, permission),
      hasAllPermissions: (perms: Permission[]) => perms.every(p => roleHasPermission(role, p)),
      hasAnyPermission: (perms: Permission[]) => perms.some(p => roleHasPermission(role, p)),
      canAccessAllTenants: canAccessAllTenants(role),
      isManager: isManagerRole(role),
      isReadOnly: isReadOnlyRole(role),
      canViewCosts: canViewCosts(role),
      canViewSLAPenalties: canViewSLAPenalties(role),
      maxHistoryDays: getMaxHistoryDays(role),
      detailLevel,
      canAccessRoute: (path: string) => {
        const routePerms = getRoutePermissions(path);
        if (routePerms.length === 0) return true; // Ruta pública
        return routePerms.every(p => roleHasPermission(role, p));
      },
    };
  }, [role]);
}

// ============================================
// HOOK: useRoleInfo
// ============================================

/**
 * Hook para obtener información del rol actual.
 */
export function useRoleInfo() {
  const { claims, usuario } = useAuth();
  const role = (claims?.rol as RoleKey) || null;

  return useMemo(() => {
    if (!role) return null;

    const { ROLE_DEFINITIONS } = require('./types');
    const definition = ROLE_DEFINITIONS[role];

    return {
      ...definition,
      tenantId: claims?.tenantId,
      userName: usuario?.nombre ? `${usuario.nombre} ${usuario.apellidos || ''}`.trim() : undefined,
      email: usuario?.email,
    };
  }, [role, claims, usuario]);
}

// ============================================
// COMPONENTE: RequirePermission
// ============================================

interface RequirePermissionProps {
  /** Permiso(s) requerido(s) */
  permission: Permission | Permission[];
  /** Si true, requiere TODOS los permisos. Si false, requiere AL MENOS UNO */
  requireAll?: boolean;
  /** Contenido a mostrar si tiene permiso */
  children: ReactNode;
  /** Contenido alternativo si no tiene permiso (opcional) */
  fallback?: ReactNode;
  /** Si true, no renderiza nada en lugar del fallback */
  hideIfDenied?: boolean;
}

/**
 * Componente que renderiza contenido solo si el usuario tiene los permisos requeridos.
 * 
 * @example
 * ```tsx
 * <RequirePermission permission="incidencias:crear">
 *   <Button>Nueva Incidencia</Button>
 * </RequirePermission>
 * 
 * <RequirePermission 
 *   permission={['ordenes_trabajo:ver', 'ordenes_trabajo:crear']} 
 *   requireAll={false}
 * >
 *   <OTPanel />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  permission,
  requireAll = true,
  children,
  fallback = null,
  hideIfDenied = false,
}: RequirePermissionProps): ReactNode {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (hasAccess) {
    return children;
  }

  if (hideIfDenied) {
    return null;
  }

  return fallback;
}

// ============================================
// COMPONENTE: RequireRole
// ============================================

interface RequireRoleProps {
  /** Rol(es) permitido(s) */
  roles: RoleKey | RoleKey[];
  /** Contenido a mostrar si tiene el rol */
  children: ReactNode;
  /** Contenido alternativo si no tiene el rol */
  fallback?: ReactNode;
}

/**
 * Componente que renderiza contenido solo si el usuario tiene uno de los roles especificados.
 */
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps): ReactNode {
  const { role } = usePermissions();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (role && allowedRoles.includes(role)) {
    return children;
  }

  return fallback;
}

// ============================================
// HOC: withPermission
// ============================================

interface WithPermissionOptions {
  /** Permiso(s) requerido(s) */
  permission: Permission | Permission[];
  /** Si true, requiere todos los permisos */
  requireAll?: boolean;
  /** Componente a mostrar si no tiene permiso */
  FallbackComponent?: ComponentType;
  /** URL a la que redirigir si no tiene permiso */
  redirectTo?: string;
}

/**
 * HOC que protege un componente requiriendo permisos específicos.
 * 
 * @example
 * ```tsx
 * const ProtectedPage = withPermission(MyPage, {
 *   permission: 'usuarios:ver',
 *   redirectTo: '/dashboard'
 * });
 * ```
 */
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPermissionOptions
): ComponentType<P> {
  const { permission, requireAll = true, FallbackComponent, redirectTo } = options;

  const WithPermissionWrapper: ComponentType<P> = (props: P) => {
    const { hasAllPermissions, hasAnyPermission } = usePermissions();

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      if (redirectTo && typeof window !== 'undefined') {
        // En cliente, redirigir
        window.location.href = redirectTo;
        return null;
      }

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return null;
    }

    return <WrappedComponent {...props} />;
  };

  WithPermissionWrapper.displayName = `WithPermission(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithPermissionWrapper;
}

// ============================================
// HOC: withRole
// ============================================

interface WithRoleOptions {
  /** Rol(es) permitido(s) */
  roles: RoleKey | RoleKey[];
  /** Componente a mostrar si no tiene el rol */
  FallbackComponent?: ComponentType;
  /** URL a la que redirigir si no tiene el rol */
  redirectTo?: string;
}

/**
 * HOC que protege un componente requiriendo roles específicos.
 */
export function withRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithRoleOptions
): ComponentType<P> {
  const { roles, FallbackComponent, redirectTo } = options;

  const WithRoleWrapper: ComponentType<P> = (props: P) => {
    const { role } = usePermissions();
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!role || !allowedRoles.includes(role)) {
      if (redirectTo && typeof window !== 'undefined') {
        window.location.href = redirectTo;
        return null;
      }

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return null;
    }

    return <WrappedComponent {...props} />;
  };

  WithRoleWrapper.displayName = `WithRole(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithRoleWrapper;
}

// ============================================
// COMPONENTE: PermissionGate
// ============================================

interface PermissionGateProps {
  /** Contenido para usuarios con permiso */
  allowed: ReactNode;
  /** Contenido para usuarios sin permiso */
  denied?: ReactNode;
  /** Permiso(s) a verificar */
  permission: Permission | Permission[];
  /** Si true, requiere todos los permisos */
  requireAll?: boolean;
}

/**
 * Componente que muestra contenido diferente según el permiso.
 * Útil para mostrar vistas alternativas en lugar de ocultar.
 */
export function PermissionGate({
  allowed,
  denied = null,
  permission,
  requireAll = true,
}: PermissionGateProps): ReactNode {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return hasAccess ? allowed : denied;
}

// ============================================
// COMPONENTE: RoleGate
// ============================================

interface RoleGateProps {
  /** Mapeo de roles a contenido */
  content: Partial<Record<RoleKey, ReactNode>>;
  /** Contenido por defecto si el rol no está en el mapeo */
  defaultContent?: ReactNode;
}

/**
 * Componente que muestra contenido específico según el rol.
 * Útil para dashboards y vistas completamente diferentes por rol.
 * 
 * @example
 * ```tsx
 * <RoleGate
 *   content={{
 *     tecnico: <TecnicoDashboard />,
 *     jefe_mantenimiento: <JefeDashboard />,
 *     admin: <AdminDashboard />,
 *   }}
 *   defaultContent={<GenericDashboard />}
 * />
 * ```
 */
export function RoleGate({ content, defaultContent = null }: RoleGateProps): ReactNode {
  const { role } = usePermissions();

  if (role && content[role]) {
    return content[role];
  }

  return defaultContent;
}

// ============================================
// COMPONENTE: ShowIfManager
// ============================================

/**
 * Muestra contenido solo a roles de gestión (admin, jefe_mantenimiento).
 */
export function ShowIfManager({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }): ReactNode {
  const { isManager } = usePermissions();
  return isManager ? children : fallback;
}

// ============================================
// COMPONENTE: ShowIfCanViewCosts
// ============================================

/**
 * Muestra contenido solo a roles que pueden ver costes.
 */
export function ShowIfCanViewCosts({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }): ReactNode {
  const { canViewCosts } = usePermissions();
  return canViewCosts ? children : fallback;
}

// ============================================
// COMPONENTE: HideFromRole
// ============================================

interface HideFromRoleProps {
  /** Rol(es) a los que ocultar el contenido */
  roles: RoleKey | RoleKey[];
  /** Contenido a mostrar/ocultar */
  children: ReactNode;
}

/**
 * Oculta contenido a roles específicos.
 * Útil para ocultar información sensible.
 */
export function HideFromRole({ roles, children }: HideFromRoleProps): ReactNode {
  const { role } = usePermissions();
  const hiddenRoles = Array.isArray(roles) ? roles : [roles];

  if (role && hiddenRoles.includes(role)) {
    return null;
  }

  return children;
}

// ============================================
// UTILIDADES ADICIONALES
// ============================================

/**
 * Hook que devuelve si el usuario actual puede realizar una acción sobre un recurso propio.
 * Útil para botones de editar/eliminar en listas.
 */
export function useCanEditOwn(resourceOwnerId: string | undefined): boolean {
  const { usuario } = useAuth();
  const { hasPermission } = usePermissions();

  if (!usuario || !resourceOwnerId) return false;

  // Si es el propietario, puede editar
  if (usuario.id === resourceOwnerId) return true;

  // Si tiene permiso general de edición, puede editar
  return hasPermission('incidencias:editar');
}
