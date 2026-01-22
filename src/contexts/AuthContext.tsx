'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  user: User | null;
  usuario: Usuario | null;
  claims: CustomClaims | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (roles: Rol | Rol[]) => boolean;
  isDFG: () => boolean;
  canAccessTenant: (tenantId: string) => boolean;
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

  const value: AuthContextType = {
    user,
    usuario,
    claims,
    loading,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    isDFG,
    canAccessTenant,
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
