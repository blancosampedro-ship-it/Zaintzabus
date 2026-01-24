'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Usuario, Rol, CustomClaims } from '@/types';
import {
  Permission,
  RoleKey,
  RoleDefinition,
  DetailLevelConfig,
} from '@/lib/permissions/types';
import {
  roleHasPermission,
  getRolePermissions,
  getRoleDefinition,
  getRoleDetailLevel,
  canAccessAllTenants as checkCanAccessAllTenants,
  isManagerRole,
  isReadOnlyRole,
  canViewCosts as checkCanViewCosts,
  canViewSLAPenalties as checkCanViewSLAPenalties,
  getMaxHistoryDays,
} from '@/lib/permissions/permissions';

function normalizeRol(rawRol: string | undefined): Rol | null {
  if (!rawRol) return null;
  if (rawRol === 'jefe_mant') return 'jefe_mantenimiento';
  if (rawRol === 'soporte_sw') return 'tecnico';
  if (
    rawRol === 'admin' ||
    rawRol === 'dfg' ||
    rawRol === 'operador' ||
    rawRol === 'jefe_mantenimiento' ||
    rawRol === 'tecnico'
  ) {
    return rawRol;
  }
  return null;
}

interface AuthContextType {
  // Estado básico
  user: User | null;
  usuario: Usuario | null;
  claims: CustomClaims | null;
  loading: boolean;
  
  // Autenticación
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Verificación de roles (legacy, mantener compatibilidad)
  hasRole: (roles: Rol | Rol[]) => boolean;
  isDFG: () => boolean;
  canAccessTenant: (tenantId: string) => boolean;
  
  // Sistema de permisos granular (nuevo)
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  
  // Información del rol
  roleInfo: RoleDefinition | null;
  detailLevel: DetailLevelConfig;
  
  // Capacidades del rol
  canAccessAllTenants: boolean;
  isManager: boolean;
  isReadOnly: boolean;
  canViewCosts: boolean;
  canViewSLAPenalties: boolean;
  maxHistoryDays: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [claims, setClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setLoading(true);
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUsuario(null);
        setClaims(null);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const rawClaims = tokenResult.claims as Record<string, unknown>;

        const rol = normalizeRol(typeof rawClaims.rol === 'string' ? rawClaims.rol : undefined);
        const tenantId = typeof rawClaims.tenantId === 'string' ? rawClaims.tenantId : '';

        // Si no hay rol válido, cerramos sesión (token inconsistente)
        if (!rol) {
          await firebaseSignOut(auth);
          setUser(null);
          setUsuario(null);
          setClaims(null);
          setLoading(false);
          return;
        }

        // DFG puede no tener tenantId (solo lectura y acceso según pantalla/servicios)
        if (rol !== 'dfg' && !tenantId) {
          await firebaseSignOut(auth);
          setUser(null);
          setUsuario(null);
          setClaims(null);
          setLoading(false);
          return;
        }

        const normalizedClaims: CustomClaims = {
          rol,
          tenantId,
          dfg: rol === 'dfg' ? true : Boolean(rawClaims.dfg),
        };
        setClaims(normalizedClaims);

        // Cargar perfil SIEMPRE bajo tenants/{tenantId}/usuarios/{uid}
        if (tenantId) {
          const userDocRef = doc(db, `tenants/${tenantId}/usuarios`, firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUsuario({ id: userDoc.id, ...userDoc.data() } as Usuario);
          } else {
            setUsuario(null);
          }
        } else {
          setUsuario(null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUsuario(null);
        setClaims(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUsuario(null);
    setClaims(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const hasRole = (roles: Rol | Rol[]): boolean => {
    if (!claims?.rol) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(claims.rol);
  };

  const isDFG = (): boolean => {
    return claims?.rol === 'dfg';
  };

  const canAccessTenant = (tenantId: string): boolean => {
    return isDFG() || claims?.tenantId === tenantId;
  };

  // Sistema de permisos granular
  const role = claims?.rol as RoleKey | undefined;
  
  const permissions = useMemo(() => {
    if (!role) return [];
    return getRolePermissions(role);
  }, [role]);

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return roleHasPermission(role, permission);
  };

  const hasAllPermissions = (perms: Permission[]): boolean => {
    if (!role) return false;
    return perms.every(p => roleHasPermission(role, p));
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    if (!role) return false;
    return perms.some(p => roleHasPermission(role, p));
  };

  const roleInfo = useMemo(() => {
    if (!role) return null;
    return getRoleDefinition(role);
  }, [role]);

  const detailLevel = useMemo(() => {
    if (!role) return getRoleDetailLevel('tecnico');
    return getRoleDetailLevel(role);
  }, [role]);

  const canAccessAllTenantsValue = useMemo(() => {
    if (!role) return false;
    return checkCanAccessAllTenants(role);
  }, [role]);

  const isManagerValue = useMemo(() => {
    if (!role) return false;
    return isManagerRole(role);
  }, [role]);

  const isReadOnlyValue = useMemo(() => {
    if (!role) return true;
    return isReadOnlyRole(role);
  }, [role]);

  const canViewCostsValue = useMemo(() => {
    if (!role) return false;
    return checkCanViewCosts(role);
  }, [role]);

  const canViewSLAPenaltiesValue = useMemo(() => {
    if (!role) return false;
    return checkCanViewSLAPenalties(role);
  }, [role]);

  const maxHistoryDaysValue = useMemo(() => {
    if (!role) return 30;
    return getMaxHistoryDays(role);
  }, [role]);

  const value: AuthContextType = {
    // Estado básico
    user,
    usuario,
    claims,
    loading,
    
    // Autenticación
    signIn,
    signOut,
    resetPassword,
    
    // Verificación de roles (legacy)
    hasRole,
    isDFG,
    canAccessTenant,
    
    // Sistema de permisos granular
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Información del rol
    roleInfo,
    detailLevel,
    
    // Capacidades del rol
    canAccessAllTenants: canAccessAllTenantsValue,
    isManager: isManagerValue,
    isReadOnly: isReadOnlyValue,
    canViewCosts: canViewCostsValue,
    canViewSLAPenalties: canViewSLAPenaltiesValue,
    maxHistoryDays: maxHistoryDaysValue,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
