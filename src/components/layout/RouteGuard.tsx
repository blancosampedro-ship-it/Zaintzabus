/**
 * RouteGuard - Protección de rutas basada en permisos
 * 
 * Componente que protege rutas verificando permisos del usuario.
 * Se usa como wrapper en layouts o páginas.
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions/types';
import { getRoutePermissions } from '@/lib/permissions/permissions';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';

interface RouteGuardProps {
  children: ReactNode;
  /** Permisos adicionales requeridos (además de los de la ruta) */
  requiredPermissions?: Permission[];
  /** Si true, requiere todos los permisos. Si false, al menos uno */
  requireAll?: boolean;
  /** Ruta a la que redirigir si no tiene acceso */
  redirectTo?: string;
  /** Si true, muestra un mensaje de acceso denegado en lugar de redirigir */
  showAccessDenied?: boolean;
  /** Componente personalizado para mostrar mientras carga */
  loadingComponent?: ReactNode;
  /** Componente personalizado para acceso denegado */
  accessDeniedComponent?: ReactNode;
}

/**
 * Componente de loading por defecto
 */
function DefaultLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
        <p className="mt-3 text-slate-400">Verificando acceso...</p>
      </div>
    </div>
  );
}

/**
 * Componente de acceso denegado por defecto
 */
function DefaultAccessDenied({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center max-w-md px-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Acceso Denegado</h1>
        <p className="text-slate-400 mb-6">
          No tienes permisos para acceder a esta sección.
          Contacta con tu administrador si crees que esto es un error.
        </p>
        <button
          onClick={() => router.push(redirectTo || '/dashboard')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

/**
 * Guard de ruta que verifica permisos antes de renderizar el contenido.
 * 
 * @example
 * ```tsx
 * // En un layout
 * export default function AdminLayout({ children }) {
 *   return (
 *     <RouteGuard requiredPermissions={['usuarios:ver']}>
 *       {children}
 *     </RouteGuard>
 *   );
 * }
 * ```
 */
export function RouteGuard({
  children,
  requiredPermissions = [],
  requireAll = true,
  redirectTo = '/dashboard',
  showAccessDenied = true,
  loadingComponent,
  accessDeniedComponent,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, user, hasPermission, hasAllPermissions, hasAnyPermission } = useAuth();

  // Obtener permisos de la ruta actual
  const routePermissions = getRoutePermissions(pathname);
  
  // Combinar permisos de ruta + permisos adicionales
  const allRequiredPermissions = [...routePermissions, ...requiredPermissions];

  // Verificar acceso
  const hasAccess = allRequiredPermissions.length === 0 
    ? true 
    : requireAll
      ? hasAllPermissions(allRequiredPermissions)
      : hasAnyPermission(allRequiredPermissions);

  useEffect(() => {
    // Si no está cargando y no hay usuario, redirigir a login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Si tiene usuario pero no acceso y no mostramos mensaje, redirigir
    if (!loading && user && !hasAccess && !showAccessDenied) {
      router.push(redirectTo);
    }
  }, [loading, user, hasAccess, showAccessDenied, redirectTo, router]);

  // Mientras carga
  if (loading) {
    return loadingComponent || <DefaultLoading />;
  }

  // Si no hay usuario (redirección en proceso)
  if (!user) {
    return loadingComponent || <DefaultLoading />;
  }

  // Si no tiene acceso
  if (!hasAccess) {
    if (showAccessDenied) {
      return accessDeniedComponent || <DefaultAccessDenied redirectTo={redirectTo} />;
    }
    return null;
  }

  // Tiene acceso
  return <>{children}</>;
}

// ============================================
// GUARDS ESPECÍFICOS POR SECCIÓN
// ============================================

/**
 * Guard para sección de administración
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['sistema:configurar']}
      redirectTo="/dashboard"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para sección de usuarios
 */
export function UsuariosGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['usuarios:ver']}
      redirectTo="/dashboard"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para sección de facturación
 */
export function FacturacionGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['facturacion:ver']}
      redirectTo="/dashboard"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para sección de contratos
 */
export function ContratosGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['contratos:ver']}
      redirectTo="/dashboard"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para sección de técnicos
 */
export function TecnicosGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['tecnicos:ver']}
      redirectTo="/dashboard"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para creación de incidencias
 */
export function CrearIncidenciaGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['incidencias:crear']}
      redirectTo="/incidencias"
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Guard para creación de OTs
 */
export function CrearOTGuard({ children }: { children: ReactNode }) {
  return (
    <RouteGuard
      requiredPermissions={['ordenes_trabajo:crear']}
      redirectTo="/ordenes-trabajo"
    >
      {children}
    </RouteGuard>
  );
}

// ============================================
// COMPONENTE: PermissionBadge
// ============================================

interface PermissionBadgeProps {
  permission: Permission;
  showIcon?: boolean;
  className?: string;
}

/**
 * Badge que indica si el usuario tiene un permiso específico.
 * Útil para debugging y documentación.
 */
export function PermissionBadge({ permission, showIcon = true, className = '' }: PermissionBadgeProps) {
  const { hasPermission } = useAuth();
  const has = hasPermission(permission);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        has
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      } ${className}`}
    >
      {showIcon && (has ? '✓' : <Lock className="w-3 h-3" />)}
      {permission}
    </span>
  );
}
