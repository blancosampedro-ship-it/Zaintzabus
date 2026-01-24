/**
 * PermissionUI - Componentes UI para el sistema de permisos
 * 
 * Componentes visuales para mostrar información de permisos y roles.
 */

'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROL_LABELS, ROL_COLORS, Rol } from '@/types';
import { Permission } from '@/lib/permissions/types';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// BADGE DE ROL
// ============================================

interface RoleBadgeProps {
  rol?: Rol;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Badge visual que muestra el rol del usuario con colores distintivos.
 */
export function RoleBadge({ rol, size = 'md', showIcon = true, className }: RoleBadgeProps) {
  const { claims } = useAuth();
  const currentRol = rol || (claims?.rol as Rol);

  if (!currentRol) return null;

  const colors = ROL_COLORS[currentRol];
  const label = ROL_LABELS[currentRol];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Shield className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'} />}
      {label}
    </span>
  );
}

// ============================================
// INDICADOR DE NIVEL DE ACCESO
// ============================================

interface AccessLevelIndicatorProps {
  className?: string;
}

/**
 * Muestra el nivel de acceso actual del usuario (qué puede ver/hacer).
 */
export function AccessLevelIndicator({ className }: AccessLevelIndicatorProps) {
  const { detailLevel, isManager, isReadOnly, canViewCosts, canViewSLAPenalties } = useAuth();

  const items = [
    { label: 'Gestión', enabled: isManager, icon: isManager ? Unlock : Lock },
    { label: 'Solo lectura', enabled: isReadOnly, icon: isReadOnly ? Eye : EyeOff },
    { label: 'Ver costes', enabled: canViewCosts, icon: canViewCosts ? ShieldCheck : ShieldX },
    { label: 'Ver SLA/Penalizaciones', enabled: canViewSLAPenalties, icon: canViewSLAPenalties ? ShieldCheck : ShieldX },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nivel de acceso</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
              item.enabled
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-slate-700/50 text-slate-500 border border-slate-600/20'
            )}
          >
            <item.icon className="w-3 h-3" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================
// TOOLTIP DE PERMISO
// ============================================

interface PermissionTooltipProps {
  permission: Permission;
  children: ReactNode;
}

/**
 * Wrapper que muestra un tooltip indicando si el usuario tiene el permiso.
 * Útil para botones y acciones condicionales.
 */
export function PermissionTooltip({ permission, children }: PermissionTooltipProps) {
  const { hasPermission } = useAuth();
  const has = hasPermission(permission);

  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <span className={has ? 'text-green-400' : 'text-red-400'}>
          {has ? '✓' : '✗'} {permission}
        </span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

// ============================================
// BOTÓN CON PERMISO
// ============================================

interface PermissionButtonProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  disabledClassName?: string;
  /** Si true, oculta el botón en lugar de deshabilitarlo */
  hideIfDenied?: boolean;
  /** Tooltip a mostrar cuando está deshabilitado por permisos */
  deniedTooltip?: string;
}

/**
 * Botón que se deshabilita automáticamente si el usuario no tiene el permiso.
 */
export function PermissionButton({
  permission,
  requireAll = true,
  children,
  onClick,
  disabled = false,
  className = '',
  disabledClassName = 'opacity-50 cursor-not-allowed',
  hideIfDenied = false,
  deniedTooltip = 'No tienes permisos para esta acción',
}: PermissionButtonProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess && hideIfDenied) {
    return null;
  }

  const isDisabled = disabled || !hasAccess;

  return (
    <button
      onClick={hasAccess ? onClick : undefined}
      disabled={isDisabled}
      className={cn(className, isDisabled && disabledClassName)}
      title={!hasAccess ? deniedTooltip : undefined}
    >
      {children}
    </button>
  );
}

// ============================================
// ALERTA DE MODO SOLO LECTURA
// ============================================

interface ReadOnlyBannerProps {
  message?: string;
  className?: string;
}

/**
 * Banner que se muestra cuando el usuario está en modo solo lectura.
 */
export function ReadOnlyBanner({
  message = 'Estás en modo de solo lectura. No puedes realizar modificaciones.',
  className,
}: ReadOnlyBannerProps) {
  const { isReadOnly } = useAuth();

  if (!isReadOnly) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm',
        className
      )}
    >
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ============================================
// INFORMACIÓN DE TENANT
// ============================================

interface TenantInfoProps {
  className?: string;
}

/**
 * Muestra información sobre el tenant actual y si puede ver otros.
 */
export function TenantInfo({ className }: TenantInfoProps) {
  const { claims, canAccessAllTenants } = useAuth();

  return (
    <div className={cn('text-sm', className)}>
      <span className="text-slate-500">Tenant: </span>
      <span className="text-slate-300">{claims?.tenantId || 'Global'}</span>
      {canAccessAllTenants && (
        <span className="ml-2 text-xs text-blue-400">(Acceso multi-tenant)</span>
      )}
    </div>
  );
}

// ============================================
// SECCIÓN COLAPSABLE POR PERMISO
// ============================================

interface PermissionSectionProps {
  permission: Permission | Permission[];
  requireAll?: boolean;
  title?: string;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Sección que solo se muestra si el usuario tiene los permisos requeridos.
 * Útil para organizar interfaces con partes condicionales.
 */
export function PermissionSection({
  permission,
  requireAll = true,
  title,
  children,
  fallback,
  className,
}: PermissionSectionProps) {
  const { hasAllPermissions, hasAnyPermission } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ============================================
// DEBUG: PANEL DE PERMISOS
// ============================================

interface PermissionsDebugPanelProps {
  className?: string;
}

/**
 * Panel de debug que muestra todos los permisos del usuario actual.
 * Solo para desarrollo.
 */
export function PermissionsDebugPanel({ className }: PermissionsDebugPanelProps) {
  const { claims, permissions, roleInfo, detailLevel } = useAuth();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className={cn('p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-xs', className)}>
      <h4 className="font-bold text-slate-300 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        Debug: Permisos (solo desarrollo)
      </h4>
      
      <div className="space-y-3">
        <div>
          <span className="text-slate-500">Rol:</span>{' '}
          <span className="text-cyan-400">{claims?.rol}</span>
        </div>
        
        <div>
          <span className="text-slate-500">Tenant:</span>{' '}
          <span className="text-cyan-400">{claims?.tenantId || 'N/A'}</span>
        </div>
        
        <div>
          <span className="text-slate-500">Nivel detalle:</span>{' '}
          <span className="text-cyan-400">{roleInfo?.detailLevel}</span>
        </div>
        
        <div>
          <span className="text-slate-500">Permisos ({permissions.length}):</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {permissions.slice(0, 20).map((p) => (
              <span key={p} className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                {p}
              </span>
            ))}
            {permissions.length > 20 && (
              <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-500">
                +{permissions.length - 20} más
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
