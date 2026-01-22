'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// TIPOS
// ============================================

export type NotificacionTipo = 'success' | 'error' | 'warning' | 'info';

export interface Notificacion {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje?: string;
  /** Duración en ms. 0 = no auto-dismiss. Default: 5000 */
  duracion?: number;
  /** Callback al cerrar manualmente */
  onClose?: () => void;
}

interface NotificacionesContextType {
  notificaciones: Notificacion[];
  /** Añade una notificación a la cola */
  notify: (notificacion: Omit<Notificacion, 'id'>) => string;
  /** Helpers rápidos */
  success: (titulo: string, mensaje?: string) => string;
  error: (titulo: string, mensaje?: string) => string;
  warning: (titulo: string, mensaje?: string) => string;
  info: (titulo: string, mensaje?: string) => string;
  /** Cierra una notificación por ID */
  dismiss: (id: string) => void;
  /** Cierra todas */
  dismissAll: () => void;
}

// ============================================
// CONTEXTO
// ============================================

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

let idCounter = 0;
function generateId(): string {
  return `notif-${Date.now()}-${++idCounter}`;
}

const DEFAULT_DURACION = 5000;

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Limpiar timer si existe
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setNotificaciones((prev) => {
      const notif = prev.find((n) => n.id === id);
      if (notif?.onClose) {
        notif.onClose();
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const notify = useCallback(
    (notificacion: Omit<Notificacion, 'id'>): string => {
      const id = generateId();
      const duracion = notificacion.duracion ?? DEFAULT_DURACION;

      setNotificaciones((prev) => [...prev, { ...notificacion, id }]);

      // Auto-dismiss
      if (duracion > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duracion);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (titulo: string, mensaje?: string) => notify({ tipo: 'success', titulo, mensaje }),
    [notify]
  );

  const error = useCallback(
    (titulo: string, mensaje?: string) => notify({ tipo: 'error', titulo, mensaje, duracion: 8000 }),
    [notify]
  );

  const warning = useCallback(
    (titulo: string, mensaje?: string) => notify({ tipo: 'warning', titulo, mensaje }),
    [notify]
  );

  const info = useCallback(
    (titulo: string, mensaje?: string) => notify({ tipo: 'info', titulo, mensaje }),
    [notify]
  );

  const dismissAll = useCallback(() => {
    // Limpiar todos los timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setNotificaciones([]);
  }, []);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const value: NotificacionesContextType = {
    notificaciones,
    notify,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const context = useContext(NotificacionesContext);
  if (context === undefined) {
    throw new Error('useNotificaciones must be used within a NotificacionesProvider');
  }
  return context;
}
