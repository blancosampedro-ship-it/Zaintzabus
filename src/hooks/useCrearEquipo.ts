'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase/config';
import { EquiposService, type ServiceContext } from '@/lib/firebase/services';
import { useTenantId } from '@/contexts/OperadorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificaciones } from '@/contexts/NotificacionesContext';
import type { Equipo, EstadoEquipo, UbicacionActualEquipo, PropiedadEquipo, FechasEquipo } from '@/types';

export interface CrearEquipoData {
  tipoEquipoId: string;
  tipoEquipoNombre: string;
  numeroSerieFabricante: string;
  estado?: EstadoEquipo;
  ubicacionActual: UbicacionActualEquipo;
  propiedad: PropiedadEquipo;
  fechas: FechasEquipo;
  caracteristicas?: {
    marca?: string;
    modelo?: string;
    firmware?: string;
  };
  sim?: {
    iccid?: string;
    telefono?: string;
  };
  red?: {
    ip?: string;
    mac?: string;
  };
  /** Prefijo para generar el código (ej: "SAE", "VID", "TIC") */
  prefijoCodigo: string;
}

interface UseCrearEquipoResult {
  crear: (data: CrearEquipoData) => Promise<string | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para crear equipos con código autoincremental.
 */
export function useCrearEquipo(): UseCrearEquipoResult {
  const tenantId = useTenantId();
  const { user, claims } = useAuth();
  const { success, error: mostrarError } = useNotificaciones();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (data: CrearEquipoData): Promise<string | null> => {
      if (!tenantId) {
        mostrarError('No hay operador seleccionado');
        return null;
      }

      if (!user) {
        mostrarError('Debes iniciar sesión');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const ctx: ServiceContext = {
          tenantId,
          actor: { 
            uid: user.uid, 
            email: user.email ?? undefined,
            tenantId: claims?.tenantId,
          },
        };

        const service = new EquiposService(db);
        const nuevoEquipoId = await service.createEquipo(ctx, {
          tipoEquipoId: data.tipoEquipoId,
          tipoEquipoNombre: data.tipoEquipoNombre,
          numeroSerieFabricante: data.numeroSerieFabricante,
          estado: data.estado ?? 'en_almacen',
          ubicacionActual: data.ubicacionActual,
          propiedad: data.propiedad,
          fechas: data.fechas,
          caracteristicas: data.caracteristicas,
          sim: data.sim,
          red: data.red,
          prefijoCodigo: data.prefijoCodigo,
        });

        success(`Equipo creado correctamente`);
        return nuevoEquipoId;
      } catch (err: any) {
        console.error('Error en useCrearEquipo:', err);
        const mensaje = err.message || 'Error al crear equipo';
        setError(mensaje);
        mostrarError(mensaje);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, user, claims, success, mostrarError]
  );

  return { crear, loading, error };
}
